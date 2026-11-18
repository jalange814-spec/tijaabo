/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StaffMember, StaffLeaveRequest, PayrollRecord } from '../../types';
import { ProfileImageUploader } from '../common/ProfileImageUploader';
import {
  Briefcase,
  PlusCircle,
  Printer,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Layers,
  X,
  UserCheck,
  Edit,
  Trash2,
  UserPlus,
} from 'lucide-react';

export const HrPayrollModule: React.FC = () => {
  const {
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
    leaveRequests,
    addLeaveRequest,
    updateLeaveStatus,
    payroll,
    generateMonthlyPayroll,
    openPrint,
    settings,
    currentRole,
    currentUser,
    teachers,
    focusedRecordIntent,
    setFocusedRecordIntent,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const isTeacher = currentRole === 'Teacher';
  const isAccountant = currentRole === 'Accountant';
  const canManageHr =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'HR Manager';
  const canGeneratePayroll =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Accountant';

  const myStaffOrTeacherId = currentUser?.linkedTeacherId || currentUser?.linkedStaffId || '';

  const visibleLeaves = isTeacher
    ? leaveRequests.filter(
        (l) =>
          (myStaffOrTeacherId && l.staffId === myStaffOrTeacherId) ||
          (currentUser && l.staffName.toLowerCase() === currentUser.fullName.toLowerCase())
      )
    : leaveRequests;

  const visiblePayroll = isTeacher
    ? payroll.filter((p) => myStaffOrTeacherId && p.staffId === myStaffOrTeacherId)
    : payroll;

  const [activeTab, setActiveTab] = useState<'payroll' | 'leaves' | 'directory'>(
    isTeacher ? 'leaves' : 'payroll'
  );

  useEffect(() => {
    if (focusedRecordIntent?.type === 'staff' && canManageHr) {
      setActiveTab('directory');
      setFocusedRecordIntent(null);
    }
  }, [focusedRecordIntent, canManageHr, setFocusedRecordIntent]);

  useEffect(() => {
    if (navigationIntent?.module !== 'hr') return;
    if (navigationIntent.tab === 'leaves') {
      setActiveTab('leaves');
    } else if (navigationIntent.tab === 'directory' && canManageHr) {
      setActiveTab('directory');
    } else if (navigationIntent.tab === 'payroll') {
      setActiveTab('payroll');
    }
    clearNavigationIntent();
  }, [navigationIntent, canManageHr, clearNavigationIntent]);
  const [selectedMonth, setSelectedMonth] = useState<string>('October 2026');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [confirmDeleteStaffId, setConfirmDeleteStaffId] = useState<string | null>(null);

  const initialStaffForm: Omit<StaffMember, 'id'> = {
    fullName: '',
    department: 'Administration',
    roleTitle: '',
    phone: '+252 90 7',
    email: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
    basicSalary: 300,
    allowance: 50,
    joiningDate: new Date().toISOString().substring(0, 10),
    status: 'Active',
  };

  const [staffForm, setStaffForm] = useState(initialStaffForm);

  const [leaveForm, setLeaveForm] = useState({
    staffId: isTeacher ? myStaffOrTeacherId : staff[0]?.id || 'STF-01',
    staffName: isTeacher ? currentUser?.fullName || '' : staff[0]?.fullName || '',
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date().toISOString().substring(0, 10),
    daysCount: 3,
    reason: '',
  });

  const handleGeneratePayroll = () => {
    generateMonthlyPayroll(selectedMonth);
  };

  const handleCreateLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.reason) return;
    addLeaveRequest(leaveForm);
    setIsLeaveModalOpen(false);
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.fullName || !staffForm.phone) return;

    if (editingStaff) {
      updateStaff(editingStaff.id, staffForm);
      setEditingStaff(null);
    } else {
      addStaff(staffForm);
      setIsStaffModalOpen(false);
    }
    setStaffForm(initialStaffForm);
  };

  const handleOpenEditStaff = (stf: StaffMember) => {
    setEditingStaff(stf);
    setStaffForm({
      fullName: stf.fullName,
      department: stf.department,
      roleTitle: stf.roleTitle,
      phone: stf.phone,
      email: stf.email,
      photoUrl: stf.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      basicSalary: stf.basicSalary,
      allowance: stf.allowance,
      joiningDate: stf.joiningDate,
      status: stf.status,
    });
    setIsStaffModalOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Shaqaalaha &amp; Mushaharka (HR Management &amp; Payroll)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kormeerka shaqaalaha, codsiyada fasaxyada (Leaves), iyo bixinta mushaharka bil kasta (Payslips).
          </p>
        </div>

        <div className="w-full lg:w-auto overflow-x-auto">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold whitespace-nowrap">
            <button
              onClick={() => setActiveTab('payroll')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'payroll'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Mushaharka (Payroll)
            </button>
            <button
              onClick={() => setActiveTab('leaves')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'leaves'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Fasaxyada ({visibleLeaves.filter((l) => l.status === 'Pending').length} Sugaya)
            </button>
            {canManageHr && (
              <button
                onClick={() => setActiveTab('directory')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'directory'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Diiwaanka Shaqaalaha ({staff.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TAB 1: PAYROLL SHEET */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
            <div>
              <h3 className="font-bold text-slate-800">
                {isTeacher ? 'Mushaharkaaga & Payslips' : 'Xaashida Mushaharka Shaqaalaha (Monthly Payroll Sheet)'}
              </h3>
              <p className="text-slate-500">
                Mushaharka aasaasiga ah, gunnooyinka, iyo soo saaridda warqadda rasmiga ah (Payslip).
              </p>
            </div>

            {canGeneratePayroll && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  placeholder="e.g. October 2026"
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
                />
                <button
                  onClick={handleGeneratePayroll}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Diyaari Mushaharka Bisha
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="px-4 py-3">Shaqaalaha (Staff)</th>
                  <th className="px-3 py-3">Bisha</th>
                  <th className="px-3 py-3 text-right">Mushaharka Asalka ah</th>
                  <th className="px-3 py-3 text-right">Gunnooyinka</th>
                  <th className="px-3 py-3 text-right">Mushaharka Saafiga ah</th>
                  <th className="px-3 py-3">Habka Bixinta</th>
                  <th className="px-4 py-3 text-right">Daabac Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visiblePayroll.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Weli lama diiwaangelin payslip ku xiran akoonkan.
                    </td>
                  </tr>
                ) : (
                  visiblePayroll.map((pay) => {
                    const stf = staff.find((s) => s.id === pay.staffId);
                    const tch = teachers.find((t) => t.id === pay.staffId);
                    const personName = stf?.fullName || tch?.fullName || 'Shaqaale';
                    const personSubtitle = stf
                      ? `${stf.roleTitle} (${stf.department})`
                      : tch
                      ? `Macallin (${tch.specialization})`
                      : pay.staffId;

                    return (
                      <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{personName}</div>
                          <div className="text-[11px] text-slate-400">{personSubtitle}</div>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-800">{pay.month}</td>
                        <td className="px-3 py-3 text-right font-mono-numbers text-slate-700">
                          ${pay.basicSalary.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-numbers text-emerald-700 font-semibold">
                          +${pay.allowances.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-numbers font-bold text-[#005A51] text-sm">
                          ${pay.netSalary.toFixed(2)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-slate-800 block">{pay.paymentMethod}</span>
                          <span className="text-[10px] text-slate-400 font-mono-numbers">{pay.referenceNo}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              openPrint({
                                type: 'payslip',
                                payslip: pay,
                                staff: stf,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-[#005A51] hover:bg-teal-100 border border-teal-200 rounded text-[11px] font-bold transition-colors"
                          >
                            <Printer className="w-3 h-3" />
                            Payslip
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
      )}

      {/* TAB 2: LEAVE REQUESTS */}
      {activeTab === 'leaves' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">
              Codsiyada fasaxyada macallimiinta iyo shaqaalaha maamulka
            </span>
            <button
              onClick={() => setIsLeaveModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Gudbi Codsi Fasax
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="px-4 py-3">Shaqaalaha</th>
                  <th className="px-3 py-3">Muddada Fasaxa</th>
                  <th className="px-3 py-3 text-center">Tirada Maalmaha</th>
                  <th className="px-4 py-3">Sababta Fasaxa</th>
                  <th className="px-3 py-3 text-center">Xaaladda</th>
                  <th className="px-4 py-3 text-right">Go'aanka Maamulka</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleLeaves.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block">{req.staffName}</span>
                      <span className="text-[10px] text-slate-400 font-mono-numbers">Gudbiyay: {req.requestDate}</span>
                    </td>
                    <td className="px-3 py-3 font-mono-numbers text-slate-700">
                      {req.startDate} ilaa {req.endDate}
                    </td>
                    <td className="px-3 py-3 text-center font-mono-numbers font-bold text-slate-800">
                      {req.daysCount} maalmood
                    </td>
                    <td className="px-4 py-3 text-slate-700">{req.reason}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          req.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : req.status === 'Pending'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {req.status === 'Approved' ? 'La Oggolaaday' : req.status === 'Pending' ? 'Sugaya' : 'La Diiday'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === 'Pending' && canManageHr ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => updateLeaveStatus(req.id, 'Approved')}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px]"
                          >
                            Oggolow
                          </button>
                          <button
                            onClick={() => updateLeaveStatus(req.id, 'Rejected')}
                            className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-[11px]"
                          >
                            Diid
                          </button>
                        </div>
                      ) : req.status === 'Pending' ? (
                        <span className="text-[11px] text-amber-600 font-medium">Sugaya go’aanka maamulka</span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Waxaa go'aamiyay: {req.approvedBy || settings.principalName}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: STAFF DIRECTORY */}
      {activeTab === 'directory' && canManageHr && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Liiska shaqaalaha maamulka, nadaafadda, iyo ammaanka ({staff.length} qof)
            </span>
            <button
              onClick={() => {
                setEditingStaff(null);
                setStaffForm(initialStaffForm);
                setIsStaffModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Ku Dar Shaqaale Cusub
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map((stf) => (
              <div
                key={stf.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs hover:border-[#005A51] dark:hover:border-teal-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={stf.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'}
                        alt={stf.fullName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div>
                        <span className="text-[10px] font-mono-numbers font-bold text-[#005A51] dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                          {stf.id}
                        </span>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">{stf.fullName}</h4>
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">{stf.roleTitle}</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded font-medium border border-slate-200 dark:border-slate-700">
                      {stf.department}
                    </span>
                  </div>

                  <div className="my-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Taleefanka:</span>
                      <span className="font-mono-numbers">{stf.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Emailka:</span>
                      <span className="font-mono-numbers">{stf.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 dark:text-slate-500">Xilliga Ku Biiray:</span>
                      <span className="font-mono-numbers">{stf.joiningDate}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Mushaharka:</span>
                    <span className="font-mono-numbers font-bold text-[#005A51] dark:text-teal-400 text-sm">
                      ${(stf.basicSalary + stf.allowance).toFixed(2)}/mo
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditStaff(stf)}
                      title="Wax ka beddel xogta shaqaalaha"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {confirmDeleteStaffId === stf.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            deleteStaff(stf.id);
                            setConfirmDeleteStaffId(null);
                          }}
                          className="px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-bold"
                        >
                          Tir
                        </button>
                        <button
                          onClick={() => setConfirmDeleteStaffId(null)}
                          className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-[10px]"
                        >
                          Maya
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteStaffId(stf.id)}
                        title="Tir shaqaalaha"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Add / Edit Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {editingStaff ? 'Wax ka beddel Shaqaalaha' : 'Diiwaangeli Shaqaale Cusub'}
              </h3>
              <button
                onClick={() => {
                  setIsStaffModalOpen(false);
                  setEditingStaff(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3">
              {/* Profile Image Uploader */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <ProfileImageUploader
                  currentImageUrl={staffForm.photoUrl || ''}
                  onImageChange={(url) => setStaffForm({ ...staffForm, photoUrl: url })}
                  type="staff"
                  label="Sawirka Shaqaalaha (Staff Profile Picture)"
                  shape="circle"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Magaca Buuxa: *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.fullName}
                    onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                    placeholder="Faarax Cismaan Cali..."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Qeybta (Department):</label>
                  <select
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value as any })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="Administration">Administration (Maamulka)</option>
                    <option value="Finance">Finance (Maaliyadda)</option>
                    <option value="Support">Support (Adeegga & Nadaafadda)</option>
                    <option value="Security">Security (Ammaanka)</option>
                    <option value="Teaching">Teaching (Waxbarashada)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Xilka (Role Title): *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.roleTitle}
                    onChange={(e) => setStaffForm({ ...staffForm, roleTitle: e.target.value })}
                    placeholder="Xisaabiye, Kilaark, Waardiye..."
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Taleefanka: *</label>
                  <input
                    type="text"
                    required
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Mushaharka Aasaasiga ($):</label>
                  <input
                    type="number"
                    value={staffForm.basicSalary}
                    onChange={(e) => setStaffForm({ ...staffForm, basicSalary: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Gunnooyinka ($):</label>
                  <input
                    type="number"
                    value={staffForm.allowance}
                    onChange={(e) => setStaffForm({ ...staffForm, allowance: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsStaffModalOpen(false);
                    setEditingStaff(null);
                  }}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  {editingStaff ? 'Keydi Wax ka beddelka' : 'Diiwaangeli Shaqaalaha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Request Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Gudbi Codsi Fasax (Staff Leave)</h3>
              <button onClick={() => setIsLeaveModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLeave} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  {isTeacher ? 'Codsi Fasax (Macallinka):' : 'Dooro Shaqaalaha:'}
                </label>
                {isTeacher ? (
                  <input
                    type="text"
                    readOnly
                    value={`${currentUser?.fullName || leaveForm.staffName} (${myStaffOrTeacherId})`}
                    className="w-full px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg font-semibold text-slate-700"
                  />
                ) : (
                  <select
                    value={leaveForm.staffId}
                    onChange={(e) => {
                      const st = staff.find((s) => s.id === e.target.value);
                      setLeaveForm({
                        ...leaveForm,
                        staffId: e.target.value,
                        staffName: st?.fullName || '',
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  >
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.roleTitle})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Bilaabashada:</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Dhamaadka:</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Tirada Maalmaha:</label>
                <input
                  type="number"
                  min={1}
                  value={leaveForm.daysCount}
                  onChange={(e) => setLeaveForm({ ...leaveForm, daysCount: Number(e.target.value) })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Sababta Fasaxa: *</label>
                <textarea
                  rows={2}
                  required
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="Xanuun, xaalad qoys, baaritaan dhakhtar..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  Gudbi Codsiga
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
