/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
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
  ExpenseVoucher,
  StaffMember,
  StaffLeaveRequest,
  PayrollRecord,
  TimetableSlot,
  Announcement,
  SupportTicket,
  SchoolSettings,
} from '../types';

export function generateMySQLScript(data: {
  settings: SchoolSettings;
  students: Student[];
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  attendance: AttendanceRecord[];
  exams: Examination[];
  marks: ExamMark[];
  feeStructures: FeeStructure[];
  invoices: StudentInvoice[];
  payments: FeePayment[];
  expenses: ExpenseVoucher[];
  staff: StaffMember[];
  leaveRequests: StaffLeaveRequest[];
  payroll: PayrollRecord[];
  timetable: TimetableSlot[];
  announcements: Announcement[];
  tickets: SupportTicket[];
}): string {
  const escapeSql = (str: string | undefined | null) => {
    if (str === undefined || str === null) return 'NULL';
    return `'${String(str).replace(/'/g, "\\'")}'`;
  };

  return `-- ==============================================================================
-- Machadka Khadiija Bintu Khuwaylid – Qardho, Puntland, Somalia
-- معهد خديجة بنت خويلد للعلوم الشرعية واللغة العربية - قرطو
-- Complete School Management System (SMS) Database Schema & Seed Data
-- Compatible with MySQL 8.0+ and MariaDB 10.4+ (XAMPP / Production)
-- Generated on: ${new Date().toISOString()}
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+03:00"; -- East Africa Time (EAT - Somalia)

-- 1. Create and select Database
CREATE DATABASE IF NOT EXISTS \`machadka_school_db\`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE \`machadka_school_db\`;

-- ------------------------------------------------------------------------------
-- Table: system_settings
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`system_settings\`;
CREATE TABLE \`system_settings\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`institution_name\` VARCHAR(255) NOT NULL,
  \`arabic_name\` VARCHAR(255) NOT NULL,
  \`location\` VARCHAR(255) NOT NULL,
  \`academic_year\` VARCHAR(50) NOT NULL,
  \`principal_name\` VARCHAR(255) NOT NULL,
  \`phone\` VARCHAR(100),
  \`email\` VARCHAR(150),
  \`currency\` VARCHAR(10) DEFAULT 'USD',
  \`currency_symbol\` VARCHAR(5) DEFAULT '$',
  \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO \`system_settings\` (\`institution_name\`, \`arabic_name\`, \`location\`, \`academic_year\`, \`principal_name\`, \`phone\`, \`email\`, \`currency\`, \`currency_symbol\`)
VALUES (
  ${escapeSql(data.settings.institutionName)},
  ${escapeSql(data.settings.arabicName)},
  ${escapeSql(data.settings.location)},
  ${escapeSql(data.settings.academicYear)},
  ${escapeSql(data.settings.principalName)},
  ${escapeSql(data.settings.phone)},
  ${escapeSql(data.settings.email)},
  ${escapeSql(data.settings.currency)},
  ${escapeSql(data.settings.currencySymbol)}
);

-- ------------------------------------------------------------------------------
-- Table: users (Administrative & RBAC Accounts)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`users\`;
CREATE TABLE \`users\` (
  \`id\` INT AUTO_INCREMENT PRIMARY KEY,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`email\` VARCHAR(150) NOT NULL UNIQUE,
  \`password_hash\` VARCHAR(255) NOT NULL,
  \`role\` ENUM('Super Admin','Administrator','Academic Manager','Accountant','Teacher','HR Manager','Receptionist','Student','Parent') NOT NULL,
  \`status\` ENUM('Active','Inactive','Suspended') DEFAULT 'Active',
  \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default password hash corresponds to 'AdminPassword2026!'
INSERT INTO \`users\` (\`full_name\`, \`email\`, \`password_hash\`, \`role\`, \`status\`) VALUES
('Shiikh Cabdulqaadir Warsame', 'admin@machadkakhadiija.edu.so', '$2y$10$e7a9Nq.K8Wj9x2O8t7sYDeL3gC5f4rM.AdminPasswordHash2026', 'Super Admin', 'Active'),
('Ustaad Cabdiraxmaan Cali', 'academic@machadkakhadiija.edu.so', '$2y$10$e7a9Nq.K8Wj9x2O8t7sYDeL3gC5f4rM.AdminPasswordHash2026', 'Academic Manager', 'Active'),
('Cali Xasan Faarax', 'accountant@machadkakhadiija.edu.so', '$2y$10$e7a9Nq.K8Wj9x2O8t7sYDeL3gC5f4rM.AdminPasswordHash2026', 'Accountant', 'Active');

-- ------------------------------------------------------------------------------
-- Table: teachers
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`teachers\`;
CREATE TABLE \`teachers\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`arabic_name\` VARCHAR(150),
  \`gender\` ENUM('Male','Female') NOT NULL,
  \`phone\` VARCHAR(50),
  \`email\` VARCHAR(150),
  \`specialization\` VARCHAR(200),
  \`qualification\` VARCHAR(255),
  \`joining_date\` DATE,
  \`status\` ENUM('Active','On Leave','Resigned') DEFAULT 'Active',
  \`monthly_salary\` DECIMAL(10,2) DEFAULT 0.00,
  \`weekly_hours\` INT DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.teachers
  .map(
    (t) =>
      `INSERT INTO \`teachers\` VALUES (${escapeSql(t.id)}, ${escapeSql(t.fullName)}, ${escapeSql(t.arabicName)}, '${t.gender}', ${escapeSql(t.phone)}, ${escapeSql(t.email)}, ${escapeSql(t.specialization)}, ${escapeSql(t.qualification)}, '${t.joiningDate}', '${t.status}', ${t.monthlySalary}, ${t.weeklyHours});`
  )
  .join('\n')}

-- ------------------------------------------------------------------------------
-- Table: classes
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`classes\`;
CREATE TABLE \`classes\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`name\` VARCHAR(100) NOT NULL,
  \`section\` VARCHAR(20) NOT NULL,
  \`room_number\` VARCHAR(50),
  \`capacity\` INT DEFAULT 35,
  \`class_teacher_id\` VARCHAR(50),
  \`academic_year\` VARCHAR(50) NOT NULL,
  CONSTRAINT \`fk_class_teacher\` FOREIGN KEY (\`class_teacher_id\`) REFERENCES \`teachers\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.classes
  .map(
    (c) =>
      `INSERT INTO \`classes\` VALUES (${escapeSql(c.id)}, ${escapeSql(c.name)}, ${escapeSql(c.section)}, ${escapeSql(c.roomNumber)}, ${c.capacity}, ${escapeSql(c.classTeacherId)}, ${escapeSql(c.academicYear)});`
  )
  .join('\n')}

-- ------------------------------------------------------------------------------
-- Table: students
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`students\`;
CREATE TABLE \`students\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`roll_number\` VARCHAR(50) NOT NULL,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`arabic_name\` VARCHAR(150),
  \`gender\` ENUM('Male','Female') NOT NULL,
  \`birth_date\` DATE,
  \`class_id\` VARCHAR(50) NOT NULL,
  \`section\` VARCHAR(20) NOT NULL,
  \`admission_date\` DATE NOT NULL,
  \`status\` ENUM('Active','Suspended','Alumni','Transferred') DEFAULT 'Active',
  \`photo_url\` TEXT,
  \`blood_group\` VARCHAR(10),
  \`guardian_name\` VARCHAR(150),
  \`guardian_phone\` VARCHAR(50),
  \`guardian_relation\` VARCHAR(50),
  \`guardian_address\` VARCHAR(255),
  \`emergency_contact\` VARCHAR(50),
  \`notes\` TEXT,
  CONSTRAINT \`fk_student_class\` FOREIGN KEY (\`class_id\`) REFERENCES \`classes\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.students
  .map(
    (s) =>
      `INSERT INTO \`students\` VALUES (${escapeSql(s.id)}, ${escapeSql(s.rollNumber)}, ${escapeSql(s.fullName)}, ${escapeSql(s.arabicName)}, '${s.gender}', '${s.birthDate}', ${escapeSql(s.classId)}, ${escapeSql(s.section)}, '${s.admissionDate}', '${s.status}', ${escapeSql(s.photoUrl)}, ${escapeSql(s.bloodGroup)}, ${escapeSql(s.guardianName)}, ${escapeSql(s.guardianPhone)}, ${escapeSql(s.guardianRelation)}, ${escapeSql(s.guardianAddress)}, ${escapeSql(s.emergencyContact)}, ${escapeSql(s.notes)});`
  )
  .join('\n')}

-- ------------------------------------------------------------------------------
-- Table: subjects
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`subjects\`;
CREATE TABLE \`subjects\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`code\` VARCHAR(50) NOT NULL,
  \`name_somali\` VARCHAR(150) NOT NULL,
  \`name_arabic\` VARCHAR(150),
  \`class_id\` VARCHAR(50) NOT NULL,
  \`teacher_id\` VARCHAR(50),
  \`credit_hours\` INT DEFAULT 3,
  \`max_marks\` INT DEFAULT 100,
  \`pass_marks\` INT DEFAULT 50,
  CONSTRAINT \`fk_subject_class\` FOREIGN KEY (\`class_id\`) REFERENCES \`classes\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_subject_teacher\` FOREIGN KEY (\`teacher_id\`) REFERENCES \`teachers\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.subjects
  .map(
    (s) =>
      `INSERT INTO \`subjects\` VALUES (${escapeSql(s.id)}, ${escapeSql(s.code)}, ${escapeSql(s.nameSomali)}, ${escapeSql(s.nameArabic)}, ${escapeSql(s.classId)}, ${escapeSql(s.teacherId)}, ${s.creditHours}, ${s.maxMarks}, ${s.passMarks});`
  )
  .join('\n')}

-- ------------------------------------------------------------------------------
-- Table: examinations & marks
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`examinations\`;
CREATE TABLE \`examinations\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`title\` VARCHAR(200) NOT NULL,
  \`term\` ENUM('Month 1','Mid-Term','Final Term') NOT NULL,
  \`academic_year\` VARCHAR(50) NOT NULL,
  \`start_date\` DATE,
  \`end_date\` DATE,
  \`status\` ENUM('Draft','Published','Archived') DEFAULT 'Draft',
  \`description\` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.exams
  .map(
    (e) =>
      `INSERT INTO \`examinations\` VALUES (${escapeSql(e.id)}, ${escapeSql(e.title)}, '${e.term}', ${escapeSql(e.academicYear)}, '${e.startDate}', '${e.endDate}', '${e.status}', ${escapeSql(e.description)});`
  )
  .join('\n')}

DROP TABLE IF EXISTS \`exam_marks\`;
CREATE TABLE \`exam_marks\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`exam_id\` VARCHAR(50) NOT NULL,
  \`student_id\` VARCHAR(50) NOT NULL,
  \`subject_id\` VARCHAR(50) NOT NULL,
  \`marks_obtained\` DECIMAL(5,2) NOT NULL,
  \`max_marks\` DECIMAL(5,2) DEFAULT 100.00,
  \`grade\` VARCHAR(5),
  \`remarks\` TEXT,
  CONSTRAINT \`fk_mark_exam\` FOREIGN KEY (\`exam_id\`) REFERENCES \`examinations\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_mark_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`students\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_mark_subject\` FOREIGN KEY (\`subject_id\`) REFERENCES \`subjects\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.marks
  .map(
    (m) =>
      `INSERT INTO \`exam_marks\` VALUES (${escapeSql(m.id)}, ${escapeSql(m.examId)}, ${escapeSql(m.studentId)}, ${escapeSql(m.subjectId)}, ${m.marksObtained}, ${m.maxMarks}, ${escapeSql(m.grade)}, ${escapeSql(m.remarks)});`
  )
  .join('\n')}

-- ------------------------------------------------------------------------------
-- Table: fee_structures, invoices & payments
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`fee_structures\`;
CREATE TABLE \`fee_structures\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`name\` VARCHAR(150) NOT NULL,
  \`category\` ENUM('Tuition','Admission','Exam','Books_Uniform','Transport') NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL,
  \`academic_year\` VARCHAR(50) NOT NULL,
  \`description\` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.feeStructures
  .map(
    (f) =>
      `INSERT INTO \`fee_structures\` VALUES (${escapeSql(f.id)}, ${escapeSql(f.name)}, '${f.category}', ${f.amount}, ${escapeSql(f.academicYear)}, ${escapeSql(f.description)});`
  )
  .join('\n')}

DROP TABLE IF EXISTS \`student_invoices\`;
CREATE TABLE \`student_invoices\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`student_id\` VARCHAR(50) NOT NULL,
  \`fee_structure_id\` VARCHAR(50),
  \`title\` VARCHAR(200) NOT NULL,
  \`due_date\` DATE NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL,
  \`paid_amount\` DECIMAL(10,2) DEFAULT 0.00,
  \`balance\` DECIMAL(10,2) NOT NULL,
  \`status\` ENUM('Paid','Partial','Unpaid','Overdue') DEFAULT 'Unpaid',
  \`month\` VARCHAR(50),
  CONSTRAINT \`fk_invoice_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`students\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_invoice_fee\` FOREIGN KEY (\`fee_structure_id\`) REFERENCES \`fee_structures\` (\`id\`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.invoices
  .map(
    (i) =>
      `INSERT INTO \`student_invoices\` VALUES (${escapeSql(i.id)}, ${escapeSql(i.studentId)}, ${escapeSql(i.feeStructureId)}, ${escapeSql(i.title)}, '${i.dueDate}', ${i.amount}, ${i.paidAmount}, ${i.balance}, '${i.status}', ${escapeSql(i.month)});`
  )
  .join('\n')}

DROP TABLE IF EXISTS \`fee_payments\`;
CREATE TABLE \`fee_payments\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`invoice_id\` VARCHAR(50) NOT NULL,
  \`student_id\` VARCHAR(50) NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL,
  \`payment_date\` DATE NOT NULL,
  \`payment_method\` ENUM('EVC Plus','Salaam Bank','Dahabshiil / eDahab','Cash') NOT NULL,
  \`reference_number\` VARCHAR(100),
  \`received_by\` VARCHAR(150),
  \`notes\` TEXT,
  CONSTRAINT \`fk_payment_invoice\` FOREIGN KEY (\`invoice_id\`) REFERENCES \`student_invoices\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_payment_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`students\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.payments
  .map(
    (p) =>
      `INSERT INTO \`fee_payments\` VALUES (${escapeSql(p.id)}, ${escapeSql(p.invoiceId)}, ${escapeSql(p.studentId)}, ${p.amount}, '${p.paymentDate}', '${p.paymentMethod}', ${escapeSql(p.referenceNumber)}, ${escapeSql(p.receivedBy)}, ${escapeSql(p.notes)});`
  )
  .join('\n')}

-- ------------------------------------------------------------------------------
-- Table: expense_vouchers
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`expense_vouchers\`;
CREATE TABLE \`expense_vouchers\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`date\` DATE NOT NULL,
  \`category\` VARCHAR(100) NOT NULL,
  \`category_somali\` VARCHAR(150),
  \`title\` VARCHAR(255) NOT NULL,
  \`amount\` DECIMAL(10,2) NOT NULL,
  \`paid_to\` VARCHAR(150),
  \`payment_method\` VARCHAR(50),
  \`reference_no\` VARCHAR(100),
  \`approved_by\` VARCHAR(150),
  \`status\` ENUM('Approved','Pending','Rejected') DEFAULT 'Approved',
  \`notes\` TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.expenses
  .map(
    (e) =>
      `INSERT INTO \`expense_vouchers\` VALUES (${escapeSql(e.id)}, '${e.date}', ${escapeSql(e.category)}, ${escapeSql(e.categorySomali)}, ${escapeSql(e.title)}, ${e.amount}, ${escapeSql(e.paidTo)}, ${escapeSql(e.paymentMethod)}, ${escapeSql(e.referenceNo)}, ${escapeSql(e.approvedBy)}, '${e.status}', ${escapeSql(e.notes)});`
  )
  .join('\n')}

-- ------------------------------------------------------------------------------
-- Table: attendance
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`attendance\`;
CREATE TABLE \`attendance\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`date\` DATE NOT NULL,
  \`class_id\` VARCHAR(50) NOT NULL,
  \`student_id\` VARCHAR(50) NOT NULL,
  \`status\` ENUM('Present','Absent','Late','Excused') NOT NULL,
  \`remarks\` VARCHAR(255),
  CONSTRAINT \`fk_att_class\` FOREIGN KEY (\`class_id\`) REFERENCES \`classes\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_att_student\` FOREIGN KEY (\`student_id\`) REFERENCES \`students\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.attendance
  .map(
    (a) =>
      `INSERT INTO \`attendance\` VALUES (${escapeSql(a.id)}, '${a.date}', ${escapeSql(a.classId)}, ${escapeSql(a.studentId)}, '${a.status}', ${escapeSql(a.remarks)});`
  )
  .join('\n')}

-- ------------------------------------------------------------------------------
-- Table: staff & payroll
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`staff_members\`;
CREATE TABLE \`staff_members\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`full_name\` VARCHAR(150) NOT NULL,
  \`department\` ENUM('Administration','Teaching','Finance','Support','Security') NOT NULL,
  \`role_title\` VARCHAR(150) NOT NULL,
  \`phone\` VARCHAR(50),
  \`email\` VARCHAR(150),
  \`basic_salary\` DECIMAL(10,2) DEFAULT 0.00,
  \`allowance\` DECIMAL(10,2) DEFAULT 0.00,
  \`joining_date\` DATE,
  \`status\` ENUM('Active','On Leave','Suspended') DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.staff
  .map(
    (s) =>
      `INSERT INTO \`staff_members\` VALUES (${escapeSql(s.id)}, ${escapeSql(s.fullName)}, '${s.department}', ${escapeSql(s.roleTitle)}, ${escapeSql(s.phone)}, ${escapeSql(s.email)}, ${s.basicSalary}, ${s.allowance}, '${s.joiningDate}', '${s.status}');`
  )
  .join('\n')}

DROP TABLE IF EXISTS \`payroll\`;
CREATE TABLE \`payroll\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`month\` VARCHAR(50) NOT NULL,
  \`staff_id\` VARCHAR(50) NOT NULL,
  \`basic_salary\` DECIMAL(10,2) NOT NULL,
  \`allowances\` DECIMAL(10,2) DEFAULT 0.00,
  \`deductions\` DECIMAL(10,2) DEFAULT 0.00,
  \`net_salary\` DECIMAL(10,2) NOT NULL,
  \`payment_date\` DATE NOT NULL,
  \`status\` ENUM('Paid','Processing') DEFAULT 'Paid',
  \`payment_method\` VARCHAR(100),
  \`reference_no\` VARCHAR(100),
  CONSTRAINT \`fk_pay_staff\` FOREIGN KEY (\`staff_id\`) REFERENCES \`staff_members\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.payroll
  .map(
    (p) =>
      `INSERT INTO \`payroll\` VALUES (${escapeSql(p.id)}, ${escapeSql(p.month)}, ${escapeSql(p.staffId)}, ${p.basicSalary}, ${p.allowances}, ${p.deductions}, ${p.netSalary}, '${p.paymentDate}', '${p.status}', ${escapeSql(p.paymentMethod)}, ${escapeSql(p.referenceNo)});`
  )
  .join('\n')}

-- ------------------------------------------------------------------------------
-- Table: timetable_slots
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS \`timetable_slots\`;
CREATE TABLE \`timetable_slots\` (
  \`id\` VARCHAR(50) PRIMARY KEY,
  \`day\` ENUM('Sabti','Axad','Isniin','Talaado','Arbaco','Khamiis') NOT NULL,
  \`period\` INT NOT NULL,
  \`time_range\` VARCHAR(50) NOT NULL,
  \`class_id\` VARCHAR(50) NOT NULL,
  \`subject_id\` VARCHAR(50) NOT NULL,
  \`teacher_id\` VARCHAR(50) NOT NULL,
  \`room_number\` VARCHAR(50) NOT NULL,
  CONSTRAINT \`fk_tt_class\` FOREIGN KEY (\`class_id\`) REFERENCES \`classes\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_tt_subject\` FOREIGN KEY (\`subject_id\`) REFERENCES \`subjects\` (\`id\`) ON DELETE CASCADE,
  CONSTRAINT \`fk_tt_teacher\` FOREIGN KEY (\`teacher_id\`) REFERENCES \`teachers\` (\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

${data.timetable
  .map(
    (t) =>
      `INSERT INTO \`timetable_slots\` VALUES (${escapeSql(t.id)}, '${t.day}', ${t.period}, ${escapeSql(t.timeRange)}, ${escapeSql(t.classId)}, ${escapeSql(t.subjectId)}, ${escapeSql(t.teacherId)}, ${escapeSql(t.roomNumber)});`
  )
  .join('\n')}

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- End of Machadka Khadiija Bintu Khuwaylid Database Script
-- ==============================================================================
`;
}
