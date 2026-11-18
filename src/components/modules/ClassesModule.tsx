/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SchoolClass, Subject, StudyShift } from '../../types';
import {
  GraduationCap,
  BookOpen,
  PlusCircle,
  Users,
  ArrowRight,
  CheckCircle,
  Layers,
  X,
  Edit,
  Trash2,
  Sun,
  Sunset,
} from 'lucide-react';

export const ClassesModule: React.FC = () => {
  const {
    classes,
    addClass,
    updateClass,
    deleteClass,
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    students,
    teachers,
    promoteStudents,
    settings,
    currentRole,
    showToast,
    focusedRecordIntent,
    setFocusedRecordIntent,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const canManageAcademics =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager';

  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'promotion'>('classes');
  const [shiftFilter, setShiftFilter] = useState<'all' | StudyShift>('all');

  useEffect(() => {
    if (focusedRecordIntent?.type === 'class') {
      setActiveTab('classes');
      setFocusedRecordIntent(null);
    } else if (focusedRecordIntent?.type === 'subject') {
      setActiveTab('subjects');
      setFocusedRecordIntent(null);
    }
  }, [focusedRecordIntent, setFocusedRecordIntent]);

  useEffect(() => {
    if (navigationIntent?.module !== 'classes') return;
    if (navigationIntent.tab === 'subjects') {
      setActiveTab('subjects');
    } else if (navigationIntent.tab === 'promotion' && canManageAcademics) {
      setActiveTab('promotion');
    } else {
      setActiveTab('classes');
    }
    clearNavigationIntent();
  }, [navigationIntent, canManageAcademics, clearNavigationIntent]);
  const [confirmDeleteClassId, setConfirmDeleteClassId] = useState<string | null>(null);
  const [confirmDeleteSubjectId, setConfirmDeleteSubjectId] = useState<string | null>(null);

  // Modals
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);

  // Class Form
  const [classForm, setClassForm] = useState<{
    name: string;
    section: string;
    shift: StudyShift;
    roomNumber: string;
    capacity: number;
    classTeacherId: string;
    academicYear: string;
  }>({
    name: 'Fasalka 1aad',
    section: 'A',
    shift: 'Subax',
    roomNumber: 'Qolka 103',
    capacity: 35,
    classTeacherId: teachers[0]?.id || 'TCH-01',
    academicYear: settings.academicYear,
  });

  // Subject Form
  const [subjectForm, setSubjectForm] = useState({
    code: 'QRN-201',
    nameSomali: 'Tafsiirka Qur’aanka',
    nameArabic: 'تفسير القرآن الكريم',
    classId: classes[0]?.id || 'CLS-1A',
    teacherId: teachers[0]?.id || 'TCH-01',
    creditHours: 4,
    maxMarks: 100,
    passMarks: 50,
  });

  // Batch Promotion State
  const [sourceClassId, setSourceClassId] = useState<string>(classes[0]?.id || '');
  const [targetClassId, setTargetClassId] = useState<string>(classes[2]?.id || '');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const sourceStudents = students.filter((s) => s.classId === sourceClassId && s.status === 'Active');

  const handleSelectAllStudents = () => {
    if (selectedStudentIds.length === sourceStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(sourceStudents.map((s) => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExecutePromotion = () => {
    if (!canManageAcademics || selectedStudentIds.length === 0) return;
    if (sourceClassId === targetClassId) {
      showToast('Fasalka laga wareejinayo iyo fasalka loo wareejinayo waa inay kala duwanaadaan!');
      return;
    }
    promoteStudents(sourceClassId, targetClassId, selectedStudentIds);
    setSelectedStudentIds([]);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageAcademics) return;
    addClass(classForm);
    setIsAddClassOpen(false);
  };

  const handleSaveSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageAcademics) return;
    addSubject(subjectForm);
    setIsAddSubjectOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Module Navigation Tabs */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Fasallada &amp; Waxbarashada (Classes, Sections &amp; Academics)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Qorsheynta fasallada dugsiga, maadooyinka manhajka, iyo dalacsiinta ardayda (Batch Promotion).
          </p>
        </div>

        <div className="w-full lg:w-auto overflow-x-auto">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold whitespace-nowrap">
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'classes'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Fasallada ({classes.length})
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'subjects'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Maadooyinka ({subjects.length})
            </button>
            {canManageAcademics && (
              <button
                onClick={() => setActiveTab('promotion')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'promotion'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Dalacsiinta Ardayda
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: CLASSES VIEW */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-500 mr-1">
                Fasallada {settings.academicYear}:
              </span>
              <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setShiftFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    shiftFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Dhammaan ({classes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShiftFilter('Subax')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                    shiftFilter === 'Subax'
                      ? 'bg-amber-50 text-amber-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sun className="w-3 h-3 text-amber-500" />
                  Subax ({classes.filter((c) => (c.shift || 'Subax') === 'Subax').length})
                </button>
                <button
                  type="button"
                  onClick={() => setShiftFilter('Galab')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                    shiftFilter === 'Galab'
                      ? 'bg-indigo-50 text-indigo-900 shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Sunset className="w-3 h-3 text-indigo-500" />
                  Galab ({classes.filter((c) => c.shift === 'Galab').length})
                </button>
              </div>
            </div>
            {canManageAcademics && (
              <button
                onClick={() => setIsAddClassOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Abuur Fasal Cusub
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes
              .filter((cls) => shiftFilter === 'all' || (cls.shift || 'Subax') === shiftFilter)
              .map((cls) => {
                const enrolled = students.filter((s) => s.classId === cls.id).length;
                const teacher = teachers.find((t) => t.id === cls.classTeacherId);
                const classSubjects = subjects.filter((s) => s.classId === cls.id);
                const clsShift = cls.shift || 'Subax';

                return (
                  <div
                    key={cls.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs hover:border-[#005A51] dark:hover:border-teal-500 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-[#005A51] dark:text-teal-400" />
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {cls.name} <span className="text-[#005A51] dark:text-teal-400">({cls.section})</span>
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                              clsShift === 'Subax'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            }`}
                          >
                            {clsShift === 'Subax' ? (
                              <Sun className="w-2.5 h-2.5" />
                            ) : (
                              <Sunset className="w-2.5 h-2.5" />
                            )}
                            {clsShift}
                          </span>
                          <span className="text-[11px] font-mono-numbers bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-medium border border-slate-200 dark:border-slate-700">
                            {cls.roomNumber}
                          </span>
                          {canManageAcademics && (
                            confirmDeleteClassId === cls.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    deleteClass(cls.id);
                                    setConfirmDeleteClassId(null);
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded"
                                >
                                  Hubi
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteClassId(null)}
                                  className="px-1.5 py-0.5 text-[10px] text-slate-500 bg-slate-100 rounded"
                                >
                                  Maya
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteClassId(cls.id)}
                                title="Tir fasalka"
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 py-2 border-y border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Macallinka Masuulka:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{teacher?.fullName || 'Lama magacaabin'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Tirada Ardayda:</span>
                        <span className="font-mono-numbers font-bold text-slate-900 dark:text-slate-100">
                          {enrolled} / {cls.capacity} arday
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Maadooyinka Manhajka:</span>
                        <span className="font-medium text-[#005A51] dark:text-teal-400">{classSubjects.length || 8} Maado</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-[#005A51] dark:bg-teal-500 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, (enrolled / cls.capacity) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      <span>Awoodda: {cls.capacity} kuraas</span>
                      <span className="font-semibold">{Math.round((enrolled / cls.capacity) * 100)}% Buuxa</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SUBJECTS VIEW */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-slate-500">
              Liiska maadooyinka manhajka Machadka Khadiija (Carabi, Diini & Maadi)
            </div>
            {canManageAcademics && (
              <button
                onClick={() => setIsAddSubjectOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Ku Dar Maado Cusub
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="px-4 py-3">Koodhka (Code)</th>
                  <th className="px-4 py-3">Magaca Maadada (Somali & Arabic)</th>
                  <th className="px-3 py-3">Macallinka Dhiga</th>
                  <th className="px-3 py-3 text-center">Saacadaha (Credits)</th>
                  <th className="px-3 py-3 text-center">Max Marks</th>
                  <th className="px-3 py-3 text-center">Baas-Galka (Pass)</th>
                  {canManageAcademics && <th className="px-4 py-3 text-right">Ficil (Action)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjects.map((s) => {
                  const teacher = teachers.find((t) => t.id === s.teacherId);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono-numbers font-bold text-[#005A51]">
                        {s.code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{s.nameSomali}</div>
                        <div className="text-[11px] font-arabic text-amber-700">{s.nameArabic}</div>
                      </td>
                      <td className="px-3 py-3 font-medium text-slate-800">
                        {teacher?.fullName || 'N/A'}
                      </td>
                      <td className="px-3 py-3 text-center font-mono-numbers text-slate-700">
                        {s.creditHours} hrs/week
                      </td>
                      <td className="px-3 py-3 text-center font-mono-numbers font-semibold text-slate-800">
                        {s.maxMarks}
                      </td>
                      <td className="px-3 py-3 text-center font-mono-numbers font-bold text-emerald-700">
                        {s.passMarks}
                      </td>
                      {canManageAcademics && (
                        <td className="px-4 py-3 text-right">
                          {confirmDeleteSubjectId === s.id ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => {
                                  deleteSubject(s.id);
                                  setConfirmDeleteSubjectId(null);
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded"
                              >
                                Hubi
                              </button>
                              <button
                                onClick={() => setConfirmDeleteSubjectId(null)}
                                className="px-2 py-0.5 text-[10px] text-slate-600 bg-slate-100 rounded"
                              >
                                Maya
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteSubjectId(s.id)}
                              title="Tir maaddada"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BATCH PROMOTION WORKFLOW */}
      {activeTab === 'promotion' && (
        <div className="space-y-5">
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl text-amber-900 text-xs">
            <h4 className="font-bold text-sm mb-1">
              Habka Dalacsiinta Fasallada (Batch Student Promotion)
            </h4>
            <p>
              Xulo fasalka ardayda hadda dhigtaan iyo fasalka cusub ee loo dalacsiinayo sanad dugsiyeedka cusub. Nidaamku wuxuu si toos ah u cusboonaysiin doonaa diiwaanka fasalka ardayda aad doorato.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Fasalka Laga Wareejinayo (Source Class):
              </label>
              <select
                value={sourceClassId}
                onChange={(e) => {
                  setSourceClassId(e.target.value);
                  setSelectedStudentIds([]);
                }}
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.section}) · {c.shift || 'Subax'} - {c.roomNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">
                Fasalka Loo Dalacsiinayo (Target Class):
              </label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.section}) · {c.shift || 'Subax'} - {c.roomNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Student selection table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllStudents}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  {selectedStudentIds.length === sourceStudents.length
                    ? 'Ka Noqo Dhammaan'
                    : 'Dooro Dhammaan'}
                </button>
                <span className="text-slate-500 font-mono-numbers">
                  Waxaa la doortay: <strong className="text-[#005A51]">{selectedStudentIds.length}</strong> / {sourceStudents.length} arday
                </span>
              </div>

              <button
                disabled={selectedStudentIds.length === 0}
                onClick={handleExecutePromotion}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#005A51] hover:bg-[#004841] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Dalacsii {selectedStudentIds.length} Arday
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {sourceStudents.length > 0 ? (
                sourceStudents.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center justify-between p-3 hover:bg-slate-50 cursor-pointer text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => handleToggleStudent(s.id)}
                        className="w-4 h-4 text-[#005A51] rounded border-slate-300 focus:ring-[#005A51]"
                      />
                      <img
                        src={s.photoUrl}
                        alt={s.fullName}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <span className="font-bold text-slate-900">{s.fullName}</span>
                        <span className="text-[11px] text-slate-400 block font-mono-numbers">{s.id} · Roll: {s.rollNumber}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="font-medium text-slate-600">
                        {classes.find((c) => c.id === s.classId)?.name}
                      </span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="font-bold text-emerald-700">
                        {classes.find((c) => c.id === targetClassId)?.name}
                      </span>
                    </div>
                  </label>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Fasalkan hadda arday firfircoon kuma jiraan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Abuur Fasal Cusub</h3>
              <button onClick={() => setIsAddClassOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveClass} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Magaca Fasalka:</label>
                <input
                  type="text"
                  required
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="tusaale: Fasalka 1aad"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Xilliga (Subax / Galab):</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setClassForm({ ...classForm, shift: 'Subax' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border font-bold ${
                      classForm.shift === 'Subax'
                        ? 'bg-amber-50 border-amber-500 text-amber-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    Subax
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassForm({ ...classForm, shift: 'Galab' })}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border font-bold ${
                      classForm.shift === 'Galab'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                    Galab
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Qeybta (Section):</label>
                  <input
                    type="text"
                    required
                    value={classForm.section}
                    onChange={(e) => setClassForm({ ...classForm, section: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Qolka (Room No):</label>
                  <input
                    type="text"
                    required
                    value={classForm.roomNumber}
                    onChange={(e) => setClassForm({ ...classForm, roomNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Awoodda Kuraasta:</label>
                  <input
                    type="number"
                    required
                    value={classForm.capacity}
                    onChange={(e) => setClassForm({ ...classForm, capacity: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Macallinka Fasalka:</label>
                  <select
                    value={classForm.classTeacherId}
                    onChange={(e) => setClassForm({ ...classForm, classTeacherId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg"
                >
                  Abuur Fasalka
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {isAddSubjectOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Ku Dar Maado Cusub</h3>
              <button onClick={() => setIsAddSubjectOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSubject} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Magaca Soomaaliga: *</label>
                <input
                  type="text"
                  required
                  value={subjectForm.nameSomali}
                  onChange={(e) => setSubjectForm({ ...subjectForm, nameSomali: e.target.value })}
                  placeholder="tusaale: Xadiiska Nabiga"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Magaca Carabiga (Arabic):</label>
                <input
                  type="text"
                  value={subjectForm.nameArabic}
                  onChange={(e) => setSubjectForm({ ...subjectForm, nameArabic: e.target.value })}
                  placeholder="مثال: الحديث النبوي الشريف"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-arabic"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Koodhka Maadada:</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Macallinka Dhigaya:</label>
                  <select
                    value={subjectForm.teacherId}
                    onChange={(e) => setSubjectForm({ ...subjectForm, teacherId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Saacadaha:</label>
                  <input
                    type="number"
                    value={subjectForm.creditHours}
                    onChange={(e) => setSubjectForm({ ...subjectForm, creditHours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Max Marks:</label>
                  <input
                    type="number"
                    value={subjectForm.maxMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, maxMarks: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Pass Marks:</label>
                  <input
                    type="number"
                    value={subjectForm.passMarks}
                    onChange={(e) => setSubjectForm({ ...subjectForm, passMarks: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSubjectOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg"
                >
                  Keydi Maadada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
