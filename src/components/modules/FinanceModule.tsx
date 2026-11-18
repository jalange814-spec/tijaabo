/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ExpenseVoucher, FeePayment, IncomeRecord } from '../../types';
import { downloadCSV } from '../../utils/exportCsv';
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Download,
  PlusCircle,
  Pencil,
  Trash2,
  RotateCcw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';

const INCOME_CATEGORIES: { value: IncomeRecord['category']; somali: string }[] = [
  { value: 'Tuition & Fees', somali: 'Khidmadaha Waxbarashada' },
  { value: 'Admissions & Registration', somali: 'Diiwaangelinta Ardayda Cusub' },
  { value: 'Donations & Zakat', somali: 'Sadaqooyinka & Deeqaha' },
  { value: 'Books & Uniforms', somali: 'Buugaagta & Dharka Dugsiga' },
  { value: 'Grants & Support', somali: 'Taageerada & Deeqaha Hay’adaha' },
  { value: 'Other Income', somali: 'Dakhliyada Kale' },
];

const EXPENSE_CATEGORIES: { value: ExpenseVoucher['category']; somali: string }[] = [
  { value: 'Fuel & Generator', somali: 'Shidaalka Matoorka' },
  { value: 'Utilities', somali: 'Biyaha & Korontada' },
  { value: 'Educational Materials', somali: 'Qalabka Waxbarashada' },
  { value: 'Maintenance', somali: 'Dayactirka Dhismaha' },
  { value: 'Administrative', somali: 'Maamulka & Xafiiska' },
  { value: 'Salaries', somali: 'Mushaharka Shaqaalaha' },
];

export const FinanceModule: React.FC = () => {
  const {
    incomes,
    addIncome,
    updateIncome,
    deleteIncome,
    zeroAllIncomes,
    payments,
    updatePayment,
    deletePayment,
    students,
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    updateExpenseStatus,
    settings,
    navigationIntent,
    clearNavigationIntent,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'incomes' | 'expenses'>('incomes');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    if (navigationIntent?.module !== 'finance') return;
    if (navigationIntent.tab === 'expenses' || navigationIntent.tab === 'incomes') {
      setActiveTab(navigationIntent.tab);
      setFilterCategory('all');
    }
    clearNavigationIntent();
  }, [navigationIntent, clearNavigationIntent]);

  // Income Add/Edit Modal State
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [incomeForm, setIncomeForm] = useState<Omit<IncomeRecord, 'id'>>({
    date: new Date().toISOString().substring(0, 10),
    category: 'Tuition & Fees',
    categorySomali: 'Khidmadaha Waxbarashada',
    title: '',
    amount: 0,
    receivedFrom: '',
    paymentMethod: 'EVC Plus',
    referenceNo: '',
    receivedBy: 'Cali Xasan (Accountant)',
    notes: '',
  });

  // Payment Edit Modal State
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(null);
  const [paymentEditForm, setPaymentEditForm] = useState<{
    amount: number;
    paymentDate: string;
    paymentMethod: FeePayment['paymentMethod'];
    referenceNumber: string;
    receivedBy: string;
    notes: string;
  }>({
    amount: 0,
    paymentDate: '',
    paymentMethod: 'EVC Plus',
    referenceNumber: '',
    receivedBy: '',
    notes: '',
  });

  // Expense Add/Edit Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<Omit<ExpenseVoucher, 'id'>>({
    date: new Date().toISOString().substring(0, 10),
    category: 'Fuel & Generator',
    categorySomali: 'Shidaalka Matoorka',
    title: '',
    amount: 50,
    paidTo: '',
    paymentMethod: 'EVC Plus',
    referenceNo: '',
    approvedBy: settings.principalName,
    status: 'Approved',
    notes: '',
  });

  // Confirmation Modal State (for Delete & Zero All Incomes)
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'delete_income'; id: string; label: string }
    | { type: 'delete_payment'; id: string; label: string }
    | { type: 'delete_expense'; id: string; label: string }
    | { type: 'zero_incomes' }
    | null
  >(null);

  // Aggregates
  const totalGeneralIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalPaymentsIncome = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalIncome = totalGeneralIncome + totalPaymentsIncome;

  const totalApprovedExpenses = expenses
    .filter((e) => e.status === 'Approved')
    .reduce((sum, e) => sum + e.amount, 0);
  const netBalance = totalIncome - totalApprovedExpenses;

  // Category breakdown for Expenses
  const expenseCategoryTotals: { [cat: string]: number } = {};
  expenses
    .filter((e) => e.status === 'Approved')
    .forEach((e) => {
      expenseCategoryTotals[e.category] = (expenseCategoryTotals[e.category] || 0) + e.amount;
    });

  // Category breakdown for Incomes
  const incomeCategoryTotals: { [cat: string]: number } = {};
  incomes.forEach((inc) => {
    incomeCategoryTotals[inc.category] = (incomeCategoryTotals[inc.category] || 0) + inc.amount;
  });
  if (totalPaymentsIncome > 0) {
    incomeCategoryTotals['Student Fee Receipts'] = totalPaymentsIncome;
  }

  // Filtered Lists
  const filteredIncomes = incomes.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.receivedFrom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.referenceNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || inc.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredPayments = payments.filter((p) => {
    const st = students.find((s) => s.id === p.studentId);
    return (
      p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (st?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.paidTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.referenceNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || exp.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  // Income Handlers
  const handleOpenAddIncome = () => {
    setEditingIncomeId(null);
    setIncomeForm({
      date: new Date().toISOString().substring(0, 10),
      category: 'Tuition & Fees',
      categorySomali: 'Khidmadaha Waxbarashada',
      title: '',
      amount: 0,
      receivedFrom: '',
      paymentMethod: 'EVC Plus',
      referenceNo: `EVC-${Math.floor(100000 + Math.random() * 900000)}`,
      receivedBy: 'Cali Xasan (Accountant)',
      notes: '',
    });
    setIsIncomeModalOpen(true);
  };

  const handleOpenEditIncome = (inc: IncomeRecord) => {
    setEditingIncomeId(inc.id);
    setIncomeForm({
      date: inc.date,
      category: inc.category,
      categorySomali: inc.categorySomali,
      title: inc.title,
      amount: inc.amount,
      receivedFrom: inc.receivedFrom,
      paymentMethod: inc.paymentMethod,
      referenceNo: inc.referenceNo,
      receivedBy: inc.receivedBy,
      notes: inc.notes || '',
    });
    setIsIncomeModalOpen(true);
  };

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.title.trim() || incomeForm.amount <= 0) return;
    if (editingIncomeId) {
      updateIncome(editingIncomeId, incomeForm);
    } else {
      addIncome(incomeForm);
    }
    setIsIncomeModalOpen(false);
    setEditingIncomeId(null);
  };

  // Payment Edit Handler
  const handleOpenEditPayment = (p: FeePayment) => {
    setEditingPayment(p);
    setPaymentEditForm({
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      receivedBy: p.receivedBy,
      notes: p.notes || '',
    });
  };

  const handleSavePaymentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || paymentEditForm.amount <= 0) return;
    updatePayment(editingPayment.id, paymentEditForm);
    setEditingPayment(null);
  };

  // Expense Handlers
  const handleOpenAddExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm({
      date: new Date().toISOString().substring(0, 10),
      category: 'Fuel & Generator',
      categorySomali: 'Shidaalka Matoorka',
      title: '',
      amount: 50,
      paidTo: '',
      paymentMethod: 'EVC Plus',
      referenceNo: `EVC-${Math.floor(100000 + Math.random() * 900000)}`,
      approvedBy: settings.principalName,
      status: 'Approved',
      notes: '',
    });
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (exp: ExpenseVoucher) => {
    setEditingExpenseId(exp.id);
    setExpenseForm({
      date: exp.date,
      category: exp.category,
      categorySomali: exp.categorySomali,
      title: exp.title,
      amount: exp.amount,
      paidTo: exp.paidTo,
      paymentMethod: exp.paymentMethod,
      referenceNo: exp.referenceNo,
      approvedBy: exp.approvedBy,
      status: exp.status,
      notes: exp.notes || '',
    });
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.title.trim() || expenseForm.amount <= 0) return;
    if (editingExpenseId) {
      updateExpense(editingExpenseId, expenseForm);
    } else {
      addExpense(expenseForm);
    }
    setIsExpenseModalOpen(false);
    setEditingExpenseId(null);
  };

  // Confirm Execution
  const handleConfirmExecute = () => {
    if (!confirmAction) return;
    if (confirmAction.type === 'delete_income') {
      deleteIncome(confirmAction.id);
    } else if (confirmAction.type === 'delete_payment') {
      deletePayment(confirmAction.id);
    } else if (confirmAction.type === 'delete_expense') {
      deleteExpense(confirmAction.id);
    } else if (confirmAction.type === 'zero_incomes') {
      zeroAllIncomes();
    }
    setConfirmAction(null);
  };

  // CSV Exports
  const handleExportCSV = () => {
    if (activeTab === 'incomes') {
      const headers = [
        'Income ID',
        'Date',
        'Category',
        'Title / Description',
        'Amount ($)',
        'Received From',
        'Payment Method',
        'Reference No',
        'Received By',
      ];
      const rows = [
        ...incomes.map((inc) => [
          inc.id,
          inc.date,
          inc.category,
          inc.title,
          inc.amount,
          inc.receivedFrom,
          inc.paymentMethod,
          inc.referenceNo,
          inc.receivedBy,
        ]),
        ...payments.map((p) => {
          const st = students.find((s) => s.id === p.studentId);
          return [
            p.id,
            p.paymentDate,
            'Student Fee Receipt',
            p.notes || `Biilka ${p.invoiceId}`,
            p.amount,
            st?.fullName || p.studentId,
            p.paymentMethod,
            p.referenceNumber,
            p.receivedBy,
          ];
        }),
      ];
      downloadCSV(`dakhliyada_machadka_khadiija_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
    } else {
      const headers = [
        'Voucher ID',
        'Date',
        'Category',
        'Title / Description',
        'Amount ($)',
        'Paid To',
        'Payment Method',
        'Reference No',
        'Status',
      ];
      const rows = expenses.map((e) => [
        e.id,
        e.date,
        e.category,
        e.title,
        e.amount,
        e.paidTo,
        e.paymentMethod,
        e.referenceNo,
        e.status,
      ]);
      downloadCSV(`kharashaadka_machadka_khadiija_${new Date().toISOString().substring(0, 10)}.csv`, headers, rows);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Maaliyadda, Dakhliyada & Kharashaadka (Accounts, Incomes & Expenses)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Geli, wax ka beddel, ama tirtir dakhliyada cusub iyo foojarrada kharashaadka ee sanduuqa dugsiga.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setConfirmAction({ type: 'zero_incomes' })}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition-colors cursor-pointer"
            title="Dhammaan dakhliyada ka dhig $0.00 (Eber)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ka Dhig $0.00 (Zero Incomes)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Soo Degso CSV</span>
          </button>

          <button
            onClick={handleOpenAddIncome}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Geli Dakhli Cusub</span>
          </button>

          <button
            onClick={handleOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Foojar Kharash Cusub</span>
          </button>
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Income */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1 text-xs">
            <span>Dakhliga Guud ee La Qabtay</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-emerald-700 dark:text-emerald-400">
            ${totalIncome.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            Dakhli toos ah: ${totalGeneralIncome.toFixed(2)} · Rasiidadka: ${totalPaymentsIncome.toFixed(2)}
          </p>
        </div>

        {/* Total Expenses */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1 text-xs">
            <span>Kharashaadka La Bixiyay</span>
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-2xl font-bold font-mono-numbers text-red-600 dark:text-red-400">
            ${totalApprovedExpenses.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
            {expenses.filter((e) => e.status === 'Approved').length} Foojar oo la oggolaaday
          </p>
        </div>

        {/* Net Cash */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1 text-xs">
            <span>Haraaga Saafiga ah (Net Balance)</span>
            <DollarSign className="w-4 h-4 text-[#005A51] dark:text-teal-400" />
          </div>
          <div
            className={`text-2xl font-bold font-mono-numbers ${
              netBalance >= 0 ? 'text-[#005A51] dark:text-teal-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            ${netBalance.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Sanduuqa Machadka Qardho</p>
        </div>
      </div>

      {/* Tabs + Search/Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => {
              setActiveTab('incomes');
              setFilterCategory('all');
            }}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'incomes'
                ? 'bg-[#005A51] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Dakhliyada Dugsiga ({incomes.length + payments.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('expenses');
              setFilterCategory('all');
            }}
            className={`px-3.5 py-2 rounded-lg transition-colors cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-[#005A51] text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Kharashaadka & Foojarrada ({expenses.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                activeTab === 'incomes'
                  ? 'Raadi dakhli, qof, ama tixraac...'
                  : 'Raadi kharash, shirkad, ama tixraac...'
              }
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium"
          >
            <option value="all">Dhammaan Qaybaha</option>
            {activeTab === 'incomes'
              ? INCOME_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.value} ({c.somali})
                  </option>
                ))
              : EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.value} ({c.somali})
                  </option>
                ))}
          </select>
        </div>
      </div>

      {/* TAB 1: INCOMES */}
      {activeTab === 'incomes' && (
        <div className="space-y-5">
          {/* Income Breakdown */}
          {Object.keys(incomeCategoryTotals).length > 0 && (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
                Qeybinta Dakhliyada (Income Categories)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
                {Object.entries(incomeCategoryTotals).map(([cat, amount]) => (
                  <div
                    key={cat}
                    className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/60"
                  >
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">{cat}</span>
                    <span className="text-base font-bold font-mono-numbers text-emerald-700 dark:text-emerald-400 mt-1 block">
                      ${amount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {totalIncome > 0 ? Math.round((amount / totalIncome) * 100) : 0}% dakhliga
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Direct Incomes Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Diiwaanka Dakhliyada Cusub (General & Direct Income Records)
              </span>
              <span className="font-mono-numbers text-slate-500 dark:text-slate-400">
                {filteredIncomes.length} Dakhli · ${totalGeneralIncome.toFixed(2)}
              </span>
            </div>

            {filteredIncomes.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Dakhliyada hadda waa $0.00 (Eber)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                    Ma jiro wax dakhli ah oo hadda diiwaangashan. Guji badhanka hoose si aad u geliso dakhli cusub.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddIncome}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Geli Dakhli Cusub (Add Income)</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="px-4 py-3">Income ID</th>
                      <th className="px-4 py-3">Taariikhda</th>
                      <th className="px-4 py-3">Qaybta (Category)</th>
                      <th className="px-4 py-3">Faahfaahinta Dakhliga</th>
                      <th className="px-3 py-3">Laga Qabtay</th>
                      <th className="px-3 py-3">Habka & Tixraaca</th>
                      <th className="px-3 py-3 text-right">Cadadka ($)</th>
                      <th className="px-4 py-3 text-right">Ficil (Edit / Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredIncomes.map((inc) => (
                      <tr key={inc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono-numbers font-bold text-[#005A51] dark:text-teal-400">
                          {inc.id}
                        </td>
                        <td className="px-4 py-3 font-mono-numbers text-slate-500 dark:text-slate-400">
                          {inc.date}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200">{inc.category}</span>
                          <span className="block text-[10px] text-slate-400">{inc.categorySomali}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{inc.title}</div>
                          <div className="text-[11px] text-slate-400">{inc.notes || '—'}</div>
                        </td>
                        <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                          <span className="font-medium">{inc.receivedFrom || '—'}</span>
                          <span className="block text-[10px] text-slate-400">Qabtay: {inc.receivedBy}</span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-medium text-slate-800 dark:text-slate-200 block">
                            {inc.paymentMethod}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono-numbers">{inc.referenceNo}</span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono-numbers font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                          +${inc.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditIncome(inc)}
                              className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Wax ka beddel (Edit)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setConfirmAction({
                                  type: 'delete_income',
                                  id: inc.id,
                                  label: `${inc.title} ($${inc.amount.toFixed(2)})`,
                                })
                              }
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors cursor-pointer"
                              title="Tirtir (Delete)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Student Fee Payments Table (if any recorded from Fees module) */}
          {filteredPayments.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Dakhliga Rasiidadka Biilasha Ardayda (Student Fee Payments)
                </span>
                <span className="font-mono-numbers text-slate-500 dark:text-slate-400">
                  {filteredPayments.length} Rasiid · ${totalPaymentsIncome.toFixed(2)}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                      <th className="px-4 py-3">Receipt ID</th>
                      <th className="px-4 py-3">Ardayga</th>
                      <th className="px-3 py-3">Taariikhda & Habka</th>
                      <th className="px-3 py-3">Reference</th>
                      <th className="px-3 py-3 text-right">Cadadka ($)</th>
                      <th className="px-4 py-3 text-right">Ficil (Edit / Delete)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPayments.map((p) => {
                      const st = students.find((s) => s.id === p.studentId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 font-mono-numbers font-bold text-[#005A51] dark:text-teal-400">
                            {p.id}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 dark:text-slate-100">
                              {st?.fullName || p.studentId}
                            </div>
                            <div className="text-[11px] text-slate-400">{p.notes || p.invoiceId}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="font-medium text-slate-800 dark:text-slate-200 block">
                              {p.paymentMethod}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono-numbers">{p.paymentDate}</span>
                          </td>
                          <td className="px-3 py-3 font-mono-numbers text-slate-600 dark:text-slate-300">
                            {p.referenceNumber}
                          </td>
                          <td className="px-3 py-3 text-right font-mono-numbers font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                            +${p.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenEditPayment(p)}
                                className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                                title="Wax ka beddel rasiidka"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmAction({
                                    type: 'delete_payment',
                                    id: p.id,
                                    label: `${p.id} - ${st?.fullName || p.studentId} ($${p.amount.toFixed(2)})`,
                                  })
                                }
                                className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors cursor-pointer"
                                title="Tirtir rasiidka"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* TAB 2: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-5">
          {/* Category Expense Breakdown */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">
              Qeybinta Kharashaadka (Expense Categories)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              {Object.entries(expenseCategoryTotals).map(([cat, amount]) => (
                <div
                  key={cat}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800"
                >
                  <span className="text-[10px] text-slate-400 block truncate">{cat}</span>
                  <span className="text-base font-bold font-mono-numbers text-slate-900 dark:text-slate-100 mt-1 block">
                    ${amount.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {totalApprovedExpenses > 0 ? Math.round((amount / totalApprovedExpenses) * 100) : 0}% kharashka
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Vouchers Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">
                Diiwaanka Foojarrada Kharashka (Expense Vouchers)
              </span>
              <span className="font-mono-numbers text-slate-500 dark:text-slate-400">
                {filteredExpenses.length} Foojar
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                    <th className="px-4 py-3">Voucher ID</th>
                    <th className="px-4 py-3">Taariikhda</th>
                    <th className="px-4 py-3">Qaybta (Category)</th>
                    <th className="px-4 py-3">Faahfaahinta Kharashka</th>
                    <th className="px-3 py-3">Loo Bixiyay</th>
                    <th className="px-3 py-3 text-right">Cadadka ($)</th>
                    <th className="px-3 py-3 text-center">Xaaladda</th>
                    <th className="px-4 py-3 text-right">Ficil (Add / Edit / Delete)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono-numbers font-bold text-[#005A51] dark:text-teal-400">
                        {exp.id}
                      </td>
                      <td className="px-4 py-3 font-mono-numbers text-slate-500 dark:text-slate-400">
                        {exp.date}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{exp.category}</span>
                        <span className="block text-[10px] text-slate-400">{exp.categorySomali}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{exp.title}</div>
                        <div className="text-[11px] text-slate-400">{exp.notes || '—'}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-700 dark:text-slate-300">
                        <span className="font-medium">{exp.paidTo}</span>
                        <span className="block text-[10px] text-slate-400 font-mono-numbers">{exp.referenceNo}</span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono-numbers font-bold text-slate-900 dark:text-slate-100 text-sm">
                        ${exp.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            exp.status === 'Approved'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : exp.status === 'Pending'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {exp.status === 'Approved' ? 'Oggolaaday' : exp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {exp.status === 'Pending' && (
                            <button
                              onClick={() => updateExpenseStatus(exp.id, 'Approved')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                              title="Oggolow kharashka"
                            >
                              Oggolow
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditExpense(exp)}
                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                            title="Wax ka beddel (Edit)"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                type: 'delete_expense',
                                id: exp.id,
                                label: `${exp.title} ($${exp.amount.toFixed(2)})`,
                              })
                            }
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition-colors cursor-pointer"
                            title="Tirtir (Delete)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT INCOME MODAL */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {editingIncomeId ? 'Wax Ka Beddel Dakhliga (Edit Income)' : 'Geli Dakhli Cusub (Add New Income)'}
              </h3>
              <button
                onClick={() => setIsIncomeModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveIncome} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Cinwaanka / Faahfaahinta Dakhliga: *
                </label>
                <input
                  type="text"
                  required
                  value={incomeForm.title}
                  onChange={(e) => setIncomeForm({ ...incomeForm, title: e.target.value })}
                  placeholder="tusaale: Dakhliga Bisha November / Deeq Waxbarasho..."
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Qaybta Dakhliga (Category):
                  </label>
                  <select
                    value={incomeForm.category}
                    onChange={(e) => {
                      const val = e.target.value as IncomeRecord['category'];
                      const matched = INCOME_CATEGORIES.find((c) => c.value === val);
                      setIncomeForm({
                        ...incomeForm,
                        category: val,
                        categorySomali: matched?.somali || 'Dakhliyada Kale',
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {INCOME_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.value} ({c.somali})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Cadadka ($): *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={incomeForm.amount || ''}
                    onChange={(e) => setIncomeForm({ ...incomeForm, amount: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers font-bold text-emerald-700 dark:text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Qofka / Hay’adda Laga Qabtay: *
                  </label>
                  <input
                    type="text"
                    required
                    value={incomeForm.receivedFrom}
                    onChange={(e) => setIncomeForm({ ...incomeForm, receivedFrom: e.target.value })}
                    placeholder="Magaca bixiyaha..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Habka Lacag-bixinta:</label>
                  <select
                    value={incomeForm.paymentMethod}
                    onChange={(e) =>
                      setIncomeForm({
                        ...incomeForm,
                        paymentMethod: e.target.value as IncomeRecord['paymentMethod'],
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="EVC Plus">EVC Plus</option>
                    <option value="Salaam Bank">Salaam Bank</option>
                    <option value="Dahabshiil / eDahab">Dahabshiil / eDahab</option>
                    <option value="Cash">Cash (Caddaan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Reference No:</label>
                  <input
                    type="text"
                    value={incomeForm.referenceNo}
                    onChange={(e) => setIncomeForm({ ...incomeForm, referenceNo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Taariikhda:</label>
                  <input
                    type="date"
                    required
                    value={incomeForm.date}
                    onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Qasnajiga Qabtay:</label>
                <input
                  type="text"
                  value={incomeForm.receivedBy}
                  onChange={(e) => setIncomeForm({ ...incomeForm, receivedBy: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Faahfaahin / Xusuusin:</label>
                <textarea
                  rows={2}
                  value={incomeForm.notes}
                  onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs cursor-pointer"
                >
                  {editingIncomeId ? 'Keydi Isbeddelka' : 'Keydi Dakhliga'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FEE PAYMENT MODAL */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Wax Ka Beddel Rasiidka ({editingPayment.id})
              </h3>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Cadadka ($): *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={paymentEditForm.amount}
                    onChange={(e) => setPaymentEditForm({ ...paymentEditForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Habka Bixinta:</label>
                  <select
                    value={paymentEditForm.paymentMethod}
                    onChange={(e) =>
                      setPaymentEditForm({
                        ...paymentEditForm,
                        paymentMethod: e.target.value as FeePayment['paymentMethod'],
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  >
                    <option value="EVC Plus">EVC Plus</option>
                    <option value="Salaam Bank">Salaam Bank</option>
                    <option value="Dahabshiil / eDahab">Dahabshiil / eDahab</option>
                    <option value="Cash">Cash (Caddaan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Reference No:</label>
                  <input
                    type="text"
                    required
                    value={paymentEditForm.referenceNumber}
                    onChange={(e) => setPaymentEditForm({ ...paymentEditForm, referenceNumber: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Taariikhda:</label>
                  <input
                    type="date"
                    required
                    value={paymentEditForm.paymentDate}
                    onChange={(e) => setPaymentEditForm({ ...paymentEditForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Faahfaahin:</label>
                <textarea
                  rows={2}
                  value={paymentEditForm.notes}
                  onChange={(e) => setPaymentEditForm({ ...paymentEditForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
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

      {/* ADD / EDIT EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                {editingExpenseId ? 'Wax Ka Beddel Foojarka Kharashka' : 'Abuur Foojar Kharash Cusub'}
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-3">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Cinwaanka Kharashka: *
                </label>
                <input
                  type="text"
                  required
                  value={expenseForm.title}
                  onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="tusaale: Iibka Naaftada Matoorka Korontada..."
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Qaybta (Category):</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => {
                      const val = e.target.value as ExpenseVoucher['category'];
                      const matched = EXPENSE_CATEGORIES.find((c) => c.value === val);
                      setExpenseForm({
                        ...expenseForm,
                        category: val,
                        categorySomali: matched?.somali || 'Maamulka & Xafiiska',
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.value} ({c.somali})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Cadadka ($): *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                    Qofka / Goobta Loo Bixiyay:
                  </label>
                  <input
                    type="text"
                    required
                    value={expenseForm.paidTo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, paidTo: e.target.value })}
                    placeholder="Kaalinta Shidaalka..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Habka Lacag-bixinta:</label>
                  <select
                    value={expenseForm.paymentMethod}
                    onChange={(e) =>
                      setExpenseForm({
                        ...expenseForm,
                        paymentMethod: e.target.value as ExpenseVoucher['paymentMethod'],
                      })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="EVC Plus">EVC Plus</option>
                    <option value="Salaam Bank">Salaam Bank</option>
                    <option value="Cash">Cash (Caddaan)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Reference No:</label>
                  <input
                    type="text"
                    value={expenseForm.referenceNo}
                    onChange={(e) => setExpenseForm({ ...expenseForm, referenceNo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Taariikhda:</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono-numbers text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Xaaladda:</label>
                  <select
                    value={expenseForm.status}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, status: e.target.value as ExpenseVoucher['status'] })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="Approved">Approved</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">Faahfaahin / Xusuusin:</label>
                <textarea
                  rows={2}
                  value={expenseForm.notes}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  Ka noqo
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-bold text-white bg-[#005A51] hover:bg-[#004841] rounded-lg shadow-xs cursor-pointer"
                >
                  {editingExpenseId ? 'Keydi Isbeddelka' : 'Keydi Foojarka'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL FOR DELETE / ZERO INCOMES */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {confirmAction.type === 'zero_incomes'
                    ? 'Ka Dhig Dhammaan Dakhliyada $0.00?'
                    : 'Ma hubtaa inaad tirtirto?'}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {confirmAction.type === 'zero_incomes'
                    ? 'Tani waxay nadiifinaysaa dhammaan diiwaanka dakhliyada iyo rasiidadka lacag-bixinta si aad u bilowdo xisaab cusub oo $0.00 ah.'
                    : `Waxaa la tirtiri doonaa: ${confirmAction.label}. Tallaabadan dib looma celin karo.`}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium cursor-pointer"
              >
                Maya (Ka noqo)
              </button>
              <button
                type="button"
                onClick={handleConfirmExecute}
                className="px-4 py-1.5 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
              >
                {confirmAction.type === 'zero_incomes' ? 'Haa, Ka Dhig $0.00' : 'Haa, Tirtir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
