/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'Super Admin'
  | 'Administrator'
  | 'Academic Manager'
  | 'Accountant'
  | 'Teacher'
  | 'HR Manager'
  | 'Receptionist'
  | 'Student'
  | 'Parent'
  | 'Institute';

export type Gender = 'Male' | 'Female';
export type StudyShift = 'Subax' | 'Galab';

export interface Student {
  id: string; // e.g. STU-2026-001
  rollNumber: string; // e.g. 101
  fullName: string;
  arabicName: string;
  gender: Gender;
  birthDate: string;
  classId: string; // e.g. CLS-1A
  section: string; // A, B, C, D
  shift?: StudyShift; // Subax or Galab
  admissionDate: string;
  status: 'Active' | 'Withdrawn' | 'Suspended' | 'Dropped' | 'Alumni' | 'Transferred' | 'Deleted';
  photoUrl: string;
  bloodGroup: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  guardianAddress: string;
  emergencyContact: string;
  notes?: string;
  portalUsername: string;
  portalPassword?: string;
  mustChangePassword?: boolean;
  idCardIssueDate?: string;
  idCardExpiryDate?: string;
  idCardStatus?: 'Active' | 'Deleted';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface SchoolClass {
  id: string;
  name: string; // e.g. Fasalka 1aad
  section: string; // e.g. A
  shift?: StudyShift; // Subax or Galab
  roomNumber: string; // e.g. Qolka 104
  capacity: number;
  classTeacherId: string;
  academicYear: string;
}

export interface Subject {
  id: string;
  code: string; // e.g. ISL-101
  nameSomali: string; // e.g. Tarbiyada Islaamka
  nameArabic: string; // e.g. التربية الإسلامية
  classId: string;
  teacherId: string;
  creditHours: number;
  maxMarks: number;
  passMarks: number;
}

export interface Teacher {
  id: string; // e.g. TCH-01
  fullName: string;
  arabicName: string;
  gender: Gender;
  phone: string;
  email: string;
  photoUrl?: string;
  specialization: string; // e.g. Culuunta Islaamka & Carabiga
  qualification: string; // e.g. Bachelor of Islamic Studies - Jaamacadda Bariga Afrika
  joiningDate: string;
  status: 'Active' | 'On Leave' | 'Resigned';
  monthlySalary: number;
  weeklyHours: number;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Excused';

export interface AttendanceRecord {
  id: string;
  date: string; // YYYY-MM-DD
  classId: string;
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface StaffAttendanceRecord {
  id: string;
  date: string;
  staffId: string;
  personName?: string;
  department?: string;
  roleTitle?: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  remarks?: string;
  recordedBy?: string;
}

export interface Examination {
  id: string;
  title: string; // e.g. Imtixaanka Bartamaha Sanadka (Mid-Term)
  term: 'Month 1' | 'Mid-Term' | 'Final Term';
  academicYear: string;
  startDate: string;
  endDate: string;
  status: 'Draft' | 'Published' | 'Archived';
  description?: string;
}

export interface ExamMark {
  id: string;
  examId: string;
  studentId: string;
  subjectId: string;
  marksObtained: number;
  maxMarks: number;
  grade: string; // A+, A, B+, B, C+, C, D, F
  remarks: string;
}

export interface FeeStructure {
  id: string;
  name: string; // e.g. Lacagta Bisha (Tuition Fee)
  category: 'Tuition' | 'Admission' | 'Exam' | 'Books_Uniform' | 'Transport';
  amount: number;
  academicYear: string;
  description?: string;
}

export interface StudentInvoice {
  id: string; // e.g. INV-2026-0120
  studentId: string;
  feeStructureId: string;
  title: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: 'Paid' | 'Partial' | 'Unpaid' | 'Overdue';
  month: string; // e.g. October 2026
}

export interface FeePayment {
  id: string; // e.g. REC-2026-0842
  invoiceId: string;
  studentId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'EVC Plus' | 'Salaam Bank' | 'Dahabshiil / eDahab' | 'Cash';
  referenceNumber: string;
  receivedBy: string;
  notes?: string;
}

export interface IncomeRecord {
  id: string; // e.g. INC-2026-001
  date: string;
  category:
    | 'Tuition & Fees'
    | 'Admissions & Registration'
    | 'Donations & Zakat'
    | 'Books & Uniforms'
    | 'Grants & Support'
    | 'Other Income';
  categorySomali: string;
  title: string;
  amount: number;
  receivedFrom: string;
  paymentMethod: 'EVC Plus' | 'Salaam Bank' | 'Dahabshiil / eDahab' | 'Cash';
  referenceNo: string;
  receivedBy: string;
  notes?: string;
}

export interface ExpenseVoucher {
  id: string; // e.g. EXP-2026-041
  date: string;
  category:
    | 'Fuel & Generator'
    | 'Utilities'
    | 'Educational Materials'
    | 'Maintenance'
    | 'Administrative'
    | 'Salaries';
  categorySomali: string;
  title: string;
  amount: number;
  paidTo: string;
  paymentMethod: 'EVC Plus' | 'Salaam Bank' | 'Cash';
  referenceNo: string;
  approvedBy: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  notes?: string;
}

export interface StaffMember {
  id: string; // e.g. STF-01
  fullName: string;
  department: 'Administration' | 'Teaching' | 'Finance' | 'Support' | 'Security';
  roleTitle: string;
  phone: string;
  email: string;
  photoUrl?: string;
  basicSalary: number;
  allowance: number;
  joiningDate: string;
  status: 'Active' | 'On Leave' | 'Suspended';
}

export interface StaffLeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  approvedBy?: string;
  requestDate: string;
}

export interface PayrollRecord {
  id: string;
  month: string; // e.g. October 2026
  staffId: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentDate: string;
  status: 'Paid' | 'Processing';
  paymentMethod: string;
  referenceNo: string;
}

export interface TimetableSlot {
  id: string;
  day: 'Sabti' | 'Axad' | 'Isniin' | 'Talaado' | 'Arbaco' | 'Khamiis';
  period: number; // 1 to 5
  timeRange: string; // e.g. 07:30 - 08:25
  classId: string;
  subjectId: string;
  teacherId: string;
  roomNumber: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author: string;
  authorRole: string;
  targetAudience: 'All' | 'Teachers' | 'Parents' | 'Students' | 'Staff';
  priority: 'Normal' | 'High' | 'Urgent';
  date: string;
  read: boolean;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string; // e.g. TKT-2026-091
  requesterName: string;
  requesterEmail: string;
  subject: string;
  category: 'Academics' | 'Fee Billing' | 'Student Records' | 'Technical' | 'General';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
  messages: {
    id: string;
    sender: string;
    role: string;
    text: string;
    timestamp: string;
  }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  studentId?: string;
  username?: string;
  user: string;
  role: UserRole;
  action:
    | 'CREATE'
    | 'UPDATE'
    | 'DELETE'
    | 'DROP'
    | 'RESTORE'
    | 'PAYMENT'
    | 'LOGIN'
    | 'LOGOUT'
    | 'LOGIN_FAILED'
    | 'PASSWORD_CHANGE'
    | 'PASSWORD_RESET'
    | 'VIEW'
    | 'VIEW_PROFILE'
    | 'VIEW_ID_CARD'
    | 'VIEW_EXAMS'
    | 'VIEW_ATTENDANCE'
    | 'VIEW_FEES'
    | 'VIEW_ANNOUNCEMENTS'
    | 'UNAUTHORIZED_ACCESS'
    | 'EXPORT'
    | 'PROMOTION';
  module: string;
  resource?: string;
  status?: 'Success' | 'Failure';
  details: string;
  ipAddress: string;
}

export interface SchoolSettings {
  institutionName: string;
  arabicName: string;
  location: string;
  academicYear: string;
  principalName: string;
  phone: string;
  email: string;
  currency: string;
  currencySymbol: string;
  logoUrl: string;
  primaryColor: string;
  goldColor: string;
}

export interface UserAccount {
  id: string;
  username: string;
  email: string;
  password?: string;
  fullName: string;
  role: UserRole;
  photoUrl?: string;
  linkedTeacherId?: string;
  linkedStaffId?: string;
  linkedStudentId?: string;
  linkedStudentIds?: string[];
  permissions?: string[];
  mustChangePassword?: boolean;
  lastLoginAt?: string;
  status: 'Active' | 'Deactivated' | 'Suspended' | 'Withdrawn' | 'Deleted';
}

export type RbacAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'manage_users'
  | 'manage_permissions';

export interface RbacPermissionPolicy {
  role: UserRole;
  modules: string[];
  actions: RbacAction[];
  description: string;
}

export interface ExamCardBatch {
  id: string;
  academicYear: string;
  examId?: string;
  examTitle: string;
  classId: string;
  className: string;
  section: string;
  shift: string;
  examDate: string;
  instructions: string;
  cardsPerPage: 5 | 8;
  studentCount: number;
  cardCount: number;
  createdBy: string;
  createdByUsername: string;
  createdAt: string;
  updatedAt: string;
  status: 'Active' | 'Archived' | 'Deleted';
}

export interface ExamCard {
  id: string;
  batchId: string;
  studentId: string;
  rollNumber: string;
  studentName: string;
  studentArabicName: string;
  photoUrl: string;
  classId: string;
  className: string;
  section: string;
  shift: string;
  academicYear: string;
  examId?: string;
  examTitle: string;
  examDate: string;
  instructions: string;
  seatNumber: string;
  status: 'Active' | 'Revoked' | 'Deleted';
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SearchCategory =
  | 'all'
  | 'students'
  | 'teachers'
  | 'staff'
  | 'classes'
  | 'subjects'
  | 'exams'
  | 'invoices';

export interface GlobalSearchStudentHit {
  id: string;
  rollNumber: string;
  fullName: string;
  arabicName: string;
  classId: string;
  className: string;
  section: string;
  shift: string;
  status: string;
  photoUrl: string;
  guardianName?: string;
  guardianPhone?: string;
}

export interface GlobalSearchResponse {
  query: string;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  allowedCategories: Exclude<SearchCategory, 'all'>[];
  counts: Record<Exclude<SearchCategory, 'all'>, number>;
  groups: {
    students: GlobalSearchStudentHit[];
    teachers: { id: string; fullName: string; arabicName: string; specialization: string; phone?: string }[];
    staff: { id: string; fullName: string; roleTitle: string; department: string; phone?: string }[];
    classes: { id: string; name: string; section: string; shift: string; roomNumber: string }[];
    subjects: { id: string; code: string; nameSomali: string; nameArabic: string; classId: string }[];
    exams: { id: string; title: string; term: string; academicYear: string; status: string; startDate: string }[];
    invoices: { id: string; studentId: string; studentName: string; title: string; amount: number; balance: number; status: string; month: string }[];
  };
}


