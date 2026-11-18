/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AttendanceStatus, AttendanceRecord, StaffAttendanceRecord } from '../../types';
import {
  Save,
  ShieldAlert,
  Edit,
  Trash2,
  PlusCircle,
  X,
  CheckCircle2,
  Clock,
  UserCheck,
} from 'lucide-react';

const STAFF_ATTENDANCE_ALLOWED_ROLES = [
  'Super Admin',
  'Administrator',
  'Academic Manager',
  'HR Manager',
];

export const AttendanceModule: React.FC = () => {
  const {
    classes,
    students,
    attendance,
    saveAttendanceBatch,
    staff,
    teachers,
    staffAttendance,
    fetchStaffAttendance,
    saveStaffAttendanceBatch,
    updateStaffAttendanceRecord,
    deleteStaffAttendanceRecord,
    currentRole,
    currentUser,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const canAccessStaffAttendance = STAFF_ATTENDANCE_ALLOWED_ROLES.includes(currentRole);

  const [activeTab, setActiveTab] = useState<'students' | 'staff'>('students');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || 'CLS-1A');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().substring(0, 10)
  );
  const [forbiddenAttemptMsg, setForbiddenAttemptMsg] = useState<string | null>(null);

  // If role switches to Teacher (or Receptionist), immediately force back to student attendance
  useEffect(() => {
    if (!canAccessStaffAttendance && activeTab === 'staff') {
      setActiveTab('students');
    }
  }, [canAccessStaffAttendance, activeTab]);

  // Detect URL attempts targeting staff attendance while logged in as Teacher
  useEffect(() => {
    const urlStr = `${window.location.pathname}${window.location.search}${window.location.hash}`.toLowerCase();
    if (
      urlStr.includes('staff-attendance') ||
      urlStr.includes('staff_attendance') ||
      urlStr.includes('tab=staff')
    ) {
      if (!canAccessStaffAttendance) {
        setForbiddenAttemptMsg(
          '403 Forbidden: Macallimiintu ma geli karaan xaadirinta shaqaalaha ama warbixinadeeda.'
        );
        setActiveTab('students');
      } else {
        setActiveTab('staff');
      }
    }
  }, [canAccessStaffAttendance]);

  // Fetch live staff attendance for authorized roles when viewing staff tab
  useEffect(() => {
    if (canAccessStaffAttendance && activeTab === 'staff') {
      fetchStaffAttendance();
    }
  }, [canAccessStaffAttendance, activeTab, fetchStaffAttendance]);

  useEffect(() => {
    if (navigationIntent?.module !== 'attendance') return;
    if (navigationIntent.tab === 'staff') {
      if (canAccessStaffAttendance) {
        setActiveTab('staff');
      } else {
        setForbiddenAttemptMsg(
          '403 Forbidden: Macallimiintu ma geli karaan xaadirinta shaqaalaha ama warbixinadeeda.'
        );
        setActiveTab('students');
      }
    } else {
      setActiveTab('students');
    }
    clearNavigationIntent();
  }, [navigationIntent, canAccessStaffAttendance, clearNavigationIntent]);

  // Teachers only see classes they teach/supervise if linked, else all classes
  const teacherScopedClasses = useMemo(() => {
    if (currentRole !== 'Teacher' || !currentUser?.linkedTeacherId) return classes;
    const assigned = classes.filter((c) => c.classTeacherId === currentUser.linkedTeacherId);
    return assigned.length > 0 ? assigned : classes;
  }, [classes, currentRole, currentUser]);

  useEffect(() => {
    if (!teacherScopedClasses.some((c) => c.id === selectedClassId) && teacherScopedClasses[0]) {
      setSelectedClassId(teacherScopedClasses[0].id);
    }
  }, [teacherScopedClasses, selectedClassId]);

  const classStudents = students.filter(
    (s) => s.classId === selectedClassId && s.status === 'Active'
  );

  const [attendanceSheet, setAttendanceSheet] = useState<{
    [studentId: string]: { status: AttendanceStatus; remarks: string };
  }>({});

  useEffect(() => {
    const sheet: { [studentId: string]: { status: AttendanceStatus; remarks: string } } = {};
    classStudents.forEach((student) => {
      const existing = attendance.find(
        (a) => a.date === selectedDate && a.studentId === student.id
      );
      if (existing) {
        sheet[student.id] = { status: existing.status, remarks: existing.remarks || '' };
      } else {
        sheet[student.id] = { status: 'Present', remarks: '' };
      }
    });
    setAttendanceSheet(sheet);
  }, [selectedDate, selectedClassId, students, attendance]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceSheet((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceSheet((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const updated: typeof attendanceSheet = {};
    classStudents.forEach((s) => {
      updated[s.id] = {
        status,
        remarks: attendanceSheet[s.id]?.remarks || '',
      };
    });
    setAttendanceSheet(updated);
  };

  const handleSaveAttendance = () => {
    const recordsToSave: AttendanceRecord[] = classStudents.map((s, index) => ({
      id: `ATT-${Date.now().toString().slice(-4)}${index}`,
      date: selectedDate,
      classId: selectedClassId,
      studentId: s.id,
      status: attendanceSheet[s.id]?.status || 'Present',
      remarks: attendanceSheet[s.id]?.remarks,
    }));

    saveAttendanceBatch(recordsToSave);
  };

  // Student Attendance Stats
  const statuses = Object.values(attendanceSheet).map((item) => item.status);
  const presentCount = statuses.filter((s) => s === 'Present').length;
  const absentCount = statuses.filter((s) => s === 'Absent').length;
  const lateCount = statuses.filter((s) => s === 'Late').length;
  const totalCount = classStudents.length;
  const presentPercentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const currentClass = classes.find((c) => c.id === selectedClassId);

  // ============================================================
  // STAFF ATTENDANCE STATE & HANDLERS (Authorized Admin/HR Only)
  // ============================================================
  const combinedPersonnel = useMemo(() => {
    const list: { id: string; fullName: string; roleTitle: string; department: string }[] = [];
    staff.forEach((s) =>
      list.push({
        id: s.id,
        fullName: s.fullName,
        roleTitle: s.roleTitle,
        department: s.department,
      })
    );
    teachers.forEach((t) => {
      if (!list.some((x) => x.id === t.id)) {
        list.push({
          id: t.id,
          fullName: t.fullName,
          roleTitle: 'Macallin',
          department: 'Teaching',
        });
      }
    });
    return list;
  }, [staff, teachers]);

  const [staffDate, setStaffDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [editingStaffAtt, setEditingStaffAtt] = useState<StaffAttendanceRecord | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    status: 'Present' as AttendanceStatus,
    checkInTime: '07:15',
    checkOutTime: '13:30',
    remarks: '',
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isAddStaffAttOpen, setIsAddStaffAttOpen] = useState(false);
  const [newStaffAttForm, setNewStaffAttForm] = useState({
    staffId: '',
    date: new Date().toISOString().substring(0, 10),
    status: 'Present' as AttendanceStatus,
    checkInTime: '07:15',
    checkOutTime: '13:30',
    remarks: '',
  });

  const dailyStaffRecords = useMemo(
    () => staffAttendance.filter((r) => r.date === staffDate),
    [staffAttendance, staffDate]
  );

  const handleMarkAllStaffPresent = async () => {
    if (!canAccessStaffAttendance || combinedPersonnel.length === 0) return;
    const payload = combinedPersonnel.map((p) => ({
      date: staffDate,
      staffId: p.id,
      personName: p.fullName,
      department: p.department,
      roleTitle: p.roleTitle,
      status: 'Present' as AttendanceStatus,
      checkInTime: '07:15',
      checkOutTime: '13:30',
      remarks: '',
    }));
    await saveStaffAttendanceBatch(payload);
  };

  const handleCreateSingleStaffAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canAccessStaffAttendance || !newStaffAttForm.staffId) return;
    const person = combinedPersonnel.find((p) => p.id === newStaffAttForm.staffId);
    const ok = await saveStaffAttendanceBatch([
      {
        date: newStaffAttForm.date,
        staffId: newStaffAttForm.staffId,
        personName: person?.fullName || newStaffAttForm.staffId,
        department: person?.department || 'Administration',
        roleTitle: person?.roleTitle || 'Shaqaale',
        status: newStaffAttForm.status,
        checkInTime: newStaffAttForm.checkInTime,
        checkOutTime: newStaffAttForm.checkOutTime,
        remarks: newStaffAttForm.remarks,
      },
    ]);
    if (ok) {
      setIsAddStaffAttOpen(false);
    }
  };

  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffAtt || !canAccessStaffAttendance) return;
    const ok = await updateStaffAttendanceRecord(editingStaffAtt.id, editStaffForm);
    if (ok) setEditingStaffAtt(null);
  };

  return (
    <div className="space-y-5">
      {/* 403 Forbidden Banner if Teacher attempted direct access */}
      {forbiddenAttemptMsg && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-bold">403 – Oggolaansho La&apos;aan (Forbidden)</p>
              <p>{forbiddenAttemptMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForbiddenAttemptMsg(null)}
            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Maamulka Xaadirinta (Daily Attendance Management)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {canAccessStaffAttendance
              ? 'Diiwaangeli xaadirinta maalinlaha ah ee ardayda iyo shaqaalaha xarunta Machadka Qardho.'
              : 'Diiwaangeli xaadirinta maalinlaha ah ee ardayda fasalladaada.'}
          </p>
        </div>

        {/* Staff Attendance tab strictly hidden for Teachers and Receptionists */}
        {canAccessStaffAttendance && (
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'students'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Xaadirinta Ardayda
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('staff')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'staff'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Xaadirinta Shaqaalaha
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: STUDENT ATTENDANCE */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
                Dooro Fasalka:
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-semibold"
              >
                {teacherScopedClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.section}) · {c.shift || 'Subax'} - {c.roomNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 dark:text-slate-400 font-medium mb-1">
                Taariikhda Xaadirinta:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono-numbers font-medium"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => handleMarkAll('Present')}
                className="flex-1 py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-lg font-semibold text-[11px] transition-colors"
              >
                Dhammaan Jooga
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('Absent')}
                className="flex-1 py-1.5 px-2 bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-100 rounded-lg font-semibold text-[11px] transition-colors"
              >
                Dhammaan Maqan
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 block uppercase">Wadarta Ardayda</span>
              <span className="text-xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">
                {totalCount}
              </span>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-center">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block uppercase font-bold">
                Jooga (Present)
              </span>
              <span className="text-xl font-bold font-mono-numbers text-emerald-800 dark:text-emerald-200">
                {presentCount}
              </span>
            </div>
            <div className="bg-red-50/70 dark:bg-red-950/40 p-3 rounded-xl border border-red-200 dark:border-red-800 text-center">
              <span className="text-[10px] text-red-700 dark:text-red-300 block uppercase font-bold">
                Maqan (Absent)
              </span>
              <span className="text-xl font-bold font-mono-numbers text-red-800 dark:text-red-200">
                {absentCount}
              </span>
            </div>
            <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 block uppercase font-bold">
                Soo Daahay
              </span>
              <span className="text-xl font-bold font-mono-numbers text-amber-800 dark:text-amber-200">
                {lateCount}
              </span>
            </div>
            <div className="bg-teal-50/70 dark:bg-teal-950/40 p-3 rounded-xl border border-teal-200 dark:border-teal-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-[#005A51] dark:text-teal-300 block uppercase font-bold">
                Boqolkiiba (%)
              </span>
              <span className="text-xl font-bold font-mono-numbers text-[#005A51] dark:text-teal-200">
                {presentPercentage}%
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-100">
                Liiska Ardayda: {currentClass?.name} ({currentClass?.section}) ·{' '}
                {currentClass?.shift || 'Subax'} · {selectedDate}
              </span>
              <button
                onClick={handleSaveAttendance}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#00723A] hover:bg-[#005A51] rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Keydi Xaadirinta
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="px-4 py-3">Roll / ID</th>
                    <th className="px-4 py-3">Ardayga (Student Name)</th>
                    <th className="px-4 py-3 text-center">Xaaladda (Status)</th>
                    <th className="px-4 py-3">Faallo / Sabab (Remarks)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classStudents.map((student) => {
                    const currentStatus = attendanceSheet[student.id]?.status || 'Present';
                    const currentRemarks = attendanceSheet[student.id]?.remarks || '';

                    return (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono-numbers text-slate-700 dark:text-slate-300">
                          <span className="font-bold text-[#00723A] dark:text-teal-400">
                            {student.id}
                          </span>
                          <span className="text-slate-400 block text-[10px]">
                            Roll: {student.rollNumber}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {student.fullName}
                          </div>
                          <div className="text-[11px] font-arabic text-amber-700 dark:text-amber-400">
                            {student.arabicName}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <div className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg gap-1">
                            {(['Present', 'Absent', 'Late', 'Excused'] as AttendanceStatus[]).map(
                              (st) => {
                                const label =
                                  st === 'Present'
                                    ? 'Jooga'
                                    : st === 'Absent'
                                    ? 'Maqan'
                                    : st === 'Late'
                                    ? 'Daahay'
                                    : 'Fasax';
                                const activeColor =
                                  st === 'Present'
                                    ? 'bg-[#00723A] text-white'
                                    : st === 'Absent'
                                    ? 'bg-red-600 text-white'
                                    : st === 'Late'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-blue-600 text-white';
                                return (
                                  <button
                                    key={st}
                                    type="button"
                                    onClick={() => handleStatusChange(student.id, st)}
                                    className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                                      currentStatus === st
                                        ? `${activeColor} shadow-2xs`
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              }
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <input
                            type="text"
                            value={currentRemarks}
                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                            placeholder="Sababta maqnaanshaha ama daahidda..."
                            className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden focus:ring-1 focus:ring-[#00723A]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={handleSaveAttendance}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#00723A] hover:bg-[#005A51] rounded-lg shadow-xs transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Keydi Xaadirinta Fasalka
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF ATTENDANCE (STRICTLY ONLY FOR AUTHORIZED ADMINS & HR) */}
      {canAccessStaffAttendance && activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Xaadirinta Shaqaalaha &amp; Macallimiinta
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                Diiwaanka imaanshaha iyo saacadaha shaqada ({dailyStaffRecords.length} diiwaan ee {staffDate})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={staffDate}
                onChange={(e) => setStaffDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono-numbers text-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={handleMarkAllStaffPresent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#00723A] hover:bg-[#005A51] rounded-lg transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Dhammaan Jooga ({combinedPersonnel.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewStaffAttForm({
                    staffId: combinedPersonnel[0]?.id || '',
                    date: staffDate,
                    status: 'Present',
                    checkInTime: '07:15',
                    checkOutTime: '13:30',
                    remarks: '',
                  });
                  setIsAddStaffAttOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#005A51] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Ku Dar Diiwaan
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase block">Wadarta Diiwaanka</span>
              <span className="text-xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">
                {dailyStaffRecords.length}
              </span>
            </div>
            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 uppercase font-bold block">
                Jooga
              </span>
              <span className="text-xl font-bold font-mono-numbers text-emerald-800 dark:text-emerald-200">
                {dailyStaffRecords.filter((r) => r.status === 'Present').length}
              </span>
            </div>
            <div className="bg-amber-50/70 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold block">
                Soo Daahay
              </span>
              <span className="text-xl font-bold font-mono-numbers text-amber-800 dark:text-amber-200">
                {dailyStaffRecords.filter((r) => r.status === 'Late').length}
              </span>
            </div>
            <div className="bg-rose-50/70 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-800">
              <span className="text-[10px] text-rose-700 dark:text-rose-300 uppercase font-bold block">
                Maqan / Fasax
              </span>
              <span className="text-xl font-bold font-mono-numbers text-rose-800 dark:text-rose-200">
                {dailyStaffRecords.filter((r) => r.status === 'Absent' || r.status === 'Excused').length}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="px-4 py-3">ID / Magaca</th>
                    <th className="px-4 py-3">Xilka &amp; Waaxda</th>
                    <th className="px-4 py-3">Saacadaha</th>
                    <th className="px-4 py-3">Xaaladda</th>
                    <th className="px-4 py-3">Faallo</th>
                    <th className="px-4 py-3 text-right">Ficil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dailyStaffRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Weli lama xareyn xaadirinta shaqaalaha ee taariikhda {staffDate}. Guji &quot;Dhammaan Jooga&quot; ama &quot;Ku Dar Diiwaan&quot;.
                      </td>
                    </tr>
                  ) : (
                    dailyStaffRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {rec.personName || rec.staffId}
                          </div>
                          <div className="text-[11px] font-mono-numbers text-[#00723A] dark:text-teal-400">
                            {rec.staffId}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                          {rec.roleTitle || 'Shaqaale'} · {rec.department || 'Administration'}
                        </td>
                        <td className="px-4 py-2.5 font-mono-numbers text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {rec.checkInTime || '--:--'} - {rec.checkOutTime || '--:--'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              rec.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : rec.status === 'Late'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                : rec.status === 'Excused'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                          {rec.remarks || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaffAtt(rec);
                              setEditStaffForm({
                                status: rec.status,
                                checkInTime: rec.checkInTime || '07:15',
                                checkOutTime: rec.checkOutTime || '13:30',
                                remarks: rec.remarks || '',
                              });
                            }}
                            title="Wax ka beddel"
                            className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-[#00723A] hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(rec.id)}
                            title="Tirtir"
                            className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded"
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
        </div>
      )}

      {/* Modal: Add Staff Attendance */}
      {canAccessStaffAttendance && isAddStaffAttOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSingleStaffAttendance}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#00723A]" />
                Ku Dar Xaadirinta Shaqaalaha
              </h4>
              <button type="button" onClick={() => setIsAddStaffAttOpen(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Shaqaalaha / Macallinka
                </label>
                <select
                  required
                  value={newStaffAttForm.staffId}
                  onChange={(e) => setNewStaffAttForm((p) => ({ ...p, staffId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  {combinedPersonnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.roleTitle})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Taariikhda
                  </label>
                  <input
                    type="date"
                    required
                    value={newStaffAttForm.date}
                    onChange={(e) => setNewStaffAttForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Xaaladda
                  </label>
                  <select
                    value={newStaffAttForm.status}
                    onChange={(e) =>
                      setNewStaffAttForm((p) => ({
                        ...p,
                        status: e.target.value as AttendanceStatus,
                      }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Present">Jooga (Present)</option>
                    <option value="Late">Soo Daahay (Late)</option>
                    <option value="Absent">Maqan (Absent)</option>
                    <option value="Excused">Fasax (Excused)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Soo Galay
                  </label>
                  <input
                    type="time"
                    value={newStaffAttForm.checkInTime}
                    onChange={(e) =>
                      setNewStaffAttForm((p) => ({ ...p, checkInTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                    Baxay
                  </label>
                  <input
                    type="time"
                    value={newStaffAttForm.checkOutTime}
                    onChange={(e) =>
                      setNewStaffAttForm((p) => ({ ...p, checkOutTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-600 dark:text-slate-300">
                  Faallo
                </label>
                <input
                  type="text"
                  value={newStaffAttForm.remarks}
                  onChange={(e) => setNewStaffAttForm((p) => ({ ...p, remarks: e.target.value }))}
                  placeholder="Faallo..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddStaffAttOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Ka Noqo
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#00723A] text-white font-bold hover:bg-[#005A51]"
              >
                Kaydi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit Staff Attendance */}
      {canAccessStaffAttendance && editingStaffAtt && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveStaffEdit}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Wax Ka Beddel: {editingStaffAtt.personName}
              </h4>
              <button type="button" onClick={() => setEditingStaffAtt(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Xaaladda</label>
                <select
                  value={editStaffForm.status}
                  onChange={(e) =>
                    setEditStaffForm((p) => ({ ...p, status: e.target.value as AttendanceStatus }))
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                  <option value="Absent">Absent</option>
                  <option value="Excused">Excused</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Soo Galay</label>
                  <input
                    type="text"
                    value={editStaffForm.checkInTime}
                    onChange={(e) =>
                      setEditStaffForm((p) => ({ ...p, checkInTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Baxay</label>
                  <input
                    type="text"
                    value={editStaffForm.checkOutTime}
                    onChange={(e) =>
                      setEditStaffForm((p) => ({ ...p, checkOutTime: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold mb-1">Faallo</label>
                <input
                  type="text"
                  value={editStaffForm.remarks}
                  onChange={(e) => setEditStaffForm((p) => ({ ...p, remarks: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingStaffAtt(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Ka Noqo
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#00723A] text-white font-bold hover:bg-[#005A51]"
              >
                Cusboonaysii
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm Delete Staff Attendance */}
      {canAccessStaffAttendance && confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-5 space-y-4 text-xs shadow-2xl">
            <h4 className="font-bold text-sm text-rose-700 dark:text-rose-400">
              Ma hubtaa inaad tirtirto diiwaankan?
            </h4>
            <p className="text-slate-600 dark:text-slate-300">
              Diiwaanka xaadirinta shaqaalaha ({confirmDeleteId}) waa laga tirtiri doonaa taariikhda.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700"
              >
                Maya
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = confirmDeleteId;
                  setConfirmDeleteId(null);
                  await deleteStaffAttendanceRecord(id);
                }}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700"
              >
                Haa, Tirtir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
