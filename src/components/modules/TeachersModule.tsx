/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Teacher, Gender } from '../../types';
import { ProfileImageUploader } from '../common/ProfileImageUploader';
import {
  BookOpen,
  UserPlus,
  Phone,
  Mail,
  Award,
  Clock,
  Calendar,
  X,
  Edit,
  Trash2,
  CheckCircle,
} from 'lucide-react';

export const TeachersModule: React.FC = () => {
  const {
    teachers,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    subjects,
    classes,
    timetable,
    currentRole,
    focusedRecordIntent,
    setFocusedRecordIntent,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const canManageTeachers =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'HR Manager';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [inspectingScheduleTeacher, setInspectingScheduleTeacher] = useState<Teacher | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (focusedRecordIntent?.type === 'teacher') {
      const target = teachers.find((t) => t.id === focusedRecordIntent.id);
      if (target) {
        setInspectingScheduleTeacher(target);
      }
      setFocusedRecordIntent(null);
    }
  }, [focusedRecordIntent, teachers, setFocusedRecordIntent]);

  useEffect(() => {
    if (navigationIntent?.module !== 'teachers') return;
    if (navigationIntent.action === 'add_teacher' && canManageTeachers) {
      setEditingTeacher(null);
      setIsAddModalOpen(true);
    }
    clearNavigationIntent();
  }, [navigationIntent, canManageTeachers, clearNavigationIntent]);

  const initialForm: Omit<Teacher, 'id'> = {
    fullName: '',
    arabicName: '',
    gender: 'Male',
    phone: '+252 90 7',
    email: '',
    photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
    specialization: '',
    qualification: '',
    joiningDate: new Date().toISOString().substring(0, 10),
    status: 'Active',
    monthlySalary: 350,
    weeklyHours: 16,
  };

  const [formData, setFormData] = useState(initialForm);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTeachers || !formData.fullName || !formData.phone) return;

    if (editingTeacher) {
      updateTeacher(editingTeacher.id, formData);
      setEditingTeacher(null);
    } else {
      addTeacher(formData);
      setIsAddModalOpen(false);
    }
    setFormData(initialForm);
  };

  const handleEdit = (t: Teacher) => {
    if (!canManageTeachers) return;
    setEditingTeacher(t);
    setFormData({
      fullName: t.fullName,
      arabicName: t.arabicName,
      gender: t.gender,
      phone: t.phone,
      email: t.email,
      photoUrl: t.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80',
      specialization: t.specialization,
      qualification: t.qualification,
      joiningDate: t.joiningDate,
      status: t.status,
      monthlySalary: t.monthlySalary,
      weeklyHours: t.weeklyHours,
    });
  };

  return (
    <div className="space-y-5">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Diiwaanka Macallimiinta (Teacher Management)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kormeerka aqoonta macallimiinta, culayska saacadaha toddobaadlaha ah, iyo jadwalka casharrada.
          </p>
        </div>

        {canManageTeachers && (
          <button
            onClick={() => {
              setFormData(initialForm);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Ku Dar Macallin Cusub
          </button>
        )}
      </div>

      {/* Teachers Directory Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teachers.map((teacher) => {
          const assignedSubjects = subjects.filter((s) => s.teacherId === teacher.id);
          const teacherTimetable = timetable.filter((t) => t.teacherId === teacher.id);
          const calculatedHours = teacherTimetable.length; // Lessons assigned

          return (
            <div
              key={teacher.id}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:border-[#005A51] dark:hover:border-teal-500 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={teacher.photoUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80'}
                      alt={teacher.fullName}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <span className="text-[10px] font-mono-numbers font-bold text-[#005A51] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                        {teacher.id}
                      </span>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">{teacher.fullName}</h3>
                      <p className="text-xs font-arabic text-amber-700 dark:text-amber-400">{teacher.arabicName}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      teacher.status === 'Active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {teacher.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase">Khabiirka (Specialization):</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{teacher.specialization}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block uppercase">Shahaadada (Qualification):</span>
                    <span className="text-slate-700 dark:text-slate-300 text-[11px]">{teacher.qualification}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-[#005A51] dark:text-teal-400 shrink-0" />
                      <span className="font-mono-numbers">{teacher.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-mono-numbers font-semibold">
                        {calculatedHours || teacher.weeklyHours} hrs/week
                      </span>
                    </div>
                  </div>

                  {assignedSubjects.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mb-1">Maadooyinka uu dhigo:</span>
                      <div className="flex flex-wrap gap-1">
                        {assignedSubjects.map((sub) => (
                          <span
                            key={sub.id}
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-200 dark:border-slate-700"
                          >
                            {sub.nameSomali}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  onClick={() => setInspectingScheduleTeacher(teacher)}
                  className="font-semibold text-[#005A51] dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Eeg Jadwalka
                </button>

                {canManageTeachers && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(teacher)}
                      title="Wax ka beddel macallinka"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteId === teacher.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            deleteTeacher(teacher.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded"
                        >
                          Hubi
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-0.5 text-[10px] text-slate-600 bg-slate-100 rounded"
                        >
                          Maya
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(teacher.id)}
                        title="Tir macallinka"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Teacher Schedule Modal */}
      {inspectingScheduleTeacher && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 bg-[#005A51] text-white">
              <div>
                <h3 className="font-bold text-sm">
                  Jadwalka Casharrada: {inspectingScheduleTeacher.fullName}
                </h3>
                <p className="text-xs text-amber-300 font-arabic">
                  {inspectingScheduleTeacher.arabicName}
                </p>
              </div>
              <button
                onClick={() => setInspectingScheduleTeacher(null)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              {timetable.filter((t) => t.teacherId === inspectingScheduleTeacher.id).length > 0 ? (
                <div className="space-y-2">
                  {timetable
                    .filter((t) => t.teacherId === inspectingScheduleTeacher.id)
                    .map((slot) => {
                      const sub = subjects.find((s) => s.id === slot.subjectId);
                      const cls = classes.find((c) => c.id === slot.classId);

                      return (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                        >
                          <div>
                            <div className="font-bold text-slate-900">
                              {sub?.nameSomali || 'Maado'} ({cls?.name} {cls?.section})
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Maalinta: <strong className="text-[#005A51]">{slot.day}</strong> · Qolka: {slot.roomNumber}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-mono-numbers font-bold text-slate-800 bg-white px-2 py-1 rounded border border-slate-200">
                              Casharka {slot.period} ({slot.timeRange})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400">
                  Weli casharro looma qorshayn macallinkan jadwalka toddobaadlaha ah.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Teacher Modal */}
      {(isAddModalOpen || editingTeacher) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {editingTeacher ? 'Wax ka beddel Xogta Macallinka' : 'Diiwaangeli Macallin Cusub'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingTeacher(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              {/* Profile Image Uploader */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <ProfileImageUploader
                  currentImageUrl={formData.photoUrl || ''}
                  onImageChange={(url) => setFormData({ ...formData, photoUrl: url })}
                  type="teacher"
                  label="Sawirka Macallinka (Teacher Profile Picture)"
                  shape="circle"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-slate-600 font-medium mb-1">Magaca Buuxa: *</label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Shiikh Axmed Maxamuud..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-slate-600 font-medium mb-1">Magaca Carabiga:</label>
                  <input
                    type="text"
                    value={formData.arabicName}
                    onChange={(e) => setFormData({ ...formData, arabicName: e.target.value })}
                    placeholder="الشيخ أحمد محمود..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51] font-arabic"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Taleefanka: *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Emailka:</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="macallin@machadka..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 font-medium mb-1">Takhasuska (Specialization):</label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="Culuunta Quraanka / Carabiga / Xisaabta..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-600 font-medium mb-1">Shahaadada (Qualification):</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="Bachelor of Islamic Studies - Jaamacadda..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Mushaharka Bisha ($):</label>
                  <input
                    type="number"
                    value={formData.monthlySalary}
                    onChange={(e) => setFormData({ ...formData, monthlySalary: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Saacadaha Toddobaadka:</label>
                  <input
                    type="number"
                    value={formData.weeklyHours}
                    onChange={(e) => setFormData({ ...formData, weeklyHours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-[#005A51]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingTeacher(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg"
                >
                  Keydi Macallinka
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
