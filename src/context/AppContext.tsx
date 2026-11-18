/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserRole,
  Student,
  SchoolClass,
  Subject,
  Teacher,
  AttendanceRecord,
  Examination,
  ExamMark,
  FeeStructure,
  StudentInvoice,
  FeePayment,
  IncomeRecord,
  ExpenseVoucher,
  StaffMember,
  StaffLeaveRequest,
  PayrollRecord,
  TimetableSlot,
  Announcement,
  SupportTicket,
  AuditLog,
  SchoolSettings,
  UserAccount,
  RbacPermissionPolicy,
  StaffAttendanceRecord,
  ExamCardBatch,
  ExamCard,
  SearchCategory,
  GlobalSearchResponse,
} from '../types';
import {
  initialSettings,
  initialClasses,
  initialSubjects,
  initialTeachers,
  initialFeeStructures,
  initialExams,
  initialMarks,
  initialAttendance,
  initialStaffMembers,
  initialLeaveRequests,
  initialPayroll,
  initialTimetableSlots,
  initialAnnouncements,
  initialSupportTickets,
} from '../data/seedData';
import { canAccessModule, getDefaultModuleForRole } from '../utils/rbac';
import {
  calculateSixYearExpiry,
  calculateStudentExperience,
  generateMachadStudentUsername,
} from '../utils/experience';

export { calculateSixYearExpiry, calculateStudentExperience, generateMachadStudentUsername };

export type PrintDocumentType =
  | 'student_id_card'
  | 'enrollment_certificate'
  | 'payment_receipt'
  | 'report_card'
  | 'exam_certificate'
  | 'payslip'
  | 'timetable'
  | 'student_portal_slip'
  | null;

export interface PrintModalData {
  type: PrintDocumentType;
  student?: Student;
  invoice?: StudentInvoice;
  payment?: FeePayment;
  exam?: Examination;
  marks?: ExamMark[];
  staff?: StaffMember;
  payslip?: PayrollRecord;
  classId?: string;
}

export interface AuditLogFilters {
  filter?: 'all' | 'students' | 'staff';
  studentId?: string;
  action?: string;
  module?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface FocusedRecordIntent {
  type: 'student' | 'teacher' | 'staff' | 'class' | 'subject' | 'exam' | 'invoice';
  id: string;
}

export interface NavigationIntent {
  module: string;
  tab?: string;
  action?: string;
  childKey?: string;
  nonce: number;
}

export interface GlobalSearchParams {
  query: string;
  category?: SearchCategory;
  classId?: string;
  page?: number;
  limit?: number;
}

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isBootstrapping: boolean;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeModule: string;
  setActiveModule: (module: string) => void;
  activeChildKey: string | null;
  navigationIntent: NavigationIntent | null;
  navigateToSubmenu: (module: string, tab?: string, action?: string, childKey?: string) => void;
  clearNavigationIntent: () => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebarCollapsed: () => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  focusedRecordIntent: FocusedRecordIntent | null;
  setFocusedRecordIntent: (intent: FocusedRecordIntent | null) => void;
  openRecordFromSearch: (intent: FocusedRecordIntent) => void;
  forbiddenNotice: string | null;
  setForbiddenNotice: (msg: string | null) => void;
  searchGlobal: (params: GlobalSearchParams) => Promise<{ data?: GlobalSearchResponse; error?: string; status?: number }>;

  settings: SchoolSettings;
  updateSettings: (newSettings: Partial<SchoolSettings>) => void;

  // Student CRUD & Portal
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => Promise<Student | null>;
  addStudentsBatch: (studentsList: Omit<Student, 'id'>[]) => Promise<Student[]>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  deleteStudent: (id: string, permanent?: boolean) => Promise<void>;
  dropStudent: (id: string, reason?: string) => Promise<void>;
  restoreStudent: (id: string) => Promise<void>;
  promoteStudents: (fromClassId: string, toClassId: string, studentIds: string[]) => Promise<void>;
  activeStudentPortalId: string | null;
  setActiveStudentPortalId: (id: string | null) => void;
  generateStudentCredentials: (studentId: string) => { username: string; pin: string };
  changeStudentPassword: (
    studentId: string,
    currentPassword: string,
    newPassword: string
  ) => Promise<{ success: boolean; message: string }>;
  adminResetStudentPassword: (
    studentId: string,
    newPassword?: string
  ) => Promise<{ success: boolean; message: string }>;
  logStudentActivity: (
    studentId: string,
    action: AuditLog['action'],
    details: string,
    resource?: string
  ) => Promise<void>;
  fetchStudentPortalSection: (
    studentId: string,
    section: 'id-card' | 'overview' | 'exams' | 'attendance' | 'fees' | 'announcements' | 'timetable'
  ) => Promise<void>;

  // Authentication & User Accounts & RBAC
  userAccounts: UserAccount[];
  rbacPolicies: RbacPermissionPolicy[];
  refreshUserAccounts: () => Promise<void>;
  addUserAccount: (acc: Omit<UserAccount, 'id'>) => Promise<UserAccount | null>;
  updateUserAccount: (id: string, data: Partial<UserAccount>) => Promise<void>;
  toggleUserAccountStatus: (id: string, status: 'Active' | 'Deactivated' | 'Suspended') => Promise<boolean>;
  resetUserAccountPassword: (id: string, newPassword: string, mustChangePassword?: boolean) => Promise<boolean>;
  deleteUserAccount: (id: string) => Promise<void>;
  updateRbacPolicies: (policies: RbacPermissionPolicy[]) => Promise<boolean>;
  fetchLoginActivity: (filters?: { role?: string; status?: string; search?: string }) => Promise<AuditLog[]>;
  currentUser: UserAccount | null;
  loginTargetRole: UserRole | null;
  setLoginTargetRole: (role: UserRole | null) => void;
  openLoginForRole: (role: UserRole) => void;
  authenticateUser: (
    identifier: string,
    password: string,
    expectedRole?: UserRole
  ) => Promise<{
    success: boolean;
    message: string;
    user?: UserAccount;
    student?: Student;
    mustChangePassword?: boolean;
  }>;
  logoutAccount: () => Promise<void>;

  // Portal Authentication (compatible wrappers)
  authenticatedStudentId: string | null;
  isStudentAuthenticated: boolean;
  loginAsStudent: (
    identifier: string,
    pin: string
  ) => Promise<{ success: boolean; message: string; student?: Student }>;
  loginAsStaff: (
    identifier: string,
    password: string,
    targetRole?: UserRole
  ) => Promise<{ success: boolean; message: string }>;
  logoutStudentPortal: () => Promise<void>;
  quickLoginStudent: (studentId: string) => void;
  quickLoginRole: (role: UserRole, customIdentifier?: string) => void;
  isPortalLoginModalOpen: boolean;
  setIsPortalLoginModalOpen: (open: boolean) => void;

  // Classes & Academics CRUD
  classes: SchoolClass[];
  addClass: (cls: Omit<SchoolClass, 'id'>) => void;
  updateClass: (id: string, data: Partial<SchoolClass>) => void;
  deleteClass: (id: string) => void;

  // Subjects CRUD
  subjects: Subject[];
  addSubject: (subj: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, data: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Teachers CRUD
  teachers: Teacher[];
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, data: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  // Attendance
  attendance: AttendanceRecord[];
  saveAttendanceBatch: (records: AttendanceRecord[]) => void;

  // Staff Attendance (Strictly Restricted from Teachers)
  staffAttendance: StaffAttendanceRecord[];
  fetchStaffAttendance: (date?: string) => Promise<{ ok: boolean; status?: number; records?: StaffAttendanceRecord[]; error?: string }>;
  saveStaffAttendanceBatch: (records: Partial<StaffAttendanceRecord>[]) => Promise<boolean>;
  updateStaffAttendanceRecord: (id: string, updates: Partial<StaffAttendanceRecord>) => Promise<boolean>;
  deleteStaffAttendanceRecord: (id: string) => Promise<boolean>;

  // Examination ID Cards (Batch & Single CRUD)
  examCardBatches: ExamCardBatch[];
  examCards: ExamCard[];
  fetchExamCardsData: () => Promise<void>;
  generateExamCardsBatch: (payload: {
    classId: string;
    section?: string;
    academicYear: string;
    examId?: string;
    examTitle: string;
    examDate: string;
    instructions: string;
    cardsPerPage: 5 | 8;
    studentIds?: string[];
    includeInactive?: boolean;
    regenerate?: boolean;
  }) => Promise<{
    ok: boolean;
    batch?: ExamCardBatch | null;
    cards?: ExamCard[];
    createdCount?: number;
    regeneratedCount?: number;
    skippedDuplicateCount?: number;
    skippedInactiveCount?: number;
    error?: string;
    status?: number;
  }>;
  updateExamCardBatch: (id: string, updates: Partial<ExamCardBatch>) => Promise<boolean>;
  regenerateExamCardBatch: (id: string) => Promise<boolean>;
  deleteExamCardBatch: (id: string) => Promise<boolean>;
  updateExamCardRecord: (id: string, updates: Partial<ExamCard>) => Promise<boolean>;
  deleteExamCardRecord: (id: string) => Promise<boolean>;

  // Exams & Marks
  exams: Examination[];
  addExam: (exam: Omit<Examination, 'id'>) => void;
  updateExam: (id: string, data: Partial<Examination>) => void;
  deleteExam: (id: string) => void;

  marks: ExamMark[];
  saveMarksBatch: (newMarks: ExamMark[]) => void;
  uploadStudentMarksBulk: (newMarks: ExamMark[]) => void;
  updateSingleMark: (markId: string, score: number, remarks?: string) => void;

  // Fees & Invoices
  feeStructures: FeeStructure[];
  invoices: StudentInvoice[];
  payments: FeePayment[];
  generateClassInvoices: (classId: string, feeStructureId: string, month: string, dueDate: string) => number;
  recordPayment: (payment: Omit<FeePayment, 'id'>) => FeePayment;
  updatePayment: (id: string, data: Partial<FeePayment>) => void;
  deletePayment: (id: string) => void;

  // Incomes & Expenses (Finance)
  incomes: IncomeRecord[];
  addIncome: (income: Omit<IncomeRecord, 'id'>) => IncomeRecord;
  updateIncome: (id: string, data: Partial<IncomeRecord>) => void;
  deleteIncome: (id: string) => void;
  zeroAllIncomes: () => void;

  expenses: ExpenseVoucher[];
  addExpense: (expense: Omit<ExpenseVoucher, 'id'>) => void;
  updateExpense: (id: string, data: Partial<ExpenseVoucher>) => void;
  deleteExpense: (id: string) => void;
  updateExpenseStatus: (id: string, status: 'Approved' | 'Pending' | 'Rejected') => void;

  // Staff & HR
  staff: StaffMember[];
  addStaff: (staffData: Omit<StaffMember, 'id'>) => StaffMember;
  updateStaff: (id: string, data: Partial<StaffMember>) => void;
  deleteStaff: (id: string) => void;

  leaveRequests: StaffLeaveRequest[];
  addLeaveRequest: (req: Omit<StaffLeaveRequest, 'id' | 'requestDate' | 'status'>) => void;
  updateLeaveStatus: (id: string, status: 'Approved' | 'Rejected') => void;

  payroll: PayrollRecord[];
  generateMonthlyPayroll: (month: string) => number;

  // Timetable
  timetable: TimetableSlot[];
  addTimetableSlot: (slot: Omit<TimetableSlot, 'id'>) => { success: boolean; conflictMessage?: string };
  deleteTimetableSlot: (id: string) => void;

  // Announcements & Messaging
  announcements: Announcement[];
  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'date' | 'read'>) => void;
  markAnnouncementRead: (id: string) => void;

  // Support Tickets
  tickets: SupportTicket[];
  addTicket: (
    ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'messages'>,
    initialMessage: string
  ) => Promise<void>;
  replyToTicket: (ticketId: string, message: string) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: 'Open' | 'In Progress' | 'Resolved') => void;

  // Audit Logs
  auditLogs: AuditLog[];
  fetchAuditLogs: (filters?: AuditLogFilters) => Promise<AuditLog[]>;
  logAudit: (action: AuditLog['action'], module: string, details: string) => void;

  // Print Modal
  printModal: PrintModalData | null;
  openPrint: (data: PrintModalData) => void;
  closePrint: () => void;

  // Reset & Toast
  resetToDefault: () => Promise<void>;
  toast: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_PREFIX = 'machadka_sms_2026_';
const TOKEN_KEY = STORAGE_PREFIX + 'auth_token';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFIX + 'theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_PREFIX + 'theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [authToken, setAuthToken] = useState<string | null>(() => getStoredToken());
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() => Boolean(getStoredToken()));

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [rbacPolicies, setRbacPolicies] = useState<RbacPermissionPolicy[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [loginTargetRole, setLoginTargetRole] = useState<UserRole | null>(null);

  const currentRole: UserRole = currentUser?.role || 'Student';
  const [activeModule, setActiveModuleState] = useState<string>('student_portal');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeStudentPortalId, setActiveStudentPortalId] = useState<string | null>(null);
  const [authenticatedStudentId, setAuthenticatedStudentId] = useState<string | null>(null);
  const [isPortalLoginModalOpen, setIsPortalLoginModalOpen] = useState<boolean>(false);

  const [settings, setSettings] = useState<SchoolSettings>(initialSettings);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>(initialClasses);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(initialAttendance);
  const [exams, setExams] = useState<Examination[]>(initialExams);
  const [marks, setMarks] = useState<ExamMark[]>(initialMarks);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>(initialFeeStructures);
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseVoucher[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>(initialStaffMembers);
  const [leaveRequests, setLeaveRequests] = useState<StaffLeaveRequest[]>(initialLeaveRequests);
  const [payroll, setPayroll] = useState<PayrollRecord[]>(initialPayroll);
  const [timetable, setTimetable] = useState<TimetableSlot[]>(initialTimetableSlots);
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [tickets, setTickets] = useState<SupportTicket[]>(initialSupportTickets);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [staffAttendance, setStaffAttendance] = useState<StaffAttendanceRecord[]>([]);
  const [examCardBatches, setExamCardBatches] = useState<ExamCardBatch[]>([]);
  const [examCards, setExamCards] = useState<ExamCard[]>([]);
  const [focusedRecordIntent, setFocusedRecordIntent] = useState<FocusedRecordIntent | null>(null);
  const [forbiddenNotice, setForbiddenNotice] = useState<string | null>(null);
  const [navigationIntent, setNavigationIntent] = useState<NavigationIntent | null>(null);
  const [activeChildKey, setActiveChildKey] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_PREFIX + 'sidebar_collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + 'sidebar_collapsed', isSidebarCollapsed ? '1' : '0');
    } catch {
      // ignore
    }
  }, [isSidebarCollapsed]);

  const toggleSidebarCollapsed = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev);
  }, []);

  const [printModal, setPrintModal] = useState<PrintModalData | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  const setActiveModule = useCallback(
    (module: string) => {
      setActiveChildKey(null);
      setIsMobileSidebarOpen(false);
      if (!currentUser) {
        setActiveModuleState('student_portal');
        return;
      }
      if (canAccessModule(currentUser.role, module, currentUser.permissions, rbacPolicies)) {
        setActiveModuleState(module);
      } else {
        setActiveModuleState(getDefaultModuleForRole(currentUser.role));
      }
    },
    [currentUser, rbacPolicies]
  );

  const navigateToSubmenu = useCallback(
    (module: string, tab?: string, action?: string, childKey?: string) => {
      setIsMobileSidebarOpen(false);
      if (!currentUser) {
        setActiveModuleState('student_portal');
        return;
      }
      const targetModule = canAccessModule(currentUser.role, module, currentUser.permissions, rbacPolicies)
        ? module
        : getDefaultModuleForRole(currentUser.role);
      setActiveModuleState(targetModule);
      setActiveChildKey(childKey || null);
      setNavigationIntent({
        module: targetModule,
        tab,
        action,
        childKey,
        nonce: Date.now() + Math.random(),
      });
    },
    [currentUser, rbacPolicies]
  );

  const clearNavigationIntent = useCallback(() => {
    setNavigationIntent(null);
  }, []);

  const apiFetch = useCallback(
    async (url: string, options: RequestInit = {}, overrideToken?: string | null) => {
      const token = overrideToken !== undefined ? overrideToken : authToken;
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, { ...options, headers });
    },
    [authToken]
  );

  const applyBootstrapPayload = useCallback((data: any, resetModule = false) => {
    if (!data || !data.user) return;
    const u: UserAccount = data.user;
    setCurrentUser(u);
    const primaryStu = u.linkedStudentId || u.linkedStudentIds?.[0] || null;
    setAuthenticatedStudentId(primaryStu);
    setActiveStudentPortalId((prev) => prev || primaryStu);

    if (resetModule) {
      setActiveModuleState(getDefaultModuleForRole(u.role));
    }

    if (data.settings && data.settings.institutionName) setSettings(data.settings);
    if (Array.isArray(data.classes)) setClasses(data.classes);
    if (Array.isArray(data.subjects)) setSubjects(data.subjects);
    if (Array.isArray(data.teachers)) setTeachers(data.teachers);
    if (Array.isArray(data.students)) setStudents(data.students);
    if (Array.isArray(data.attendance)) setAttendance(data.attendance);
    if (Array.isArray(data.exams)) setExams(data.exams);
    if (Array.isArray(data.marks)) setMarks(data.marks);
    if (Array.isArray(data.feeStructures)) setFeeStructures(data.feeStructures);
    if (Array.isArray(data.invoices)) setInvoices(data.invoices);
    if (Array.isArray(data.payments)) setPayments(data.payments);
    if (Array.isArray(data.incomes)) setIncomes(data.incomes);
    if (Array.isArray(data.expenses)) setExpenses(data.expenses);
    if (Array.isArray(data.staff)) setStaff(data.staff);
    if (Array.isArray(data.leaveRequests)) setLeaveRequests(data.leaveRequests);
    if (Array.isArray(data.payroll)) setPayroll(data.payroll);
    if (Array.isArray(data.timetable)) setTimetable(data.timetable);
    if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
    if (Array.isArray(data.tickets)) setTickets(data.tickets);
    if (Array.isArray(data.auditLogs)) setAuditLogs(data.auditLogs);
    if (Array.isArray(data.userAccounts)) setUserAccounts(data.userAccounts);
    else setUserAccounts([]);
    if (Array.isArray(data.rbacPolicies)) setRbacPolicies(data.rbacPolicies);
    else setRbacPolicies([]);
    if (Array.isArray(data.staffAttendance)) setStaffAttendance(data.staffAttendance);
    else setStaffAttendance([]);
    if (Array.isArray(data.examCardBatches)) setExamCardBatches(data.examCardBatches);
    else setExamCardBatches([]);
    if (Array.isArray(data.examCards)) setExamCards(data.examCards);
    else setExamCards([]);
  }, []);

  const hydrateFromBackend = useCallback(
    async (tokenOverride?: string | null, resetModule = false) => {
      const token = tokenOverride !== undefined ? tokenOverride : authToken;
      if (!token) {
        setIsBootstrapping(false);
        return false;
      }
      try {
        const res = await fetch('/api/bootstrap', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setStoredToken(null);
          setAuthToken(null);
          setCurrentUser(null);
          setAuthenticatedStudentId(null);
          setActiveStudentPortalId(null);
          setIsBootstrapping(false);
          return false;
        }
        const data = await res.json();
        applyBootstrapPayload(data, resetModule);
        setIsBootstrapping(false);
        return true;
      } catch {
        setIsBootstrapping(false);
        return false;
      }
    },
    [authToken, applyBootstrapPayload]
  );

  useEffect(() => {
    if (authToken && !currentUser) {
      hydrateFromBackend(authToken, true);
    } else {
      setIsBootstrapping(false);
    }
  }, [authToken, currentUser, hydrateFromBackend]);

  // Live refresh of support tickets so messages sent by students/parents reach staff
  // without needing to log out or reload the page.
  const refreshTickets = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await apiFetch('/api/tickets');
      if (!res.ok) return;
      const data = (await res.json()) as SupportTicket[];
      if (Array.isArray(data)) setTickets(data);
    } catch {
      /* network hiccup — try again next tick */
    }
  }, [authToken, apiFetch]);

  useEffect(() => {
    if (!authToken || !currentUser) return;
    refreshTickets();
    const timer = window.setInterval(refreshTickets, 15000);
    const onFocus = () => refreshTickets();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [authToken, currentUser, refreshTickets]);

  const fetchAuditLogs = useCallback(
    async (filters?: AuditLogFilters): Promise<AuditLog[]> => {
      if (!authToken) return [];
      const params = new URLSearchParams();
      if (filters?.filter && filters.filter !== 'all') params.set('filter', filters.filter);
      if (filters?.studentId && filters.studentId !== 'all') params.set('studentId', filters.studentId);
      if (filters?.action && filters.action !== 'all') params.set('action', filters.action);
      if (filters?.module && filters.module !== 'all') params.set('module', filters.module);
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters?.dateTo) params.set('dateTo', filters.dateTo);
      if (filters?.search) params.set('search', filters.search);

      try {
        const qs = params.toString();
        const res = await apiFetch(`/api/audit-logs${qs ? `?${qs}` : ''}`);
        if (!res.ok) return [];
        const logs = (await res.json()) as AuditLog[];
        setAuditLogs(logs);
        return logs;
      } catch {
        return [];
      }
    },
    [authToken, apiFetch]
  );

  const persistKv = useCallback(
    async (
      key: string,
      data: unknown,
      auditAction?: AuditLog['action'],
      auditModule?: string,
      auditDetails?: string
    ) => {
      if (!authToken) return;
      if (
        currentUser &&
        (currentUser.role === 'Student' || currentUser.role === 'Parent' || currentUser.role === 'Institute')
      ) {
        return;
      }
      try {
        const res = await apiFetch(`/api/state/${key}`, {
          method: 'PUT',
          body: JSON.stringify({
            data,
            auditAction,
            auditModule,
            auditDetails,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          if (err?.error) showToast(err.error);
        } else if (auditAction && (currentRole === 'Super Admin' || currentRole === 'Administrator' || currentRole === 'Academic Manager')) {
          fetchAuditLogs();
        }
      } catch {
        showToast('Khalad ayaa ka dhacay keydinta xogta server-ka.');
      }
    },
    [authToken, currentUser, currentRole, apiFetch, showToast, fetchAuditLogs]
  );

  const logAudit = (action: AuditLog['action'], module: string, details: string) => {
    const actorLabel = currentUser
      ? `${currentUser.fullName} (${currentUser.username})`
      : `${currentRole}`;
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: actorLabel,
      role: currentRole,
      action,
      module,
      status: 'Success',
      details,
      ipAddress: '127.0.0.1',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const updateSettings = (newSettings: Partial<SchoolSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      persistKv(
        'settings',
        updated,
        'UPDATE',
        'Settings',
        'Waxaa la cusboonaysiiyay qaabeynta dugsiga.'
      );
      return updated;
    });
    showToast('Qaabeynta dugsiga si guul leh ayaa loo keydiyay.');
  };

  // ============================================================
  // STUDENT MANAGEMENT & CREDENTIALS (BACKEND API)
  // ============================================================
  const addStudent = async (studentData: Omit<Student, 'id'>): Promise<Student | null> => {
    try {
      const res = await apiFetch('/api/students', {
        method: 'POST',
        body: JSON.stringify(studentData),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Way fashilantay diiwaangelinta ardayga.');
        return null;
      }
      const created = body as Student;
      setStudents((prev) => [created, ...prev]);
      fetchAuditLogs();
      showToast(
        `Ardayga ${created.fullName} (${created.portalUsername}) si guul leh ayaa loo diiwaangeliyay!`
      );
      return created;
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay diiwaangelinta ardayga.');
      return null;
    }
  };

  const addStudentsBatch = async (studentsList: Omit<Student, 'id'>[]): Promise<Student[]> => {
    if (studentsList.length === 0) return [];
    try {
      const res = await apiFetch('/api/students/batch', {
        method: 'POST',
        body: JSON.stringify({ students: studentsList }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Way fashilantay soo gelinta ardayda.');
        return [];
      }
      const created: Student[] = Array.isArray(body.created) ? body.created : [];
      setStudents((prev) => [...created, ...prev]);
      fetchAuditLogs();
      const targetCls = classes.find((c) => c.id === created[0]?.classId);
      const classLabel = targetCls
        ? `${targetCls.name} (${targetCls.section}) · ${targetCls.shift || 'Subax'}`
        : created[0]?.classId || '';
      showToast(`${created.length} arday oo cusub ayaa si guul leh loo diiwaangeliyay (${classLabel})!`);
      return created;
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay soo gelinta ardayda.');
      return [];
    }
  };

  const updateStudent = async (id: string, data: Partial<Student>): Promise<void> => {
    try {
      const res = await apiFetch(`/api/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Ma suuroobin in wax laga beddelo xogta ardayga.');
        return;
      }
      const updated = body as Student;
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      fetchAuditLogs();
      showToast('Xogta ardayga waa la cusboonaysiiyay.');
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay cusboonaysiinta ardayga.');
    }
  };

  const deleteStudent = async (id: string, permanent = false): Promise<void> => {
    const student = students.find((s) => s.id === id);
    try {
      const res = await apiFetch(`/api/students/${id}${permanent ? '?permanent=true' : ''}`, {
        method: 'DELETE',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Ma suuroobin in la tirtiro ardayga.');
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setUserAccounts((prev) => prev.filter((u) => u.linkedStudentId !== id));
      if (printModal?.student?.id === id) {
        setPrintModal(null);
      }
      if (activeStudentPortalId === id) {
        setActiveStudentPortalId(null);
      }
      fetchAuditLogs();
      showToast(`Ardayga ${student?.fullName || id} si sax ah ayaa loo tirtiray.`);
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay tirtiridda ardayga.');
    }
  };

  const dropStudent = async (id: string, reason?: string): Promise<void> => {
    const student = students.find((s) => s.id === id);
    try {
      const res = await apiFetch(`/api/students/${id}/drop`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Ma suuroobin in ardayga laga dhigo Withdrawn.');
        return;
      }
      const updated = body as Student;
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      fetchAuditLogs();
      showToast(`Ardayga ${student?.fullName || id} waxaa laga dhigay Withdrawn (Taariikhda waa la ilaaliyay).`);
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay hawshan.');
    }
  };

  const restoreStudent = async (id: string): Promise<void> => {
    const student = students.find((s) => s.id === id);
    try {
      const res = await apiFetch(`/api/students/${id}/restore`, {
        method: 'POST',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Ma suuroobin soo celinta ardayga.');
        return;
      }
      const updated = body as Student;
      setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
      fetchAuditLogs();
      showToast(`Ardayga ${student?.fullName || id} dib ayaa loo hawlgeliyay (Active).`);
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay soo celinta ardayga.');
    }
  };

  const promoteStudents = async (fromClassId: string, toClassId: string, studentIds: string[]) => {
    const targetClass = classes.find((c) => c.id === toClassId);
    for (const sid of studentIds) {
      await apiFetch(`/api/students/${sid}`, {
        method: 'PUT',
        body: JSON.stringify({
          classId: toClassId,
          section: targetClass ? targetClass.section : undefined,
          shift: targetClass?.shift || 'Subax',
        }),
      });
    }
    setStudents((prev) =>
      prev.map((s) =>
        studentIds.includes(s.id)
          ? {
              ...s,
              classId: toClassId,
              section: targetClass ? targetClass.section : s.section,
              shift: targetClass?.shift || s.shift || 'Subax',
            }
          : s
      )
    );
    logAudit(
      'PROMOTION',
      'Classes & Academics',
      `Waxaa loo dalacsiiyay ${studentIds.length} arday fasalka ${targetClass?.name || toClassId}`
    );
    showToast(`${studentIds.length} arday ayaa si guul leh loogu dalacsiiyay fasalka cusub.`);
  };

  const generateStudentCredentials = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const username = student?.portalUsername || generateMachadStudentUsername(studentId);
    return { username, pin: '••••••••' };
  };

  const changeStudentPassword = async (
    studentId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch(`/api/students/${studentId}/change-password`, {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        return {
          success: false,
          message: body?.message || body?.error || 'Beddelka furaha sirta ah wuu fashilmay.',
        };
      }
      if (body.user) {
        setCurrentUser((prev) => (prev && prev.id === body.user.id ? body.user : prev));
      } else if (currentUser?.linkedStudentId === studentId) {
        setCurrentUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
      }
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, mustChangePassword: false } : s))
      );
      showToast('Furahaaga sirta ah si guul leh ayaa loo beddelay!');
      return { success: true, message: body.message || 'Furahaaga sirta ah waa la beddelay.' };
    } catch {
      return { success: false, message: 'Khalad shabakad ah ayaa dhacay.' };
    }
  };

  const adminResetStudentPassword = async (
    studentId: string,
    newPassword?: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiFetch(`/api/admin/students/${studentId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(newPassword ? { newPassword } : {}),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.success) {
        const msg = body?.error || body?.message || 'Dib u dejinta furaha way fashilantay.';
        showToast(msg);
        return { success: false, message: msg };
      }
      setStudents((prev) =>
        prev.map((s) => (s.id === studentId ? { ...s, mustChangePassword: true } : s))
      );
      fetchAuditLogs();
      showToast(body.message || 'Furaha ardayga dib ayaa loo dejiyay.');
      return { success: true, message: body.message };
    } catch {
      return { success: false, message: 'Khalad shabakad ah.' };
    }
  };

  const logStudentActivity = async (
    studentId: string,
    action: AuditLog['action'],
    details: string,
    resource?: string
  ): Promise<void> => {
    if (!authToken) return;
    try {
      const res = await apiFetch(`/api/student-portal/${studentId}/activity`, {
        method: 'POST',
        body: JSON.stringify({ action, details, resource }),
      });
      if (res.ok) {
        const created = (await res.json()) as AuditLog;
        setAuditLogs((prev) => [created, ...prev]);
      }
    } catch {
      // ignore non-blocking activity log failure
    }
  };

  const fetchStudentPortalSection = useCallback(
    async (
      studentId: string,
      section: 'id-card' | 'overview' | 'exams' | 'attendance' | 'fees' | 'announcements' | 'timetable'
    ): Promise<void> => {
      if (!authToken || !studentId) return;
      try {
        const url =
          section === 'id-card'
            ? `/api/student-portal/${studentId}/id-card`
            : `/api/student-portal/${studentId}/${section}`;
        const res = await apiFetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data.student) {
          setStudents((prev) => {
            const exists = prev.some((s) => s.id === data.student.id);
            return exists
              ? prev.map((s) => (s.id === data.student.id ? { ...s, ...data.student } : s))
              : [data.student, ...prev];
          });
        }
        if (Array.isArray(data.exams)) setExams(data.exams);
        if (Array.isArray(data.marks)) setMarks(data.marks);
        if (Array.isArray(data.attendance)) setAttendance(data.attendance);
        if (Array.isArray(data.invoices)) setInvoices(data.invoices);
        if (Array.isArray(data.payments)) setPayments(data.payments);
        if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
        if (Array.isArray(data.timetable)) setTimetable(data.timetable);
      } catch {
        // ignore transient network failure
      }
    },
    [authToken, apiFetch]
  );

  // ============================================================
  // USER ACCOUNTS & RBAC CRUD (SUPER ADMIN / ADMINISTRATOR)
  // ============================================================
  const refreshUserAccounts = useCallback(async () => {
    if (!authToken) return;
    if (!currentUser || (currentUser.role !== 'Super Admin' && currentUser.role !== 'Administrator')) return;
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const list = (await res.json()) as UserAccount[];
        if (Array.isArray(list)) setUserAccounts(list);
      }
    } catch {
      // ignore transient error
    }
  }, [authToken, currentUser, apiFetch]);

  const addUserAccount = async (accData: Omit<UserAccount, 'id'>): Promise<UserAccount | null> => {
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(accData),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Abuurista akoonku way fashilantay.');
        return null;
      }
      const created = body as UserAccount;
      setUserAccounts((prev) => [created, ...prev]);
      fetchAuditLogs();
      showToast(`Akoonka ${created.fullName} (${created.role}) waa la abuuray.`);
      return created;
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay abuurista akoonka.');
      return null;
    }
  };

  const updateUserAccount = async (id: string, data: Partial<UserAccount>): Promise<void> => {
    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Cusboonaysiinta akoonku way fashilantay.');
        return;
      }
      const updated = body as UserAccount;
      setUserAccounts((prev) => prev.map((u) => (u.id === id ? updated : u)));
      if (currentUser?.id === id) {
        setCurrentUser(updated);
      }
      fetchAuditLogs();
      showToast('Macluumaadka akoonka waa la cusboonaysiiyay.');
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay cusboonaysiinta akoonka.');
    }
  };

  const toggleUserAccountStatus = async (
    id: string,
    status: 'Active' | 'Deactivated' | 'Suspended'
  ): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Beddelka xaaladda akoonku wuu fashilmay.');
        return false;
      }
      const updated = body as UserAccount;
      setUserAccounts((prev) => prev.map((u) => (u.id === id ? updated : u)));
      fetchAuditLogs();
      showToast(
        status === 'Active'
          ? `Akoonka ${updated.username} dib ayaa loo hawlgeliyay (Active).`
          : `Akoonka ${updated.username} waxaa laga dhigay ${status}.`
      );
      return true;
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay beddelka xaaladda.');
      return false;
    }
  };

  const resetUserAccountPassword = async (
    id: string,
    newPassword: string,
    mustChangePassword?: boolean
  ): Promise<boolean> => {
    try {
      const res = await apiFetch(`/api/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword, mustChangePassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Dib u dejinta furaha way fashilantay.');
        return false;
      }
      if (body.user) {
        const updated = body.user as UserAccount;
        setUserAccounts((prev) => prev.map((u) => (u.id === id ? updated : u)));
      }
      fetchAuditLogs();
      showToast('Furaha sirta ah si guul leh ayaa dib loogu dejiyay (bcrypt).');
      return true;
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay dib u dejinta furaha.');
      return false;
    }
  };

  const deleteUserAccount = async (id: string): Promise<void> => {
    if (currentUser?.id === id) {
      showToast('Ma tirtiri kartid akoonka aad hadda ku jirto!');
      return;
    }
    try {
      const res = await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Tirtiridda akoonku way fashilantay.');
        return;
      }
      setUserAccounts((prev) => prev.filter((u) => u.id !== id));
      fetchAuditLogs();
      showToast('Akoonka waa la tirtiray.');
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay tirtiridda akoonka.');
    }
  };

  const updateRbacPolicies = async (policies: RbacPermissionPolicy[]): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/rbac/permissions', {
        method: 'PUT',
        body: JSON.stringify({ policies }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(body?.error || 'Keydinta rukhsadaha RBAC way fashilantay.');
        return false;
      }
      if (Array.isArray(body)) {
        setRbacPolicies(body as RbacPermissionPolicy[]);
      }
      fetchAuditLogs();
      showToast('Xeerarka rukhsadaha RBAC si guul leh ayaa loo keydiyay.');
      return true;
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay keydinta RBAC.');
      return false;
    }
  };

  const fetchLoginActivity = useCallback(
    async (filters?: { role?: string; status?: string; search?: string }): Promise<AuditLog[]> => {
      if (!authToken) return [];
      const params = new URLSearchParams();
      if (filters?.role && filters.role !== 'all') params.set('role', filters.role);
      if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);
      try {
        const qs = params.toString();
        const res = await apiFetch(`/api/auth/login-activity${qs ? `?${qs}` : ''}`);
        if (!res.ok) return [];
        return (await res.json()) as AuditLog[];
      } catch {
        return [];
      }
    },
    [authToken, apiFetch]
  );

  const openLoginForRole = (role: UserRole) => {
    setLoginTargetRole(role);
    setIsPortalLoginModalOpen(true);
  };

  const setCurrentRole = (role: UserRole) => {
    if (currentUser && currentUser.role === role) {
      return;
    }
    openLoginForRole(role);
  };

  const authenticateUser = async (
    identifier: string,
    password: string,
    expectedRole?: UserRole
  ): Promise<{
    success: boolean;
    message: string;
    user?: UserAccount;
    student?: Student;
    mustChangePassword?: boolean;
  }> => {
    const cleanId = identifier.trim();
    const cleanPass = password.trim();
    if (!cleanId || !cleanPass) {
      return {
        success: false,
        message: 'Fadlan geli Aqoonsigaaga (Username / Email / ID) iyo Furaha Sirta ah (Password).',
      };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass, expectedRole }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.success || !body.token) {
        return {
          success: false,
          message: body?.message || body?.error || 'Aqoonsiga ama Furaha sirta ah ma saxna.',
        };
      }

      setStoredToken(body.token);
      setAuthToken(body.token);
      setIsPortalLoginModalOpen(false);
      setLoginTargetRole(null);

      // Immediately hydrate scoped data with the fresh token
      const bootRes = await fetch('/api/bootstrap', {
        headers: { Authorization: `Bearer ${body.token}` },
      });
      if (bootRes.ok) {
        const bootData = await bootRes.json();
        applyBootstrapPayload(bootData, true);
      } else {
        setCurrentUser(body.user);
        setActiveModuleState(getDefaultModuleForRole(body.user.role));
      }

      showToast(`Ku soo dhowow, ${body.user.fullName} (${body.user.role})!`);
      return {
        success: true,
        message: body.message,
        user: body.user,
        student: body.student,
        mustChangePassword: body.mustChangePassword,
      };
    } catch {
      return {
        success: false,
        message: 'Server-ka laguma xiriiri karo. Fadlan hubi isku xirka.',
      };
    }
  };

  const loginAsStudent = async (identifier: string, pin: string) => {
    const res = await authenticateUser(identifier, pin);
    if (res.success && res.user && res.user.role !== 'Student' && res.user.role !== 'Parent') {
      return {
        success: false,
        message: 'Qaybtan waxaa loogu talagalay Ardayda iyo Waalidiinta oo kaliya.',
      };
    }
    return {
      success: res.success,
      message: res.message,
      student: res.student,
    };
  };

  const loginAsStaff = async (identifier: string, password: string, targetRole?: UserRole) => {
    const res = await authenticateUser(identifier, password, targetRole);
    return {
      success: res.success,
      message: res.message,
    };
  };

  const logoutAccount = async () => {
    try {
      if (authToken) {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      }
    } catch {
      // ignore network error on logout
    }
    setStoredToken(null);
    setAuthToken(null);
    setCurrentUser(null);
    setAuthenticatedStudentId(null);
    setActiveStudentPortalId(null);
    setLoginTargetRole(null);
    setIsPortalLoginModalOpen(false);
    setStudents([]);
    setAuditLogs([]);
    setUserAccounts([]);
    setRbacPolicies([]);
    setStaffAttendance([]);
    setExamCardBatches([]);
    setExamCards([]);
    setFocusedRecordIntent(null);
    setForbiddenNotice(null);
    showToast('Waad ka baxday akoonkaaga si ammaan ah.');
  };

  const logoutStudentPortal = async () => {
    await logoutAccount();
  };

  const quickLoginStudent = (studentId: string) => {
    openLoginForRole('Student');
    void studentId;
  };

  const quickLoginRole = (role: UserRole) => {
    openLoginForRole(role);
  };

  // ============================================================
  // STAFF MODULES CRUD (PERSISTED TO BACKEND KV)
  // ============================================================
  const addClass = (clsData: Omit<SchoolClass, 'id'>) => {
    const newId = `CLS-${Date.now().toString(36).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
    const next = [...classes, { ...clsData, id: newId }];
    setClasses(next);
    persistKv('classes', next, 'CREATE', 'Classes', `Waxaa la sameeyay fasal cusub: ${clsData.name} ${clsData.section}`);
    showToast('Fasalka cusub si guul leh ayaa loo abuuray.');
  };

  const updateClass = (id: string, data: Partial<SchoolClass>) => {
    const next = classes.map((c) => (c.id === id ? { ...c, ...data } : c));
    setClasses(next);
    persistKv('classes', next, 'UPDATE', 'Classes', `Waxaa la cusboonaysiiyay fasalka ${id}`);
    showToast('Fasalka waa la cusboonaysiiyay.');
  };

  const deleteClass = (id: string) => {
    const cls = classes.find((c) => c.id === id);
    const next = classes.filter((c) => c.id !== id);
    setClasses(next);
    persistKv('classes', next, 'DELETE', 'Classes', `Waxaa la tirtiray fasalka: ${cls?.name || id} (${id})`);
    showToast('Fasalka waa la tirtiray.');
  };

  const addSubject = (subjData: Omit<Subject, 'id'>) => {
    const newId = `SUB-${Date.now().toString().slice(-4)}`;
    setSubjects((prev) => {
      const next = [...prev, { ...subjData, id: newId }];
      persistKv('subjects', next, 'CREATE', 'Academics', `Waxaa la daray maado cusub: ${subjData.nameSomali}`);
      return next;
    });
    showToast('Maadada cusub waa la diiwaangeliyay.');
  };

  const updateSubject = (id: string, data: Partial<Subject>) => {
    setSubjects((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...data } : s));
      persistKv('subjects', next, 'UPDATE', 'Academics', `Waxaa la cusboonaysiiyay maadada ${id}`);
      return next;
    });
    showToast('Maadada waa la cusboonaysiiyay.');
  };

  const deleteSubject = (id: string) => {
    const subj = subjects.find((s) => s.id === id);
    setSubjects((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistKv('subjects', next, 'DELETE', 'Academics', `Waxaa la tirtiray maadada: ${subj?.nameSomali || id} (${id})`);
      return next;
    });
    showToast('Maadada waa la tirtiray.');
  };

  const addTeacher = (teacherData: Omit<Teacher, 'id'>) => {
    const maxNum = teachers.reduce((max, t) => {
      const m = /^TCH-(\d+)$/i.exec(t.id);
      return m ? Math.max(max, Number(m[1])) : max;
    }, teachers.length);
    const newId = `TCH-${String(maxNum + 1).padStart(2, '0')}`;
    const next = [...teachers, { ...teacherData, id: newId }];
    setTeachers(next);
    persistKv('teachers', next, 'CREATE', 'Teachers', `Waxaa la qoray macallin cusub: ${teacherData.fullName}`).then(() =>
      refreshUserAccounts()
    );
    showToast(`Macallinka ${teacherData.fullName} waa la diiwaangeliyay.`);
  };

  const updateTeacher = (id: string, data: Partial<Teacher>) => {
    const next = teachers.map((t) => (t.id === id ? { ...t, ...data } : t));
    setTeachers(next);
    persistKv('teachers', next, 'UPDATE', 'Teachers', `Waxaa la cusboonaysiiyay macallinka ${id}`).then(() =>
      refreshUserAccounts()
    );
    showToast('Xogta macallinka waa la cusboonaysiiyay.');
  };

  const deleteTeacher = (id: string) => {
    const teacher = teachers.find((t) => t.id === id);
    const next = teachers.filter((t) => t.id !== id);
    setTeachers(next);
    persistKv(
      'teachers',
      next,
      'DELETE',
      'Teachers',
      `Waxaa la tirtiray macallinka: ${teacher?.fullName || id} (${id})`
    ).then(() => refreshUserAccounts());
    showToast('Macallinka waa la tirtiray.');
  };

  const addStaff = (staffData: Omit<StaffMember, 'id'>) => {
    const newId = `STF-${String(staff.length + 1).padStart(2, '0')}`;
    const newStaff: StaffMember = { ...staffData, id: newId };
    setStaff((prev) => {
      const next = [...prev, newStaff];
      persistKv('staff', next, 'CREATE', 'Staff & HR', `Waxaa la diiwaangeliyay shaqaale cusub: ${newStaff.fullName}`);
      return next;
    });
    showToast(`Shaqaalaha ${newStaff.fullName} waa la diiwaangeliyay.`);
    return newStaff;
  };

  const updateStaff = (id: string, data: Partial<StaffMember>) => {
    setStaff((prev) => {
      const next = prev.map((s) => (s.id === id ? { ...s, ...data } : s));
      persistKv('staff', next, 'UPDATE', 'Staff & HR', `Waxaa la cusboonaysiiyay shaqaalaha ${id}`);
      return next;
    });
    showToast('Xogta shaqaalaha waa la cusboonaysiiyay.');
  };

  const deleteStaff = (id: string) => {
    const stf = staff.find((s) => s.id === id);
    setStaff((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistKv('staff', next, 'DELETE', 'Staff & HR', `Waxaa la tirtiray shaqaalaha: ${stf?.fullName || id} (${id})`);
      return next;
    });
    showToast('Shaqaalaha waa la tirtiray.');
  };

  const saveAttendanceBatch = (newRecords: AttendanceRecord[]) => {
    setAttendance((prev) => {
      const keys = new Set(newRecords.map((r) => `${r.date}_${r.studentId}`));
      const filtered = prev.filter((r) => !keys.has(`${r.date}_${r.studentId}`));
      const next = [...newRecords, ...filtered];
      persistKv('attendance', next, 'CREATE', 'Attendance', `Waxaa la xareeyay xaadirinta ${newRecords.length} arday.`);
      return next;
    });
    showToast('Xaadirinta ardayda si guul leh ayaa loo keydiyay!');
  };

  // ============================================================
  // GLOBAL SEARCH & RECORD NAVIGATION
  // ============================================================
  const searchGlobal = useCallback(
    async (params: GlobalSearchParams): Promise<{ data?: GlobalSearchResponse; error?: string; status?: number }> => {
      if (!authToken) {
        return { error: 'Fadlan gal akoonkaaga.', status: 401 };
      }
      const qs = new URLSearchParams();
      if (params.query) qs.set('q', params.query);
      if (params.category && params.category !== 'all') qs.set('category', params.category);
      if (params.classId && params.classId !== 'all') qs.set('classId', params.classId);
      if (params.page) qs.set('page', String(params.page));
      if (params.limit) qs.set('limit', String(params.limit));

      try {
        const res = await apiFetch(`/api/search?${qs.toString()}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { error: body?.error || 'Raadinta ma shaqeyn.', status: res.status };
        }
        return { data: body as GlobalSearchResponse, status: res.status };
      } catch {
        return { error: 'Khalad shabakad ah ayaa dhacay xilliga raadinta.', status: 500 };
      }
    },
    [authToken, apiFetch]
  );

  const openRecordFromSearch = useCallback(
    (intent: FocusedRecordIntent) => {
      setFocusedRecordIntent(intent);
      const targetModuleMap: Record<FocusedRecordIntent['type'], string> = {
        student: 'students',
        teacher: 'teachers',
        staff: 'hr',
        class: 'classes',
        subject: 'classes',
        exam: 'exams',
        invoice: 'fees',
      };
      const targetModule = targetModuleMap[intent.type];
      if (currentUser && canAccessModule(currentUser.role, targetModule, currentUser.permissions, rbacPolicies)) {
        setActiveModuleState(targetModule);
      } else if (intent.type === 'student' && currentUser?.role === 'Teacher') {
        // Teachers view students inside Attendance or Exams
        setActiveModuleState('exams');
      } else {
        showToast('Xogtan ma geli karo doorkaaga.');
      }
    },
    [currentUser, rbacPolicies, showToast]
  );

  // ============================================================
  // STAFF ATTENDANCE CRUD (BLOCKED WITH 403 FOR TEACHERS)
  // ============================================================
  const fetchStaffAttendance = useCallback(
    async (date?: string) => {
      try {
        const qs = date ? `?date=${encodeURIComponent(date)}` : '';
        const res = await apiFetch(`/api/staff-attendance${qs}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, status: res.status, error: body?.error || 'Forbidden' };
        }
        if (Array.isArray(body)) {
          if (!date) setStaffAttendance(body);
          return { ok: true, status: res.status, records: body as StaffAttendanceRecord[] };
        }
        return { ok: true, status: res.status, records: [] };
      } catch {
        return { ok: false, status: 500, error: 'Khalad shabakad ah.' };
      }
    },
    [apiFetch]
  );

  const saveStaffAttendanceBatch = useCallback(
    async (records: Partial<StaffAttendanceRecord>[]): Promise<boolean> => {
      try {
        const res = await apiFetch('/api/staff-attendance', {
          method: 'POST',
          body: JSON.stringify({ records }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body?.error || 'Ma awoodid inaad kaydiso xaadirinta shaqaalaha.');
          return false;
        }
        await fetchStaffAttendance();
        fetchAuditLogs();
        showToast('Xaadirinta shaqaalaha si guul leh ayaa loo keydiyay.');
        return true;
      } catch {
        showToast('Khalad shabakad ah ayaa dhacay.');
        return false;
      }
    },
    [apiFetch, fetchStaffAttendance, fetchAuditLogs, showToast]
  );

  const updateStaffAttendanceRecord = useCallback(
    async (id: string, updates: Partial<StaffAttendanceRecord>): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/staff-attendance/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body?.error || 'Cusboonaysiintu way fashilantay.');
          return false;
        }
        setStaffAttendance((prev) => prev.map((r) => (r.id === id ? (body as StaffAttendanceRecord) : r)));
        fetchAuditLogs();
        showToast('Xaadirinta shaqaalaha waa la cusboonaysiiyay.');
        return true;
      } catch {
        showToast('Khalad shabakad ah ayaa dhacay.');
        return false;
      }
    },
    [apiFetch, fetchAuditLogs, showToast]
  );

  const deleteStaffAttendanceRecord = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/staff-attendance/${id}`, { method: 'DELETE' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body?.error || 'Tirtiriddu way fashilantay.');
          return false;
        }
        setStaffAttendance((prev) => prev.filter((r) => r.id !== id));
        fetchAuditLogs();
        showToast('Diiwaanka xaadirinta shaqaalaha waa la tirtiray.');
        return true;
      } catch {
        showToast('Khalad shabakad ah ayaa dhacay.');
        return false;
      }
    },
    [apiFetch, fetchAuditLogs, showToast]
  );

  // ============================================================
  // EXAMINATION ID CARD GENERATOR & CRUD (/api/exam-cards*)
  // ============================================================
  const fetchExamCardsData = useCallback(async () => {
    if (!authToken) return;
    try {
      const [bRes, cRes] = await Promise.all([
        apiFetch('/api/exam-cards/batches'),
        apiFetch('/api/exam-cards'),
      ]);
      if (bRes.ok) {
        const bData = await bRes.json();
        if (Array.isArray(bData)) setExamCardBatches(bData);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        if (Array.isArray(cData)) setExamCards(cData);
      }
    } catch {
      // ignore
    }
  }, [authToken, apiFetch]);

  const generateExamCardsBatch = useCallback(
    async (payload: {
      classId: string;
      section?: string;
      academicYear: string;
      examId?: string;
      examTitle: string;
      examDate: string;
      instructions: string;
      cardsPerPage: 5 | 8;
      studentIds?: string[];
      includeInactive?: boolean;
      regenerate?: boolean;
    }) => {
      try {
        const res = await apiFetch('/api/exam-cards/generate', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body?.error || 'Soo saarista kaararka imtixaanka way fashilantay.');
          return {
            ok: false,
            error: body?.error || 'Soo saarista kaararka way fashilantay.',
            status: res.status,
            skippedDuplicateCount: body?.skippedDuplicateCount,
            skippedInactiveCount: body?.skippedInactiveCount,
          };
        }
        await fetchExamCardsData();
        fetchAuditLogs();
        showToast(
          `Waxaa la diyaariyay ${body.createdCount || 0} kaar cusub` +
            (body.regeneratedCount ? ` & ${body.regeneratedCount} la cusboonaysiiyay` : '') +
            '!'
        );
        return {
          ok: true,
          status: res.status,
          batch: body.batch,
          cards: body.cards,
          createdCount: body.createdCount,
          regeneratedCount: body.regeneratedCount,
          skippedDuplicateCount: body.skippedDuplicateCount,
          skippedInactiveCount: body.skippedInactiveCount,
        };
      } catch {
        showToast('Khalad shabakad ah ayaa dhacay.');
        return { ok: false, error: 'Khalad shabakad ah.', status: 500 };
      }
    },
    [apiFetch, fetchExamCardsData, fetchAuditLogs, showToast]
  );

  const updateExamCardBatch = useCallback(
    async (id: string, updates: Partial<ExamCardBatch>): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/exam-cards/batches/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body?.error || 'Cusboonaysiinta batch-ku way fashilantay.');
          return false;
        }
        await fetchExamCardsData();
        fetchAuditLogs();
        showToast('Macluumaadka batch-ka kaararka waa la cusboonaysiiyay.');
        return true;
      } catch {
        showToast('Khalad shabakad ah ayaa dhacay.');
        return false;
      }
    },
    [apiFetch, fetchExamCardsData, fetchAuditLogs, showToast]
  );

  const regenerateExamCardBatch = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/exam-cards/batches/${id}/regenerate`, {
          method: 'POST',
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body?.error || 'Dib u cusboonaysiinta way fashilantay.');
          return false;
        }
        await fetchExamCardsData();
        fetchAuditLogs();
        showToast(`Xogta ${body.refreshedCount || 0} kaar dib ayaa loo waafajiyay diiwaanka ardayda.`);
        return true;
      } catch {
        showToast('Khalad shabakad ah ayaa dhacay.');
        return false;
      }
    },
    [apiFetch, fetchExamCardsData, fetchAuditLogs, showToast]
  );

  const deleteExamCardBatch = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/exam-cards/batches/${id}`, { method: 'DELETE' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body?.error || 'Tirtiridda batch-ku way fashilantay.');
          return false;
        }
        setExamCardBatches((prev) => prev.filter((b) => b.id !== id));
        setExamCards((prev) => prev.filter((c) => c.batchId !== id));
        fetchAuditLogs();
        showToast('Batch-ka kaararka waa la tirtiray (xogta ardayda lama taaban).');
        return true;
      } catch {
        showToast('Khalad shabakad ah ayaa dhacay.');
        return false;
      }
    },
    [apiFetch, fetchAuditLogs, showToast]
  );

  const updateExamCardRecord = useCallback(
    async (id: string, updates: Partial<ExamCard>): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/exam-cards/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body?.error || 'Cusboonaysiinta kaarku way fashilantay.');
          return false;
        }
        setExamCards((prev) => prev.map((c) => (c.id === id ? (body as ExamCard) : c)));
        fetchAuditLogs();
        showToast('Kaarka imtixaanka waa la cusboonaysiiyay.');
        return true;
      } catch {
        showToast('Khalad shabakad ah ayaa dhacay.');
        return false;
      }
    },
    [apiFetch, fetchAuditLogs, showToast]
  );

  const deleteExamCardRecord = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const res = await apiFetch(`/api/exam-cards/${id}`, { method: 'DELETE' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(body?.error || 'Tirtiridda kaarku way fashilantay.');
          return false;
        }
        setExamCards((prev) => prev.filter((c) => c.id !== id));
        if (body.batchId !== undefined && typeof body.remainingCount === 'number') {
          setExamCardBatches((prev) =>
            prev.map((b) => (b.id === body.batchId ? { ...b, cardCount: body.remainingCount } : b))
          );
        }
        fetchAuditLogs();
        showToast('Kaarka imtixaanka waa la tirtiray.');
        return true;
      } catch {
        showToast('Khalad shabakad ah ayaa dhacay.');
        return false;
      }
    },
    [apiFetch, fetchAuditLogs, showToast]
  );

  const addExam = (examData: Omit<Examination, 'id'>) => {
    const newId = `EXAM-${String(exams.length + 1).padStart(2, '0')}`;
    setExams((prev) => {
      const next = [...prev, { ...examData, id: newId }];
      persistKv('exams', next, 'CREATE', 'Examinations', `Waxaa la abuuray imtixaan cusub: ${examData.title}`);
      return next;
    });
    showToast('Imtixaanka cusub waa la abuuray.');
  };

  const updateExam = (id: string, data: Partial<Examination>) => {
    setExams((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...data } : e));
      persistKv('exams', next, 'UPDATE', 'Examinations', `Waxaa la cusboonaysiiyay imtixaanka ${id}`);
      return next;
    });
    showToast('Imtixaanka waa la cusboonaysiiyay.');
  };

  const deleteExam = (id: string) => {
    const ex = exams.find((e) => e.id === id);
    setExams((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistKv('exams', next, 'DELETE', 'Examinations', `Waxaa la tirtiray imtixaanka: ${ex?.title || id} (${id})`);
      return next;
    });
    showToast('Imtixaanka waa la tirtiray.');
  };

  const saveMarksBatch = (newMarks: ExamMark[]) => {
    setMarks((prev) => {
      const keys = new Set(newMarks.map((m) => `${m.examId}_${m.studentId}_${m.subjectId}`));
      const filtered = prev.filter((m) => !keys.has(`${m.examId}_${m.studentId}_${m.subjectId}`));
      const next = [...newMarks, ...filtered];
      persistKv('marks', next, 'CREATE', 'Examinations', `Waxaa la galiyay buundooyinka ${newMarks.length} maado.`);
      return next;
    });
    showToast('Buundooyinka imtixaanka waa la keydiyay!');
  };

  const uploadStudentMarksBulk = (bulkMarks: ExamMark[]) => {
    saveMarksBatch(bulkMarks);
    showToast(`Waxaa si guul leh loo soo galiyay ${bulkMarks.length} buundo oo cusub!`);
  };

  const updateSingleMark = (markId: string, score: number, remarks?: string) => {
    const calculateGrade = (s: number) => {
      if (s >= 95) return 'A+';
      if (s >= 85) return 'A';
      if (s >= 75) return 'B+';
      if (s >= 65) return 'B';
      if (s >= 55) return 'C+';
      if (s >= 50) return 'C';
      if (s >= 40) return 'D';
      return 'F';
    };

    setMarks((prev) => {
      const next = prev.map((m) =>
        m.id === markId
          ? {
              ...m,
              marksObtained: score,
              grade: calculateGrade(score),
              remarks: remarks !== undefined ? remarks : m.remarks,
            }
          : m
      );
      persistKv('marks', next, 'UPDATE', 'Examinations', `Waxaa la cusboonaysiiyay buundada ${markId}`);
      return next;
    });
    showToast('Buundada ardayga waa la cusboonaysiiyay.');
  };

  const generateClassInvoices = (classId: string, feeStructureId: string, month: string, dueDate: string) => {
    const fee = feeStructures.find((f) => f.id === feeStructureId);
    if (!fee) return 0;
    const enrolledStudents = students.filter((s) => s.classId === classId && s.status === 'Active');

    const newInvoices: StudentInvoice[] = enrolledStudents.map((s, index) => {
      const invId = `INV-2026-${Date.now().toString().slice(-4)}${index}`;
      return {
        id: invId,
        studentId: s.id,
        feeStructureId: fee.id,
        title: `${fee.name} - ${month}`,
        dueDate,
        amount: fee.amount,
        paidAmount: 0,
        balance: fee.amount,
        status: 'Unpaid',
        month,
      };
    });

    setInvoices((prev) => {
      const next = [...newInvoices, ...prev];
      persistKv('invoices', next, 'PAYMENT', 'Fees & Invoices', `Waxaa loo sameeyay ${newInvoices.length} biil fasalka ${classId}`);
      return next;
    });
    showToast(`Waxaa la soo saaray ${newInvoices.length} biil oo cusub.`);
    return newInvoices.length;
  };

  const recordPayment = (paymentData: Omit<FeePayment, 'id'>): FeePayment => {
    const receiptId = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPayment: FeePayment = { ...paymentData, id: receiptId };

    setPayments((prev) => {
      const next = [newPayment, ...prev];
      persistKv('payments', next, 'PAYMENT', 'Fees & Invoices', `Waxaa la xareeyay lacag-bixin $${paymentData.amount} (${receiptId})`);
      return next;
    });

    setInvoices((prev) => {
      const next = prev.map((inv) => {
        if (inv.id === paymentData.invoiceId) {
          const updatedPaid = inv.paidAmount + paymentData.amount;
          const updatedBalance = Math.max(0, inv.amount - updatedPaid);
          const updatedStatus: StudentInvoice['status'] =
            updatedBalance === 0 ? 'Paid' : updatedPaid > 0 ? 'Partial' : inv.status;
          return {
            ...inv,
            paidAmount: updatedPaid,
            balance: updatedBalance,
            status: updatedStatus,
          };
        }
        return inv;
      });
      persistKv('invoices', next);
      return next;
    });

    showToast(`Lacag-bixinta $${paymentData.amount} si guul leh ayaa loo xareeyay (Rasiid: ${receiptId}).`);
    return newPayment;
  };

  const recalculateInvoicesFromPayments = (nextPayments: FeePayment[]) => {
    setInvoices((prev) => {
      const next = prev.map((inv) => {
        const paidForInvoice = nextPayments
          .filter((p) => p.invoiceId === inv.id)
          .reduce((sum, p) => sum + p.amount, 0);
        const updatedBalance = Math.max(0, inv.amount - paidForInvoice);
        const updatedStatus: StudentInvoice['status'] =
          updatedBalance === 0 ? 'Paid' : paidForInvoice > 0 ? 'Partial' : 'Unpaid';
        return {
          ...inv,
          paidAmount: paidForInvoice,
          balance: updatedBalance,
          status: updatedStatus,
        };
      });
      persistKv('invoices', next);
      return next;
    });
  };

  const updatePayment = (id: string, data: Partial<FeePayment>) => {
    const nextPayments = payments.map((p) => (p.id === id ? { ...p, ...data } : p));
    setPayments(nextPayments);
    persistKv('payments', nextPayments, 'UPDATE', 'Fees & Invoices', `Waxaa la cusboonaysiiyay rasiidka ${id}`);
    recalculateInvoicesFromPayments(nextPayments);
    showToast('Dakhliga rasiidka si guul leh ayaa loo cusboonaysiiyay.');
  };

  const deletePayment = (id: string) => {
    const nextPayments = payments.filter((p) => p.id !== id);
    setPayments(nextPayments);
    persistKv('payments', nextPayments, 'DELETE', 'Fees & Invoices', `Waxaa la tirtiray rasiidka ${id}`);
    recalculateInvoicesFromPayments(nextPayments);
    showToast('Rasiidka lacag-bixinta waa la tirtiray.');
  };

  const addIncome = (incomeData: Omit<IncomeRecord, 'id'>): IncomeRecord => {
    const incId = `INC-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newIncome: IncomeRecord = { ...incomeData, id: incId };
    setIncomes((prev) => {
      const next = [newIncome, ...prev];
      persistKv('incomes', next, 'CREATE', 'Finance & Incomes', `Waxaa la galiyay dakhli cusub: $${incomeData.amount} (${incomeData.title})`);
      return next;
    });
    showToast(`Dakhliga cusub $${incomeData.amount} si guul leh ayaa loo keydiyay!`);
    return newIncome;
  };

  const updateIncome = (id: string, data: Partial<IncomeRecord>) => {
    setIncomes((prev) => {
      const next = prev.map((inc) => (inc.id === id ? { ...inc, ...data } : inc));
      persistKv('incomes', next, 'UPDATE', 'Finance & Incomes', `Waxaa wax laga beddelay dakhliga ${id}`);
      return next;
    });
    showToast('Xogta dakhliga si guul leh ayaa loo cusboonaysiiyay.');
  };

  const deleteIncome = (id: string) => {
    const target = incomes.find((inc) => inc.id === id);
    setIncomes((prev) => {
      const next = prev.filter((inc) => inc.id !== id);
      persistKv('incomes', next, 'DELETE', 'Finance & Incomes', `Waxaa la tirtiray dakhliga: ${target?.title || id}`);
      return next;
    });
    showToast('Dakhliga waa la tirtiray.');
  };

  const zeroAllIncomes = () => {
    setIncomes([]);
    setPayments([]);
    persistKv('incomes', [], 'DELETE', 'Finance & Incomes', 'Dhammaan dakhliyadii dugsiga waxaa laga dhigay $0.00 (Eber).');
    persistKv('payments', []);
    setInvoices((prev) => {
      const next = prev.map((inv) => ({
        ...inv,
        paidAmount: 0,
        balance: inv.amount,
        status: (inv.status === 'Paid' || inv.status === 'Partial' ? 'Unpaid' : inv.status) as StudentInvoice['status'],
      }));
      persistKv('invoices', next);
      return next;
    });
    showToast('Dhammaan dakhliyada waxaa laga dhigay $0.00. Hadda geli dakhli cusub!');
  };

  const addExpense = (expenseData: Omit<ExpenseVoucher, 'id'>) => {
    const expId = `EXP-2026-${Math.floor(100 + Math.random() * 900)}`;
    setExpenses((prev) => {
      const next = [{ ...expenseData, id: expId }, ...prev];
      persistKv('expenses', next, 'CREATE', 'Finance & Expenses', `Waxaa la sameeyay foojarka kharashka: $${expenseData.amount} (${expenseData.title})`);
      return next;
    });
    showToast(`Foojarka kharashka $${expenseData.amount} waa la abuuray.`);
  };

  const updateExpense = (id: string, data: Partial<ExpenseVoucher>) => {
    setExpenses((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, ...data } : e));
      persistKv('expenses', next, 'UPDATE', 'Finance & Expenses', `Waxaa wax laga beddelay foojarka kharashka ${id}`);
      return next;
    });
    showToast('Foojarka kharashka si guul leh ayaa loo cusboonaysiiyay.');
  };

  const deleteExpense = (id: string) => {
    const target = expenses.find((e) => e.id === id);
    setExpenses((prev) => {
      const next = prev.filter((e) => e.id !== id);
      persistKv('expenses', next, 'DELETE', 'Finance & Expenses', `Waxaa la tirtiray foojarka kharashka: ${target?.title || id}`);
      return next;
    });
    showToast('Foojarka kharashka waa la tirtiray.');
  };

  const updateExpenseStatus = (id: string, status: 'Approved' | 'Pending' | 'Rejected') => {
    setExpenses((prev) => {
      const next = prev.map((e) => (e.id === id ? { ...e, status } : e));
      persistKv('expenses', next, 'UPDATE', 'Finance & Expenses', `Waxaa la beddelay xaaladda foojarka ${id} -> ${status}`);
      return next;
    });
    showToast(`Foojarka xaaladdiisu hadda waa ${status}.`);
  };

  const addLeaveRequest = (reqData: Omit<StaffLeaveRequest, 'id' | 'requestDate' | 'status'>) => {
    const canPersistKvDirect =
      currentRole === 'Super Admin' || currentRole === 'Administrator' || currentRole === 'HR Manager';
    if (canPersistKvDirect) {
      const newId = `LVE-2026-${Math.floor(10 + Math.random() * 90)}`;
      const newReq: StaffLeaveRequest = {
        ...reqData,
        id: newId,
        requestDate: new Date().toISOString().substring(0, 10),
        status: 'Pending',
      };
      const next = [newReq, ...leaveRequests];
      setLeaveRequests(next);
      persistKv('leaveRequests', next, 'CREATE', 'HR & Leave', `Codsiga fasaxa ee ${reqData.staffName} ayaa la gudbiyay.`);
      showToast('Codsigaaga fasaxa waa la gudbiyay, sug oggolaanshaha maamulka.');
      return;
    }

    apiFetch('/api/leave-requests', {
      method: 'POST',
      body: JSON.stringify(reqData),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) {
          showToast(body?.error || 'Dirista codsiga fasaxa way fashilantay.');
          return;
        }
        setLeaveRequests((prev) => [body as StaffLeaveRequest, ...prev]);
        showToast('Codsigaaga fasaxa waa la gudbiyay, sug oggolaanshaha maamulka.');
      })
      .catch(() => {
        showToast('Khalad shabakad ah ayaa dhacay dirista codsiga.');
      });
  };

  const updateLeaveStatus = (id: string, status: 'Approved' | 'Rejected') => {
    setLeaveRequests((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, status, approvedBy: settings.principalName } : l));
      persistKv('leaveRequests', next, 'UPDATE', 'HR & Leave', `Waxaa la ${status === 'Approved' ? 'oggolaaday' : 'diiday'} fasaxii ${id}`);
      return next;
    });
    showToast(`Codsiga fasaxa waa la ${status === 'Approved' ? 'oggolaaday' : 'diiday'}.`);
  };

  const generateMonthlyPayroll = (month: string) => {
    const activeStaff = staff.filter((s) => s.status === 'Active');
    const newPayroll: PayrollRecord[] = activeStaff.map((stf, index) => {
      const net = stf.basicSalary + stf.allowance;
      return {
        id: `PAY-2026-${Date.now().toString().slice(-4)}${index}`,
        month,
        staffId: stf.id,
        basicSalary: stf.basicSalary,
        allowances: stf.allowance,
        deductions: 0,
        netSalary: net,
        paymentDate: new Date().toISOString().substring(0, 10),
        status: 'Paid',
        paymentMethod: 'Salaam Bank',
        referenceNo: `SLM-PAY-${Math.floor(1000 + Math.random() * 9000)}`,
      };
    });

    setPayroll((prev) => {
      const next = [...newPayroll, ...prev];
      persistKv('payroll', next, 'PAYMENT', 'HR & Payroll', `Waxaa la bixiyay mushaharka ${newPayroll.length} shaqaale ee bisha ${month}`);
      return next;
    });
    showToast(`Mushaharka ${newPayroll.length} shaqaale ee ${month} si guul leh ayaa loo diyaariyay.`);
    return newPayroll.length;
  };

  const addTimetableSlot = (slotData: Omit<TimetableSlot, 'id'>) => {
    const teacherConflict = timetable.find(
      (t) => t.day === slotData.day && t.period === slotData.period && t.teacherId === slotData.teacherId
    );
    if (teacherConflict) {
      const conflictTeacher = teachers.find((tch) => tch.id === slotData.teacherId);
      const conflictClass = classes.find((c) => c.id === teacherConflict.classId);
      return {
        success: false,
        conflictMessage: `Isku-dhac: Macallinka (${conflictTeacher?.fullName || 'Macallinka'}) wuxuu xilligan Casharka ${slotData.period} ku jiraa fasalka kale ee ${conflictClass?.name} ${conflictClass?.section}!`,
      };
    }

    const classConflict = timetable.find(
      (t) => t.day === slotData.day && t.period === slotData.period && t.classId === slotData.classId
    );
    if (classConflict) {
      const conflictSubj = subjects.find((s) => s.id === classConflict.subjectId);
      return {
        success: false,
        conflictMessage: `Isku-dhac: Fasalkani xilligan Casharka ${slotData.period} waxaa horey loogu qorsheeyay maadada (${conflictSubj?.nameSomali})!`,
      };
    }

    const newId = `TT-${Date.now().toString().slice(-4)}`;
    setTimetable((prev) => {
      const next = [...prev, { ...slotData, id: newId }];
      persistKv('timetable', next, 'CREATE', 'Timetable', `Waxaa la qorsheeyay casharka ${slotData.period} ee ${slotData.day}`);
      return next;
    });
    showToast('Casharka si guul leh ayaa loogu daray jadwalka!');
    return { success: true };
  };

  const deleteTimetableSlot = (id: string) => {
    setTimetable((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistKv('timetable', next, 'DELETE', 'Timetable', `Waxaa la tirtiray casharka ${id}`);
      return next;
    });
    showToast('Casharka waa laga saaray jadwalka.');
  };

  const addAnnouncement = (annData: Omit<Announcement, 'id' | 'date' | 'read'>) => {
    const newId = `ANN-${Date.now().toString().slice(-4)}`;
    const newAnn: Announcement = {
      ...annData,
      id: newId,
      date: new Date().toISOString().substring(0, 10),
      read: false,
    };
    setAnnouncements((prev) => {
      const next = [newAnn, ...prev];
      persistKv('announcements', next, 'CREATE', 'Messaging', `Waxaa la daabacay ogeysiis: ${annData.title}`);
      return next;
    });
    showToast('Ogeysiiska waa la daabacay.');
  };

  const markAnnouncementRead = (id: string) => {
    setAnnouncements((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, read: true } : a));
      if (currentRole !== 'Student' && currentRole !== 'Parent') {
        persistKv('announcements', next);
      } else if (authenticatedStudentId) {
        logStudentActivity(
          authenticatedStudentId,
          'VIEW_ANNOUNCEMENTS',
          `Ardayga ayaa akhriyay ogeysiiska ${id}`,
          `announcement:${id}`
        );
      }
      return next;
    });
  };

  const addTicket = async (
    ticketData: Omit<SupportTicket, 'id' | 'ticketNumber' | 'createdAt' | 'messages'>,
    initialMessage: string
  ) => {
    try {
      const res = await apiFetch('/api/tickets', {
        method: 'POST',
        body: JSON.stringify({
          subject: ticketData.subject,
          category: ticketData.category,
          priority: ticketData.priority,
          initialMessage,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as SupportTicket;
        setTickets((prev) => [created, ...prev]);
        showToast(`Tikidhkaaga lambarkiisu waa ${created.ticketNumber}.`);
      }
    } catch {
      showToast('Khalad ayaa ka dhacay dirista tikidhka.');
    }
  };

  const replyToTicket = async (ticketId: string, messageText: string) => {
    const senderName = currentUser ? currentUser.fullName : `${currentRole}`;
    try {
      const res = await apiFetch(`/api/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: messageText }),
      });
      if (res.ok) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  messages: [
                    ...t.messages,
                    {
                      id: `MSG-${Date.now()}`,
                      sender: senderName,
                      role: currentRole,
                      text: messageText,
                      timestamp: new Date().toISOString().substring(0, 16).replace('T', ' '),
                    },
                  ],
                }
              : t
          )
        );
        showToast('Jawaabtaada waa la diray.');
      }
    } catch {
      showToast('Khalad ayaa ka dhacay dirista jawaabta.');
    }
  };

  const updateTicketStatus = async (ticketId: string, status: 'Open' | 'In Progress' | 'Resolved') => {
    // Update only this ticket on the server. Saving the whole local list here used to
    // overwrite (delete) tickets that students had submitted after this page loaded.
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status } : t)));
    try {
      const res = await apiFetch(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        showToast('Khalad ayaa ka dhacay beddelka xaaladda tikidhka.');
        refreshTickets();
        return;
      }
      showToast(`Xaaladda tikidhka waxaa laga dhigay: ${status}`);
    } catch {
      showToast('Khalad ayaa ka dhacay beddelka xaaladda tikidhka.');
    }
  };

  const openPrint = (data: PrintModalData) => {
    if (currentRole === 'Student' || currentRole === 'Parent') {
      if (authenticatedStudentId) {
        logStudentActivity(
          authenticatedStudentId,
          'UNAUTHORIZED_ACCESS',
          `Isku day daabacaad aan la oggolayn (${data.type || 'document'})`,
          'print'
        );
      }
      showToast('Ardaydu ma daabacan karaan dukumiintiyada — Portal-ku waa Eegis Kaliya (View Only).');
      return;
    }
    setPrintModal(data);
  };

  const closePrint = () => {
    setPrintModal(null);
  };

  const resetToDefault = async () => {
    try {
      const res = await apiFetch('/api/admin/reset-seed', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(body?.error || 'Dib u celinta xogtu way fashilantay.');
        return;
      }
      await hydrateFromBackend(authToken, false);
      showToast('Xogtii asalka ahayd ee tusaalaha ahayd ayaa dib loo soo celiyay.');
    } catch {
      showToast('Khalad shabakad ah ayaa dhacay dib u celinta xogta.');
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        isBootstrapping,
        currentRole,
        setCurrentRole,
        activeModule,
        setActiveModule,
        activeChildKey,
        navigationIntent,
        navigateToSubmenu,
        clearNavigationIntent,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        toggleSidebarCollapsed,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        searchTerm,
        setSearchTerm,
        focusedRecordIntent,
        setFocusedRecordIntent,
        openRecordFromSearch,
        forbiddenNotice,
        setForbiddenNotice,
        searchGlobal,
        settings,
        updateSettings,
        students,
        addStudent,
        addStudentsBatch,
        updateStudent,
        deleteStudent,
        dropStudent,
        restoreStudent,
        promoteStudents,
        activeStudentPortalId,
        setActiveStudentPortalId,
        generateStudentCredentials,
        changeStudentPassword,
        adminResetStudentPassword,
        logStudentActivity,
        fetchStudentPortalSection,
        userAccounts,
        rbacPolicies,
        refreshUserAccounts,
        addUserAccount,
        updateUserAccount,
        toggleUserAccountStatus,
        resetUserAccountPassword,
        deleteUserAccount,
        updateRbacPolicies,
        fetchLoginActivity,
        currentUser,
        loginTargetRole,
        setLoginTargetRole,
        openLoginForRole,
        authenticateUser,
        logoutAccount,
        authenticatedStudentId,
        isStudentAuthenticated: !!authenticatedStudentId,
        loginAsStudent,
        loginAsStaff,
        logoutStudentPortal,
        quickLoginStudent,
        quickLoginRole,
        isPortalLoginModalOpen,
        setIsPortalLoginModalOpen,
        classes,
        addClass,
        updateClass,
        deleteClass,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        teachers,
        addTeacher,
        updateTeacher,
        deleteTeacher,
        staff,
        addStaff,
        updateStaff,
        deleteStaff,
        attendance,
        saveAttendanceBatch,
        staffAttendance,
        fetchStaffAttendance,
        saveStaffAttendanceBatch,
        updateStaffAttendanceRecord,
        deleteStaffAttendanceRecord,
        examCardBatches,
        examCards,
        fetchExamCardsData,
        generateExamCardsBatch,
        updateExamCardBatch,
        regenerateExamCardBatch,
        deleteExamCardBatch,
        updateExamCardRecord,
        deleteExamCardRecord,
        exams,
        addExam,
        updateExam,
        deleteExam,
        marks,
        saveMarksBatch,
        uploadStudentMarksBulk,
        updateSingleMark,
        feeStructures,
        invoices,
        payments,
        generateClassInvoices,
        recordPayment,
        updatePayment,
        deletePayment,
        incomes,
        addIncome,
        updateIncome,
        deleteIncome,
        zeroAllIncomes,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        updateExpenseStatus,
        leaveRequests,
        addLeaveRequest,
        updateLeaveStatus,
        payroll,
        generateMonthlyPayroll,
        timetable,
        addTimetableSlot,
        deleteTimetableSlot,
        announcements,
        addAnnouncement,
        markAnnouncementRead,
        tickets,
        addTicket,
        replyToTicket,
        updateTicketStatus,
        auditLogs,
        fetchAuditLogs,
        logAudit,
        printModal,
        openPrint,
        closePrint,
        resetToDefault,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
