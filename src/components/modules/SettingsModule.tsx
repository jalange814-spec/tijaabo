/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { AuditLog, RbacAction, RbacPermissionPolicy, UserAccount, UserRole } from '../../types';
import { ROLE_ALLOWED_MODULES, ROLE_LABELS_SOMALI } from '../../utils/rbac';
import { ProfileImageUploader } from '../common/ProfileImageUploader';
import {
  RotateCcw,
  Key,
  Palette,
  Save,
  Sun,
  Moon,
  Users,
  UserPlus,
  Trash2,
  Edit,
  X,
  ShieldCheck,
  RefreshCw,
  Lock,
  Power,
  Search,
  Check,
  Activity,
} from 'lucide-react';

const ALL_ROLES: UserRole[] = [
  'Super Admin',
  'Administrator',
  'Academic Manager',
  'Accountant',
  'Teacher',
  'HR Manager',
  'Receptionist',
  'Institute',
  'Student',
  'Parent',
];

const ALL_MODULE_META: Array<{ id: string; label: string }> = [
  { id: 'dashboard', label: 'Dulmar Guud' },
  { id: 'students', label: 'Ardayda' },
  { id: 'student_portal', label: 'Bogga Ardayga' },
  { id: 'classes', label: 'Fasallada' },
  { id: 'teachers', label: 'Macallimiinta' },
  { id: 'attendance', label: 'Xaadirinta' },
  { id: 'exams', label: 'Imtixaanaadka' },
  { id: 'exam_cards', label: 'Kaararka Imtixaanka' },
  { id: 'fees', label: 'Biilasha' },
  { id: 'finance', label: 'Maaliyadda' },
  { id: 'hr', label: 'Shaqaalaha & HR' },
  { id: 'timetable', label: 'Jadwalka' },
  { id: 'messaging', label: 'Ogeysiisyada' },
  { id: 'reports', label: 'Warbixinnada' },
  { id: 'settings', label: 'Qaabeynta' },
  { id: 'support', label: 'Caawinta' },
];

const RBAC_ACTIONS: Array<{ id: RbacAction; label: string }> = [
  { id: 'read', label: 'Read' },
  { id: 'create', label: 'Create' },
  { id: 'update', label: 'Update' },
  { id: 'delete', label: 'Delete' },
  { id: 'manage_users', label: 'Manage Users' },
  { id: 'manage_permissions', label: 'Manage RBAC' },
];

const ADMIN_STAFF_ROLES: UserRole[] = [
  'Super Admin',
  'Administrator',
  'Academic Manager',
  'Accountant',
  'HR Manager',
  'Receptionist',
];

export const SettingsModule: React.FC = () => {
  const {
    settings,
    updateSettings,
    auditLogs,
    fetchAuditLogs,
    fetchLoginActivity,
    currentRole,
    currentUser,
    userAccounts,
    rbacPolicies,
    updateRbacPolicies,
    addUserAccount,
    updateUserAccount,
    toggleUserAccountStatus,
    resetUserAccountPassword,
    deleteUserAccount,
    teachers,
    students,
    resetToDefault,
    theme,
    toggleTheme,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const isSuperAdmin = currentRole === 'Super Admin';
  const canManageAccounts = currentRole === 'Super Admin' || currentRole === 'Administrator';
  const [activeTab, setActiveTab] = useState<'general' | 'accounts' | 'rbac' | 'audit'>('general');

  useEffect(() => {
    if (navigationIntent?.module !== 'settings') return;
    const t = navigationIntent.tab;
    if (t === 'accounts' && canManageAccounts) {
      setActiveTab('accounts');
    } else if (t === 'rbac' || t === 'audit' || t === 'general') {
      setActiveTab(t);
    }
    clearNavigationIntent();
  }, [navigationIntent, canManageAccounts, clearNavigationIntent]);

  const [form, setForm] = useState(settings);
  const [confirmReset, setConfirmReset] = useState(false);

  // Audit & Login Activity filters
  const [auditFilter, setAuditFilter] = useState<'all' | 'login' | 'students' | 'staff'>('all');
  const [loginActivityLogs, setLoginActivityLogs] = useState<AuditLog[] | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditStudentId, setAuditStudentId] = useState<string>('all');
  const [auditAction, setAuditAction] = useState<string>('all');
  const [auditModule, setAuditModule] = useState<string>('all');
  const [auditStatus, setAuditStatus] = useState<string>('all');
  const [auditDateFrom, setAuditDateFrom] = useState<string>('');
  const [auditDateTo, setAuditDateTo] = useState<string>('');
  const [isRefreshingAudit, setIsRefreshingAudit] = useState(false);

  useEffect(() => {
    if (activeTab !== 'audit') return;
    setIsRefreshingAudit(true);
    if (auditFilter === 'login') {
      fetchLoginActivity({
        status: auditStatus !== 'all' ? auditStatus : undefined,
        search: auditSearch || undefined,
      })
        .then((rows) => setLoginActivityLogs(rows))
        .finally(() => setIsRefreshingAudit(false));
      return;
    }
    setLoginActivityLogs(null);
    fetchAuditLogs({
      studentId: auditStudentId !== 'all' ? auditStudentId : undefined,
      action: auditAction !== 'all' ? auditAction : undefined,
      module: auditModule !== 'all' ? auditModule : undefined,
      status: auditStatus !== 'all' ? auditStatus : undefined,
      dateFrom: auditDateFrom || undefined,
      dateTo: auditDateTo || undefined,
      search: auditSearch || undefined,
    }).finally(() => setIsRefreshingAudit(false));
  }, [
    activeTab,
    auditFilter,
    auditStudentId,
    auditAction,
    auditModule,
    auditStatus,
    auditDateFrom,
    auditDateTo,
    auditSearch,
    fetchAuditLogs,
    fetchLoginActivity,
  ]);

  // Account filters & modal state
  const [accountCategory, setAccountCategory] = useState<'all' | 'admin' | 'teacher' | 'institute' | 'portal'>('all');
  const [accountRoleFilter, setAccountRoleFilter] = useState<string>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<string>('all');
  const [accountSearch, setAccountSearch] = useState<string>('');

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [confirmDeleteAccountId, setConfirmDeleteAccountId] = useState<string | null>(null);
  const [parentChildSearch, setParentChildSearch] = useState<string>('');

  const [resetPasswordTarget, setResetPasswordTarget] = useState<UserAccount | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [resetForceChange, setResetForceChange] = useState<boolean>(false);
  const [isSavingReset, setIsSavingReset] = useState<boolean>(false);

  const [accountForm, setAccountForm] = useState<{
    fullName: string;
    username: string;
    email: string;
    password: string;
    role: UserRole;
    status: 'Active' | 'Deactivated' | 'Suspended';
    linkedTeacherId: string;
    linkedStudentId: string;
    linkedStudentIds: string[];
    permissions: string[];
  }>({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'Academic Manager',
    status: 'Active',
    linkedTeacherId: '',
    linkedStudentId: '',
    linkedStudentIds: [],
    permissions: [],
  });

  // Editable RBAC policy matrix state (synced with rbacPolicies from backend)
  const [draftPolicies, setDraftPolicies] = useState<RbacPermissionPolicy[]>([]);
  const [isSavingPolicies, setIsSavingPolicies] = useState(false);

  useEffect(() => {
    if (rbacPolicies.length > 0) {
      setDraftPolicies(rbacPolicies);
    } else {
      setDraftPolicies(
        ALL_ROLES.map((r) => ({
          role: r,
          modules: ROLE_ALLOWED_MODULES[r] || [],
          actions: r === 'Super Admin' ? ['read', 'create', 'update', 'delete', 'manage_users', 'manage_permissions'] : ['read'],
          description: ROLE_LABELS_SOMALI[r],
        }))
      );
    }
  }, [rbacPolicies]);

  const handleOpenCreateAccount = () => {
    setEditingAccount(null);
    setParentChildSearch('');
    setAccountForm({
      fullName: '',
      username: '',
      email: '',
      password: '',
      role: 'Teacher',
      status: 'Active',
      linkedTeacherId: '',
      linkedStudentId: '',
      linkedStudentIds: [],
      permissions: [],
    });
    setIsAccountModalOpen(true);
  };

  const handleOpenEditAccount = (acc: UserAccount) => {
    if (acc.role === 'Super Admin' && !isSuperAdmin) return;
    setEditingAccount(acc);
    setParentChildSearch('');
    const linkedIds =
      Array.isArray(acc.linkedStudentIds) && acc.linkedStudentIds.length > 0
        ? acc.linkedStudentIds
        : acc.linkedStudentId
        ? [acc.linkedStudentId]
        : [];
    setAccountForm({
      fullName: acc.fullName,
      username: acc.username,
      email: acc.email,
      password: '',
      role: acc.role,
      status:
        acc.status === 'Deactivated'
          ? 'Deactivated'
          : acc.status === 'Suspended'
          ? 'Suspended'
          : 'Active',
      linkedTeacherId: acc.linkedTeacherId || '',
      linkedStudentId: acc.linkedStudentId || linkedIds[0] || '',
      linkedStudentIds: linkedIds,
      permissions: Array.isArray(acc.permissions) ? acc.permissions : [],
    });
    setIsAccountModalOpen(true);
  };

  const handleOpenResetPassword = (acc: UserAccount) => {
    if (acc.role === 'Super Admin' && !isSuperAdmin) return;
    setResetPasswordTarget(acc);
    setResetNewPassword('');
    setResetForceChange(acc.role === 'Student');
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordTarget || resetNewPassword.trim().length < 4) return;
    setIsSavingReset(true);
    const ok = await resetUserAccountPassword(
      resetPasswordTarget.id,
      resetNewPassword.trim(),
      resetForceChange
    );
    setIsSavingReset(false);
    if (ok) {
      setResetPasswordTarget(null);
      setResetNewPassword('');
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.fullName.trim() || !accountForm.username.trim()) return;
    if (!editingAccount && accountForm.password.trim().length < 4) return;

    const parentIds =
      accountForm.role === 'Parent'
        ? accountForm.linkedStudentIds.length > 0
          ? accountForm.linkedStudentIds
          : accountForm.linkedStudentId
          ? [accountForm.linkedStudentId]
          : []
        : [];

    const payload: Omit<UserAccount, 'id'> = {
      fullName: accountForm.fullName.trim(),
      username: accountForm.username.trim(),
      email: accountForm.email.trim() || `${accountForm.username.trim()}@machadkakhadiija.edu.so`,
      ...(accountForm.password.trim() ? { password: accountForm.password.trim() } : {}),
      role: accountForm.role,
      status: accountForm.status,
      linkedTeacherId: accountForm.role === 'Teacher' && accountForm.linkedTeacherId ? accountForm.linkedTeacherId : undefined,
      linkedStudentId:
        accountForm.role === 'Student'
          ? accountForm.linkedStudentId || undefined
          : accountForm.role === 'Parent'
          ? parentIds[0] || undefined
          : undefined,
      linkedStudentIds: accountForm.role === 'Parent' ? parentIds : undefined,
      ...(isSuperAdmin ? { permissions: accountForm.permissions } : {}),
    };

    if (editingAccount) {
      await updateUserAccount(editingAccount.id, payload);
    } else {
      await addUserAccount(payload);
    }
    setIsAccountModalOpen(false);
    setEditingAccount(null);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
  };

  const togglePolicyModule = (role: UserRole, moduleId: string) => {
    if (!isSuperAdmin || role === 'Super Admin') return;
    setDraftPolicies((prev) =>
      prev.map((p) => {
        if (p.role !== role) return p;
        const exists = p.modules.includes(moduleId);
        return {
          ...p,
          modules: exists ? p.modules.filter((m) => m !== moduleId) : [...p.modules, moduleId],
        };
      })
    );
  };

  const togglePolicyAction = (role: UserRole, action: RbacAction) => {
    if (!isSuperAdmin || role === 'Super Admin') return;
    setDraftPolicies((prev) =>
      prev.map((p) => {
        if (p.role !== role) return p;
        const exists = p.actions.includes(action);
        return {
          ...p,
          actions: exists ? p.actions.filter((a) => a !== action) : [...p.actions, action],
        };
      })
    );
  };

  const handleSaveRbacPolicies = async () => {
    if (!isSuperAdmin) return;
    setIsSavingPolicies(true);
    await updateRbacPolicies(draftPolicies);
    setIsSavingPolicies(false);
  };

  const filteredUserAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase();
    return userAccounts.filter((acc) => {
      if (accountCategory === 'admin' && !ADMIN_STAFF_ROLES.includes(acc.role)) return false;
      if (accountCategory === 'teacher' && acc.role !== 'Teacher') return false;
      if (accountCategory === 'institute' && acc.role !== 'Institute') return false;
      if (accountCategory === 'portal' && acc.role !== 'Student' && acc.role !== 'Parent') return false;
      if (accountRoleFilter !== 'all' && acc.role !== accountRoleFilter) return false;
      if (accountStatusFilter !== 'all' && acc.status !== accountStatusFilter) return false;
      if (q) {
        return (
          acc.fullName.toLowerCase().includes(q) ||
          acc.username.toLowerCase().includes(q) ||
          acc.email.toLowerCase().includes(q) ||
          acc.id.toLowerCase().includes(q) ||
          (acc.linkedTeacherId || '').toLowerCase().includes(q) ||
          (acc.linkedStudentId || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [userAccounts, accountCategory, accountRoleFilter, accountStatusFilter, accountSearch]);

  // Dynamic RBAC Matrix powered by draftPolicies / backend API (editable by Super Admin only)

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Qaabeynta & Amniga (Settings, Accounts & RBAC)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Astaanta dugsiga, habka maalinta/habeenka, maamulka akoonnada isticmaalayaasha, iyo diiwaanka audit-ka.
          </p>
        </div>

        <div className="w-full lg:w-auto overflow-x-auto">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold whitespace-nowrap">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'general' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Macluumaadka & Astaanta
            </button>
            {canManageAccounts && (
              <button
                onClick={() => setActiveTab('accounts')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'accounts' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Akoonnada & Furayaasha ({userAccounts.length})
              </button>
            )}
            <button
              onClick={() => setActiveTab('rbac')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'rbac' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Doorka & Oggolaanshaha (RBAC)
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'audit' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Diiwaanka Audit Logs ({auditLogs.length})
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: GENERAL SETTINGS & BRAND COLORS & THEME */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              Faahfaahinta Rasmiga ah ee Machadka
            </h3>

            <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
              {/* Institutional Logo Uploader */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <ProfileImageUploader
                  currentImageUrl={form.logoUrl}
                  onImageChange={(url) => setForm({ ...form, logoUrl: url })}
                  type="logo"
                  label="Astaanta Rasmiga ah ee Machadka (School Logo & Emblem)"
                  shape="circle"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Magaca Machadka (Somali / English):
                </label>
                <input
                  type="text"
                  required
                  value={form.institutionName}
                  onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Magaca Carabiga (Arabic Name):
                </label>
                <input
                  type="text"
                  required
                  value={form.arabicName}
                  onChange={(e) => setForm({ ...form, arabicName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-arabic font-bold text-amber-700 dark:text-amber-400 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Sanad Dugsiyeedka (Academic Year):
                  </label>
                  <input
                    type="text"
                    required
                    value={form.academicYear}
                    onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                    Maamulaha Guud (Principal):
                  </label>
                  <input
                    type="text"
                    required
                    value={form.principalName}
                    onChange={(e) => setForm({ ...form, principalName: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-medium text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                  Goobta & Cinwaanka (Location in Qardho):
                </label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Taleefanka:</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">Emailka:</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  Keydi Qaabeynta
                </button>
              </div>
            </form>
          </div>

          {/* Theme & Palette Showcase */}
          <div className="space-y-4">
            {/* Theme Mode Selector Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>Habka Muuqaalka (Day & Night Mode)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dooro muuqaalka ku habboon indhahaaga (Maalin ama Habeen):
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => theme === 'dark' && toggleTheme()}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    theme === 'light'
                      ? 'border-[#005A51] bg-teal-50/70 text-[#005A51] font-bold shadow-2xs ring-2 ring-teal-500/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <Sun className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                  <span className="text-xs block">Maalin (Light)</span>
                  <span className="text-[10px] text-slate-400 block">Cad & Nadiif ah</span>
                </button>

                <button
                  type="button"
                  onClick={() => theme === 'light' && toggleTheme()}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    theme === 'dark'
                      ? 'border-amber-400 bg-amber-950/40 text-amber-300 font-bold shadow-2xs ring-2 ring-amber-400/20'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <Moon className="w-5 h-5 mx-auto mb-1 text-amber-400" />
                  <span className="text-xs block">Habeen (Dark)</span>
                  <span className="text-[10px] text-slate-400 block">Indhaha u roon</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-sm">
                <Palette className="w-4 h-4 text-[#005A51] dark:text-teal-400" />
                <span>Nidaamka Midabada (Brand Palette)</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Midabbada rasmiga ah ee Machadka Khadiija Bintu Khuwaylid ee Qardho:
              </p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <div className="w-8 h-8 rounded-md bg-[#005A51] shadow-2xs shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">Primary Deep Teal</span>
                    <span className="font-mono-numbers text-slate-500 dark:text-slate-400 text-[11px]">#005A51</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <div className="w-8 h-8 rounded-md bg-[#FCA700] shadow-2xs shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">Primary Golden Yellow</span>
                    <span className="font-mono-numbers text-slate-500 dark:text-slate-400 text-[11px]">#FCA700</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                  <div className="w-8 h-8 rounded-md bg-[#00897B] shadow-2xs shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100 block">Light Teal</span>
                    <span className="font-mono-numbers text-slate-500 dark:text-slate-400 text-[11px]">#00897B</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reset to Sample Data */}
            <div className="bg-red-50/60 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-5 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold text-red-900 dark:text-red-300">Dib u Celi Xogta Asalka ah (Reset Data)</h4>
              <p className="text-red-700 dark:text-red-400 leading-relaxed">
                Tirtir wax ka beddel kasta oo aad samaysay oo dib ugu noqo xogtii asalka ahayd ee tusaalaha ahayd ee Qardho.
              </p>
              {confirmReset ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      resetToDefault();
                      setConfirmReset(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Haa, Dib u Soo Celi
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Ka noqo
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 font-bold text-red-700 bg-white border border-red-300 hover:bg-red-100 rounded-lg transition-colors mt-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Dib u soo celi Xogta
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ACCOUNTS & PASSWORDS MANAGEMENT */}
      {activeTab === 'accounts' && canManageAccounts && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#005A51] dark:text-teal-400" />
                  Maamulka Akoonnada, Macallimiinta & Furayaasha (User Management)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Qof kasta wuxuu ku soo galaa akoonkiisa u gaarka ah (bcrypt). Halkan ka maamul Maamulka, Macallimiinta, Machadka, Ardayda iyo Waalidiinta.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateAccount}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 min-h-[44px] text-xs font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                Abuur Akoon Cusub
              </button>
            </div>

            {/* Category Tabs + Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                {[
                  { id: 'all', label: `Dhammaan (${userAccounts.length})` },
                  {
                    id: 'admin',
                    label: `Maamulka (${userAccounts.filter((u) => ADMIN_STAFF_ROLES.includes(u.role)).length})`,
                  },
                  {
                    id: 'teacher',
                    label: `Macallimiinta (${userAccounts.filter((u) => u.role === 'Teacher').length})`,
                  },
                  {
                    id: 'institute',
                    label: `Machadka (${userAccounts.filter((u) => u.role === 'Institute').length})`,
                  },
                  {
                    id: 'portal',
                    label: `Arday & Waalid (${userAccounts.filter((u) => u.role === 'Student' || u.role === 'Parent').length})`,
                  },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setAccountCategory(cat.id as typeof accountCategory);
                      setAccountRoleFilter('all');
                    }}
                    className={`px-3 py-1.5 min-h-[36px] rounded-lg transition-colors ${
                      accountCategory === cat.id
                        ? 'bg-[#005A51] text-white shadow-2xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative flex-1 sm:w-52">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    placeholder="Raadi magac, username, ID..."
                    className="w-full pl-8 pr-2.5 py-1.5 min-h-[36px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>
                <select
                  value={accountRoleFilter}
                  onChange={(e) => setAccountRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 min-h-[36px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="all">Doorka: Dhammaan</option>
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <select
                  value={accountStatusFilter}
                  onChange={(e) => setAccountStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 min-h-[36px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="all">Xaaladda: Dhammaan</option>
                  <option value="Active">Active</option>
                  <option value="Deactivated">Deactivated</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>

            {!isSuperAdmin && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
                <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Xaddidaadda Maamulka: Super Admin oo keliya ayaa abuuraya, wax ka beddelaya, dib u dejinaya furaha, ama damin kara akoonnada <strong>Super Admin</strong>.
                </span>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="px-3 py-2.5">Magaca Buuxa & Xiriirka</th>
                    <th className="px-3 py-2.5">Username / Email</th>
                    <th className="px-3 py-2.5">Doorka (Role)</th>
                    <th className="px-3 py-2.5">Amniga (bcrypt) & Gelitaan</th>
                    <th className="px-3 py-2.5">Xaaladda</th>
                    <th className="px-3 py-2.5 text-right">Maamul & Ficil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUserAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Ma jiraan akoonno waafaqsan shaandhayntaada.
                      </td>
                    </tr>
                  ) : (
                    filteredUserAccounts.map((acc) => {
                      const isSelf = currentUser?.id === acc.id;
                      const isLockedSuperAdmin = acc.role === 'Super Admin' && !isSuperAdmin;
                      const linkedCount =
                        acc.role === 'Parent'
                          ? (acc.linkedStudentIds?.length || (acc.linkedStudentId ? 1 : 0))
                          : 0;
                      const isActive = acc.status === 'Active';

                      return (
                        <tr key={acc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                              <span>{acc.fullName}</span>
                              {isSelf && (
                                <span className="text-[9px] bg-teal-50 dark:bg-teal-950 text-[#005A51] dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded font-bold">
                                  Adiga
                                </span>
                              )}
                              {isLockedSuperAdmin && (
                                <span className="text-[9px] bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded font-bold inline-flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> Protected
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono-numbers text-slate-400">
                              <span>{acc.id}</span>
                              {acc.linkedTeacherId && (
                                <span className="text-teal-700 dark:text-teal-400 font-semibold">
                                  · {acc.linkedTeacherId}
                                </span>
                              )}
                              {acc.role === 'Student' && acc.linkedStudentId && (
                                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                  · {acc.linkedStudentId}
                                </span>
                              )}
                              {acc.role === 'Parent' && linkedCount > 0 && (
                                <span className="text-indigo-700 dark:text-indigo-300 font-semibold">
                                  · {linkedCount} Carruur ah
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-mono-numbers font-bold text-[#005A51] dark:text-teal-400 block">
                              {acc.username}
                            </span>
                            <span className="text-[11px] text-slate-400">{acc.email}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded font-semibold text-[11px] inline-block ${
                                acc.role === 'Super Admin'
                                  ? 'bg-[#005A51] text-white'
                                  : acc.role === 'Teacher'
                                  ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
                                  : acc.role === 'Institute'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {acc.role}
                            </span>
                            {Array.isArray(acc.permissions) && acc.permissions.length > 0 && (
                              <span className="block text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                                {acc.permissions.length} qaybood gaar ah
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold inline-block ${
                                acc.mustChangePassword
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              }`}
                            >
                              {acc.mustChangePassword ? 'Beddel Qasab ah (bcrypt)' : 'Protected (bcrypt)'}
                            </span>
                            {acc.lastLoginAt && (
                              <span className="block text-[10px] text-slate-400 font-mono-numbers mt-0.5">
                                Last: {acc.lastLoginAt.slice(0, 16).replace('T', ' ')}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                                isActive
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                  : acc.status === 'Deactivated'
                                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                                  : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                              }`}
                            >
                              {acc.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                disabled={isLockedSuperAdmin}
                                onClick={() => handleOpenResetPassword(acc)}
                                title="Dib u deji Furaha Sirta ah (Reset Password)"
                                className="p-2 min-w-[34px] min-h-[34px] flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isSelf || isLockedSuperAdmin}
                                onClick={() =>
                                  toggleUserAccountStatus(acc.id, isActive ? 'Deactivated' : 'Active')
                                }
                                title={isActive ? 'Dami Akoonka (Deactivate)' : 'Hawlgeli Akoonka (Activate)'}
                                className={`p-2 min-w-[34px] min-h-[34px] flex items-center justify-center rounded-md disabled:opacity-40 disabled:cursor-not-allowed ${
                                  isActive
                                    ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isLockedSuperAdmin}
                                onClick={() => handleOpenEditAccount(acc)}
                                title="Wax ka beddel akoonka"
                                className="p-2 min-w-[34px] min-h-[34px] flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {!isSelf && !isLockedSuperAdmin && (
                                confirmDeleteAccountId === acc.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        deleteUserAccount(acc.id);
                                        setConfirmDeleteAccountId(null);
                                      }}
                                      className="px-2 py-1 text-[10px] font-bold bg-red-600 text-white rounded"
                                    >
                                      Hubi
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteAccountId(null)}
                                      className="px-2 py-1 text-[10px] text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 rounded"
                                    >
                                      Maya
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteAccountId(acc.id)}
                                    title="Tirtir akoonka"
                                    className="p-2 min-w-[34px] min-h-[34px] flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md"
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
                  )}
                </tbody>
              </table>
            </div>

            {/* Role Summary Footer Cards (No Passwords or Sample Usernames Shown) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px]">
              <div className="p-3 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
                <span className="font-bold text-[#005A51] dark:text-teal-300 flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Macallimiinta ({teachers.length})
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Macallin kasta wuxuu leeyahay akoon u gaar ah oo laga maamulo halkan.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-1">
                  <Key className="w-3.5 h-3.5" /> Ardayda ({students.length})
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Akoon gaar ah oo leh eegis keliya (View Only) xogtooda waxbarasho.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 mb-1">
                  <Users className="w-3.5 h-3.5" /> Waalidiinta ({userAccounts.filter((u) => u.role === 'Parent').length})
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Waxaa lagu xiri karaa hal arday ama carruur badan oo isku qoys ah.
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mb-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Machadka (Institute)
                </span>
                <p className="text-slate-600 dark:text-slate-400">
                  Akoonka kormeerka machadka — akhriska guud ee waxbarashada iyo warbixinnada.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROLE-BASED ACCESS CONTROL (RBAC) */}
      {activeTab === 'rbac' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#005A51] dark:text-teal-400" />
                Shaxda Oggolaanshaha 10-ka Door (Role-Based Access Control Matrix)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Nidaamku wuxuu ku shaqeeyaa 10 door oo kala soocan. Rukhsadaha halkan ka muuqda waxaa si dhab ah looga xakameeyaa backend-ka.
              </p>
            </div>
            {isSuperAdmin ? (
              <button
                type="button"
                disabled={isSavingPolicies}
                onClick={handleSaveRbacPolicies}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] text-xs font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs disabled:opacity-60 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                {isSavingPolicies ? 'Waa la keydinayaa...' : 'Keydi Rukhsadaha RBAC'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300 shrink-0">
                <Lock className="w-3.5 h-3.5" />
                Eegis Keliya — Super Admin oo keliya ayaa beddeli kara RBAC
              </span>
            )}
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold">
                  <th className="p-2.5 sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 min-w-[165px]">
                    Doorka (Role)
                  </th>
                  {ALL_MODULE_META.map((m) => (
                    <th key={m.id} className="p-2 text-center whitespace-nowrap">
                      {m.label}
                    </th>
                  ))}
                  <th className="p-2.5 min-w-[240px]">Awoodaha Ficilka (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {draftPolicies.map((policy) => {
                  const lockedRow = !isSuperAdmin || policy.role === 'Super Admin';
                  return (
                    <tr key={policy.role} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{policy.role}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[160px]" title={policy.description}>
                          {ROLE_LABELS_SOMALI[policy.role]}
                        </div>
                      </td>
                      {ALL_MODULE_META.map((mod) => {
                        const checked = policy.role === 'Super Admin' || policy.modules.includes(mod.id);
                        return (
                          <td key={mod.id} className="p-1.5 text-center">
                            <button
                              type="button"
                              disabled={lockedRow}
                              onClick={() => togglePolicyModule(policy.role, mod.id)}
                              aria-label={`${policy.role} ${mod.label}`}
                              className={`w-6 h-6 rounded-md inline-flex items-center justify-center border transition-colors ${
                                checked
                                  ? 'bg-[#005A51] border-[#005A51] text-white'
                                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-transparent'
                              } ${lockedRow ? 'opacity-75 cursor-not-allowed' : 'hover:border-[#FCA700]'}`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        );
                      })}
                      <td className="p-2">
                        <div className="flex flex-wrap gap-1">
                          {RBAC_ACTIONS.map((act) => {
                            const hasAction = policy.actions.includes(act.id);
                            return (
                              <button
                                key={act.id}
                                type="button"
                                disabled={lockedRow}
                                onClick={() => togglePolicyAction(policy.role, act.id)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                                  hasAction
                                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                } ${lockedRow ? 'opacity-70 cursor-not-allowed' : 'hover:border-[#005A51]'}`}
                              >
                                {act.label}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL LOGS & LOGIN ACTIVITY */}
      {activeTab === 'audit' && (() => {
        const sourceLogs = auditFilter === 'login' && loginActivityLogs !== null ? loginActivityLogs : auditLogs;
        const uniqueActions = Array.from(new Set(auditLogs.map((l) => l.action))).sort();
        const uniqueModules = Array.from(new Set(auditLogs.map((l) => l.module))).sort();

        const filteredAuditLogs = sourceLogs.filter((log) => {
          const isStudentLog = log.role === 'Student' || log.module === 'Student Portal' || Boolean(log.studentId);
          if (auditFilter === 'students' && !isStudentLog) return false;
          if (auditFilter === 'staff' && isStudentLog) return false;
          if (auditStudentId !== 'all' && log.studentId !== auditStudentId) return false;
          if (auditAction !== 'all' && log.action !== auditAction) return false;
          if (auditModule !== 'all' && log.module !== auditModule) return false;
          if (auditStatus !== 'all' && (log.status || 'Success') !== auditStatus) return false;
          if (auditDateFrom && log.timestamp.slice(0, 10) < auditDateFrom) return false;
          if (auditDateTo && log.timestamp.slice(0, 10) > auditDateTo) return false;
          if (auditSearch.trim()) {
            const q = auditSearch.toLowerCase();
            return (
              log.user.toLowerCase().includes(q) ||
              (log.username || '').toLowerCase().includes(q) ||
              (log.studentId || '').toLowerCase().includes(q) ||
              log.details.toLowerCase().includes(q) ||
              log.module.toLowerCase().includes(q) ||
              log.action.toLowerCase().includes(q)
            );
          }
          return true;
        });

        const studentLogCount = auditLogs.filter(
          (l) => l.role === 'Student' || l.module === 'Student Portal' || Boolean(l.studentId)
        ).length;

        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 space-y-3 text-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">
                    Diiwaanka Dhaqdhaqaaqa & Gelitaanka (Immutable Audit Trail & Login Activity)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Kormeer wax kasta oo isticmaalayaashu ka sameeyaan nidaamka ({filteredAuditLogs.length} Diiwaan). Lama tirtiri karo lamana beddeli karo.
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAuditFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                      auditFilter === 'all'
                        ? 'bg-[#005A51] text-white'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Dhammaan ({auditLogs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('login')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                      auditFilter === 'login'
                        ? 'bg-[#005A51] text-white ring-2 ring-[#FCA700]/60'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Gelitaanka (Login Activity)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('students')}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                      auditFilter === 'students'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Dhaqdhaqaaqa Ardayda ({studentLogCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuditFilter('staff')}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                      auditFilter === 'staff'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Maamulka & Shaqaalaha
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRefreshingAudit(true);
                      if (auditFilter === 'login') {
                        fetchLoginActivity().then(setLoginActivityLogs).finally(() => setIsRefreshingAudit(false));
                      } else {
                        fetchAuditLogs().finally(() => setIsRefreshingAudit(false));
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAudit ? 'animate-spin' : ''}`} />
                    Cusboonaysii
                  </button>
                </div>
              </div>

              {/* Granular Admin Filters: Student, Activity, Module, Status, Date Range, Search */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700">
                <select
                  value={auditStudentId}
                  onChange={(e) => setAuditStudentId(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="all">Arday: Dhammaan</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.id} · {s.fullName}
                    </option>
                  ))}
                </select>

                <select
                  value={auditAction}
                  onChange={(e) => setAuditAction(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="all">Falka: Dhammaan</option>
                  {uniqueActions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>

                <select
                  value={auditModule}
                  onChange={(e) => setAuditModule(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="all">Qaybta: Dhammaan</option>
                  {uniqueModules.map((mod) => (
                    <option key={mod} value={mod}>
                      {mod}
                    </option>
                  ))}
                </select>

                <select
                  value={auditStatus}
                  onChange={(e) => setAuditStatus(e.target.value)}
                  className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                >
                  <option value="all">Xaaladda: Dhammaan</option>
                  <option value="Success">Success (Guul)</option>
                  <option value="Failure">Failure (Fashil / Diidmo)</option>
                </select>

                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={auditDateFrom}
                    onChange={(e) => setAuditDateFrom(e.target.value)}
                    title="Laga bilaabo taariikhda"
                    className="w-1/2 px-1.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                  <input
                    type="date"
                    value={auditDateTo}
                    onChange={(e) => setAuditDateTo(e.target.value)}
                    title="Ilaa taariikhda"
                    className="w-1/2 px-1.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                  />
                </div>

                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Raadi ID, username, fal..."
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-hidden focus:ring-1 focus:ring-[#005A51]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="px-4 py-2.5">Waqtiga</th>
                    <th className="px-3 py-2.5">Falka & Xaaladda</th>
                    <th className="px-3 py-2.5">Qaybta (Module)</th>
                    <th className="px-3 py-2.5">Isticmaalaha / Student ID</th>
                    <th className="px-4 py-2.5">Faahfaahinta (Details)</th>
                    <th className="px-3 py-2.5 font-mono">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredAuditLogs.length > 0 ? (
                    filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 font-mono text-[11px]">
                        <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              log.action === 'CREATE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : log.action === 'UPDATE'
                                ? 'bg-blue-100 text-blue-800'
                                : log.action === 'DELETE' || log.action === 'UNAUTHORIZED_ACCESS' || log.action === 'LOGIN_FAILED'
                                ? 'bg-red-100 text-red-800'
                                : log.action === 'PAYMENT'
                                ? 'bg-amber-100 text-amber-800'
                                : log.action === 'VIEW'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.action}
                          </span>
                          <span
                            className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              log.status === 'Failure'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {log.status || 'Success'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-200 font-medium font-sans">
                          {log.module}
                          {log.resource && (
                            <span className="block text-[10px] font-mono text-slate-400">{log.resource}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-sans">
                          <div>{log.user}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {log.role}
                            </span>
                            {log.studentId && (
                              <span className="text-[10px] font-mono font-bold text-[#005A51]">
                                {log.studentId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-slate-800 dark:text-slate-200 font-sans">{log.details}</td>
                        <td className="px-3 py-2 text-slate-400">{log.ipAddress}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400 font-sans">
                        Wax dhaqdhaqaaq ah lagama helin shaandhayntan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Create / Edit Account Modal */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {editingAccount ? `Wax Ka Beddel Akoonka (${editingAccount.username})` : 'Abuur Akoon Isticmaale Cusub'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAccountModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Magaca Buuxa: *</label>
                <input
                  type="text"
                  required
                  value={accountForm.fullName}
                  onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                  placeholder="tusaale: Xasan Maxamed Cali"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Username: *</label>
                  <input
                    type="text"
                    required
                    value={accountForm.username}
                    onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                    placeholder="xasan.tch"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Furaha Sirta ah {editingAccount ? '(Ikhtiyaari)' : '*'}:
                  </label>
                  <input
                    type="password"
                    required={!editingAccount}
                    minLength={editingAccount ? undefined : 4}
                    value={accountForm.password}
                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                    placeholder={editingAccount ? 'Bannee si uusan isbeddelin' : 'Ugu yaraan 4 xaraf'}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Emailka:</label>
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  placeholder="magaca@machadkakhadiija.edu.so"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Doorka (Role): *</label>
                  <select
                    value={accountForm.role}
                    onChange={(e) => setAccountForm({ ...accountForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {ALL_ROLES.filter((r) => isSuperAdmin || r !== 'Super Admin').map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS_SOMALI[r]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">Xaaladda:</label>
                  <select
                    value={accountForm.status}
                    onChange={(e) =>
                      setAccountForm({
                        ...accountForm,
                        status: e.target.value as 'Active' | 'Deactivated' | 'Suspended',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-900 dark:text-slate-100"
                  >
                    <option value="Active">Active (Firfircoon)</option>
                    <option value="Deactivated">Deactivated (La Damiyay)</option>
                    <option value="Suspended">Suspended (La Hakiyay)</option>
                  </select>
                </div>
              </div>

              {accountForm.role === 'Teacher' && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Ku Xir Macallinka (Linked Teacher):
                  </label>
                  <select
                    value={accountForm.linkedTeacherId}
                    onChange={(e) => setAccountForm({ ...accountForm, linkedTeacherId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="">— Dooro Macallinka —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {accountForm.role === 'Student' && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Ku Xir Ardayga (Linked Student):
                  </label>
                  <select
                    value={accountForm.linkedStudentId}
                    onChange={(e) => setAccountForm({ ...accountForm, linkedStudentId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="">— Dooro Ardayga —</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {accountForm.role === 'Parent' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-slate-600 dark:text-slate-400 font-medium">
                      Carruurta ku xiran Waalidka ({accountForm.linkedStudentIds.length} la doortay):
                    </label>
                    <input
                      type="text"
                      value={parentChildSearch}
                      onChange={(e) => setParentChildSearch(e.target.value)}
                      placeholder="Raadi arday..."
                      className="px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-1 bg-slate-50/70 dark:bg-slate-800/50">
                    {students
                      .filter((s) => {
                        if (!parentChildSearch.trim()) return true;
                        const q = parentChildSearch.toLowerCase();
                        return (
                          s.fullName.toLowerCase().includes(q) ||
                          s.id.toLowerCase().includes(q) ||
                          s.rollNumber.toLowerCase().includes(q)
                        );
                      })
                      .slice(0, 60)
                      .map((s) => {
                        const checked = accountForm.linkedStudentIds.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? accountForm.linkedStudentIds.filter((id) => id !== s.id)
                                  : [...accountForm.linkedStudentIds, s.id];
                                setAccountForm({
                                  ...accountForm,
                                  linkedStudentIds: next,
                                  linkedStudentId: next[0] || '',
                                });
                              }}
                              className="rounded border-slate-300 text-[#005A51] focus:ring-[#005A51]"
                            />
                            <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                              {s.fullName}
                            </span>
                            <span className="ml-auto text-[10px] font-mono-numbers text-slate-400">
                              {s.rollNumber}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {isSuperAdmin && accountForm.role !== 'Super Admin' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 dark:text-slate-300 font-semibold">
                      Rukhsado Gaar ah (Super Admin Override - Ikhtiyaari):
                    </label>
                    {accountForm.permissions.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAccountForm({ ...accountForm, permissions: [] })}
                        className="text-[10px] text-rose-600 hover:underline"
                      >
                        Nadiifi (Isticmaal doorka caadiga ah)
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 max-h-36 overflow-y-auto">
                    {ALL_MODULE_META.map((mod) => {
                      const active = accountForm.permissions.includes(mod.id);
                      return (
                        <label key={mod.id} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => {
                              const next = active
                                ? accountForm.permissions.filter((m) => m !== mod.id)
                                : [...accountForm.permissions, mod.id];
                              setAccountForm({ ...accountForm, permissions: next });
                            }}
                            className="rounded border-slate-300 text-[#005A51]"
                          />
                          <span className="truncate text-slate-700 dark:text-slate-300">{mod.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-3.5 py-2 min-h-[40px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 min-h-[40px] font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  {editingAccount ? 'Keydi Isbeddelka' : 'Abuur Akoonka'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal (All Eligible Roles) */}
      {resetPasswordTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                <Key className="w-4 h-4 text-[#FCA700]" />
                Dib u Deji Furaha Sirta ah
              </h3>
              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-slate-100">{resetPasswordTarget.fullName}</div>
              <div className="text-[11px] font-mono-numbers text-[#005A51] dark:text-teal-400">
                {resetPasswordTarget.username} · {resetPasswordTarget.role}
              </div>
            </div>

            <form onSubmit={handleConfirmResetPassword} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Furaha Cusub (New Password): *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  placeholder="Ugu yaraan 4 xaraf"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-900 dark:text-slate-100"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={resetForceChange}
                  onChange={(e) => setResetForceChange(e.target.checked)}
                  className="rounded border-slate-300 text-[#005A51]"
                />
                <span>Ku qasab isticmaalaha inuu beddelo furaha marka uu soo galo</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResetPasswordTarget(null)}
                  className="px-3.5 py-2 min-h-[40px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  disabled={isSavingReset}
                  className="px-4 py-2 min-h-[40px] font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs disabled:opacity-60"
                >
                  {isSavingReset ? 'Waa la keydinayaa...' : 'Keydi Furaha Cusub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
