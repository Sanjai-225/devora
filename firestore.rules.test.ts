/**
 * Devora Firestore Security Rules Test Suite — Verifies all 12 "Dirty Dozen" adversarial payloads
 * return PERMISSION_DENIED.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TEST_CASES: DirtyDozenTestCase[] = [
  {
    id: 1,
    name: 'Unverified Email Write',
    collection: '/projects/proj_1',
    operation: 'create',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: false },
    payload: { id: 'proj_1', userId: 'user_A', name: 'Site' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-User PII Read',
    collection: '/users/user_A',
    operation: 'get',
    auth: { uid: 'user_B', email: 'b@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Role Self-Escalation',
    collection: '/users/user_A',
    operation: 'create',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { uid: 'user_A', email: 'a@example.com', displayName: 'A', role: 'superadmin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow Field Injection',
    collection: '/projects/proj_1',
    operation: 'create',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { id: 'proj_1', userId: 'user_A', name: 'Site', isVerified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Identity Spoofing on Project Create',
    collection: '/projects/proj_1',
    operation: 'create',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { id: 'proj_1', userId: 'user_B', name: 'Site' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'ID Poisoning Attack',
    collection: '/projects/' + 'x'.repeat(200),
    operation: 'create',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { id: 'x'.repeat(200), userId: 'user_A', name: 'Site' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Value Poisoning on Project Update',
    collection: '/projects/proj_1',
    operation: 'update',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { name: 'A'.repeat(500) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable Field Mutation',
    collection: '/projects/proj_1',
    operation: 'update',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { userId: 'user_B' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Terminal State Bypass',
    collection: '/projects/proj_archived',
    operation: 'update',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { status: 'ready' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Orphaned Subcollection Write',
    collection: '/projects/non_existent/conversations/msg_1',
    operation: 'create',
    auth: { uid: 'user_A', email: 'a@example.com', email_verified: true },
    payload: { id: 'msg_1', projectId: 'non_existent', userId: 'user_A', role: 'user', content: 'Hi', stage: 'init' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Cross-Project Subcollection Injection',
    collection: '/projects/proj_A/designVersions/v_1',
    operation: 'create',
    auth: { uid: 'user_B', email: 'b@example.com', email_verified: true },
    payload: { id: 'v_1', projectId: 'proj_A', userId: 'user_B', versionNumber: 1 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Unfiltered List Scraping',
    collection: '/projects',
    operation: 'list',
    auth: { uid: 'user_B', email: 'b@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
