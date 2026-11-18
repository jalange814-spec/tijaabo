/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../../context/AppContext';
import { Gender, Student, StudyShift } from '../../types';
import { downloadCSV } from '../../utils/exportCsv';
import {
  X,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Sun,
  Sunset,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface BulkStudentExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedStudentRow {
  rowIndex: number;
  fullName: string;
  gender: Gender;
  birthDate: string;
  bloodGroup: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  guardianAddress: string;
  rollNumber: string;
  notes: string;
  error?: string;
}

const DEFAULT_FEMALE_PHOTO =
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80';
const DEFAULT_MALE_PHOTO =
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=256&h=256&q=80';

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .trim()
    .replace(/[\s_\-\/().*]+/g, '');
}

function excelSerialToDate(value: unknown): string {
  if (typeof value === 'number' && value > 10000 && value < 70000) {
    const utcDays = Math.floor(value - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().substring(0, 10);
    }
  }
  const str = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return '2011-01-01';
}

function parseGender(val: unknown): Gender {
  const s = String(val || '').trim().toLowerCase();
  if (['male', 'lab', 'wiil', 'm', 'ذكر'].includes(s)) return 'Male';
  return 'Female';
}

function findField(row: Record<string, unknown>, candidates: string[]): string {
  const entries = Object.entries(row);
  for (const cand of candidates) {
    const normCand = normalizeKey(cand);
    for (const [k, v] of entries) {
      if (normalizeKey(k) === normCand && v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
  }
  return '';
}

function findRawField(row: Record<string, unknown>, candidates: string[]): unknown {
  const entries = Object.entries(row);
  for (const cand of candidates) {
    const normCand = normalizeKey(cand);
    for (const [k, v] of entries) {
      if (normalizeKey(k) === normCand && v !== undefined && v !== null && String(v).trim() !== '') {
        return v;
      }
    }
  }
  return undefined;
}

export const BulkStudentExcelModal: React.FC<BulkStudentExcelModalProps> = ({ isOpen, onClose }) => {
  const { classes, students, addStudentsBatch } = useApp();

  const [selectedShift, setSelectedShift] = useState<StudyShift>('Subax');
  const shiftClasses = useMemo(
    () => classes.filter((c) => (c.shift || 'Subax') === selectedShift),
    [classes, selectedShift]
  );

  const [targetClassId, setTargetClassId] = useState<string>(classes[0]?.id || 'CLS-1A');
  const [showGuide, setShowGuide] = useState(true);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [parseError, setParseError] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const activeClass =
    classes.find((c) => c.id === targetClassId) || shiftClasses[0] || classes[0];

  const handleShiftSwitch = (newShift: StudyShift) => {
    setSelectedShift(newShift);
    const matching = classes.filter((c) => (c.shift || 'Subax') === newShift);
    if (matching.length > 0 && !matching.some((c) => c.id === targetClassId)) {
      setTargetClassId(matching[0].id);
    }
  };

  const handleDownloadSampleExcel = () => {
    const sheetHeaders = [
      'Magaca Buuxa',
      'Jinsiga',
      'Magaca Waalidka',
      'Taleefanka Waalidka',
      'Xiriirka Waalidka',
      'Cinwaanka',
      'Taariikhda Dhalashada',
      'Dhiigga',
      'Roll No',
      'Xusuusin',
    ];

    const sampleRows = [
      [
        'Faadumo Axmed Jaamac',
        'Female',
        'Axmed Jaamac Cali',
        '+252 90 7711223',
        'Aabbe',
        'Xaafadda Daawad, Qardho',
        '2011-05-14',
        'O+',
        '',
        'Xifdiga Juz Amma',
      ],
      [
        'Cabdiraxmaan Maxamed Yuusuf',
        'Male',
        'Maxamed Yuusuf Faarax',
        '+252 90 7744556',
        'Aabbe',
        'Xaafadda Xorgoble, Qardho',
        '2011-08-22',
        'A+',
        '',
        '',
      ],
      [
        'Xaliimo Saciid Warsame',
        'Female',
        'Saciid Warsame Shire',
        '+252 90 7799001',
        'Hooyo',
        'Xaafadda Kubo, Qardho',
        '2012-01-10',
        'B+',
        '',
        '',
      ],
    ];

    const wsData = [sheetHeaders, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [
      { wch: 28 },
      { wch: 11 },
      { wch: 24 },
      { wch: 19 },
      { wch: 16 },
      { wch: 26 },
      { wch: 20 },
      { wch: 10 },
      { wch: 11 },
      { wch: 22 },
    ];

    const guideRows = [
      ['HAGE & TILMAAME QAABKA DIYAARINTA EXCEL-KA ARDAYDA (MACHADKA KHADIIJA)'],
      [''],
      ['Tiirka (Column Name)', 'Waa Qasab?', 'Qaabka Saxda ah / Tusaale', 'Faahfaahin (Explanation)'],
      ['Magaca Buuxa', 'HAA (Qasab)', 'Faadumo Axmed Jaamac', 'Magaca buuxa ee ardayga (Somali ama English oo kaliya). Haddii uu bannaanaado safka lama qaadanayo.'],
      ['Jinsiga', 'Maya (Default: Female)', 'Female / Male (ama Dheddig / Lab)', 'U qor Female/Dheddig ama Male/Lab.'],
      ['Magaca Waalidka', 'Maya (Talo)', 'Axmed Jaamac Cali', 'Magaca aabaha, hooyada, ama masuulka ardayga.'],
      ['Taleefanka Waalidka', 'HAA (Qasab)', '+252 90 7711223', 'Lambarka taleefanka waalidka si loola xiriiro.'],
      ['Xiriirka Waalidka', 'Maya (Default: Aabbe)', 'Aabbe / Hooyo / Eedo', 'Xiriirka masuulka la diiwaangelinayo.'],
      ['Cinwaanka', 'Maya', 'Xaafadda Daawad, Qardho', 'Xaafadda iyo magaalada uu deggan yahay.'],
      ['Taariikhda Dhalashada', 'Maya', '2011-05-14', 'Qaabka YYYY-MM-DD (ama taariikhda caadiga ah ee Excel).'],
      ['Dhiigga', 'Maya (Default: O+)', 'O+, A+, B+, AB+, O-', 'Kooxda dhiigga ardayga.'],
      ['Roll No', 'Maya (Auto)', '115 (ama ka daa bannaan)', 'Haddii aad ka tagto bannaan, nidaamka ayaa si toos ah u samaynaya.'],
      ['Xusuusin', 'Maya', 'Heerka Xifdiga / Caafimaad', 'Faahfaahin dheeraad ah oo ku saabsan ardayga.'],
      [''],
      ['FIIRO GAAR AH:', 'Waxaad hal mar ku soo gelin kartaa 50, 100, ama ka badan arday hal fayl oo Excel ah adigoo ka dooranaya fasalkooda & xilliga (Subax/Galab) shaashadda soo gelinta.'],
    ];
    const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
    wsGuide['!cols'] = [{ wch: 24 }, { wch: 20 }, { wch: 28 }, { wch: 62 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ardayda_Cusub');
    XLSX.utils.book_append_sheet(wb, wsGuide, 'Hage_Tilmaame');

    const safeClassName = (activeClass?.name || 'Fasal').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Sample_Diiwaangelinta_Ardayda_${safeClassName}.xlsx`);
  };

  const handleDownloadCsvTemplate = () => {
    const headers = [
      'Magaca Buuxa',
      'Jinsiga',
      'Magaca Waalidka',
      'Taleefanka Waalidka',
      'Xiriirka Waalidka',
      'Cinwaanka',
      'Taariikhda Dhalashada',
      'Dhiigga',
      'Roll No',
      'Xusuusin',
    ];
    const rows = [
      [
        'Faadumo Axmed Jaamac',
        'Female',
        'Axmed Jaamac Cali',
        '+252 90 7711223',
        'Aabbe',
        'Xaafadda Daawad, Qardho',
        '2011-05-14',
        'O+',
        '',
        '',
      ],
      [
        'Cabdiraxmaan Maxamed Yuusuf',
        'Male',
        'Maxamed Yuusuf Faarax',
        '+252 90 7744556',
        'Aabbe',
        'Xaafadda Xorgoble, Qardho',
        '2011-08-22',
        'A+',
        '',
        '',
      ],
    ];
    downloadCSV('Sample_Diiwaangelinta_Ardayda.csv', headers, rows);
  };

  const processFile = async (file: File) => {
    setParseError('');
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        setParseError('Faylka Excel-ku ma laha wax bog ah (Sheet).');
        setParsedRows([]);
        return;
      }

      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

      if (rawJson.length === 0) {
        setParseError('Faylka waa madhan yahay. Fadlan soo degso Sample Excel-ka oo ku buuxi xogta ardayda.');
        setParsedRows([]);
        return;
      }

      const parsed: ParsedStudentRow[] = rawJson
        .map((row, idx) => {
          const fullName = findField(row, [
            'Magaca Buuxa',
            'Magaca Ardayga',
            'Magaca',
            'Full Name',
            'Student Name',
            'Name',
            'fullName',
          ]);
          const genderRaw = findField(row, ['Jinsiga', 'Gender', 'Sex', 'Nooca']);
          const birthRaw = findRawField(row, [
            'Taariikhda Dhalashada',
            'Birth Date',
            'DOB',
            'birthDate',
          ]);
          const bloodGroup =
            findField(row, ['Dhiigga', 'Blood Group', 'Blood', 'bloodGroup']) || 'O+';
          const guardianName =
            findField(row, [
              'Magaca Waalidka',
              'Waalidka',
              'Guardian Name',
              'Parent Name',
              'guardianName',
            ]) || 'Waalidka Ardayga';
          const guardianPhone = findField(row, [
            'Taleefanka Waalidka',
            'Taleefanka',
            'Tel',
            'Phone',
            'Guardian Phone',
            'Parent Phone',
            'Mobile',
            'guardianPhone',
          ]);
          const guardianRelation =
            findField(row, ['Xiriirka Waalidka', 'Xiriirka', 'Relation', 'guardianRelation']) ||
            'Aabbe';
          const guardianAddress =
            findField(row, ['Cinwaanka', 'Xaafadda', 'Address', 'guardianAddress']) ||
            'Qardho, Karkaar';
          const rollNumber = findField(row, ['Roll No', 'Roll', 'Roll Number', 'rollNumber']);
          const notes = findField(row, ['Xusuusin', 'Faallo', 'Notes', 'notes']);

          const errors: string[] = [];
          if (!fullName) errors.push('Magaca Buuxa waa maqan yahay');
          if (!guardianPhone) errors.push('Taleefanka Waalidka waa maqan yahay');

          return {
            rowIndex: idx + 2,
            fullName,
            gender: parseGender(genderRaw),
            birthDate: excelSerialToDate(birthRaw),
            bloodGroup,
            guardianName,
            guardianPhone,
            guardianRelation,
            guardianAddress,
            rollNumber,
            notes,
            error: errors.length > 0 ? errors.join(' · ') : undefined,
          };
        })
        // Drop completely empty trailing rows
        .filter((r) => r.fullName !== '' || r.guardianPhone !== '');

      if (parsed.length === 0) {
        setParseError(
          'Wax saf ah oo xog leh lama helin. Hubi in tiirarka faylkaagu waafaqsan yihiin Hagaha ("Magaca Buuxa", "Taleefanka Waalidka").'
        );
      }
      setParsedRows(parsed);
    } catch {
      setParseError('Khalad ayaa ka dhacay akhrinta faylka. Hubi inuu yahay .xlsx, .xls, ama .csv sax ah.');
      setParsedRows([]);
    }
  };

  const validRows = parsedRows.filter((r) => !r.error);
  const invalidRows = parsedRows.filter((r) => !!r.error);

  const handleRemoveRow = (rowIndex: number) => {
    setParsedRows((prev) => prev.filter((r) => r.rowIndex !== rowIndex));
  };

  const handleImportSubmit = async () => {
    if (validRows.length === 0 || !activeClass) return;

    const today = new Date().toISOString().substring(0, 10);
    const payload: Omit<Student, 'id'>[] = validRows.map((row, idx) => ({
      rollNumber: row.rollNumber || String(students.length + idx + 101),
      fullName: row.fullName,
      arabicName: '',
      gender: row.gender,
      birthDate: row.birthDate || '2011-01-01',
      classId: activeClass.id,
      section: activeClass.section,
      shift: activeClass.shift || selectedShift,
      admissionDate: today,
      status: 'Active',
      photoUrl: row.gender === 'Male' ? DEFAULT_MALE_PHOTO : DEFAULT_FEMALE_PHOTO,
      bloodGroup: row.bloodGroup || 'O+',
      guardianName: row.guardianName,
      guardianPhone: row.guardianPhone,
      guardianRelation: row.guardianRelation || 'Aabbe',
      guardianAddress: row.guardianAddress || 'Qardho, Karkaar',
      emergencyContact: row.guardianPhone,
      notes: row.notes || 'Lagu soo geliyay Excel (Bulk Import)',
      portalUsername: '',
    }));

    const created = await addStudentsBatch(payload);
    if (created.length > 0) {
      setParsedRows([]);
      setFileName('');
      onClose();
    }
  };

  const handleResetAndClose = () => {
    setParsedRows([]);
    setFileName('');
    setParseError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#005A51] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl">
              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                Diiwaangelinta Ardayda Badan ee Excel (Bulk Student Excel Import)
              </h3>
              <p className="text-[11px] text-teal-100">
                Hal mar ku soo geli 50+ arday oo hal fasal ah, adigoo isticmaalaya Sample Excel iyo Hagaha tilmaamaha.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* STEP 1: Target Class & Shift */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <span className="w-5 h-5 rounded-full bg-[#005A51] text-white text-[11px] flex items-center justify-center font-bold">
                  1
                </span>
                <span>Dooro Xilliga (Subax / Galab) iyo Fasalka la gelinayo Ardayda</span>
              </div>
              {activeClass && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-[#005A51] dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                  {activeClass.name} ({activeClass.section}) · {activeClass.shift || selectedShift}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Shift toggle */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Xilliga Waxbarashada:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleShiftSwitch('Subax')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border font-bold transition-all ${
                      selectedShift === 'Subax'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-400/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Subax (Morning)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShiftSwitch('Galab')}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg border font-bold transition-all ${
                      selectedShift === 'Galab'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-400/30'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Galab (Afternoon)</span>
                  </button>
                </div>
              </div>

              {/* Target Class Select */}
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Fasalka Ardayda Cusub ({selectedShift}):
                </label>
                <select
                  value={activeClass?.id || ''}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#005A51]"
                >
                  {(shiftClasses.length > 0 ? shiftClasses : classes).map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.section}) · {cls.shift || 'Subax'} - {cls.roomNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: Guide & Sample Excel Template Download */}
          <div className="border border-amber-200 dark:border-amber-800/70 bg-amber-50/40 dark:bg-amber-950/20 rounded-xl overflow-hidden">
            <div className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[11px] flex items-center justify-center font-bold">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-600" />
                    Hage Tilmaame & Soo Degsasho Sample Excel
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Soo degso faylka diyaarsan (Simple Excel) si aad ugu qorto ilaa 50+ arday adigoo raacaya tiirarka saxda ah.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSampleExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#005A51] hover:bg-[#004841] text-white font-bold rounded-lg shadow-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  Soo Degso Sample Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold rounded-lg transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV Template
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuide((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-amber-800 dark:text-amber-300 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 font-semibold rounded-lg"
                >
                  {showGuide ? (
                    <>
                      Qari Hagaha <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      Fur Hagaha <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {showGuide && (
              <div className="px-4 pb-4 space-y-3 border-t border-amber-200/70 dark:border-amber-800/50 pt-3">
                <div className="overflow-x-auto rounded-lg border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-amber-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-amber-200 dark:border-slate-700">
                        <th className="px-3 py-2 font-bold">Magaca Tiirka (Excel Header)</th>
                        <th className="px-3 py-2 font-bold">Xaaladda</th>
                        <th className="px-3 py-2 font-bold">Tusaale & Tilmaan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      <tr>
                        <td className="px-3 py-1.5 font-bold text-[#005A51] dark:text-teal-400">Magaca Buuxa</td>
                        <td className="px-3 py-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold text-[10px]">
                            Qasab *
                          </span>
                        </td>
                        <td className="px-3 py-1.5">
                          <code>Faadumo Axmed Jaamac</code> (Sidoo kale wuxuu aqoonsadaa: <em>Full Name</em>)
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-bold text-[#005A51] dark:text-teal-400">Taleefanka Waalidka</td>
                        <td className="px-3 py-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-bold text-[10px]">
                            Qasab *
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono-numbers">
                          <code>+252 90 7711223</code> (Sidoo kale: <em>Guardian Phone / Phone</em>)
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-semibold">Jinsiga</td>
                        <td className="px-3 py-1.5 text-slate-400">Ikhtiyaari</td>
                        <td className="px-3 py-1.5">
                          <code>Female</code> / <code>Dheddig</code> ama <code>Male</code> / <code>Lab</code> (Default: Female)
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-semibold">Magaca Waalidka & Xiriirka</td>
                        <td className="px-3 py-1.5 text-slate-400">Ikhtiyaari</td>
                        <td className="px-3 py-1.5">
                          <code>Axmed Jaamac Cali</code> · Xiriirka: <code>Aabbe</code> ama <code>Hooyo</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-1.5 font-semibold">Cinwaanka, Dhalashada, Dhiigga, Roll No</td>
                        <td className="px-3 py-1.5 text-slate-400">Ikhtiyaari</td>
                        <td className="px-3 py-1.5">
                          <code>Xaafadda Daawad, Qardho</code> · <code>2011-05-14</code> · <code>O+</code> · Roll No si toos ah ayaa loo sameeyaa haddii la banneeyo.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-amber-900 dark:text-amber-200">
                  <strong>Tilmaan:</strong> Arday kasta oo Excel lagu soo geliyo waxaa si toos ah loogu samaynayaa <strong>Student ID</strong> gaar ah, <strong>Username</strong> u gaar ah, iyo <strong>Initial Password</strong> qarsoodi ah (bcrypt — beddel qasab ah marka koowaad).
                </p>
              </div>
            )}
          </div>

          {/* STEP 3: Upload File */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <span className="w-5 h-5 rounded-full bg-[#005A51] text-white text-[11px] flex items-center justify-center font-bold">
                3
              </span>
              <span>Soo Geli Faylka Excel-ka Ardayda (.xlsx, .xls, ama .csv)</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) processFile(dropped);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#005A51] bg-teal-50/70 dark:bg-teal-950/40'
                  : 'border-slate-300 dark:border-slate-700 hover:border-[#005A51] hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) processFile(file);
                  e.target.value = '';
                }}
              />
              <Upload className="w-8 h-8 text-[#005A51] dark:text-teal-400 mx-auto mb-2" />
              {fileName ? (
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">{fileName}</p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-300">
                    Riix halkan haddii aad rabto inaad beddesho faylka
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Halkan ku rido (Drop) ama Riix si aad u doorato faylka Excel-ka
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Wuxuu taageeraa .XLSX, .XLS, iyo .CSV (xitaa 50 ilaa 500 arday hal mar)
                  </p>
                </div>
              )}
            </div>

            {parseError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}
          </div>

          {/* PREVIEW TABLE */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-[#005A51] dark:text-teal-400" />
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Hubinta Xogta ({parsedRows.length} saf)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                    <CheckCircle2 className="w-3 h-3" /> {validRows.length} Diyaar ah
                  </span>
                  {invalidRows.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold text-[11px]">
                      <AlertCircle className="w-3 h-3" /> {invalidRows.length} Khalad leh (lama gelinayo)
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  Fasalka: <strong>{activeClass?.name} ({activeClass?.section}) · {activeClass?.shift || selectedShift}</strong>
                </span>
              </div>

              <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-2.5 py-2">#</th>
                      <th className="px-2.5 py-2">Magaca Buuxa</th>
                      <th className="px-2.5 py-2">Jinsiga</th>
                      <th className="px-2.5 py-2">Waalidka</th>
                      <th className="px-2.5 py-2">Taleefanka</th>
                      <th className="px-2.5 py-2">Xaaladda</th>
                      <th className="px-2.5 py-2 text-right">Saar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={`${row.rowIndex}-${idx}`}
                        className={
                          row.error
                            ? 'bg-red-50/60 dark:bg-red-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }
                      >
                        <td className="px-2.5 py-1.5 font-mono-numbers text-slate-400">{idx + 1}</td>
                        <td className="px-2.5 py-1.5 font-semibold text-slate-900 dark:text-slate-100">
                          {row.fullName || <span className="text-red-500 italic">Magac maqan</span>}
                        </td>
                        <td className="px-2.5 py-1.5">{row.gender === 'Male' ? 'Lab' : 'Dheddig'}</td>
                        <td className="px-2.5 py-1.5 text-slate-600 dark:text-slate-300">{row.guardianName}</td>
                        <td className="px-2.5 py-1.5 font-mono-numbers">
                          {row.guardianPhone || <span className="text-red-500 italic">Tel maqan</span>}
                        </td>
                        <td className="px-2.5 py-1.5">
                          {row.error ? (
                            <span className="text-red-600 font-semibold">{row.error}</span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Sax</span>
                          )}
                        </td>
                        <td className="px-2.5 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.rowIndex)}
                            title="Ka saar safkan"
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/70 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {validRows.length > 0
              ? `Diyaar u ah in la diiwaangeliyo: ${validRows.length} arday -> ${activeClass?.name} (${activeClass?.section})`
              : 'Soo degso Sample Excel-ka kadibna soo geli faylka buuxa.'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Xir
            </button>
            <button
              type="button"
              disabled={validRows.length === 0}
              onClick={handleImportSubmit}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-[#005A51] hover:bg-[#004841] disabled:opacity-45 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Diiwaangeli Dhammaan ({validRows.length} Arday)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
