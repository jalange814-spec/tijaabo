/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  Award,
  CreditCard,
  FileSpreadsheet,
  Settings,
  IdCard,
  UserPlus,
  UserCheck,
  UserMinus,
  ShieldAlert,
  Activity,
  Layers,
  TrendingUp,
  Clock,
  Briefcase,
  Calendar,
  FileText,
  Table,
  Database,
  DollarSign,
  TrendingDown,
  PieChart,
  HelpCircle,
  MessageSquare,
  FileQuestion,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { RbacPermissionPolicy, UserRole } from '../types';
import { canAccessModule } from '../utils/rbac';

export interface NavChildItem {
  key: string;
  label: string;
  module: string;
  tab?: string;
  action?: string;
  icon: React.ComponentType<{ className?: string }>;
  isVisible?: (role: UserRole) => boolean;
}

export interface NavParentGroup {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  modules: string[];
  children: NavChildItem[];
}

const ADMIN_ACADEMIC_ROLES: UserRole[] = ['Super Admin', 'Administrator', 'Academic Manager'];
const ADMIN_HR_ACADEMIC_ROLES: UserRole[] = ['Super Admin', 'Administrator', 'Academic Manager', 'HR Manager'];
const ADMIN_HR_ROLES: UserRole[] = ['Super Admin', 'Administrator', 'HR Manager'];
const STUDENT_REGISTER_ROLES: UserRole[] = ['Super Admin', 'Administrator', 'Academic Manager', 'Receptionist'];

export const NAVIGATION_GROUPS: NavParentGroup[] = [
  {
    id: 'dulmar_guud',
    label: 'Dulmar Guud',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
    modules: ['dashboard'],
    children: [
      {
        key: 'dashboard_overview',
        label: 'Dashboard Overview',
        module: 'dashboard',
        tab: 'overview',
        icon: LayoutDashboard,
        isVisible: (r) => canAccessModule(r, 'dashboard'),
      },
      {
        key: 'dashboard_analytics',
        label: 'Analytics & Tirakoob',
        module: 'dashboard',
        tab: 'analytics',
        icon: TrendingUp,
        isVisible: (r) => canAccessModule(r, 'dashboard'),
      },
    ],
  },
  {
    id: 'ardayda',
    label: 'Ardayda & Kaararka',
    shortLabel: 'Students',
    icon: Users,
    modules: ['students', 'exam_cards'],
    children: [
      {
        key: 'students_register',
        label: 'Diiwaangeli Arday',
        module: 'students',
        action: 'add_student',
        icon: UserPlus,
        isVisible: (r) => canAccessModule(r, 'students') && STUDENT_REGISTER_ROLES.includes(r),
      },
      {
        key: 'students_list',
        label: 'Liiska Ardayda',
        module: 'students',
        tab: 'list',
        icon: Users,
        isVisible: (r) => canAccessModule(r, 'students'),
      },
      {
        key: 'students_id_cards',
        label: 'Faahfaahinta & ID Cards',
        module: 'students',
        tab: 'id_cards',
        icon: IdCard,
        isVisible: (r) => canAccessModule(r, 'students'),
      },
      {
        key: 'exam_cards_generate',
        label: 'Kaararka Imtixaanka (A4)',
        module: 'exam_cards',
        tab: 'generate',
        icon: Award,
        isVisible: (r) => canAccessModule(r, 'exam_cards') && ADMIN_ACADEMIC_ROLES.includes(r),
      },
      {
        key: 'exam_cards_manage',
        label: 'Maamul Kaararka Imtixaanka',
        module: 'exam_cards',
        tab: 'manage',
        icon: FileText,
        isVisible: (r) => canAccessModule(r, 'exam_cards') && ADMIN_ACADEMIC_ROLES.includes(r),
      },
      {
        key: 'students_guardians',
        label: 'Waalidiinta (Guardians)',
        module: 'students',
        tab: 'guardians',
        icon: UserCheck,
        isVisible: (r) => canAccessModule(r, 'students'),
      },
      {
        key: 'students_withdrawn',
        label: 'Ardayda Ka Baxday',
        module: 'students',
        tab: 'withdrawn',
        icon: UserMinus,
        isVisible: (r) => canAccessModule(r, 'students'),
      },
      {
        key: 'students_suspended',
        label: 'Ardayda La Hakiyey',
        module: 'students',
        tab: 'suspended',
        icon: ShieldAlert,
        isVisible: (r) => canAccessModule(r, 'students'),
      },
    ],
  },
  {
    id: 'bogga_ardayga',
    label: 'Bogga Ardayga',
    shortLabel: 'Portal',
    icon: KeyRound,
    modules: ['student_portal'],
    children: [
      {
        key: 'portal_overview',
        label: 'Portal Overview & ID',
        module: 'student_portal',
        tab: 'overview',
        icon: KeyRound,
        isVisible: (r) => canAccessModule(r, 'student_portal'),
      },
      {
        key: 'portal_exams',
        label: 'Natiijooyinka Imtixaanka',
        module: 'student_portal',
        tab: 'exams',
        icon: Award,
        isVisible: (r) => canAccessModule(r, 'student_portal'),
      },
      {
        key: 'portal_attendance',
        label: 'Xaadirinta Ardayga',
        module: 'student_portal',
        tab: 'attendance',
        icon: CalendarCheck,
        isVisible: (r) => canAccessModule(r, 'student_portal'),
      },
      {
        key: 'portal_fees',
        label: 'Biilasha & Rasiidadka',
        module: 'student_portal',
        tab: 'fees',
        icon: CreditCard,
        isVisible: (r) => canAccessModule(r, 'student_portal'),
      },
      {
        key: 'portal_timetable',
        label: 'Jadwalka & Ogeysiisyada',
        module: 'student_portal',
        tab: 'timetable',
        icon: Clock,
        isVisible: (r) => canAccessModule(r, 'student_portal'),
      },
      {
        key: 'portal_security',
        label: 'Portal Access & Amniga',
        module: 'student_portal',
        tab: 'security',
        icon: Lock,
        isVisible: (r) => canAccessModule(r, 'student_portal'),
      },
    ],
  },
  {
    id: 'fasallada',
    label: 'Fasallada & Maadooyinka',
    shortLabel: 'Academics',
    icon: GraduationCap,
    modules: ['classes'],
    children: [
      {
        key: 'classes_list',
        label: 'Fasallada & Sections',
        module: 'classes',
        tab: 'classes',
        icon: GraduationCap,
        isVisible: (r) => canAccessModule(r, 'classes'),
      },
      {
        key: 'classes_subjects',
        label: 'Maaddooyinka (Subjects)',
        module: 'classes',
        tab: 'subjects',
        icon: Layers,
        isVisible: (r) => canAccessModule(r, 'classes'),
      },
      {
        key: 'classes_promotion',
        label: 'Dalacsiinta & Sanadka',
        module: 'classes',
        tab: 'promotion',
        icon: TrendingUp,
        isVisible: (r) => canAccessModule(r, 'classes') && ADMIN_ACADEMIC_ROLES.includes(r),
      },
    ],
  },
  {
    id: 'macallimiinta',
    label: 'Macallimiinta & Shaqaalaha',
    shortLabel: 'Staff & HR',
    icon: BookOpen,
    modules: ['teachers', 'hr', 'timetable'],
    children: [
      {
        key: 'teachers_register',
        label: 'Diiwaangeli Macallin',
        module: 'teachers',
        action: 'add_teacher',
        icon: UserPlus,
        isVisible: (r) => canAccessModule(r, 'teachers') && ADMIN_HR_ROLES.includes(r),
      },
      {
        key: 'teachers_list',
        label: 'Liiska Macallimiinta',
        module: 'teachers',
        tab: 'list',
        icon: BookOpen,
        isVisible: (r) => canAccessModule(r, 'teachers'),
      },
      {
        key: 'staff_directory',
        label: 'Liiska Shaqaalaha (Staff)',
        module: 'hr',
        tab: 'directory',
        icon: Briefcase,
        isVisible: (r) => canAccessModule(r, 'hr') && r !== 'Teacher' && r !== 'Accountant',
      },
      {
        key: 'staff_leaves',
        label: 'Fasaxyada (Leaves)',
        module: 'hr',
        tab: 'leaves',
        icon: Calendar,
        isVisible: (r) => canAccessModule(r, 'hr'),
      },
      {
        key: 'timetable_main',
        label: 'Jadwalka Casharrada',
        module: 'timetable',
        tab: 'class',
        icon: Clock,
        isVisible: (r) => canAccessModule(r, 'timetable'),
      },
    ],
  },
  {
    id: 'xaadirinta',
    label: 'Xaadirinta',
    shortLabel: 'Attendance',
    icon: CalendarCheck,
    modules: ['attendance'],
    children: [
      {
        key: 'attendance_students',
        label: 'Xaadirinta Ardayda',
        module: 'attendance',
        tab: 'students',
        icon: CalendarCheck,
        isVisible: (r) => canAccessModule(r, 'attendance'),
      },
      {
        key: 'attendance_staff',
        label: 'Xaadirinta Shaqaalaha',
        module: 'attendance',
        tab: 'staff',
        icon: UserCheck,
        isVisible: (r) => canAccessModule(r, 'attendance') && ADMIN_HR_ACADEMIC_ROLES.includes(r),
      },
    ],
  },
  {
    id: 'imtixaanaadka',
    label: 'Imtixaanaadka & Natiijada',
    shortLabel: 'Exams',
    icon: Award,
    modules: ['exams'],
    children: [
      {
        key: 'exams_create',
        label: 'Samee Imtixaan',
        module: 'exams',
        tab: 'exams_list',
        action: 'new_exam',
        icon: FileText,
        isVisible: (r) => canAccessModule(r, 'exams') && ADMIN_ACADEMIC_ROLES.includes(r),
      },
      {
        key: 'exams_list',
        label: 'Liiska Imtixaannada',
        module: 'exams',
        tab: 'exams_list',
        icon: Calendar,
        isVisible: (r) => canAccessModule(r, 'exams'),
      },
      {
        key: 'exams_marks_entry',
        label: 'Geli Dhibcaha',
        module: 'exams',
        tab: 'marks_entry',
        icon: Award,
        isVisible: (r) => canAccessModule(r, 'exams'),
      },
      {
        key: 'exams_matrix',
        label: 'Jadwalka Dhibcaha (Matrix)',
        module: 'exams',
        tab: 'bulk_matrix',
        icon: Table,
        isVisible: (r) => canAccessModule(r, 'exams'),
      },
      {
        key: 'exams_reports',
        label: 'Natiijooyinka Ardayda',
        module: 'exams',
        tab: 'report_cards',
        icon: FileSpreadsheet,
        isVisible: (r) => canAccessModule(r, 'exams'),
      },
      {
        key: 'exams_certificates',
        label: 'Shahaadooyinka Imtixaanka',
        module: 'exams',
        tab: 'exam_certificates',
        icon: ShieldCheck,
        isVisible: (r) => canAccessModule(r, 'exams'),
      },
    ],
  },
  {
    id: 'maaliyadda',
    label: 'Maaliyadda & Biilasha',
    shortLabel: 'Finance',
    icon: CreditCard,
    modules: ['fees', 'finance', 'hr'],
    children: [
      {
        key: 'fees_invoices',
        label: 'Biilasha Ardayda (Invoices)',
        module: 'fees',
        tab: 'invoices',
        icon: CreditCard,
        isVisible: (r) => canAccessModule(r, 'fees'),
      },
      {
        key: 'fees_payments',
        label: 'Lacag-bixinnada & Rasiidada',
        module: 'fees',
        tab: 'payments',
        icon: DollarSign,
        isVisible: (r) => canAccessModule(r, 'fees'),
      },
      {
        key: 'fees_structures',
        label: 'Qaabka Khidmadaha',
        module: 'fees',
        tab: 'structures',
        icon: Layers,
        isVisible: (r) => canAccessModule(r, 'fees'),
      },
      {
        key: 'finance_incomes',
        label: 'Dakhliga (Income Records)',
        module: 'finance',
        tab: 'incomes',
        icon: PieChart,
        isVisible: (r) => canAccessModule(r, 'finance'),
      },
      {
        key: 'finance_expenses',
        label: 'Kharashaadka (Expenses)',
        module: 'finance',
        tab: 'expenses',
        icon: TrendingDown,
        isVisible: (r) => canAccessModule(r, 'finance'),
      },
      {
        key: 'finance_payroll',
        label: 'Mushaharka (Payroll)',
        module: 'hr',
        tab: 'payroll',
        icon: Briefcase,
        isVisible: (r) => canAccessModule(r, 'hr'),
      },
    ],
  },
  {
    id: 'warbixinno',
    label: 'Warbixinno & MySQL',
    shortLabel: 'Reports',
    icon: FileSpreadsheet,
    modules: ['reports'],
    children: [
      {
        key: 'reports_students',
        label: 'Warbixinta Ardayda',
        module: 'reports',
        tab: 'students_rep',
        icon: Users,
        isVisible: (r) => canAccessModule(r, 'reports'),
      },
      {
        key: 'reports_financial',
        label: 'Warbixinta Maaliyadda',
        module: 'reports',
        tab: 'financial_rep',
        icon: DollarSign,
        isVisible: (r) =>
          canAccessModule(r, 'reports') &&
          (r === 'Super Admin' || r === 'Administrator' || r === 'Accountant'),
      },
      {
        key: 'reports_academic',
        label: 'Warbixinta Waxbarashada',
        module: 'reports',
        tab: 'academic_rep',
        icon: Award,
        isVisible: (r) => canAccessModule(r, 'reports'),
      },
      {
        key: 'reports_mysql',
        label: 'MySQL & XAMPP Export',
        module: 'reports',
        tab: 'mysql',
        icon: Database,
        isVisible: (r) =>
          canAccessModule(r, 'reports') &&
          (r === 'Super Admin' || r === 'Administrator' || r === 'Academic Manager' || r === 'Accountant'),
      },
    ],
  },
  {
    id: 'nidaamka',
    label: 'Nidaamka & Caawinta',
    shortLabel: 'System',
    icon: Settings,
    modules: ['settings', 'support', 'messaging'],
    children: [
      {
        key: 'settings_general',
        label: 'Qaabeynta Guud & Backup',
        module: 'settings',
        tab: 'general',
        icon: Settings,
        isVisible: (r) => canAccessModule(r, 'settings'),
      },
      {
        key: 'settings_accounts',
        label: 'User Accounts & Roles',
        module: 'settings',
        tab: 'accounts',
        icon: Users,
        isVisible: (r) => canAccessModule(r, 'settings'),
      },
      {
        key: 'settings_rbac',
        label: 'RBAC Permissions',
        module: 'settings',
        tab: 'rbac',
        icon: ShieldCheck,
        isVisible: (r) => canAccessModule(r, 'settings'),
      },
      {
        key: 'settings_audit',
        label: 'Audit Trail & Logs',
        module: 'settings',
        tab: 'audit',
        icon: Activity,
        isVisible: (r) => canAccessModule(r, 'settings'),
      },
      {
        key: 'support_tickets',
        label: 'Xarunta Caawinta (Tickets)',
        module: 'support',
        tab: 'tickets',
        icon: HelpCircle,
        isVisible: (r) => canAccessModule(r, 'support'),
      },
      {
        key: 'support_faqs',
        label: 'Su’aalaha & Hagaha (FAQ)',
        module: 'support',
        tab: 'faqs',
        icon: FileQuestion,
        isVisible: (r) => canAccessModule(r, 'support'),
      },
      {
        key: 'messaging_notices',
        label: 'Farriimaha & Ogeysiisyada',
        module: 'messaging',
        tab: 'notices',
        icon: MessageSquare,
        isVisible: (r) => canAccessModule(r, 'messaging'),
      },
    ],
  },
];

export function getVisibleNavigationGroups(
  role: UserRole,
  userPermissions?: string[],
  policies?: RbacPermissionPolicy[]
) {
  return NAVIGATION_GROUPS.map((group) => ({
    ...group,
    children: group.children.filter((child) => {
      const moduleAllowed = canAccessModule(role, child.module, userPermissions, policies);
      if (!moduleAllowed) return false;
      return child.isVisible ? child.isVisible(role) : true;
    }),
  })).filter((group) => group.children.length > 0);
}

export function resolveBreadcrumb(
  role: UserRole,
  activeModule: string,
  activeChildKey: string | null,
  userPermissions?: string[],
  policies?: RbacPermissionPolicy[]
): { group: NavParentGroup | null; child: NavChildItem | null } {
  const groups = getVisibleNavigationGroups(role, userPermissions, policies);

  if (activeChildKey) {
    for (const group of groups) {
      const match = group.children.find((c) => c.key === activeChildKey);
      if (match && match.module === activeModule) {
        return { group, child: match };
      }
    }
  }

  for (const group of groups) {
    const match = group.children.find((c) => c.module === activeModule && !c.action);
    if (match) return { group, child: match };
  }

  for (const group of groups) {
    const match = group.children.find((c) => c.module === activeModule);
    if (match) return { group, child: match };
  }

  return { group: groups[0] || null, child: groups[0]?.children[0] || null };
}
