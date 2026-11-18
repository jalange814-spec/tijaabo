/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardModule } from './components/modules/DashboardModule';
import { StudentsModule } from './components/modules/StudentsModule';
import { ClassesModule } from './components/modules/ClassesModule';
import { TeachersModule } from './components/modules/TeachersModule';
import { AttendanceModule } from './components/modules/AttendanceModule';
import { ExamsModule } from './components/modules/ExamsModule';
import { ExamCardsModule } from './components/modules/ExamCardsModule';
import { FeesModule } from './components/modules/FeesModule';
import { FinanceModule } from './components/modules/FinanceModule';
import { HrPayrollModule } from './components/modules/HrPayrollModule';
import { TimetableModule } from './components/modules/TimetableModule';
import { MessagingModule } from './components/modules/MessagingModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { SettingsModule } from './components/modules/SettingsModule';
import { SupportModule } from './components/modules/SupportModule';
import { StudentPortalModule } from './components/modules/StudentPortalModule';
import { PortalLoginModule } from './components/modules/PortalLoginModule';
import { PrintModal } from './components/modals/PrintModal';
import { PortalLoginModal } from './components/modals/PortalLoginModal';
import { canAccessModule, getDefaultModuleForRole } from './utils/rbac';
import { CheckCircle2, Sun, Moon, ShieldAlert, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    activeModule,
    setActiveModule,
    currentUser,
    currentRole,
    rbacPolicies,
    isBootstrapping,
    toast,
    theme,
    toggleTheme,
    forbiddenNotice,
    setForbiddenNotice,
  } = useApp();

  useEffect(() => {
    if (!currentUser) return;
    const urlStr = `${window.location.pathname}${window.location.search}${window.location.hash}`.toLowerCase();
    const staffAttRoles = ['Super Admin', 'Administrator', 'Academic Manager', 'HR Manager'];
    if (
      (urlStr.includes('staff-attendance') || urlStr.includes('staff_attendance') || urlStr.includes('tab=staff')) &&
      !staffAttRoles.includes(currentRole)
    ) {
      setForbiddenNotice(
        'HTTP 403 Forbidden: Akoonkaagu (Teacher/Student) ma geli karo bogga ama warbixinada Xaadirinta Shaqaalaha.'
      );
      setActiveModule(getDefaultModuleForRole(currentRole));
    } else if (
      (urlStr.includes('exam-cards') || urlStr.includes('exam_cards')) &&
      !canAccessModule(currentRole, 'exam_cards', currentUser.permissions, rbacPolicies)
    ) {
      setForbiddenNotice(
        'HTTP 403 Forbidden: Kaararka Imtixaanka waxaa heli kara Maamulka Guud iyo Madaxa Waxbarashada oo keliya.'
      );
      setActiveModule(getDefaultModuleForRole(currentRole));
    }
  }, [currentUser, currentRole, rbacPolicies, setActiveModule, setForbiddenNotice]);

  useEffect(() => {
    if (currentUser && !canAccessModule(currentRole, activeModule, currentUser.permissions, rbacPolicies)) {
      setActiveModule(getDefaultModuleForRole(currentRole));
    }
  }, [currentUser, currentRole, activeModule, rbacPolicies, setActiveModule]);

  if (isBootstrapping) {
    return (
      <div className="min-h-screen bg-[#F5F7F7] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-8 py-6 shadow-md text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#005A51] border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-bold text-[#005A51] dark:text-teal-400">
            Machadka Khadiija Bintu Khuwaylid
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Waxaa la hubinayaa xogta akoonkaaga...
          </p>
        </div>
      </div>
    );
  }

  // If no user is logged in, enforce Login Gate so every user logs into their own account ONLY
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F5F7F7] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={toggleTheme}
            type="button"
            title={theme === 'dark' ? 'Habka Maalinta (Day Mode)' : 'Habka Habeenka (Dark Mode)'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 shadow-2xs"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            <span>{theme === 'dark' ? 'Maalin' : 'Habeen'}</span>
          </button>
        </div>

        <main className="flex-1 flex items-center justify-center">
          <PortalLoginModule />
        </main>

        <PortalLoginModal />

        {toast && (
          <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </div>
        )}
      </div>
    );
  }

  const resolvedModule = canAccessModule(currentRole, activeModule, currentUser.permissions, rbacPolicies)
    ? activeModule
    : getDefaultModuleForRole(currentRole);

  return (
    <div className="min-h-screen bg-[#F5F7F7] dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex font-sans selection:bg-[#005A51] selection:text-white transition-colors overflow-x-clip">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />

        <main className="flex-1 min-w-0 w-full p-3 sm:p-5 lg:p-6 max-w-[1600px] mx-auto">
          {forbiddenNotice && (
            <div className="mb-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                <span className="break-words">{forbiddenNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setForbiddenNotice(null)}
                className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {resolvedModule === 'dashboard' && <DashboardModule />}
          {resolvedModule === 'students' && <StudentsModule />}
          {resolvedModule === 'student_portal' && <StudentPortalModule />}
          {resolvedModule === 'classes' && <ClassesModule />}
          {resolvedModule === 'teachers' && <TeachersModule />}
          {resolvedModule === 'attendance' && <AttendanceModule />}
          {resolvedModule === 'exams' && <ExamsModule />}
          {resolvedModule === 'exam_cards' && <ExamCardsModule />}
          {resolvedModule === 'fees' && <FeesModule />}
          {resolvedModule === 'finance' && <FinanceModule />}
          {resolvedModule === 'hr' && <HrPayrollModule />}
          {resolvedModule === 'timetable' && <TimetableModule />}
          {resolvedModule === 'messaging' && <MessagingModule />}
          {resolvedModule === 'reports' && <ReportsModule />}
          {resolvedModule === 'settings' && <SettingsModule />}
          {resolvedModule === 'support' && <SupportModule />}
        </main>
      </div>

      <PrintModal />
      <PortalLoginModal />

      {toast && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
