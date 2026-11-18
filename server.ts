/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {
  db,
  getKv,
  setKv,
  insertAuditLog,
  sanitizeUser,
  sanitizeStudent,
  createStudentWithAccount,
  resetAllToSeed,
  DEFAULT_RBAC_POLICIES,
  syncTeacherUserAccounts,
} from './server/db.ts';
import type { DbStudentRow, DbUserRow } from './server/db.ts';
import {
  hashPassword,
  verifyPassword,
  isBcryptHash,
  signAuthToken,
  verifyAuthToken,
  revokeAuthToken,
} from './server/auth.ts';
import {
  calculateStudentExperience,
  calculateSixYearExpiry,
  generateMachadStudentUsername,
} from './src/utils/experience.ts';
import type {
  UserRole,
  UserAccount,
  AuditLog,
  Examination,
  ExamMark,
  AttendanceRecord,
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
  SchoolClass,
  Subject,
  Teacher,
  SchoolSettings,
  FeeStructure,
  ExamCardBatch,
  ExamCard,
  SearchCategory,
  GlobalSearchStudentHit,
  RbacPermissionPolicy,
} from './src/types.ts';

interface AuthenticatedRequest extends Request {
  authUser?: UserAccount;
  authToken?: string;
}

const ALL_USER_ROLES: UserRole[] = [
  'Super Admin',
  'Administrator',
  'Academic Manager',
  'Accountant',
  'HR Manager',
  'Receptionist',
  'Teacher',
  'Institute',
  'Student',
  'Parent',
];
const ADMIN_ROLES: UserRole[] = ['Super Admin', 'Administrator', 'Academic Manager'];
const ACCOUNT_ADMIN_ROLES: UserRole[] = ['Super Admin', 'Administrator'];
const STAFF_ATTENDANCE_ROLES: UserRole[] = ['Super Admin', 'Administrator', 'Academic Manager', 'HR Manager'];
const EXAM_CARD_ROLES: UserRole[] = ['Super Admin', 'Administrator', 'Academic Manager'];

function getTeacherAssignedScope(teacherId: string | undefined) {
  const classIds = new Set<string>();
  const subjectIds = new Set<string>();
  if (!teacherId) return { classIds, subjectIds };

  const classes = getKv<SchoolClass[]>('classes', []);
  const subjects = getKv<Subject[]>('subjects', []);
  const timetable = getKv<TimetableSlot[]>('timetable', []);

  classes.forEach((c) => {
    if (c.classTeacherId === teacherId) classIds.add(c.id);
  });
  subjects.forEach((s) => {
    if (s.teacherId === teacherId) {
      subjectIds.add(s.id);
      if (s.classId) classIds.add(s.classId);
    }
  });
  timetable.forEach((t) => {
    if (t.teacherId === teacherId) {
      classIds.add(t.classId);
      subjectIds.add(t.subjectId);
    }
  });

  return { classIds, subjectIds };
}

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function recordUnauthorizedAccess(
  req: AuthenticatedRequest,
  moduleName: string,
  resource: string,
  details: string
): void {
  const user = req.authUser;
  insertAuditLog({
    studentId: user?.linkedStudentId,
    username: user?.username || 'anonymous',
    user: user ? `${user.fullName} (${user.username})` : 'Unauthenticated',
    role: user?.role || 'Student',
    action: 'UNAUTHORIZED_ACCESS',
    module: moduleName,
    resource,
    status: 'Failure',
    details,
    ipAddress: getClientIp(req),
  });
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required (Token ma maqna).' });
    return;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session-kaagu wuu dhacay ama ma saxna.' });
    return;
  }

  const userRow = db
    .prepare('SELECT * FROM user_accounts WHERE id = ?')
    .get(payload.userId) as unknown as DbUserRow | undefined;

  if (!userRow) {
    res.status(401).json({ error: 'Akoonka lama helin.' });
    return;
  }

  const rowTokenVersion = typeof userRow.tokenVersion === 'number' ? userRow.tokenVersion : 1;
  const payloadTokenVersion = typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 1;
  if (payloadTokenVersion !== rowTokenVersion) {
    res.status(401).json({ error: 'Session-kaaga waa la joojiyay ama waa la cusboonaysiiyay. Fadlan dib u soo gal.' });
    return;
  }

  if (
    userRow.status === 'Deactivated' ||
    userRow.status === 'Suspended' ||
    userRow.status === 'Withdrawn' ||
    userRow.status === 'Deleted'
  ) {
    res.status(403).json({ error: `Akoonkan waa ${userRow.status}. Ma geli karo nidaamka.` });
    return;
  }

  if (userRow.role === 'Student' && userRow.linkedStudentId) {
    const stuRow = db
      .prepare('SELECT * FROM students WHERE id = ?')
      .get(userRow.linkedStudentId) as unknown as DbStudentRow | undefined;

    if (!stuRow || stuRow.isDeleted === 1 || stuRow.status === 'Deleted') {
      res.status(403).json({ error: 'Diiwaanka ardaygan waa la tirtiray. Ma geli karo nidaamka.' });
      return;
    }
    if (stuRow.status === 'Withdrawn' || stuRow.status === 'Dropped' || stuRow.status === 'Suspended') {
      res.status(403).json({
        error: `Ardaygan xaaladdiisu waa ${stuRow.status}. Portal-ka firfircoon looma oggola.`,
      });
      return;
    }
  }

  req.authUser = sanitizeUser(userRow);
  req.authToken = token;
  next();
}

function requireRoles(allowedRoles: UserRole[], moduleName: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.authUser;
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      recordUnauthorizedAccess(
        req,
        moduleName,
        req.originalUrl,
        `Isku day aan la oggolayn (${req.method} ${req.originalUrl}) oo uu sameeyay ${user.username} (${user.role}).`
      );
      res.status(403).json({
        error: 'Forbidden: Doorkaagu ma laha oggolaansho uu ku sameeyo hawshan.',
      });
      return;
    }
    next();
  };
}

function assertStudentOrAdminOwnership(
  req: AuthenticatedRequest,
  res: Response,
  targetStudentId: string,
  moduleName: string
): boolean {
  const user = req.authUser;
  if (!user) {
    res.status(401).json({ error: 'Authentication required.' });
    return false;
  }
  if (user.role === 'Student') {
    if (user.linkedStudentId !== targetStudentId) {
      recordUnauthorizedAccess(
        req,
        moduleName,
        `student:${targetStudentId}`,
        `Ardayga ${user.username} (${user.linkedStudentId}) ayaa isku dayay inuu galo xogta arday kale (${targetStudentId}).`
      );
      res.status(403).json({
        error: 'Forbidden: Ardaygu wuxuu eegi karaa xogtiisa gaarka ah oo kaliya.',
      });
      return false;
    }
    return true;
  }
  if (user.role === 'Parent') {
    const allowedIds = user.linkedStudentIds || (user.linkedStudentId ? [user.linkedStudentId] : []);
    if (!allowedIds.includes(targetStudentId)) {
      recordUnauthorizedAccess(
        req,
        moduleName,
        `student:${targetStudentId}`,
        `Waalidka ${user.username} ayaa isku dayay inuu galo xogta arday uusan masuul ka ahayn (${targetStudentId}).`
      );
      res.status(403).json({
        error: 'Forbidden: Waalidku wuxuu eegi karaa ubadkiisa diiwaangashan oo kaliya.',
      });
      return false;
    }
    return true;
  }
  return true;
}

const app = express();
app.use(express.json({ limit: '6mb' }));

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'machadka-qardho-sms' });
});

// ============================================================
// AUTHENTICATION ENDPOINTS
// ============================================================
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password, expectedRole } = req.body || {};
  const cleanId = typeof identifier === 'string' ? identifier.trim().toLowerCase() : '';
  const cleanPass = typeof password === 'string' ? password.trim() : '';
  const ipAddress = getClientIp(req);

  if (!cleanId || !cleanPass) {
    res.status(400).json({
      success: false,
      message: 'Fadlan geli Aqoonsigaaga (Username / Email / ID) iyo Furaha Sirta ah (Password).',
    });
    return;
  }

  // 1. Lookup direct user_accounts by username, email, or id
  let userRow = db
    .prepare(
      `SELECT * FROM user_accounts
       WHERE lower(username) = ? OR lower(email) = ? OR lower(id) = ?
       LIMIT 1`
    )
    .get(cleanId, cleanId, cleanId) as unknown as DbUserRow | undefined;

  // 2. If not found and could be a student (by Student ID, Roll Number, or Full Name)
  if (!userRow && (!expectedRole || expectedRole === 'Student')) {
    const stuRow = db
      .prepare(
        `SELECT * FROM students
         WHERE lower(id) = ? OR lower(rollNumber) = ? OR lower(portalUsername) = ? OR lower(fullName) = ?
         ORDER BY isDeleted ASC
         LIMIT 1`
      )
      .get(cleanId, cleanId, cleanId, cleanId) as unknown as DbStudentRow | undefined;

    if (stuRow) {
      userRow = db
        .prepare('SELECT * FROM user_accounts WHERE linkedStudentId = ? LIMIT 1')
        .get(stuRow.id) as unknown as DbUserRow | undefined;
    }
  }

  // 3. Also support Parent lookup by phone tail if Parent role
  if (!userRow && (!expectedRole || expectedRole === 'Parent')) {
    const normInput = cleanId.replace(/[\s+-]/g, '');
    if (normInput.length >= 6) {
      const allStudents = db.prepare('SELECT * FROM students WHERE isDeleted = 0').all() as unknown as DbStudentRow[];
      const matchedParStu = allStudents.find((s) =>
        s.guardianPhone.replace(/[\s+-]/g, '').toLowerCase().endsWith(normInput)
      );
      if (matchedParStu) {
        userRow = db
          .prepare('SELECT * FROM user_accounts WHERE id = ? LIMIT 1')
          .get(`USR-PAR-${matchedParStu.rollNumber}`) as unknown as DbUserRow | undefined;
      }
    }
  }

  if (!userRow) {
    insertAuditLog({
      username: cleanId,
      user: cleanId,
      role: (expectedRole as UserRole) || 'Student',
      action: 'LOGIN_FAILED',
      module: 'Authentication',
      resource: 'auth/login',
      status: 'Failure',
      details: `Isku day gelitaan fashilmay: Akoon lama helin (${cleanId}).`,
      ipAddress,
    });
    res.status(401).json({
      success: false,
      message: expectedRole
        ? `Lama helin akoon u diiwaangashan doorka "${expectedRole}" oo leh aqoonsigan "${identifier}".`
        : 'Aqoonsiga ama Furaha sirta ah ma saxna. Fadlan hubi xogtaada.',
    });
    return;
  }

  if (expectedRole && userRow.role !== expectedRole) {
    insertAuditLog({
      studentId: userRow.linkedStudentId || undefined,
      username: userRow.username,
      user: `${userRow.fullName} (${userRow.username})`,
      role: userRow.role,
      action: 'LOGIN_FAILED',
      module: 'Authentication',
      resource: 'auth/login',
      status: 'Failure',
      details: `Isku day gelitaan door khaldan (${expectedRole} halkii uu ka ahaa ${userRow.role}).`,
      ipAddress,
    });
    res.status(403).json({
      success: false,
      message: `Akoonkan (${userRow.username}) wuxuu u diiwaangashan yahay doorka "${userRow.role}", ma aha "${expectedRole}".`,
    });
    return;
  }

  // Check linked student active/deleted/withdrawn status BEFORE password success grants access
  let linkedStudentRow: DbStudentRow | undefined;
  if (userRow.linkedStudentId) {
    linkedStudentRow = db
      .prepare('SELECT * FROM students WHERE id = ?')
      .get(userRow.linkedStudentId) as unknown as DbStudentRow | undefined;
  }

  if (
    userRow.status === 'Deleted' ||
    (userRow.role === 'Student' && (!linkedStudentRow || linkedStudentRow.isDeleted === 1 || linkedStudentRow.status === 'Deleted'))
  ) {
    insertAuditLog({
      studentId: userRow.linkedStudentId || undefined,
      username: userRow.username,
      user: `${userRow.fullName} (${userRow.username})`,
      role: userRow.role,
      action: 'LOGIN_FAILED',
      module: 'Authentication',
      resource: 'auth/login',
      status: 'Failure',
      details: `Gelitaan la diiday: Akoonka ardayga (${userRow.username}) waa la tirtiray (Deleted).`,
      ipAddress,
    });
    res.status(403).json({
      success: false,
      message: 'Akoonkan waa la tirtiray (Deleted) mana geli karo nidaamka.',
    });
    return;
  }

  if (
    userRow.status === 'Withdrawn' ||
    (userRow.role === 'Student' &&
      linkedStudentRow &&
      (linkedStudentRow.status === 'Withdrawn' || linkedStudentRow.status === 'Dropped'))
  ) {
    insertAuditLog({
      studentId: userRow.linkedStudentId || undefined,
      username: userRow.username,
      user: `${userRow.fullName} (${userRow.username})`,
      role: userRow.role,
      action: 'LOGIN_FAILED',
      module: 'Authentication',
      resource: 'auth/login',
      status: 'Failure',
      details: `Gelitaan la diiday: Ardayga (${userRow.username}) waa laga saaray fasalka (Withdrawn).`,
      ipAddress,
    });
    res.status(403).json({
      success: false,
      message: 'Ardaygan waa laga saaray (Withdrawn). Portal-ka firfircoon ma furmi karo.',
    });
    return;
  }

  if (
    userRow.status === 'Deactivated' ||
    userRow.status === 'Suspended' ||
    (userRow.role === 'Student' && linkedStudentRow?.status === 'Suspended')
  ) {
    const label = userRow.status === 'Deactivated' ? 'la damiyay (Deactivated)' : 'la hakiyay (Suspended)';
    insertAuditLog({
      studentId: userRow.linkedStudentId || undefined,
      username: userRow.username,
      user: `${userRow.fullName} (${userRow.username})`,
      role: userRow.role,
      action: 'LOGIN_FAILED',
      module: 'Authentication',
      resource: 'auth/login',
      status: 'Failure',
      details: `Gelitaan la diiday: Akoonka (${userRow.username}) waa ${label}.`,
      ipAddress,
    });
    res.status(403).json({
      success: false,
      message: `Akoonkan waa ${label}. Fadlan la xiriir Maamulka.`,
    });
    return;
  }

  if (!verifyPassword(cleanPass, userRow.passwordHash)) {
    insertAuditLog({
      studentId: userRow.linkedStudentId || undefined,
      username: userRow.username,
      user: `${userRow.fullName} (${userRow.username})`,
      role: userRow.role,
      action: 'LOGIN_FAILED',
      module: 'Authentication',
      resource: 'auth/login',
      status: 'Failure',
      details: `Fure sir ah oo khaldan ayaa lagu isku dayay akoonka ${userRow.username}.`,
      ipAddress,
    });
    res.status(401).json({
      success: false,
      message: 'Furaha sirta ah (Password) ma saxna. Fadlan dib u hubi.',
    });
    return;
  }

  const loginTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
  if (!isBcryptHash(userRow.passwordHash)) {
    db.prepare('UPDATE user_accounts SET passwordHash = ?, lastLoginAt = ?, updatedAt = datetime(\'now\') WHERE id = ?').run(
      hashPassword(cleanPass),
      loginTime,
      userRow.id
    );
  } else {
    db.prepare('UPDATE user_accounts SET lastLoginAt = ?, updatedAt = datetime(\'now\') WHERE id = ?').run(
      loginTime,
      userRow.id
    );
  }
  const refreshedRow = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(userRow.id) as unknown as DbUserRow;
  const sanitizedUser = sanitizeUser(refreshedRow);
  const token = signAuthToken({
    userId: refreshedRow.id,
    username: refreshedRow.username,
    role: refreshedRow.role,
    linkedStudentId: refreshedRow.linkedStudentId || undefined,
    tokenVersion: typeof refreshedRow.tokenVersion === 'number' ? refreshedRow.tokenVersion : 1,
  });

  insertAuditLog({
    studentId: refreshedRow.linkedStudentId || undefined,
    username: refreshedRow.username,
    user: `${refreshedRow.fullName} (${refreshedRow.username})`,
    role: refreshedRow.role,
    action: 'LOGIN',
    module: 'Authentication',
    resource: 'auth/login',
    status: 'Success',
    details: `${refreshedRow.fullName} (${refreshedRow.role}) ayaa si rasmi ah u soo galay akoonkiisa.`,
    ipAddress,
  });

  res.json({
    success: true,
    message: `Si guul leh ayaad u soo gashay akoonkaaga (${refreshedRow.role})!`,
    token,
    user: sanitizedUser,
    student: linkedStudentRow ? sanitizeStudent(linkedStudentRow, Boolean(refreshedRow.mustChangePassword)) : undefined,
    mustChangePassword: Boolean(refreshedRow.mustChangePassword),
  });
});

app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  if (req.authToken) {
    revokeAuthToken(req.authToken);
  }
  insertAuditLog({
    studentId: user.linkedStudentId,
    username: user.username,
    user: `${user.fullName} (${user.username})`,
    role: user.role,
    action: 'LOGOUT',
    module: 'Authentication',
    resource: 'auth/logout',
    status: 'Success',
    details: `${user.fullName} (${user.username}) ayaa ka baxay nidaamka.`,
    ipAddress: getClientIp(req),
  });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  let student = undefined;
  if (user.linkedStudentId) {
    const stuRow = db
      .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
      .get(user.linkedStudentId) as unknown as DbStudentRow | undefined;
    if (stuRow) {
      student = sanitizeStudent(stuRow, user.mustChangePassword);
    }
  }
  res.json({ user, student });
});

// ============================================================
// ROLE-SCOPED BOOTSTRAP
// ============================================================
app.get('/api/bootstrap', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;
  const settings = getKv<SchoolSettings>('settings', {} as SchoolSettings);
  const classes = getKv<SchoolClass[]>('classes', []);
  const subjects = getKv<Subject[]>('subjects', []);
  const teachers = getKv<Teacher[]>('teachers', []);
  const attendance = getKv<AttendanceRecord[]>('attendance', []);
  const exams = getKv<Examination[]>('exams', []);
  const marks = getKv<ExamMark[]>('marks', []);
  const feeStructures = getKv<FeeStructure[]>('feeStructures', []);
  const invoices = getKv<StudentInvoice[]>('invoices', []);
  const payments = getKv<FeePayment[]>('payments', []);
  const incomes = getKv<IncomeRecord[]>('incomes', []);
  const expenses = getKv<ExpenseVoucher[]>('expenses', []);
  const staff = getKv<StaffMember[]>('staff', []);
  const leaveRequests = getKv<StaffLeaveRequest[]>('leaveRequests', []);
  const payroll = getKv<PayrollRecord[]>('payroll', []);
  const timetable = getKv<TimetableSlot[]>('timetable', []);
  const announcements = getKv<Announcement[]>('announcements', []);
  const tickets = getKv<SupportTicket[]>('tickets', []);
  const rbacPolicies = getKv<RbacPermissionPolicy[]>('rbacPolicies', DEFAULT_RBAC_POLICIES);

  if (user.role === 'Student' || user.role === 'Parent') {
    const scopedIds =
      user.role === 'Parent'
        ? user.linkedStudentIds && user.linkedStudentIds.length > 0
          ? user.linkedStudentIds
          : user.linkedStudentId
          ? [user.linkedStudentId]
          : []
        : user.linkedStudentId
        ? [user.linkedStudentId]
        : [];

    const studentRows = scopedIds.length
      ? (db
          .prepare(
            `SELECT * FROM students WHERE isDeleted = 0 AND id IN (${scopedIds.map(() => '?').join(',')})`
          )
          .all(...scopedIds) as unknown as DbStudentRow[])
      : [];

    const userLookupRows = scopedIds.length
      ? (db
          .prepare(
            `SELECT linkedStudentId, mustChangePassword FROM user_accounts WHERE linkedStudentId IN (${scopedIds.map(() => '?').join(',')})`
          )
          .all(...scopedIds) as unknown as { linkedStudentId: string; mustChangePassword: number }[])
      : [];
    const mustChangeMap = new Map(userLookupRows.map((r) => [r.linkedStudentId, Boolean(r.mustChangePassword)]));

    const scopedStudents = studentRows.map((r) => sanitizeStudent(r, mustChangeMap.get(r.id)));
    const scopedClassIds = new Set(scopedStudents.map((s) => s.classId));
    const publishedExamIds = new Set(exams.filter((e) => e.status === 'Published').map((e) => e.id));

    res.json({
      user,
      settings,
      classes,
      subjects,
      teachers: teachers.map((t) => ({
        id: t.id,
        fullName: t.fullName,
        arabicName: t.arabicName,
        specialization: t.specialization,
      })),
      students: scopedStudents,
      attendance: attendance.filter((a) => scopedIds.includes(a.studentId)),
      exams: exams.filter((e) => e.status === 'Published'),
      marks: marks.filter((m) => scopedIds.includes(m.studentId) && publishedExamIds.has(m.examId)),
      feeStructures,
      invoices: invoices.filter((i) => scopedIds.includes(i.studentId)),
      payments: payments.filter((p) => scopedIds.includes(p.studentId)),
      incomes: [],
      expenses: [],
      staff: [],
      leaveRequests: [],
      payroll: [],
      timetable: timetable.filter((t) => scopedClassIds.has(t.classId)),
      announcements: announcements.filter(
        (a) =>
          a.targetAudience === 'All' ||
          a.targetAudience === 'Students' ||
          (user.role === 'Parent' && a.targetAudience === 'Parents')
      ),
      tickets: tickets.filter(
        (t) =>
          t.requesterEmail.toLowerCase() === user.email.toLowerCase() ||
          t.requesterName.toLowerCase() === user.fullName.toLowerCase()
      ),
      auditLogs: [],
      userAccounts: [],
      staffAttendance: [],
      examCardBatches: [],
      examCards: [],
      rbacPolicies: rbacPolicies.filter((p) => p.role === user.role),
    });
    return;
  }

  const activeStudentsRows = db
    .prepare('SELECT * FROM students WHERE isDeleted = 0 ORDER BY id DESC')
    .all() as unknown as DbStudentRow[];
  const studentFlags = db
    .prepare("SELECT linkedStudentId, mustChangePassword FROM user_accounts WHERE role = 'Student'")
    .all() as unknown as { linkedStudentId: string | null; mustChangePassword: number }[];
  const flagMap = new Map(studentFlags.map((f) => [f.linkedStudentId || '', Boolean(f.mustChangePassword)]));
  const allStudents = activeStudentsRows.map((r) => sanitizeStudent(r, flagMap.get(r.id)));

  // Role-isolated Teacher bootstrap (never leaks finance, staff, invoices, expenses, or unrelated classes)
  if (user.role === 'Teacher') {
    const { classIds: assignedClassIds, subjectIds: assignedSubjectIds } = getTeacherAssignedScope(user.linkedTeacherId);
    const scopedClasses = assignedClassIds.size > 0 ? classes.filter((c) => assignedClassIds.has(c.id)) : [];
    const scopedStudents = allStudents
      .filter((s) => assignedClassIds.has(s.classId))
      .map((s) => ({
        ...s,
        guardianPhone: '',
        emergencyContact: '',
        notes: undefined,
      }));
    const scopedStudentIds = new Set(scopedStudents.map((s) => s.id));
    const scopedSubjects =
      assignedSubjectIds.size > 0
        ? subjects.filter((s) => assignedSubjectIds.has(s.id) || (s.classId && assignedClassIds.has(s.classId)))
        : subjects.filter((s) => s.teacherId === user.linkedTeacherId);

    res.json({
      user,
      settings,
      classes: scopedClasses,
      subjects: scopedSubjects,
      teachers: teachers.map((t) => ({
        id: t.id,
        fullName: t.fullName,
        arabicName: t.arabicName,
        specialization: t.specialization,
        status: t.status,
      })),
      students: scopedStudents,
      attendance: attendance.filter((a) => scopedStudentIds.has(a.studentId)),
      exams,
      marks: marks.filter((m) => scopedStudentIds.has(m.studentId)),
      feeStructures: [],
      invoices: [],
      payments: [],
      incomes: [],
      expenses: [],
      staff: [],
      leaveRequests: leaveRequests.filter((lr) => lr.staffId === user.linkedTeacherId),
      payroll: payroll.filter((pr) => pr.staffId === user.linkedTeacherId),
      timetable: timetable.filter((t) => t.teacherId === user.linkedTeacherId || assignedClassIds.has(t.classId)),
      announcements: announcements.filter((a) => a.targetAudience === 'All' || a.targetAudience === 'Teachers' || a.targetAudience === 'Staff'),
      tickets: tickets.filter(
        (t) =>
          t.requesterEmail.toLowerCase() === user.email.toLowerCase() ||
          t.requesterName.toLowerCase() === user.fullName.toLowerCase()
      ),
      auditLogs: [],
      userAccounts: [],
      staffAttendance: [],
      examCardBatches: [],
      examCards: [],
      rbacPolicies: rbacPolicies.filter((p) => p.role === 'Teacher'),
    });
    return;
  }

  // Institute read-only overview bootstrap (academic & overview only; no finance/HR/admin mutations)
  if (user.role === 'Institute') {
    res.json({
      user,
      settings,
      classes,
      subjects,
      teachers: teachers.map((t) => ({ ...t, salary: 0 })),
      students: allStudents.map((s) => ({ ...s, notes: undefined })),
      attendance,
      exams,
      marks,
      feeStructures: [],
      invoices: [],
      payments: [],
      incomes: [],
      expenses: [],
      staff: [],
      leaveRequests: [],
      payroll: [],
      timetable,
      announcements: announcements.filter((a) => a.targetAudience === 'All' || a.targetAudience === 'Staff'),
      tickets: tickets.filter(
        (t) =>
          t.requesterEmail.toLowerCase() === user.email.toLowerCase() ||
          t.requesterName.toLowerCase() === user.fullName.toLowerCase()
      ),
      auditLogs: [],
      userAccounts: [],
      staffAttendance: [],
      examCardBatches: [],
      examCards: [],
      rbacPolicies: rbacPolicies.filter((p) => p.role === 'Institute'),
    });
    return;
  }

  const isFinanceRole = ['Super Admin', 'Administrator', 'Accountant'].includes(user.role);
  const isFeesRole = ['Super Admin', 'Administrator', 'Accountant', 'Receptionist'].includes(user.role);
  const isAcademicRole = ['Super Admin', 'Administrator', 'Academic Manager'].includes(user.role);
  const isHrRole = ['Super Admin', 'Administrator', 'HR Manager'].includes(user.role);
  const canViewStudents = isAcademicRole || isFinanceRole || isFeesRole;

  const userRows = ACCOUNT_ADMIN_ROLES.includes(user.role)
    ? (db.prepare("SELECT * FROM user_accounts WHERE status != 'Deleted' ORDER BY id ASC").all() as unknown as DbUserRow[])
    : [];
  const userAccounts = userRows.map(sanitizeUser);
  const auditLogs = ACCOUNT_ADMIN_ROLES.includes(user.role)
    ? (db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC, id DESC LIMIT 500').all() as unknown as AuditLog[])
    : isAcademicRole
    ? (db
        .prepare("SELECT * FROM audit_logs WHERE module != 'Accounts & RBAC' ORDER BY timestamp DESC, id DESC LIMIT 250")
        .all() as unknown as AuditLog[])
    : [];

  const staffAttendance = STAFF_ATTENDANCE_ROLES.includes(user.role)
    ? (db.prepare('SELECT * FROM staff_attendance ORDER BY date DESC, personName ASC').all() as unknown as StaffAttendanceRecord[])
    : [];

  const examCardBatches = EXAM_CARD_ROLES.includes(user.role)
    ? (db.prepare('SELECT * FROM exam_card_batches WHERE isDeleted = 0 ORDER BY createdAt DESC').all() as unknown as ExamCardBatch[])
    : [];
  const examCards = EXAM_CARD_ROLES.includes(user.role)
    ? (db
        .prepare('SELECT * FROM exam_cards WHERE isDeleted = 0 ORDER BY className ASC, rollNumber ASC')
        .all()
        .map((r: any) => ({ ...r, isDeleted: Boolean(r.isDeleted) })) as ExamCard[])
    : [];

  const safeTeachers =
    isHrRole || isFinanceRole
      ? teachers
      : teachers.map((t) => ({ ...t, salary: 0 }));

  res.json({
    user,
    settings,
    classes,
    subjects,
    teachers: safeTeachers,
    students: canViewStudents ? allStudents : [],
    attendance: isAcademicRole || user.role === 'Receptionist' ? attendance : [],
    exams: isAcademicRole ? exams : [],
    marks: isAcademicRole ? marks : [],
    feeStructures: isFeesRole ? feeStructures : [],
    invoices: isFeesRole ? invoices : [],
    payments: isFeesRole ? payments : [],
    incomes: isFinanceRole ? incomes : [],
    expenses: isFinanceRole ? expenses : [],
    staff: isHrRole || isFinanceRole ? staff : [],
    leaveRequests: isHrRole ? leaveRequests : leaveRequests.filter((lr) => lr.staffId === user.linkedStaffId),
    payroll: isHrRole || isFinanceRole ? payroll : [],
    timetable,
    announcements,
    tickets,
    auditLogs,
    userAccounts,
    staffAttendance,
    examCardBatches,
    examCards,
    rbacPolicies:
      user.role === 'Super Admin' || user.role === 'Administrator'
        ? rbacPolicies
        : rbacPolicies.filter((p) => p.role === user.role),
  });
});

// ============================================================
// STUDENT MANAGEMENT ENDPOINTS (STRICT BACKEND RBAC)
// ============================================================
app.get('/api/students', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.authUser!;

  if (user.role === 'HR Manager') {
    recordUnauthorizedAccess(req, 'Students', '/api/students', `HR Manager ${user.username} tried listing students.`);
    res.status(403).json({ error: 'Forbidden: HR Manager ma laha oggolaanshaha diiwaanka ardayda.' });
    return;
  }

  if (user.role === 'Student') {
    if (req.query.all === 'true') {
      recordUnauthorizedAccess(
        req,
        'Students',
        '/api/students?all=true',
        `Ardayga ${user.username} ayaa isku dayay inuu soo saaro liiska dhammaan ardayda.`
      );
      res.status(403).json({ error: 'Forbidden: Ardaygu ma arki karo liiska ardayda kale.' });
      return;
    }
    const ownRow = user.linkedStudentId
      ? (db
          .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
          .get(user.linkedStudentId) as unknown as DbStudentRow | undefined)
      : undefined;
    res.json(ownRow ? [sanitizeStudent(ownRow, user.mustChangePassword)] : []);
    return;
  }

  if (user.role === 'Parent') {
    const ids = user.linkedStudentIds || (user.linkedStudentId ? [user.linkedStudentId] : []);
    if (ids.length === 0) {
      res.json([]);
      return;
    }
    const rows = db
      .prepare(`SELECT * FROM students WHERE isDeleted = 0 AND id IN (${ids.map(() => '?').join(',')})`)
      .all(...ids) as unknown as DbStudentRow[];
    res.json(rows.map((r) => sanitizeStudent(r)));
    return;
  }

  let rows = db
    .prepare('SELECT * FROM students WHERE isDeleted = 0 ORDER BY id DESC')
    .all() as unknown as DbStudentRow[];

  if (user.role === 'Teacher') {
    const { classIds } = getTeacherAssignedScope(user.linkedTeacherId);
    rows = rows.filter((r) => classIds.has(r.classId));
  }

  const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
  const activeOnly = req.query.activeOnly === 'true';
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  if (activeOnly) {
    rows = rows.filter((r) => r.status === 'Active');
  } else if (statusFilter && statusFilter !== 'all') {
    rows = rows.filter((r) => r.status === statusFilter);
  }

  if (search) {
    rows = rows.filter(
      (r) =>
        r.fullName.toLowerCase().includes(search) ||
        r.id.toLowerCase().includes(search) ||
        r.rollNumber.toLowerCase().includes(search) ||
        r.portalUsername.toLowerCase().includes(search)
    );
  }

  const studentFlags = db
    .prepare("SELECT linkedStudentId, mustChangePassword FROM user_accounts WHERE role = 'Student'")
    .all() as unknown as { linkedStudentId: string | null; mustChangePassword: number }[];
  const flagMap = new Map(studentFlags.map((f) => [f.linkedStudentId || '', Boolean(f.mustChangePassword)]));

  res.json(
    rows.map((r) => {
      const stu = sanitizeStudent(r, flagMap.get(r.id));
      if (user.role === 'Teacher') {
        return { ...stu, guardianPhone: '', emergencyContact: '', notes: undefined };
      }
      if (user.role === 'Institute') {
        return { ...stu, notes: undefined };
      }
      return stu;
    })
  );
});

app.get('/api/students/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const user = req.authUser!;
  if (user.role === 'HR Manager') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  if (!assertStudentOrAdminOwnership(req, res, id, 'Students')) return;

  const row = db
    .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
    .get(id) as unknown as DbStudentRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Ardayga lama helin.' });
    return;
  }

  if (user.role === 'Teacher') {
    const { classIds } = getTeacherAssignedScope(user.linkedTeacherId);
    if (!classIds.has(row.classId)) {
      recordUnauthorizedAccess(req, 'Students', `student:${id}`, `Teacher ${user.username} tried viewing unassigned student ${id}.`);
      res.status(403).json({ error: 'Forbidden: Macallinku wuxuu eegi karaa ardayda fasalladiisa oo kaliya.' });
      return;
    }
  }

  const acc = db
    .prepare('SELECT mustChangePassword FROM user_accounts WHERE linkedStudentId = ?')
    .get(id) as { mustChangePassword: number } | undefined;

  const experience = calculateStudentExperience(row.admissionDate);
  const stu = sanitizeStudent(row, acc ? Boolean(acc.mustChangePassword) : undefined);
  if (user.role === 'Teacher') {
    res.json({ ...stu, guardianPhone: '', emergencyContact: '', notes: undefined, experience });
    return;
  }
  res.json({
    ...stu,
    experience,
  });
});

app.post(
  '/api/students',
  requireAuth,
  requireRoles(['Super Admin', 'Administrator', 'Academic Manager', 'Receptionist'], 'Students'),
  (req: AuthenticatedRequest, res: Response) => {
    const body = req.body || {};
    if (!body.fullName || !body.guardianPhone) {
      res.status(400).json({ error: 'Magaca buuxa iyo taleefanka waalidka waa qasab.' });
      return;
    }

    const { student } = createStudentWithAccount(body);
    const actor = req.authUser!;

    insertAuditLog({
      studentId: student.id,
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'CREATE',
      module: 'Students',
      resource: `student:${student.id}`,
      status: 'Success',
      details: `Waxaa la diiwaangeliyay arday cusub: ${student.fullName} (${student.id} · Username: ${student.portalUsername})`,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(student);
  }
);

app.post(
  '/api/students/batch',
  requireAuth,
  requireRoles(['Super Admin', 'Administrator', 'Academic Manager', 'Receptionist'], 'Students'),
  (req: AuthenticatedRequest, res: Response) => {
    const items = Array.isArray(req.body?.students) ? req.body.students : [];
    if (items.length === 0) {
      res.status(400).json({ error: 'Ma jiraan arday la soo gelinayo.' });
      return;
    }

    const created = items.map((item: any) => createStudentWithAccount(item).student);
    const actor = req.authUser!;

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'CREATE',
      module: 'Students',
      resource: 'students/batch',
      status: 'Success',
      details: `Waxaa Excel lagu soo geliyay ${created.length} arday oo cusub.`,
      ipAddress: getClientIp(req),
    });

    res.status(201).json({ created });
  }
);

const handleUpdateStudent = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db
    .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
    .get(id) as unknown as DbStudentRow | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Ardayga lama helin.' });
    return;
  }

  const updates = req.body || {};
  const nextFullName = typeof updates.fullName === 'string' && updates.fullName.trim() ? updates.fullName.trim() : existing.fullName;
  const nextAdmissionDate = updates.admissionDate || existing.admissionDate;
  const nextIssueDate = updates.idCardIssueDate || existing.idCardIssueDate || nextAdmissionDate;
  const nextExpiryDate =
    updates.idCardExpiryDate ||
    (updates.admissionDate && updates.admissionDate !== existing.admissionDate
      ? calculateSixYearExpiry(updates.admissionDate)
      : existing.idCardExpiryDate);

  let nextStatus = updates.status || existing.status;
  if (nextStatus === 'Dropped') nextStatus = 'Withdrawn';

  db.prepare(`
    UPDATE students SET
      rollNumber = ?,
      fullName = ?,
      arabicName = ?,
      gender = ?,
      birthDate = ?,
      classId = ?,
      section = ?,
      shift = ?,
      admissionDate = ?,
      status = ?,
      photoUrl = ?,
      bloodGroup = ?,
      guardianName = ?,
      guardianPhone = ?,
      guardianRelation = ?,
      guardianAddress = ?,
      emergencyContact = ?,
      notes = ?,
      idCardIssueDate = ?,
      idCardExpiryDate = ?,
      idCardStatus = ?,
      updatedAt = datetime('now')
    WHERE id = ?
  `).run(
    updates.rollNumber ?? existing.rollNumber,
    nextFullName,
    updates.arabicName ?? existing.arabicName,
    updates.gender ?? existing.gender,
    updates.birthDate ?? existing.birthDate,
    updates.classId ?? existing.classId,
    updates.section ?? existing.section,
    updates.shift ?? existing.shift,
    nextAdmissionDate,
    nextStatus,
    updates.photoUrl ?? existing.photoUrl,
    updates.bloodGroup ?? existing.bloodGroup,
    updates.guardianName ?? existing.guardianName,
    updates.guardianPhone ?? existing.guardianPhone,
    updates.guardianRelation ?? existing.guardianRelation,
    updates.guardianAddress ?? existing.guardianAddress,
    updates.emergencyContact ?? existing.emergencyContact,
    updates.notes ?? existing.notes,
    nextIssueDate,
    nextExpiryDate,
    updates.idCardStatus ?? existing.idCardStatus,
    id
  );

  // Sync linked user account status & name
  const accountStatus =
    nextStatus === 'Withdrawn'
      ? 'Withdrawn'
      : nextStatus === 'Suspended'
      ? 'Suspended'
      : 'Active';

  db.prepare(`
    UPDATE user_accounts SET fullName = ?, photoUrl = ?, status = ?, updatedAt = datetime('now')
    WHERE linkedStudentId = ?
  `).run(nextFullName, updates.photoUrl ?? existing.photoUrl, accountStatus, id);

  const actor = req.authUser!;
  insertAuditLog({
    studentId: id,
    username: actor.username,
    user: `${actor.fullName} (${actor.username})`,
    role: actor.role,
    action: 'UPDATE',
    module: 'Students',
    resource: `student:${id}`,
    status: 'Success',
    details: `Maamulka (${actor.username}) ayaa wax ka beddelay xogta ardayga ${nextFullName} (${id}).`,
    ipAddress: getClientIp(req),
  });

  const updatedRow = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as unknown as DbStudentRow;
  res.json(sanitizeStudent(updatedRow));
};

app.put(
  '/api/students/:id',
  requireAuth,
  requireRoles(ADMIN_ROLES, 'Students'),
  handleUpdateStudent
);
app.patch(
  '/api/students/:id',
  requireAuth,
  requireRoles(ADMIN_ROLES, 'Students'),
  handleUpdateStudent
);

// DELETE Student (Safe soft-delete by default; optional ?permanent=true if no financial/exam history)
app.delete(
  '/api/students/:id',
  requireAuth,
  requireRoles(ADMIN_ROLES, 'Students'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const existing = db
      .prepare('SELECT * FROM students WHERE id = ?')
      .get(id) as unknown as DbStudentRow | undefined;

    if (!existing || existing.isDeleted === 1) {
      res.status(404).json({ error: 'Ardayga lama helin ama horay ayaa loo tirtiray.' });
      return;
    }

    const permanent = req.query.permanent === 'true';
    if (permanent) {
      if (!ACCOUNT_ADMIN_ROLES.includes(actor.role)) {
        recordUnauthorizedAccess(
          req,
          'Students',
          `student:${id}?permanent=true`,
          `Isku day tirtirid joogto ah oo aan la oggolayn (${actor.username}).`
        );
        res.status(403).json({ error: 'Forbidden: Super Admin/Administrator oo kaliya ayaa samayn kara permanent delete.' });
        return;
      }
      const marks = getKv<ExamMark[]>('marks', []);
      const invoices = getKv<StudentInvoice[]>('invoices', []);
      const payments = getKv<FeePayment[]>('payments', []);
      const hasHistory =
        marks.some((m) => m.studentId === id) ||
        invoices.some((i) => i.studentId === id) ||
        payments.some((p) => p.studentId === id);

      if (hasHistory) {
        res.status(409).json({
          error: 'Ardaygan wuxuu leeyahay diiwaan imtixaan/maaliyadeed; waxaa la adeegsanayaa soft-delete si taariikhda loo ilaaliyo.',
        });
        return;
      }

      db.prepare('DELETE FROM user_accounts WHERE linkedStudentId = ?').run(id);
      db.prepare('DELETE FROM students WHERE id = ?').run(id);
    } else {
      const deletedAt = new Date().toISOString();
      db.prepare(`
        UPDATE students
        SET isDeleted = 1, status = 'Deleted', deletedAt = ?, deletedBy = ?, updatedAt = datetime('now')
        WHERE id = ?
      `).run(deletedAt, actor.username, id);

      db.prepare(`
        UPDATE user_accounts
        SET status = 'Deleted', updatedAt = datetime('now')
        WHERE linkedStudentId = ?
      `).run(id);
    }

    insertAuditLog({
      studentId: id,
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'DELETE',
      module: 'Students',
      resource: `student:${id}`,
      status: 'Success',
      details: `Ardayga ${existing.fullName} (${id}) waxaa tirtiray ${actor.fullName} (${actor.username}) taariikhda ${new Date().toISOString().substring(0, 10)}.`,
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true, id, deletedBy: actor.username });
  }
);

// DROP / WITHDRAW Student (Separate operation from DELETE - preserves history, sets Withdrawn)
const handleDropStudent = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const actor = req.authUser!;
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

  const existing = db
    .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
    .get(id) as unknown as DbStudentRow | undefined;

  if (!existing) {
    res.status(404).json({ error: 'Ardayga lama helin.' });
    return;
  }

  const nextNotes = reason
    ? `${existing.notes ? existing.notes + ' | ' : ''}Withdrawn: ${reason}`
    : existing.notes;

  db.prepare(`
    UPDATE students
    SET status = 'Withdrawn', notes = ?, updatedAt = datetime('now')
    WHERE id = ?
  `).run(nextNotes, id);

  db.prepare(`
    UPDATE user_accounts
    SET status = 'Withdrawn', updatedAt = datetime('now')
    WHERE linkedStudentId = ?
  `).run(id);

  insertAuditLog({
    studentId: id,
    username: actor.username,
    user: `${actor.fullName} (${actor.username})`,
    role: actor.role,
    action: 'DROP',
    module: 'Students',
    resource: `student:${id}`,
    status: 'Success',
    details: `Ardayga ${existing.fullName} (${id}) waxaa laga dhigay Withdrawn (Dropped). Xogta taariikhiga ah waa la ilaaliyay.${reason ? ' Sababta: ' + reason : ''}`,
    ipAddress: getClientIp(req),
  });

  const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as unknown as DbStudentRow;
  res.json(sanitizeStudent(updated));
};

app.post('/api/students/:id/drop', requireAuth, requireRoles(ADMIN_ROLES, 'Students'), handleDropStudent);
app.post('/api/students/:id/withdraw', requireAuth, requireRoles(ADMIN_ROLES, 'Students'), handleDropStudent);

app.post(
  '/api/students/:id/restore',
  requireAuth,
  requireRoles(ADMIN_ROLES, 'Students'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const existing = db
      .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
      .get(id) as unknown as DbStudentRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Ardayga lama helin.' });
      return;
    }

    db.prepare(`UPDATE students SET status = 'Active', updatedAt = datetime('now') WHERE id = ?`).run(id);
    db.prepare(`UPDATE user_accounts SET status = 'Active', updatedAt = datetime('now') WHERE linkedStudentId = ?`).run(id);

    insertAuditLog({
      studentId: id,
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'RESTORE',
      module: 'Students',
      resource: `student:${id}`,
      status: 'Success',
      details: `Ardayga ${existing.fullName} (${id}) dib ayaa loo hawlgeliyay (Active).`,
      ipAddress: getClientIp(req),
    });

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as unknown as DbStudentRow;
    res.json(sanitizeStudent(updated));
  }
);

// ADMIN PASSWORD RESET FOR STUDENT
const handleAdminResetPassword = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const actor = req.authUser!;
  const tempPassword =
    typeof req.body?.newPassword === 'string' && req.body.newPassword.trim().length >= 4
      ? req.body.newPassword.trim()
      : 'machad@123';

  const stuRow = db
    .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
    .get(id) as unknown as DbStudentRow | undefined;

  if (!stuRow) {
    res.status(404).json({ error: 'Ardayga lama helin.' });
    return;
  }

  let accRow = db
    .prepare('SELECT * FROM user_accounts WHERE linkedStudentId = ?')
    .get(id) as unknown as DbUserRow | undefined;

  if (!accRow) {
    const uniqueUsername = stuRow.portalUsername || generateMachadStudentUsername(stuRow.id);
    db.prepare(`
      INSERT INTO user_accounts (
        id, username, email, passwordHash, fullName, role, photoUrl,
        linkedStudentId, mustChangePassword, status
      ) VALUES (?, ?, ?, ?, ?, 'Student', ?, ?, 1, 'Active')
    `).run(
      `USR-${stuRow.id}`,
      uniqueUsername,
      `${stuRow.id.toLowerCase()}@student.machadkakhadiija.edu.so`,
      hashPassword(tempPassword),
      stuRow.fullName,
      stuRow.photoUrl,
      stuRow.id
    );
  } else {
    db.prepare(`
      UPDATE user_accounts
      SET passwordHash = ?, mustChangePassword = 1, updatedAt = datetime('now')
      WHERE id = ?
    `).run(hashPassword(tempPassword), accRow.id);
  }

  insertAuditLog({
    studentId: id,
    username: actor.username,
    user: `${actor.fullName} (${actor.username})`,
    role: actor.role,
    action: 'PASSWORD_RESET',
    module: 'Student Accounts',
    resource: `student:${id}`,
    status: 'Success',
    details: `Maamulka (${actor.username}) ayaa dib u dejiyay furaha sirta ah ee ardayga ${stuRow.fullName} (${id}). Waxaa lagu qasbi doonaa beddelaad marka uu soo galo.`,
    ipAddress: getClientIp(req),
  });

  res.json({
    success: true,
    message: `Furaha sirta ah ee ardayga ${stuRow.fullName} dib ayaa loo dejiyay.`,
  });
};

app.post(
  '/api/students/:id/reset-password',
  requireAuth,
  requireRoles(ACCOUNT_ADMIN_ROLES, 'Student Accounts'),
  handleAdminResetPassword
);
app.post(
  '/api/admin/students/:id/reset-password',
  requireAuth,
  requireRoles(ACCOUNT_ADMIN_ROLES, 'Student Accounts'),
  handleAdminResetPassword
);

// PASSWORD CHANGE (Own account for any authenticated user OR Student password reset by Admin)
const handleChangePassword = (req: AuthenticatedRequest, res: Response) => {
  const actor = req.authUser!;
  const requestedStudentId = req.params.id || req.body?.targetStudentId;
  const { currentPassword, newPassword } = req.body || {};
  const cleanCurrent = typeof currentPassword === 'string' ? currentPassword.trim() : '';
  const cleanNew = typeof newPassword === 'string' ? newPassword.trim() : '';

  if (requestedStudentId) {
    if (actor.role === 'Student' && actor.linkedStudentId !== requestedStudentId) {
      recordUnauthorizedAccess(
        req,
        'Student Portal',
        `student:${requestedStudentId}/change-password`,
        `Ardayga ${actor.username} ayaa isku dayay inuu beddelo furaha arday kale (${requestedStudentId}).`
      );
      res.status(403).json({
        success: false,
        message: 'Forbidden: Waxaad beddeli kartaa furaha akoonkaaga oo kaliya.',
      });
      return;
    }

    if (actor.role !== 'Student' && !ADMIN_ROLES.includes(actor.role)) {
      recordUnauthorizedAccess(
        req,
        'Student Portal',
        `student:${requestedStudentId}/change-password`,
        `Doorka ${actor.role} ma beddeli karo furaha ardaygan.`
      );
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    const accRow = db
      .prepare('SELECT * FROM user_accounts WHERE linkedStudentId = ?')
      .get(requestedStudentId) as unknown as DbUserRow | undefined;

    if (!accRow) {
      res.status(404).json({ success: false, message: 'Akoonka ardayga lama helin.' });
      return;
    }

    if (!cleanCurrent || !verifyPassword(cleanCurrent, accRow.passwordHash)) {
      res.status(400).json({ success: false, message: 'Furaha hadda jira ma saxna.' });
      return;
    }
    if (cleanNew.length < 4) {
      res.status(400).json({ success: false, message: 'Furaha cusub waa inuu ka koobnaadaa ugu yaraan 4 xaraf/tiro.' });
      return;
    }
    if (cleanNew === 'machad@123') {
      res.status(400).json({ success: false, message: 'Fadlan dooro fure cusub oo ka duwan furaha bilowga ah.' });
      return;
    }

    const nextTokenVersion = (accRow.tokenVersion || 1) + 1;
    db.prepare(`
      UPDATE user_accounts
      SET passwordHash = ?, mustChangePassword = 0, tokenVersion = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(hashPassword(cleanNew), nextTokenVersion, accRow.id);

    insertAuditLog({
      studentId: requestedStudentId,
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'PASSWORD_CHANGE',
      module: 'Student Portal',
      resource: `student:${requestedStudentId}`,
      status: 'Success',
      details: `Ardayga ${accRow.fullName} (${requestedStudentId}) ayaa si guul leh u beddelay furaha sirta ah ee akoonkiisa.`,
      ipAddress: getClientIp(req),
    });

    const updatedUserRow = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(accRow.id) as unknown as DbUserRow;
    const newToken =
      actor.id === updatedUserRow.id
        ? signAuthToken({
            userId: updatedUserRow.id,
            username: updatedUserRow.username,
            role: updatedUserRow.role,
            linkedStudentId: updatedUserRow.linkedStudentId || undefined,
            tokenVersion: nextTokenVersion,
          })
        : undefined;
    res.json({
      success: true,
      message: 'Furahaaga sirta ah si guul leh ayaa loo beddelay!',
      user: sanitizeUser(updatedUserRow),
      ...(newToken ? { token: newToken } : {}),
    });
    return;
  }

  // Self password change for ANY authenticated user (Admin, Teacher, Institute, Parent, Student)
  const ownRow = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(actor.id) as unknown as DbUserRow | undefined;
  if (!ownRow) {
    res.status(404).json({ success: false, message: 'Akoonkaaga lama helin.' });
    return;
  }
  if (!cleanCurrent || !verifyPassword(cleanCurrent, ownRow.passwordHash)) {
    res.status(400).json({ success: false, message: 'Furaha hadda jira ma saxna.' });
    return;
  }
  if (cleanNew.length < 4) {
    res.status(400).json({ success: false, message: 'Furaha cusub waa inuu ka koobnaadaa ugu yaraan 4 xaraf.' });
    return;
  }
  if (ownRow.role === 'Student' && cleanNew === 'machad@123') {
    res.status(400).json({ success: false, message: 'Fadlan dooro fure cusub oo ka duwan furaha bilowga ah.' });
    return;
  }

  const nextTokenVersion = (ownRow.tokenVersion || 1) + 1;
  db.prepare(`
    UPDATE user_accounts
    SET passwordHash = ?, mustChangePassword = 0, tokenVersion = ?, updatedAt = datetime('now')
    WHERE id = ?
  `).run(hashPassword(cleanNew), nextTokenVersion, ownRow.id);

  insertAuditLog({
    studentId: ownRow.linkedStudentId || undefined,
    username: actor.username,
    user: `${actor.fullName} (${actor.username})`,
    role: actor.role,
    action: 'PASSWORD_CHANGE',
    module: 'Authentication',
    resource: `user:${ownRow.id}`,
    status: 'Success',
    details: `${actor.fullName} (${actor.role}) ayaa beddelay furaha sirta ah ee akoonkiisa.`,
    ipAddress: getClientIp(req),
  });

  const refreshed = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(ownRow.id) as unknown as DbUserRow;
  const freshToken = signAuthToken({
    userId: refreshed.id,
    username: refreshed.username,
    role: refreshed.role,
    linkedStudentId: refreshed.linkedStudentId || undefined,
    tokenVersion: nextTokenVersion,
  });
  res.json({
    success: true,
    message: 'Furahaaga sirta ah si guul leh ayaa loo beddelay!',
    user: sanitizeUser(refreshed),
    token: freshToken,
  });
};

app.post('/api/students/:id/change-password', requireAuth, handleChangePassword);
app.post('/api/auth/change-password', requireAuth, handleChangePassword);

// ============================================================
// STUDENT PORTAL READ-ONLY ENDPOINTS & ACTIVITY AUDIT LOGGING
// ============================================================
app.get('/api/student-portal/:id/id-card', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (!assertStudentOrAdminOwnership(req, res, id, 'Student Portal')) return;

  const stuRow = db
    .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
    .get(id) as unknown as DbStudentRow | undefined;
  if (!stuRow) {
    res.status(404).json({ error: 'Ardayga lama helin.' });
    return;
  }

  const actor = req.authUser!;
  const classes = getKv<SchoolClass[]>('classes', []);
  const cls = classes.find((c) => c.id === stuRow.classId);
  const experience = calculateStudentExperience(stuRow.admissionDate);

  if (actor.role === 'Student' || actor.role === 'Parent') {
    insertAuditLog({
      studentId: id,
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'VIEW_ID_CARD',
      module: 'Student Portal',
      resource: `id-card:${id}`,
      status: 'Success',
      details: `${actor.fullName} (${actor.username}) ayaa eegay Kaarka Aqoonsiga iyo Muddada Joogitaanka (${experience.formattedEnglish}).`,
      ipAddress: getClientIp(req),
    });
  }

  res.json({
    student: sanitizeStudent(stuRow),
    classInfo: cls || null,
    experience,
  });
});

app.get('/api/student-portal/:id/:section', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id, section } = req.params;
  if (!assertStudentOrAdminOwnership(req, res, id, 'Student Portal')) return;

  const stuRow = db
    .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
    .get(id) as unknown as DbStudentRow | undefined;
  if (!stuRow) {
    res.status(404).json({ error: 'Ardayga lama helin.' });
    return;
  }

  const actor = req.authUser!;
  const actionMap: Record<string, AuditLog['action']> = {
    overview: 'VIEW_PROFILE',
    exams: 'VIEW_EXAMS',
    attendance: 'VIEW_ATTENDANCE',
    fees: 'VIEW_FEES',
    announcements: 'VIEW_ANNOUNCEMENTS',
    timetable: 'VIEW',
  };

  const logAction = actionMap[section] || 'VIEW';
  if (actor.role === 'Student' || actor.role === 'Parent') {
    insertAuditLog({
      studentId: id,
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: logAction,
      module: 'Student Portal',
      resource: `student-portal/${id}/${section}`,
      status: 'Success',
      details: `${actor.fullName} (${actor.username}) ayaa eegay qaybta ${section} ee barta ardayga.`,
      ipAddress: getClientIp(req),
    });
  }

  const exams = getKv<Examination[]>('exams', []);
  const marks = getKv<ExamMark[]>('marks', []);
  const attendance = getKv<AttendanceRecord[]>('attendance', []);
  const invoices = getKv<StudentInvoice[]>('invoices', []);
  const payments = getKv<FeePayment[]>('payments', []);
  const announcements = getKv<Announcement[]>('announcements', []);
  const timetable = getKv<TimetableSlot[]>('timetable', []);

  if (section === 'exams') {
    const pubIds = new Set(exams.filter((e) => e.status === 'Published').map((e) => e.id));
    res.json({
      exams: exams.filter((e) => e.status === 'Published'),
      marks: marks.filter((m) => m.studentId === id && (ADMIN_ROLES.includes(actor.role) || pubIds.has(m.examId))),
    });
    return;
  }
  if (section === 'attendance') {
    res.json({ attendance: attendance.filter((a) => a.studentId === id) });
    return;
  }
  if (section === 'fees') {
    res.json({
      invoices: invoices.filter((i) => i.studentId === id),
      payments: payments.filter((p) => p.studentId === id),
    });
    return;
  }
  if (section === 'announcements') {
    res.json({
      announcements: announcements.filter(
        (a) => a.targetAudience === 'All' || a.targetAudience === 'Students' || a.targetAudience === 'Parents'
      ),
    });
    return;
  }
  if (section === 'timetable') {
    res.json({ timetable: timetable.filter((t) => t.classId === stuRow.classId) });
    return;
  }

  res.json({
    student: sanitizeStudent(stuRow),
    experience: calculateStudentExperience(stuRow.admissionDate),
  });
});

app.post('/api/student-portal/:id/activity', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  if (!assertStudentOrAdminOwnership(req, res, id, 'Student Portal')) return;
  const actor = req.authUser!;
  const { action, details, resource } = req.body || {};

  const allowedViewActions = new Set([
    'VIEW',
    'VIEW_PROFILE',
    'VIEW_ID_CARD',
    'VIEW_EXAMS',
    'VIEW_ATTENDANCE',
    'VIEW_FEES',
    'VIEW_ANNOUNCEMENTS',
  ]);
  const safeAction = allowedViewActions.has(action) ? (action as AuditLog['action']) : 'VIEW';

  const log = insertAuditLog({
    studentId: id,
    username: actor.username,
    user: `${actor.fullName} (${actor.username})`,
    role: actor.role,
    action: safeAction,
    module: 'Student Portal',
    resource: typeof resource === 'string' ? resource : `student-portal:${id}`,
    status: 'Success',
    details: typeof details === 'string' && details.trim() ? details.trim() : `${actor.fullName} ayaa eegay barta ardayga.`,
    ipAddress: getClientIp(req),
  });

  res.status(201).json(log);
});

// Explicitly reject unauthorized Student/Parent mutations on academic/admin endpoints
const rejectStudentMutations = (moduleName: string) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.authUser;
  if (user && (user.role === 'Student' || user.role === 'Parent')) {
    recordUnauthorizedAccess(
      req,
      moduleName,
      req.originalUrl,
      `${user.role} (${user.username}) ayaa isku dayay wax-ka-beddel aan la oggolayn (${req.method} ${req.originalUrl}).`
    );
    res.status(403).json({
      error: 'Forbidden: Portal-ka ardaygu waa View-Only. Wax-ka-beddel laguma samayn karo.',
    });
    return;
  }
  next();
};

app.all('/api/marks*', requireAuth, rejectStudentMutations('Examinations'), (_req, res) => {
  res.status(405).json({ error: 'Use /api/state/marks with staff privileges.' });
});

// Explicitly protect /api/attendance/staff* before general /api/attendance* handler
app.all(
  '/api/attendance/staff*',
  requireAuth,
  requireRoles(STAFF_ATTENDANCE_ROLES, 'Staff Attendance'),
  (_req, res) => {
    res.status(404).json({ error: 'Use /api/staff-attendance endpoints.' });
  }
);

app.all('/api/attendance*', requireAuth, rejectStudentMutations('Attendance'), (_req, res) => {
  res.status(405).json({ error: 'Use /api/state/attendance with staff privileges.' });
});
app.all('/api/fees*', requireAuth, rejectStudentMutations('Fees & Invoices'), (_req, res) => {
  res.status(405).json({ error: 'Use /api/state/invoices or /api/state/payments with staff privileges.' });
});

// ============================================================
// AUDIT LOG ENDPOINTS (ADMIN READ-ONLY, IMMUTABLE)
// ============================================================
app.get(
  '/api/audit-logs',
  requireAuth,
  requireRoles(ADMIN_ROLES, 'Audit Logs'),
  (req: AuthenticatedRequest, res: Response) => {
    const { studentId, action, module, status, dateFrom, dateTo, search, filter } = req.query;
    let logs = db
      .prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC, id DESC LIMIT 1000')
      .all() as unknown as AuditLog[];

    if (filter === 'students') {
      logs = logs.filter((l) => l.role === 'Student' || l.module === 'Student Portal' || Boolean(l.studentId));
    } else if (filter === 'staff') {
      logs = logs.filter((l) => l.role !== 'Student' && l.module !== 'Student Portal');
    }

    if (typeof studentId === 'string' && studentId.trim() && studentId !== 'all') {
      logs = logs.filter((l) => l.studentId === studentId.trim() || l.user.includes(studentId.trim()));
    }
    if (typeof action === 'string' && action.trim() && action !== 'all') {
      logs = logs.filter((l) => l.action === action.trim());
    }
    if (typeof module === 'string' && module.trim() && module !== 'all') {
      logs = logs.filter((l) => l.module === module.trim());
    }
    if (typeof status === 'string' && status.trim() && status !== 'all') {
      logs = logs.filter((l) => (l.status || 'Success') === status.trim());
    }
    if (typeof dateFrom === 'string' && dateFrom.trim()) {
      logs = logs.filter((l) => l.timestamp.substring(0, 10) >= dateFrom.trim());
    }
    if (typeof dateTo === 'string' && dateTo.trim()) {
      logs = logs.filter((l) => l.timestamp.substring(0, 10) <= dateTo.trim());
    }
    if (typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase();
      logs = logs.filter(
        (l) =>
          l.user.toLowerCase().includes(q) ||
          (l.username || '').toLowerCase().includes(q) ||
          (l.studentId || '').toLowerCase().includes(q) ||
          l.details.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.module.toLowerCase().includes(q)
      );
    }

    res.json(logs);
  }
);

app.all('/api/audit-logs*', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  recordUnauthorizedAccess(
    req,
    'Audit Logs',
    req.originalUrl,
    `Isku day wax-ka-beddel ama tirtirid ah oo lagu sameeyay Audit Logs (${req.method}).`
  );
  res.status(403).json({
    error: 'Forbidden: Audit logs lama beddeli karo lamana tirtiri karo.',
  });
});

// ============================================================
// USER ACCOUNTS, RBAC PERMISSIONS & LOGIN ACTIVITY (STRICT ADMIN / SUPER ADMIN)
// ============================================================
app.get(
  '/api/users',
  requireAuth,
  requireRoles(ACCOUNT_ADMIN_ROLES, 'Accounts & RBAC'),
  (req: AuthenticatedRequest, res: Response) => {
    const roleFilter = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    let rows = db
      .prepare("SELECT * FROM user_accounts WHERE status != 'Deleted' ORDER BY role ASC, id ASC")
      .all() as unknown as DbUserRow[];

    if (roleFilter && roleFilter !== 'all') {
      rows = rows.filter((r) => r.role === roleFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (search) {
      rows = rows.filter(
        (r) =>
          r.username.toLowerCase().includes(search) ||
          r.fullName.toLowerCase().includes(search) ||
          r.email.toLowerCase().includes(search) ||
          r.role.toLowerCase().includes(search)
      );
    }

    res.json(rows.map(sanitizeUser));
  }
);

app.post(
  '/api/users',
  requireAuth,
  requireRoles(ACCOUNT_ADMIN_ROLES, 'Accounts & RBAC'),
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const body = req.body || {};
    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
    const role = body.role as UserRole;
    const password = typeof body.password === 'string' ? body.password.trim() : '';

    if (!username || !fullName || !role || !password) {
      res.status(400).json({ error: 'Username, fullName, role, and password are required.' });
      return;
    }
    if (!ALL_USER_ROLES.includes(role)) {
      res.status(400).json({ error: `Door aan la aqoon: ${role}` });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ error: 'Furaha sirta ah waa inuu ka koobnaadaa ugu yaraan 4 xaraf.' });
      return;
    }

    // Only Super Admin can create Super Admin accounts or assign custom per-user permissions
    if (role === 'Super Admin' && actor.role !== 'Super Admin') {
      recordUnauthorizedAccess(req, 'Accounts & RBAC', 'POST /api/users', `${actor.username} (${actor.role}) tried creating a Super Admin user.`);
      res.status(403).json({ error: 'Forbidden: Super Admin oo kaliya ayaa abuuri kara akoon Super Admin ah.' });
      return;
    }
    if (body.permissions !== undefined && actor.role !== 'Super Admin') {
      recordUnauthorizedAccess(req, 'Accounts & RBAC', 'POST /api/users', `${actor.username} (${actor.role}) tried assigning custom permissions.`);
      res.status(403).json({ error: 'Forbidden: Super Admin oo kaliya ayaa qoondayn kara rukhsado gaar ah.' });
      return;
    }

    const exists = db
      .prepare('SELECT 1 FROM user_accounts WHERE lower(username) = ?')
      .get(username.toLowerCase());
    if (exists) {
      res.status(409).json({ error: 'Username-kan horay ayaa loo diiwaangeliyay.' });
      return;
    }

    const linkedIds = Array.isArray(body.linkedStudentIds)
      ? body.linkedStudentIds.map(String).filter(Boolean)
      : body.linkedStudentId
      ? [String(body.linkedStudentId)]
      : null;

    const validStatus: UserAccount['status'] = ['Active', 'Deactivated', 'Suspended', 'Withdrawn'].includes(body.status)
      ? body.status
      : 'Active';

    const newId = `USR-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`;
    db.prepare(`
      INSERT INTO user_accounts (
        id, username, email, passwordHash, fullName, role, photoUrl,
        linkedTeacherId, linkedStaffId, linkedStudentId, linkedStudentIds,
        permissions, mustChangePassword, tokenVersion, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      newId,
      username,
      body.email?.trim() || `${username}@machadkakhadiija.edu.so`,
      hashPassword(password),
      fullName,
      role,
      body.photoUrl || null,
      body.linkedTeacherId || null,
      body.linkedStaffId || null,
      body.linkedStudentId || (linkedIds && linkedIds[0]) || null,
      linkedIds ? JSON.stringify(linkedIds) : null,
      Array.isArray(body.permissions) ? JSON.stringify(body.permissions) : null,
      role === 'Student' ? 1 : 0,
      validStatus
    );

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'CREATE',
      module: 'Accounts & RBAC',
      resource: `user:${newId}`,
      status: 'Success',
      details: `Waxaa la abuuray akoon cusub: ${username} (${role}).`,
      ipAddress: getClientIp(req),
    });

    const created = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(newId) as unknown as DbUserRow;
    res.status(201).json(sanitizeUser(created));
  }
);

const handleUpdateUserAccount = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const actor = req.authUser!;
  const existing = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(id) as unknown as DbUserRow | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Akoonka lama helin.' });
    return;
  }

  const body = req.body || {};
  const nextRole = (body.role || existing.role) as UserRole;
  if (!ALL_USER_ROLES.includes(nextRole)) {
    res.status(400).json({ error: `Door aan sax ahayn: ${nextRole}` });
    return;
  }

  // Enforce Super Admin exclusivity
  if ((existing.role === 'Super Admin' || nextRole === 'Super Admin') && actor.role !== 'Super Admin') {
    recordUnauthorizedAccess(
      req,
      'Accounts & RBAC',
      `user:${id}`,
      `${actor.username} (${actor.role}) tried modifying or promoting to Super Admin (${existing.username}).`
    );
    res.status(403).json({
      error: 'Forbidden: Super Admin oo kaliya ayaa wax ka beddeli kara ama magacaabi kara Super Admin.',
    });
    return;
  }

  if (body.permissions !== undefined && actor.role !== 'Super Admin') {
    recordUnauthorizedAccess(req, 'Accounts & RBAC', `user:${id}`, `${actor.username} (${actor.role}) tried changing permissions.`);
    res.status(403).json({ error: 'Forbidden: Super Admin oo kaliya ayaa wax ka beddeli kara rukhsadaha gaarka ah.' });
    return;
  }

  const nextUsername = typeof body.username === 'string' && body.username.trim() ? body.username.trim() : existing.username;
  if (nextUsername.toLowerCase() !== existing.username.toLowerCase()) {
    const dup = db
      .prepare('SELECT 1 FROM user_accounts WHERE lower(username) = ? AND id != ?')
      .get(nextUsername.toLowerCase(), id);
    if (dup) {
      res.status(409).json({ error: 'Username-kan horay ayaa loo isticmaalay.' });
      return;
    }
  }

  const passwordChanged = typeof body.password === 'string' && body.password.trim().length >= 4;
  const nextHash = passwordChanged ? hashPassword(body.password.trim()) : existing.passwordHash;
  const nextStatus: UserAccount['status'] =
    body.status && ['Active', 'Deactivated', 'Suspended', 'Withdrawn'].includes(body.status)
      ? body.status
      : existing.status;

  if (actor.id === id && nextStatus !== 'Active') {
    res.status(400).json({ error: 'Ma joojin kartid akoonka aad hadda ku jirto!' });
    return;
  }

  const nextLinkedIds =
    body.linkedStudentIds !== undefined
      ? Array.isArray(body.linkedStudentIds)
        ? JSON.stringify(body.linkedStudentIds)
        : null
      : existing.linkedStudentIds;

  const nextLinkedStudentId =
    body.linkedStudentId !== undefined
      ? body.linkedStudentId || null
      : Array.isArray(body.linkedStudentIds) && body.linkedStudentIds.length > 0
      ? String(body.linkedStudentIds[0])
      : existing.linkedStudentId;

  const nextPermissions =
    body.permissions !== undefined
      ? Array.isArray(body.permissions)
        ? JSON.stringify(body.permissions)
        : null
      : existing.permissions;

  const shouldBumpToken =
    passwordChanged || nextRole !== existing.role || nextStatus !== 'Active';
  const nextTokenVersion = (existing.tokenVersion || 1) + (shouldBumpToken ? 1 : 0);

  db.prepare(`
    UPDATE user_accounts SET
      username = ?,
      email = ?,
      passwordHash = ?,
      fullName = ?,
      role = ?,
      linkedTeacherId = ?,
      linkedStaffId = ?,
      linkedStudentId = ?,
      linkedStudentIds = ?,
      permissions = ?,
      tokenVersion = ?,
      status = ?,
      updatedAt = datetime('now')
    WHERE id = ?
  `).run(
    nextUsername,
    body.email?.trim() || existing.email,
    nextHash,
    body.fullName?.trim() || existing.fullName,
    nextRole,
    body.linkedTeacherId !== undefined ? body.linkedTeacherId || null : existing.linkedTeacherId,
    body.linkedStaffId !== undefined ? body.linkedStaffId || null : existing.linkedStaffId,
    nextLinkedStudentId,
    nextLinkedIds,
    nextPermissions,
    nextTokenVersion,
    nextStatus,
    id
  );

  insertAuditLog({
    username: actor.username,
    user: `${actor.fullName} (${actor.username})`,
    role: actor.role,
    action: 'UPDATE',
    module: 'Accounts & RBAC',
    resource: `user:${id}`,
    status: 'Success',
    details: `Waxaa la cusboonaysiiyay akoonka ${nextUsername} (${nextRole} · ${nextStatus}).`,
    ipAddress: getClientIp(req),
  });

  const updated = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(id) as unknown as DbUserRow;
  res.json(sanitizeUser(updated));
};

app.put('/api/users/:id', requireAuth, requireRoles(ACCOUNT_ADMIN_ROLES, 'Accounts & RBAC'), handleUpdateUserAccount);
app.patch('/api/users/:id', requireAuth, requireRoles(ACCOUNT_ADMIN_ROLES, 'Accounts & RBAC'), handleUpdateUserAccount);

app.patch(
  '/api/users/:id/status',
  requireAuth,
  requireRoles(ACCOUNT_ADMIN_ROLES, 'Accounts & RBAC'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const target = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(id) as unknown as DbUserRow | undefined;
    if (!target) {
      res.status(404).json({ error: 'Akoonka lama helin.' });
      return;
    }
    if (actor.id === id) {
      res.status(400).json({ error: 'Ma damin kartid ama ma hakin kartid akoonkaaga aad ku jirto.' });
      return;
    }
    if (target.role === 'Super Admin' && actor.role !== 'Super Admin') {
      recordUnauthorizedAccess(req, 'Accounts & RBAC', `user:${id}/status`, `${actor.username} tried changing Super Admin status.`);
      res.status(403).json({ error: 'Forbidden: Super Admin oo kaliya ayaa beddeli kara xaaladda Super Admin.' });
      return;
    }
    const nextStatus = req.body?.status;
    if (!['Active', 'Deactivated', 'Suspended'].includes(nextStatus)) {
      res.status(400).json({ error: 'Xaalad aan sax ahayn (Active, Deactivated, Suspended).' });
      return;
    }
    const nextTokenVersion = (target.tokenVersion || 1) + (nextStatus !== 'Active' ? 1 : 0);
    db.prepare(`
      UPDATE user_accounts
      SET status = ?, tokenVersion = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(nextStatus, nextTokenVersion, id);

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'UPDATE',
      module: 'Accounts & RBAC',
      resource: `user:${id}/status`,
      status: 'Success',
      details: `Xaaladda akoonka ${target.username} (${target.role}) waxaa laga dhigay: ${nextStatus}.`,
      ipAddress: getClientIp(req),
    });

    const updated = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(id) as unknown as DbUserRow;
    res.json(sanitizeUser(updated));
  }
);

app.post(
  '/api/users/:id/reset-password',
  requireAuth,
  requireRoles(ACCOUNT_ADMIN_ROLES, 'Accounts & RBAC'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const target = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(id) as unknown as DbUserRow | undefined;
    if (!target) {
      res.status(404).json({ error: 'Akoonka lama helin.' });
      return;
    }
    if (target.role === 'Super Admin' && actor.role !== 'Super Admin') {
      recordUnauthorizedAccess(req, 'Accounts & RBAC', `user:${id}/reset-password`, `${actor.username} tried resetting Super Admin password.`);
      res.status(403).json({ error: 'Forbidden: Super Admin oo kaliya ayaa dib u dejin kara furaha Super Admin.' });
      return;
    }
    const rawNewPass = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';
    if (rawNewPass.length < 4) {
      res.status(400).json({ error: 'Furaha cusub waa inuu ka koobnaadaa ugu yaraan 4 xaraf.' });
      return;
    }
    const forceChange = req.body?.mustChangePassword !== undefined ? (req.body.mustChangePassword ? 1 : 0) : target.role === 'Student' ? 1 : 0;
    const nextTokenVersion = (target.tokenVersion || 1) + 1;

    db.prepare(`
      UPDATE user_accounts
      SET passwordHash = ?, mustChangePassword = ?, tokenVersion = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(hashPassword(rawNewPass), forceChange, nextTokenVersion, id);

    insertAuditLog({
      studentId: target.linkedStudentId || undefined,
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'PASSWORD_RESET',
      module: 'Accounts & RBAC',
      resource: `user:${id}/reset-password`,
      status: 'Success',
      details: `${actor.username} ayaa dib u dejiyay furaha sirta ah ee akoonka ${target.username} (${target.role}).`,
      ipAddress: getClientIp(req),
    });

    const updated = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(id) as unknown as DbUserRow;
    res.json({ success: true, user: sanitizeUser(updated) });
  }
);

app.delete(
  '/api/users/:id',
  requireAuth,
  requireRoles(ACCOUNT_ADMIN_ROLES, 'Accounts & RBAC'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    if (actor.id === id) {
      res.status(400).json({ error: 'Ma tirtiri kartid akoonka aad hadda ku jirto!' });
      return;
    }
    const target = db.prepare('SELECT * FROM user_accounts WHERE id = ?').get(id) as unknown as DbUserRow | undefined;
    if (!target) {
      res.status(404).json({ error: 'Akoonka lama helin.' });
      return;
    }
    if (target.role === 'Super Admin' && actor.role !== 'Super Admin') {
      recordUnauthorizedAccess(req, 'Accounts & RBAC', `DELETE user:${id}`, `${actor.username} tried deleting Super Admin ${target.username}.`);
      res.status(403).json({ error: 'Forbidden: Super Admin oo kaliya ayaa tirtiri kara akoon Super Admin ah.' });
      return;
    }
    db.prepare('DELETE FROM user_accounts WHERE id = ?').run(id);

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'DELETE',
      module: 'Accounts & RBAC',
      resource: `user:${id}`,
      status: 'Success',
      details: `Waxaa la tirtiray akoonka: ${target.username} (${target.role}).`,
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true });
  }
);

app.get(
  '/api/rbac/permissions',
  requireAuth,
  requireRoles(['Super Admin', 'Administrator', 'Institute'], 'Accounts & RBAC'),
  (_req: AuthenticatedRequest, res: Response) => {
    res.json(getKv<RbacPermissionPolicy[]>('rbacPolicies', DEFAULT_RBAC_POLICIES));
  }
);

app.put(
  '/api/rbac/permissions',
  requireAuth,
  requireRoles(['Super Admin'], 'Accounts & RBAC'),
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const policies = Array.isArray(req.body?.policies) ? (req.body.policies as RbacPermissionPolicy[]) : null;
    if (!policies || policies.length === 0) {
      res.status(400).json({ error: 'Fadlan soo dir liis sax ah oo RBAC policies ah.' });
      return;
    }
    const superAdminDefault = DEFAULT_RBAC_POLICIES.find((p) => p.role === 'Super Admin')!;
    const sanitized: RbacPermissionPolicy[] = policies
      .filter((p) => ALL_USER_ROLES.includes(p.role))
      .map((p) =>
        p.role === 'Super Admin'
          ? {
              ...superAdminDefault,
              description: p.description || superAdminDefault.description,
            }
          : {
              role: p.role,
              modules: Array.isArray(p.modules) ? p.modules.map(String) : [],
              actions: Array.isArray(p.actions) ? (p.actions as RbacPermissionPolicy['actions']) : ['read'],
              description: typeof p.description === 'string' ? p.description : '',
            }
      );

    for (const defP of DEFAULT_RBAC_POLICIES) {
      if (!sanitized.some((p) => p.role === defP.role)) {
        sanitized.push(defP);
      }
    }

    setKv('rbacPolicies', sanitized);
    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'UPDATE',
      module: 'Accounts & RBAC',
      resource: 'rbac/permissions',
      status: 'Success',
      details: `Super Admin (${actor.username}) ayaa cusboonaysiiyay xeerarka rukhsadaha RBAC.`,
      ipAddress: getClientIp(req),
    });
    res.json(sanitized);
  }
);

app.get(
  '/api/auth/login-activity',
  requireAuth,
  requireRoles(ACCOUNT_ADMIN_ROLES, 'Authentication'),
  (req: AuthenticatedRequest, res: Response) => {
    const roleFilter = typeof req.query.role === 'string' ? req.query.role.trim() : '';
    const statusFilter = typeof req.query.status === 'string' ? req.query.status.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    let logs = db
      .prepare(
        `SELECT * FROM audit_logs
         WHERE action IN ('LOGIN', 'LOGIN_FAILED', 'LOGOUT', 'PASSWORD_CHANGE', 'PASSWORD_RESET')
         ORDER BY timestamp DESC, id DESC
         LIMIT 500`
      )
      .all() as unknown as AuditLog[];

    if (roleFilter && roleFilter !== 'all') {
      logs = logs.filter((l) => l.role === roleFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      logs = logs.filter((l) => (l.status || 'Success') === statusFilter);
    }
    if (search) {
      logs = logs.filter(
        (l) =>
          (l.username || '').toLowerCase().includes(search) ||
          l.user.toLowerCase().includes(search) ||
          l.details.toLowerCase().includes(search)
      );
    }
    res.json(logs);
  }
);

// ============================================================
// PERSISTENCE STATE ROUTES FOR STAFF MODULES & SUPPORT TICKETS
// ============================================================
const STATE_KEY_WRITE_ROLES: Record<string, UserRole[]> = {
  settings: ['Super Admin', 'Administrator'],
  classes: ['Super Admin', 'Administrator', 'Academic Manager'],
  subjects: ['Super Admin', 'Administrator', 'Academic Manager'],
  teachers: ['Super Admin', 'Administrator', 'HR Manager', 'Academic Manager'],
  attendance: ['Super Admin', 'Administrator', 'Academic Manager', 'Receptionist', 'Teacher'],
  exams: ['Super Admin', 'Administrator', 'Academic Manager'],
  marks: ['Super Admin', 'Administrator', 'Academic Manager', 'Teacher'],
  feeStructures: ['Super Admin', 'Administrator', 'Accountant'],
  invoices: ['Super Admin', 'Administrator', 'Accountant', 'Receptionist'],
  payments: ['Super Admin', 'Administrator', 'Accountant', 'Receptionist'],
  incomes: ['Super Admin', 'Administrator', 'Accountant'],
  expenses: ['Super Admin', 'Administrator', 'Accountant'],
  staff: ['Super Admin', 'Administrator', 'HR Manager'],
  leaveRequests: ['Super Admin', 'Administrator', 'HR Manager'],
  payroll: ['Super Admin', 'Administrator', 'Accountant', 'HR Manager'],
  timetable: ['Super Admin', 'Administrator', 'Academic Manager'],
  announcements: ['Super Admin', 'Administrator', 'Academic Manager', 'Accountant', 'HR Manager', 'Receptionist'],
  tickets: ['Super Admin', 'Administrator', 'Academic Manager', 'Accountant', 'HR Manager', 'Receptionist'],
};

app.post('/api/leave-requests', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.authUser!;
  if (['Student', 'Parent', 'Institute'].includes(actor.role)) {
    recordUnauthorizedAccess(req, 'HR & Payroll', 'POST /api/leave-requests', `${actor.username} (${actor.role}) tried requesting leave.`);
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const body = req.body || {};
  const leaveRequests = getKv<StaffLeaveRequest[]>('leaveRequests', []);
  const personId = actor.linkedTeacherId || actor.linkedStaffId || actor.id;
  const staffName = typeof body.staffName === 'string' && body.staffName.trim() ? body.staffName.trim() : actor.fullName;
  const newReq: StaffLeaveRequest = {
    id: `LVR-${Date.now().toString().slice(-6)}`,
    staffId: personId,
    staffName,
    startDate: String(body.startDate || new Date().toISOString().substring(0, 10)),
    endDate: String(body.endDate || new Date().toISOString().substring(0, 10)),
    daysCount: Number(body.daysCount ?? body.days) || 1,
    reason: String(body.reason || ''),
    status: 'Pending',
    requestDate: new Date().toISOString().substring(0, 10),
  };
  setKv('leaveRequests', [newReq, ...leaveRequests]);
  insertAuditLog({
    username: actor.username,
    user: `${actor.fullName} (${actor.username})`,
    role: actor.role,
    action: 'CREATE',
    module: 'HR & Payroll',
    resource: `leave:${newReq.id}`,
    status: 'Success',
    details: `${staffName} (${actor.role}) ayaa codsaday fasax (${newReq.daysCount} maalmood).`,
    ipAddress: getClientIp(req),
  });
  res.status(201).json(newReq);
});

app.put(
  '/api/state/:key',
  requireAuth,
  rejectStudentMutations('System Data'),
  (req: AuthenticatedRequest, res: Response) => {
    const { key } = req.params;
    const actor = req.authUser!;

    const allowedWriteRoles = STATE_KEY_WRITE_ROLES[key];
    if (!allowedWriteRoles) {
      res.status(400).json({ error: 'Invalid state key.' });
      return;
    }

    if (!allowedWriteRoles.includes(actor.role)) {
      recordUnauthorizedAccess(
        req,
        'System State',
        `/api/state/${key}`,
        `${actor.username} (${actor.role}) attempted unauthorized state update on ${key}.`
      );
      res.status(403).json({
        error: `Forbidden: Doorkaagu (${actor.role}) ma laha oggolaansho uu wax kaga beddelo "${key}".`,
      });
      return;
    }

    setKv(key, req.body?.data);
    if (key === 'teachers' && Array.isArray(req.body?.data)) {
      syncTeacherUserAccounts(req.body.data as Teacher[]);
    }

    if (req.body?.auditAction && req.body?.auditModule && req.body?.auditDetails) {
      insertAuditLog({
        username: actor.username,
        user: `${actor.fullName} (${actor.username})`,
        role: actor.role,
        action: req.body.auditAction,
        module: req.body.auditModule,
        resource: `state:${key}`,
        status: 'Success',
        details: req.body.auditDetails,
        ipAddress: getClientIp(req),
      });
    }
    res.json({ ok: true });
  }
);

// Student/Parent permitted endpoint to submit or reply to Support Tickets only
app.post('/api/tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.authUser!;
  const body = req.body || {};
  const tickets = getKv<SupportTicket[]>('tickets', []);
  const ticketNum = `TKT-2026-${Math.floor(100 + Math.random() * 900)}`;
  const now = new Date().toISOString().substring(0, 16).replace('T', ' ');
  const newTicket: SupportTicket = {
    id: `TKT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ticketNumber: ticketNum,
    requesterName: actor.fullName,
    requesterEmail: actor.email,
    subject: String(body.subject || 'Codsi Caawinaad'),
    category: body.category || 'General',
    priority: body.priority || 'Medium',
    status: 'Open',
    createdAt: now,
    messages: [
      {
        id: `MSG-${Date.now()}`,
        sender: actor.fullName,
        role: actor.role,
        text: String(body.initialMessage || ''),
        timestamp: now,
      },
    ],
  };
  setKv('tickets', [newTicket, ...tickets]);
  insertAuditLog({
    studentId: actor.linkedStudentId,
    username: actor.username,
    user: `${actor.fullName} (${actor.username})`,
    role: actor.role,
    action: 'CREATE',
    module: 'Support Desk',
    resource: `ticket:${newTicket.id}`,
    status: 'Success',
    details: `${actor.fullName} ayaa furay tikidh cusub: ${ticketNum}.`,
    ipAddress: getClientIp(req),
  });
  res.status(201).json(newTicket);
});

app.post('/api/tickets/:id/reply', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.authUser!;
  const { id } = req.params;
  const tickets = getKv<SupportTicket[]>('tickets', []);
  const target = tickets.find((t) => t.id === id);
  if (!target) {
    res.status(404).json({ error: 'Ticket not found.' });
    return;
  }
  if (
    (actor.role === 'Student' || actor.role === 'Parent') &&
    target.requesterEmail.toLowerCase() !== actor.email.toLowerCase() &&
    target.requesterName.toLowerCase() !== actor.fullName.toLowerCase()
  ) {
    recordUnauthorizedAccess(req, 'Support Desk', `ticket:${id}`, `Unauthorized ticket reply attempt by ${actor.username}.`);
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const now = new Date().toISOString().substring(0, 16).replace('T', ' ');
  const updated = tickets.map((t) =>
    t.id === id
      ? {
          ...t,
          messages: [
            ...t.messages,
            {
              id: `MSG-${Date.now()}`,
              sender: actor.fullName,
              role: actor.role,
              text: String(req.body?.message || ''),
              timestamp: now,
            },
          ],
        }
      : t
  );
  setKv('tickets', updated);
  res.json({ ok: true });
});

// Live ticket list (polled by the frontend). Students/Parents only see their own tickets.
app.get('/api/tickets', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.authUser!;
  const tickets = getKv<SupportTicket[]>('tickets', []);
  if (actor.role === 'Student' || actor.role === 'Parent') {
    res.json(
      tickets.filter(
        (t) =>
          t.requesterEmail.toLowerCase() === actor.email.toLowerCase() ||
          t.requesterName.toLowerCase() === actor.fullName.toLowerCase()
      )
    );
    return;
  }
  res.json(tickets);
});

// Change the status of ONE ticket (staff only) without overwriting the rest of the list.
const TICKET_MANAGER_ROLES: UserRole[] = [
  'Super Admin',
  'Administrator',
  'Academic Manager',
  'Accountant',
  'HR Manager',
];
app.patch(
  '/api/tickets/:id/status',
  requireAuth,
  requireRoles(TICKET_MANAGER_ROLES, 'Support Desk'),
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const { id } = req.params;
    const status = req.body?.status;
    if (!['Open', 'In Progress', 'Resolved'].includes(status)) {
      res.status(400).json({ error: 'Invalid status.' });
      return;
    }
    const tickets = getKv<SupportTicket[]>('tickets', []);
    if (!tickets.some((t) => t.id === id)) {
      res.status(404).json({ error: 'Ticket not found.' });
      return;
    }
    setKv(
      'tickets',
      tickets.map((t) => (t.id === id ? { ...t, status } : t))
    );
    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'UPDATE',
      module: 'Support Desk',
      resource: `ticket:${id}`,
      status: 'Success',
      details: `Xaaladda tikidhka ${id} -> ${status}`,
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true });
  }
);

app.post(
  '/api/admin/reset-seed',
  requireAuth,
  requireRoles(ACCOUNT_ADMIN_ROLES, 'Settings'),
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    resetAllToSeed();
    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'UPDATE',
      module: 'Settings',
      resource: 'admin/reset-seed',
      status: 'Success',
      details: `Xogtii asalka ahayd waxaa dib u soo celiyay ${actor.username}.`,
      ipAddress: getClientIp(req),
    });
    res.json({ ok: true });
  }
);

// ============================================================
// MODULE 1: ROLE-SCOPED GLOBAL SEARCH SYSTEM (/api/search)
// ============================================================
const ALL_SEARCH_CATEGORIES: Exclude<SearchCategory, 'all'>[] = [
  'students',
  'teachers',
  'staff',
  'classes',
  'subjects',
  'exams',
  'invoices',
];

function getAllowedSearchCategories(role: UserRole): Exclude<SearchCategory, 'all'>[] {
  switch (role) {
    case 'Super Admin':
    case 'Administrator':
      return ['students', 'teachers', 'staff', 'classes', 'subjects', 'exams', 'invoices'];
    case 'Academic Manager':
      return ['students', 'teachers', 'classes', 'subjects', 'exams'];
    case 'Accountant':
      return ['students', 'staff', 'invoices'];
    case 'HR Manager':
      return ['teachers', 'staff'];
    case 'Receptionist':
      return ['students', 'classes', 'invoices'];
    case 'Teacher':
      return ['students', 'classes', 'subjects', 'exams'];
    case 'Institute':
      return ['students', 'teachers', 'classes', 'subjects', 'exams'];
    default:
      return [];
  }
}

app.get('/api/search', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const actor = req.authUser!;
  if (actor.role === 'Student' || actor.role === 'Parent') {
    recordUnauthorizedAccess(
      req,
      'Global Search',
      req.originalUrl,
      `${actor.role} (${actor.username}) ayaa isku dayay inuu galo Global Search maamulka.`
    );
    res.status(403).json({
      error: 'Forbidden: Ardayda iyo waalidiintu ma geli karaan raadinta guud ee maamulka.',
    });
    return;
  }

  const allowedCategories = getAllowedSearchCategories(actor.role);
  const requestedCategory =
    typeof req.query.category === 'string' && req.query.category.trim()
      ? (req.query.category.trim() as SearchCategory)
      : 'all';

  if (
    requestedCategory !== 'all' &&
    (!ALL_SEARCH_CATEGORIES.includes(requestedCategory as Exclude<SearchCategory, 'all'>) ||
      !allowedCategories.includes(requestedCategory as Exclude<SearchCategory, 'all'>))
  ) {
    recordUnauthorizedAccess(
      req,
      'Global Search',
      req.originalUrl,
      `${actor.username} (${actor.role}) ayaa isku dayay raadin aan u bannaanayn: ${requestedCategory}.`
    );
    res.status(403).json({
      error: `Forbidden: Doorkaaga (${actor.role}) ma baari karo qaybta "${requestedCategory}".`,
    });
    return;
  }

  const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const q = rawQuery.toLowerCase();
  const classFilter = typeof req.query.classId === 'string' ? req.query.classId.trim() : 'all';
  const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
  const offset = (page - 1) * limit;

  const classes = getKv<SchoolClass[]>('classes', []);
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const subjects = getKv<Subject[]>('subjects', []);
  const teachers = getKv<Teacher[]>('teachers', []);
  const staff = getKv<StaffMember[]>('staff', []);
  const exams = getKv<Examination[]>('exams', []);
  const invoices = getKv<StudentInvoice[]>('invoices', []);
  const timetable = getKv<TimetableSlot[]>('timetable', []);

  // Determine classes assigned to Teacher (if Teacher role)
  const teacherAssignedClassIds = new Set<string>();
  const teacherAssignedSubjectIds = new Set<string>();
  if (actor.role === 'Teacher' && actor.linkedTeacherId) {
    classes.forEach((c) => {
      if (c.classTeacherId === actor.linkedTeacherId) teacherAssignedClassIds.add(c.id);
    });
    subjects.forEach((s) => {
      if (s.teacherId === actor.linkedTeacherId) {
        teacherAssignedSubjectIds.add(s.id);
        if (s.classId) teacherAssignedClassIds.add(s.classId);
      }
    });
    timetable.forEach((t) => {
      if (t.teacherId === actor.linkedTeacherId) {
        teacherAssignedClassIds.add(t.classId);
        teacherAssignedSubjectIds.add(t.subjectId);
      }
    });
  }

  const studentRows = db
    .prepare('SELECT * FROM students WHERE isDeleted = 0 ORDER BY fullName ASC')
    .all() as unknown as DbStudentRow[];
  const studentMap = new Map(studentRows.map((s) => [s.id, s]));

  const matchesText = (val: string | undefined | null) =>
    !q || (val || '').toLowerCase().includes(q);
  const isExactId = (val: string | undefined | null) =>
    Boolean(q) && (val || '').toLowerCase() === q;

  // 1. Students
  let matchedStudents: GlobalSearchStudentHit[] = [];
  if (allowedCategories.includes('students')) {
    matchedStudents = studentRows
      .filter((s) => {
        if (actor.role === 'Teacher' && teacherAssignedClassIds.size > 0 && !teacherAssignedClassIds.has(s.classId)) {
          return false;
        }
        if (classFilter !== 'all' && s.classId !== classFilter) return false;
        if (!q) return true;
        const baseMatch =
          matchesText(s.fullName) ||
          matchesText(s.arabicName) ||
          matchesText(s.id) ||
          matchesText(s.rollNumber);
        if (actor.role === 'Teacher') return baseMatch;
        return baseMatch || matchesText(s.guardianName) || matchesText(s.guardianPhone);
      })
      .sort((a, b) => {
        const aExact = isExactId(a.id) || isExactId(a.rollNumber) ? 0 : 1;
        const bExact = isExactId(b.id) || isExactId(b.rollNumber) ? 0 : 1;
        return aExact - bExact;
      })
      .map((s) => {
        const cls = classMap.get(s.classId);
        return {
          id: s.id,
          rollNumber: s.rollNumber,
          fullName: s.fullName,
          arabicName: s.arabicName,
          classId: s.classId,
          className: cls?.name || s.classId,
          section: s.section,
          shift: s.shift || cls?.shift || 'Subax',
          status: s.status,
          photoUrl: s.photoUrl,
          ...(actor.role !== 'Teacher'
            ? { guardianName: s.guardianName, guardianPhone: s.guardianPhone }
            : {}),
        };
      });
  }

  // 2. Teachers (no salary exposure)
  let matchedTeachers: { id: string; fullName: string; arabicName: string; specialization: string; phone?: string }[] = [];
  if (allowedCategories.includes('teachers')) {
    matchedTeachers = teachers
      .filter(
        (t) =>
          matchesText(t.id) ||
          matchesText(t.fullName) ||
          matchesText(t.arabicName) ||
          matchesText(t.specialization) ||
          matchesText(t.phone)
      )
      .map((t) => ({
        id: t.id,
        fullName: t.fullName,
        arabicName: t.arabicName,
        specialization: t.specialization,
        phone: t.phone,
      }));
  }

  // 3. Staff (excluded for Teachers)
  let matchedStaff: { id: string; fullName: string; roleTitle: string; department: string; phone?: string }[] = [];
  if (allowedCategories.includes('staff')) {
    matchedStaff = staff
      .filter(
        (stf) =>
          matchesText(stf.id) ||
          matchesText(stf.fullName) ||
          matchesText(stf.roleTitle) ||
          matchesText(stf.department) ||
          matchesText(stf.phone)
      )
      .map((stf) => ({
        id: stf.id,
        fullName: stf.fullName,
        roleTitle: stf.roleTitle,
        department: stf.department,
        phone: stf.phone,
      }));
  }

  // 4. Classes
  let matchedClasses: { id: string; name: string; section: string; shift: string; roomNumber: string }[] = [];
  if (allowedCategories.includes('classes')) {
    matchedClasses = classes
      .filter((c) => {
        if (actor.role === 'Teacher' && teacherAssignedClassIds.size > 0 && !teacherAssignedClassIds.has(c.id)) {
          return false;
        }
        if (classFilter !== 'all' && c.id !== classFilter) return false;
        return (
          matchesText(c.id) ||
          matchesText(c.name) ||
          matchesText(c.section) ||
          matchesText(c.shift) ||
          matchesText(c.roomNumber)
        );
      })
      .map((c) => ({
        id: c.id,
        name: c.name,
        section: c.section,
        shift: c.shift || 'Subax',
        roomNumber: c.roomNumber,
      }));
  }

  // 5. Subjects
  let matchedSubjects: { id: string; code: string; nameSomali: string; nameArabic: string; classId: string }[] = [];
  if (allowedCategories.includes('subjects')) {
    matchedSubjects = subjects
      .filter((sub) => {
        if (
          actor.role === 'Teacher' &&
          teacherAssignedSubjectIds.size > 0 &&
          !teacherAssignedSubjectIds.has(sub.id)
        ) {
          return false;
        }
        if (classFilter !== 'all' && sub.classId && sub.classId !== classFilter) return false;
        return (
          matchesText(sub.id) ||
          matchesText(sub.code) ||
          matchesText(sub.nameSomali) ||
          matchesText(sub.nameArabic)
        );
      })
      .map((sub) => ({
        id: sub.id,
        code: sub.code,
        nameSomali: sub.nameSomali,
        nameArabic: sub.nameArabic,
        classId: sub.classId,
      }));
  }

  // 6. Examinations
  let matchedExams: { id: string; title: string; term: string; academicYear: string; status: string; startDate: string }[] = [];
  if (allowedCategories.includes('exams')) {
    matchedExams = exams
      .filter(
        (ex) =>
          matchesText(ex.id) ||
          matchesText(ex.title) ||
          matchesText(ex.term) ||
          matchesText(ex.academicYear) ||
          matchesText(ex.status)
      )
      .map((ex) => ({
        id: ex.id,
        title: ex.title,
        term: ex.term,
        academicYear: ex.academicYear,
        status: ex.status,
        startDate: ex.startDate,
      }));
  }

  // 7. Invoices (excluded for Teachers)
  let matchedInvoices: {
    id: string;
    studentId: string;
    studentName: string;
    title: string;
    amount: number;
    balance: number;
    status: string;
    month: string;
  }[] = [];
  if (allowedCategories.includes('invoices')) {
    matchedInvoices = invoices
      .filter((inv) => {
        const stu = studentMap.get(inv.studentId);
        if (classFilter !== 'all' && stu?.classId !== classFilter) return false;
        return (
          matchesText(inv.id) ||
          matchesText(inv.studentId) ||
          matchesText(inv.title) ||
          matchesText(inv.month) ||
          matchesText(stu?.fullName)
        );
      })
      .map((inv) => ({
        id: inv.id,
        studentId: inv.studentId,
        studentName: studentMap.get(inv.studentId)?.fullName || inv.studentId,
        title: inv.title,
        amount: inv.amount,
        balance: inv.balance,
        status: inv.status,
        month: inv.month,
      }));
  }

  const counts: Record<Exclude<SearchCategory, 'all'>, number> = {
    students: matchedStudents.length,
    teachers: matchedTeachers.length,
    staff: matchedStaff.length,
    classes: matchedClasses.length,
    subjects: matchedSubjects.length,
    exams: matchedExams.length,
    invoices: matchedInvoices.length,
  };

  // Apply category filter & pagination
  const sliceFor = <T,>(cat: Exclude<SearchCategory, 'all'>, list: T[]): T[] => {
    if (requestedCategory !== 'all' && requestedCategory !== cat) return [];
    if (requestedCategory === cat) {
      return list.slice(offset, offset + limit);
    }
    // For 'all', paginate proportionally or slice each category cleanly by limit
    const perGroupLimit = Math.max(3, Math.ceil(limit / 2));
    return list.slice(offset, offset + perGroupLimit);
  };

  const pagedStudents = sliceFor('students', matchedStudents);
  const pagedTeachers = sliceFor('teachers', matchedTeachers);
  const pagedStaff = sliceFor('staff', matchedStaff);
  const pagedClasses = sliceFor('classes', matchedClasses);
  const pagedSubjects = sliceFor('subjects', matchedSubjects);
  const pagedExams = sliceFor('exams', matchedExams);
  const pagedInvoices = sliceFor('invoices', matchedInvoices);

  const totalMatches =
    requestedCategory === 'all'
      ? Object.values(counts).reduce((a, b) => a + b, 0)
      : counts[requestedCategory as Exclude<SearchCategory, 'all'>];

  const hasMore =
    requestedCategory === 'all'
      ? [
          matchedStudents.length,
          matchedTeachers.length,
          matchedStaff.length,
          matchedClasses.length,
          matchedSubjects.length,
          matchedExams.length,
          matchedInvoices.length,
        ].some((len) => len > offset + Math.max(3, Math.ceil(limit / 2)))
      : totalMatches > offset + limit;

  res.json({
    query: rawQuery,
    total: totalMatches,
    page,
    limit,
    hasMore,
    allowedCategories,
    counts,
    groups: {
      students: pagedStudents,
      teachers: pagedTeachers,
      staff: pagedStaff,
      classes: pagedClasses,
      subjects: pagedSubjects,
      exams: pagedExams,
      invoices: pagedInvoices,
    },
  });
});

// ============================================================
// MODULE 2: STAFF ATTENDANCE ENDPOINTS (STRICTLY FORBIDDEN FOR TEACHERS)
// ============================================================
const handleGetStaffAttendance = (req: AuthenticatedRequest, res: Response) => {
  const dateFilter = typeof req.query.date === 'string' ? req.query.date.trim() : '';
  const staffIdFilter = typeof req.query.staffId === 'string' ? req.query.staffId.trim() : '';

  let rows = db
    .prepare('SELECT * FROM staff_attendance ORDER BY date DESC, personName ASC')
    .all() as unknown as StaffAttendanceRecord[];

  if (dateFilter) {
    rows = rows.filter((r) => r.date === dateFilter);
  }
  if (staffIdFilter) {
    rows = rows.filter((r) => r.staffId === staffIdFilter);
  }
  res.json(rows);
};

app.get(
  '/api/staff-attendance',
  requireAuth,
  requireRoles(STAFF_ATTENDANCE_ROLES, 'Staff Attendance'),
  handleGetStaffAttendance
);

app.get(
  '/api/staff-attendance/reports',
  requireAuth,
  requireRoles(STAFF_ATTENDANCE_ROLES, 'Staff Attendance'),
  (req: AuthenticatedRequest, res: Response) => {
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom.trim() : '';
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo.trim() : '';

    let rows = db
      .prepare('SELECT * FROM staff_attendance ORDER BY date DESC, personName ASC')
      .all() as unknown as StaffAttendanceRecord[];

    if (dateFrom) rows = rows.filter((r) => r.date >= dateFrom);
    if (dateTo) rows = rows.filter((r) => r.date <= dateTo);

    const summary = {
      total: rows.length,
      present: rows.filter((r) => r.status === 'Present').length,
      absent: rows.filter((r) => r.status === 'Absent').length,
      late: rows.filter((r) => r.status === 'Late').length,
      excused: rows.filter((r) => r.status === 'Excused').length,
    };
    res.json({ summary, records: rows });
  }
);

app.post(
  '/api/staff-attendance',
  requireAuth,
  requireRoles(STAFF_ATTENDANCE_ROLES, 'Staff Attendance'),
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const body = req.body || {};
    const items: any[] = Array.isArray(body.records) ? body.records : [body];

    const staffList = getKv<StaffMember[]>('staff', []);
    const teacherList = getKv<Teacher[]>('teachers', []);

    const upsertStmt = db.prepare(`
      INSERT INTO staff_attendance (
        id, date, staffId, personName, department, roleTitle, status, checkInTime, checkOutTime, remarks, recordedBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        checkInTime = excluded.checkInTime,
        checkOutTime = excluded.checkOutTime,
        remarks = excluded.remarks,
        recordedBy = excluded.recordedBy,
        updatedAt = datetime('now')
    `);

    const saved: StaffAttendanceRecord[] = [];
    for (const item of items) {
      if (!item.staffId || !item.date) continue;
      const stf = staffList.find((s) => s.id === item.staffId);
      const tch = teacherList.find((t) => t.id === item.staffId);
      const id = item.id || `SATT-${item.date}-${item.staffId}`;
      const personName = item.personName || stf?.fullName || tch?.fullName || item.staffId;
      const department = item.department || stf?.department || (tch ? 'Teaching' : 'Administration');
      const roleTitle = item.roleTitle || stf?.roleTitle || (tch ? 'Macallin' : 'Shaqaale');
      const status = ['Present', 'Absent', 'Late', 'Excused'].includes(item.status) ? item.status : 'Present';
      const checkInTime = typeof item.checkInTime === 'string' ? item.checkInTime : '07:15';
      const checkOutTime = typeof item.checkOutTime === 'string' ? item.checkOutTime : '13:30';
      const remarks = typeof item.remarks === 'string' ? item.remarks : '';

      upsertStmt.run(
        id,
        item.date,
        item.staffId,
        personName,
        department,
        roleTitle,
        status,
        checkInTime,
        checkOutTime,
        remarks,
        actor.username
      );
      const row = db.prepare('SELECT * FROM staff_attendance WHERE id = ?').get(id) as unknown as StaffAttendanceRecord;
      if (row) saved.push(row);
    }

    if (saved.length === 0) {
      res.status(400).json({ error: 'Fadlan soo dir xog sax ah (date iyo staffId).' });
      return;
    }

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'CREATE',
      module: 'Staff Attendance',
      resource: `staff_attendance:${saved[0].date}`,
      status: 'Success',
      details: `${actor.fullName} ayaa diiwaangeliyay xaadirinta ${saved.length} shaqaale/macallin (${saved[0].date}).`,
      ipAddress: getClientIp(req),
    });

    res.status(201).json(Array.isArray(body.records) ? saved : saved[0]);
  }
);

const handleUpdateStaffAttendance = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const actor = req.authUser!;
  const existing = db
    .prepare('SELECT * FROM staff_attendance WHERE id = ?')
    .get(id) as unknown as StaffAttendanceRecord | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Diiwaanka xaadirinta shaqaalaha lama helin.' });
    return;
  }
  const updates = req.body || {};
  const nextStatus = ['Present', 'Absent', 'Late', 'Excused'].includes(updates.status)
    ? updates.status
    : existing.status;

  db.prepare(`
    UPDATE staff_attendance
    SET status = ?, checkInTime = ?, checkOutTime = ?, remarks = ?, recordedBy = ?, updatedAt = datetime('now')
    WHERE id = ?
  `).run(
    nextStatus,
    updates.checkInTime ?? existing.checkInTime ?? '',
    updates.checkOutTime ?? existing.checkOutTime ?? '',
    updates.remarks ?? existing.remarks ?? '',
    actor.username,
    id
  );

  insertAuditLog({
    username: actor.username,
    user: `${actor.fullName} (${actor.username})`,
    role: actor.role,
    action: 'UPDATE',
    module: 'Staff Attendance',
    resource: `staff_attendance:${id}`,
    status: 'Success',
    details: `Waxaa la cusboonaysiiyay xaadirinta ${existing.personName || existing.staffId} (${existing.date}) -> ${nextStatus}.`,
    ipAddress: getClientIp(req),
  });

  const updated = db.prepare('SELECT * FROM staff_attendance WHERE id = ?').get(id) as unknown as StaffAttendanceRecord;
  res.json(updated);
};

app.put(
  '/api/staff-attendance/:id',
  requireAuth,
  requireRoles(STAFF_ATTENDANCE_ROLES, 'Staff Attendance'),
  handleUpdateStaffAttendance
);
app.patch(
  '/api/staff-attendance/:id',
  requireAuth,
  requireRoles(STAFF_ATTENDANCE_ROLES, 'Staff Attendance'),
  handleUpdateStaffAttendance
);

app.delete(
  '/api/staff-attendance/:id',
  requireAuth,
  requireRoles(STAFF_ATTENDANCE_ROLES, 'Staff Attendance'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const existing = db
      .prepare('SELECT * FROM staff_attendance WHERE id = ?')
      .get(id) as unknown as StaffAttendanceRecord | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Diiwaanka lama helin.' });
      return;
    }
    db.prepare('DELETE FROM staff_attendance WHERE id = ?').run(id);

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'DELETE',
      module: 'Staff Attendance',
      resource: `staff_attendance:${id}`,
      status: 'Success',
      details: `Waxaa la tirtiray diiwaanka xaadirinta ${existing.personName || existing.staffId} (${existing.date}).`,
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true, id });
  }
);

// ============================================================
// MODULE 3: EXAMINATION ID CARD GENERATOR & CRUD (/api/exam-cards*)
// ============================================================
app.get(
  '/api/exam-cards/batches',
  requireAuth,
  requireRoles(EXAM_CARD_ROLES, 'Examination Cards'),
  (req: AuthenticatedRequest, res: Response) => {
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
    const classId = typeof req.query.classId === 'string' ? req.query.classId.trim() : '';
    const examTitle = typeof req.query.examTitle === 'string' ? req.query.examTitle.trim().toLowerCase() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    let batches = db
      .prepare('SELECT * FROM exam_card_batches WHERE isDeleted = 0 ORDER BY createdAt DESC, id DESC')
      .all() as unknown as ExamCardBatch[];

    if (academicYear && academicYear !== 'all') {
      batches = batches.filter((b) => b.academicYear === academicYear);
    }
    if (classId && classId !== 'all') {
      batches = batches.filter((b) => b.classId === classId);
    }
    if (examTitle) {
      batches = batches.filter((b) => b.examTitle.toLowerCase().includes(examTitle));
    }
    if (search) {
      batches = batches.filter(
        (b) =>
          b.id.toLowerCase().includes(search) ||
          b.examTitle.toLowerCase().includes(search) ||
          b.className.toLowerCase().includes(search) ||
          b.academicYear.toLowerCase().includes(search) ||
          b.createdBy.toLowerCase().includes(search)
      );
    }

    res.json(batches);
  }
);

app.get(
  '/api/exam-cards',
  requireAuth,
  requireRoles(EXAM_CARD_ROLES, 'Examination Cards'),
  (req: AuthenticatedRequest, res: Response) => {
    const batchId = typeof req.query.batchId === 'string' ? req.query.batchId.trim() : '';
    const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
    const classId = typeof req.query.classId === 'string' ? req.query.classId.trim() : '';
    const examTitle = typeof req.query.examTitle === 'string' ? req.query.examTitle.trim().toLowerCase() : '';
    const studentId = typeof req.query.studentId === 'string' ? req.query.studentId.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    let cards = db
      .prepare('SELECT * FROM exam_cards WHERE isDeleted = 0 ORDER BY batchId DESC, rollNumber ASC, studentName ASC')
      .all()
      .map((r: any) => ({ ...r, isDeleted: Boolean(r.isDeleted) })) as ExamCard[];

    if (batchId && batchId !== 'all') {
      cards = cards.filter((c) => c.batchId === batchId);
    }
    if (academicYear && academicYear !== 'all') {
      cards = cards.filter((c) => c.academicYear === academicYear);
    }
    if (classId && classId !== 'all') {
      cards = cards.filter((c) => c.classId === classId);
    }
    if (examTitle) {
      cards = cards.filter((c) => c.examTitle.toLowerCase().includes(examTitle));
    }
    if (studentId) {
      cards = cards.filter((c) => c.studentId === studentId);
    }
    if (search) {
      cards = cards.filter(
        (c) =>
          c.id.toLowerCase().includes(search) ||
          c.studentId.toLowerCase().includes(search) ||
          c.studentName.toLowerCase().includes(search) ||
          c.rollNumber.toLowerCase().includes(search) ||
          c.className.toLowerCase().includes(search) ||
          c.examTitle.toLowerCase().includes(search)
      );
    }

    res.json(cards);
  }
);

app.post(
  '/api/exam-cards/generate',
  requireAuth,
  requireRoles(EXAM_CARD_ROLES, 'Examination Cards'),
  (req: AuthenticatedRequest, res: Response) => {
    const actor = req.authUser!;
    const body = req.body || {};

    const classId = typeof body.classId === 'string' ? body.classId.trim() : '';
    const sectionFilter = typeof body.section === 'string' ? body.section.trim() : '';
    const academicYear = typeof body.academicYear === 'string' ? body.academicYear.trim() : '2026–2027';
    const examId = typeof body.examId === 'string' ? body.examId.trim() : undefined;
    const examTitle = typeof body.examTitle === 'string' ? body.examTitle.trim() : '';
    const examDate = typeof body.examDate === 'string' ? body.examDate.trim() : new Date().toISOString().substring(0, 10);
    const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';
    const cardsPerPage: 5 | 8 = Number(body.cardsPerPage) === 5 ? 5 : 8;
    const selectedStudentIds: string[] | null = Array.isArray(body.studentIds) && body.studentIds.length > 0
      ? body.studentIds.map(String)
      : null;
    const includeInactive = Boolean(body.includeInactive);
    const regenerate = Boolean(body.regenerate);

    if (!classId || !examTitle || !academicYear) {
      res.status(400).json({ error: 'Fadlan dooro Fasalka, Imtixaanka, iyo Sanad Dugsiyeedka.' });
      return;
    }

    const classes = getKv<SchoolClass[]>('classes', []);
    const targetClass = classes.find((c) => c.id === classId);
    if (!targetClass) {
      res.status(404).json({ error: 'Fasalka la doortay lama helin.' });
      return;
    }

    let candidateStudents = db
      .prepare('SELECT * FROM students WHERE isDeleted = 0 AND classId = ? ORDER BY CAST(rollNumber AS INTEGER) ASC, fullName ASC')
      .all(classId) as unknown as DbStudentRow[];

    if (sectionFilter && sectionFilter !== 'all') {
      candidateStudents = candidateStudents.filter((s) => s.section === sectionFilter);
    }

    if (selectedStudentIds) {
      const idSet = new Set(selectedStudentIds);
      candidateStudents = candidateStudents.filter((s) => idSet.has(s.id));
    }

    let skippedInactiveCount = 0;
    const eligibleStudents = candidateStudents.filter((s) => {
      if (s.status === 'Active') return true;
      if (includeInactive || (selectedStudentIds && selectedStudentIds.includes(s.id))) {
        return true;
      }
      skippedInactiveCount++;
      return false;
    });

    if (eligibleStudents.length === 0) {
      res.status(400).json({
        error: 'Ma jiraan arday firfircoon oo ku jira fasalkan oo kaarar loo samayn karo.',
        skippedInactiveCount,
      });
      return;
    }

    // Check existing non-deleted cards for same (studentId, classId, academicYear, examTitle)
    const existingCards = db
      .prepare(
        `SELECT * FROM exam_cards
         WHERE isDeleted = 0 AND classId = ? AND academicYear = ? AND lower(examTitle) = lower(?)`
      )
      .all(classId, academicYear, examTitle) as unknown as ExamCard[];
    const existingByStudent = new Map(existingCards.map((c) => [c.studentId, c]));

    const toCreate: DbStudentRow[] = [];
    const toRegenerate: { student: DbStudentRow; cardId: string }[] = [];
    let skippedDuplicateCount = 0;

    for (const st of eligibleStudents) {
      const existing = existingByStudent.get(st.id);
      if (existing) {
        if (regenerate) {
          toRegenerate.push({ student: st, cardId: existing.id });
        } else {
          skippedDuplicateCount++;
        }
      } else {
        toCreate.push(st);
      }
    }

    if (toCreate.length === 0 && toRegenerate.length === 0) {
      res.status(409).json({
        error: `Dhammaan ardayda fasalkan (${skippedDuplicateCount}) waxay horay u haystaan kaararka "${examTitle}" ee sanadka ${academicYear}. Dooro "Dib u cusboonaysii" haddii aad rabto inaad dib u soo saarto.`,
        skippedDuplicateCount,
        skippedInactiveCount,
      });
      return;
    }

    const nowIso = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const batchId = `ECB-${Date.now().toString(36).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;

    const insertCardStmt = db.prepare(`
      INSERT INTO exam_cards (
        id, batchId, studentId, rollNumber, studentName, studentArabicName, photoUrl,
        classId, className, section, shift, academicYear, examId, examTitle, examDate,
        instructions, seatNumber, status, isDeleted
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 0)
    `);

    const updateCardStmt = db.prepare(`
      UPDATE exam_cards SET
        rollNumber = ?,
        studentName = ?,
        studentArabicName = ?,
        photoUrl = ?,
        className = ?,
        section = ?,
        shift = ?,
        examDate = ?,
        instructions = ?,
        status = 'Active',
        updatedAt = datetime('now')
      WHERE id = ?
    `);

    const createdCards: ExamCard[] = [];
    const existingCardSeqBase =
      (db.prepare('SELECT COUNT(*) as cnt FROM exam_cards').get() as { cnt: number }).cnt + 1;

    db.exec('BEGIN');
    try {
      if (toCreate.length > 0) {
        db.prepare(`
          INSERT INTO exam_card_batches (
            id, academicYear, examId, examTitle, classId, className, section, shift,
            examDate, instructions, cardsPerPage, studentCount, cardCount,
            createdBy, createdByUsername, createdAt, updatedAt, status, isDeleted
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 0)
        `).run(
          batchId,
          academicYear,
          examId || null,
          examTitle,
          targetClass.id,
          targetClass.name,
          sectionFilter && sectionFilter !== 'all' ? sectionFilter : targetClass.section,
          targetClass.shift || 'Subax',
          examDate,
          instructions,
          cardsPerPage,
          eligibleStudents.length,
          toCreate.length,
          actor.fullName,
          actor.username,
          nowIso,
          nowIso
        );

        toCreate.forEach((st, idx) => {
          const cardId = `EC-${new Date().getFullYear()}-${String(existingCardSeqBase + idx).padStart(4, '0')}-${Math.floor(10 + Math.random() * 89)}`;
          const seatNo = `K-${st.rollNumber || idx + 1}`;
          insertCardStmt.run(
            cardId,
            batchId,
            st.id,
            st.rollNumber,
            st.fullName,
            st.arabicName || '',
            st.photoUrl || '',
            targetClass.id,
            targetClass.name,
            st.section || targetClass.section,
            st.shift || targetClass.shift || 'Subax',
            academicYear,
            examId || null,
            examTitle,
            examDate,
            instructions,
            seatNo
          );
          const inserted = db.prepare('SELECT * FROM exam_cards WHERE id = ?').get(cardId) as any;
          if (inserted) createdCards.push({ ...inserted, isDeleted: false });
        });
      }

      for (const item of toRegenerate) {
        updateCardStmt.run(
          item.student.rollNumber,
          item.student.fullName,
          item.student.arabicName || '',
          item.student.photoUrl || '',
          targetClass.name,
          item.student.section || targetClass.section,
          item.student.shift || targetClass.shift || 'Subax',
          examDate,
          instructions,
          item.cardId
        );
        const refreshed = db.prepare('SELECT * FROM exam_cards WHERE id = ?').get(item.cardId) as any;
        if (refreshed) createdCards.push({ ...refreshed, isDeleted: false });
      }
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    const batchRow =
      toCreate.length > 0
        ? (db.prepare('SELECT * FROM exam_card_batches WHERE id = ?').get(batchId) as unknown as ExamCardBatch)
        : null;

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: toCreate.length > 0 ? 'CREATE' : 'UPDATE',
      module: 'Examination Cards',
      resource: batchRow ? `batch:${batchRow.id}` : `class:${classId}`,
      status: 'Success',
      details: `${actor.fullName} ayaa soo saaray ${toCreate.length} kaar cusub (dib u cusboonaysiin: ${toRegenerate.length}, la booday duplicate: ${skippedDuplicateCount}) fasalka ${targetClass.name} (${targetClass.section}) ee imtixaanka "${examTitle}".`,
      ipAddress: getClientIp(req),
    });

    res.status(201).json({
      batch: batchRow,
      cards: createdCards,
      createdCount: toCreate.length,
      regeneratedCount: toRegenerate.length,
      skippedDuplicateCount,
      skippedInactiveCount,
    });
  }
);

app.put(
  '/api/exam-cards/batches/:id',
  requireAuth,
  requireRoles(EXAM_CARD_ROLES, 'Examination Cards'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const existing = db
      .prepare('SELECT * FROM exam_card_batches WHERE id = ? AND isDeleted = 0')
      .get(id) as unknown as ExamCardBatch | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Batch-ka kaararka lama helin.' });
      return;
    }

    const body = req.body || {};
    const nextExamTitle = typeof body.examTitle === 'string' && body.examTitle.trim() ? body.examTitle.trim() : existing.examTitle;
    const nextAcademicYear = typeof body.academicYear === 'string' && body.academicYear.trim() ? body.academicYear.trim() : existing.academicYear;
    const nextExamDate = typeof body.examDate === 'string' && body.examDate.trim() ? body.examDate.trim() : existing.examDate;
    const nextInstructions = typeof body.instructions === 'string' ? body.instructions : existing.instructions;
    const nextCardsPerPage: 5 | 8 = body.cardsPerPage !== undefined ? (Number(body.cardsPerPage) === 5 ? 5 : 8) : (existing.cardsPerPage === 5 ? 5 : 8);
    const nextStatus = ['Active', 'Archived'].includes(body.status) ? body.status : existing.status;

    db.prepare(`
      UPDATE exam_card_batches
      SET academicYear = ?, examTitle = ?, examDate = ?, instructions = ?, cardsPerPage = ?, status = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(nextAcademicYear, nextExamTitle, nextExamDate, nextInstructions, nextCardsPerPage, nextStatus, id);

    // Propagate updated period/date/instructions to cards in this batch
    db.prepare(`
      UPDATE exam_cards
      SET academicYear = ?, examTitle = ?, examDate = ?, instructions = ?, updatedAt = datetime('now')
      WHERE batchId = ? AND isDeleted = 0
    `).run(nextAcademicYear, nextExamTitle, nextExamDate, nextInstructions, id);

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'UPDATE',
      module: 'Examination Cards',
      resource: `batch:${id}`,
      status: 'Success',
      details: `Waxaa la cusboonaysiiyay batch-ka kaararka ${id} (${nextExamTitle}).`,
      ipAddress: getClientIp(req),
    });

    const updatedBatch = db.prepare('SELECT * FROM exam_card_batches WHERE id = ?').get(id) as unknown as ExamCardBatch;
    res.json(updatedBatch);
  }
);

app.post(
  '/api/exam-cards/batches/:id/regenerate',
  requireAuth,
  requireRoles(EXAM_CARD_ROLES, 'Examination Cards'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const batch = db
      .prepare('SELECT * FROM exam_card_batches WHERE id = ? AND isDeleted = 0')
      .get(id) as unknown as ExamCardBatch | undefined;

    if (!batch) {
      res.status(404).json({ error: 'Batch-ka kaararka lama helin.' });
      return;
    }

    const classes = getKv<SchoolClass[]>('classes', []);
    const cls = classes.find((c) => c.id === batch.classId);
    const activeCards = db
      .prepare('SELECT * FROM exam_cards WHERE batchId = ? AND isDeleted = 0')
      .all(id) as unknown as ExamCard[];

    let refreshedCount = 0;
    for (const card of activeCards) {
      const stu = db
        .prepare('SELECT * FROM students WHERE id = ? AND isDeleted = 0')
        .get(card.studentId) as unknown as DbStudentRow | undefined;
      if (!stu) continue;
      db.prepare(`
        UPDATE exam_cards SET
          rollNumber = ?,
          studentName = ?,
          studentArabicName = ?,
          photoUrl = ?,
          className = ?,
          section = ?,
          shift = ?,
          updatedAt = datetime('now')
        WHERE id = ?
      `).run(
        stu.rollNumber,
        stu.fullName,
        stu.arabicName || '',
        stu.photoUrl || '',
        cls?.name || card.className,
        stu.section || card.section,
        stu.shift || cls?.shift || card.shift,
        card.id
      );
      refreshedCount++;
    }

    db.prepare(`UPDATE exam_card_batches SET updatedAt = datetime('now') WHERE id = ?`).run(id);

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'UPDATE',
      module: 'Examination Cards',
      resource: `batch:${id}/regenerate`,
      status: 'Success',
      details: `Batch-ka ${id} waxaa dib loogu cusboonaysiiyay xogta dhabta ah ee ${refreshedCount} arday.`,
      ipAddress: getClientIp(req),
    });

    const cards = db
      .prepare('SELECT * FROM exam_cards WHERE batchId = ? AND isDeleted = 0 ORDER BY rollNumber ASC')
      .all(id)
      .map((r: any) => ({ ...r, isDeleted: Boolean(r.isDeleted) })) as ExamCard[];

    res.json({ ok: true, refreshedCount, cards });
  }
);

app.delete(
  '/api/exam-cards/batches/:id',
  requireAuth,
  requireRoles(EXAM_CARD_ROLES, 'Examination Cards'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const existing = db
      .prepare('SELECT * FROM exam_card_batches WHERE id = ? AND isDeleted = 0')
      .get(id) as unknown as ExamCardBatch | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Batch-ka lama helin.' });
      return;
    }

    const deletedAt = new Date().toISOString();
    db.exec('BEGIN');
    try {
      db.prepare(
        `UPDATE exam_card_batches SET isDeleted = 1, status = 'Deleted', updatedAt = datetime('now') WHERE id = ?`
      ).run(id);
      db.prepare(
        `UPDATE exam_cards SET isDeleted = 1, status = 'Deleted', deletedAt = ?, deletedBy = ?, updatedAt = datetime('now') WHERE batchId = ? AND isDeleted = 0`
      ).run(deletedAt, actor.username, id);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }

    insertAuditLog({
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'DELETE',
      module: 'Examination Cards',
      resource: `batch:${id}`,
      status: 'Success',
      details: `${actor.fullName} ayaa tirtiray batch-ka kaararka imtixaanka ${id} (${existing.examTitle} - ${existing.className}). Xogta ardayda iyo natiijooyinka waa la ilaaliyay.`,
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true, id });
  }
);

app.put(
  '/api/exam-cards/:id',
  requireAuth,
  requireRoles(EXAM_CARD_ROLES, 'Examination Cards'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const existing = db
      .prepare('SELECT * FROM exam_cards WHERE id = ? AND isDeleted = 0')
      .get(id) as unknown as ExamCard | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Kaarka imtixaanka lama helin.' });
      return;
    }

    const updates = req.body || {};
    const nextExamTitle = typeof updates.examTitle === 'string' && updates.examTitle.trim() ? updates.examTitle.trim() : existing.examTitle;
    const nextAcademicYear = typeof updates.academicYear === 'string' && updates.academicYear.trim() ? updates.academicYear.trim() : existing.academicYear;
    const nextExamDate = typeof updates.examDate === 'string' && updates.examDate.trim() ? updates.examDate.trim() : existing.examDate;
    const nextInstructions = typeof updates.instructions === 'string' ? updates.instructions : existing.instructions;
    const nextSeatNumber = typeof updates.seatNumber === 'string' ? updates.seatNumber : existing.seatNumber;
    const nextStatus = ['Active', 'Revoked'].includes(updates.status) ? updates.status : existing.status;

    db.prepare(`
      UPDATE exam_cards
      SET examTitle = ?, academicYear = ?, examDate = ?, instructions = ?, seatNumber = ?, status = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(nextExamTitle, nextAcademicYear, nextExamDate, nextInstructions, nextSeatNumber, nextStatus, id);

    insertAuditLog({
      studentId: existing.studentId,
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'UPDATE',
      module: 'Examination Cards',
      resource: `exam_card:${id}`,
      status: 'Success',
      details: `Kaarka imtixaanka ${id} (${existing.studentName}) waxaa wax ka beddelay ${actor.username}.`,
      ipAddress: getClientIp(req),
    });

    const updated = db.prepare('SELECT * FROM exam_cards WHERE id = ?').get(id) as any;
    res.json({ ...updated, isDeleted: Boolean(updated.isDeleted) });
  }
);

app.delete(
  '/api/exam-cards/:id',
  requireAuth,
  requireRoles(EXAM_CARD_ROLES, 'Examination Cards'),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const actor = req.authUser!;
    const existing = db
      .prepare('SELECT * FROM exam_cards WHERE id = ? AND isDeleted = 0')
      .get(id) as unknown as ExamCard | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Kaarka imtixaanka lama helin.' });
      return;
    }

    const deletedAt = new Date().toISOString();
    db.prepare(`
      UPDATE exam_cards
      SET isDeleted = 1, status = 'Deleted', deletedAt = ?, deletedBy = ?, updatedAt = datetime('now')
      WHERE id = ?
    `).run(deletedAt, actor.username, id);

    // Update parent batch card count cleanly
    const remainingCount = (
      db
        .prepare('SELECT COUNT(*) as cnt FROM exam_cards WHERE batchId = ? AND isDeleted = 0')
        .get(existing.batchId) as { cnt: number }
    ).cnt;
    db.prepare(`UPDATE exam_card_batches SET cardCount = ?, updatedAt = datetime('now') WHERE id = ?`).run(
      remainingCount,
      existing.batchId
    );

    insertAuditLog({
      studentId: existing.studentId,
      username: actor.username,
      user: `${actor.fullName} (${actor.username})`,
      role: actor.role,
      action: 'DELETE',
      module: 'Examination Cards',
      resource: `exam_card:${id}`,
      status: 'Success',
      details: `Kaarka imtixaanka ${id} (${existing.studentName} - ${existing.studentId}) waxaa tirtiray ${actor.username}. Xogta ardayga lama taaban.`,
      ipAddress: getClientIp(req),
    });

    res.json({ ok: true, id, batchId: existing.batchId, remainingCount });
  }
);

// Catch-all for unknown /api routes (returns JSON 404 instead of HTML)
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint lama helin.' });
});

// ============================================================
// VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PROD)
// ============================================================
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Machadka Qardho SMS] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
