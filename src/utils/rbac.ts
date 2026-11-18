/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RbacPermissionPolicy, UserRole } from '../types';

export const ROLE_ALLOWED_MODULES: Record<UserRole, string[]> = {
  'Super Admin': [
    'dashboard',
    'students',
    'student_portal',
    'classes',
    'teachers',
    'attendance',
    'exams',
    'exam_cards',
    'fees',
    'finance',
    'hr',
    'timetable',
    'messaging',
    'reports',
    'settings',
    'support',
  ],
  Administrator: [
    'dashboard',
    'students',
    'student_portal',
    'classes',
    'teachers',
    'attendance',
    'exams',
    'exam_cards',
    'fees',
    'finance',
    'hr',
    'timetable',
    'messaging',
    'reports',
    'settings',
    'support',
  ],
  'Academic Manager': [
    'dashboard',
    'students',
    'classes',
    'teachers',
    'attendance',
    'exams',
    'exam_cards',
    'timetable',
    'messaging',
    'reports',
    'support',
  ],
  Accountant: [
    'dashboard',
    'students',
    'fees',
    'finance',
    'hr',
    'messaging',
    'reports',
    'support',
  ],
  Teacher: [
    'dashboard',
    'classes',
    'attendance',
    'exams',
    'timetable',
    'hr',
    'messaging',
    'support',
  ],
  'HR Manager': [
    'dashboard',
    'teachers',
    'hr',
    'attendance',
    'messaging',
    'support',
  ],
  Receptionist: [
    'dashboard',
    'students',
    'attendance',
    'fees',
    'messaging',
    'support',
  ],
  Institute: [
    'dashboard',
    'classes',
    'teachers',
    'reports',
    'messaging',
    'support',
  ],
  Student: ['student_portal', 'messaging', 'support'],
  Parent: ['student_portal', 'messaging', 'support'],
};

export function canAccessModule(
  role: UserRole,
  moduleId: string,
  userPermissions?: string[],
  policies?: RbacPermissionPolicy[]
): boolean {
  if (role === 'Super Admin') return true;
  if (Array.isArray(userPermissions) && userPermissions.length > 0) {
    return userPermissions.includes(moduleId);
  }
  if (Array.isArray(policies) && policies.length > 0) {
    const policy = policies.find((p) => p.role === role);
    if (policy) {
      return policy.modules.includes(moduleId);
    }
  }
  const allowed = ROLE_ALLOWED_MODULES[role] || [];
  return allowed.includes(moduleId);
}

export function getDefaultModuleForRole(role: UserRole): string {
  if (role === 'Student' || role === 'Parent') {
    return 'student_portal';
  }
  return 'dashboard';
}

export const ROLE_LABELS_SOMALI: Record<UserRole, string> = {
  'Super Admin': 'Maamulaha Guud (Super Admin)',
  Administrator: 'Maamulka Dugsiga (Administrator)',
  'Academic Manager': 'Madaxa Waxbarashada (Academic)',
  Accountant: 'Xisaabiyaha (Accountant)',
  Teacher: 'Macallinka (Teacher)',
  'HR Manager': 'Madaxa Shaqaalaha (HR Manager)',
  Receptionist: 'Soo-dhoweeyaha (Receptionist)',
  Institute: 'Machadka (Institute View)',
  Student: 'Ardayga (Student)',
  Parent: 'Waalidka (Parent / Guardian)',
};
