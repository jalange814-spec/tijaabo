/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { ROLE_LABELS_SOMALI } from '../../utils/rbac';
import {
  KeyRound,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  GraduationCap,
  AlertCircle,
  Phone,
  MapPin,
  Briefcase,
  Shield,
  Info,
} from 'lucide-react';

interface PortalLoginModuleProps {
  onSuccess?: () => void;
  isModal?: boolean;
}

const STAFF_ROLES: UserRole[] = [
  'Super Admin',
  'Administrator',
  'Academic Manager',
  'Accountant',
  'Teacher',
  'HR Manager',
  'Receptionist',
  'Institute',
];

export const PortalLoginModule: React.FC<PortalLoginModuleProps> = ({ onSuccess, isModal = false }) => {
  const {
    settings,
    currentUser,
    loginTargetRole,
    setLoginTargetRole,
    authenticateUser,
  } = useApp();

  const isStudentOrParentRole = (role: UserRole | null) => role === 'Student' || role === 'Parent';

  const [portalType, setPortalType] = useState<'student' | 'staff'>(() =>
    loginTargetRole && !isStudentOrParentRole(loginTargetRole) ? 'staff' : 'student'
  );
  const [studentOrParentMode, setStudentOrParentMode] = useState<'Student' | 'Parent'>(() =>
    loginTargetRole === 'Parent' ? 'Parent' : 'Student'
  );

  // Student / Parent Form
  const [studentIdentifier, setStudentIdentifier] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staff / Teacher / Admin Form
  const [staffIdentifier, setStaffIdentifier] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [selectedStaffTargetRole, setSelectedStaffTargetRole] = useState<UserRole | ''>(() =>
    loginTargetRole && !isStudentOrParentRole(loginTargetRole) ? loginTargetRole : ''
  );

  const clearAllCredentials = () => {
    setStudentIdentifier('');
    setStudentPassword('');
    setStaffIdentifier('');
    setStaffPassword('');
    setStudentError(null);
    setStaffError(null);
    setShowStudentPassword(false);
    setShowStaffPassword(false);
    try {
      localStorage.removeItem('machadka_sms_2026_auth_token');
      sessionStorage.removeItem('machadka_sms_2026_auth_token');
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    setStudentIdentifier('');
    setStudentPassword('');
    setStaffIdentifier('');
    setStaffPassword('');
  }, []);

  useEffect(() => {
    if (!loginTargetRole) return;
    if (isStudentOrParentRole(loginTargetRole)) {
      setPortalType('student');
      setStudentOrParentMode(loginTargetRole === 'Parent' ? 'Parent' : 'Student');
      setStudentError(null);
    } else {
      setPortalType('staff');
      setSelectedStaffTargetRole(loginTargetRole);
      setStaffError(null);
    }
  }, [loginTargetRole]);

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError(null);
    setIsSubmitting(true);

    const expected = loginTargetRole || undefined;
    const res = await authenticateUser(studentIdentifier, studentPassword, expected);
    setIsSubmitting(false);
    if (!res.success) {
      setStudentError(res.message);
    } else {
      clearAllCredentials();
      if (onSuccess) onSuccess();
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);
    setIsSubmitting(true);

    const expected = selectedStaffTargetRole ? selectedStaffTargetRole : undefined;
    const res = await authenticateUser(staffIdentifier, staffPassword, expected);
    setIsSubmitting(false);
    if (!res.success) {
      setStaffError(res.message);
    } else {
      clearAllCredentials();
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className={`w-full ${isModal ? '' : 'max-w-2xl mx-auto py-4 md:py-8 px-3 sm:px-4'}`}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden transition-all">
        {/* Institutional Header Banner */}
        <div className="bg-gradient-to-r from-[#005A51] via-[#007A6E] to-[#005A51] text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/5 pointer-events-none blur-2xl"></div>
          <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-amber-400/10 pointer-events-none blur-2xl"></div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5">
            <img
              src={settings.logoUrl}
              alt="Machadka Khadiija Bintu Khuwaylid"
              referrerPolicy="no-referrer"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-full border-2 border-amber-300 dark:border-amber-400 shadow-lg bg-white shrink-0 p-1"
            />
            <div className="flex-1 space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-teal-950/60 border border-teal-400/30 text-amber-300 text-[11px] font-semibold tracking-wide uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Nidaamka Rasmiga ah ee Dugsiga (Official SMS Portal)</span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                {settings.institutionName}
              </h1>
              <p className="text-xs font-arabic text-amber-200 font-medium">
                {settings.arabicName} ({settings.academicYear})
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-teal-100 font-mono-numbers pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-300" />
                  Qardho, Karkaar, Puntland
                </span>
                <span>·</span>
                <span className="bg-white/10 px-2 py-0.5 rounded">Sanad-dugsiyeedka: {settings.academicYear}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Target Role or Active User Notice Banner */}
        {(loginTargetRole || currentUser) && (
          <div className="px-6 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/70 flex flex-wrap items-center justify-between gap-2 text-xs">
            {loginTargetRole ? (
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Waxaad dooratay inaad gasho doorka: <strong>{ROLE_LABELS_SOMALI[loginTargetRole]}</strong>. Fadlan geli aqoonsiga akoonkaaga si aad u furto.
                </span>
              </div>
            ) : currentUser ? (
              <div className="flex items-center gap-2 text-teal-900 dark:text-teal-200 font-medium">
                <Info className="w-4 h-4 text-[#005A51] dark:text-teal-400 shrink-0" />
                <span>
                  Hadda waxaad ku jirtaa akoonka: <strong>{currentUser.fullName}</strong> ({currentUser.role}). Geli akoon kale haddii aad rabto inaad beddesho.
                </span>
              </div>
            ) : null}

            {loginTargetRole && (
              <button
                type="button"
                onClick={() => {
                  setLoginTargetRole(null);
                  setSelectedStaffTargetRole('');
                }}
                className="text-[11px] font-bold text-amber-800 dark:text-amber-300 underline"
              >
                Dooro door kasta
              </button>
            )}
          </div>
        )}

        {/* Role Selector Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={() => {
              setPortalType('student');
              clearAllCredentials();
            }}
            className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
              portalType === 'student'
                ? 'border-[#005A51] text-[#005A51] dark:text-teal-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Ardayda & Waalidka (Student & Parent)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPortalType('staff');
              clearAllCredentials();
            }}
            className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2 ${
              portalType === 'staff'
                ? 'border-[#005A51] text-[#005A51] dark:text-teal-400 bg-white dark:bg-slate-900 shadow-2xs'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Maamulka & Macallimiinta (Staff & Admin)</span>
          </button>
        </div>

        {/* Content Body (Secure Login Form Only — Demo/1-Click Account Switcher Removed to Protect User Data) */}
        <div className="p-6 sm:p-7 space-y-6">
          {/* TAB 1: STUDENT & PARENT LOGIN */}
          {portalType === 'student' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-amber-500" />
                    <span>
                      {studentOrParentMode === 'Parent'
                        ? 'Gelitaanka Waalidka (Parent Portal)'
                        : 'Gelitaanka Ardayga (Student Portal)'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {studentOrParentMode === 'Parent'
                      ? 'Geli aqoonsiga waalidka ama lambarka taleefanka iyo furahaaga sirta ah.'
                      : 'Geli Aqoonsigaaga Ardayga (ID / Username) iyo Furaha sirta ah ee akoonkaaga.'}
                  </p>
                </div>

                {/* Student vs Parent Switch */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setStudentOrParentMode('Student');
                      setStudentError(null);
                    }}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      studentOrParentMode === 'Student'
                        ? 'bg-[#005A51] text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Arday (Student)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStudentOrParentMode('Parent');
                      setStudentError(null);
                    }}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      studentOrParentMode === 'Parent'
                        ? 'bg-[#005A51] text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Waalid (Parent)
                  </button>
                </div>
              </div>

              {studentError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <div className="flex-1 font-medium">{studentError}</div>
                </div>
              )}

              <form onSubmit={handleStudentSubmit} autoComplete="off" className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    {studentOrParentMode === 'Parent'
                      ? 'Aqoonsiga Waalidka ama Taleefanka'
                      : 'Aqoonsiga (Username / Student ID / Roll)'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="portal_login_identifier"
                      autoComplete="off"
                      readOnly
                      onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                      onPointerDown={(e) => e.currentTarget.removeAttribute('readonly')}
                      required
                      value={studentIdentifier}
                      onChange={(e) => {
                        setStudentIdentifier(e.target.value);
                        if (studentError) setStudentError(null);
                      }}
                      placeholder={
                        studentOrParentMode === 'Parent'
                          ? 'Geli aqoonsiga waalidka ama taleefanka'
                          : 'Geli Username-kaaga ama ID-gaaga'
                      }
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005A51] dark:focus:ring-teal-400 font-mono-numbers"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Furaha Sirta ah (Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showStudentPassword ? 'text' : 'password'}
                      name="portal_login_secret"
                      autoComplete="new-password"
                      readOnly
                      onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                      onPointerDown={(e) => e.currentTarget.removeAttribute('readonly')}
                      required
                      value={studentPassword}
                      onChange={(e) => {
                        setStudentPassword(e.target.value);
                        if (studentError) setStudentError(null);
                      }}
                      placeholder="Geli furaha sirta ah"
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005A51] dark:focus:ring-teal-400 font-mono-numbers"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentPassword(!showStudentPassword)}
                      title={showStudentPassword ? 'Qari furaha' : 'Muuji furaha (Show password)'}
                      aria-label={showStudentPassword ? 'Qari furaha' : 'Muuji furaha (Show password)'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                    >
                      {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-slate-300 text-[#005A51] focus:ring-[#005A51]"
                    />
                    <span>I xusuuso (Remember device)</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowForgotHelp((v) => !v)}
                    className="text-[#005A51] dark:text-teal-400 hover:underline font-semibold"
                  >
                    Ma ilowday furahaaga?
                  </button>
                </div>

                {showForgotHelp && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#005A51] dark:text-teal-400 shrink-0" />
                    <span>
                      Haddii aad ilowday furaha sirta ah, fadlan la xiriir xafiiska diiwaangelinta ee Machadka ({settings.phone}).
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearAllCredentials}
                    className="px-4 py-3 min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs sm:text-sm transition-colors shrink-0"
                  >
                    Nadiifi (Clear)
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 min-h-[44px] bg-[#005A51] hover:bg-[#004841] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-75"
                  >
                    <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    <span>
                      {studentOrParentMode === 'Parent'
                        ? 'Gal Bogga Waalidka (Parent Login)'
                        : 'Gal Akoonkaaga (Sign In)'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: STAFF, TEACHER & ADMIN LOGIN */}
          {portalType === 'staff' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-[#005A51] dark:text-teal-400" />
                  <span>Gelitaanka Shaqaalaha, Macallimiinta & Maamulka</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Qof kasta wuxuu geli karaa akoonkiisa gaarka ah oo kaliya isagoo isticmaalaya Username/Email iyo Password-kiisa si xogta dugsiga loo ilaaliyo.
                </p>
              </div>

              {staffError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                  <div className="flex-1 font-medium">{staffError}</div>
                </div>
              )}

              <form onSubmit={handleStaffSubmit} autoComplete="off" className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Doorka Akoonka (Account Role Filter)
                  </label>
                  <select
                    value={selectedStaffTargetRole}
                    onChange={(e) => setSelectedStaffTargetRole(e.target.value as UserRole | '')}
                    className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-semibold"
                  >
                    <option value="">Toos u aqoonso doorka akoonkayga (Auto-detect)</option>
                    {STAFF_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS_SOMALI[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Username, Email ama ID-ga Shaqaalaha
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="staff_login_identifier"
                      autoComplete="off"
                      readOnly
                      onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                      onPointerDown={(e) => e.currentTarget.removeAttribute('readonly')}
                      required
                      value={staffIdentifier}
                      onChange={(e) => {
                        setStaffIdentifier(e.target.value);
                        if (staffError) setStaffError(null);
                      }}
                      placeholder="Geli Username, Email, ama ID-gaaga"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005A51]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Furaha Sirta ah (Password)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showStaffPassword ? 'text' : 'password'}
                      name="staff_login_secret"
                      autoComplete="new-password"
                      readOnly
                      onFocus={(e) => e.currentTarget.removeAttribute('readonly')}
                      onPointerDown={(e) => e.currentTarget.removeAttribute('readonly')}
                      required
                      value={staffPassword}
                      onChange={(e) => {
                        setStaffPassword(e.target.value);
                        if (staffError) setStaffError(null);
                      }}
                      placeholder="Geli furaha sirta ah"
                      className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#005A51]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowStaffPassword(!showStaffPassword)}
                      title={showStaffPassword ? 'Qari furaha' : 'Muuji furaha (Show password)'}
                      aria-label={showStaffPassword ? 'Qari furaha' : 'Muuji furaha (Show password)'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
                    >
                      {showStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearAllCredentials}
                    className="px-4 py-3 min-h-[44px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs sm:text-sm transition-colors shrink-0"
                  >
                    Nadiifi (Clear)
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 min-h-[44px] bg-[#005A51] hover:bg-[#004841] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-75"
                  >
                    <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    <span>Gal Akoonkaaga (Sign In)</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Institutional Trust Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#005A51] dark:text-teal-400" />
            <span>Amniga Xogta: Akoon kasta wuxuu ku xiran yahay fure sir ah</span>
          </div>
          <div className="font-mono-numbers text-[11px]">
            {settings.institutionName} · {settings.academicYear}
          </div>
        </div>
      </div>
    </div>
  );
};
