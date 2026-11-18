/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { generateMySQLScript } from '../../utils/exportSql';
import { downloadSQLFile, downloadCSV } from '../../utils/exportCsv';
import {
  FileSpreadsheet,
  Database,
  Download,
  Copy,
  Check,
  Server,
  Code,
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export const ReportsModule: React.FC = () => {
  const {
    settings,
    students,
    classes,
    subjects,
    teachers,
    attendance,
    exams,
    marks,
    feeStructures,
    invoices,
    payments,
    incomes,
    expenses,
    staff,
    leaveRequests,
    payroll,
    timetable,
    announcements,
    tickets,
    navigationIntent,
    clearNavigationIntent,
    currentRole,
  } = useApp();

  const canSeeMySql =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Academic Manager' ||
    currentRole === 'Accountant';
  const canSeeFinancialRep =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Accountant';

  const [activeTab, setActiveTab] = useState<'mysql' | 'students_rep' | 'financial_rep' | 'academic_rep'>(() =>
    canSeeMySql ? 'mysql' : 'students_rep'
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (navigationIntent?.module !== 'reports') return;
    if (navigationIntent.tab === 'mysql' && canSeeMySql) {
      setActiveTab('mysql');
    } else if (navigationIntent.tab === 'financial_rep' && canSeeFinancialRep) {
      setActiveTab('financial_rep');
    } else if (navigationIntent.tab === 'students_rep' || navigationIntent.tab === 'academic_rep') {
      setActiveTab(navigationIntent.tab);
    }
    clearNavigationIntent();
  }, [navigationIntent, clearNavigationIntent, canSeeMySql, canSeeFinancialRep]);

  // Generate complete MySQL script
  const sqlContent = useMemo(() => {
    return generateMySQLScript({
      settings,
      students,
      classes,
      subjects,
      teachers,
      attendance,
      exams,
      marks,
      feeStructures,
      invoices,
      payments,
      expenses,
      staff,
      leaveRequests,
      payroll,
      timetable,
      announcements,
      tickets,
    });
  }, [
    settings,
    students,
    classes,
    subjects,
    teachers,
    attendance,
    exams,
    marks,
    feeStructures,
    invoices,
    payments,
    expenses,
    staff,
    leaveRequests,
    payroll,
    timetable,
    announcements,
    tickets,
  ]);

  const handleDownloadSQL = () => {
    downloadSQLFile('machadka_school_db.sql', sqlContent);
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(sqlContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadStudentsCSV = () => {
    const headers = ['ID', 'Roll', 'Magaca', 'Fasalka', 'Waalidka', 'Taleefanka', 'Xaaladda'];
    const rows = students.map((s) => {
      const cls = classes.find((c) => c.id === s.classId);
      return [s.id, s.rollNumber, s.fullName, `${cls?.name} (${s.section})`, s.guardianName, s.guardianPhone, s.status];
    });
    downloadCSV('warbixinta_ardayda_machadka.csv', headers, rows);
  };

  const handleDownloadFinanceCSV = () => {
    const headers = ['ID', 'Nooca / Biilka', 'Qofka / Ardayga', 'Taariikhda', 'Habka Bixinta', 'Reference', 'Cadadka ($)'];
    const rows = [
      ...incomes.map((inc) => [
        inc.id,
        `${inc.category} - ${inc.title}`,
        inc.receivedFrom,
        inc.date,
        inc.paymentMethod,
        inc.referenceNo,
        inc.amount,
      ]),
      ...payments.map((p) => {
        const st = students.find((s) => s.id === p.studentId);
        return [p.id, p.invoiceId, st?.fullName || p.studentId, p.paymentDate, p.paymentMethod, p.referenceNumber, p.amount];
      }),
    ];
    downloadCSV('warbixinta_dakhliga_machadka.csv', headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Warbixinada &amp; Dhismaha MySQL Schema (Reports &amp; XAMPP DB)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ka soo degso dhismaha database-ka oo dhammeystiran (.sql) oo loogu talagalay XAMPP Windows iyo warbixinnada guud.
          </p>
        </div>

        <div className="w-full lg:w-auto overflow-x-auto">
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-semibold whitespace-nowrap">
            {canSeeMySql && (
              <button
                onClick={() => setActiveTab('mysql')}
                className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeTab === 'mysql'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Database className="w-3.5 h-3.5 text-[#005A51] dark:text-teal-400" />
                MySQL Schema (.sql)
              </button>
            )}
            <button
              onClick={() => setActiveTab('students_rep')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'students_rep'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Ardayda
            </button>
            {canSeeFinancialRep && (
              <button
                onClick={() => setActiveTab('financial_rep')}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  activeTab === 'financial_rep'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Maaliyadda
              </button>
            )}
            <button
              onClick={() => setActiveTab('academic_rep')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                activeTab === 'academic_rep'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-bold'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Waxbarashada
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: MYSQL SCHEMA & XAMPP GUIDE */}
      {activeTab === 'mysql' && (
        <div className="space-y-5">
          {/* Action Callout */}
          <div className="bg-gradient-to-r from-teal-900 via-[#005A51] to-teal-900 text-white p-5 rounded-xl border border-teal-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-teal-950/60 px-2.5 py-0.5 rounded-full border border-amber-400/30">
                  MySQL 8.0+ / MariaDB 10.4+ DDL Script
                </span>
                <span className="text-xs text-teal-100 font-mono-numbers">
                  utf8mb4_unicode_ci
                </span>
              </div>
              <h3 className="text-base font-bold">
                Soo Degso Faylka Dhismaha Database-ka: <code className="text-amber-300">machadka_school_db.sql</code>
              </h3>
              <p className="text-xs text-teal-100/90 max-w-2xl">
                Wuxuu si toos ah u dhisayaa database-ka, dhammaan 14-ka miis (Tables), furayaasha xiriirka (Foreign Keys), iyo xogta tusaalaha ah ee Machadka Khadiija ee Qardho.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={handleCopySQL}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-800/80 hover:bg-teal-700 border border-teal-600 rounded-lg transition-colors whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Waa La Koobiyay!' : 'Koobiyeey SQL'}
              </button>
              <button
                onClick={handleDownloadSQL}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                Soo Degso .sql
              </button>
            </div>
          </div>

          {/* Local Windows XAMPP Step-by-Step Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <span className="w-5 h-5 rounded-full bg-[#005A51] text-white flex items-center justify-center text-[10px]">1</span>
                <span>Bilaab XAMPP (Apache & MySQL)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fur <strong>XAMPP Control Panel</strong> ee kombuyuutarkaaga Windows, ka dibna guji badhanka <strong>Start</strong> ee ku aaddan <em>Apache</em> iyo <em>MySQL</em>.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <span className="w-5 h-5 rounded-full bg-[#005A51] text-white flex items-center justify-center text-[10px]">2</span>
                <span>Fur phpMyAdmin & Import</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ka fur browser-kaaga cinwaanka <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-800">http://localhost/phpmyadmin</code>, guji qaybta <strong>Import</strong>, ka dibna dooro faylka <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">machadka_school_db.sql</code>.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                <span className="w-5 h-5 rounded-full bg-[#005A51] text-white flex items-center justify-center text-[10px]">3</span>
                <span>Maamulka Akoonnada &amp; Amniga</span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div>Furayaasha sirta ah waxaa lagu keydiyaa qaab qarsoon (bcrypt).</div>
                <div>Ka maamul akoonnada: <strong>Settings &rarr; Akoonnada &amp; Furayaasha</strong></div>
              </div>
            </div>
          </div>

          {/* In-Browser SQL Syntax Viewer */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-md">
            <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-teal-400" />
                <span className="font-mono text-slate-200">machadka_school_db.sql</span>
                <span className="text-[10px] text-slate-500 font-mono">({(sqlContent.length / 1024).toFixed(1)} KB)</span>
              </div>

              <button
                onClick={handleCopySQL}
                className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Waa La Koobiyay' : 'Koobiyeey Dhammaan'}</span>
              </button>
            </div>

            <pre className="p-4 text-[11px] font-mono text-teal-200/90 overflow-x-auto max-h-[380px] leading-relaxed selection:bg-teal-800">
              {sqlContent}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 2: STUDENTS REPORT */}
      {activeTab === 'students_rep' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Warbixinta Guud ee Ardayda Machadka ({students.length} Arday)
            </span>
            <button
              onClick={handleDownloadStudentsCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005A51] text-white hover:bg-[#004841] rounded-lg font-semibold shadow-2xs"
            >
              <Download className="w-3 h-3" />
              Soo Degso CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="px-4 py-2.5">ID No</th>
                  <th className="px-4 py-2.5">Magaca Buuxa</th>
                  <th className="px-3 py-2.5">Fasalka</th>
                  <th className="px-3 py-2.5">Waalidka</th>
                  <th className="px-3 py-2.5">Taleefanka</th>
                  <th className="px-3 py-2.5">Dhiigga</th>
                  <th className="px-3 py-2.5">Xaaladda</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => {
                  const cls = classes.find((c) => c.id === st.classId);
                  return (
                    <tr key={st.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 font-mono-numbers font-bold text-[#005A51]">{st.id}</td>
                      <td className="px-4 py-2 font-semibold text-slate-900">{st.fullName}</td>
                      <td className="px-3 py-2">{cls?.name} ({st.section})</td>
                      <td className="px-3 py-2 text-slate-700">{st.guardianName}</td>
                      <td className="px-3 py-2 font-mono-numbers text-slate-500">{st.guardianPhone}</td>
                      <td className="px-3 py-2 font-mono-numbers font-bold text-red-600">{st.bloodGroup}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                          {st.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FINANCIAL REPORT */}
      {activeTab === 'financial_rep' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">
              Warbixinta Dakhliga iyo Bixinta Rasiidadka ({incomes.length + payments.length} Diiwaan)
            </span>
            <button
              onClick={handleDownloadFinanceCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005A51] text-white hover:bg-[#004841] rounded-lg font-semibold shadow-2xs"
            >
              <Download className="w-3 h-3" />
              Soo Degso CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="px-4 py-2.5">Diiwaan No</th>
                  <th className="px-4 py-2.5">Faahfaahin / Ardayga</th>
                  <th className="px-3 py-2.5">Taariikhda</th>
                  <th className="px-3 py-2.5">Habka</th>
                  <th className="px-3 py-2.5">Tixraaca</th>
                  <th className="px-4 py-2.5 text-right">Cadadka</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {incomes.length === 0 && payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Dakhliyada hadda waa $0.00.
                    </td>
                  </tr>
                ) : (
                  <>
                    {incomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 font-mono-numbers font-bold text-[#005A51]">{inc.id}</td>
                        <td className="px-4 py-2 font-semibold text-slate-900">
                          {inc.title} ({inc.receivedFrom})
                        </td>
                        <td className="px-3 py-2 font-mono-numbers text-slate-500">{inc.date}</td>
                        <td className="px-3 py-2">{inc.paymentMethod}</td>
                        <td className="px-3 py-2 font-mono-numbers text-slate-500">{inc.referenceNo}</td>
                        <td className="px-4 py-2 text-right font-mono-numbers font-bold text-emerald-700">
                          ${inc.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {payments.map((p) => {
                      const st = students.find((s) => s.id === p.studentId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 font-mono-numbers font-bold text-[#005A51]">{p.id}</td>
                          <td className="px-4 py-2 font-semibold text-slate-900">{st?.fullName}</td>
                          <td className="px-3 py-2 font-mono-numbers text-slate-500">{p.paymentDate}</td>
                          <td className="px-3 py-2">{p.paymentMethod}</td>
                          <td className="px-3 py-2 font-mono-numbers text-slate-500">{p.referenceNumber}</td>
                          <td className="px-4 py-2 text-right font-mono-numbers font-bold text-emerald-700">
                            ${p.amount.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ACADEMIC REPORT */}
      {activeTab === 'academic_rep' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-100">
              Warbixinta Natiijooyinka &amp; Heerka Fasallada ({classes.length} Fasal · {exams.length} Imtixaan)
            </span>
            <button
              type="button"
              onClick={() => {
                const headers = ['Class ID', 'Class Name', 'Section', 'Shift', 'Students', 'Marks Entered', 'Average (%)'];
                const rows = classes.map((cls) => {
                  const clsStuIds = new Set(students.filter((s) => s.classId === cls.id).map((s) => s.id));
                  const clsMarks = marks.filter((m) => clsStuIds.has(m.studentId));
                  const avg =
                    clsMarks.length > 0
                      ? Math.round((clsMarks.reduce((acc, m) => acc + (m.marksObtained / (m.maxMarks || 100)) * 100, 0) / clsMarks.length) * 10) / 10
                      : 0;
                  return [cls.id, cls.name, cls.section, cls.shift || 'Subax', clsStuIds.size, clsMarks.length, avg];
                });
                downloadCSV('warbixinta_waxbarashada_machadka.csv', headers, rows);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#005A51] text-white hover:bg-[#004841] rounded-lg font-semibold shadow-2xs"
            >
              <Download className="w-3 h-3" />
              Soo Degso CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                  <th className="px-4 py-2.5">Fasalka</th>
                  <th className="px-3 py-2.5">Xilliga</th>
                  <th className="px-3 py-2.5">Ardayda</th>
                  <th className="px-3 py-2.5">Dhibcaha La Geliyey</th>
                  <th className="px-4 py-2.5 text-right">Celceliska (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {classes.map((cls) => {
                  const clsStuIds = new Set(students.filter((s) => s.classId === cls.id).map((s) => s.id));
                  const clsMarks = marks.filter((m) => clsStuIds.has(m.studentId));
                  const avg =
                    clsMarks.length > 0
                      ? Math.round((clsMarks.reduce((acc, m) => acc + (m.marksObtained / (m.maxMarks || 100)) * 100, 0) / clsMarks.length) * 10) / 10
                      : 0;
                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                        {cls.name} ({cls.section})
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{cls.shift || 'Subax'}</td>
                      <td className="px-3 py-2.5 font-mono-numbers">{clsStuIds.size}</td>
                      <td className="px-3 py-2.5 font-mono-numbers">{clsMarks.length}</td>
                      <td className="px-4 py-2.5 text-right font-mono-numbers font-bold text-[#005A51] dark:text-teal-400">
                        {avg}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
