/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { hashPassword, isBcryptHash, verifyPassword } from './auth.ts';
import {
  initialSettings,
  initialClasses,
  initialSubjects,
  initialTeachers,
  initialStudents,
  initialFeeStructures,
  initialInvoices,
  initialPayments,
  initialIncomes,
  initialExpenses,
  initialExams,
  initialMarks,
  initialAttendance,
  initialStaffMembers,
  initialLeaveRequests,
  initialPayroll,
  initialTimetableSlots,
  initialAnnouncements,
  initialSupportTickets,
  initialAuditLogs,
  initialUserAccounts,
} from '../src/data/seedData.ts';
import {
  calculateSixYearExpiry,
  generateMachadStudentUsername,
} from '../src/utils/experience.ts';
import type {
  Student,
  UserAccount,
  UserRole,
  AuditLog,
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
  StaffAttendanceRecord,
  PayrollRecord,
  TimetableSlot,
  Announcement,
  SupportTicket,
  SchoolSettings,
  ExamCardBatch,
  ExamCard,
  RbacPermissionPolicy,
} from '../src/types.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'machadka.sqlite');
export const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    rollNumber TEXT NOT NULL,
    fullName TEXT NOT NULL,
    arabicName TEXT NOT NULL DEFAULT '',
    gender TEXT NOT NULL,
    birthDate TEXT NOT NULL,
    classId TEXT NOT NULL,
    section TEXT NOT NULL,
    shift TEXT NOT NULL DEFAULT 'Subax',
    admissionDate TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    photoUrl TEXT NOT NULL DEFAULT '',
    bloodGroup TEXT NOT NULL DEFAULT 'O+',
    guardianName TEXT NOT NULL DEFAULT '',
    guardianPhone TEXT NOT NULL DEFAULT '',
    guardianRelation TEXT NOT NULL DEFAULT '',
    guardianAddress TEXT NOT NULL DEFAULT '',
    emergencyContact TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    portalUsername TEXT UNIQUE NOT NULL,
    idCardIssueDate TEXT NOT NULL,
    idCardExpiryDate TEXT NOT NULL,
    idCardStatus TEXT NOT NULL DEFAULT 'Active',
    isDeleted INTEGER NOT NULL DEFAULT 0,
    deletedAt TEXT,
    deletedBy TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_accounts (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    passwordHash TEXT NOT NULL,
    fullName TEXT NOT NULL,
    role TEXT NOT NULL,
    photoUrl TEXT,
    linkedTeacherId TEXT,
    linkedStaffId TEXT,
    linkedStudentId TEXT,
    linkedStudentIds TEXT,
    permissions TEXT,
    tokenVersion INTEGER NOT NULL DEFAULT 1,
    lastLoginAt TEXT,
    mustChangePassword INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Active',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    studentId TEXT,
    username TEXT,
    user TEXT NOT NULL,
    role TEXT NOT NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    resource TEXT,
    status TEXT NOT NULL DEFAULT 'Success',
    details TEXT NOT NULL,
    ipAddress TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff_attendance (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    staffId TEXT NOT NULL,
    personName TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    roleTitle TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Present',
    checkInTime TEXT NOT NULL DEFAULT '',
    checkOutTime TEXT NOT NULL DEFAULT '',
    remarks TEXT NOT NULL DEFAULT '',
    recordedBy TEXT NOT NULL DEFAULT '',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_staff_att_date ON staff_attendance(date);
  CREATE INDEX IF NOT EXISTS idx_staff_att_staff ON staff_attendance(staffId);

  CREATE TABLE IF NOT EXISTS exam_card_batches (
    id TEXT PRIMARY KEY,
    academicYear TEXT NOT NULL,
    examId TEXT,
    examTitle TEXT NOT NULL,
    classId TEXT NOT NULL,
    className TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT '',
    shift TEXT NOT NULL DEFAULT 'Subax',
    examDate TEXT NOT NULL,
    instructions TEXT NOT NULL DEFAULT '',
    cardsPerPage INTEGER NOT NULL DEFAULT 8,
    studentCount INTEGER NOT NULL DEFAULT 0,
    cardCount INTEGER NOT NULL DEFAULT 0,
    createdBy TEXT NOT NULL,
    createdByUsername TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'Active',
    isDeleted INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS exam_cards (
    id TEXT PRIMARY KEY,
    batchId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    rollNumber TEXT NOT NULL,
    studentName TEXT NOT NULL,
    studentArabicName TEXT NOT NULL DEFAULT '',
    photoUrl TEXT NOT NULL DEFAULT '',
    classId TEXT NOT NULL,
    className TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT '',
    shift TEXT NOT NULL DEFAULT 'Subax',
    academicYear TEXT NOT NULL,
    examId TEXT,
    examTitle TEXT NOT NULL,
    examDate TEXT NOT NULL,
    instructions TEXT NOT NULL DEFAULT '',
    seatNumber TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Active',
    isDeleted INTEGER NOT NULL DEFAULT 0,
    deletedAt TEXT,
    deletedBy TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_exam_cards_batch ON exam_cards(batchId);
  CREATE INDEX IF NOT EXISTS idx_exam_cards_student ON exam_cards(studentId);
  CREATE INDEX IF NOT EXISTS idx_exam_cards_class ON exam_cards(classId);
`);

// Non-destructive column migrations for existing SQLite databases
function ensureColumn(table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('user_accounts', 'permissions', 'TEXT');
ensureColumn('user_accounts', 'tokenVersion', 'INTEGER NOT NULL DEFAULT 1');
ensureColumn('user_accounts', 'lastLoginAt', 'TEXT');

export interface DbUserRow {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  photoUrl: string | null;
  linkedTeacherId: string | null;
  linkedStaffId: string | null;
  linkedStudentId: string | null;
  linkedStudentIds: string | null;
  permissions: string | null;
  tokenVersion: number;
  lastLoginAt: string | null;
  mustChangePassword: number;
  status: UserAccount['status'];
}

export interface DbStudentRow {
  id: string;
  rollNumber: string;
  fullName: string;
  arabicName: string;
  gender: 'Male' | 'Female';
  birthDate: string;
  classId: string;
  section: string;
  shift: 'Subax' | 'Galab';
  admissionDate: string;
  status: Student['status'];
  photoUrl: string;
  bloodGroup: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  guardianAddress: string;
  emergencyContact: string;
  notes: string;
  portalUsername: string;
  idCardIssueDate: string;
  idCardExpiryDate: string;
  idCardStatus: 'Active' | 'Deleted';
  isDeleted: number;
  deletedAt: string | null;
  deletedBy: string | null;
}

export function sanitizeUser(row: DbUserRow): UserAccount {
  let parsedPermissions: string[] | undefined;
  if (row.permissions) {
    try {
      const p = JSON.parse(row.permissions);
      if (Array.isArray(p)) parsedPermissions = p;
    } catch {
      parsedPermissions = undefined;
    }
  }
  let parsedLinkedIds: string[] | undefined;
  if (row.linkedStudentIds) {
    try {
      const arr = JSON.parse(row.linkedStudentIds);
      if (Array.isArray(arr)) parsedLinkedIds = arr;
    } catch {
      parsedLinkedIds = undefined;
    }
  }
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    photoUrl: row.photoUrl || undefined,
    linkedTeacherId: row.linkedTeacherId || undefined,
    linkedStaffId: row.linkedStaffId || undefined,
    linkedStudentId: row.linkedStudentId || undefined,
    linkedStudentIds: parsedLinkedIds,
    permissions: parsedPermissions,
    mustChangePassword: Boolean(row.mustChangePassword),
    lastLoginAt: row.lastLoginAt || undefined,
    status: row.status,
  };
}

export function sanitizeStudent(
  row: DbStudentRow,
  mustChangePassword?: boolean
): Student {
  return {
    id: row.id,
    rollNumber: row.rollNumber,
    fullName: row.fullName,
    arabicName: row.arabicName,
    gender: row.gender,
    birthDate: row.birthDate,
    classId: row.classId,
    section: row.section,
    shift: row.shift,
    admissionDate: row.admissionDate,
    status: row.status,
    photoUrl: row.photoUrl,
    bloodGroup: row.bloodGroup,
    guardianName: row.guardianName,
    guardianPhone: row.guardianPhone,
    guardianRelation: row.guardianRelation,
    guardianAddress: row.guardianAddress,
    emergencyContact: row.emergencyContact,
    notes: row.notes || undefined,
    portalUsername: row.portalUsername,
    mustChangePassword: mustChangePassword,
    idCardIssueDate: row.idCardIssueDate,
    idCardExpiryDate: row.idCardExpiryDate,
    idCardStatus: row.idCardStatus,
    isDeleted: Boolean(row.isDeleted),
    deletedAt: row.deletedAt || undefined,
    deletedBy: row.deletedBy || undefined,
  };
}

export function getKv<T>(key: string, fallback: T): T {
  const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export function setKv<T>(key: string, value: T): void {
  db.prepare(`
    INSERT INTO kv_store (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, JSON.stringify(value));
}

export function insertAuditLog(entry: Omit<AuditLog, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): AuditLog {
  const fullEntry: AuditLog = {
    id: entry.id || `LOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    timestamp: entry.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
    studentId: entry.studentId,
    username: entry.username,
    user: entry.user,
    role: entry.role,
    action: entry.action,
    module: entry.module,
    resource: entry.resource,
    status: entry.status || 'Success',
    details: entry.details,
    ipAddress: entry.ipAddress || '127.0.0.1',
  };

  db.prepare(`
    INSERT INTO audit_logs (
      id, timestamp, studentId, username, user, role, action, module, resource, status, details, ipAddress
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    fullEntry.id,
    fullEntry.timestamp,
    fullEntry.studentId || null,
    fullEntry.username || null,
    fullEntry.user,
    fullEntry.role,
    fullEntry.action,
    fullEntry.module,
    fullEntry.resource || null,
    fullEntry.status || 'Success',
    fullEntry.details,
    fullEntry.ipAddress
  );

  return fullEntry;
}

export const DEFAULT_RBAC_POLICIES: RbacPermissionPolicy[] = [
  {
    role: 'Super Admin',
    modules: [
      'dashboard', 'students', 'student_portal', 'classes', 'teachers',
      'attendance', 'exams', 'exam_cards', 'fees', 'finance', 'hr',
      'timetable', 'messaging', 'reports', 'settings', 'support',
    ],
    actions: ['read', 'create', 'update', 'delete', 'manage_users', 'manage_permissions'],
    description: 'Maamulaha Guud — Awood buuxda oo nidaamka ah oo ay ku jirto maamulka RBAC iyo abuurista maamulayaasha.',
  },
  {
    role: 'Administrator',
    modules: [
      'dashboard', 'students', 'student_portal', 'classes', 'teachers',
      'attendance', 'exams', 'exam_cards', 'fees', 'finance', 'hr',
      'timetable', 'messaging', 'reports', 'settings', 'support',
    ],
    actions: ['read', 'create', 'update', 'delete', 'manage_users'],
    description: 'Maamulka Dugsiga — Maamulka hawlaha dugsiga, ardayda, macallimiinta iyo akoonnada (marka laga reebo Super Admin iyo RBAC).',
  },
  {
    role: 'Academic Manager',
    modules: ['dashboard', 'students', 'classes', 'teachers', 'attendance', 'exams', 'exam_cards', 'timetable', 'messaging', 'reports', 'support'],
    actions: ['read', 'create', 'update'],
    description: 'Madaxa Waxbarashada — Fasallada, maaddooyinka, imtixaanaadka, kaararka imtixaanka iyo jadwalka.',
  },
  {
    role: 'Accountant',
    modules: ['dashboard', 'students', 'fees', 'finance', 'hr', 'messaging', 'reports', 'support'],
    actions: ['read', 'create', 'update'],
    description: 'Xisaabiyaha — Biilasha, lacag-bixinnada, dakhliga, kharashaadka iyo mushaharka.',
  },
  {
    role: 'HR Manager',
    modules: ['dashboard', 'teachers', 'hr', 'attendance', 'messaging', 'support'],
    actions: ['read', 'create', 'update'],
    description: 'Madaxa Shaqaalaha — Macallimiinta, shaqaalaha, xaadirinta shaqaalaha, fasaxyada iyo mushaharka.',
  },
  {
    role: 'Receptionist',
    modules: ['dashboard', 'students', 'attendance', 'fees', 'messaging', 'support'],
    actions: ['read', 'create', 'update'],
    description: 'Soo-dhoweeyaha — Diiwaangelinta ardayda, xaadirinta iyo qabashada biilasha.',
  },
  {
    role: 'Teacher',
    modules: ['dashboard', 'classes', 'attendance', 'exams', 'timetable', 'hr', 'messaging', 'support'],
    actions: ['read', 'update'],
    description: 'Macallinka — Fasallada u xilsaaran, xaadirinta ardayda, gelinta dhibcaha, jadwalka iyo codsiga fasaxa.',
  },
  {
    role: 'Institute',
    modules: ['dashboard', 'classes', 'teachers', 'reports', 'messaging', 'support'],
    actions: ['read'],
    description: 'Machadka (Institute View) — Kormeerka guud ee machadka, warbixinnada, fasallada iyo macallimiinta (akhris keliya).',
  },
  {
    role: 'Student',
    modules: ['student_portal', 'messaging', 'support'],
    actions: ['read'],
    description: 'Ardayga — Eegista xogtiisa gaarka ah, imtixaanaadka, xaadirinta iyo biilasha (akhris keliya).',
  },
  {
    role: 'Parent',
    modules: ['student_portal', 'messaging', 'support'],
    actions: ['read'],
    description: 'Waalidka — La socodka carruurtiisa diiwaangashan, natiijooyinka, xaadirinta iyo biilasha (akhris keliya).',
  },
];

const STANDARD_ACCOUNTS: Array<{
  id: string;
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  photoUrl?: string;
}> = [
  {
    id: 'USR-ADMIN-01',
    username: 'admin',
    email: 'admin@machadkakhadiija.edu.so',
    password: process.env.SEED_SUPER_ADMIN_PASS || 'Admin@2026',
    fullName: 'Sheekh Maxamed Cali (Super Admin)',
    role: 'Super Admin',
  },
  {
    id: 'USR-MAAMUL-01',
    username: 'maamul',
    email: 'maamul@machadkakhadiija.edu.so',
    password: process.env.SEED_ADMIN_PASS || 'Maamul@2026',
    fullName: 'Maamule Axmed Jaamac',
    role: 'Administrator',
  },
  {
    id: 'USR-ACAD-01',
    username: 'academic',
    email: 'academic@machadkakhadiija.edu.so',
    password: process.env.SEED_ACADEMIC_PASS || 'Acad@2026',
    fullName: 'Ustaad Cabdiraxmaan Faarax',
    role: 'Academic Manager',
  },
  {
    id: 'USR-ACC-01',
    username: 'accountant',
    email: 'accountant@machadkakhadiija.edu.so',
    password: process.env.SEED_ACCOUNTANT_PASS || 'Acc@2026',
    fullName: 'Xisaabiye Amina Maxamuud',
    role: 'Accountant',
  },
  {
    id: 'USR-HR-01',
    username: 'hr',
    email: 'hr@machadkakhadiija.edu.so',
    password: process.env.SEED_HR_PASS || 'Hr@2026',
    fullName: 'HR Cabdikariin Yuusuf',
    role: 'HR Manager',
  },
  {
    id: 'USR-REC-01',
    username: 'reception',
    email: 'reception@machadkakhadiija.edu.so',
    password: process.env.SEED_RECEPTION_PASS || 'Rec@2026',
    fullName: 'Xaliimo Cismaan (Reception)',
    role: 'Receptionist',
  },
  {
    id: 'USR-INST-01',
    username: 'institute',
    email: 'institute@machadkakhadiija.edu.so',
    password: process.env.SEED_INSTITUTE_PASS || 'Inst@2026',
    fullName: 'Maamulka Machadka Khadiija (Institute)',
    role: 'Institute',
  },
];

export function syncTeacherUserAccounts(teachersList: Teacher[]): void {
  const defaultTeacherPass = process.env.SEED_TEACHER_PASS || 'Teacher@2026';
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO user_accounts (
      id, username, email, passwordHash, fullName, role, photoUrl,
      linkedTeacherId, mustChangePassword, tokenVersion, status
    ) VALUES (?, ?, ?, ?, ?, 'Teacher', ?, ?, 0, 1, ?)
  `);
  const updateMetaStmt = db.prepare(`
    UPDATE user_accounts
    SET fullName = ?, email = ?, photoUrl = COALESCE(?, photoUrl)
    WHERE linkedTeacherId = ? AND role = 'Teacher'
  `);

  for (const t of teachersList) {
    const existing = db
      .prepare("SELECT * FROM user_accounts WHERE linkedTeacherId = ? OR lower(username) = lower(?)")
      .get(t.id, t.id.toLowerCase()) as DbUserRow | undefined;

    if (!existing) {
      const targetStatus: UserAccount['status'] = t.status === 'Resigned' ? 'Deactivated' : 'Active';
      insertStmt.run(
        `USR-${t.id}`,
        t.id.toLowerCase(),
        t.email || `${t.id.toLowerCase()}@machadkakhadiija.edu.so`,
        hashPassword(defaultTeacherPass),
        t.fullName,
        t.photoUrl || null,
        t.id,
        targetStatus
      );
    } else if (existing.role === 'Teacher') {
      updateMetaStmt.run(t.fullName, t.email || existing.email, t.photoUrl || null, t.id);
      if (!isBcryptHash(existing.passwordHash) && verifyPassword(defaultTeacherPass, existing.passwordHash)) {
        db.prepare('UPDATE user_accounts SET passwordHash = ? WHERE id = ?').run(
          hashPassword(defaultTeacherPass),
          existing.id
        );
      }
    }
  }
}

export function syncParentAccountForStudent(stu: {
  id: string;
  rollNumber: string;
  guardianName: string;
  guardianPhone: string;
  status: string;
}): void {
  const cleanPhone = (stu.guardianPhone || '').trim();
  const parUsername = `par-${stu.rollNumber || stu.id}`.toLowerCase();
  const defaultParentPass = process.env.SEED_PARENT_PASS || 'Parent@2026';

  const existingByPhoneOrUser = db
    .prepare(
      `SELECT u.* FROM user_accounts u
       WHERE u.role = 'Parent' AND (
         lower(u.username) = lower(?)
         OR (? != '' AND EXISTS (
           SELECT 1 FROM students s
           WHERE s.isDeleted = 0
             AND s.guardianPhone = ?
             AND (s.id = u.linkedStudentId OR u.linkedStudentIds LIKE '%' || s.id || '%')
         ))
       )
       LIMIT 1`
    )
    .get(parUsername, cleanPhone, cleanPhone) as DbUserRow | undefined;

  const activeSiblings = cleanPhone
    ? (db
        .prepare('SELECT id FROM students WHERE isDeleted = 0 AND guardianPhone = ?')
        .all(cleanPhone) as { id: string }[]
      ).map((r) => r.id)
    : [stu.id];

  const mergedIds = Array.from(new Set([...activeSiblings, stu.id]));

  if (existingByPhoneOrUser) {
    let currentIds: string[] = [];
    if (existingByPhoneOrUser.linkedStudentIds) {
      try {
        currentIds = JSON.parse(existingByPhoneOrUser.linkedStudentIds);
      } catch {
        currentIds = [];
      }
    }
    const finalIds = Array.from(new Set([...currentIds, ...mergedIds]));
    db.prepare('UPDATE user_accounts SET linkedStudentIds = ?, linkedStudentId = COALESCE(linkedStudentId, ?) WHERE id = ?').run(
      JSON.stringify(finalIds),
      stu.id,
      existingByPhoneOrUser.id
    );
  } else {
    db.prepare(`
      INSERT OR IGNORE INTO user_accounts (
        id, username, email, passwordHash, fullName, role,
        linkedStudentId, linkedStudentIds, mustChangePassword, tokenVersion, status
      ) VALUES (?, ?, ?, ?, ?, 'Parent', ?, ?, 0, 1, 'Active')
    `).run(
      `USR-PAR-${stu.rollNumber || stu.id}`,
      parUsername,
      `${(stu.rollNumber || stu.id).toLowerCase()}.parent@machadkakhadiija.edu.so`,
      hashPassword(defaultParentPass),
      stu.guardianName || `Waalidka ${stu.rollNumber}`,
      stu.id,
      JSON.stringify(mergedIds)
    );
  }
}

export function ensureStandardizedAccountsAndPolicies(): void {
  // 1. Ensure 6 standardized Admin roles + Institute account exist & use bcrypt
  const insertStdStmt = db.prepare(`
    INSERT INTO user_accounts (
      id, username, email, passwordHash, fullName, role, photoUrl,
      mustChangePassword, tokenVersion, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 'Active')
  `);

  for (const acc of STANDARD_ACCOUNTS) {
    const byUsername = db
      .prepare('SELECT * FROM user_accounts WHERE lower(username) = lower(?)')
      .get(acc.username) as DbUserRow | undefined;

    if (!byUsername) {
      const byId = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(acc.id) as DbUserRow | undefined;
      if (byId) {
        const nextHash = isBcryptHash(byId.passwordHash) ? byId.passwordHash : hashPassword(acc.password);
        db.prepare('UPDATE user_accounts SET username = ?, email = ?, role = ?, passwordHash = ? WHERE id = ?').run(
          acc.username,
          acc.email,
          acc.role,
          nextHash,
          byId.id
        );
      } else {
        insertStdStmt.run(
          acc.id,
          acc.username,
          acc.email,
          hashPassword(acc.password),
          acc.fullName,
          acc.role,
          acc.photoUrl || null
        );
      }
    } else {
      if (!isBcryptHash(byUsername.passwordHash)) {
        db.prepare('UPDATE user_accounts SET passwordHash = ?, role = ?, email = ? WHERE id = ?').run(
          hashPassword(acc.password),
          acc.role,
          acc.email,
          byUsername.id
        );
      } else if (byUsername.role !== acc.role) {
        db.prepare('UPDATE user_accounts SET role = ? WHERE id = ?').run(acc.role, byUsername.id);
      }
    }
  }

  // 2. Sync teacher accounts & upgrade legacy scrypt hashes to bcrypt
  const teachersList = getKv<Teacher[]>('teachers', initialTeachers);
  syncTeacherUserAccounts(teachersList);

  // 3. Ensure active students have bcrypt accounts & grouped parent accounts
  const allStudents = db.prepare('SELECT * FROM students WHERE isDeleted = 0').all() as unknown as DbStudentRow[];
  const defaultStudentPass = process.env.SEED_STUDENT_PASS || 'machad@123';
  const defaultParentPass = process.env.SEED_PARENT_PASS || 'Parent@2026';

  const insertStudentAccStmt = db.prepare(`
    INSERT OR IGNORE INTO user_accounts (
      id, username, email, passwordHash, fullName, role, photoUrl,
      linkedStudentId, mustChangePassword, tokenVersion, status
    ) VALUES (?, ?, ?, ?, ?, 'Student', ?, ?, 1, 1, 'Active')
  `);

  for (const s of allStudents) {
    const uniqueUsername = generateMachadStudentUsername(s.id);
    const stuAcc = db
      .prepare("SELECT * FROM user_accounts WHERE linkedStudentId = ? AND role = 'Student'")
      .get(s.id) as DbUserRow | undefined;

    if (!stuAcc) {
      insertStudentAccStmt.run(
        `USR-${s.id}`,
        uniqueUsername,
        `${s.id.toLowerCase()}@student.machadkakhadiija.edu.so`,
        hashPassword(defaultStudentPass),
        s.fullName,
        s.photoUrl || null,
        s.id
      );
    } else if (!isBcryptHash(stuAcc.passwordHash) && verifyPassword(defaultStudentPass, stuAcc.passwordHash)) {
      db.prepare('UPDATE user_accounts SET passwordHash = ? WHERE id = ?').run(
        hashPassword(defaultStudentPass),
        stuAcc.id
      );
    }

    syncParentAccountForStudent({
      id: s.id,
      rollNumber: s.rollNumber,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      status: s.status,
    });
  }

  // Upgrade any remaining scrypt Parent hashes that match defaultParentPass
  const parentRows = db.prepare("SELECT * FROM user_accounts WHERE role = 'Parent'").all() as unknown as DbUserRow[];
  for (const p of parentRows) {
    if (!isBcryptHash(p.passwordHash) && verifyPassword(defaultParentPass, p.passwordHash)) {
      db.prepare('UPDATE user_accounts SET passwordHash = ? WHERE id = ?').run(
        hashPassword(defaultParentPass),
        p.id
      );
    }
  }

  // 4. Ensure RBAC policies KV includes all 10 roles
  const existingPolicies = getKv<RbacPermissionPolicy[] | null>('rbacPolicies', null);
  if (!existingPolicies || !Array.isArray(existingPolicies) || existingPolicies.length === 0) {
    setKv('rbacPolicies', DEFAULT_RBAC_POLICIES);
  } else {
    let changed = false;
    const updated = [...existingPolicies];
    for (const defPolicy of DEFAULT_RBAC_POLICIES) {
      if (!updated.some((p) => p.role === defPolicy.role)) {
        updated.push(defPolicy);
        changed = true;
      }
    }
    if (changed) {
      setKv('rbacPolicies', updated);
    }
  }
}

export function seedDatabaseIfEmpty(): void {
  const studentCount = (db.prepare('SELECT COUNT(*) as cnt FROM students').get() as { cnt: number }).cnt;
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM user_accounts').get() as { cnt: number }).cnt;

  if (studentCount === 0) {
    const insertStudentStmt = db.prepare(`
      INSERT INTO students (
        id, rollNumber, fullName, arabicName, gender, birthDate, classId, section, shift,
        admissionDate, status, photoUrl, bloodGroup, guardianName, guardianPhone,
        guardianRelation, guardianAddress, emergencyContact, notes, portalUsername,
        idCardIssueDate, idCardExpiryDate, idCardStatus, isDeleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    for (const s of initialStudents) {
      const issueDate = s.idCardIssueDate || s.admissionDate;
      const expiryDate = s.idCardExpiryDate || calculateSixYearExpiry(issueDate);
      const uniqueUsername = generateMachadStudentUsername(s.id);
      const matchedCls = initialClasses.find((c) => c.id === s.classId);
      insertStudentStmt.run(
        s.id,
        s.rollNumber,
        s.fullName,
        s.arabicName || '',
        s.gender,
        s.birthDate,
        s.classId,
        s.section,
        s.shift || matchedCls?.shift || 'Subax',
        s.admissionDate,
        s.status,
        s.photoUrl,
        s.bloodGroup,
        s.guardianName,
        s.guardianPhone,
        s.guardianRelation,
        s.guardianAddress,
        s.emergencyContact,
        s.notes || '',
        uniqueUsername,
        issueDate,
        expiryDate,
        s.idCardStatus || 'Active'
      );
    }
  }

  // Seed KV collections if absent before syncing accounts
  const kvDefaults: [string, unknown][] = [
    ['settings', initialSettings],
    ['classes', initialClasses],
    ['subjects', initialSubjects],
    ['teachers', initialTeachers],
    ['attendance', initialAttendance],
    ['exams', initialExams],
    ['marks', initialMarks],
    ['feeStructures', initialFeeStructures],
    ['invoices', initialInvoices],
    ['payments', initialPayments],
    ['incomes', initialIncomes],
    ['expenses', initialExpenses],
    ['staff', initialStaffMembers],
    ['leaveRequests', initialLeaveRequests],
    ['payroll', initialPayroll],
    ['timetable', initialTimetableSlots],
    ['announcements', initialAnnouncements],
    ['tickets', initialSupportTickets],
    ['rbacPolicies', DEFAULT_RBAC_POLICIES],
  ];

  for (const [k, v] of kvDefaults) {
    const exists = db.prepare('SELECT 1 FROM kv_store WHERE key = ?').get(k);
    if (!exists) {
      setKv(k, v);
    }
  }

  if (userCount === 0) {
    const insertUserStmt = db.prepare(`
      INSERT OR IGNORE INTO user_accounts (
        id, username, email, passwordHash, fullName, role, photoUrl,
        linkedTeacherId, linkedStaffId, linkedStudentId, linkedStudentIds,
        mustChangePassword, tokenVersion, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    for (const u of initialUserAccounts) {
      const matchedStd = STANDARD_ACCOUNTS.find((sa) => sa.username === u.username);
      insertUserStmt.run(
        u.id,
        u.username,
        u.email,
        hashPassword(matchedStd?.password || u.password || 'Admin@2026'),
        u.fullName,
        u.role,
        u.photoUrl || null,
        u.linkedTeacherId || null,
        u.linkedStaffId || null,
        u.linkedStudentId || null,
        u.linkedStudentIds ? JSON.stringify(u.linkedStudentIds) : null,
        0,
        u.status
      );
    }
  }

  // Run idempotent standardization & bcrypt upgrade on every startup
  ensureStandardizedAccountsAndPolicies();

  const auditCount = (db.prepare('SELECT COUNT(*) as cnt FROM audit_logs').get() as { cnt: number }).cnt;
  if (auditCount === 0) {
    for (const log of initialAuditLogs) {
      insertAuditLog({
        ...log,
        username: log.user,
        status: 'Success',
      });
    }
  }
  const staffAttCount = (db.prepare('SELECT COUNT(*) as cnt FROM staff_attendance').get() as { cnt: number }).cnt;
  if (staffAttCount === 0) {
    const todayDate = new Date().toISOString().substring(0, 10);
    const insertStaffAttStmt = db.prepare(`
      INSERT INTO staff_attendance (
        id, date, staffId, personName, department, roleTitle, status, checkInTime, checkOutTime, remarks, recordedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const stf of initialStaffMembers) {
      insertStaffAttStmt.run(
        `SATT-${todayDate}-${stf.id}`,
        todayDate,
        stf.id,
        stf.fullName,
        stf.department,
        stf.roleTitle,
        'Present',
        '07:15',
        '13:30',
        '',
        'admin'
      );
    }
    for (const tch of initialTeachers) {
      insertStaffAttStmt.run(
        `SATT-${todayDate}-${tch.id}`,
        todayDate,
        tch.id,
        tch.fullName,
        'Teaching',
        'Macallin',
        'Present',
        '07:20',
        '12:30',
        '',
        'admin'
      );
    }
  }
}

export function resetAllToSeed(): void {
  db.exec(`
    DELETE FROM students;
    DELETE FROM user_accounts;
    DELETE FROM audit_logs;
    DELETE FROM kv_store;
    DELETE FROM staff_attendance;
    DELETE FROM exam_cards;
    DELETE FROM exam_card_batches;
  `);
  seedDatabaseIfEmpty();
}

export function getNextStudentSequence(): number {
  const rows = db.prepare('SELECT id FROM students').all() as { id: string }[];
  const maxExisting = rows.reduce((max, row) => {
    const match = row.id.match(/(\d+)$/);
    const n = match ? parseInt(match[1], 10) : 0;
    return n > max ? n : max;
  }, rows.length);
  return maxExisting + 1;
}

export function createStudentWithAccount(
  studentInput: Omit<Student, 'id' | 'portalUsername'> & { portalUsername?: string; portalPassword?: string }
): { student: Student; initialPassword: string } {
  const classes = getKv<SchoolClass[]>('classes', initialClasses);
  const nextNum = getNextStudentSequence();
  const newId = `STU-2026-${String(nextNum).padStart(3, '0')}`;
  const matchedClass = classes.find((c) => c.id === studentInput.classId);
  const issueDate = studentInput.idCardIssueDate || studentInput.admissionDate || new Date().toISOString().substring(0, 10);
  const expiryDate = studentInput.idCardExpiryDate || calculateSixYearExpiry(issueDate);
  const uniqueUsername = generateMachadStudentUsername(newId);
  const initialPassword = 'machad@123';

  db.prepare(`
    INSERT INTO students (
      id, rollNumber, fullName, arabicName, gender, birthDate, classId, section, shift,
      admissionDate, status, photoUrl, bloodGroup, guardianName, guardianPhone,
      guardianRelation, guardianAddress, emergencyContact, notes, portalUsername,
      idCardIssueDate, idCardExpiryDate, idCardStatus, isDeleted
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    newId,
    studentInput.rollNumber || String(nextNum + 100),
    studentInput.fullName,
    studentInput.arabicName || '',
    studentInput.gender || 'Female',
    studentInput.birthDate || '2011-01-01',
    studentInput.classId || classes[0]?.id || 'CLS-1A',
    studentInput.section || matchedClass?.section || 'A',
    studentInput.shift || matchedClass?.shift || 'Subax',
    issueDate,
    studentInput.status === 'Withdrawn' || studentInput.status === 'Dropped' ? 'Withdrawn' : studentInput.status || 'Active',
    studentInput.photoUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&h=256&q=80',
    studentInput.bloodGroup || 'O+',
    studentInput.guardianName || '',
    studentInput.guardianPhone || '',
    studentInput.guardianRelation || 'Aabbe (Father)',
    studentInput.guardianAddress || 'Qardho',
    studentInput.emergencyContact || studentInput.guardianPhone || '',
    studentInput.notes || '',
    uniqueUsername,
    issueDate,
    expiryDate,
    studentInput.idCardStatus || 'Active'
  );

  db.prepare(`
    INSERT INTO user_accounts (
      id, username, email, passwordHash, fullName, role, photoUrl,
      linkedStudentId, mustChangePassword, tokenVersion, status
    ) VALUES (?, ?, ?, ?, ?, 'Student', ?, ?, 1, 1, ?)
  `).run(
    `USR-${newId}`,
    uniqueUsername,
    `${newId.toLowerCase()}@student.machadkakhadiija.edu.so`,
    hashPassword(initialPassword),
    studentInput.fullName,
    studentInput.photoUrl || null,
    newId,
    studentInput.status === 'Suspended' ? 'Suspended' : 'Active'
  );

  // Also create or link a Parent account for this student's guardian
  syncParentAccountForStudent({
    id: newId,
    rollNumber: studentInput.rollNumber || String(nextNum + 100),
    guardianName: studentInput.guardianName || '',
    guardianPhone: studentInput.guardianPhone || '',
    status: studentInput.status || 'Active',
  });

  const row = db.prepare('SELECT * FROM students WHERE id = ?').get(newId) as unknown as DbStudentRow;
  return {
    student: sanitizeStudent(row, true),
    initialPassword,
  };
}

// Re-export type helpers cleanly for server.ts
export type {
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
  StaffAttendanceRecord,
  PayrollRecord,
  TimetableSlot,
  Announcement,
  SupportTicket,
  SchoolSettings,
  ExamCardBatch,
  ExamCard,
  RbacPermissionPolicy,
};

seedDatabaseIfEmpty();
