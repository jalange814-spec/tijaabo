/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ExamCard, ExamCardBatch, SchoolSettings } from '../../types';
import {
  chunkCardsForA4,
  generateExamCardsPdf,
  buildPrintableExamCardsHtml,
} from '../../utils/examCardPdf';
import {
  IdCard,
  Printer,
  Download,
  PlusCircle,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  X,
  CheckSquare,
  Square,
  FileText,
  ShieldAlert,
  Search,
} from 'lucide-react';

const ALLOWED_ROLES = ['Super Admin', 'Administrator', 'Academic Manager'];

interface ExamCardGraphicProps {
  card: ExamCard;
  settings: SchoolSettings;
  compact: boolean; // true for 8/page (2x4), false for 5/page (1x5)
}

const ExamCardGraphic: React.FC<ExamCardGraphicProps> = ({ card, settings, compact }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = (card.studentName || 'ST')
    .split(' ')
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  return (
    <div
      className={`exam-card-item bg-white text-slate-900 border-2 border-[#00723A] rounded-lg overflow-hidden flex flex-col justify-between shadow-2xs ${
        compact ? 'min-h-[212px]' : 'min-h-[186px]'
      }`}
    >
      {/* Green Header + Gold Divider */}
      <div className="bg-[#00723A] text-white px-3 py-2 border-b-[3px] border-[#FCA700] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white border border-[#FCA700] flex items-center justify-center overflow-hidden shrink-0">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="text-[10px] font-bold text-[#00723A]">MK</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-arabic font-bold text-[#FCA700] leading-tight truncate">
              معهد خديجة بنت خويلد – قرطو
            </div>
            <div className="text-[10px] font-extrabold tracking-tight leading-tight truncate">
              MACHADKA KHADIIJA BINTU KHUWAYLID – QARDHO
            </div>
            <div className="text-[9px] text-emerald-100 uppercase tracking-wider leading-tight">
              Kaarka Imtixaanka · Examination ID Card
            </div>
          </div>
        </div>

        <div className="text-right shrink-0 border border-[#FCA700]/70 bg-white/10 rounded px-2 py-0.5">
          <div className="text-[9px] font-mono-numbers font-bold text-[#FCA700]">
            {card.academicYear}
          </div>
          <div className="text-[10px] font-bold text-white max-w-[110px] truncate">
            {card.examTitle}
          </div>
        </div>
      </div>

      {/* Body: Photo + Student Info */}
      <div className="flex-1 px-3 py-2.5 flex items-center gap-3">
        <div
          className={`${
            compact ? 'w-14 h-16' : 'w-16 h-20'
          } rounded-md border border-slate-300 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0`}
        >
          {card.photoUrl && !imgFailed ? (
            <img
              src={card.photoUrl}
              alt={card.studentName}
              className="w-full h-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="text-sm font-extrabold text-[#00723A]">{initials || 'ST'}</span>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1 text-[10px]">
          <div>
            <div className="text-xs font-extrabold text-slate-900 truncate">{card.studentName}</div>
            {card.studentArabicName && (
              <div className="text-[11px] font-arabic font-semibold text-amber-700 leading-tight truncate">
                {card.studentArabicName}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5">
            <div className="truncate">
              <span className="text-slate-500 font-semibold">ID: </span>
              <span className="font-mono-numbers font-bold text-[#00723A]">{card.studentId}</span>
            </div>
            <div className="truncate">
              <span className="text-slate-500 font-semibold">Roll/Kursi: </span>
              <span className="font-mono-numbers font-bold">
                {card.rollNumber} / {card.seatNumber}
              </span>
            </div>
            <div className="truncate">
              <span className="text-slate-500 font-semibold">Fasalka: </span>
              <span className="font-bold">
                {card.className} ({card.section}) · {card.shift}
              </span>
            </div>
            <div className="truncate">
              <span className="text-slate-500 font-semibold">Taariikhda: </span>
              <span className="font-mono-numbers font-semibold">{card.examDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Instructions + Signature + Stamp */}
      <div className="bg-slate-50 border-t border-slate-200 px-3 py-1.5 flex items-center justify-between gap-2 text-[9px] text-slate-600">
        <div className="min-w-0 flex-1 truncate">
          <span className="font-semibold text-slate-700">Tilmaam: </span>
          <span>{card.instructions || 'Soo qaado kaarkan & qalinka imtixaanka.'}</span>
          <span className="ml-1.5 font-mono-numbers text-[#00723A] font-semibold">({card.id})</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-center border-t border-slate-400 pt-0.5 px-1.5 text-[8px] font-semibold text-slate-700">
            Saxiixa: {settings.principalName}
          </div>
          <div className="w-8 h-8 rounded-full border border-[#00723A] flex flex-col items-center justify-center text-[6px] font-extrabold text-[#00723A] leading-none">
            <span>KHADIIJA</span>
            <span className="text-[#FCA700]">●</span>
            <span>QARDHO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ExamCardsModule: React.FC = () => {
  const {
    currentRole,
    settings,
    classes,
    students,
    exams,
    examCardBatches,
    examCards,
    fetchExamCardsData,
    generateExamCardsBatch,
    updateExamCardBatch,
    regenerateExamCardBatch,
    deleteExamCardBatch,
    updateExamCardRecord,
    deleteExamCardRecord,
    showToast,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const isAuthorized = ALLOWED_ROLES.includes(currentRole);

  useEffect(() => {
    if (isAuthorized) {
      fetchExamCardsData();
    }
  }, [isAuthorized, fetchExamCardsData]);

  const [activeTab, setActiveTab] = useState<'generate' | 'manage' | 'batches'>('generate');

  useEffect(() => {
    if (navigationIntent?.module !== 'exam_cards') return;
    if (navigationIntent.tab === 'manage' || navigationIntent.tab === 'batches' || navigationIntent.tab === 'generate') {
      setActiveTab(navigationIntent.tab);
    }
    clearNavigationIntent();
  }, [navigationIntent, clearNavigationIntent]);

  // Bulk Generation State
  const [genClassId, setGenClassId] = useState<string>(classes[0]?.id || '');
  const [genSection, setGenSection] = useState<string>('all');
  const [genAcademicYear, setGenAcademicYear] = useState<string>(settings.academicYear || '2026–2027');
  const [genExamId, setGenExamId] = useState<string>(exams[0]?.id || 'custom');
  const [genCustomExamTitle, setGenCustomExamTitle] = useState<string>(
    exams[0]?.title || 'Imtixaanka Dhexe (Midterm)'
  );
  const [genExamDate, setGenExamDate] = useState<string>(
    exams[0]?.startDate || new Date().toISOString().substring(0, 10)
  );
  const [genInstructions, setGenInstructions] = useState<string>(
    'Ardaygu waa inuu keenaa kaarkan imtixaanka 15 daqiiqo ka hor bilowga.'
  );
  const [genCardsPerPage, setGenCardsPerPage] = useState<5 | 8>(8);
  const [genIncludeInactive, setGenIncludeInactive] = useState<boolean>(false);
  const [genRegenerateDupes, setGenRegenerateDupes] = useState<boolean>(false);
  const [genSelectedStudentIds, setGenSelectedStudentIds] = useState<string[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Management & Print State
  const [filterBatchId, setFilterBatchId] = useState<string>('all');
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [searchCardQuery, setSearchCardQuery] = useState<string>('');
  const [printCardsPerPage, setPrintCardsPerPage] = useState<5 | 8>(8);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [previewCards, setPreviewCards] = useState<ExamCard[] | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Edit / Delete Modals
  const [editingCard, setEditingCard] = useState<ExamCard | null>(null);
  const [cardEditForm, setCardEditForm] = useState({
    examTitle: '',
    academicYear: '',
    examDate: '',
    seatNumber: '',
    instructions: '',
    status: 'Active' as 'Active' | 'Revoked',
  });
  const [confirmDeleteCard, setConfirmDeleteCard] = useState<ExamCard | null>(null);

  const [editingBatch, setEditingBatch] = useState<ExamCardBatch | null>(null);
  const [batchEditForm, setBatchEditForm] = useState({
    examTitle: '',
    academicYear: '',
    examDate: '',
    instructions: '',
    cardsPerPage: 8 as 5 | 8,
    status: 'Active' as 'Active' | 'Archived',
  });
  const [confirmDeleteBatch, setConfirmDeleteBatch] = useState<ExamCardBatch | null>(null);

  // Sync genClassId if classes load asynchronously
  useEffect(() => {
    if (!genClassId && classes[0]) {
      setGenClassId(classes[0].id);
    }
  }, [classes, genClassId]);

  const classCandidateStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (s.classId !== genClassId) return false;
        if (genSection !== 'all' && s.section !== genSection) return false;
        if (!genIncludeInactive && s.status !== 'Active') return false;
        return true;
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [students, genClassId, genSection, genIncludeInactive]);

  const effectiveGenCount = genSelectedStudentIds
    ? genSelectedStudentIds.filter((id) => classCandidateStudents.some((s) => s.id === id)).length
    : classCandidateStudents.length;

  const estimatedA4Pages =
    effectiveGenCount > 0 ? Math.ceil(effectiveGenCount / genCardsPerPage) : 0;

  const availableSections = useMemo(() => {
    const secs = new Set(
      students.filter((s) => s.classId === genClassId).map((s) => s.section).filter(Boolean)
    );
    const cls = classes.find((c) => c.id === genClassId);
    if (cls?.section) secs.add(cls.section);
    return Array.from(secs);
  }, [students, classes, genClassId]);

  const filteredCards = useMemo(() => {
    const q = searchCardQuery.trim().toLowerCase();
    return examCards.filter((c) => {
      if (filterBatchId !== 'all' && c.batchId !== filterBatchId) return false;
      if (filterClassId !== 'all' && c.classId !== filterClassId) return false;
      if (filterYear !== 'all' && c.academicYear !== filterYear) return false;
      if (q) {
        return (
          c.id.toLowerCase().includes(q) ||
          c.studentId.toLowerCase().includes(q) ||
          c.studentName.toLowerCase().includes(q) ||
          c.rollNumber.toLowerCase().includes(q) ||
          c.className.toLowerCase().includes(q) ||
          c.examTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [examCards, filterBatchId, filterClassId, filterYear, searchCardQuery]);

  const selectedCardsList = useMemo(
    () => filteredCards.filter((c) => selectedCardIds.includes(c.id)),
    [filteredCards, selectedCardIds]
  );

  const uniqueYears = useMemo(() => {
    const yrs = new Set<string>([settings.academicYear]);
    examCardBatches.forEach((b) => yrs.add(b.academicYear));
    return Array.from(yrs).filter(Boolean);
  }, [examCardBatches, settings.academicYear]);

  if (!isAuthorized) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-6 text-center space-y-2 text-xs">
        <ShieldAlert className="w-8 h-8 text-rose-600 mx-auto" />
        <h3 className="text-sm font-bold text-rose-800 dark:text-rose-200">
          403 – Oggolaansho La&apos;aan (Forbidden)
        </h3>
        <p className="text-rose-700 dark:text-rose-300">
          Qaybta Kaararka Imtixaanka waxaa geli kara Maamulka Guud iyo Madaxa Waxbarashada oo keliya.
        </p>
      </div>
    );
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genClassId || !genCustomExamTitle.trim()) return;
    setIsGenerating(true);
    const chosenIds = genSelectedStudentIds
      ? genSelectedStudentIds.filter((id) => classCandidateStudents.some((s) => s.id === id))
      : undefined;

    const res = await generateExamCardsBatch({
      classId: genClassId,
      section: genSection,
      academicYear: genAcademicYear.trim(),
      examId: genExamId !== 'custom' ? genExamId : undefined,
      examTitle: genCustomExamTitle.trim(),
      examDate: genExamDate,
      instructions: genInstructions.trim(),
      cardsPerPage: genCardsPerPage,
      studentIds: chosenIds,
      includeInactive: genIncludeInactive,
      regenerate: genRegenerateDupes,
    });
    setIsGenerating(false);

    if (res.ok) {
      setPrintCardsPerPage(genCardsPerPage);
      if (res.batch?.id) {
        setFilterBatchId(res.batch.id);
      } else {
        setFilterBatchId('all');
        setFilterClassId(genClassId);
      }
      setActiveTab('manage');
    }
  };

  const handleToggleCardSelection = (id: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allIds = filteredCards.map((c) => c.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedCardIds.includes(id));
    if (allSelected) {
      setSelectedCardIds((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedCardIds(Array.from(new Set([...selectedCardIds, ...allIds])));
    }
  };

  const handleDownloadPdf = async (cardsToExport: ExamCard[], label: string) => {
    if (cardsToExport.length === 0) {
      showToast('Ma jiraan kaarar la soo dejiyo.');
      return;
    }
    setIsExportingPdf(true);
    try {
      const info = await generateExamCardsPdf(
        cardsToExport,
        settings,
        printCardsPerPage,
        `Kaararka-Imtixaanka-${label}-${printCardsPerPage}perA4.pdf`
      );
      showToast(
        `PDF si guul leh ayaa loo soo dejiyay (${info.cardCount} kaar · ${info.pageCount} bog A4)!`
      );
    } catch {
      showToast('Khalad ayaa ka dhacay samaynta PDF-ka.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadPrintableHtml = (cardsToExport: ExamCard[]) => {
    if (cardsToExport.length === 0) return;
    const html = buildPrintableExamCardsHtml(cardsToExport, settings, printCardsPerPage);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kaararka-Imtixaanka-${printCardsPerPage}perA4.html`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Faylka daabacaadda A4 (HTML) waa la soo dejiyay — ka fur browser-ka si aad u daabacdo.');
  };

  const previewPages = previewCards ? chunkCardsForA4(previewCards, printCardsPerPage) : [];

  return (
    <div className="space-y-5">
      {/* Header & Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <IdCard className="w-5 h-5 text-[#00723A]" />
            Kaararka Imtixaanka (Examination ID Card Generator)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Soo saar kaarar imtixaan oo hal mar fasal dhan lagu daabici karo bogag A4 ah (5 ama 8 kaar boggii).
          </p>
        </div>

        <div className="w-full lg:w-auto overflow-x-auto">
          <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold whitespace-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'generate'
                ? 'bg-[#00723A] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Abuur &amp; Soo Saar
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'manage'
                ? 'bg-[#00723A] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Maamulka &amp; Daabacaadda ({examCards.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('batches')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'batches'
                ? 'bg-[#00723A] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Taariikhda Batches ({examCardBatches.length})
          </button>
          </div>
        </div>
      </div>

      {/* TAB 1: BULK GENERATE */}
      {activeTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <form
            onSubmit={handleGenerate}
            className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs"
          >
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                1. Habaynta Soo Saarista Kaararka Fasalka
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Xogta ardayda (Magaca, ID, Roll No, Fasalka, Sawirka) si toos ah ayaa looga soo qaadaa diiwaanka.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Sanad Dugsiyeedka (Academic Year)
                </label>
                <input
                  type="text"
                  required
                  value={genAcademicYear}
                  onChange={(e) => setGenAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Xilliga Imtixaanka (Exam Period)
                </label>
                <select
                  value={genExamId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGenExamId(val);
                    const found = exams.find((x) => x.id === val);
                    if (found) {
                      setGenCustomExamTitle(found.title);
                      if (found.startDate) setGenExamDate(found.startDate);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.term})
                    </option>
                  ))}
                  <option value="custom">-- Qor Cinwaan Kale --</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Cinwaanka Kaarka Imtixaanka
                </label>
                <input
                  type="text"
                  required
                  value={genCustomExamTitle}
                  onChange={(e) => setGenCustomExamTitle(e.target.value)}
                  placeholder="Tusaale: Imtixaanka Kama Dambaysta (Final)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Taariikhda Imtixaanka
                </label>
                <input
                  type="date"
                  required
                  value={genExamDate}
                  onChange={(e) => setGenExamDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono-numbers"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Dooro Fasalka (Class)
                </label>
                <select
                  value={genClassId}
                  onChange={(e) => {
                    setGenClassId(e.target.value);
                    setGenSection('all');
                    setGenSelectedStudentIds(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.section}) · {c.shift || 'Subax'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Qaybta / Section (Ikhtiyaari)
                </label>
                <select
                  value={genSection}
                  onChange={(e) => {
                    setGenSection(e.target.value);
                    setGenSelectedStudentIds(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="all">Dhammaan Qaybaha</option>
                  {availableSections.map((sec) => (
                    <option key={sec} value={sec}>
                      Section {sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Tilmaamaha Imtixaanka (Exam Instructions)
              </label>
              <input
                type="text"
                value={genInstructions}
                onChange={(e) => setGenInstructions(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            {/* Cards per A4 page selector */}
            <div>
              <label className="block font-semibold mb-2 text-slate-700 dark:text-slate-300">
                Qaadka Bogga A4 (Cards per A4 Sheet)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGenCardsPerPage(8)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    genCardsPerPage === 8
                      ? 'border-[#00723A] bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-[#00723A]/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    8 Kaar Boggii A4 (2 × 4 Grid)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Qaab isku-dhafan oo dhaqaaleeya waraaqaha (40 arday = 5 bog A4).
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setGenCardsPerPage(5)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    genCardsPerPage === 5
                      ? 'border-[#00723A] bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-[#00723A]/20'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    5 Kaar Boggii A4 (1 × 5 Rows)
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kaarar waaweyn oo akhrisku fudud yahay (40 arday = 8 bog A4).
                  </div>
                </button>
              </div>
            </div>

            {/* Duplicate & Inactive rules */}
            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={genRegenerateDupes}
                  onChange={(e) => setGenRegenerateDupes(e.target.checked)}
                  className="rounded border-slate-300 text-[#00723A]"
                />
                <span>Dib u cusboonaysii haddii kaar hore u jiray (Overwrite duplicates)</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={genIncludeInactive}
                  onChange={(e) => setGenIncludeInactive(e.target.checked)}
                  className="rounded border-slate-300 text-[#00723A]"
                />
                <span>Ku dar ardayda aan firfircoonayn (Withdrawn/Inactive)</span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-600 dark:text-slate-400">
                <strong className="text-[#00723A] dark:text-teal-300 font-mono-numbers">
                  {effectiveGenCount} arday
                </strong>{' '}
                →{' '}
                <strong className="font-mono-numbers">
                  {estimatedA4Pages} bog A4
                </strong>{' '}
                ({genCardsPerPage} kaar / bog)
              </div>

              <button
                type="submit"
                disabled={isGenerating || effectiveGenCount === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00723A] hover:bg-[#005A51] text-white font-bold shadow-xs disabled:opacity-50"
              >
                <PlusCircle className="w-4 h-4" />
                {isGenerating ? 'Waa la diyaarinayaa...' : 'Soo Saar Kaararka Fasalka'}
              </button>
            </div>
          </form>

          {/* Right column: Student checklist inside selected class */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col max-h-[540px] text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-2.5">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-slate-100">
                  Ardayda Fasalka ({classCandidateStudents.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Dooro dhammaan ama calaamadee arday gaar ah.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setGenSelectedStudentIds(
                    genSelectedStudentIds === null
                      ? []
                      : null
                  )
                }
                className="text-[11px] font-bold text-[#00723A] dark:text-teal-400 hover:underline"
              >
                {genSelectedStudentIds === null ? 'Ka Saaro Dhammaan' : 'Dooro Dhammaan'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {classCandidateStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Ma jiraan arday ku jirta fasalkan.
                </div>
              ) : (
                classCandidateStudents.map((stu) => {
                  const checked =
                    genSelectedStudentIds === null || genSelectedStudentIds.includes(stu.id);
                  return (
                    <label
                      key={stu.id}
                      className="py-2 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1 rounded"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (genSelectedStudentIds === null) {
                              setGenSelectedStudentIds(
                                classCandidateStudents
                                  .filter((x) => x.id !== stu.id)
                                  .map((x) => x.id)
                              );
                            } else if (genSelectedStudentIds.includes(stu.id)) {
                              setGenSelectedStudentIds(
                                genSelectedStudentIds.filter((id) => id !== stu.id)
                              );
                            } else {
                              setGenSelectedStudentIds([...genSelectedStudentIds, stu.id]);
                            }
                          }}
                          className="rounded border-slate-300 text-[#00723A]"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {stu.fullName}
                          </div>
                          <div className="text-[10px] font-mono-numbers text-slate-400">
                            {stu.id} · Roll: {stu.rollNumber}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {stu.status}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE, EDIT, DELETE & PRINT A4 */}
      {activeTab === 'manage' && (
        <div className="space-y-4">
          {/* Filters & Print Controls */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchCardQuery}
                  onChange={(e) => setSearchCardQuery(e.target.value)}
                  placeholder="Raadi magac, ID, Roll No, Card ID..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <select
                value={filterBatchId}
                onChange={(e) => setFilterBatchId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="all">Dhammaan Batches ({examCardBatches.length})</option>
                {examCardBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.examTitle} – {b.className} ({b.cardCount} kaar)
                  </option>
                ))}
              </select>

              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="all">Dhammaan Fasallada</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.section}) · {c.shift || 'Subax'}
                  </option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="all">Dhammaan Sanadaha</option>
                {uniqueYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Print Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Qaadka A4:
                </span>
                <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPrintCardsPerPage(8)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                      printCardsPerPage === 8
                        ? 'bg-[#00723A] text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    8 / A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintCardsPerPage(5)}
                    className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                      printCardsPerPage === 5
                        ? 'bg-[#00723A] text-white'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    5 / A4
                  </button>
                </div>

                <span className="text-[11px] text-slate-500 font-mono-numbers ml-1">
                  ({filteredCards.length} kaar ={' '}
                  {filteredCards.length > 0
                    ? Math.ceil(filteredCards.length / printCardsPerPage)
                    : 0}{' '}
                  bog A4)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={filteredCards.length === 0}
                  onClick={() => setPreviewCards(filteredCards)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00723A] hover:bg-[#005A51] text-white font-bold disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Daabac Dhammaan ({filteredCards.length})
                </button>

                <button
                  type="button"
                  disabled={selectedCardsList.length === 0}
                  onClick={() => setPreviewCards(selectedCardsList)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FCA700] hover:bg-amber-500 text-slate-950 font-bold disabled:opacity-40"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Daabac La Doortay ({selectedCardsList.length})
                </button>

                <button
                  type="button"
                  disabled={
                    isExportingPdf ||
                    (selectedCardsList.length === 0 && filteredCards.length === 0)
                  }
                  onClick={() =>
                    handleDownloadPdf(
                      selectedCardsList.length > 0 ? selectedCardsList : filteredCards,
                      selectedCardsList.length > 0 ? 'selected' : 'all'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#00723A] text-[#00723A] dark:text-teal-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExportingPdf
                    ? 'PDF Diyaarinaya...'
                    : `Soo Degso PDF (${
                        selectedCardsList.length > 0
                          ? selectedCardsList.length
                          : filteredCards.length
                      })`}
                </button>
              </div>
            </div>
          </div>

          {/* Cards Management Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="px-3 py-3 w-10">
                      <button
                        type="button"
                        onClick={handleSelectAllFiltered}
                        title="Dooro dhammaan"
                        className="text-slate-500 hover:text-[#00723A]"
                      >
                        {filteredCards.length > 0 &&
                        filteredCards.every((c) => selectedCardIds.includes(c.id)) ? (
                          <CheckSquare className="w-4 h-4 text-[#00723A]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3">Card ID / Kursi</th>
                    <th className="px-3 py-3">Ardayga</th>
                    <th className="px-3 py-3">Fasalka &amp; Waqtiga</th>
                    <th className="px-3 py-3">Imtixaanka &amp; Sanadka</th>
                    <th className="px-3 py-3">Xaaladda</th>
                    <th className="px-4 py-3 text-right">Ficillo (Print / Edit / Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                        Ma jiraan kaarar imtixaan oo u dhigma shaandheyntan. Tag &quot;Abuur &amp; Soo Saar&quot; si aad u samayso.
                      </td>
                    </tr>
                  ) : (
                    filteredCards.map((card) => {
                      const isSelected = selectedCardIds.includes(card.id);
                      return (
                        <tr
                          key={card.id}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                            isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                          }`}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCardSelection(card.id)}
                              className="rounded border-slate-300 text-[#00723A]"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-mono-numbers">
                            <div className="font-bold text-[#00723A] dark:text-teal-400">
                              {card.id}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Roll: {card.rollNumber} · Seat: {card.seatNumber}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {card.studentName}
                            </div>
                            <div className="text-[11px] font-mono-numbers text-slate-500">
                              {card.studentId}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {card.className} ({card.section})
                            </div>
                            <div className="text-[10px] text-slate-500">{card.shift}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {card.examTitle}
                            </div>
                            <div className="text-[10px] font-mono-numbers text-slate-500">
                              {card.academicYear} · {card.examDate}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                card.status === 'Active'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                              }`}
                            >
                              {card.status}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap space-x-1">
                            <button
                              type="button"
                              onClick={() => setPreviewCards([card])}
                              title="Eeg & Daabac 1 Kaar"
                              className="p-1.5 text-[#00723A] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdf([card], card.studentId)}
                              title="Soo Degso PDF (1 Kaar)"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCard(card);
                                setCardEditForm({
                                  examTitle: card.examTitle,
                                  academicYear: card.academicYear,
                                  examDate: card.examDate,
                                  seatNumber: card.seatNumber,
                                  instructions: card.instructions || '',
                                  status: card.status === 'Revoked' ? 'Revoked' : 'Active',
                                });
                              }}
                              title="Wax ka beddel kaarka"
                              className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCard(card)}
                              title="Tirtir kaarka"
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BATCH HISTORY & CRUD */}
      {activeTab === 'batches' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <th className="px-4 py-3">Batch ID</th>
                  <th className="px-4 py-3">Imtixaanka &amp; Sanadka</th>
                  <th className="px-4 py-3">Fasalka &amp; Qaybta</th>
                  <th className="px-4 py-3">Tirada Arday / Kaarar</th>
                  <th className="px-4 py-3">Sameeyaha &amp; Taariikhda</th>
                  <th className="px-4 py-3 text-right">Ficillo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {examCardBatches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Weli lama abuurin wax Batch kaarar ah.
                    </td>
                  </tr>
                ) : (
                  examCardBatches.map((batch) => (
                    <tr key={batch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono-numbers font-bold text-[#00723A] dark:text-teal-400">
                        {batch.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {batch.examTitle}
                        </div>
                        <div className="text-[11px] font-mono-numbers text-slate-500">
                          {batch.academicYear} · {batch.examDate}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {batch.className} ({batch.section})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {batch.shift} · {batch.cardsPerPage} kaar / A4
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono-numbers">
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {batch.cardCount} kaar
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {Math.ceil(Math.max(1, batch.cardCount) / (batch.cardsPerPage === 5 ? 5 : 8))}{' '}
                          bog A4
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-400">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {batch.createdBy}
                        </div>
                        <div className="font-mono-numbers">{batch.createdAt}</div>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFilterBatchId(batch.id);
                            setPrintCardsPerPage(batch.cardsPerPage === 5 ? 5 : 8);
                            setActiveTab('manage');
                          }}
                          title="Fur & Daabac Kaararka Batch-kan"
                          className="p-1.5 text-[#00723A] hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => regenerateExamCardBatch(batch.id)}
                          title="Dib u waafaji xogta ardayda (Sync Student Data)"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBatch(batch);
                            setBatchEditForm({
                              examTitle: batch.examTitle,
                              academicYear: batch.academicYear,
                              examDate: batch.examDate,
                              instructions: batch.instructions || '',
                              cardsPerPage: batch.cardsPerPage === 5 ? 5 : 8,
                              status: batch.status === 'Archived' ? 'Archived' : 'Active',
                            });
                          }}
                          title="Wax ka beddel Batch"
                          className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteBatch(batch)}
                          title="Tirtir Batch-ka"
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* A4 MULTI-PAGE PRINT PREVIEW MODAL (uses .print-modal-root for clean window.print()) */}
      {previewCards && (
        <div className="print-modal-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex items-start justify-center p-4">
          <div className="print-modal-dialog bg-slate-100 dark:bg-slate-900 rounded-xl shadow-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="no-print flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#00723A] text-white">
              <div className="text-xs">
                <div className="font-bold text-sm">
                  Hordhaca Daabacaadda A4 ({previewCards.length} Kaar · {previewPages.length} Bog A4)
                </div>
                <div className="text-emerald-100">
                  Habka: {printCardsPerPage} Kaar Boggii ({printCardsPerPage === 8 ? '2 × 4 Grid' : '1 × 5 Rows'})
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="inline-flex bg-white/15 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setPrintCardsPerPage(8)}
                    className={`px-2.5 py-1 rounded font-bold ${
                      printCardsPerPage === 8 ? 'bg-[#FCA700] text-slate-950' : 'text-white'
                    }`}
                  >
                    8 / A4
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintCardsPerPage(5)}
                    className={`px-2.5 py-1 rounded font-bold ${
                      printCardsPerPage === 5 ? 'bg-[#FCA700] text-slate-950' : 'text-white'
                    }`}
                  >
                    5 / A4
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(previewCards, 'preview')}
                  disabled={isExportingPdf}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FCA700] hover:bg-amber-400 text-slate-950 font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExportingPdf ? 'PDF...' : 'Soo Degso PDF'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadPrintableHtml(previewCards)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold"
                >
                  <FileText className="w-3.5 h-3.5" />
                  HTML Print
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#00723A] font-bold hover:bg-emerald-50"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Daabac Hadda
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewCards(null)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="print-modal-body overflow-y-auto p-6 space-y-6 bg-slate-200 dark:bg-slate-950">
              {previewPages.map((pageCards, pageIndex) => (
                <div
                  key={`a4-page-${pageIndex}`}
                  className="exam-a4-page print-surface bg-white text-slate-900 mx-auto shadow-lg border border-slate-300 p-4 rounded-sm"
                  style={{ width: '210mm', minHeight: '280mm' }}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold text-[#00723A] border-b border-slate-200 pb-1.5 mb-3">
                    <span>
                      MACHADKA KHADIIJA BINTU KHUWAYLID – KAARARKA IMTIXAANKA ({printCardsPerPage}/Bog)
                    </span>
                    <span className="font-mono-numbers text-slate-500">
                      Bogga {pageIndex + 1} / {previewPages.length}
                    </span>
                  </div>

                  <div
                    className={
                      printCardsPerPage === 8
                        ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                        : 'grid grid-cols-1 gap-3'
                    }
                  >
                    {pageCards.map((card) => (
                      <ExamCardGraphic
                        key={card.id}
                        card={card}
                        settings={settings}
                        compact={printCardsPerPage === 8}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Single Card */}
      {editingCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await updateExamCardRecord(editingCard.id, cardEditForm);
              if (ok) setEditingCard(null);
            }}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Wax Ka Beddel Kaarka: {editingCard.studentName}
              </h4>
              <button type="button" onClick={() => setEditingCard(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Cinwaanka Imtixaanka</label>
                <input
                  type="text"
                  required
                  value={cardEditForm.examTitle}
                  onChange={(e) => setCardEditForm((p) => ({ ...p, examTitle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Sanad Dugsiyeedka</label>
                  <input
                    type="text"
                    required
                    value={cardEditForm.academicYear}
                    onChange={(e) =>
                      setCardEditForm((p) => ({ ...p, academicYear: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Taariikhda</label>
                  <input
                    type="date"
                    required
                    value={cardEditForm.examDate}
                    onChange={(e) => setCardEditForm((p) => ({ ...p, examDate: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Lambarka Kursiga (Seat No)</label>
                  <input
                    type="text"
                    value={cardEditForm.seatNumber}
                    onChange={(e) => setCardEditForm((p) => ({ ...p, seatNumber: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Xaaladda</label>
                  <select
                    value={cardEditForm.status}
                    onChange={(e) =>
                      setCardEditForm((p) => ({
                        ...p,
                        status: e.target.value as 'Active' | 'Revoked',
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Revoked">Revoked</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Tilmaamaha</label>
                <input
                  type="text"
                  value={cardEditForm.instructions}
                  onChange={(e) =>
                    setCardEditForm((p) => ({ ...p, instructions: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Ka Noqo
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#00723A] text-white font-bold hover:bg-[#005A51]"
              >
                Keydi Isbeddelka
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Batch */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await updateExamCardBatch(editingBatch.id, batchEditForm);
              if (ok) setEditingBatch(null);
            }}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Wax Ka Beddel Batch: {editingBatch.id}
              </h4>
              <button type="button" onClick={() => setEditingBatch(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Cinwaanka Imtixaanka</label>
                <input
                  type="text"
                  required
                  value={batchEditForm.examTitle}
                  onChange={(e) => setBatchEditForm((p) => ({ ...p, examTitle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Sanad Dugsiyeedka</label>
                  <input
                    type="text"
                    required
                    value={batchEditForm.academicYear}
                    onChange={(e) =>
                      setBatchEditForm((p) => ({ ...p, academicYear: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Taariikhda Imtixaanka</label>
                  <input
                    type="date"
                    required
                    value={batchEditForm.examDate}
                    onChange={(e) =>
                      setBatchEditForm((p) => ({ ...p, examDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Kaar / Bog A4</label>
                  <select
                    value={batchEditForm.cardsPerPage}
                    onChange={(e) =>
                      setBatchEditForm((p) => ({
                        ...p,
                        cardsPerPage: Number(e.target.value) === 5 ? 5 : 8,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value={8}>8 Kaar / A4</option>
                    <option value={5}>5 Kaar / A4</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Xaaladda</label>
                  <select
                    value={batchEditForm.status}
                    onChange={(e) =>
                      setBatchEditForm((p) => ({
                        ...p,
                        status: e.target.value as 'Active' | 'Archived',
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Tilmaamaha</label>
                <input
                  type="text"
                  value={batchEditForm.instructions}
                  onChange={(e) =>
                    setBatchEditForm((p) => ({ ...p, instructions: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBatch(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Ka Noqo
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#00723A] text-white font-bold hover:bg-[#005A51]"
              >
                Keydi Batch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Single Card */}
      {confirmDeleteCard && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-5 space-y-4 text-xs shadow-2xl">
            <h4 className="font-bold text-sm text-rose-700 dark:text-rose-400">
              Ma hubtaa inaad tirtirto kaarkan?
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              Kaarka <strong>{confirmDeleteCard.id}</strong> ee ardayga{' '}
              <strong>{confirmDeleteCard.studentName}</strong> waa la tirtirayaa. Xogta ardayga iyo natiijooyinka imtixaanka lama taabanayo.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteCard(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Maya
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = confirmDeleteCard.id;
                  setConfirmDeleteCard(null);
                  await deleteExamCardRecord(id);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
              >
                Haa, Tirtir Kaarka
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Batch */}
      {confirmDeleteBatch && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-5 space-y-4 text-xs shadow-2xl">
            <h4 className="font-bold text-sm text-rose-700 dark:text-rose-400">
              Ma hubtaa inaad tirtirto Batch-kan?
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              Batch-ka <strong>{confirmDeleteBatch.id}</strong> ({confirmDeleteBatch.cardCount}{' '}
              kaar) waa la tirtirayaa. Xogta ardayda iyo buundooyinka imtixaanka way badbaadayaan.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteBatch(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Maya
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = confirmDeleteBatch.id;
                  setConfirmDeleteBatch(null);
                  await deleteExamCardBatch(id);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
              >
                Haa, Tirtir Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
