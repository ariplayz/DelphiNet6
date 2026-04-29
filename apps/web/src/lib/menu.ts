import type { TopMenu } from '../components/TopNav';

/**
 * DelphiNet 6 navigation tree — mirrors the legacy DelphiNet 5 dropdowns
 * (Home, Students & School, Parents, …) for muscle-memory continuity.
 *
 * Each leaf is permission/role-gated; submenus auto-collapse if all of
 * their children are hidden.
 */
export const TOP_MENUS: TopMenu[] = [
  {
    label: 'Home',
    items: [
      {
        kind: 'group',
        label: 'Ethics Reports',
        items: [
          { kind: 'link', label: 'Write/Review Reports', to: '/ethics' },
          { kind: 'link', label: 'My Report History', to: '/ethics/history' },
          {
            kind: 'link',
            label: 'Campus Ethics Reports',
            to: '/ethics/campus',
            anyOf: ['ethics.review'],
          },
        ],
      },
      { kind: 'link', label: 'Math Facts', to: '/tools/math-facts' },
      { kind: 'link', label: 'Hard to Find Words', to: '/tools/htfw' },
      {
        kind: 'link',
        label: 'Meal Menus',
        to: 'https://www.sagedining.com/menus/delphianschool',
        external: true,
      },
    ],
  },
  {
    label: 'Students & School',
    items: [
      {
        kind: 'group',
        label: 'Info / Reports',
        items: [
          {
            kind: 'group',
            label: 'By Student',
            items: [
              { kind: 'link', label: 'Student Schedule & Info', to: '/me/schedule', studentOnly: true },
              { kind: 'link', label: 'Student Schedule (lookup)', to: '/students/lookup', anyOf: ['students.view_all'] },
              { kind: 'link', label: 'Student Program', to: '/programs', studentOnly: true },
              { kind: 'link', label: 'My Attendance', to: '/me/attendance', studentOnly: true },
            ],
          },
          {
            kind: 'group',
            label: 'All Students',
            anyOf: ['students.view_all'],
            items: [
              { kind: 'link', label: 'Report Generator (Students By Term)', to: '/reports/by-term' },
              { kind: 'link', label: 'All Student Class Schedules', to: '/reports/class-schedules' },
              { kind: 'link', label: 'Attendance Report', to: '/reports/attendance' },
              { kind: 'link', label: 'Photo Display', to: '/reports/photos' },
              { kind: 'link', label: '+/- Days Report By Student', to: '/reports/plus-minus' },
              { kind: 'link', label: 'Five Week +/- Days Report', to: '/reports/plus-minus-5wk' },
              { kind: 'link', label: 'Dorm Lists', to: '/dorms' },
            ],
          },
          {
            kind: 'group',
            label: 'Rosters',
            anyOf: ['attendance.record', 'roster.view', 'students.view_all'],
            items: [
              { kind: 'link', label: 'Academic Rosters', to: '/classes' },
              { kind: 'link', label: 'Seminar Rosters', to: '/seminars', anyOf: ['seminar.view'] },
              { kind: 'link', label: 'Afternoon Class Rosters', to: '/rosters/afternoon' },
              { kind: 'link', label: 'Student Service Rosters', to: '/rosters/student-service' },
              { kind: 'link', label: 'Night Class/Activity Rosters', to: '/rosters/night' },
              { kind: 'link', label: 'List of Classes Offered', to: '/rosters/offered' },
            ],
          },
          {
            kind: 'group',
            label: 'Sports',
            items: [
              {
                kind: 'link',
                label: 'All Sports Schedules',
                to: 'https://www.delphian.org/page.cfm?p=370',
                external: true,
              },
            ],
          },
        ],
      },
      {
        kind: 'group',
        label: 'Academics',
        items: [
          { kind: 'link', label: 'College Applications', to: '/college-applications' },
        ],
      },
      {
        kind: 'group',
        label: 'Standards',
        items: [
          { kind: 'link', label: 'Off Course Correction Assignments', to: '/standards/cram' },
          { kind: 'link', label: 'My Success Story Entry', to: '/standards/success-stories' },
        ],
      },
      {
        kind: 'group',
        label: 'Routing',
        items: [
          { kind: 'link', label: 'My Routes To Handle', to: '/routing/inbox' },
          { kind: 'link', label: 'Start Route', to: '/routing/start' },
          { kind: 'link', label: 'Route Lookup By Student', to: '/routing/lookup', anyOf: ['students.view_all'] },
        ],
      },
    ],
  },
  {
    label: 'Roll Call',
    items: [
      { kind: 'link', label: 'Class Roll Call', to: '/roll-call', anyOf: ['attendance.record'], requiresAssignment: 'supervisedClasses' },
      { kind: 'link', label: 'Dorm Roll Call', to: '/dorm-roll-call', anyOf: ['dorm.roll_call'], requiresAssignment: 'captainDorms' },
      { kind: 'link', label: 'Verification Queue', to: '/verification', anyOf: ['attendance.verify'], requiresAssignment: 'pendingVerifications' },
      { kind: 'link', label: 'Seminar Roll Call', to: '/seminar-roll-call', anyOf: ['seminar.lead'], requiresAssignment: 'ledSeminars' },
    ],
  },
  {
    label: 'Parents',
    items: [
      { kind: 'link', label: 'Student Info', to: '/parents/student-info', anyOf: ['parent.view'] },
    ],
  },
  {
    label: 'Admin',
    items: [
      { kind: 'link', label: 'Users', to: '/admin/users', anyOf: ['users.manage'] },
      { kind: 'link', label: 'Roles & Permissions', to: '/admin/roles', anyOf: ['roles.assign'] },
      { kind: 'link', label: 'Site Analytics', to: '/admin/stats', anyOf: ['analytics.view'] },
      { kind: 'link', label: 'Manage Classes', to: '/classes', anyOf: ['class.manage'] },
      { kind: 'link', label: 'Manage Dorms', to: '/dorms', anyOf: ['dorm.manage'] },
    ],
  },
];
