/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Examination, ExamMark } from '../../types';
import { downloadCSV } from '../../utils/exportCsv';
import {
  Award,
  PlusCircle,
  Printer,
  Save,
  CheckCircle,
  FileText,
  Calendar,
  X,
  Upload,
  Download,
  Trash2,
  Edit,
  Table,
  FileSpreadsheet,
  Check,
  AlertCircle,
} from 'lucide-react';

export const ExamsModule: React.FC = () => {
  const {
    exams,
    addExam,
    updateExam,
    deleteExam,
    classes,
    subjects,
    students,
    marks,
    saveMarksBatch,
    uploadStudentMarksBulk,
    openPrint,
    settings,
    currentRole,
    currentUser,
    showToast,
    focusedRecordIntent,
    setFocusedRecordIntent,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const canManageExams =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager';

  const teacherSubjects =
    currentRole === 'Teacher' && currentUser?.linkedTeacherId
      ? subjects.filter((s) => s.teacherId === currentUser.linkedTeacherId)
      : [];
  const availableSubjects =
    currentRole === 'Teacher' && teacherSubjects.length > 0 ? teacherSubjects : subjects;

  const [activeTab, setActiveTab] = useState<'marks_entry' | 'bulk_matrix' | 'report_cards' | 'exam_certificates' | 'exams_list'>('marks_entry');

  // Selected filters
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || 'EXAM-01');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'CLS-1A');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(availableSubjects[0]?.id || subjects[0]?.id || 'SUB-01');

  useEffect(() => {
    if (focusedRecordIntent?.type === 'exam') {
      setSelectedExamId(focusedRecordIntent.id);
      setActiveTab('marks_entry');
      setFocusedRecordIntent(null);
    } else if (focusedRecordIntent?.type === 'student') {
      const stu = students.find((s) => s.id === focusedRecordIntent.id);
      if (stu) {
        setSelectedClassId(stu.classId);
        setActiveTab('report_cards');
      }
      setFocusedRecordIntent(null);
    }
  }, [focusedRecordIntent, students, setFocusedRecordIntent]);

  useEffect(() => {
    if (navigationIntent?.module !== 'exams') return;
    const { tab, action } = navigationIntent;
    if (
      tab &&
      ['marks_entry', 'bulk_matrix', 'report_cards', 'exam_certificates', 'exams_list'].includes(tab)
    ) {
      setActiveTab(tab as typeof activeTab);
    }
    if (action === 'new_exam' && canManageExams) {
      setEditingExam(null);
      setIsNewExamOpen(true);
    }
    clearNavigationIntent();
  }, [navigationIntent, canManageExams, clearNavigationIntent]);

  // Modals
  const [isNewExamOpen, setIsNewExamOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Examination | null>(null);
  const [isCsvUploaderOpen, setIsCsvUploaderOpen] = useState(false);
  const [confirmDeleteExamId, setConfirmDeleteExamId] = useState<string | null>(null);

  // New / Edit Exam Form
  const [examForm, setExamForm] = useState<Omit<Examination, 'id'>>({
    title: '',
    term: 'Month 1',
    academicYear: settings.academicYear,
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date().toISOString().substring(0, 10),
    status: 'Draft',
    description: '',
  });

  // Students in selected class
  const classStudents = students.filter(
    (s) => s.classId === selectedClassId && s.status === 'Active'
  );

  // Subjects in selected class (or all subjects if not strictly filtered)
  const classSubjects = subjects.filter(
    (s) => !s.classId || s.classId === selectedClassId
  );

  const calculateGrade = (score: number) => {
    if (score >= 95) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 75) return 'B+';
    if (score >= 65) return 'B';
    if (score >= 55) return 'C+';
    if (score >= 50) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  };

  // Local Single Subject Marks state
  const [localScores, setLocalScores] = useState<{
    [studentId: string]: { score: number; remarks: string };
  }>({});

  // Local Full Matrix Marks state: { [studentId]: { [subjectId]: number } }
  const [matrixScores, setMatrixScores] = useState<{
    [studentId: string]: { [subjectId: string]: number };
  }>({});

  // CSV Uploader states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState('');
  const [parsedPreview, setParsedPreview] = useState<
    { studentId: string; studentName: string; score: number; remarks: string; valid: boolean }[]
  >([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  // Initialize local single subject scores
  useEffect(() => {
    const scores: typeof localScores = {};
    classStudents.forEach((st) => {
      const existing = marks.find(
        (m) =>
          m.examId === selectedExamId &&
          m.studentId === st.id &&
          m.subjectId === selectedSubjectId
      );
      if (existing) {
        scores[st.id] = { score: existing.marksObtained, remarks: existing.remarks || '' };
      } else {
        scores[st.id] = { score: 80, remarks: 'Dadaal wacan' };
      }
    });
    setLocalScores(scores);
  }, [selectedExamId, selectedClassId, selectedSubjectId, students, marks]);

  // Initialize full matrix scores
  useEffect(() => {
    const matrix: typeof matrixScores = {};
    classStudents.forEach((st) => {
      matrix[st.id] = {};
      classSubjects.forEach((sub) => {
        const existing = marks.find(
          (m) =>
            m.examId === selectedExamId &&
            m.studentId === st.id &&
            m.subjectId === sub.id
        );
        matrix[st.id][sub.id] = existing ? existing.marksObtained : 80;
      });
    });
    setMatrixScores(matrix);
  }, [selectedExamId, selectedClassId, students, marks, subjects]);

  const handleScoreChange = (studentId: string, val: string) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0));
    setLocalScores((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], score: num },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setLocalScores((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const handleSaveMarks = () => {
    const newMarks: ExamMark[] = classStudents.map((s, index) => {
      const score = localScores[s.id]?.score ?? 80;
      return {
        id: `MRK-${Date.now().toString().slice(-4)}${index}`,
        examId: selectedExamId,
        studentId: s.id,
        subjectId: selectedSubjectId,
        marksObtained: score,
        maxMarks: 100,
        grade: calculateGrade(score),
        remarks: localScores[s.id]?.remarks || 'Dadaal wacan',
      };
    });

    saveMarksBatch(newMarks);
  };

  const handleMatrixCellChange = (studentId: string, subjectId: string, val: string) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0));
    setMatrixScores((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: num,
      },
    }));
  };

  const handleSaveFullMatrix = () => {
    const allMarksToSave: ExamMark[] = [];
    let counter = 0;
    classStudents.forEach((st) => {
      classSubjects.forEach((sub) => {
        const score = matrixScores[st.id]?.[sub.id] ?? 80;
        allMarksToSave.push({
          id: `MRK-MTX-${Date.now().toString().slice(-4)}${counter++}`,
          examId: selectedExamId,
          studentId: st.id,
          subjectId: sub.id,
          marksObtained: score,
          maxMarks: 100,
          grade: calculateGrade(score),
          remarks: score >= 50 ? 'Gudbay' : 'Haray',
        });
      });
    });

    uploadStudentMarksBulk(allMarksToSave);
  };

  // CSV Template download
  const handleDownloadCsvTemplate = () => {
    const currentSub = subjects.find((s) => s.id === selectedSubjectId);
    const headers = ['StudentID', 'RollNumber', 'StudentName', 'SubjectCode', 'Score', 'Remarks'];
    const rows = classStudents.map((s) => [
      s.id,
      s.rollNumber,
      `"${s.fullName}"`,
      currentSub?.code || 'SUB-01',
      '80',
      '"Dadaal wacan"',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Template_Buundooyinka_${selectedClassId}_${selectedSubjectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // CSV File reading
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setCsvText(text);
      parseCsvString(text);
    };
    reader.readAsText(file);
  };

  const parseCsvString = (text: string) => {
    setCsvError(null);
    const lines = text.trim().split('\n').filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setCsvError('Faylka ama qoraalka waa inuu lahaadaa ugu yaraan laba saf (header iyo hal arday).');
      setParsedPreview([]);
      return;
    }

    const preview: typeof parsedPreview = [];
    const startIndex = lines[0].toLowerCase().includes('student') || lines[0].toLowerCase().includes('id') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const cols = line.split(',').map((c) => c.replace(/"/g, '').trim());
      if (cols.length >= 2) {
        const studentIdentifier = cols[0];
        // match by ID or full name or roll
        const student = students.find(
          (s) =>
            s.id.toLowerCase() === studentIdentifier.toLowerCase() ||
            s.rollNumber === studentIdentifier ||
            s.fullName.toLowerCase().includes(studentIdentifier.toLowerCase())
        );

        let score = 0;
        let remarks = 'Dadaal wacan';

        // Check columns
        if (cols.length === 2) {
          score = Number(cols[1]) || 0;
        } else if (cols.length >= 5) {
          score = Number(cols[4]) || 0;
          remarks = cols[5] || remarks;
        } else {
          score = Number(cols[cols.length - 1]) || 0;
        }

        preview.push({
          studentId: student ? student.id : studentIdentifier,
          studentName: student ? student.fullName : 'Arday Lama Aqoonsan',
          score: Math.min(100, Math.max(0, score)),
          remarks,
          valid: !!student,
        });
      }
    }

    setParsedPreview(preview);
  };

  const handleCommitCsvUpload = () => {
    const validRows = parsedPreview.filter((p) => p.valid);
    if (validRows.length === 0) {
      showToast('Ma jiraan arday sax ah oo ku jira natiijooyinka la soo geliyay.');
      return;
    }

    const newMarks: ExamMark[] = validRows.map((row, idx) => ({
      id: `MRK-CSV-${Date.now().toString().slice(-4)}${idx}`,
      examId: selectedExamId,
      studentId: row.studentId,
      subjectId: selectedSubjectId,
      marksObtained: row.score,
      maxMarks: 100,
      grade: calculateGrade(row.score),
      remarks: row.remarks,
    }));

    uploadStudentMarksBulk(newMarks);
    setIsCsvUploaderOpen(false);
    setCsvText('');
    setParsedPreview([]);
  };

  const handleCreateOrUpdateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examForm.title) return;

    if (editingExam) {
      updateExam(editingExam.id, examForm);
      setEditingExam(null);
    } else {
      addExam(examForm);
      setIsNewExamOpen(false);
    }
  };

  const handleOpenEditExam = (exam: Examination) => {
    setEditingExam(exam);
    setExamForm({
      title: exam.title,
      term: exam.term,
      academicYear: exam.academicYear,
      startDate: exam.startDate,
      endDate: exam.endDate,
      status: exam.status,
      description: exam.description || '',
    });
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Imtixaanaadka & Natiijooyinka (Examinations & Grading)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Gelinta buundooyinka, shaxda guud ee maadooyinka, CSV uploader, iyo warqadda natiijada rasmiga ah.
          </p>
        </div>

        <div className="w-full lg:w-auto overflow-x-auto">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold whitespace-nowrap">
            <button
              onClick={() => setActiveTab('marks_entry')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'marks_entry' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Hal Maado (Subject)
            </button>
            <button
              onClick={() => setActiveTab('bulk_matrix')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                activeTab === 'bulk_matrix' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold text-[#005A51] dark:text-teal-400' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Shaxda Guud (Bulk Matrix)
            </button>
            <button
              onClick={() => setActiveTab('report_cards')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'report_cards' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Warqadaha Natiijada
            </button>
            <button
              onClick={() => setActiveTab('exam_certificates')}
              className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
                activeTab === 'exam_certificates' ? 'bg-white dark:bg-slate-900 text-[#005A51] dark:text-amber-300 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Shahaado Imtixaan
            </button>
            <button
              onClick={() => setActiveTab('exams_list')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'exams_list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Jadwalka Imtixaanaadka
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: SINGLE SUBJECT MARKS ENTRY */}
      {activeTab === 'marks_entry' && (
        <div className="space-y-4">
          {/* Selectors Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Dooro Imtixaanka:</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-bold"
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.status === 'Published' ? 'La Daabacay' : 'Qabyo'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Dooro Fasalka:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-bold"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.section}) · {cls.shift || 'Subax'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
                Dooro Maadada{currentRole === 'Teacher' && teacherSubjects.length > 0 ? ' (Maadooyinkaaga)' : ''}:
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-bold"
              >
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameSomali} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Marks Entry Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-100">
                Fasalka: {selectedClass?.name} ({selectedClass?.section}) · {selectedClass?.shift || 'Subax'} · Maadada: {selectedSubject?.nameSomali} (Max: 100)
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCsvUploaderOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#005A51] dark:text-teal-400" />
                  Soo Geli CSV / Excel
                </button>
                <button
                  onClick={handleSaveMarks}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Keydi Buundooyinka
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="px-4 py-3">Roll / ID</th>
                    <th className="px-4 py-3">Ardayga (Student)</th>
                    <th className="px-4 py-3 text-center">Buundada (0-100)</th>
                    <th className="px-4 py-3 text-center">Darajada (Grade)</th>
                    <th className="px-4 py-3">Faallo (Remarks)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classStudents.map((student) => {
                    const currentScore = localScores[student.id]?.score ?? 0;
                    const grade = calculateGrade(currentScore);
                    const remarks = localScores[student.id]?.remarks || '';

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono-numbers text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-[#005A51] dark:text-teal-400">{student.id}</span>
                          <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Roll: {student.rollNumber}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{student.fullName}</div>
                          <div className="text-[11px] font-arabic text-amber-700 dark:text-amber-400">{student.arabicName}</div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={currentScore}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            className="w-20 px-2 py-1 text-center font-mono-numbers font-bold text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#005A51]"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              grade.startsWith('A')
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : grade.startsWith('B')
                                ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                                : grade.startsWith('C')
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                            }`}
                          >
                            {grade}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={remarks}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            placeholder="Faallo..."
                            className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#005A51]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSaveMarks}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Keydi Buundooyinka Dhammaan Ardayda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BULK ALL-SUBJECTS MATRIX UPLOADER & EDITING */}
      {activeTab === 'bulk_matrix' && (
        <div className="space-y-4">
          {/* Matrix Controls Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Imtixaanka:</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-bold"
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">Fasalka:</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-bold"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.section}) · {cls.shift || 'Subax'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Full Matrix Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-[#005A51] dark:text-teal-400" />
                <span>Shaxda Buundooyinka Dhammaan Maadooyinka (Live Marks Matrix)</span>
                <span className="text-[11px] font-normal text-slate-400">· {classStudents.length} arday · {classSubjects.length} maado</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCsvUploaderOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg transition-colors shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-[#005A51] dark:text-teal-400" />
                  Soo Geli Fayl CSV
                </button>
                <button
                  onClick={handleSaveFullMatrix}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Keydi Dhammaan Shaxda
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                    <th className="px-3 py-2.5 sticky left-0 bg-slate-100 dark:bg-slate-800 z-20 min-w-[160px]">
                      Ardayga (Student)
                    </th>
                    {classSubjects.map((sub) => (
                      <th key={sub.id} className="px-2 py-2 text-center min-w-[85px]">
                        <span className="block truncate font-bold text-[#005A51] dark:text-teal-300" title={sub.nameSomali}>
                          {sub.nameSomali}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">{sub.code}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-bold bg-slate-200/60 dark:bg-slate-700/60 min-w-[70px]">
                      Isugeyn
                    </th>
                    <th className="px-3 py-2 text-center font-bold bg-slate-200/60 dark:bg-slate-700/60 min-w-[60px]">
                      %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classStudents.map((st) => {
                    let totalObtained = 0;
                    const maxPossible = classSubjects.length * 100;

                    return (
                      <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-10">
                          <div className="font-bold text-slate-900 dark:text-slate-100 truncate">{st.fullName}</div>
                          <div className="text-[10px] font-mono-numbers text-[#005A51] dark:text-teal-400">{st.id}</div>
                        </td>

                        {classSubjects.map((sub) => {
                          const currentScore = matrixScores[st.id]?.[sub.id] ?? 80;
                          totalObtained += currentScore;

                          return (
                            <td key={sub.id} className="px-1.5 py-1 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={currentScore}
                                onChange={(e) => handleMatrixCellChange(st.id, sub.id, e.target.value)}
                                className={`w-16 px-1.5 py-1 text-center font-mono-numbers font-bold text-xs rounded border transition-colors ${
                                  currentScore >= 50
                                    ? 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-700'
                                    : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 border-red-300 dark:border-red-800'
                                } focus:outline-hidden focus:ring-1 focus:ring-[#005A51]`}
                              />
                            </td>
                          );
                        })}

                        <td className="px-3 py-2 text-center font-mono-numbers font-bold text-slate-900 dark:text-slate-100 bg-slate-50/80 dark:bg-slate-800/40">
                          {totalObtained}
                        </td>
                        <td className="px-3 py-2 text-center font-mono-numbers font-bold bg-slate-50/80 dark:bg-slate-800/40">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              maxPossible > 0 && Math.round((totalObtained / maxPossible) * 100) >= 50
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-red-700 dark:text-red-300'
                            }`}
                          >
                            {maxPossible > 0 ? Math.round((totalObtained / maxPossible) * 100) : 0}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Waa la beddeli karaa unug kasta oo ka mid ah shaxda kor ku xusan.
              </span>
              <button
                onClick={handleSaveFullMatrix}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Keydi Dhammaan Shaxda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRINTABLE REPORT CARDS */}
      {activeTab === 'report_cards' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">
                Soo Saarista Warqadda Natiijada (Academic Report Cards)
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Daabac warqadda rasmiga ah ee dhibcaha arday kasta iyadoo wadata shahaadada dugsiga.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 dark:text-slate-100"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.section}) · {cls.shift || 'Subax'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classStudents.map((st) => {
              const studentMarks = marks.filter(
                (m) => m.studentId === st.id && m.examId === selectedExamId
              );
              const totalObtained = studentMarks.reduce((sum, m) => sum + m.marksObtained, 0);
              const totalMax = studentMarks.reduce((sum, m) => sum + m.maxMarks, 0);
              const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

              return (
                <div
                  key={st.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:border-[#005A51] dark:hover:border-teal-500 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono-numbers font-bold text-[#005A51] dark:text-teal-400 text-xs">
                        {st.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          percentage >= 50
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {percentage >= 50 ? 'Gudbay' : 'Haray'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{st.fullName}</h4>

                    <div className="my-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Maadooyinka:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{studentMarks.length} Maado</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Isugeyn:</span>
                        <span className="font-mono-numbers font-bold text-slate-900 dark:text-slate-100">
                          {totalObtained} / {totalMax} ({percentage}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        openPrint({
                          type: 'report_card',
                          student: st,
                          exam: selectedExam,
                          marks: studentMarks,
                        })
                      }
                      className="py-2 px-2 bg-teal-50 dark:bg-teal-950/50 text-[#005A51] dark:text-teal-300 hover:bg-[#005A51] hover:text-white dark:hover:bg-teal-700 border border-teal-200 dark:border-teal-800 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Natiijada
                    </button>
                    <button
                      onClick={() =>
                        openPrint({
                          type: 'exam_certificate',
                          student: st,
                          exam: selectedExam,
                          marks: studentMarks,
                        })
                      }
                      className="py-2 px-2 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500 hover:text-white border border-amber-200 dark:border-amber-800 rounded-lg text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Shahaado
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3B: OFFICIAL EXAM CERTIFICATES (SHAHAADO IMTIXAAN) */}
      {activeTab === 'exam_certificates' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Shahaadada Imtixaanka Rasmiga ah (Official Exam Certificates)
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  Soo saar oo daabac Shahaado Imtixaan oo leh shaabadda Machadka, darajada guud, iyo saxiixa maamulka.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 dark:text-slate-100"
              >
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </select>

              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 dark:text-slate-100"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.section}) · {cls.shift || 'Subax'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classStudents.map((st) => {
              const studentMarks = marks.filter(
                (m) => m.studentId === st.id && m.examId === selectedExamId
              );
              const totalObtained = studentMarks.reduce((sum, m) => sum + m.marksObtained, 0);
              const totalMax = studentMarks.reduce((sum, m) => sum + m.maxMarks, 0);
              const percentage = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
              const overallGrade = calculateGrade(percentage);
              const cls = classes.find((c) => c.id === st.classId);

              return (
                <div
                  key={st.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:border-amber-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono-numbers font-bold text-[#005A51] dark:text-teal-400 text-xs">
                        {st.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          percentage >= 50
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {percentage >= 50 ? 'U Qalma Shahaado' : 'Dib u eegis'}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{st.fullName}</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {cls?.name} ({st.section}) · {st.shift || cls?.shift || 'Subax'}
                    </p>

                    <div className="my-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/70 dark:border-amber-800/40 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Dhibcaha</span>
                        <span className="font-mono-numbers font-bold text-slate-900 dark:text-slate-100">
                          {totalObtained}/{totalMax}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Celceliska</span>
                        <span className="font-mono-numbers font-bold text-[#005A51] dark:text-teal-300">
                          {percentage}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Darajada</span>
                        <span className="font-black text-amber-700 dark:text-amber-300">{overallGrade}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      openPrint({
                        type: 'exam_certificate',
                        student: st,
                        exam: selectedExam,
                        marks: studentMarks,
                      })
                    }
                    className="w-full py-2.5 bg-[#005A51] hover:bg-[#004841] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Award className="w-4 h-4 text-amber-300" />
                    Daabac Shahaadada Imtixaanka
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: EXAMINATIONS LIST & ADMIN CRUD */}
      {activeTab === 'exams_list' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Liiska imtixaanaadka rasmiga ah ee sanadka {settings.academicYear}
            </span>
            {canManageExams && (
              <button
                onClick={() => {
                  setEditingExam(null);
                  setExamForm({
                    title: '',
                    term: 'Month 1',
                    academicYear: settings.academicYear,
                    startDate: new Date().toISOString().substring(0, 10),
                    endDate: new Date().toISOString().substring(0, 10),
                    status: 'Draft',
                    description: '',
                  });
                  setIsNewExamOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Abuur Imtixaan Cusub
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:border-[#005A51] dark:hover:border-teal-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono-numbers font-bold text-[#005A51] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                      {exam.id}
                    </span>
                    {canManageExams ? (
                      <button
                        onClick={() => {
                          const newStatus = exam.status === 'Published' ? 'Draft' : 'Published';
                          updateExam(exam.id, { status: newStatus });
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                          exam.status === 'Published'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {exam.status === 'Published' ? '✓ La Daabacay' : 'Qabyo (Guji si aad u daabacdo)'}
                      </button>
                    ) : (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          exam.status === 'Published'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {exam.status === 'Published' ? '✓ La Daabacay' : 'Qabyo'}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{exam.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{exam.description}</p>

                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Xilliga:</span>
                      <span className="font-semibold">{exam.term}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bilaabashada:</span>
                      <span className="font-mono-numbers">{exam.startDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Dhamaadka:</span>
                      <span className="font-mono-numbers">{exam.endDate}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <button
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      setActiveTab('marks_entry');
                    }}
                    className="text-[#005A51] dark:text-teal-400 font-semibold hover:underline"
                  >
                    Geli Buundooyinka →
                  </button>

                  {canManageExams && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditExam(exam)}
                        title="Wax ka beddel imtixaanka"
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteExamId === exam.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              deleteExam(exam.id);
                              setConfirmDeleteExamId(null);
                            }}
                            className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
                          >
                            Tir
                          </button>
                          <button
                            onClick={() => setConfirmDeleteExamId(null)}
                            className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px]"
                          >
                            Maya
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteExamId(exam.id)}
                          title="Tir imtixaanka"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV MARKS UPLOADER MODAL */}
      {isCsvUploaderOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 bg-[#005A51] text-white">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="font-bold text-sm">Soo Geli Buundooyinka Dhammaan Ardayda (Bulk CSV Uploader)</h3>
                  <p className="text-[11px] text-teal-100">
                    Fasalka: {selectedClass?.name} ({selectedClass?.section}) · {selectedClass?.shift || 'Subax'} · Maadada: {selectedSubject?.nameSomali}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCsvUploaderOpen(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg">
                <div>
                  <span className="font-bold text-teal-900 dark:text-teal-200 block">Ma haysataa shaxda CSV?</span>
                  <span className="text-teal-700 dark:text-teal-300 text-[11px]">
                    Kala soo deg template-ka ardayda fasalkan si toos ah, ka buuxi buundooyinka, kadibna soo geli.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsvTemplate}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 text-[#005A51] dark:text-teal-300 border border-teal-300 dark:border-teal-700 font-bold rounded-lg shadow-2xs hover:bg-teal-100/50"
                >
                  <Download className="w-3.5 h-3.5" />
                  Soo Degso CSV Template
                </button>
              </div>

              {/* File Select */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#005A51] dark:border-teal-600 rounded-xl p-5 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <Upload className="w-6 h-6 text-[#005A51] dark:text-teal-400 mx-auto mb-1" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Guji si aad fayl CSV uga doorato kombuyuutarkaaga
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Faylka waa inuu wataa: StudentID, Score, Remarks
                  </span>
                </button>
              </div>

              {/* Or Paste Raw Text */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Ama halkan ku dhaji qoraalka Excel / CSV (Paste Data):
                </label>
                <textarea
                  rows={4}
                  value={csvText}
                  onChange={(e) => {
                    setCsvText(e.target.value);
                    parseCsvString(e.target.value);
                  }}
                  placeholder="StudentID, Score, Remarks&#10;MKQ-2026-001, 85, Aad u fiican&#10;MKQ-2026-002, 92, Heer sare"
                  className="w-full p-2.5 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              {csvError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{csvError}</span>
                </div>
              )}

              {/* Live Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                    <span>Dulmar Ka Hor Keydinta (Preview - {parsedPreview.length} xog)</span>
                    <span className="text-emerald-700 dark:text-emerald-400">
                      {parsedPreview.filter((p) => p.valid).length} Sax ah
                    </span>
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedPreview.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60">
                        <div className="flex items-center gap-2">
                          {item.valid ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span className="font-mono font-bold text-[#005A51] dark:text-teal-400">{item.studentId}</span>
                          <span className="text-slate-700 dark:text-slate-300">{item.studentName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono-numbers font-bold text-slate-900 dark:text-slate-100">
                            {item.score}/100 ({calculateGrade(item.score)})
                          </span>
                          <span className="text-[11px] text-slate-400">{item.remarks}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCsvUploaderOpen(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs"
              >
                Ka noqo
              </button>
              <button
                type="button"
                disabled={parsedPreview.filter((p) => p.valid).length === 0}
                onClick={handleCommitCsvUpload}
                className="px-5 py-2 font-bold text-white bg-[#005A51] hover:bg-[#004841] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs shadow-xs"
              >
                Dabakh & Keydi Buundooyinka ({parsedPreview.filter((p) => p.valid).length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Exam Modal */}
      {(isNewExamOpen || editingExam) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {editingExam ? 'Wax ka beddel Imtixaanka' : 'Abuur Imtixaan Cusub'}
              </h3>
              <button
                onClick={() => {
                  setIsNewExamOpen(false);
                  setEditingExam(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateExam} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Cinwaanka Imtixaanka: *</label>
                <input
                  type="text"
                  required
                  value={examForm.title}
                  onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                  placeholder="tusaale: Imtixaanka Bartamaha Sanadka..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Xilliga (Term):</label>
                <select
                  value={examForm.term}
                  onChange={(e) => setExamForm({ ...examForm, term: e.target.value as any })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="Month 1">Qiimaynta Bisha 1aad (Month 1)</option>
                  <option value="Mid-Term">Bartamaha Sanadka (Mid-Term)</option>
                  <option value="Final Term">Dhamaadka Sanadka (Final Term)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Taariikhda Bilaabashada:</label>
                  <input
                    type="date"
                    required
                    value={examForm.startDate}
                    onChange={(e) => setExamForm({ ...examForm, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Taariikhda Dhamaadka:</label>
                  <input
                    type="date"
                    required
                    value={examForm.endDate}
                    onChange={(e) => setExamForm({ ...examForm, endDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Faahfaahin / Xusuusin:</label>
                <textarea
                  rows={2}
                  value={examForm.description}
                  onChange={(e) => setExamForm({ ...examForm, description: e.target.value })}
                  placeholder="Faahfaahin ku saabsan imtixaanka..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewExamOpen(false);
                    setEditingExam(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  {editingExam ? 'Keydi Wax ka beddelka' : 'Abuur Imtixaanka'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
