/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FeePayment, StudentInvoice } from '../../types';
import { downloadCSV } from '../../utils/exportCsv';
import {
  CreditCard,
  PlusCircle,
  Printer,
  DollarSign,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

export const FeesModule: React.FC = () => {
  const {
    feeStructures,
    invoices,
    payments,
    students,
    classes,
    generateClassInvoices,
    recordPayment,
    updatePayment,
    deletePayment,
    openPrint,
    settings,
    currentRole,
    currentUser,
    focusedRecordIntent,
    setFocusedRecordIntent,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const canManageBilling =
    currentRole === 'Super Admin' ||
    currentRole === 'Administrator' ||
    currentRole === 'Accountant';

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'structures'>('invoices');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (focusedRecordIntent?.type === 'invoice') {
      setActiveTab('invoices');
      setFilterStatus('all');
      setSearchTerm(focusedRecordIntent.id);
      setFocusedRecordIntent(null);
    }
  }, [focusedRecordIntent, setFocusedRecordIntent]);

  useEffect(() => {
    if (navigationIntent?.module !== 'fees') return;
    if (navigationIntent.tab === 'payments' || navigationIntent.tab === 'structures' || navigationIntent.tab === 'invoices') {
      setActiveTab(navigationIntent.tab);
    }
    clearNavigationIntent();
  }, [navigationIntent, clearNavigationIntent]);

  // Modals
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isBatchInvoiceOpen, setIsBatchInvoiceOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<StudentInvoice | null>(null);
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(null);
  const [paymentEditForm, setPaymentEditForm] = useState({
    amount: 0,
    paymentDate: '',
    paymentMethod: 'EVC Plus' as FeePayment['paymentMethod'],
    referenceNumber: '',
    notes: '',
  });
  const [confirmDeletePayment, setConfirmDeletePayment] = useState<FeePayment | null>(null);

  // Record Payment Form
  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    studentId: '',
    amount: 25,
    paymentDate: new Date().toISOString().substring(0, 10),
    paymentMethod: 'EVC Plus' as const,
    referenceNumber: `EVC-${Math.floor(100000 + Math.random() * 900000)}`,
    receivedBy: currentUser?.fullName || currentRole,
    notes: 'Lacagta bisha',
  });

  // Batch Invoice Form
  const [batchForm, setBatchForm] = useState({
    classId: classes[0]?.id || 'CLS-1A',
    feeStructureId: feeStructures[0]?.id || 'FEE-01',
    month: 'November 2026',
    dueDate: '2026-11-10',
  });

  const filteredInvoices = invoices.filter((inv) => {
    const student = students.find((s) => s.id === inv.studentId);
    const matchesSearch =
      inv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student?.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleOpenPaymentForInvoice = (inv: StudentInvoice) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentForm({
      invoiceId: inv.id,
      studentId: inv.studentId,
      amount: inv.balance,
      paymentDate: new Date().toISOString().substring(0, 10),
      paymentMethod: 'EVC Plus',
      referenceNumber: `EVC-${Math.floor(100000 + Math.random() * 900000)}`,
      receivedBy: currentUser?.fullName || currentRole,
      notes: `Lacag-bixinta: ${inv.title}`,
    });
    setIsRecordPaymentOpen(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.invoiceId || paymentForm.amount <= 0) return;

    const createdPayment = recordPayment(paymentForm);
    setIsRecordPaymentOpen(false);

    // Offer to print receipt
    const student = students.find((s) => s.id === paymentForm.studentId);
    const inv = invoices.find((i) => i.id === paymentForm.invoiceId);
    openPrint({
      type: 'payment_receipt',
      payment: createdPayment,
      student,
      invoice: inv,
    });
  };

  const handleExecuteBatchInvoices = (e: React.FormEvent) => {
    e.preventDefault();
    generateClassInvoices(
      batchForm.classId,
      batchForm.feeStructureId,
      batchForm.month,
      batchForm.dueDate
    );
    setIsBatchInvoiceOpen(false);
  };

  const handleExportInvoicesCSV = () => {
    const headers = [
      'Invoice ID',
      'Student ID',
      'Student Name',
      'Title / Fee',
      'Due Date',
      'Total Amount ($)',
      'Paid Amount ($)',
      'Balance ($)',
      'Status',
      'Month',
    ];
    const rows = filteredInvoices.map((inv) => {
      const st = students.find((s) => s.id === inv.studentId);
      return [
        inv.id,
        inv.studentId,
        st?.fullName || 'N/A',
        inv.title,
        inv.dueDate,
        inv.amount,
        inv.paidAmount,
        inv.balance,
        inv.status,
        inv.month,
      ];
    });
    downloadCSV(`biilasha_machadka_khadiija_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Biilasha & Rasiidadka (Fee Billing & Invoices)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Maamulka khidmadaha waxbarashada, soo saaridda biilasha kooxeed (Batch Invoices), iyo bixinta rasiidadka.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={handleExportInvoicesCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Soo Degso CSV
          </button>
          {canManageBilling && (
            <button
              onClick={() => setIsBatchInvoiceOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              Soo Saar Biilal Fasal
            </button>
          )}
          <button
            onClick={() => {
              const firstUnpaid = invoices.find((i) => i.balance > 0) || invoices[0];
              if (firstUnpaid) handleOpenPaymentForInvoice(firstUnpaid);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs transition-colors"
          >
            <DollarSign className="w-3.5 h-3.5" />
            Xaree Lacag-bixin
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <div className="flex gap-2 text-xs font-semibold whitespace-nowrap">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'invoices' ? 'bg-[#005A51] text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Liiska Biilasha ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'payments' ? 'bg-[#005A51] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Rasiidadka La Qabtay ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('structures')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'structures' ? 'bg-[#005A51] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Qaab-dhismeedka Khidmadaha
          </button>
        </div>
      </div>

      {/* TAB 1: INVOICES LIST */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Raadi biil, arday, ama lambar..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Xaaladda:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-medium"
              >
                <option value="all">Dhammaan</option>
                <option value="Paid">La Bixiyay (Paid)</option>
                <option value="Partial">Qeyb La Bixiyay (Partial)</option>
                <option value="Unpaid">Aan La Bixin (Unpaid)</option>
                <option value="Overdue">Dhaaftay (Overdue)</option>
              </select>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="px-4 py-3">Biilka (Invoice ID)</th>
                  <th className="px-4 py-3">Ardayga (Student)</th>
                  <th className="px-3 py-3">Fahfaahinta</th>
                  <th className="px-3 py-3 text-right">Cadadka ($)</th>
                  <th className="px-3 py-3 text-right">La Bixiyay ($)</th>
                  <th className="px-3 py-3 text-right">Baaqiga ($)</th>
                  <th className="px-3 py-3 text-center">Xaaladda</th>
                  <th className="px-4 py-3 text-right">Ficil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => {
                  const st = students.find((s) => s.id === inv.studentId);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono-numbers font-bold text-[#005A51]">
                        {inv.id}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{st?.fullName || 'Arday'}</div>
                        <div className="text-[11px] font-mono-numbers text-slate-400">{inv.studentId}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">{inv.title}</div>
                        <div className="text-[11px] text-slate-400">Due: {inv.dueDate}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-mono-numbers font-bold text-slate-900">
                        ${inv.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono-numbers text-emerald-700 font-semibold">
                        ${inv.paidAmount.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right font-mono-numbers font-bold text-red-600">
                        ${inv.balance.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : inv.status === 'Partial'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : inv.status === 'Overdue'
                              ? 'bg-red-50 text-red-800 border border-red-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.balance > 0 ? (
                          <button
                            onClick={() => handleOpenPaymentForInvoice(inv)}
                            className="px-2.5 py-1 bg-[#005A51] text-white hover:bg-[#004841] rounded text-[11px] font-semibold transition-colors shadow-2xs"
                          >
                            Xaree
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-semibold">Dhammaystiran</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PAYMENTS & OFFICIAL RECEIPTS */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="px-4 py-3">Rasiidka (Receipt ID)</th>
                  <th className="px-4 py-3">Ardayga (Student)</th>
                  <th className="px-3 py-3">Taariikhda & Habka</th>
                  <th className="px-3 py-3">Reference No</th>
                  <th className="px-3 py-3 text-right">Cadadka La Bixiyay</th>
                  <th className="px-4 py-3 text-right">Daabac / Wax Ka Beddel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Ma jiro wax rasiid lacag-bixin ah oo hadda diiwaangashan ($0.00).
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const st = students.find((s) => s.id === p.studentId);
                    const inv = invoices.find((i) => i.id === p.invoiceId);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono-numbers font-bold text-[#005A51]">
                          {p.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{st?.fullName || 'Arday'}</div>
                          <div className="text-[11px] text-slate-400 font-mono-numbers">{p.studentId}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-slate-800 block">{p.paymentMethod}</span>
                          <span className="text-[11px] text-slate-400 font-mono-numbers">{p.paymentDate}</span>
                        </td>
                        <td className="px-3 py-3 font-mono-numbers text-slate-600">
                          {p.referenceNumber}
                        </td>
                        <td className="px-3 py-3 text-right font-mono-numbers font-bold text-[#005A51] text-sm">
                          ${p.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                openPrint({
                                  type: 'payment_receipt',
                                  payment: p,
                                  student: st,
                                  invoice: inv,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-teal-50 text-[#005A51] hover:bg-teal-100 border border-teal-200 rounded text-[11px] font-bold transition-colors"
                            >
                              <Printer className="w-3 h-3" />
                              Rasiid
                            </button>
                            {canManageBilling && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingPayment(p);
                                    setPaymentEditForm({
                                      amount: p.amount,
                                      paymentDate: p.paymentDate,
                                      paymentMethod: p.paymentMethod,
                                      referenceNumber: p.referenceNumber,
                                      notes: p.notes || '',
                                    });
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Wax ka beddel rasiidka"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeletePayment(p)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Tirtir rasiidka"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
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
        </div>
      )}

      {/* TAB 3: FEE STRUCTURES */}
      {activeTab === 'structures' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {feeStructures.map((f) => (
            <div
              key={f.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-mono-numbers font-bold text-[#005A51] bg-teal-50 px-2 py-0.5 rounded">
                  {f.id}
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-2">{f.name}</h4>
                <p className="text-xs text-slate-500 mt-1">{f.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                <span className="text-xs text-slate-400">Cadadka Rasmiga ah:</span>
                <span className="text-xl font-bold font-mono-numbers text-[#005A51]">
                  ${f.amount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Record Payment Modal */}
      {isRecordPaymentOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Xaree Lacag-bixin (Record Payment)</h3>
              <button onClick={() => setIsRecordPaymentOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Ardayga & Biilka:</label>
                <select
                  value={paymentForm.invoiceId}
                  onChange={(e) => {
                    const inv = invoices.find((i) => i.id === e.target.value);
                    if (inv) {
                      setPaymentForm({
                        ...paymentForm,
                        invoiceId: inv.id,
                        studentId: inv.studentId,
                        amount: inv.balance,
                      });
                    }
                  }}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 font-semibold"
                >
                  {invoices
                    .filter((i) => i.balance > 0)
                    .map((inv) => {
                      const st = students.find((s) => s.id === inv.studentId);
                      return (
                        <option key={inv.id} value={inv.id}>
                          {st?.fullName} ({inv.title} - Baaqi: ${inv.balance})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Cadadka La Bixinayo ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    min={1}
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Habka Lacag-bixinta:</label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="EVC Plus">EVC Plus (Telesom / Golis)</option>
                    <option value="Salaam Bank">Salaam Somali Bank</option>
                    <option value="Dahabshiil / eDahab">Dahabshiil / eDahab</option>
                    <option value="Cash">Lacag Caddaan ah (Cash)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Reference No (Tixraaca):</label>
                  <input
                    type="text"
                    required
                    value={paymentForm.referenceNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Taariikhda:</label>
                  <input
                    type="date"
                    required
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Qasnajiga Xareeyay:</label>
                <input
                  type="text"
                  value={paymentForm.receivedBy}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receivedBy: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Faahfaahin / Xusuusin:</label>
                <textarea
                  rows={2}
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  Xaree & Daabac Rasiid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Invoice Modal */}
      {isBatchInvoiceOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Soo Saar Biilasha Fasalka (Batch Invoicing)</h3>
              <button onClick={() => setIsBatchInvoiceOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteBatchInvoices} className="space-y-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Dooro Fasalka:</label>
                <select
                  value={batchForm.classId}
                  onChange={(e) => setBatchForm({ ...batchForm, classId: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                >
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.section}) · {cls.shift || 'Subax'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Nooca Khidmadda (Fee Type):</label>
                <select
                  value={batchForm.feeStructureId}
                  onChange={(e) => setBatchForm({ ...batchForm, feeStructureId: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold"
                >
                  {feeStructures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} - ${f.amount}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Bisha:</label>
                  <input
                    type="text"
                    required
                    value={batchForm.month}
                    onChange={(e) => setBatchForm({ ...batchForm, month: e.target.value })}
                    placeholder="November 2026"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Wakhtiga Ugu Danbeeya (Due):</label>
                  <input
                    type="date"
                    required
                    value={batchForm.dueDate}
                    onChange={(e) => setBatchForm({ ...batchForm, dueDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBatchInvoiceOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs"
                >
                  Soo Saar Biilasha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Wax Ka Beddel Rasiidka ({editingPayment.id})</h3>
              <button onClick={() => setEditingPayment(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (paymentEditForm.amount <= 0) return;
                updatePayment(editingPayment.id, paymentEditForm);
                setEditingPayment(null);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Cadadka ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentEditForm.amount}
                    onChange={(e) => setPaymentEditForm({ ...paymentEditForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Habka Bixinta:</label>
                  <select
                    value={paymentEditForm.paymentMethod}
                    onChange={(e) =>
                      setPaymentEditForm({
                        ...paymentEditForm,
                        paymentMethod: e.target.value as FeePayment['paymentMethod'],
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  >
                    <option value="EVC Plus">EVC Plus</option>
                    <option value="Salaam Bank">Salaam Bank</option>
                    <option value="Dahabshiil / eDahab">Dahabshiil / eDahab</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Reference No:</label>
                  <input
                    type="text"
                    required
                    value={paymentEditForm.referenceNumber}
                    onChange={(e) => setPaymentEditForm({ ...paymentEditForm, referenceNumber: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Taariikhda:</label>
                  <input
                    type="date"
                    required
                    value={paymentEditForm.paymentDate}
                    onChange={(e) => setPaymentEditForm({ ...paymentEditForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Faahfaahin:</label>
                <textarea
                  rows={2}
                  value={paymentEditForm.notes}
                  onChange={(e) => setPaymentEditForm({ ...paymentEditForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs"
                >
                  Keydi Isbeddelka
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Payment Confirm Modal */}
      {confirmDeletePayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Tirtir Rasiidka ({confirmDeletePayment.id})?</h3>
                <p className="text-slate-500 mt-1">
                  Lacagta rasiidkan (${confirmDeletePayment.amount.toFixed(2)}) waa laga tirtiri doonaa dakhliga, biilka ardaygana dib ayuu u furmi doonaa.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDeletePayment(null)}
                className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Maya
              </button>
              <button
                type="button"
                onClick={() => {
                  deletePayment(confirmDeletePayment.id);
                  setConfirmDeletePayment(null);
                }}
                className="px-4 py-1.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
              >
                Haa, Tirtir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
