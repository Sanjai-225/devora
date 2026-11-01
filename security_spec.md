# Devora — Firestore Security Specification (Phase 0 Security TDD)

## 1. Data Invariants
1. **User Isolation (`/users/{userId}`)**: A user profile can only be read, created, or updated by the authenticated user whose `request.auth.uid == userId` and `request.auth.token.email_verified == true`. Users cannot escalate their `role` beyond `'individual'`.
2. **Project Ownership (`/projects/{projectId}`)**: A project document can only be created, read, listed, updated, or deleted if `userId == request.auth.uid`. `id`, `userId`, and `createdAt` are immutable after creation. Once `status == 'archived'`, no further updates are permitted.
3. **Subcollection Master Gate (`/projects/{projectId}/conversations/{messageId}` & `/projects/{projectId}/designVersions/{versionId}`)**: Every subcollection document must reference an existing parent `/projects/{projectId}` owned by `request.auth.uid` (`get(/databases/$(database)/documents/projects/$(projectId)).data.userId == request.auth.uid`), and `incoming().projectId == projectId` and `incoming().userId == request.auth.uid`.
4. **Strict Timestamps**: All `createdAt` and `updatedAt` fields must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting to create `/projects/proj_1`.
2. **Cross-User PII Read**: `user_B` attempting `get(/users/user_A)`.
3. **Role Self-Escalation**: `user_A` creating `/users/user_A` with `role: "admin"` or updating `role` to `"team"`.
4. **Shadow Field Injection**: Creating `/projects/proj_1` with an undeclared field `isVerified: true`.
5. **Identity Spoofing on Project Create**: `user_A` creating `/projects/proj_1` with `userId: "user_B"`.
6. **ID Poisoning Attack**: Creating a project with a 500-character document ID containing special characters.
7. **Value Poisoning on Project Update**: Updating `name` on `/projects/proj_1` with a 50,000-character string or a boolean.
8. **Immutable Field Mutation**: Updating `userId` or `createdAt` on an existing `/projects/proj_1`.
9. **Terminal State Bypass**: Updating `/projects/proj_1` after `status` has transitioned to `'archived'`.
10. **Orphaned Subcollection Write**: Creating `/projects/non_existent/conversations/msg_1` where parent project does not exist.
11. **Cross-Project Subcollection Injection**: `user_B` creating `/projects/proj_owned_by_A/designVersions/v_1`.
12. **Unfiltered List Scraping**: `user_B` executing an unconstrained `list` query on `/projects` without `where('userId', '==', 'user_B')`.
