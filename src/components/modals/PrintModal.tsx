/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  useApp,
  calculateSixYearExpiry,
  calculateStudentExperience,
  generateMachadStudentUsername,
} from '../../context/AppContext';
import { Printer, X, Download, ShieldCheck, Award, Edit, Trash2, RotateCcw, Save, Calendar, Clock } from 'lucide-react';

export const PrintModal: React.FC = () => {
  const {
    printModal,
    closePrint,
    settings,
    classes,
    subjects,
    students,
    updateStudent,
    deleteStudent,
    currentRole,
    showToast,
  } = useApp();

  const printSurfaceRef = useRef<HTMLDivElement>(null);
  const [printFallbackNotice, setPrintFallbackNotice] = useState<string | null>(null);

  const canManageIdCard =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager';

  const [isEditingIdCard, setIsEditingIdCard] = useState(false);
  const [confirmRevokeId, setConfirmRevokeId] = useState(false);
  const [confirmDeleteStudent, setConfirmDeleteStudent] = useState(false);

  const modalStudentId = printModal?.student?.id;
  const liveStudent = modalStudentId
    ? students.find((s) => s.id === modalStudentId) || printModal?.student
    : printModal?.student;

  const defaultIssueDate = liveStudent?.idCardIssueDate || liveStudent?.admissionDate || new Date().toISOString().substring(0, 10);
  const defaultExpiryDate = liveStudent?.idCardExpiryDate || calculateSixYearExpiry(defaultIssueDate);

  const [idForm, setIdForm] = useState({
    fullName: liveStudent?.fullName || '',
    classId: liveStudent?.classId || '',
    section: liveStudent?.section || 'A',
    bloodGroup: liveStudent?.bloodGroup || 'O+',
    emergencyContact: liveStudent?.emergencyContact || '',
    idCardIssueDate: defaultIssueDate,
    idCardExpiryDate: defaultExpiryDate,
  });

  useEffect(() => {
    if (liveStudent) {
      const issue = liveStudent.idCardIssueDate || liveStudent.admissionDate;
      setIdForm({
        fullName: liveStudent.fullName,
        classId: liveStudent.classId,
        section: liveStudent.section,
        bloodGroup: liveStudent.bloodGroup,
        emergencyContact: liveStudent.emergencyContact,
        idCardIssueDate: issue,
        idCardExpiryDate: liveStudent.idCardExpiryDate || calculateSixYearExpiry(issue),
      });
    }
    setIsEditingIdCard(false);
    setConfirmRevokeId(false);
    setConfirmDeleteStudent(false);
    setPrintFallbackNotice(null);
  }, [modalStudentId, printModal?.type]);

  if (!printModal) return null;

  const buildStandalonePrintHtml = (autoPrint = false): string => {
    const el = printSurfaceRef.current;
    if (!el) return '';
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.no-print').forEach((node) => node.remove());
    clone.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src');
      if (src && src.startsWith('/')) {
        img.setAttribute('src', `${window.location.origin}${src}`);
      }
    });

    const headStyles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map((node) => {
        if (node.tagName === 'LINK') {
          try {
            const sheet = Array.from(document.styleSheets).find((s) => s.ownerNode === node);
            if (sheet && sheet.cssRules) {
              const rulesText = Array.from(sheet.cssRules)
                .map((rule) => rule.cssText)
                .join('\n');
              if (rulesText.trim()) {
                return `<style>${rulesText}</style>`;
              }
            }
          } catch {
            // Cross-origin stylesheet (e.g. fonts); fall back to <link>
          }
          const clonedLink = node.cloneNode(true) as HTMLLinkElement;
          const href = clonedLink.getAttribute('href');
          if (href && href.startsWith('/')) {
            clonedLink.setAttribute('href', `${window.location.origin}${href}`);
          }
          return clonedLink.outerHTML;
        }
        return node.outerHTML;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="so">
<head>
  <meta charset="UTF-8" />
  <title>Daabacaadda Machadka Khadiija Bintu Khuwaylid</title>
  ${headStyles}
  <style>
    @page { margin: 10mm; }
    html, body {
      background: #f8fafc;
      margin: 0;
      padding: 16px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-toolbar {
      max-width: 42rem;
      margin: 0 auto 12px auto;
      display: flex;
      justify-content: flex-end;
    }
    .print-toolbar button {
      background: #005A51;
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
    }
    .print-surface {
      margin: 0 auto !important;
    }
    @media print {
      html, body { background: #ffffff !important; padding: 0 !important; }
      .print-toolbar, .no-print { display: none !important; }
      .print-surface { box-shadow: none !important; border: none !important; }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <button type="button" onclick="window.print()">Daabac Hadda (Print)</button>
  </div>
  ${clone.outerHTML}
  ${autoPrint ? '<script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 250); });</script>' : ''}
</body>
</html>`;
  };

  const triggerHtmlDownload = (autoPrint = false) => {
    const html = buildStandalonePrintHtml(autoPrint);
    if (!html) return false;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const label = student?.id || printModal?.payment?.id || printModal?.type || 'document';
    a.download = `Machadka_${label}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  };

  const handlePrint = () => {
    setPrintFallbackNotice(null);
    let beforePrintFired = false;
    const onBeforePrint = () => {
      beforePrintFired = true;
    };
    window.addEventListener('beforeprint', onBeforePrint, { once: true });

    const startedAt = Date.now();
    try {
      window.print();
    } catch {
      // blocked by sandboxed iframe
    } finally {
      window.removeEventListener('beforeprint', onBeforePrint);
    }

    const elapsed = Date.now() - startedAt;
    if (!beforePrintFired && elapsed < 50) {
      const downloaded = triggerHtmlDownload(true);
      if (downloaded) {
        setPrintFallbackNotice(
          'Daaqadda print-ka tooska ah waxaa xannibay preview iframe-ka, sidaas darteed faylka daabacaadda waa la soo dejiyay. Fur faylka la soo dejiyay si uu toos u daabaco.'
        );
        showToast('Faylka daabacaadda waa la soo dejiyay!');
      }
    }
  };

  const handleDownloadPrintable = () => {
    if (triggerHtmlDownload(false)) {
      showToast('Faylka daabacaadda waa la soo dejiyay — ku fur browser-ka si aad u daabacdo.');
    }
  };

  const { type, invoice, payment, exam, marks, staff, payslip, classId } = printModal;
  const student = liveStudent;

  const currentClass = classes.find((c) => c.id === (student?.classId || classId));
  const idIssueDate = student ? student.idCardIssueDate || student.admissionDate : '';
  const idExpiryDate = student ? student.idCardExpiryDate || calculateSixYearExpiry(idIssueDate) : '';
  const isIdCardDeleted = student?.idCardStatus === 'Deleted';

  const handleSaveIdCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    const pickedClass = classes.find((c) => c.id === idForm.classId);
    await updateStudent(student.id, {
      fullName: idForm.fullName.trim() || student.fullName,
      classId: idForm.classId,
      section: idForm.section,
      shift: pickedClass?.shift || student.shift || 'Subax',
      bloodGroup: idForm.bloodGroup,
      emergencyContact: idForm.emergencyContact,
      idCardIssueDate: idForm.idCardIssueDate,
      idCardExpiryDate: idForm.idCardExpiryDate,
    });
    setIsEditingIdCard(false);
  };

  return (
    <div className="print-modal-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="print-modal-dialog bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-b border-slate-200 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#005A51]" />
            <h3 className="text-sm font-bold text-slate-800">
              {type === 'student_id_card' && 'Kaarka Aqoonsiga Ardayga (Student ID Card)'}
              {type === 'enrollment_certificate' && 'Shahaadada Diiwaangelinta (Enrollment Certificate)'}
              {type === 'payment_receipt' && 'Rasiidka Lacag-Bixinta Rasmiga ah (Official Payment Receipt)'}
              {type === 'report_card' && 'Warqadda Natiijada Imtixaanka (Academic Report Card)'}
              {type === 'exam_certificate' && 'Shahaadada Imtixaanka Rasmiga ah (Official Exam Certificate)'}
              {type === 'payslip' && 'Warqadda Mushaharka Shaqaalaha (Staff Payslip)'}
              {type === 'timetable' && 'Jadwalka Toddobaadlaha ah ee Dugsiga (Weekly Timetable)'}
              {type === 'student_portal_slip' && 'Warqadda Gelitaanka Portal-ka Ardayga (Student Portal Access Slip)'}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Daabac (Print)
            </button>
            <button
              type="button"
              onClick={handleDownloadPrintable}
              title="Soo degso faylka si aad u daabacdo"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#005A51]" />
              Soo Degso
            </button>
            <button
              type="button"
              onClick={closePrint}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Surface */}
        <div className="print-modal-body flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col items-center gap-3">
          {printFallbackNotice && (
            <div className="no-print w-full max-w-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-3">
              <span>{printFallbackNotice}</span>
              <button
                type="button"
                onClick={() => setPrintFallbackNotice(null)}
                className="text-amber-700 hover:text-amber-900 font-bold shrink-0"
              >
                Xir
              </button>
            </div>
          )}
          <div ref={printSurfaceRef} className="print-surface bg-white shadow-md border border-slate-200 w-full max-w-2xl p-6 rounded-lg text-slate-800 relative">

            {/* 1. STUDENT ID CARD */}
            {type === 'student_id_card' && student && (
              <div className="space-y-4">
                {/* Admin Controls (no-print) */}
                {canManageIdCard && (
                  <div className="no-print bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Maamulka ID Card-ka:</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isIdCardDeleted
                              ? 'bg-red-100 text-red-700 border border-red-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {isIdCardDeleted ? 'La Tiray (Deleted)' : 'Firfircoon (Active · 6 Sano)'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsEditingIdCard((v) => !v)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          {isEditingIdCard ? 'Xir Edit' : 'Wax Ka Beddel (Edit)'}
                        </button>

                        {isIdCardDeleted ? (
                          <button
                            type="button"
                            onClick={async () => {
                              await updateStudent(student.id, { idCardStatus: 'Active' });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Soo Celi ID Card
                          </button>
                        ) : confirmRevokeId ? (
                          <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-bold text-red-700">Tirtir ID?</span>
                            <button
                              type="button"
                              onClick={async () => {
                                await updateStudent(student.id, { idCardStatus: 'Deleted' });
                                setConfirmRevokeId(false);
                              }}
                              className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
                            >
                              Hubi
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmRevokeId(false)}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                            >
                              Maya
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeId(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Tirtir ID Card
                          </button>
                        )}

                        {confirmDeleteStudent ? (
                          <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-300 px-2 py-1 rounded-lg">
                            <span className="text-[10px] font-bold text-rose-800">Tirtir Ardayga?</span>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteStudent(student.id);
                                closePrint();
                              }}
                              className="px-2 py-0.5 bg-rose-700 text-white rounded text-[10px] font-bold"
                            >
                              Haa, Tirtir
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteStudent(false)}
                              className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]"
                            >
                              Maya
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteStudent(true)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete Ardayga
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline ID Card Editor */}
                    {isEditingIdCard && (
                      <form onSubmit={handleSaveIdCard} className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Magaca Ardayga:</label>
                          <input
                            type="text"
                            required
                            value={idForm.fullName}
                            onChange={(e) => setIdForm({ ...idForm, fullName: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fasalka:</label>
                          <select
                            value={idForm.classId}
                            onChange={(e) => {
                              const cls = classes.find((c) => c.id === e.target.value);
                              setIdForm({
                                ...idForm,
                                classId: e.target.value,
                                section: cls?.section || idForm.section,
                              });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.section}) · {c.shift || 'Subax'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dhiigga & Gurmadka:</label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={idForm.bloodGroup}
                              onChange={(e) => setIdForm({ ...idForm, bloodGroup: e.target.value })}
                              className="w-20 px-2 py-1.5 bg-white border border-slate-300 rounded-lg"
                              placeholder="O+"
                            />
                            <input
                              type="text"
                              value={idForm.emergencyContact}
                              onChange={(e) => setIdForm({ ...idForm, emergencyContact: e.target.value })}
                              className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                              placeholder="+252..."
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            La Bixiyay (Issue Date / Diiwaangelin):
                          </label>
                          <input
                            type="date"
                            value={idForm.idCardIssueDate}
                            onChange={(e) => {
                              const newIssue = e.target.value;
                              setIdForm({
                                ...idForm,
                                idCardIssueDate: newIssue,
                                idCardExpiryDate: calculateSixYearExpiry(newIssue),
                              });
                            }}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-semibold text-slate-600">
                              Dhacaa (Expiry Date - 6 Sano):
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setIdForm((prev) => ({
                                  ...prev,
                                  idCardExpiryDate: calculateSixYearExpiry(prev.idCardIssueDate),
                                }))
                              }
                              className="text-[10px] font-bold text-[#005A51] hover:underline"
                            >
                              +6 Sano Dib u Xisaabi
                            </button>
                          </div>
                          <input
                            type="date"
                            value={idForm.idCardExpiryDate}
                            onChange={(e) => setIdForm({ ...idForm, idCardExpiryDate: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg"
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsEditingIdCard(false)}
                            className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-semibold"
                          >
                            Ka noqo
                          </button>
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005A51] text-white rounded-lg font-bold"
                          >
                            <Save className="w-3.5 h-3.5" />
                            Keydi ID Card-ka
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                <div className="max-w-md mx-auto border-2 border-[#005A51] rounded-xl overflow-hidden shadow-lg bg-white relative">
                  {isIdCardDeleted && (
                    <div className="absolute inset-0 bg-red-900/15 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
                      <div className="bg-red-600 text-white font-bold text-xs px-4 py-1.5 rounded-lg border-2 border-white shadow-lg -rotate-12 tracking-wider uppercase">
                        KAARKAN WAA LA TIRAY (REVOKED)
                      </div>
                    </div>
                  )}

                  {/* ID Header */}
                  <div className="bg-[#005A51] text-white p-3 text-center relative border-b-2 border-amber-400">
                    <div className="flex items-center justify-between gap-2 px-2">
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        className="w-12 h-12 object-contain bg-white rounded-full p-0.5 border border-amber-300 shadow-xs"
                      />
                      <div className="text-center flex-1">
                        <h4 className="text-[12px] font-bold uppercase tracking-wide leading-tight">
                          Machadka Khadiija Bintu Khuwaylid
                        </h4>
                        <p className="text-[11px] font-arabic text-amber-300 leading-tight">
                          معهد خديجة بنت خويلد – قرطو
                        </p>
                        <span className="text-[9px] text-teal-100 tracking-wider">
                          KAARKA AQOONSIGA ARDAYGA (STUDENT ID)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ID Body */}
                  {(() => {
                    const experience = calculateStudentExperience(student.admissionDate);
                    return (
                      <div className="p-4 bg-gradient-to-b from-white to-teal-50/20">
                        <div className="flex gap-4 items-center">
                          <div className="w-24 h-28 rounded-lg overflow-hidden border-2 border-slate-300 shadow-xs shrink-0 bg-slate-100">
                            <img
                              src={student.photoUrl}
                              alt={student.fullName}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 space-y-1 text-xs">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[10px] text-slate-400 block uppercase">Magaca Ardayga:</span>
                                <span className="font-bold text-slate-900 text-sm">{student.fullName}</span>
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  student.status === 'Active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {student.status}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1">
                              <div>
                                <span className="text-[10px] text-slate-400 block">ID No / Roll:</span>
                                <span className="font-mono-numbers font-bold text-[#005A51]">
                                  {student.id} · #{student.rollNumber}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Fasalka:</span>
                                <span className="font-semibold text-slate-800">
                                  {currentClass?.name} ({student.section}) · {student.shift || currentClass?.shift || 'Subax'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Diiwaangelinta:</span>
                                <span className="font-mono-numbers font-semibold text-slate-800">
                                  {student.admissionDate}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">Dhiigga / Sanadka:</span>
                                <span className="font-bold text-red-600">{student.bloodGroup}</span>
                                <span className="text-slate-500"> · {settings.academicYear}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dynamic Experience & 6-Year Cycle Banner */}
                        <div className="mt-3 px-2.5 py-2 rounded-lg bg-teal-50/80 border border-teal-200 space-y-1.5 text-[10px]">
                          <div className="flex items-center justify-between border-b border-teal-200/70 pb-1">
                            <span className="text-slate-600 font-bold uppercase text-[9px] flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-[#005A51]" />
                              Student Experience (Max 6 Yrs):
                            </span>
                            <span className="font-mono-numbers font-bold text-[#005A51]">
                              {experience.years} Yrs, {experience.months} Mos, {experience.days} Days
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-500 block uppercase text-[9px] flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5 text-[#005A51]" />
                                La Bixiyay (Issued):
                              </span>
                              <span className="font-mono-numbers font-bold text-slate-800">{idIssueDate}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-slate-500 block uppercase text-[9px]">
                                Dhacaa (Expiry · 6 Sano):
                              </span>
                              <span className="font-mono-numbers font-bold text-rose-700">{idExpiryDate}</span>
                            </div>
                          </div>
                        </div>

                    {/* ID Footer & Barcode Simulation */}
                    <div className="mt-3 pt-2.5 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                      <div>
                        <span>Maamul Machadka: </span>
                        <span className="font-mono-numbers font-semibold text-slate-800">907737189/7814437</span>
                      </div>

                      <div className="text-right">
                        <div className="h-4 flex items-center gap-[2px]">
                          {[4, 8, 2, 6, 3, 7, 5, 2, 9, 3, 6, 2, 5, 8, 3, 5, 2, 7].map((h, i) => (
                            <div
                              key={i}
                              className="bg-slate-800"
                              style={{ width: i % 3 === 0 ? '2px' : '1px', height: `${12 + (h % 6)}px` }}
                            />
                          ))}
                        </div>
                        <span className="font-mono-numbers text-[8px] text-slate-400">{student.id}</span>
                      </div>
                    </div>
                  </div>
                    );
                  })()}

                  <div className="bg-amber-400 py-1 text-center text-[9px] font-bold text-slate-900 tracking-wider">
                    QARDHO, KARKAAR, PUNTLAND – SOMALIA
                  </div>
                </div>
              </div>
            )}

            {/* 2. ENROLLMENT CERTIFICATE */}
            {type === 'enrollment_certificate' && student && (
              <div className="border-4 border-double border-[#005A51] p-6 rounded-lg bg-amber-50/10 relative">
                {/* Header */}
                <div className="text-center pb-4 border-b-2 border-slate-200">
                  <div className="flex justify-center mb-2">
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="w-16 h-16 object-contain"
                    />
                  </div>
                  <h2 className="text-base font-bold text-[#005A51] uppercase tracking-wide">
                    {settings.institutionName}
                  </h2>
                  <h3 className="text-sm font-arabic font-bold text-amber-600 mt-0.5">
                    {settings.arabicName}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {settings.location} · Tel: {settings.phone}
                  </p>
                  <div className="mt-3 inline-block bg-[#005A51] text-white px-4 py-1 rounded-md text-xs font-bold tracking-widest uppercase">
                    Shahaadada Diiwaangelinta (Certificate of Enrollment)
                  </div>
                </div>

                {/* Body Content */}
                <div className="py-6 space-y-4 text-xs leading-relaxed text-slate-700">
                  <p className="text-center italic font-serif text-sm">
                    Waxaa halkan lagu caddaynayaa in ardayadda / ardayga hoos ku xusan uu si rasmi ah uga diiwaangashan yahay Machadka Khadiija Bintu Khuwaylid ee magaalada Qardho.
                  </p>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500">Magaca Buuxa (Full Name):</span>
                      <span className="font-bold text-slate-900">{student.fullName}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500">Lambarka Diiwaanka (Student ID):</span>
                      <span className="font-mono-numbers font-bold text-[#005A51]">{student.id}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500">Fasalka (Class & Section):</span>
                      <span className="font-semibold text-slate-800">{currentClass?.name} - Qeybta ({student.section}) · {student.shift || currentClass?.shift || 'Subax'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1.5">
                      <span className="text-slate-500">Taariikhda Gelitaanka:</span>
                      <span className="font-medium text-slate-800">{student.admissionDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sanad Dugsiyeedka (Academic Year):</span>
                      <span className="font-bold text-amber-700">{settings.academicYear}</span>
                    </div>
                  </div>

                  <p className="text-justify text-xs text-slate-600">
                    Shahaadadan waxaa la siiyay codsi ka yimid waalidka si loogu isticmaalo arrimaha sharciga ah iyo caddaynta waxbarasho ee ardayga.
                  </p>
                </div>

                {/* Signatures */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="h-12 flex items-end justify-center font-serif italic text-slate-400">
                      Ustaad Cabdiraxmaan Cali
                    </div>
                    <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">
                      Xafiiska Diiwaangelinta (Registrar)
                    </div>
                  </div>
                  <div>
                    <div className="h-12 flex items-end justify-center font-serif italic text-slate-400 font-bold text-[#005A51]">
                      {settings.principalName}
                    </div>
                    <div className="border-t border-slate-300 pt-1 font-semibold text-slate-800">
                      Maamulaha Guud (Principal Seal & Sign)
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. PAYMENT RECEIPT */}
            {type === 'payment_receipt' && payment && (
              <div className="border border-slate-300 p-6 rounded-lg bg-white">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                    <div>
                      <h3 className="text-xs font-bold text-[#005A51] uppercase">
                        {settings.institutionName}
                      </h3>
                      <p className="text-[11px] font-arabic text-amber-600">{settings.arabicName}</p>
                      <p className="text-[10px] text-slate-500">Qardho, Karkaar, Puntland</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block bg-teal-50 text-[#005A51] border border-teal-200 px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider">
                      Rasiid Rasmi ah (Receipt)
                    </span>
                    <p className="text-xs font-mono-numbers font-bold text-slate-800 mt-1">
                      {payment.id}
                    </p>
                    <p className="text-[10px] text-slate-400">{payment.paymentDate}</p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Laga Helay (Received From):</span>
                      <span className="font-bold text-slate-900">{student?.fullName || 'Arday'}</span>
                      <span className="text-[10px] text-slate-500 block">ID: {student?.id || payment.studentId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Habka Lacag-bixinta:</span>
                      <span className="font-semibold text-slate-800">{payment.paymentMethod}</span>
                      <span className="text-[10px] text-slate-500 block">Ref: {payment.referenceNumber}</span>
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-slate-200 text-left text-xs my-4">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-200 px-3 py-2">Fahfaahinta Kharashka</th>
                        <th className="border border-slate-200 px-3 py-2 text-right">Cadadka ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-200 px-3 py-2">
                          <span className="font-semibold">{invoice?.title || 'Lacagta Waxbarashada ee Dugsiga'}</span>
                          <span className="block text-[10px] text-slate-400">{payment.notes || 'Khidmadda rasmiga ah'}</span>
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-mono-numbers font-bold text-slate-900">
                          ${payment.amount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-teal-50/50 font-bold">
                        <td className="border border-slate-200 px-3 py-2 text-right">Isugeyn La Bixiyay:</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-mono-numbers text-[#005A51] text-sm">
                          ${payment.amount.toFixed(2)}
                        </td>
                      </tr>
                      {invoice && (
                        <tr>
                          <td className="border border-slate-200 px-3 py-1.5 text-right text-slate-500">Baaqi Haray (Balance):</td>
                          <td className="border border-slate-200 px-3 py-1.5 text-right font-mono-numbers text-red-600 font-semibold">
                            ${invoice.balance.toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>

                  <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Qasnajiga Xareeyay:</span>
                      <span className="font-semibold text-slate-800">{payment.receivedBy}</span>
                    </div>
                    <div className="text-right">
                      <div className="w-32 border-b border-slate-300 pb-1 text-center font-serif italic text-slate-400">
                        Shaabadda & Saxiixa
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">Xafiiska Maaliyadda</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ACADEMIC REPORT CARD */}
            {type === 'report_card' && student && (
              <div className="border border-slate-300 p-6 rounded-lg bg-white">
                <div className="text-center pb-3 border-b-2 border-[#005A51]">
                  <div className="flex justify-center mb-1">
                    <img src={settings.logoUrl} alt="Logo" className="w-14 h-14 object-contain" />
                  </div>
                  <h2 className="text-sm font-bold text-[#005A51] uppercase">
                    {settings.institutionName}
                  </h2>
                  <p className="text-xs font-arabic text-amber-600">{settings.arabicName}</p>
                  <div className="inline-block bg-teal-50 text-[#005A51] font-bold px-3 py-0.5 rounded text-xs mt-1 border border-teal-200">
                    Warqadda Natiijada Imtixaanka (Academic Report Card) - {exam?.title || 'Sanad Dugsiyeedka'}
                  </div>
                </div>

                {/* Student header info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4 bg-slate-50 p-3 rounded text-xs border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Magaca Ardayga:</span>
                    <span className="font-bold text-slate-800">{student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Student ID:</span>
                    <span className="font-mono-numbers font-semibold text-[#005A51]">{student.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Fasalka:</span>
                    <span className="font-semibold text-slate-800">{currentClass?.name} ({student.section}) · {student.shift || currentClass?.shift || 'Subax'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Sanadka:</span>
                    <span className="font-semibold text-slate-800">{settings.academicYear}</span>
                  </div>
                </div>

                {/* Subject marks table */}
                <table className="w-full border-collapse border border-slate-200 text-xs mb-4">
                  <thead>
                    <tr className="bg-slate-100 text-left">
                      <th className="border border-slate-200 px-3 py-2">Maadada (Subject)</th>
                      <th className="border border-slate-200 px-3 py-2 text-center">Max Marks</th>
                      <th className="border border-slate-200 px-3 py-2 text-center">Buundada</th>
                      <th className="border border-slate-200 px-3 py-2 text-center">Heerka</th>
                      <th className="border border-slate-200 px-3 py-2">Faallo (Remarks)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks && marks.length > 0 ? (
                      marks.map((m) => {
                        const subj = subjects.find((s) => s.id === m.subjectId);
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/60">
                            <td className="border border-slate-200 px-3 py-1.5 font-medium">
                              {subj?.nameSomali || 'Maado'}
                              <span className="block text-[10px] font-arabic text-slate-400">
                                {subj?.nameArabic}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-mono-numbers text-slate-500">
                              {m.maxMarks}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-mono-numbers font-bold text-slate-900">
                              {m.marksObtained}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-center font-bold">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] ${
                                  m.grade.startsWith('A')
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : m.grade.startsWith('B')
                                    ? 'bg-blue-50 text-blue-700'
                                    : m.grade.startsWith('C')
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {m.grade}
                              </span>
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-[11px] text-slate-600">
                              {m.remarks}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-slate-400">
                          Wax buundooyin ah looma helin imtixaankan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {marks && marks.length > 0 && (
                    <tfoot>
                      <tr className="bg-teal-50/60 font-bold">
                        <td className="border border-slate-200 px-3 py-2">Isugeyn (Total / Average):</td>
                        <td className="border border-slate-200 px-3 py-2 text-center font-mono-numbers">
                          {marks.reduce((sum, m) => sum + m.maxMarks, 0)}
                        </td>
                        <td className="border border-slate-200 px-3 py-2 text-center font-mono-numbers text-[#005A51] text-sm">
                          {marks.reduce((sum, m) => sum + m.marksObtained, 0)} (
                          {(
                            marks.reduce((sum, m) => sum + m.marksObtained, 0) / marks.length
                          ).toFixed(1)}
                          %)
                        </td>
                        <td colSpan={2} className="border border-slate-200 px-3 py-2 text-center text-emerald-700">
                          Gudbay (Passed)
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>

                {/* Report signatures */}
                <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs text-center">
                  <div>
                    <div className="h-10 border-b border-slate-300"></div>
                    <span className="font-semibold text-slate-700 block mt-1">Macallinka Fasalka</span>
                  </div>
                  <div>
                    <div className="h-10 border-b border-slate-300"></div>
                    <span className="font-semibold text-slate-700 block mt-1">Maamulaha Guud ee Machadka</span>
                  </div>
                </div>
              </div>
            )}

            {/* 4B. OFFICIAL EXAM CERTIFICATE (SHAHAADO IMTIXAAN) */}
            {type === 'exam_certificate' && student && (() => {
              const certMarks = marks || [];
              const totalObtained = certMarks.reduce((sum, m) => sum + m.marksObtained, 0);
              const totalMax = certMarks.reduce((sum, m) => sum + m.maxMarks, 0);
              const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
              const overallGrade =
                pct >= 95 ? 'A+' : pct >= 90 ? 'A' : pct >= 85 ? 'B+' : pct >= 80 ? 'B' : pct >= 70 ? 'C+' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
              const passed = pct >= 50;

              return (
                <div className="border-4 border-double border-[#005A51] p-6 rounded-xl bg-gradient-to-b from-amber-50/20 via-white to-teal-50/20 relative">
                  {/* Top Ornamental Corner Bars */}
                  <div className="border-2 border-amber-400/70 p-5 rounded-lg space-y-4">
                    {/* Institutional Header */}
                    <div className="text-center pb-3 border-b-2 border-[#005A51]/20">
                      <div className="flex justify-center mb-2">
                        <img
                          src={settings.logoUrl}
                          alt="Logo"
                          className="w-16 h-16 object-contain rounded-full border-2 border-amber-400 p-0.5 bg-white shadow-xs"
                        />
                      </div>
                      <h2 className="text-base font-black text-[#005A51] uppercase tracking-wider">
                        {settings.institutionName}
                      </h2>
                      <p className="text-xs font-arabic text-amber-600 font-bold mt-0.5">
                        {settings.arabicName}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {settings.location} · Tel: {settings.phone}
                      </p>

                      <div className="mt-3 inline-flex items-center gap-2 bg-[#005A51] text-white px-5 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-xs">
                        <Award className="w-4 h-4 text-amber-300" />
                        <span>Shahaadada Imtixaanka (Exam Certificate)</span>
                      </div>
                    </div>

                    {/* Certificate Serial & Exam Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      <span>
                        Imtixaanka: <strong className="text-[#005A51]">{exam?.title || 'Imtixaanka Sanadka'}</strong>
                      </span>
                      <span className="font-mono-numbers">
                        Sanadka: <strong>{exam?.academicYear || settings.academicYear}</strong> · Cert No:{' '}
                        <strong>CERT-{student.rollNumber}-{exam?.id || '2026'}</strong>
                      </span>
                    </div>

                    {/* Formal Citation */}
                    <div className="text-center space-y-2 py-2">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Maamulka iyo Guddiga Imtixaanaadka ee <strong>{settings.institutionName}</strong> waxay shahaadadan rasmiga ah siinayaan:
                      </p>
                      <div className="text-xl font-black text-[#005A51] tracking-tight py-1 border-b-2 border-amber-400 inline-block px-6">
                        {student.fullName}
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-600 pt-1">
                        <span>
                          Student ID: <strong className="font-mono-numbers text-slate-900">{student.id}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Fasalka:{' '}
                          <strong className="text-slate-900">
                            {currentClass?.name} ({student.section}) · {student.shift || currentClass?.shift || 'Subax'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Result Summary Strip */}
                    <div className="grid grid-cols-4 gap-2 text-center bg-teal-50/70 border border-teal-200 rounded-xl p-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Wadarta Dhibcaha</span>
                        <span className="font-mono-numbers font-black text-slate-900 text-sm">
                          {totalObtained} / {totalMax}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Celceliska (%)</span>
                        <span className="font-mono-numbers font-black text-[#005A51] text-sm">{pct}%</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Darajada (Grade)</span>
                        <span className="font-black text-amber-700 text-sm">{overallGrade}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase">Natiijada</span>
                        <span className={`font-black text-sm ${passed ? 'text-emerald-700' : 'text-red-600'}`}>
                          {passed ? 'GUDBAY (PASSED)' : 'HARAY'}
                        </span>
                      </div>
                    </div>

                    {/* Compact Subject Marks Table */}
                    {certMarks.length > 0 && (
                      <table className="w-full border-collapse border border-slate-200 text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700">
                            <th className="border border-slate-200 px-2.5 py-1.5 text-left">Maadada (Subject)</th>
                            <th className="border border-slate-200 px-2.5 py-1.5 text-center">Max</th>
                            <th className="border border-slate-200 px-2.5 py-1.5 text-center">Buundada</th>
                            <th className="border border-slate-200 px-2.5 py-1.5 text-center">Heerka</th>
                          </tr>
                        </thead>
                        <tbody>
                          {certMarks.map((m) => {
                            const subj = subjects.find((s) => s.id === m.subjectId);
                            return (
                              <tr key={m.id}>
                                <td className="border border-slate-200 px-2.5 py-1 font-medium text-slate-800">
                                  {subj?.nameSomali || m.subjectId}
                                </td>
                                <td className="border border-slate-200 px-2.5 py-1 text-center font-mono-numbers text-slate-500">
                                  {m.maxMarks}
                                </td>
                                <td className="border border-slate-200 px-2.5 py-1 text-center font-mono-numbers font-bold text-slate-900">
                                  {m.marksObtained}
                                </td>
                                <td className="border border-slate-200 px-2.5 py-1 text-center font-bold text-[#005A51]">
                                  {m.grade}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {/* Seal & Official Signatures */}
                    <div className="grid grid-cols-3 gap-6 pt-5 border-t border-slate-200 text-[11px] text-center items-end">
                      <div>
                        <div className="h-9 border-b border-slate-400"></div>
                        <span className="font-bold text-slate-700 block mt-1">Madaxa Imtixaanaadka</span>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#005A51]/70 flex flex-col items-center justify-center text-[8px] font-bold text-[#005A51] uppercase tracking-wider bg-teal-50/40">
                          <ShieldCheck className="w-4 h-4 text-amber-600 mb-0.5" />
                          <span>Shaabadda</span>
                          <span>Rasmiga ah</span>
                        </div>
                      </div>

                      <div>
                        <div className="h-9 border-b border-slate-400"></div>
                        <span className="font-bold text-slate-700 block mt-1">Maamulaha Guud ee Machadka</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* 5. PAYSLIP */}
            {type === 'payslip' && payslip && staff && (
              <div className="border border-slate-300 p-6 rounded-lg bg-white">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                    <div>
                      <h3 className="text-xs font-bold text-[#005A51] uppercase">
                        {settings.institutionName}
                      </h3>
                      <p className="text-[10px] text-slate-500">Waaxda Kheyraadka Shaqaalaha & Maaliyadda</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="bg-teal-50 text-[#005A51] border border-teal-200 px-2 py-0.5 rounded text-[11px] font-bold">
                      Warqadda Mushaharka (Payslip)
                    </span>
                    <p className="text-xs font-mono-numbers font-bold text-slate-800 mt-1">{payslip.month}</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Magaca Shaqaalaha:</span>
                      <span className="font-bold text-slate-900">{staff.fullName}</span>
                      <span className="text-[10px] text-slate-500 block">Xilka: {staff.roleTitle} ({staff.department})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Taariikhda Bixinta & Habka:</span>
                      <span className="font-semibold text-slate-800">{payslip.paymentDate}</span>
                      <span className="text-[10px] text-slate-500 block">Bank: {payslip.paymentMethod} (Ref: {payslip.referenceNo})</span>
                    </div>
                  </div>

                  <table className="w-full border-collapse border border-slate-200 text-xs my-4">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-200 px-3 py-2 text-left">Fahfaahinta Mushaharka</th>
                        <th className="border border-slate-200 px-3 py-2 text-right">Cadadka ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-slate-200 px-3 py-1.5">Mushaharka Asalka ah (Basic Salary)</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-mono-numbers">${payslip.basicSalary.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-200 px-3 py-1.5">Gunnooyinka Dheeraadka ah (Allowances)</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-mono-numbers text-emerald-700">+${payslip.allowances.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-200 px-3 py-1.5">Goynta / Canshuuraha (Deductions)</td>
                        <td className="border border-slate-200 px-3 py-1.5 text-right font-mono-numbers text-red-600">-${payslip.deductions.toFixed(2)}</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-teal-50 font-bold text-sm">
                        <td className="border border-slate-200 px-3 py-2 text-right">Mushaharka Saafiga ah (Net Salary):</td>
                        <td className="border border-slate-200 px-3 py-2 text-right font-mono-numbers text-[#005A51]">
                          ${payslip.netSalary.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Qaybta Maaliyadda:</span>
                      <span className="font-semibold text-slate-800">Cali Xasan Faarax</span>
                    </div>
                    <div className="text-right">
                      <div className="w-32 border-b border-slate-300 pb-1 text-center font-serif italic text-slate-400">
                        Saxiixa Shaqaalaha
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. WEEKLY TIMETABLE */}
            {type === 'timetable' && (
              <div className="border border-slate-300 p-6 rounded-lg bg-white text-xs">
                <div className="text-center pb-3 border-b-2 border-[#005A51] mb-4">
                  <div className="flex justify-center mb-1">
                    <img src={settings.logoUrl} alt="Logo" className="w-12 h-12 object-contain" />
                  </div>
                  <h3 className="font-bold text-[#005A51] uppercase">
                    {settings.institutionName}
                  </h3>
                  <p className="text-[11px] font-arabic text-amber-600">{settings.arabicName}</p>
                  <div className="inline-block bg-teal-50 text-[#005A51] font-bold px-3 py-0.5 rounded text-xs mt-1 border border-teal-200">
                    Jadwalka Toddobaadlaha ah ee Casharrada (Weekly Schedule) · {settings.academicYear}
                  </div>
                </div>
                <p className="text-center text-slate-500 mb-3">
                  Xilliga Subaxnimo: 07:30 Subaxnimo ilaa 12:30 Duhurnimo (Sabti ilaa Khamiis)
                </p>
                <div className="border border-slate-200 rounded p-4 text-center text-slate-600">
                  Fadlan isticmaal jadwalka faahfaahsan ee module-ka "Jadwalka Casharrada" si aad u daabacdo fasal gaar ah ama macallin gaar ah.
                </div>
              </div>
            )}

            {/* 7. STUDENT PORTAL ACCESS SLIP */}
            {type === 'student_portal_slip' && student && (
              <div className="border-2 border-dashed border-[#005A51] p-6 rounded-xl bg-white text-xs space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4 border-slate-200">
                  <div className="flex items-center gap-3">
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="w-14 h-14 object-contain rounded-full border border-amber-300 shadow-xs"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-[#005A51] uppercase">
                        {settings.institutionName}
                      </h3>
                      <p className="text-xs font-arabic text-amber-600 font-semibold">
                        {settings.arabicName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Qardho, Karkaar, Puntland, Somalia · Sannad-Dugsiyadeedka {settings.academicYear}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[11px] font-bold">
                      WARQADDA SIRTA EE PORTAL-KA
                    </span>
                    <p className="text-[9px] text-slate-400 mt-1 font-mono-numbers">
                      Taariikh: {new Date().toLocaleDateString('so-SO')}
                    </p>
                  </div>
                </div>

                {/* Notice text */}
                <div className="bg-teal-50/60 p-3 rounded-lg border border-teal-200 text-teal-900 text-[11px] leading-relaxed">
                  <strong className="block mb-0.5 text-[#005A51]">Ogeysiiska Waalidka & Ardayga:</strong>
                  Warqaddani waxay xambaarsan tahay magaca gelitaanka (Username) iyo erey-sirta (Password) aad kaga geli karto nidaamka dhijitaalka ah ee Machadka Khadiija Bintu Khuwaylid. Fadlan sir u xafid.
                </div>

                {/* Student Bio */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Magaca Ardayga:</span>
                    <span className="font-bold text-slate-900 text-sm">{student.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Lambarka Ardayga (ID):</span>
                    <span className="font-mono-numbers font-bold text-[#005A51] text-sm">{student.id} · Roll {student.rollNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Fasalka & Qaybta:</span>
                    <span className="font-semibold text-slate-800">{currentClass?.name} ({student.section}) · {student.shift || currentClass?.shift || 'Subax'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Magaca Waalidka:</span>
                    <span className="font-semibold text-slate-800">{student.guardianName} ({student.guardianPhone})</span>
                  </div>
                </div>

                {/* Credentials Box */}
                <div className="border-2 border-[#005A51] bg-[#005A51]/5 rounded-xl p-4">
                  <div className="text-center font-bold text-[#005A51] text-xs uppercase tracking-wider mb-3">
                    XOGTA GELITAANKA PORTAL-KA ARDAYGA (PORTAL CREDENTIALS)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase">Web Address:</span>
                      <span className="font-mono text-xs font-semibold text-slate-700 break-all">
                        {window.location.origin}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase">Username (Unique):</span>
                      <span className="font-mono font-bold text-sm text-[#005A51] break-all">
                        {student.portalUsername || generateMachadStudentUsername(student.id)}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-[10px] text-slate-400 block uppercase">Initial Password:</span>
                      <span className="font-mono font-bold text-xs text-amber-700">
                        {student.mustChangePassword !== false
                          ? 'Furaha Bilowga (Beddel Marka 1aad)'
                          : 'Sir Qarsoodi ah (La Beddelay)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Features available on Portal */}
                <div className="space-y-1 text-slate-600 text-[11px]">
                  <p className="font-semibold text-slate-800">Maxaad ka heli kartaa Portal-kaaga?</p>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    <li>Eeg xogtaada diiwaangelinta iyo taariikhda dhicitaanka Kaarka Aqoonsiga (View Only).</li>
                    <li>Eeg Natiijooyinka Imtixaanaadka (Bishii, Dhexda, iyo Dhammaadka).</li>
                    <li>La soco Xaadirinta Maalinlaha ah (Joogitaanka & Maqnaanshaha).</li>
                    <li>Eeg Baaqiga Kharashka Dugsiga, jadwalka casharrada, oo beddel furahaaga sirta ah.</li>
                  </ul>
                </div>

                {/* Footer Signatures */}
                <div className="flex justify-between items-end pt-6 border-t border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Agaasinka Diiwaangelinta:</span>
                    <span className="font-semibold text-slate-800">Xafiiska Diiwaanka & Macluumaadka</span>
                  </div>
                  <div className="text-center">
                    <div className="w-24 h-12 border-2 border-dashed border-teal-500 rounded flex items-center justify-center text-[10px] text-teal-700 font-bold uppercase rotate-[-5deg]">
                      Shaambadda Rasmiga ah
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="w-36 border-b border-slate-400 pb-1 text-center font-serif italic text-slate-500">
                      Saxiixa Maamulka
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
