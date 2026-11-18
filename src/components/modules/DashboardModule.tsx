/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { canAccessModule } from '../../utils/rbac';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Award,
  DollarSign,
  ArrowUpRight,
  PlusCircle,
  FileText,
  Clock,
  Database,
  Building,
  Briefcase,
  MessageSquare,
} from 'lucide-react';

export const DashboardModule: React.FC = () => {
  const {
    students,
    teachers,
    staff,
    classes,
    attendance,
    payments,
    incomes,
    invoices,
    expenses,
    exams,
    marks,
    announcements,
    setActiveModule,
    navigateToSubmenu,
    navigationIntent,
    clearNavigationIntent,
    settings,
    currentRole,
    currentUser,
    leaveRequests,
    tickets,
  } = useApp();

  const analyticsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (navigationIntent?.module === 'dashboard') {
      if (navigationIntent.tab === 'analytics') {
        analyticsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      clearNavigationIntent();
    }
  }, [navigationIntent, clearNavigationIntent]);

  // Metrics Calculations (Exclude Deleted/Withdrawn/Dropped from active enrollment stats)
  const enrolledStudents = students.filter(
    (s) => s.status !== 'Withdrawn' && s.status !== 'Dropped' && s.status !== 'Deleted'
  );
  const totalStudents = enrolledStudents.length;
  const activeStudents = enrolledStudents.filter((s) => s.status === 'Active').length;
  const totalTeachers = teachers.length;
  const totalStaff = staff.length;
  const totalClasses = classes.length;

  // Today's attendance percentage
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayAtt = attendance.filter((a) => a.date === todayStr);
  const presentCount = todayAtt.filter((a) => a.status === 'Present').length;
  const attendanceRate = todayAtt.length > 0 ? Math.round((presentCount / todayAtt.length) * 100) : 0;

  // Financial aggregates
  const totalFeeIncome =
    payments.reduce((sum, p) => sum + p.amount, 0) +
    incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balance, 0);
  const totalExpenses = expenses
    .filter((e) => e.status === 'Approved')
    .reduce((sum, e) => sum + e.amount, 0);
  const netCashBalance = totalFeeIncome - totalExpenses;

  // Class enrollment capacity
  const totalCapacity = classes.reduce((sum, c) => sum + c.capacity, 0);
  const capacityPct = Math.round((totalStudents / (totalCapacity || 1)) * 100);

  // Top performing students calculation
  const studentAverageScores = enrolledStudents.map((s) => {
    const studentMarks = marks.filter((m) => m.studentId === s.id);
    const avg =
      studentMarks.length > 0
        ? studentMarks.reduce((sum, m) => sum + m.marksObtained, 0) / studentMarks.length
        : 0;
    return {
      student: s,
      avg: Math.round(avg * 10) / 10,
      marksCount: studentMarks.length,
    };
  });
  const topStudents = studentAverageScores
    .filter((item) => item.marksCount > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 4);

  // Overdue students list
  const overdueInvoices = invoices.filter((i) => i.status === 'Overdue');

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome with Institutional Identity */}
      <div className="bg-gradient-to-r from-[#005A51] via-[#007A6E] to-[#005A51] text-white rounded-xl p-5 shadow-sm border border-teal-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-teal-900/40 px-2.5 py-0.5 rounded-full border border-amber-400/30">
              {currentRole} · {settings.academicYear}
            </span>
            <span className="text-xs text-teal-100 font-arabic">قرطو - كركار - بونتلاند</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Ku soo dhowow, {currentUser?.fullName || settings.institutionName}
          </h2>
          <p className="text-xs text-teal-100/90 mt-1 max-w-2xl">
            {settings.institutionName} · Xarunta maamulka ku xiran doorkaaga gaarka ah ({currentRole}).
          </p>
        </div>

        {/* Quick Action Buttons (Strictly scoped to role) */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {canAccessModule(currentRole, 'students') && (
            <button
              onClick={() => navigateToSubmenu('students', undefined, 'add_student', 'students_register')}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors shadow-xs whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Diiwaangeli Arday
            </button>
          )}
          {canAccessModule(currentRole, 'attendance') && (
            <button
              onClick={() => setActiveModule('attendance')}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-800/80 hover:bg-teal-900 border border-teal-600 rounded-lg transition-colors whitespace-nowrap"
            >
              <CalendarCheck className="w-3.5 h-3.5 text-amber-300" />
              Xaadirinta
            </button>
          )}
          {canAccessModule(currentRole, 'exams') && (
            <button
              onClick={() => setActiveModule('exams')}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-800/80 hover:bg-teal-900 border border-teal-600 rounded-lg transition-colors whitespace-nowrap"
            >
              <Award className="w-3.5 h-3.5 text-amber-300" />
              Imtixaanaadka
            </button>
          )}
          {canAccessModule(currentRole, 'fees') && (
            <button
              onClick={() => setActiveModule('fees')}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-800/80 hover:bg-teal-900 border border-teal-600 rounded-lg transition-colors whitespace-nowrap"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-300" />
              Xaree Lacag
            </button>
          )}
          {canAccessModule(currentRole, 'hr') && !canAccessModule(currentRole, 'fees') && (
            <button
              onClick={() => setActiveModule('hr')}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-800/80 hover:bg-teal-900 border border-teal-600 rounded-lg transition-colors whitespace-nowrap"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-300" />
              {currentRole === 'Teacher' ? 'Fasax & Mushahar' : 'Shaqaalaha & HR'}
            </button>
          )}
          {canAccessModule(currentRole, 'reports') && (
            <button
              onClick={() =>
                navigateToSubmenu(
                  'reports',
                  currentRole === 'Institute' ? 'students_rep' : 'mysql',
                  undefined,
                  currentRole === 'Institute' ? 'reports_students' : 'reports_mysql'
                )
              }
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-800/80 hover:bg-teal-900 border border-teal-600 rounded-lg transition-colors whitespace-nowrap"
            >
              {currentRole === 'Institute' ? (
                <>
                  <FileText className="w-3.5 h-3.5 text-amber-300" />
                  Warbixinno
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-amber-300" />
                  MySQL (.sql)
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Grid (Scoped by Role Permissions) */}
      <div ref={analyticsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Students */}
        <div
          onClick={() => canAccessModule(currentRole, 'students') && setActiveModule('students')}
          className={`bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all shadow-2xs group ${
            canAccessModule(currentRole, 'students') ? 'hover:border-[#005A51] cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Wadarta Ardayda</span>
            <Users className="w-4 h-4 text-[#005A51] dark:text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">{totalStudents}</span>
            <span className="text-[11px] text-emerald-600 font-semibold">{activeStudents} firfircoon</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Dhammaan {totalClasses} fasal oo diiwaangashan
          </div>
        </div>

        {/* Teachers & Staff */}
        <div
          onClick={() => canAccessModule(currentRole, 'teachers') && setActiveModule('teachers')}
          className={`bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all shadow-2xs group ${
            canAccessModule(currentRole, 'teachers') ? 'hover:border-[#005A51] cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Macallimiinta & Shaqaalaha</span>
            <GraduationCap className="w-4 h-4 text-[#005A51] dark:text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">
              {totalTeachers + totalStaff}
            </span>
            <span className="text-[11px] text-slate-500">{totalTeachers} Macallin / {totalStaff} Maamul</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Dhammaan heegan buuxa ku jira</div>
        </div>

        {/* Today's Attendance */}
        {canAccessModule(currentRole, 'attendance') && (
          <div
            onClick={() => setActiveModule('attendance')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#005A51] transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Xaadirinta Maanta</span>
              <CalendarCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">{attendanceRate}%</span>
              <span className="text-[11px] text-emerald-600 font-semibold">{presentCount} Jooga</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Xilliga subaxnimo (Qardho)</div>
          </div>
        )}

        {/* Finance KPIs: Visible ONLY to Finance-authorized roles */}
        {canAccessModule(currentRole, 'fees') && (
          <div
            onClick={() => setActiveModule('fees')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#005A51] transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Dakhliga La Qabtay</span>
              <DollarSign className="w-4 h-4 text-[#005A51] dark:text-teal-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-numbers text-[#005A51] dark:text-teal-400">
                ${totalFeeIncome.toFixed(2)}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">+EVC / Salaam</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Rasiidadka rasmiga ah</div>
          </div>
        )}

        {canAccessModule(currentRole, 'fees') && (
          <div
            onClick={() => setActiveModule('fees')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Baaqiga Ardayda Ku Haray</span>
              <AlertTriangle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-numbers text-amber-600">
                ${totalOutstanding.toFixed(2)}
              </span>
              <span className="text-[11px] text-amber-700 font-medium">{overdueInvoices.length} biil</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">U baahan daba-gal iyo wargelin</div>
          </div>
        )}

        {canAccessModule(currentRole, 'finance') && (
          <div
            onClick={() => setActiveModule('finance')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#005A51] transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Kharashaadka Guud</span>
              <TrendingUp className="w-4 h-4 text-slate-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">
                ${totalExpenses.toFixed(2)}
              </span>
              <span className="text-[11px] text-slate-500">Shidaal, Biyo, Qalab</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Foojarrada la oggolaaday</div>
          </div>
        )}

        {canAccessModule(currentRole, 'finance') && (
          <div
            onClick={() => setActiveModule('finance')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Haraaga Sanduuqa (Net)</span>
              <DollarSign className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-numbers text-emerald-700 dark:text-emerald-400">
                ${netCashBalance.toFixed(2)}
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">Togan (Positive)</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Khasnadda Machadka</div>
          </div>
        )}

        {/* HR Leaves KPI for HR Manager & Teacher */}
        {canAccessModule(currentRole, 'hr') && !canAccessModule(currentRole, 'finance') && (
          <div
            onClick={() => setActiveModule('hr')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#005A51] transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium">Codsiyada Fasaxyada</span>
              <Briefcase className="w-4 h-4 text-[#005A51] dark:text-teal-400 group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">
                {leaveRequests.filter((l) => l.status === 'Pending').length}
              </span>
              <span className="text-[11px] text-amber-600 font-semibold">Sugaya</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Maamulka fasaxyada & HR</div>
          </div>
        )}

        {/* Class Capacity Utilization */}
        <div
          onClick={() => canAccessModule(currentRole, 'classes') && setActiveModule('classes')}
          className={`bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-all shadow-2xs group ${
            canAccessModule(currentRole, 'classes') ? 'hover:border-[#005A51] cursor-pointer' : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Buuxsanaanta Fasallada</span>
            <Building className="w-4 h-4 text-[#005A51] dark:text-teal-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono-numbers text-slate-900 dark:text-slate-100">{capacityPct}%</span>
            <span className="text-[11px] text-slate-500 font-mono-numbers">
              {totalClasses} fasal · {totalStudents}/{totalCapacity}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-[#005A51] h-1.5 rounded-full"
              style={{ width: `${Math.min(100, capacityPct)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Student & Parent Messages (Support Tickets) — live */}
      {canAccessModule(currentRole, 'support') && (() => {
        const openTickets = tickets.filter((t) => t.status !== 'Resolved');
        const latest = [...openTickets]
          .sort((a, b) => {
            const la = a.messages[a.messages.length - 1]?.timestamp || a.createdAt;
            const lb = b.messages[b.messages.length - 1]?.timestamp || b.createdAt;
            return lb.localeCompare(la);
          })
          .slice(0, 5);
        return (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#005A51] dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Fariimaha Ardayda & Waalidiinta</h3>
                {openTickets.length > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300">
                    {openTickets.length} furan
                  </span>
                )}
              </div>
              <button
                onClick={() => setActiveModule('support')}
                className="text-xs font-semibold text-[#005A51] dark:text-teal-400 hover:underline"
              >
                Fur dhammaan
              </button>
            </div>
            {latest.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Ma jiraan fariimo furan hadda.</p>
            ) : (
              <div className="space-y-2">
                {latest.map((t) => {
                  const last = t.messages[t.messages.length - 1];
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveModule('support')}
                      className="w-full text-left p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{t.subject}</span>
                        <span className="text-[10px] text-slate-400 shrink-0">{last?.timestamp || t.createdAt}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                        <span className="font-semibold">{last?.sender || t.requesterName}:</span> {last?.text}
                      </p>
                      <div className="text-[10px] text-slate-400">
                        {t.ticketNumber} · {t.category} · {t.status}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Middle Row: Class Enrollment Distribution & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Enrollment Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Qeybsanaanta Ardayda ee Fasallada (Enrollment per Class)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-[#005A51] border border-teal-200">
                  {classes.length} Fasal
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Awoodda qaadista qolalka iyo tirada dhabta ah ee dhigata
              </p>
            </div>
            <button
              onClick={() => setActiveModule('classes')}
              className="text-xs font-semibold text-[#005A51] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              Maamul Fasallada <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
            {classes.map((cls) => {
              const enrolled = enrolledStudents.filter((s) => s.classId === cls.id).length;
              const safeCapacity = cls.capacity || 1;
              const pct = Math.round((enrolled / safeCapacity) * 100);
              const teacher = teachers.find((t) => t.id === cls.classTeacherId);
              const shift = cls.shift || 'Subax';

              return (
                <div key={cls.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800">{cls.name}</span>
                      <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                        Qeybta {cls.section}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                          shift === 'Galab'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : shift === 'Subax'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-800 text-white border border-slate-700'
                        }`}
                      >
                        {shift}
                      </span>
                      <span className="text-[11px] text-slate-400">· {cls.roomNumber}</span>
                      <span className="hidden sm:inline text-[11px] text-slate-500">
                        (Macallinka: {teacher?.fullName.split(' ')[0] || 'N/A'})
                      </span>
                    </div>
                    <div className="font-mono-numbers text-slate-700 shrink-0">
                      <span className="font-bold text-slate-900">{enrolled}</span>
                      <span className="text-slate-400">/{cls.capacity}</span>
                      <span className="ml-2 font-semibold text-[#005A51]">({pct}%)</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500 bg-[#005A51]"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Performing Students Leaderboard */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Ardayda Ugu Sarreeya</h3>
              </div>
              <button
                onClick={() => setActiveModule('exams')}
                className="text-xs font-semibold text-[#005A51] hover:underline"
              >
                Natiijooyinka
              </button>
            </div>

            <div className="space-y-3">
              {topStudents.map((item, index) => (
                <div
                  key={item.student.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        index === 0
                          ? 'bg-amber-400 text-slate-900 shadow-2xs'
                          : index === 1
                          ? 'bg-slate-300 text-slate-800'
                          : index === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.student.fullName}</div>
                      <div className="text-[10px] text-slate-500">
                        {item.student.id} · {item.student.section}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono-numbers font-bold text-emerald-700">
                      {item.avg}%
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">Heerka A+</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400 italic">
              Ku salaysan Imtixaanka Qiimaynta 2026–2027
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Upcoming Examinations & Urgent Fee Alerts & Announcements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Examinations & Important Milestones */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#005A51]" />
              <h3 className="text-sm font-bold text-slate-900">
                Jadwalka Imtixaanaadka & Dhacdooyinka
              </h3>
            </div>
            <button
              onClick={() => setActiveModule('exams')}
              className="text-xs font-semibold text-[#005A51] hover:underline"
            >
              Dhammaan Eeg
            </button>
          </div>

          <div className="space-y-3">
            {exams.map((exam) => (
              <div
                key={exam.id}
                className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors bg-white flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{exam.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        exam.status === 'Published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {exam.status === 'Published' ? 'La Daabacay' : 'Qabyo'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{exam.description}</p>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono-numbers">
                    Taariikhda: {exam.startDate} ilaa {exam.endDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Latest Announcements & Notices */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#005A51]" />
              <h3 className="text-sm font-bold text-slate-900">Ogeysiisyada Maamulka</h3>
            </div>
            <button
              onClick={() => setActiveModule('messaging')}
              className="text-xs font-semibold text-[#005A51] hover:underline"
            >
              Dir Ogeysiis
            </button>
          </div>

          <div className="space-y-3">
            {announcements.slice(0, 3).map((ann) => (
              <div
                key={ann.id}
                className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 truncate pr-2">{ann.title}</span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${
                      ann.priority === 'Urgent'
                        ? 'bg-red-100 text-red-800'
                        : ann.priority === 'High'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {ann.priority}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{ann.body}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Qore: {ann.author} ({ann.authorRole})</span>
                  <span>{ann.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
