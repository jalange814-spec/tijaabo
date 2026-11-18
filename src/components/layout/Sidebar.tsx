/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { canAccessModule, getDefaultModuleForRole } from '../../utils/rbac';
import { getVisibleNavigationGroups, resolveBreadcrumb } from '../../config/navigation';
import {
  ChevronDown,
  LogOut,
  Settings,
  X,
  MapPin,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeModule,
    activeChildKey,
    navigateToSubmenu,
    setActiveModule,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    announcements,
    invoices,
    leaveRequests,
    tickets,
    students,
    authenticatedStudentId,
    currentRole,
    currentUser,
    rbacPolicies,
    settings,
    logoutAccount,
  } = useApp();

  const visibleGroups = useMemo(
    () => getVisibleNavigationGroups(currentRole, currentUser?.permissions, rbacPolicies),
    [currentRole, currentUser?.permissions, rbacPolicies]
  );
  const { group: activeGroup, child: activeChild } = useMemo(
    () => resolveBreadcrumb(currentRole, activeModule, activeChildKey, currentUser?.permissions, rbacPolicies),
    [currentRole, activeModule, activeChildKey, currentUser?.permissions, rbacPolicies]
  );

  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>(() =>
    activeGroup ? [activeGroup.id] : []
  );

  // Automatically expand the active parent group when activeModule/activeGroup changes
  useEffect(() => {
    if (activeGroup) {
      setExpandedGroupIds((prev) => (prev.includes(activeGroup.id) ? prev : [...prev, activeGroup.id]));
    }
  }, [activeGroup]);

  // Close mobile drawer on Escape
  useEffect(() => {
    if (!isMobileSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileSidebarOpen, setIsMobileSidebarOpen]);

  const unreadAnnouncements = announcements.filter((a) => !a.read).length;
  const overdueInvoices = invoices.filter((i) => i.status === 'Overdue').length;
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending').length;
  const openTickets = tickets.filter((t) => t.status === 'Open').length;

  const loggedInStudent = authenticatedStudentId
    ? students.find((s) => s.id === authenticatedStudentId)
    : null;
  const avatarUrl = currentUser?.photoUrl || loggedInStudent?.photoUrl;

  const getGroupBadge = (groupId: string): number | undefined => {
    if (groupId === 'maaliyadda' && overdueInvoices > 0) return overdueInvoices;
    if (groupId === 'macallimiinta' && pendingLeaves > 0) return pendingLeaves;
    if (groupId === 'nidaamka') {
      const total = openTickets + unreadAnnouncements;
      return total > 0 ? total : undefined;
    }
    return undefined;
  };

  const getChildBadge = (childKey: string): number | undefined => {
    if (childKey === 'fees_invoices' && overdueInvoices > 0) return overdueInvoices;
    if (childKey === 'staff_leaves' && pendingLeaves > 0) return pendingLeaves;
    if (childKey === 'support_tickets' && openTickets > 0) return openTickets;
    if (childKey === 'messaging_notices' && unreadAnnouncements > 0) return unreadAnnouncements;
    return undefined;
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleChildClick = (module: string, tab?: string, action?: string, key?: string) => {
    navigateToSubmenu(module, tab, action, key);
  };

  const handleCollapsedGroupClick = (groupId: string) => {
    const grp = visibleGroups.find((g) => g.id === groupId);
    if (!grp) return;
    setIsSidebarCollapsed(false);
    setExpandedGroupIds((prev) => (prev.includes(groupId) ? prev : [...prev, groupId]));
    const first = grp.children[0];
    if (first) {
      navigateToSubmenu(first.module, first.tab, first.action, first.key);
    }
  };

  const renderSidebarBody = (isMobileDrawer: boolean) => {
    const collapsed = !isMobileDrawer && isSidebarCollapsed;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 transition-colors">
        {/* Top Institutional Brand Zone */}
        <div
          className={`flex items-center ${
            collapsed ? 'justify-center px-2 py-3.5' : 'justify-between px-3.5 py-3'
          } border-b border-slate-200/80 dark:border-slate-800 shrink-0 min-h-[60px]`}
        >
          <button
            type="button"
            onClick={() => {
              setActiveModule(getDefaultModuleForRole(currentRole));
              setIsMobileSidebarOpen(false);
            }}
            title={settings.institutionName}
            className={`flex items-center gap-2.5 text-left focus:outline-hidden group ${
              collapsed ? 'justify-center' : 'min-w-0 flex-1'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-[#005A51]/10 dark:bg-teal-950 border border-[#FCA700]/70 flex items-center justify-center overflow-hidden shrink-0">
              <img
                src={settings.logoUrl}
                alt="Astaanta Machadka"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-[#005A51] dark:text-teal-300 tracking-tight truncate leading-tight">
                  Machadka Khadiija
                </div>
                <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate leading-tight mt-0.5">
                  Bintu Khuwaylid · Qardho
                </div>
              </div>
            )}
          </button>

          {isMobileDrawer && (
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Xir liiska"
              className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Hierarchical Menu List */}
        <nav
          aria-label="Qeybaha Nidaamka"
          className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 scrollbar-thin"
        >
          {!collapsed && (
            <div className="px-2.5 pb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>Maamulka & Qeybaha</span>
              <span className="font-mono-numbers text-[#005A51] dark:text-teal-400">
                {settings.academicYear}
              </span>
            </div>
          )}

          {visibleGroups.map((group) => {
            const GroupIcon = group.icon;
            const isGroupActive = activeGroup?.id === group.id;
            const isExpanded = expandedGroupIds.includes(group.id);
            const groupBadge = getGroupBadge(group.id);

            if (collapsed) {
              return (
                <div key={group.id} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleCollapsedGroupClick(group.id)}
                    title={group.label}
                    aria-label={group.label}
                    className={`relative w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${
                      isGroupActive
                        ? 'bg-[#005A51] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#005A51] dark:hover:text-teal-300'
                    }`}
                  >
                    <GroupIcon
                      className={`w-5 h-5 ${isGroupActive ? 'text-[#FCA700]' : ''}`}
                    />
                    {groupBadge !== undefined && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FCA700] ring-2 ring-white dark:ring-slate-900" />
                    )}
                  </button>
                </div>
              );
            }

            return (
              <div key={group.id} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isExpanded}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2.5 min-h-[42px] text-xs font-semibold rounded-lg transition-colors text-left ${
                    isGroupActive
                      ? 'bg-[#005A51]/10 dark:bg-teal-950/70 text-[#005A51] dark:text-teal-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GroupIcon
                      className={`w-4 h-4 shrink-0 ${
                        isGroupActive
                          ? 'text-[#005A51] dark:text-teal-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    />
                    <span className="truncate">{group.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {groupBadge !== undefined && !isExpanded && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono-numbers rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200">
                        {groupBadge}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                        isExpanded ? 'rotate-180 text-[#005A51] dark:text-teal-400' : ''
                      }`}
                    />
                  </div>
                </button>

                {isExpanded && (
                  <div className="ml-4 pl-2.5 border-l border-slate-200 dark:border-slate-700/80 space-y-0.5 py-0.5">
                    {group.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isChildActive = activeChild?.key === child.key;
                      const childBadge = getChildBadge(child.key);

                      return (
                        <button
                          key={child.key}
                          type="button"
                          onClick={() =>
                            handleChildClick(child.module, child.tab, child.action, child.key)
                          }
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 min-h-[38px] sm:min-h-[36px] text-xs rounded-md transition-colors text-left ${
                            isChildActive
                              ? 'bg-[#005A51] text-white font-semibold shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-slate-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <ChildIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isChildActive
                                  ? 'text-[#FCA700]'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                            />
                            <span className="truncate">{child.label}</span>
                          </div>

                          {childBadge !== undefined && (
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold font-mono-numbers rounded shrink-0 ${
                                isChildActive
                                  ? 'bg-[#FCA700] text-slate-950'
                                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                              }`}
                            >
                              {childBadge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer: Logged-in User, Quick Settings & Logout */}
        <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 shrink-0 space-y-2">
          {!collapsed ? (
            <>
              {currentUser && (
                <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/70">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={currentUser.fullName}
                      className="w-8 h-8 rounded-full object-cover border border-[#FCA700]/70 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#005A51] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {currentUser.fullName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {currentUser.fullName}
                    </div>
                    <div className="text-[10px] font-medium text-[#005A51] dark:text-teal-400 truncate">
                      {currentRole}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1.5">
                {canAccessModule(currentRole, 'settings', currentUser?.permissions, rbacPolicies) && (
                  <button
                    type="button"
                    onClick={() =>
                      handleChildClick('settings', 'general', undefined, 'settings_general')
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 min-h-[38px] text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Settings</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={logoutAccount}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 min-h-[38px] text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/70 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Ka Bax</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-400 dark:text-slate-500">
                <MapPin className="w-3 h-3 text-[#005A51] dark:text-teal-400 shrink-0" />
                <span className="truncate">Qardho, Karkaar · Puntland</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              {canAccessModule(currentRole, 'settings', currentUser?.permissions, rbacPolicies) && (
                <button
                  type="button"
                  onClick={() =>
                    handleChildClick('settings', 'general', undefined, 'settings_general')
                  }
                  title="Settings"
                  aria-label="Settings"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={logoutAccount}
                title="Ka Bax Akoonka (Log Out)"
                aria-label="Log Out"
                className="w-10 h-10 rounded-lg flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop / Tablet Persistent Collapsible Left Sidebar */}
      <aside
        className={`hidden md:block shrink-0 h-screen sticky top-0 z-30 transition-[width] duration-200 ease-out ${
          isSidebarCollapsed ? 'w-[74px]' : 'w-[264px] lg:w-[272px]'
        }`}
      >
        {renderSidebarBody(false)}
      </aside>

      {/* Mobile Slide-In Overlay Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebarBody(true)}
          </aside>
        </div>
      )}
    </>
  );
};
