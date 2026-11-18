/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { canAccessModule } from '../../utils/rbac';
import { resolveBreadcrumb } from '../../config/navigation';
import { GlobalSearchBar } from '../common/GlobalSearchBar';
import {
  Bell,
  UserCheck,
  Shield,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  KeyRound,
  LogOut,
  Lock,
  ArrowRightLeft,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Calendar,
} from 'lucide-react';

const rolesList: UserRole[] = [
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

export const Navbar: React.FC = () => {
  const {
    settings,
    currentRole,
    currentUser,
    openLoginForRole,
    logoutAccount,
    activeModule,
    activeChildKey,
    navigateToSubmenu,
    announcements,
    theme,
    toggleTheme,
    students,
    authenticatedStudentId,
    setIsPortalLoginModalOpen,
    isSidebarCollapsed,
    toggleSidebarCollapsed,
    setIsMobileSidebarOpen,
  } = useApp();

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const loggedInStudent = authenticatedStudentId
    ? students.find((s) => s.id === authenticatedStudentId)
    : null;

  const unreadAnnouncements = announcements.filter((a) => !a.read).length;
  const isStudentOrParent = currentRole === 'Student' || currentRole === 'Parent';

  const { group: activeGroup, child: activeChild } = useMemo(
    () => resolveBreadcrumb(currentRole, activeModule, activeChildKey),
    [currentRole, activeModule, activeChildKey]
  );

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200/90 dark:border-slate-800 shadow-2xs transition-colors">
      <div className="flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-5 lg:px-6 h-14">
        {/* Left Zone: Mobile Drawer Toggle, Desktop Collapse Toggle & Active Page Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:flex-initial">
          {/* Mobile Hamburger Trigger */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            aria-label="Fur Liiska Qeybaha (Open Menu)"
            className="md:hidden inline-flex items-center justify-center w-11 h-11 -ml-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            title={isSidebarCollapsed ? 'Ballaari Liiska (Expand Sidebar)' : 'Yaree Liiska (Collapse Sidebar)'}
            aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="hidden md:inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:text-[#005A51] dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-colors shrink-0"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>

          {/* Breadcrumb / Active Page Title */}
          <div className="min-w-0 flex flex-col justify-center">
            {activeGroup && (
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none">
                <span className="truncate max-w-[140px]">{activeGroup.label}</span>
                {activeChild && (
                  <>
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    <span className="text-[#005A51] dark:text-teal-400 truncate max-w-[160px]">
                      {activeGroup.shortLabel}
                    </span>
                  </>
                )}
              </div>
            )}
            <h1 className="text-sm sm:text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate leading-tight">
              {activeChild?.label || activeGroup?.label || settings.institutionName}
            </h1>
          </div>
        </div>

        {/* Center Zone: Global Search Bar (Hidden for Students/Parents) */}
        <div className="flex items-center justify-end md:justify-center md:flex-1 md:max-w-md">
          {!isStudentOrParent && <GlobalSearchBar />}
        </div>

        {/* Right Zone: Academic Year, Notifications, Theme & Profile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Current Academic Year */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-lg whitespace-nowrap"
            title="Sanad Dugsiyeedka Hadda"
          >
            <Calendar className="w-3.5 h-3.5 text-[#005A51] dark:text-teal-400" />
            <span className="font-mono-numbers font-semibold">{settings.academicYear}</span>
          </div>

          {/* Notifications Bell */}
          {canAccessModule(currentRole, 'messaging') && (
            <button
              type="button"
              onClick={() =>
                navigateToSubmenu('messaging', 'notices', undefined, 'messaging_notices')
              }
              title="Ogeysiisyada dugsiga"
              aria-label="Ogeysiisyada dugsiga"
              className="relative inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 text-slate-600 dark:text-slate-300 hover:text-[#005A51] dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-lg transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadAnnouncements > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
              )}
            </button>
          )}

          {/* Day / Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            type="button"
            title={
              theme === 'dark'
                ? 'U beddel Habka Maalinta (Day Mode)'
                : 'U beddel Habka Habeenka (Dark Mode)'
            }
            aria-label="Toggle theme"
            className="inline-flex items-center justify-center w-10 h-10 sm:w-9 sm:h-9 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User Profile & Role Account Switcher */}
          {currentUser ? (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen((p) => !p)}
                aria-expanded={isRoleDropdownOpen}
                className="flex items-center gap-2 pl-1.5 pr-2 sm:px-2.5 py-1.5 min-h-[40px] sm:min-h-[36px] text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
              >
                {currentUser.photoUrl || loggedInStudent?.photoUrl ? (
                  <img
                    src={currentUser.photoUrl || loggedInStudent?.photoUrl}
                    alt={currentUser.fullName}
                    className="w-6 h-6 rounded-full object-cover border border-[#FCA700]/70 shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-[#005A51] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {currentUser.fullName.charAt(0)}
                  </div>
                )}
                <div className="hidden lg:flex flex-col items-start text-left leading-tight">
                  <span className="font-bold text-slate-900 dark:text-slate-100 max-w-[120px] truncate">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-[#005A51] dark:text-teal-400 font-semibold">
                    {currentRole}
                  </span>
                </div>
                <span className="lg:hidden hidden sm:inline font-semibold text-slate-900 dark:text-slate-100 max-w-[90px] truncate">
                  {currentRole}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isRoleDropdownOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-64 max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setIsRoleDropdownOpen(false)}
                >
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-teal-50/50 dark:bg-teal-950/30">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>Akoonkaaga Hadda (Verified)</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate mt-0.5">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-numbers truncate">
                      {currentUser.username} · {currentUser.role}
                    </div>
                  </div>

                  <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                    Gal Akoon Kale (Login Required)
                  </div>

                  <div className="max-h-56 overflow-y-auto py-0.5">
                    {rolesList.map((role) => {
                      const isCurrent = currentRole === role;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            if (!isCurrent) {
                              openLoginForRole(role);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                            isCurrent
                              ? 'bg-teal-50 dark:bg-teal-950/60 text-[#005A51] dark:text-teal-300 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span>{role}</span>
                          {isCurrent ? (
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Lock className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 px-1.5 space-y-1">
                    <button
                      type="button"
                      onClick={() => setIsPortalLoginModalOpen(true)}
                      className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold text-[#005A51] dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded-lg transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      <span>Beddel Akoon (Switch Account)</span>
                    </button>
                    <button
                      type="button"
                      onClick={logoutAccount}
                      className="w-full flex items-center gap-2 px-2 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Ka Bax Akoonka (Log Out)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsPortalLoginModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-950 bg-amber-400 hover:bg-amber-300 border border-amber-500/50 rounded-lg transition-colors whitespace-nowrap shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Portal Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
