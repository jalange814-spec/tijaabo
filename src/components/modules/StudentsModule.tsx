/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  useApp,
  calculateSixYearExpiry,
  calculateStudentExperience,
  generateMachadStudentUsername,
} from '../../context/AppContext';
import { Student, Gender, StudyShift } from '../../types';
import { downloadCSV } from '../../utils/exportCsv';
import { ProfileImageUploader } from '../common/ProfileImageUploader';
import { BulkStudentExcelModal } from '../modals/BulkStudentExcelModal';
import {
  UserPlus,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  UserMinus,
  Activity,
  Printer,
  FileCheck,
  X,
  KeyRound,
  Sun,
  Sunset,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';

export const StudentsModule: React.FC = () => {
  const {
    students,
    addStudent,
    updateStudent,
    deleteStudent,
    dropStudent,
    restoreStudent,
    adminResetStudentPassword,
    classes,
    attendance,
    marks,
    invoices,
    auditLogs,
    openPrint,
    settings,
    searchTerm,
    setSearchTerm,
    currentRole,
    focusedRecordIntent,
    setFocusedRecordIntent,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const canAddStudent =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager' ||
    currentRole === 'Receptionist';
  const canEditStudent =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager';
  const canDropStudent =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager';
  const canDeleteStudent =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager';

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<'all' | StudyShift>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDropId, setConfirmDropId] = useState<string | null>(null);
  const [confirmProfileDelete, setConfirmProfileDelete] = useState(false);
  const [confirmProfileDrop, setConfirmProfileDrop] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkExcelOpen, setIsBulkExcelOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [profileTab, setProfileTab] = useState<'overview' | 'attendance' | 'marks' | 'fees' | 'activity'>('overview');

  useEffect(() => {
    if (focusedRecordIntent?.type === 'student') {
      const target = students.find((s) => s.id === focusedRecordIntent.id);
      if (target) {
        setViewingStudent(target);
        setProfileTab('overview');
        setSearchTerm(target.id);
      }
      setFocusedRecordIntent(null);
    }
  }, [focusedRecordIntent, students, setFocusedRecordIntent, setSearchTerm]);

  useEffect(() => {
    if (navigationIntent?.module !== 'students') return;
    const { tab, action } = navigationIntent;
    if (action === 'add_student' && canAddStudent) {
      setEditingStudent(null);
      setIsAddModalOpen(true);
    } else if (tab === 'withdrawn') {
      setSelectedStatus('Withdrawn');
    } else if (tab === 'suspended') {
      setSelectedStatus('Suspended');
    } else if (tab === 'id_cards') {
      setSelectedStatus('Active');
      const firstActive = students.find((s) => s.status === 'Active') || students[0];
      if (firstActive) {
        setViewingStudent(firstActive);
        setProfileTab('overview');
      }
    } else if (tab === 'list' || tab === 'guardians') {
      setSelectedStatus('all');
      setSelectedClass('all');
      setSelectedShift('all');
      setSearchTerm('');
    }
    clearNavigationIntent();
  }, [navigationIntent, canAddStudent, students, setSearchTerm, clearNavigationIntent]);

  // Form State
  const initialForm: Omit<Student, 'id'> = {
    rollNumber: '',
    fullName: '',
    arabicName: '',
    gender: 'Female',
    birthDate: '2011-01-01',
    classId: classes[0]?.id || 'CLS-1A',
    section: classes[0]?.section || 'A',
    shift: classes[0]?.shift || 'Subax',
    admissionDate: new Date().toISOString().substring(0, 10),
    status: 'Active',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80',
    bloodGroup: 'O+',
    guardianName: '',
    guardianPhone: '+252 90 7',
    guardianRelation: 'Aabbe (Father)',
    guardianAddress: 'Xaafadda Daawad, Qardho',
    emergencyContact: '+252 90 7',
    notes: '',
    portalUsername: '',
  };

  const [formData, setFormData] = useState<Omit<Student, 'id'>>(initialForm);

  // Always resolve viewingStudent against live students list so deleted students disappear immediately
  const liveViewingStudent = viewingStudent
    ? students.find((s) => s.id === viewingStudent.id) || null
    : null;

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const cls = classes.find((c) => c.id === s.classId);
      const effectiveShift: StudyShift = s.shift || cls?.shift || 'Subax';

      const matchesSearch =
        s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.arabicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.guardianPhone.includes(searchTerm);

      const matchesClass = selectedClass === 'all' || s.classId === selectedClass;
      const matchesShift = selectedShift === 'all' || effectiveShift === selectedShift;
      const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;

      return matchesSearch && matchesClass && matchesShift && matchesStatus;
    });
  }, [students, classes, searchTerm, selectedClass, selectedShift, selectedStatus]);

  const handleShiftSelectInForm = (newShift: StudyShift) => {
    const shiftClasses = classes.filter((c) => (c.shift || 'Subax') === newShift);
    const currentClassMatches = shiftClasses.some((c) => c.id === formData.classId);
    const nextClass = currentClassMatches
      ? shiftClasses.find((c) => c.id === formData.classId)
      : shiftClasses[0];

    setFormData((prev) => ({
      ...prev,
      shift: newShift,
      classId: nextClass ? nextClass.id : prev.classId,
      section: nextClass ? nextClass.section : prev.section,
    }));
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.guardianPhone) return;

    if (editingStudent) {
      const nextIssueDate = editingStudent.idCardIssueDate || formData.admissionDate;
      await updateStudent(editingStudent.id, {
        ...formData,
        portalUsername: editingStudent.portalUsername || generateMachadStudentUsername(editingStudent.id),
        idCardIssueDate: nextIssueDate,
        idCardExpiryDate:
          formData.admissionDate !== editingStudent.admissionDate
            ? calculateSixYearExpiry(formData.admissionDate)
            : editingStudent.idCardExpiryDate || calculateSixYearExpiry(nextIssueDate),
      });
      setEditingStudent(null);
    } else {
      await addStudent(formData);
      setIsAddModalOpen(false);
    }
    setFormData(initialForm);
  };

  const handleOpenEdit = (s: Student) => {
    const cls = classes.find((c) => c.id === s.classId);
    setEditingStudent(s);
    setFormData({
      rollNumber: s.rollNumber,
      fullName: s.fullName,
      arabicName: s.arabicName,
      gender: s.gender,
      birthDate: s.birthDate,
      classId: s.classId,
      section: s.section,
      shift: s.shift || cls?.shift || 'Subax',
      admissionDate: s.admissionDate,
      status: s.status,
      photoUrl: s.photoUrl,
      bloodGroup: s.bloodGroup,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      guardianRelation: s.guardianRelation,
      guardianAddress: s.guardianAddress,
      emergencyContact: s.emergencyContact,
      notes: s.notes || '',
      portalUsername: s.portalUsername || generateMachadStudentUsername(s.id),
    });
  };

  const handleResetStudentPassword = async (student: Student) => {
    const res = await adminResetStudentPassword(student.id);
    if (res.success) {
      setResetNotice(
        `Furaha ardayga ${student.fullName} (${student.portalUsername || generateMachadStudentUsername(student.id)}) dib ayaa loogu dejiyay furaha bilowga ah.`
      );
      setTimeout(() => setResetNotice(null), 6000);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Student ID',
      'Roll No',
      'Full Name',
      'Class',
      'Section',
      'Shift',
      'Gender',
      'Birth Date',
      'Admission Date',
      'Status',
      'Blood Group',
      'Guardian Name',
      'Guardian Phone',
      'Address',
    ];
    const rows = filteredStudents.map((s) => {
      const cls = classes.find((c) => c.id === s.classId);
      return [
        s.id,
        s.rollNumber,
        s.fullName,
        cls?.name || s.classId,
        s.section,
        s.shift || cls?.shift || 'Subax',
        s.gender,
        s.birthDate,
        s.admissionDate,
        s.status,
        s.bloodGroup,
        s.guardianName,
        s.guardianPhone,
        s.guardianAddress,
      ];
    });
    downloadCSV(`ardayda_machadka_khadiija_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Module Header & Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Diiwaanka Ardayda (Student Directory)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Maamul xogta ardayda, kaararka aqoonsiga (ID Cards), iyo shahaadooyinka diiwaangelinta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Soo Degso CSV
          </button>
          {canAddStudent && (
            <>
              <button
                onClick={() => setIsBulkExcelOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#005A51] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Soo Geli Excel (50+ Arday)
              </button>
              <button
                onClick={() => {
                  setFormData({
                    ...initialForm,
                    rollNumber: String(students.length + 101),
                  });
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg transition-colors shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Diiwaangeli Arday Cusub
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        {/* Search */}
        <div className="sm:col-span-2 lg:flex-1 lg:min-w-[200px] relative">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Raadi magac, ID, taleefan..."
            className="w-full pl-8 pr-3 py-2 sm:py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#005A51]"
          />
        </div>

        {/* Shift Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 dark:text-slate-500 shrink-0">Xilliga:</span>
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value as 'all' | StudyShift)}
            className="flex-1 lg:flex-initial bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 sm:py-1.5 text-slate-800 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#005A51]"
          >
            <option value="all">Subax & Galab</option>
            <option value="Subax">Subax (Morning)</option>
            <option value="Galab">Galab (Afternoon)</option>
          </select>
        </div>

        {/* Class Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 dark:text-slate-500 shrink-0">Fasalka:</span>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="flex-1 lg:flex-initial bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 sm:py-1.5 text-slate-800 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#005A51]"
          >
            <option value="all">Dhammaan Fasallada ({classes.length})</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.section}) · {c.shift || 'Subax'}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 dark:text-slate-500 shrink-0">Xaaladda:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex-1 lg:flex-initial bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 sm:py-1.5 text-slate-800 dark:text-slate-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-[#005A51]"
          >
            <option value="all">Dhammaan</option>
            <option value="Active">Firfircoon (Active)</option>
            <option value="Withdrawn">Ka Baxay (Withdrawn)</option>
            <option value="Dropped">Laga Saaray (Dropped)</option>
            <option value="Suspended">Hakad (Suspended)</option>
            <option value="Alumni">Qalin-jabiyay (Alumni)</option>
          </select>
        </div>

        <div className="text-slate-400 dark:text-slate-500 text-xs font-mono-numbers lg:ml-auto">
          Wadarta: <span className="font-bold text-slate-800 dark:text-slate-100">{filteredStudents.length}</span> arday
        </div>
      </div>

      {resetNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            {resetNotice}
          </span>
          <button type="button" onClick={() => setResetNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="px-4 py-3">Ardayga (Student)</th>
                <th className="px-3 py-3">Roll / ID</th>
                <th className="px-3 py-3">Fasalka & Qeybta</th>
                <th className="px-3 py-3">Waalidka / Xiriirka</th>
                <th className="px-3 py-3">Dhiigga</th>
                <th className="px-3 py-3">Xaaladda</th>
                <th className="px-4 py-3 text-right">Ficillo (Actions)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((s) => {
                  const cls = classes.find((c) => c.id === s.classId);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={s.photoUrl}
                            alt={s.fullName}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div>
                            <div className="font-bold text-slate-900 hover:text-[#005A51] cursor-pointer" onClick={() => setViewingStudent(s)}>
                              {s.fullName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono-numbers">
                        <span className="font-bold text-[#005A51]">{s.id}</span>
                        <span className="block text-[11px] text-slate-400">Roll: {s.rollNumber}</span>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800">
                        <div>
                          {cls?.name || s.classId}
                          <span className="ml-1 text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono-numbers">
                            {s.section}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            (s.shift || cls?.shift || 'Subax') === 'Subax'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                          }`}
                        >
                          {(s.shift || cls?.shift || 'Subax') === 'Subax' ? (
                            <Sun className="w-2.5 h-2.5" />
                          ) : (
                            <Sunset className="w-2.5 h-2.5" />
                          )}
                          {s.shift || cls?.shift || 'Subax'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <span className="font-medium text-slate-800 block">{s.guardianName}</span>
                        <span className="text-[11px] font-mono-numbers text-slate-500">{s.guardianPhone}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-bold text-red-600 font-mono-numbers bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                          {s.bloodGroup}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            s.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : s.status === 'Withdrawn' || s.status === 'Dropped'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : s.status === 'Suspended'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Portal Credentials Slip */}
                          <button
                            onClick={() => openPrint({ type: 'student_portal_slip', student: s })}
                            title="Soo saar Warqadda Gelitaanka Portal-ka (Portal Login Slip)"
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 rounded-md transition-colors"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          {/* ID Card Generator */}
                          <button
                            onClick={() => openPrint({ type: 'student_id_card', student: s })}
                            title="Maamul & Daabac Kaarka Aqoonsiga (ID Card)"
                            className="p-1.5 text-[#005A51] hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded-md transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {/* Enrollment Certificate */}
                          <button
                            onClick={() => openPrint({ type: 'enrollment_certificate', student: s })}
                            title="Soo saar Shahaadada Diiwaangelinta"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-colors"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>
                          {/* View Profile */}
                          <button
                            onClick={() => {
                              setViewingStudent(s);
                              setProfileTab('overview');
                              setConfirmProfileDrop(false);
                              setConfirmProfileDelete(false);
                            }}
                            title="Eeg Faahfaahinta & Dhaqdhaqaaqa"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Edit */}
                          {canEditStudent && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(s)}
                                title="Wax ka beddel (Edit)"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleResetStudentPassword(s)}
                                title="Dib u deji Furaha Ardayga (Reset Password)"
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {/* Restore if Withdrawn / Dropped / Suspended */}
                          {canDropStudent && (s.status === 'Withdrawn' || s.status === 'Dropped' || s.status === 'Suspended') && (
                            <button
                              onClick={() => restoreStudent(s.id)}
                              title="Dib u soo celi ardayga (Restore Active)"
                              className="px-2 py-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors"
                            >
                              Soo Celi
                            </button>
                          )}
                          {/* Drop / Withdraw */}
                          {canDropStudent && s.status !== 'Withdrawn' && s.status !== 'Dropped' && (
                            confirmDropId === s.id ? (
                              <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                <button
                                  onClick={async () => {
                                    await dropStudent(s.id);
                                    setConfirmDropId(null);
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-600 text-white rounded"
                                >
                                  Withdraw
                                </button>
                                <button
                                  onClick={() => setConfirmDropId(null)}
                                  className="px-1.5 py-0.5 text-[10px] text-slate-600 bg-white rounded"
                                >
                                  Maya
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setConfirmDropId(s.id);
                                  setConfirmDeleteId(null);
                                }}
                                title="Ka saar fasalka (Drop / Withdraw Student)"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                          {/* Delete */}
                          {canDeleteStudent && (
                            confirmDeleteId === s.id ? (
                              <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">
                                <button
                                  onClick={async () => {
                                    await deleteStudent(s.id);
                                    if (viewingStudent?.id === s.id) setViewingStudent(null);
                                    if (editingStudent?.id === s.id) setEditingStudent(null);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded"
                                >
                                  Hubi
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 text-[10px] text-slate-600 bg-white rounded"
                                >
                                  Maya
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setConfirmDeleteId(s.id);
                                  setConfirmDropId(null);
                                }}
                                title="Si buuxda u tirtir (Delete)"
                                className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Wax arday ah lagama helin xulashadan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Tab Student Profile Modal */}
      {liveViewingStudent && (() => {
        const studentActivityLogs = auditLogs.filter(
          (log) =>
            log.studentId === liveViewingStudent.id ||
            log.user.includes(liveViewingStudent.id) ||
            log.details.includes(liveViewingStudent.id) ||
            log.details.includes(liveViewingStudent.fullName)
        );
        const cardIssueDate = liveViewingStudent.idCardIssueDate || liveViewingStudent.admissionDate;
        const cardExpiryDate = liveViewingStudent.idCardExpiryDate || calculateSixYearExpiry(cardIssueDate);
        const experience = calculateStudentExperience(liveViewingStudent.admissionDate);
        const uniqueUsername =
          liveViewingStudent.portalUsername || generateMachadStudentUsername(liveViewingStudent.id);

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-5 bg-gradient-to-r from-[#005A51] to-[#007A6E] text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={liveViewingStudent.photoUrl}
                    alt={liveViewingStudent.fullName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-amber-300 shadow-sm"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{liveViewingStudent.fullName}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-amber-200">
                        {liveViewingStudent.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-teal-100 font-mono-numbers mt-0.5">
                      ID: {liveViewingStudent.id} · Roll: {liveViewingStudent.rollNumber} · User: {uniqueUsername}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {canEditStudent && (
                    <>
                      <button
                        onClick={() => {
                          setViewingStudent(null);
                          handleOpenEdit(liveViewingStudent);
                        }}
                        className="px-2.5 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleResetStudentPassword(liveViewingStudent)}
                        className="px-2.5 py-1.5 bg-indigo-500/80 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset PW
                      </button>
                    </>
                  )}
                  {canDropStudent && (liveViewingStudent.status === 'Withdrawn' || liveViewingStudent.status === 'Dropped' || liveViewingStudent.status === 'Suspended') && (
                    <button
                      onClick={() => restoreStudent(liveViewingStudent.id)}
                      className="px-2.5 py-1.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Soo Celi
                    </button>
                  )}
                  {canDropStudent && liveViewingStudent.status !== 'Withdrawn' && liveViewingStudent.status !== 'Dropped' && (
                    confirmProfileDrop ? (
                      <div className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 px-2 py-1 rounded-lg text-[11px] font-bold">
                        <span>Withdraw?</span>
                        <button
                          onClick={async () => {
                            await dropStudent(liveViewingStudent.id);
                            setConfirmProfileDrop(false);
                          }}
                          className="px-1.5 py-0.5 bg-slate-900 text-white rounded"
                        >
                          Hubi
                        </button>
                        <button
                          onClick={() => setConfirmProfileDrop(false)}
                          className="px-1.5 py-0.5 bg-white/70 text-slate-900 rounded"
                        >
                          Maya
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmProfileDrop(true);
                          setConfirmProfileDelete(false);
                        }}
                        className="px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Withdraw
                      </button>
                    )
                  )}
                  {canDeleteStudent && (
                    confirmProfileDelete ? (
                      <div className="inline-flex items-center gap-1 bg-red-600 text-white px-2 py-1 rounded-lg text-[11px] font-bold">
                        <span>Tirtir?</span>
                        <button
                          onClick={async () => {
                            await deleteStudent(liveViewingStudent.id);
                            setConfirmProfileDelete(false);
                            setViewingStudent(null);
                          }}
                          className="px-1.5 py-0.5 bg-white text-red-700 rounded"
                        >
                          Haa
                        </button>
                        <button
                          onClick={() => setConfirmProfileDelete(false)}
                          className="px-1.5 py-0.5 bg-red-800 text-white rounded"
                        >
                          Maya
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmProfileDelete(true);
                          setConfirmProfileDrop(false);
                        }}
                        className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    )
                  )}
                  <button
                    onClick={() => setViewingStudent(null)}
                    className="p-1.5 text-teal-100 hover:text-white hover:bg-teal-700/50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Profile Tabs */}
              <div className="flex flex-wrap items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold">
                <button
                  onClick={() => setProfileTab('overview')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    profileTab === 'overview'
                      ? 'bg-[#005A51] text-white'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Dulmar Guud
                </button>
                <button
                  onClick={() => setProfileTab('attendance')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    profileTab === 'attendance'
                      ? 'bg-[#005A51] text-white'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Xaadirinta
                </button>
                <button
                  onClick={() => setProfileTab('marks')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    profileTab === 'marks'
                      ? 'bg-[#005A51] text-white'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Imtixaanaadka
                </button>
                <button
                  onClick={() => setProfileTab('fees')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    profileTab === 'fees'
                      ? 'bg-[#005A51] text-white'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  Lacag-bixinta
                </button>
                <button
                  onClick={() => setProfileTab('activity')}
                  className={`px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 ${
                    profileTab === 'activity'
                      ? 'bg-[#005A51] text-white'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  Dhaqdhaqaaqa ({studentActivityLogs.length})
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => openPrint({ type: 'student_id_card', student: liveViewingStudent })}
                    className="px-2.5 py-1 text-xs font-semibold text-[#005A51] bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3" />
                    ID Card
                  </button>
                  <button
                    onClick={() => openPrint({ type: 'enrollment_certificate', student: liveViewingStudent })}
                    className="px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 flex items-center gap-1"
                  >
                    <FileCheck className="w-3 h-3" />
                    Shahaado
                  </button>
                </div>
              </div>

              {/* Profile Tab Content */}
              <div className="flex-1 overflow-y-auto p-5 text-xs text-slate-700">
                {profileTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Taariikhda Dhalashada:</span>
                        <span className="font-semibold text-slate-800">{liveViewingStudent.birthDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Dhiigga (Blood Group):</span>
                        <span className="font-bold text-red-600">{liveViewingStudent.bloodGroup}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Fasalka & Xilliga:</span>
                        <span className="font-semibold text-slate-800">
                          {classes.find((c) => c.id === liveViewingStudent.classId)?.name} ({liveViewingStudent.section}) ·{' '}
                          <span className="text-[#005A51] font-bold">
                            {liveViewingStudent.shift || classes.find((c) => c.id === liveViewingStudent.classId)?.shift || 'Subax'}
                          </span>
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Diiwaangelin / ID Card Dhacaa (6 Sano):</span>
                        <span className="font-semibold text-slate-800 font-mono-numbers">
                          {cardIssueDate} → <span className="text-rose-600">{cardExpiryDate}</span>
                        </span>
                      </div>
                      <div className="col-span-2 bg-teal-50/70 border border-teal-200 rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">
                          Muddo-joogga Ardayga (Student Experience Duration · Max 6 Yrs):
                        </span>
                        <span className="font-bold text-[#005A51] font-mono-numbers">
                          {experience.years} Years, {experience.months} Months, {experience.days} Days
                        </span>
                        <span className="text-[10px] text-slate-500 ml-2">
                          ({experience.formattedSomali})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Portal Username (Unique):</span>
                        <span className="font-mono-numbers font-bold text-[#005A51]">
                          {uniqueUsername}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Xaaladda Furaha (Password):</span>
                        <span className="font-semibold text-slate-800">
                          {liveViewingStudent.mustChangePassword !== false
                            ? 'Protected (bcrypt · Beddel Qasab ah Marka 1aad)'
                            : 'Protected (bcrypt · Ardayga ayaa beddelay)'}
                        </span>
                      </div>
                    </div>

                    <div className="border border-slate-200 p-4 rounded-lg space-y-2">
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                        Xogta Waalidka & Masuulka
                      </h4>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Magaca Waalidka:</span>
                          <span className="font-semibold text-slate-800">{liveViewingStudent.guardianName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Qaraabada:</span>
                          <span className="text-slate-700">{liveViewingStudent.guardianRelation}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Taleefanka:</span>
                          <span className="font-mono-numbers font-semibold text-slate-800">{liveViewingStudent.guardianPhone}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Gurmad Degdeg:</span>
                          <span className="font-mono-numbers font-semibold text-red-600">{liveViewingStudent.emergencyContact}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-slate-400 block">Cinwaanka:</span>
                          <span className="text-slate-700">{liveViewingStudent.guardianAddress}</span>
                        </div>
                      </div>
                    </div>

                    {liveViewingStudent.notes && (
                      <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-lg text-amber-900">
                        <span className="font-bold block text-[11px] mb-0.5">Xusuusin Maamulka:</span>
                        <p>{liveViewingStudent.notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'attendance' && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Taariikhda Xaadirinta ee Ardayga ({liveViewingStudent.fullName})
                    </div>
                    {attendance.filter((a) => a.studentId === liveViewingStudent.id).length > 0 ? (
                      <div className="space-y-2">
                        {attendance
                          .filter((a) => a.studentId === liveViewingStudent.id)
                          .map((rec) => (
                            <div
                              key={rec.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                            >
                              <span className="font-mono-numbers font-semibold text-slate-800">{rec.date}</span>
                              <span
                                className={`px-2 py-0.5 rounded font-semibold ${
                                  rec.status === 'Present'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rec.status === 'Late'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {rec.status === 'Present' ? 'Jooga' : rec.status === 'Late' ? 'Soo Daahay' : 'Maqan'}
                              </span>
                              <span className="text-slate-400">{rec.remarks || '—'}</span>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 py-4 text-center">Ma jirto xaadirin hore oo loo diiwaangeliyay.</p>
                    )}
                  </div>
                )}

                {profileTab === 'marks' && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Buundooyinka & Natiijooyinka Imtixaanka
                    </div>
                    {marks.filter((m) => m.studentId === liveViewingStudent.id).length > 0 ? (
                      <div className="space-y-2">
                        {marks
                          .filter((m) => m.studentId === liveViewingStudent.id)
                          .map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">Maadada: {m.subjectId}</span>
                                <span className="block text-[11px] text-slate-500">{m.remarks}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono-numbers font-bold text-slate-900 text-sm">
                                  {m.marksObtained}/{m.maxMarks}
                                </span>
                                <span className="ml-2 font-bold text-[#005A51]">({m.grade})</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 py-4 text-center">Weli buundooyin lama gelin ardaygan.</p>
                    )}
                  </div>
                )}

                {profileTab === 'fees' && (
                  <div className="space-y-3">
                    <div className="text-xs font-semibold text-slate-700">
                      Biilasha & Lacag-bixinta Ardayga
                    </div>
                    {invoices.filter((i) => i.studentId === liveViewingStudent.id).length > 0 ? (
                      <div className="space-y-2">
                        {invoices
                          .filter((i) => i.studentId === liveViewingStudent.id)
                          .map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">{inv.title}</span>
                                <span className="block text-[11px] text-slate-400">Due: {inv.dueDate}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono-numbers font-bold text-slate-900">
                                  ${inv.amount.toFixed(2)}
                                </span>
                                <span
                                  className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    inv.status === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {inv.status}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 py-4 text-center">Ma jiraan biilal loo soo saaray ardaygan.</p>
                    )}
                  </div>
                )}

                {profileTab === 'activity' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-700">
                        Dhaqdhaqaaqa Ardayga ee System-ka ({liveViewingStudent.fullName})
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {studentActivityLogs.length} Diiwaan
                      </span>
                    </div>
                    {studentActivityLogs.length > 0 ? (
                      <div className="space-y-2">
                        {studentActivityLogs.map((log) => (
                          <div
                            key={log.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                                  {log.action}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    log.status === 'Failure'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {log.status || 'Success'}
                                </span>
                                <span className="font-semibold text-slate-800">{log.module}</span>
                                {log.resource && (
                                  <span className="text-[10px] font-mono text-slate-400">{log.resource}</span>
                                )}
                              </div>
                              <p className="text-slate-600">{log.details}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono-numbers text-[10px] text-slate-400 whitespace-nowrap block">
                                {log.timestamp}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">{log.ipAddress}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 py-6 text-center">
                        Weli dhaqdhaqaaq lagama diiwaangelin ardaygan.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit Student Modal */}
      {(isAddModalOpen || editingStudent) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">
                {editingStudent ? 'Wax ka beddel Xogta Ardayga' : 'Diiwaangelinta Arday Cusub (2026–2027)'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingStudent(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Profile Image Uploader with Device, URL, & Preset support */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <ProfileImageUploader
                  currentImageUrl={formData.photoUrl}
                  onImageChange={(url) => setFormData({ ...formData, photoUrl: url })}
                  type="student"
                  label="Sawirka Ardayga (Student Profile Picture)"
                  shape="circle"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-600 font-medium mb-1">Magaca Buuxa (Somali / English): *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="tusaale: Faadumo Axmed Jaamac"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                </div>

                {/* Shift Selector (Subax / Galab) */}
                <div className="col-span-2">
                  <label className="block text-slate-600 font-semibold mb-1.5">
                    Xilliga Waxbarashada (Subax / Galab): *
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleShiftSelectInForm('Subax')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                        (formData.shift || 'Subax') === 'Subax'
                          ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-400/30 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Subax (Morning)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiftSelectInForm('Galab')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                        formData.shift === 'Galab'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-400/30 shadow-2xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Sunset className="w-4 h-4 text-indigo-500" />
                      <span>Galab (Afternoon)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">
                    Fasalka ({formData.shift || 'Subax'}): *
                  </label>
                  <select
                    value={formData.classId}
                    onChange={(e) => {
                      const pickedClass = classes.find((c) => c.id === e.target.value);
                      setFormData({
                        ...formData,
                        classId: e.target.value,
                        section: pickedClass ? pickedClass.section : formData.section,
                        shift: pickedClass?.shift || formData.shift || 'Subax',
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  >
                    {(classes.filter((c) => (c.shift || 'Subax') === (formData.shift || 'Subax')).length > 0
                      ? classes.filter((c) => (c.shift || 'Subax') === (formData.shift || 'Subax'))
                      : classes
                    ).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.section}) - {c.shift || 'Subax'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Qeybta (Section):</label>
                  <select
                    value={formData.section}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  >
                    <option value="A">Qeybta A</option>
                    <option value="B">Qeybta B</option>
                    <option value="C">Qeybta C</option>
                    <option value="D">Qeybta D</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Jinsiga (Gender):</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  >
                    <option value="Female">Dheddig (Female)</option>
                    <option value="Male">Lab (Male)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Dhiigga (Blood Group):</label>
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  >
                    <option value="O+">O+</option>
                    <option value="A+">A+</option>
                    <option value="B+">B+</option>
                    <option value="AB+">AB+</option>
                    <option value="O-">O-</option>
                    <option value="A-">A-</option>
                    <option value="B-">B-</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Taariikhda Dhalashada:</label>
                  <input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Taariikhda Diiwaangelinta:</label>
                  <input
                    type="date"
                    value={formData.admissionDate}
                    onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    ID Card-ku wuxuu dhacaa (6 Sano): <strong>{calculateSixYearExpiry(formData.admissionDate)}</strong>
                  </span>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Xaaladda Ardayga (Status):</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Student['status'] })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  >
                    <option value="Active">Active (Firfircoon)</option>
                    <option value="Withdrawn">Withdrawn (Ka Baxay)</option>
                    <option value="Dropped">Dropped (Laga Saaray)</option>
                    <option value="Suspended">Suspended (Hakad)</option>
                    <option value="Alumni">Alumni (Qalin-jabiyay)</option>
                  </select>
                </div>

                <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-teal-50/60 p-3 rounded-lg border border-teal-200">
                  <div>
                    <span className="block text-[10px] uppercase text-slate-500 font-bold mb-0.5">
                      Portal Username (Si Toos ah oo Gaar ah):
                    </span>
                    <span className="font-mono-numbers font-bold text-[#005A51] text-xs">
                      {editingStudent
                        ? editingStudent.portalUsername || generateMachadStudentUsername(editingStudent.id)
                        : 'Si toos ah ayaa loo samaynayaa markii la keydiyo'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-500 font-bold mb-0.5">
                      Amniga Furaha (Hashed / bcrypt):
                    </span>
                    <span className="font-mono-numbers font-bold text-slate-800 text-xs">
                      Qarsoodi (Beddel Qasab ah marka koowaad)
                    </span>
                  </div>
                </div>
              </div>

              {/* Guardian Info */}
              <div className="pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 mb-2">Macluumaadka Waalidka / Masuulka</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Magaca Waalidka: *</label>
                    <input
                      type="text"
                      required
                      value={formData.guardianName}
                      onChange={(e) => setFormData({ ...formData, guardianName: e.target.value })}
                      placeholder="Magaca aabaha ama hooyada"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Taleefanka Waalidka: *</label>
                    <input
                      type="text"
                      required
                      value={formData.guardianPhone}
                      onChange={(e) => setFormData({ ...formData, guardianPhone: e.target.value })}
                      placeholder="+252 90 7xxxxxx"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Xiriirka (Relation):</label>
                    <input
                      type="text"
                      value={formData.guardianRelation}
                      onChange={(e) => setFormData({ ...formData, guardianRelation: e.target.value })}
                      placeholder="Aabbe / Hooyo / Eedo"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Gurmad Degdeg ah (Emergency):</label>
                    <input
                      type="text"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      placeholder="+252 90 7xxxxxx"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-600 font-medium mb-1">Cinwaanka (Address in Qardho):</label>
                    <input
                      type="text"
                      value={formData.guardianAddress}
                      onChange={(e) => setFormData({ ...formData, guardianAddress: e.target.value })}
                      placeholder="tusaale: Xaafadda Daawad, Qardho"
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-600 font-medium mb-1">Xusuusin / Faahfaahin dheeraad ah:</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Xifdiga Qur'aanka, xaalad caafimaad, iwm..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingStudent(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  {editingStudent ? 'Keydi Wax ka beddelka' : 'Diiwaangeli Ardayga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK EXCEL IMPORT MODAL */}
      <BulkStudentExcelModal
        isOpen={isBulkExcelOpen}
        onClose={() => setIsBulkExcelOpen(false)}
      />
    </div>
  );
};
