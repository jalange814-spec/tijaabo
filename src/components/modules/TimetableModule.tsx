/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { TimetableSlot } from '../../types';
import {
  Clock,
  PlusCircle,
  Printer,
  AlertTriangle,
  Trash2,
  Calendar,
  X,
  Building,
} from 'lucide-react';

const DAYS: TimetableSlot['day'][] = ['Sabti', 'Axad', 'Isniin', 'Talaado', 'Arbaco', 'Khamiis'];
const PERIODS = [
  { period: 1, timeRange: '07:30 - 08:25' },
  { period: 2, timeRange: '08:25 - 09:20' },
  { period: 3, timeRange: '09:40 - 10:35' },
  { period: 4, timeRange: '10:35 - 11:30' },
  { period: 5, timeRange: '11:35 - 12:30' },
];

export const TimetableModule: React.FC = () => {
  const {
    timetable,
    addTimetableSlot,
    deleteTimetableSlot,
    classes,
    subjects,
    teachers,
    openPrint,
    settings,
    currentRole,
    currentUser,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const canManageTimetable =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager';
  const isTeacherUser = currentRole === 'Teacher';

  const [viewMode, setViewMode] = useState<'class' | 'teacher'>(
    isTeacherUser ? 'teacher' : 'class'
  );

  useEffect(() => {
    if (navigationIntent?.module !== 'timetable') return;
    if (navigationIntent.tab === 'teacher') {
      setViewMode('teacher');
    } else if (navigationIntent.tab === 'class') {
      setViewMode(isTeacherUser ? 'teacher' : 'class');
    }
    clearNavigationIntent();
  }, [navigationIntent, isTeacherUser, clearNavigationIntent]);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'CLS-1A');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(
    (isTeacherUser && currentUser?.linkedTeacherId) || teachers[0]?.id || 'TCH-01'
  );

  // Add Slot Modal
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [slotForm, setSlotForm] = useState<{
    day: TimetableSlot['day'];
    period: number;
    timeRange: string;
    classId: string;
    subjectId: string;
    teacherId: string;
    roomNumber: string;
  }>({
    day: 'Sabti',
    period: 1,
    timeRange: '07:30 - 08:25',
    classId: classes[0]?.id || 'CLS-1A',
    subjectId: subjects[0]?.id || 'SUB-01',
    teacherId: teachers[0]?.id || 'TCH-01',
    roomNumber: 'Qolka 101',
  });

  const handlePeriodChange = (pNum: number) => {
    const periodObj = PERIODS.find((p) => p.period === pNum);
    setSlotForm({
      ...slotForm,
      period: pNum,
      timeRange: periodObj?.timeRange || '07:30 - 08:25',
    });
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    const result = addTimetableSlot(slotForm);
    if (!result.success) {
      setConflictError(result.conflictMessage || 'Isku dhac jadwalka ah!');
      return;
    }

    setIsAddSlotOpen(false);
  };

  // Filter slots for current view
  const currentSlots = timetable.filter((t) => {
    if (viewMode === 'class') {
      return t.classId === selectedClassId;
    } else {
      return t.teacherId === selectedTeacherId;
    }
  });

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Jadwalka Casharrada (Weekly Timetable &amp; Conflict Detection)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Jadwalka dugsiga ee Sabti ilaa Khamiis (07:30 - 12:30), oo leh nidaamka ogaanshaha isku-dhaca macallimiinta iyo qolalka.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => openPrint({ type: 'timetable' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Daabac Jadwalka
          </button>
          {canManageTimetable && (
            <button
              onClick={() => {
                setConflictError(null);
                setIsAddSlotOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Qorshee Cashar Cusub
            </button>
          )}
        </div>
      </div>

      {/* View Switcher & Selection Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Qaabka Aragga:</span>
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg font-semibold overflow-x-auto max-w-full whitespace-nowrap">
            <button
              onClick={() => setViewMode('class')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'class' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Aragga Fasalka (Class View)
            </button>
            <button
              onClick={() => setViewMode('teacher')}
              className={`px-3 py-1 rounded-md transition-colors ${
                viewMode === 'teacher' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Aragga Macallinka (Teacher View)
            </button>
          </div>
        </div>

        {viewMode === 'class' ? (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Dooro Fasalka:</span>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.section}) · {cls.shift || 'Subax'} - {cls.roomNumber}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Dooro Macallinka:</span>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-slate-800"
            >
              {teachers.map((tch) => (
                <option key={tch.id} value={tch.id}>
                  {tch.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Weekly Schedule Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800 flex justify-between items-center">
          <span>
            {viewMode === 'class'
              ? `Jadwalka Toddobaadlaha ah: ${selectedClass?.name} (${selectedClass?.section}) · ${selectedClass?.shift || 'Subax'} · ${selectedClass?.roomNumber}`
              : `Jadwalka Toddobaadlaha ah ee Macallinka: ${selectedTeacher?.fullName}`}
          </span>
          <span className="font-mono-numbers text-slate-500 text-[11px]">
            {currentSlots.length} Cashar todobaadkii
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
                <th className="p-3 w-28 text-left border-r border-slate-200 font-semibold">
                  Maalinta (Day)
                </th>
                {PERIODS.map((p) => (
                  <th key={p.period} className="p-2.5 text-center border-r border-slate-200 last:border-r-0">
                    <span className="font-bold text-slate-900 block">Casharka {p.period}</span>
                    <span className="font-mono-numbers text-[10px] text-slate-400 font-normal">
                      {p.timeRange}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DAYS.map((day) => (
                <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-bold text-[#005A51] border-r border-slate-200 bg-slate-50/40">
                    {day}
                  </td>
                  {PERIODS.map((periodObj) => {
                    const slot = currentSlots.find(
                      (s) => s.day === day && s.period === periodObj.period
                    );

                    const subj = subjects.find((sub) => sub.id === slot?.subjectId);
                    const tch = teachers.find((t) => t.id === slot?.teacherId);
                    const cls = classes.find((c) => c.id === slot?.classId);

                    return (
                      <td
                        key={periodObj.period}
                        className="p-2 border-r border-slate-200 last:border-r-0 align-top min-w-[130px] h-20"
                      >
                        {slot ? (
                          <div className="p-2 rounded-lg bg-teal-50/70 border border-teal-200/90 text-left relative group">
                            {canManageTimetable && (
                              <button
                                onClick={() => deleteTimetableSlot(slot.id)}
                                title="Ka saar jadwalka"
                                className="absolute top-1 right-1 p-0.5 text-slate-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                            <span className="font-bold text-slate-900 block leading-tight">
                              {subj?.nameSomali || 'Maado'}
                            </span>
                            <span className="text-[10px] font-arabic text-amber-800 block">
                              {subj?.nameArabic}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                              <span className="truncate">
                                {viewMode === 'class'
                                  ? tch?.fullName.split(' ')[0]
                                  : `${cls?.name} (${cls?.section}) · ${cls?.shift || 'Subax'}`}
                              </span>
                              <span className="font-mono-numbers text-slate-400 shrink-0">
                                {slot.roomNumber}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-slate-300 text-[10px] italic">
                            Fasax / Bannaan
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Slot Modal with Real-time Conflict Detection */}
      {isAddSlotOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Qorshee Cashar Jadwalka ah</h3>
              <button onClick={() => setIsAddSlotOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {conflictError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{conflictError}</span>
              </div>
            )}

            <form onSubmit={handleAddSlot} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Maalinta (Day):</label>
                  <select
                    value={slotForm.day}
                    onChange={(e) => setSlotForm({ ...slotForm, day: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Casharka (Period):</label>
                  <select
                    value={slotForm.period}
                    onChange={(e) => handlePeriodChange(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-bold"
                  >
                    {PERIODS.map((p) => (
                      <option key={p.period} value={p.period}>
                        Casharka {p.period} ({p.timeRange})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Fasalka:</label>
                  <select
                    value={slotForm.classId}
                    onChange={(e) => {
                      const c = classes.find((cls) => cls.id === e.target.value);
                      setSlotForm({
                        ...slotForm,
                        classId: e.target.value,
                        roomNumber: c?.roomNumber || 'Qolka 101',
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.section}) · {c.shift || 'Subax'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Qolka (Room):</label>
                  <input
                    type="text"
                    required
                    value={slotForm.roomNumber}
                    onChange={(e) => setSlotForm({ ...slotForm, roomNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Maadada:</label>
                <select
                  value={slotForm.subjectId}
                  onChange={(e) => setSlotForm({ ...slotForm, subjectId: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nameSomali} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Macallinka:</label>
                <select
                  value={slotForm.teacherId}
                  onChange={(e) => setSlotForm({ ...slotForm, teacherId: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSlotOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  Hubi & Keydi Casharka
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
