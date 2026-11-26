# Security Specification — SI-TIKET Jaringan (Diskominfo)

## 1. Data Invariants
1. **Identity Integrity**: Every user profile (`/users/{userId}`), ticket (`/tickets/{ticketId}`), and ticket audit log (`/tickets/{ticketId}/logs/{logId}`) MUST enforce `uid == request.auth.uid` / `reporterUid == request.auth.uid` / `actorUid == request.auth.uid` on creation.
2. **No Self-Assigned Roles**: Newly registered users in `/users/{userId}` cannot assign themselves `kepala_seksi` or `teknisi` roles unless verified as the bootstrapped Kepala Seksi (`sesere96@gmail.com` with `email_verified == true`) or elevated by an existing admin.
3. **Immutable Audit & Core Ticket Identifiers**: `ticketNumber`, `reporterUid`, `reportedAtMs`, and `createdAt` on `/tickets/{ticketId}` are strictly immutable after creation. Audit logs under `/tickets/{ticketId}/logs/{logId}` are append-only (`update` and `delete` are denied).
4. **Terminal State Locking**: Once a ticket reaches `status == 'Selesai'`, non-admin users (technicians and reporters) are blocked from modifying the ticket further. Only `isAdmin()` (Kepala Seksi) can reopen or adjust a completed ticket.
5. **Temporal Integrity**: All `createdAt` and `updatedAt` timestamps MUST equal `request.time`.
6. **PII Isolation & Query Enforcement**: `/users/{userId}` (containing `email`) is readable only by the owner or `isAdmin()`. Every `allow list` rule enforces `resource.data` ownership/assignment or `isBootstrappedAdmin()` without any `get()`/`exists()` calls.
7. **Master Gate on Subcollections**: `/tickets/{ticketId}/logs/{logId}` verifies parent ticket existence and authorization via `exists()` and `get()` on `/tickets/{ticketId}`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Role Escalation**: `POST /users/attackerUid` with `{ role: "kepala_seksi", ... }` by non-admin -> `PERMISSION_DENIED`.
2. **Shadow Field Injection on Ticket**: `POST /tickets/t1` with extra ghost field `isApprovedBypass: true` -> `PERMISSION_DENIED`.
3. **Identity Spoofing on Ticket Creation**: `POST /tickets/t2` with `reporterUid: "victimUid"` when `auth.uid == "attackerUid"` -> `PERMISSION_DENIED`.
4. **Unverified Email Bypass**: Admin email with `email_verified: false` attempting admin write -> `PERMISSION_DENIED`.
5. **ID Poisoning**: Document ID `../../etc/passwd` or 200-char random junk ID -> `PERMISSION_DENIED` (`isValidId` regex & size guard).
6. **Denial of Wallet String Flood**: Ticket `description` with 10,000 characters -> `PERMISSION_DENIED` (`size() <= 2000`).
7. **Timestamp Forgery**: `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> `PERMISSION_DENIED`.
8. **Technician Reassignment Hijack**: Assigned technician attempting `affectedKeys` containing `assignedTechUid` or `priority` -> `PERMISSION_DENIED`.
9. **Post-Completion Tampering**: Technician attempting to alter `resolutionNotes` after ticket `status == 'Selesai'` -> `PERMISSION_DENIED`.
10. **PII Blanket Read**: Non-admin user calling `list` or `get` on `/users/otherUid` -> `PERMISSION_DENIED`.
11. **Orphaned Audit Log**: Creating `/tickets/nonExistentId/logs/log1` -> `PERMISSION_DENIED`.
12. **Audit Log Erasure**: Attempting `delete` or `update` on `/tickets/t1/logs/log1` -> `PERMISSION_DENIED`.

## 3. Security Rules Test Runner (`firestore.rules.test.ts` Reference)
```ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import fs from 'fs';

async function runSecurityTests() {
  const testEnv = await initializeTestEnvironment({
    projectId: 'si-tiket-diskominfo-test',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });

  const skpdCtx = testEnv.authenticatedContext('skpd_user_1', {
    email: 'operator@bappeda.go.id',
    email_verified: true,
  });
  const adminCtx = testEnv.authenticatedContext('admin_1', {
    email: 'sesere96@gmail.com',
    email_verified: true,
  });

  // Dirty Dozen #1: Self-role escalation must fail
  await assertFails(
    skpdCtx.firestore().collection('users').doc('skpd_user_1').set({
      uid: 'skpd_user_1',
      displayName: 'Operator Bappeda',
      email: 'operator@bappeda.go.id',
      role: 'kepala_seksi',
      unitSkpd: 'Bappeda',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  );

  // Dirty Dozen #10: PII blanket read must fail
  await assertFails(skpdCtx.firestore().collection('users').get());

  // Valid admin read succeeds
  await assertSucceeds(adminCtx.firestore().collection('tickets').get());

  await testEnv.cleanup();
}

export { runSecurityTests };
```
