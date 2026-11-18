/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  useApp,
  calculateSixYearExpiry,
  calculateStudentExperience,
  generateMachadStudentUsername,
} from '../../context/AppContext';
import { PortalLoginModule } from './PortalLoginModule';
import {
  Key,
  Award,
  CalendarCheck,
  CreditCard,
  Copy,
  Check,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Eye,
  Lock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bell,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

type PortalTab =
  | 'overview'
  | 'exams'
  | 'attendance'
  | 'fees'
  | 'announcements'
  | 'timetable'
  | 'security';

export const StudentPortalModule: React.FC = () => {
  const {
    students,
    classes,
    subjects,
    marks,
    exams,
    attendance,
    invoices,
    payments,
    announcements,
    markAnnouncementRead,
    timetable,
    settings,
    currentRole,
    currentUser,
    activeStudentPortalId,
    setActiveStudentPortalId,
    authenticatedStudentId,
    logoutAccount,
    changeStudentPassword,
    logStudentActivity,
    fetchStudentPortalSection,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const isAdminRole =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager';
  const [adminBypassLogin, setAdminBypassLogin] = useState(isAdminRole);
  const isStudentOrParent = currentRole === 'Student' || currentRole === 'Parent';

  const parentChildIds =
    currentRole === 'Parent'
      ? currentUser?.linkedStudentIds && currentUser.linkedStudentIds.length > 0
        ? currentUser.linkedStudentIds
        : currentUser?.linkedStudentId
        ? [currentUser.linkedStudentId]
        : []
      : [];

  const isAuthorized = isStudentOrParent
    ? Boolean(currentUser?.linkedStudentId || authenticatedStudentId || parentChildIds.length > 0)
    : adminBypassLogin;

  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [copied, setCopied] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  // Change password form states
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchedInitialRef = useRef<string | null>(null);

  useEffect(() => {
    if (navigationIntent?.module !== 'student_portal') return;
    const t = navigationIntent.tab as PortalTab | undefined;
    if (t && ['overview', 'exams', 'attendance', 'fees', 'announcements', 'timetable', 'security'].includes(t)) {
      if (t === 'security' && currentRole !== 'Student') {
        setActiveTab('overview');
      } else {
        setActiveTab(t);
      }
    }
    clearNavigationIntent();
  }, [navigationIntent, currentRole, clearNavigationIntent]);

  // Determine strictly scoped student(s)
  const parentChildren = students.filter((s) => parentChildIds.includes(s.id));

  let currentStudent = undefined;
  if (currentRole === 'Student') {
    const myId = currentUser?.linkedStudentId || authenticatedStudentId;
    currentStudent = students.find((s) => s.id === myId);
  } else if (currentRole === 'Parent') {
    const selectedChildId =
      activeStudentPortalId && parentChildIds.includes(activeStudentPortalId)
        ? activeStudentPortalId
        : parentChildIds[0];
    currentStudent = students.find((s) => s.id === selectedChildId) || parentChildren[0];
  } else {
    const adminTargetId = activeStudentPortalId || authenticatedStudentId || students[0]?.id;
    currentStudent = students.find((s) => s.id === adminTargetId) || students[0];
  }

  const mustForcePasswordChange =
    currentRole === 'Student' &&
    Boolean(currentUser?.mustChangePassword || currentStudent?.mustChangePassword);

  useEffect(() => {
    if (isAuthorized && currentStudent && !mustForcePasswordChange) {
      if (fetchedInitialRef.current !== currentStudent.id) {
        fetchedInitialRef.current = currentStudent.id;
        if (isStudentOrParent) {
          fetchStudentPortalSection(currentStudent.id, 'id-card');
          fetchStudentPortalSection(currentStudent.id, 'overview');
        }
      }
    }
  }, [isAuthorized, isStudentOrParent, currentStudent?.id, mustForcePasswordChange, fetchStudentPortalSection]);

  // If not authorized, display Portal Login screen
  if (!isAuthorized) {
    return (
      <div className="space-y-4">
        {isAdminRole && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Ogeysiis Maamulka:</strong> Waxaad ku jirtaa doorka <em>{currentRole}</em>. Waxaad toos u kormeeri kartaa barta ardayda ama waxaad tijaabin kartaa gelitaanka.
              </span>
            </div>
            <button
              onClick={() => setAdminBypassLogin(true)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors whitespace-nowrap shadow-2xs cursor-pointer"
            >
              Kormeer sida Maamule (Admin Preview)
            </button>
          </div>
        )}

        <PortalLoginModule />
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        Ma jiro arday ku xiran akoonkan.
      </div>
    );
  }

  const studentUsername =
    currentStudent.portalUsername || generateMachadStudentUsername(currentStudent.id);
  const experience = calculateStudentExperience(currentStudent.admissionDate);
  const idIssueDate = currentStudent.idCardIssueDate || currentStudent.admissionDate;
  const idExpiryDate = currentStudent.idCardExpiryDate || calculateSixYearExpiry(idIssueDate);
  const isIdCardRevoked = currentStudent.idCardStatus === 'Deleted';

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setPasswordFeedback({
        type: 'error',
        text: 'Furaha cusub iyo ku celintiisu isma laha.',
      });
      return;
    }

    setIsUpdatingPass(true);
    const res = await changeStudentPassword(
      currentStudent.id,
      currentPasswordInput,
      newPasswordInput
    );
    setIsUpdatingPass(false);
    if (res.success) {
      setPasswordFeedback({ type: 'success', text: res.message });
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } else {
      setPasswordFeedback({ type: 'error', text: res.message });
    }
  };

  // MANDATORY FIRST-LOGIN PASSWORD CHANGE GATE
  if (mustForcePasswordChange) {
    return (
      <div className="max-w-lg mx-auto my-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-amber-400 dark:border-amber-600 shadow-xl overflow-hidden text-xs">
        <div className="bg-gradient-to-r from-[#005A51] to-[#007A6E] text-white p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold">
                Beddel Furaha Sirta ah (First Login Security)
              </h2>
              <p className="text-[11px] text-teal-100">
                Akoonka: <strong className="font-mono">{studentUsername}</strong> ({currentStudent.id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => logoutAccount()}
            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            Ka Bax
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong>Ogeysiis Amni:</strong> Kani waa gelitaankaagii ugu horreeyay (ama dib-u-dejin maamul). Si aad u gasho bartaada ardayga ee rasmiga ah, fadlan beddel furahaaga bilowga ah oo dooro fure adiga kuu gaar ah.
          </div>

          {passwordFeedback && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 font-semibold ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {passwordFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passwordFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                Furaha Hadda Jira (Current Password): *
              </label>
              <input
                type="password"
                required
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                placeholder="Geli furahaaga hadda jira"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                Furaha Cusub ee Gaarka ah (New Password): *
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Dooro fure cusub (ugu yaraan 4 xaraf/tiro)"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                Ku Celi Furaha Cusub (Confirm Password): *
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="Mar kale qor furaha cusub"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={isUpdatingPass}
              className="w-full py-2.5 bg-[#005A51] hover:bg-[#004841] text-white font-bold rounded-lg shadow-xs transition-colors disabled:opacity-70"
            >
              {isUpdatingPass ? 'Waa la keydinayaa...' : 'Keydi Furaha Cusub & Fur Portal-ka'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const publishedExamIds = new Set(exams.filter((e) => e.status === 'Published').map((e) => e.id));
  const studentClass = classes.find((c) => c.id === currentStudent.classId);
  const studentMarks = marks.filter(
    (m) => m.studentId === currentStudent.id && (isAdminRole || publishedExamIds.has(m.examId))
  );
  const studentAttendance = attendance.filter((a) => a.studentId === currentStudent.id);
  const studentInvoices = invoices.filter((i) => i.studentId === currentStudent.id);
  const studentPayments = payments.filter((p) => p.studentId === currentStudent.id);
  const studentTimetable = timetable.filter((t) => t.classId === currentStudent.classId);
  const studentAnnouncements = announcements.filter((a) => {
    if (currentRole === 'Parent') {
      return a.targetAudience === 'All' || a.targetAudience === 'Parents' || a.targetAudience === 'Students';
    }
    return a.targetAudience === 'All' || a.targetAudience === 'Students';
  });

  // Stats
  const totalScore = studentMarks.reduce((sum, m) => sum + m.marksObtained, 0);
  const totalMax = studentMarks.reduce((sum, m) => sum + m.maxMarks, 0);
  const avgPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  const totalAtt = studentAttendance.length;
  const presentAtt = studentAttendance.filter((a) => a.status === 'Present').length;
  const attRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 0;

  const totalFeesDue = studentInvoices.reduce((sum, i) => sum + i.balance, 0);

  const handleTabChange = (tab: PortalTab) => {
    setActiveTab(tab);
    setPasswordFeedback(null);
    if (isStudentOrParent && currentStudent) {
      if (tab !== 'security') {
        fetchStudentPortalSection(currentStudent.id, tab);
      } else {
        logStudentActivity(
          currentStudent.id,
          'VIEW',
          `Ardayga ${currentStudent.fullName} (${currentStudent.id}) ayaa furay qaybta Beddelka Furaha Sirta ah.`,
          `student-portal/${currentStudent.id}/security`
        );
      }
    }
  };

  const handleCopyCredentials = () => {
    const text = `Machadka Khadiija Bintu Khuwaylid - Student Portal\nArdayga: ${currentStudent.fullName}\nID: ${currentStudent.id}\nUsername: ${studentUsername}\nWeb: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (isStudentOrParent) {
      logStudentActivity(
        currentStudent.id,
        'VIEW_PROFILE',
        `Ardayga ${currentStudent.fullName} (${currentStudent.id}) ayaa koobiyey aqoonsiga gelitaanka portal-ka.`,
        `student:${currentStudent.id}`
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Student Portal Header Bar (View Only) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/60 text-[#005A51] dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full">
              {currentRole === 'Parent'
                ? 'Akoonka Waalidka (View Only)'
                : isStudentOrParent
                ? 'Akoonkaaga (View Only)'
                : 'Kormeerka Maamulka'}
            </span>
            <span className="text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Eegis Kaliya (Read-Only · No Print / No Edit)
            </span>
            <span className="text-xs text-slate-400 font-mono-numbers">{settings.academicYear}</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
            <span>
              {currentRole === 'Parent'
                ? 'Bogga Waalidka (Parent Portal)'
                : 'Bogga Ardayga (Student Portal)'}
            </span>
            {isStudentOrParent && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal">
                (Akoonka: <strong>{currentUser?.fullName || currentStudent.fullName}</strong>)
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {currentRole === 'Parent'
              ? `Waxaad eegaysaa xogta ubadkaaga: ${currentStudent.fullName} (Eegis kaliya)`
              : 'Eeg xogtaada shakhsiga ah, kaarka aqoonsiga & muddada joogitaanka, imtixaannada, xaadirinta, biilasha, iyo ogeysiisyada.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          {isAdminRole && adminBypassLogin ? (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  Dooro Ardayga:
                </label>
                <select
                  value={currentStudent.id}
                  onChange={(e) => setActiveStudentPortalId(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} ({s.id} - Roll: {s.rollNumber})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setAdminBypassLogin(false)}
                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                title="Ku noqo shaashadda Portal Login"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Portal Login</span>
              </button>
            </>
          ) : (
            <>
              {currentRole === 'Parent' && parentChildren.length > 1 && (
                <select
                  value={currentStudent.id}
                  onChange={(e) => setActiveStudentPortalId(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  {parentChildren.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.fullName} ({child.id})
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => logoutAccount()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Ka bax akoonkaaga"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ka Bax Akoonka (Log Out)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Student Identity & Account Card (View Only) */}
      <div className="bg-gradient-to-r from-[#005A51] via-[#007A6E] to-[#005A51] text-white rounded-xl p-5 shadow-sm border border-teal-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <img
            src={currentStudent.photoUrl}
            alt={currentStudent.fullName}
            className="w-16 h-16 rounded-full object-cover border-2 border-amber-300 shadow-md bg-white shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{currentStudent.fullName}</h3>
              <span className="text-[11px] bg-teal-900/60 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                {currentStudent.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-teal-100 font-mono-numbers mt-1.5">
              <span>
                ID: <strong>{currentStudent.id}</strong>
              </span>
              <span>·</span>
              <span>
                Roll: <strong>{currentStudent.rollNumber}</strong>
              </span>
              <span>·</span>
              <span>
                Fasalka:{' '}
                <strong>
                  {studentClass?.name} ({currentStudent.section}) ·{' '}
                  {currentStudent.shift || studentClass?.shift || 'Subax'}
                </strong>
              </span>
            </div>
            <div className="text-[11px] text-amber-200 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Muddada Waxbarashada: <strong>{experience.formattedEnglish}</strong> ({experience.formattedSomali})
              </span>
            </div>
          </div>
        </div>

        {/* Credentials Box (Never displays plaintext password) */}
        <div className="bg-teal-950/70 border border-teal-500/40 rounded-xl p-3.5 space-y-2 w-full md:w-auto min-w-[270px] text-xs">
          <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold border-b border-teal-800/80 pb-1">
            <span className="flex items-center gap-1">
              <Key className="w-3.5 h-3.5" />
              Xogta Akoonka (Account Info)
            </span>
            <span className="text-[10px] text-emerald-300 font-bold">Protected</span>
          </div>

          <div className="space-y-1 font-mono-numbers">
            <div className="flex justify-between gap-3">
              <span className="text-teal-200 text-[11px]">Username:</span>
              <span className="font-bold text-white">{studentUsername}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-teal-200 text-[11px]">Password:</span>
              <span className="font-bold text-amber-300">
                {currentStudent.mustChangePassword ? 'Bilowga (Beddel Qasab ah)' : '•••••••• (La Xafiday)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="py-1 px-2.5 bg-teal-800 hover:bg-teal-700 text-teal-100 rounded text-[11px] font-medium transition-colors flex items-center justify-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Koobiyay' : 'Koobiyeey'}
            </button>
            {currentRole === 'Student' && (
              <button
                type="button"
                onClick={() => handleTabChange('security')}
                className="flex-1 py-1 px-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded text-[11px] font-bold transition-colors flex items-center justify-center gap-1 shadow-2xs"
              >
                <Lock className="w-3 h-3" />
                Beddel Furaha Sirta ah
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Portal Module Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => handleTabChange('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'overview'
              ? 'bg-[#005A51] text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Dulmar & ID Card
        </button>
        <button
          onClick={() => handleTabChange('exams')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'exams'
              ? 'bg-[#005A51] text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Natiijooyinka Imtixaanka ({studentMarks.length})
        </button>
        <button
          onClick={() => handleTabChange('attendance')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'attendance'
              ? 'bg-[#005A51] text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Xaadirinta ({attRate}%)
        </button>
        <button
          onClick={() => handleTabChange('fees')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'fees'
              ? 'bg-[#005A51] text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Biilasha & Rasiidadka (${totalFeesDue} Baaqi)
        </button>
        <button
          onClick={() => handleTabChange('announcements')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 ${
            activeTab === 'announcements'
              ? 'bg-[#005A51] text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          Ogeysiisyada ({studentAnnouncements.length})
        </button>
        <button
          onClick={() => handleTabChange('timetable')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === 'timetable'
              ? 'bg-[#005A51] text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Jadwalka Casharrada ({studentTimetable.length})
        </button>
        {currentRole === 'Student' && (
          <button
            onClick={() => handleTabChange('security')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Beddel Furaha (Password)
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW + VIEW-ONLY DIGITAL STUDENT ID CARD */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Celceliska Buundooyinka</span>
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">
                {avgPercentage}%
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold">
                {avgPercentage >= 50 ? 'Gudbay (Passed)' : studentMarks.length === 0 ? 'Weli imtixaan ma jiro' : 'Haray (At-risk)'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Heerka Xaadirinta</span>
                <CalendarCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">
                {attRate}%
              </div>
              <p className="text-[11px] text-slate-400 font-mono-numbers">
                {presentAtt} Jooga / {totalAtt} Cashar
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
                <span>Baaqiga Waxbarashada</span>
                <CreditCard className="w-4 h-4 text-[#005A51]" />
              </div>
              <div
                className={`text-2xl font-bold font-mono-numbers ${
                  totalFeesDue > 0 ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                ${totalFeesDue.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-400">
                {totalFeesDue === 0 ? 'Kharashku waa bixisan yahay' : 'Biilasha bisha oo sugaya bixin'}
              </p>
            </div>
          </div>

          {/* Read-Only Student ID Card & Personal Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Digital Student ID Card (Strictly Read-Only, No Print) */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Kaarka Aqoonsiga Ardayga (View-Only ID Card)
                </h3>
                <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  Maamulka oo keliya ayaa beddeli/daabici kara
                </span>
              </div>

              <div className="border-2 border-[#005A51] rounded-xl overflow-hidden shadow-md bg-white dark:bg-slate-950 relative">
                {isIdCardRevoked && (
                  <div className="absolute inset-0 bg-red-900/15 backdrop-blur-[1px] z-10 flex items-center justify-center pointer-events-none">
                    <div className="bg-red-600 text-white font-bold text-xs px-4 py-1.5 rounded-lg border-2 border-white shadow-lg -rotate-12 uppercase">
                      KAARKAN WAA LA TIRAY (REVOKED)
                    </div>
                  </div>
                )}

                <div className="bg-[#005A51] text-white p-3 border-b-2 border-amber-400 flex items-center gap-3">
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="w-10 h-10 object-contain bg-white rounded-full p-0.5 border border-amber-300 shrink-0"
                  />
                  <div className="flex-1 text-center">
                    <h4 className="text-xs font-bold uppercase tracking-wide leading-tight">
                      {settings.institutionName}
                    </h4>
                    <p className="text-[10px] font-arabic text-amber-300">{settings.arabicName}</p>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-xs">
                  <div className="flex items-center gap-4">
                    <img
                      src={currentStudent.photoUrl}
                      alt={currentStudent.fullName}
                      className="w-20 h-24 rounded-lg object-cover border-2 border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="flex-1 space-y-1.5">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">Magaca Buuxa:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {currentStudent.fullName}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Student ID:</span>
                          <span className="font-mono-numbers font-bold text-[#005A51] dark:text-teal-400">
                            {currentStudent.id}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Roll Number:</span>
                          <span className="font-mono-numbers font-bold text-slate-800 dark:text-slate-200">
                            {currentStudent.rollNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Fasalka & Qeybta:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {studentClass?.name} ({currentStudent.section}) ·{' '}
                            {currentStudent.shift || studentClass?.shift || 'Subax'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Xaaladda:</span>
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">
                            {currentStudent.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Registration Date & Dynamic 6-Year Experience Breakdown */}
                  <div className="p-3 rounded-lg bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-[#005A51] dark:text-teal-400" />
                        Taariikhda Diiwaangelinta (Reg Date):
                      </span>
                      <span className="font-mono-numbers font-bold text-slate-900 dark:text-slate-100">
                        {currentStudent.admissionDate}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold">
                        Dhammaadka Wareegga 6-da Sano:
                      </span>
                      <span className="font-mono-numbers font-bold text-rose-700 dark:text-rose-400">
                        {idExpiryDate}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-teal-200/70 dark:border-teal-800/70">
                      <span className="text-[10px] font-bold uppercase text-[#005A51] dark:text-teal-300 block mb-1.5">
                        Muddada Khibradda / Joogitaanka Ardayga (Experience · Max 6 Years):
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-teal-200 dark:border-teal-800">
                          <div className="text-base font-black font-mono-numbers text-[#005A51] dark:text-teal-400">
                            {experience.years}
                          </div>
                          <div className="text-[10px] text-slate-500">Years (Sano)</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-teal-200 dark:border-teal-800">
                          <div className="text-base font-black font-mono-numbers text-[#005A51] dark:text-teal-400">
                            {experience.months}
                          </div>
                          <div className="text-[10px] text-slate-500">Months (Bil)</div>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-2 rounded border border-teal-200 dark:border-teal-800">
                          <div className="text-base font-black font-mono-numbers text-[#005A51] dark:text-teal-400">
                            {experience.days}
                          </div>
                          <div className="text-[10px] text-slate-500">Days (Maalin)</div>
                        </div>
                      </div>
                      {experience.isCappedAtSixYears && (
                        <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-1.5 font-medium">
                          * Waxaa la gaaray xadka ugu sarreeya ee muujinta taariikhda waxbarashada (6 Sano) iyadoo aan la beddelin taariikhda asalka ah ({currentStudent.admissionDate}).
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Read-Only Personal & Guardian Profile Details */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#005A51]" />
                  Macluumaadka Shakhsiga ah & Waalidka (View Only)
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                  Read-Only
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Jinsiga (Gender):</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentStudent.gender === 'Female' ? 'Dheddig (Female)' : 'Lab (Male)'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Taariikhda Dhalashada:</span>
                  <span className="font-mono-numbers font-semibold text-slate-800 dark:text-slate-200">
                    {currentStudent.birthDate}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Dhiigga (Blood Group):</span>
                  <span className="font-bold text-red-600">{currentStudent.bloodGroup}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Username-kaaga Gaarka ah:</span>
                  <span className="font-mono-numbers font-bold text-[#005A51] dark:text-teal-400">
                    {studentUsername}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 col-span-2">
                  <span className="text-[10px] text-slate-400 block">Magaca Waalidka & Xiriirka:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {currentStudent.guardianName} ({currentStudent.guardianRelation})
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Taleefanka Waalidka:</span>
                  <span className="font-mono-numbers font-semibold text-slate-800 dark:text-slate-200">
                    {currentStudent.guardianPhone}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Gurmad Degdeg ah:</span>
                  <span className="font-mono-numbers font-semibold text-rose-600">
                    {currentStudent.emergencyContact}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 col-span-2">
                  <span className="text-[10px] text-slate-400 block">Cinwaanka (Address):</span>
                  <span className="text-slate-700 dark:text-slate-300">
                    {currentStudent.guardianAddress}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXAMS (View Only) */}
      {activeTab === 'exams' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200">
              Buundooyinka Imtixaanka ee {currentStudent.fullName}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-[11px]">
              <Eye className="w-3.5 h-3.5" />
              Eegis Kaliya (View Only)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  <th className="px-4 py-3">Maadada (Subject)</th>
                  <th className="px-3 py-3 text-center">Max Marks</th>
                  <th className="px-3 py-3 text-center">Buundada</th>
                  <th className="px-3 py-3 text-center">Heerka</th>
                  <th className="px-4 py-3">Faallo (Remarks)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {studentMarks.length > 0 ? (
                  studentMarks.map((m) => {
                    const sub = subjects.find((s) => s.id === m.subjectId);

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-2.5">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {sub?.nameSomali || 'Maado'}
                          </div>
                          <div className="text-[11px] font-arabic text-amber-700 dark:text-amber-400">
                            {sub?.nameArabic}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono-numbers text-slate-500">
                          {m.maxMarks}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono-numbers font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {m.marksObtained}
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              m.grade.startsWith('A')
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {m.grade}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                          {m.remarks}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Weli natiijo imtixaan oo la shaaciyay ma jirto.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ATTENDANCE */}
      {activeTab === 'attendance' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Diiwaanka Xaadirinta Shakhsiga ah
            </h3>
            <span className="font-mono-numbers text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              {attRate}% Heerka Imaanshaha
            </span>
          </div>

          <div className="space-y-2">
            {studentAttendance.length > 0 ? (
              studentAttendance.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                >
                  <span className="font-mono-numbers font-bold text-slate-800 dark:text-slate-200">
                    {att.date}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                      att.status === 'Present'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        : att.status === 'Late'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300'
                    }`}
                  >
                    {att.status === 'Present' ? 'Jooga' : att.status === 'Late' ? 'Soo Daahay' : 'Maqan'}
                  </span>
                  <span className="text-slate-400">{att.remarks || '—'}</span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 py-6 text-center">Ma jiro diiwaan xaadirin oo ku qoran ardaygan.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: FEES & PAYMENTS */}
      {activeTab === 'fees' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
              <span>Biilasha & Lacag-bixinta Ardayga</span>
              <span className="text-[11px] text-slate-500 font-normal">Eegis Kaliya (View Only)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="px-4 py-3">Biilka</th>
                    <th className="px-3 py-3">Bisha</th>
                    <th className="px-3 py-3 text-right">Cadadka</th>
                    <th className="px-3 py-3 text-right">La Bixiyay</th>
                    <th className="px-3 py-3 text-right">Baaqiga</th>
                    <th className="px-3 py-3 text-center">Xaaladda</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {studentInvoices.length > 0 ? (
                    studentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-mono-numbers font-bold text-[#005A51] dark:text-teal-400">
                          {inv.id}
                        </td>
                        <td className="px-3 py-3 text-slate-800 dark:text-slate-200">{inv.month}</td>
                        <td className="px-3 py-3 text-right font-mono-numbers font-bold text-slate-900 dark:text-slate-100">
                          ${inv.amount.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-numbers text-emerald-700 dark:text-emerald-400">
                          ${inv.paidAmount.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-numbers font-bold text-red-600">
                          ${inv.balance.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                                : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Ma jiraan biilal loo soo saaray ardaygan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {studentPayments.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200">
                Rasiidadka Lacag-Bixinnada Hore ({studentPayments.length})
              </h4>
              <div className="space-y-2">
                {studentPayments.map((pay) => (
                  <div
                    key={pay.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                  >
                    <div>
                      <span className="font-mono-numbers font-bold text-[#005A51]">{pay.id}</span>
                      <span className="ml-2 text-slate-500">
                        {pay.paymentDate} · {pay.paymentMethod}
                      </span>
                    </div>
                    <span className="font-mono-numbers font-bold text-emerald-700 dark:text-emerald-400">
                      ${pay.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: ANNOUNCEMENTS & MESSAGES */}
      {activeTab === 'announcements' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Ogeysiisyada & Farriimaha Maamulka
            </h3>
            <span className="text-[11px] text-slate-400">Eegis Kaliya (Read-Only)</span>
          </div>
          {studentAnnouncements.length > 0 ? (
            <div className="space-y-3">
              {studentAnnouncements.map((ann) => (
                <div
                  key={ann.id}
                  onClick={() => !ann.read && markAnnouncementRead(ann.id)}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5 cursor-pointer hover:border-[#005A51]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {ann.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        ann.priority === 'Urgent'
                          ? 'bg-red-100 text-red-700'
                          : ann.priority === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {ann.priority}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{ann.body}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>
                      Qore: {ann.author} ({ann.authorRole})
                    </span>
                    <span className="font-mono-numbers">{ann.date}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 py-6 text-center">Ma jiraan ogeysiisyo cusub xilligan.</p>
          )}
        </div>
      )}

      {/* TAB 6: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Jadwalka Casharrada Fasalkaaga ({studentClass?.name} {currentStudent.section} ·{' '}
              {currentStudent.shift || studentClass?.shift || 'Subax'})
            </h3>
            <span className="font-mono-numbers text-slate-500">
              Qolka: {studentClass?.roomNumber}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {studentTimetable.map((slot) => {
              const sub = subjects.find((s) => s.id === slot.subjectId);

              return (
                <div
                  key={slot.id}
                  className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                    <span className="font-bold text-[#005A51] dark:text-teal-400">{slot.day}</span>
                    <span className="font-mono-numbers font-semibold">Casharka {slot.period}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                    {sub?.nameSomali || 'Maado'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono-numbers">{slot.timeRange}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 7: SECURITY / CHANGE PASSWORD (OWN ACCOUNT ONLY) */}
      {activeTab === 'security' && currentRole === 'Student' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 max-w-lg space-y-4 text-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Beddel Furaha Sirta ah (Change Own Password)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Username-kaagu waa <strong className="font-mono">{studentUsername}</strong> (lama beddeli karo). Waxaad beddelan kartaa furaha sirta ah oo kaliya.
              </p>
            </div>
          </div>

          {passwordFeedback && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 font-semibold ${
                passwordFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              {passwordFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{passwordFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                Furaha Hadda Jira (Current Password): *
              </label>
              <input
                type="password"
                required
                value={currentPasswordInput}
                onChange={(e) => setCurrentPasswordInput(e.target.value)}
                placeholder="Geli furaha hadda jira"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-[#005A51]"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                Furaha Cusub (New Password): *
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Ugu yaraan 4 xaraf/tiro"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-[#005A51]"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                Ku Celi Furaha Cusub (Confirm New Password): *
              </label>
              <input
                type="password"
                required
                minLength={4}
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                placeholder="Mar kale qor furaha cusub"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-[#005A51]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Dhammaan beddelka furaha waa la diiwaangeliyaa (Audit Log).
              </span>
              <button
                type="submit"
                disabled={isUpdatingPass}
                className="px-4 py-2 bg-[#005A51] hover:bg-[#004841] text-white font-bold rounded-lg shadow-xs transition-colors disabled:opacity-70"
              >
                {isUpdatingPass ? 'Waa la keydinayaa...' : 'Keydi Furaha Cusub'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
