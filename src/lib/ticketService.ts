import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  SLA_TARGETS,
  Technician,
  TechnicianActiveStatus,
  TechnicianSpecialty,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from '../types/ticket';

function clampStr(val: string, maxLen: number): string {
  return (val || '').trim().slice(0, maxLen);
}

export interface CreateTicketInput {
  ticketNumber: string;
  title: string;
  description: string;
  skpdName: string;
  skpdPicName: string;
  skpdContact: string;
  category: TicketCategory;
  priority: TicketPriority;
  reporterUid: string;
  reporterName: string;
}

export async function createTicket(input: CreateTicketInput): Promise<string> {
  const path = 'tickets';
  const nowMs = Date.now();
  const sla = SLA_TARGETS[input.priority];

  const payload = {
    ticketNumber: clampStr(input.ticketNumber, 24),
    title: clampStr(input.title, 160),
    description: clampStr(input.description, 2000),
    skpdName: clampStr(input.skpdName, 120),
    skpdPicName: clampStr(input.skpdPicName, 100),
    skpdContact: clampStr(input.skpdContact, 60),
    category: input.category,
    priority: input.priority,
    status: 'Baru' as TicketStatus,
    reporterUid: clampStr(input.reporterUid, 128),
    assignedTechId: '',
    assignedTechName: '',
    assignedTechUid: '',
    assignedTechIds: [] as string[],
    assignedTechNames: [] as string[],
    assignedTechUids: [] as string[],
    assignedByUid: '',
    holdReason: '',
    rootCause: '',
    resolutionNotes: '',
    slaResponseTargetMinutes: sla.responseMinutes,
    slaResolutionTargetMinutes: sla.resolutionMinutes,
    reportedAtMs: nowMs,
    assignedAtMs: 0,
    respondedAtMs: 0,
    resolvedAtMs: 0,
    responseMinutes: 0,
    resolutionMinutes: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const ref = await addDoc(collection(db, path), payload);
    await addDoc(collection(db, `${path}/${ref.id}/logs`), {
      actorUid: clampStr(input.reporterUid, 128),
      actorName: clampStr(input.reporterName || input.skpdPicName, 100),
      action: 'Tiket Gangguan Dibuat',
      note: clampStr(`Laporan gangguan ${input.category} (${input.priority}) dari ${input.skpdName}.`, 1000),
      fromStatus: '',
      toStatus: 'Baru',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function assignTechniciansToTicket(params: {
  ticket: Ticket;
  technicians: Technician[];
  adminUid: string;
  adminName: string;
  dispatchNote: string;
}): Promise<void> {
  const { ticket, technicians, adminUid, adminName, dispatchNote } = params;
  const selected = technicians.slice(0, 10);
  if (selected.length === 0) return;

  const path = `tickets/${ticket.id}`;
  const nowMs = Date.now();
  const isFirstResponse = ticket.respondedAtMs === 0;
  const respondedAtMs = isFirstResponse ? nowMs : ticket.respondedAtMs;
  const responseMinutes = isFirstResponse
    ? Math.max(1, Math.round((nowMs - ticket.reportedAtMs) / 60000))
    : ticket.responseMinutes;

  const nextStatus: TicketStatus = ticket.status === 'Baru' ? 'Ditugaskan' : ticket.status;
  const techIds = selected.map((t) => clampStr(t.id, 128));
  const techNames = selected.map((t) => clampStr(t.name, 100));
  const techUids = selected
    .map((t) => clampStr(t.linkedUid, 128))
    .filter((u) => u.length > 0);

  try {
    await updateDoc(doc(db, 'tickets', ticket.id), {
      status: nextStatus,
      assignedTechId: techIds[0] || '',
      assignedTechName: clampStr(techNames.join(', '), 250),
      assignedTechUid: techUids[0] || '',
      assignedTechIds: techIds,
      assignedTechNames: techNames,
      assignedTechUids: techUids,
      assignedByUid: clampStr(adminUid, 128),
      assignedAtMs: nowMs,
      respondedAtMs,
      responseMinutes,
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, `tickets/${ticket.id}/logs`), {
      actorUid: clampStr(adminUid, 128),
      actorName: clampStr(adminName, 100),
      action:
        selected.length > 1
          ? `Penugasan Tim Teknisi (${selected.length} Pegawai)`
          : 'Penugasan Teknisi Kominfo',
      note: clampStr(
        dispatchNote
          ? `Ditugaskan kepada ${techNames.join(', ')}. Catatan: ${dispatchNote}`
          : `Kepala Seksi menunjuk ${techNames.join(', ')} untuk menangani gangguan.`,
        1000
      ),
      fromStatus: ticket.status,
      toStatus: nextStatus,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function startHandlingTicket(params: {
  ticket: Ticket;
  actorUid: string;
  actorName: string;
  note: string;
}): Promise<void> {
  const { ticket, actorUid, actorName, note } = params;
  const path = `tickets/${ticket.id}`;
  const nowMs = Date.now();
  const isFirstResponse = ticket.respondedAtMs === 0;
  const respondedAtMs = isFirstResponse ? nowMs : ticket.respondedAtMs;
  const responseMinutes = isFirstResponse
    ? Math.max(1, Math.round((nowMs - ticket.reportedAtMs) / 60000))
    : ticket.responseMinutes;

  try {
    await updateDoc(doc(db, 'tickets', ticket.id), {
      status: 'Ditangani',
      respondedAtMs,
      responseMinutes,
      holdReason: '',
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, `tickets/${ticket.id}/logs`), {
      actorUid: clampStr(actorUid, 128),
      actorName: clampStr(actorName, 100),
      action: ticket.status === 'On Hold' ? 'Penanganan Dilanjutkan' : 'Penanganan Dimulai',
      note: clampStr(note || 'Teknisi melakukan pengecekan dan perbaikan di lokasi/perangkat.', 1000),
      fromStatus: ticket.status,
      toStatus: 'Ditangani',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function holdTicket(params: {
  ticket: Ticket;
  actorUid: string;
  actorName: string;
  holdReason: string;
}): Promise<void> {
  const { ticket, actorUid, actorName, holdReason } = params;
  const path = `tickets/${ticket.id}`;
  const nowMs = Date.now();
  const respondedAtMs = ticket.respondedAtMs > 0 ? ticket.respondedAtMs : nowMs;
  const responseMinutes =
    ticket.respondedAtMs > 0
      ? ticket.responseMinutes
      : Math.max(1, Math.round((nowMs - ticket.reportedAtMs) / 60000));

  try {
    await updateDoc(doc(db, 'tickets', ticket.id), {
      status: 'On Hold',
      holdReason: clampStr(holdReason, 500),
      respondedAtMs,
      responseMinutes,
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, `tickets/${ticket.id}/logs`), {
      actorUid: clampStr(actorUid, 128),
      actorName: clampStr(actorName, 100),
      action: 'Tiket Ditunda (On Hold)',
      note: clampStr(`Alasan penundaan: ${holdReason}`, 1000),
      fromStatus: ticket.status,
      toStatus: 'On Hold',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resolveTicket(params: {
  ticket: Ticket;
  actorUid: string;
  actorName: string;
  rootCause: string;
  resolutionNotes: string;
}): Promise<void> {
  const { ticket, actorUid, actorName, rootCause, resolutionNotes } = params;
  const path = `tickets/${ticket.id}`;
  const nowMs = Date.now();
  const respondedAtMs = ticket.respondedAtMs > 0 ? ticket.respondedAtMs : nowMs;
  const responseMinutes =
    ticket.respondedAtMs > 0
      ? ticket.responseMinutes
      : Math.max(1, Math.round((nowMs - ticket.reportedAtMs) / 60000));
  const resolutionMinutes = Math.max(1, Math.round((nowMs - ticket.reportedAtMs) / 60000));

  try {
    await updateDoc(doc(db, 'tickets', ticket.id), {
      status: 'Selesai',
      respondedAtMs,
      resolvedAtMs: nowMs,
      responseMinutes,
      resolutionMinutes,
      holdReason: '',
      rootCause: clampStr(rootCause, 500),
      resolutionNotes: clampStr(resolutionNotes, 2000),
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, `tickets/${ticket.id}/logs`), {
      actorUid: clampStr(actorUid, 128),
      actorName: clampStr(actorName, 100),
      action: 'Gangguan Selesai Diperbaiki (Closed)',
      note: clampStr(`Akar Masalah: ${rootCause}. Tindakan: ${resolutionNotes}`, 1000),
      fromStatus: ticket.status,
      toStatus: 'Selesai',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateTicketPriorityOrCategory(params: {
  ticket: Ticket;
  priority: TicketPriority;
  category: TicketCategory;
  actorUid: string;
  actorName: string;
}): Promise<void> {
  const { ticket, priority, category, actorUid, actorName } = params;
  const path = `tickets/${ticket.id}`;
  const sla = SLA_TARGETS[priority];

  try {
    await updateDoc(doc(db, 'tickets', ticket.id), {
      priority,
      category,
      slaResponseTargetMinutes: sla.responseMinutes,
      slaResolutionTargetMinutes: sla.resolutionMinutes,
      updatedAt: serverTimestamp(),
    });

    await addDoc(collection(db, `tickets/${ticket.id}/logs`), {
      actorUid: clampStr(actorUid, 128),
      actorName: clampStr(actorName, 100),
      action: 'Penyesuaian Klasifikasi & SLA',
      note: clampStr(`Prioritas diubah menjadi ${priority} (${category}).`, 1000),
      fromStatus: ticket.status,
      toStatus: ticket.status,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTicketRecord(ticketId: string): Promise<void> {
  const path = `tickets/${ticketId}`;
  try {
    await deleteDoc(doc(db, 'tickets', ticketId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createTechnician(params: {
  name: string;
  nip: string;
  jabatan: string;
  spesialisasi: TechnicianSpecialty;
  statusAktif: TechnicianActiveStatus;
  linkedUid: string;
  createdBy: string;
}): Promise<string> {
  const path = 'technicians';
  const cleanLinkedUid = clampStr(params.linkedUid, 128);
  try {
    const ref = await addDoc(collection(db, path), {
      name: clampStr(params.name, 100),
      nip: clampStr(params.nip, 35),
      jabatan: clampStr(params.jabatan, 100),
      spesialisasi: params.spesialisasi,
      statusAktif: params.statusAktif,
      linkedUid: cleanLinkedUid,
      createdBy: clampStr(params.createdBy, 128),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (cleanLinkedUid) {
      await setDoc(doc(db, 'staff_grants', cleanLinkedUid), {
        uid: cleanLinkedUid,
        role: 'teknisi',
        grantedBy: clampStr(params.createdBy, 128),
        createdAt: serverTimestamp(),
      });
    }
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTechnician(
  techId: string,
  updates: {
    name: string;
    nip: string;
    jabatan: string;
    spesialisasi: TechnicianSpecialty;
    statusAktif: TechnicianActiveStatus;
    linkedUid: string;
  },
  actorUid?: string
): Promise<void> {
  const path = `technicians/${techId}`;
  const cleanLinkedUid = clampStr(updates.linkedUid, 128);
  try {
    await updateDoc(doc(db, 'technicians', techId), {
      name: clampStr(updates.name, 100),
      nip: clampStr(updates.nip, 35),
      jabatan: clampStr(updates.jabatan, 100),
      spesialisasi: updates.spesialisasi,
      statusAktif: updates.statusAktif,
      linkedUid: cleanLinkedUid,
      updatedAt: serverTimestamp(),
    });

    if (cleanLinkedUid && actorUid) {
      await setDoc(doc(db, 'staff_grants', cleanLinkedUid), {
        uid: cleanLinkedUid,
        role: 'teknisi',
        grantedBy: clampStr(actorUid, 128),
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateUserProfileSelf(
  uid: string,
  displayName: string,
  unitSkpd: string
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      displayName: clampStr(displayName, 100),
      unitSkpd: clampStr(unitSkpd, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpdateUserRole(params: {
  targetUid: string;
  targetEmail: string;
  role: UserRole;
  unitSkpd: string;
  displayName: string;
  grantedByUid: string;
  autoAddTechnician?: boolean;
  existingTechnicians?: Technician[];
  nip?: string;
  spesialisasi?: TechnicianSpecialty;
}): Promise<void> {
  const path = `users/${params.targetUid}`;
  try {
    const nextUnitSkpd =
      params.role === 'teknisi' || params.role === 'kepala_seksi'
        ? 'Diskominfo - Seksi Infrastruktur & Jaringan'
        : params.unitSkpd;

    await updateDoc(doc(db, 'users', params.targetUid), {
      role: params.role,
      unitSkpd: clampStr(nextUnitSkpd, 120),
      displayName: clampStr(params.displayName, 100),
      updatedAt: serverTimestamp(),
    });

    if (params.role === 'kepala_seksi') {
      await setDoc(doc(db, 'admins', params.targetUid), {
        uid: clampStr(params.targetUid, 128),
        email: clampStr(params.targetEmail, 120),
        grantedBy: clampStr(params.grantedByUid, 128),
        createdAt: serverTimestamp(),
      });
      await setDoc(doc(db, 'staff_grants', params.targetUid), {
        uid: clampStr(params.targetUid, 128),
        role: 'kepala_seksi',
        grantedBy: clampStr(params.grantedByUid, 128),
        createdAt: serverTimestamp(),
      });
    } else if (params.role === 'teknisi') {
      await setDoc(doc(db, 'staff_grants', params.targetUid), {
        uid: clampStr(params.targetUid, 128),
        role: 'teknisi',
        grantedBy: clampStr(params.grantedByUid, 128),
        createdAt: serverTimestamp(),
      });

      const alreadyLinked = (params.existingTechnicians || []).some(
        (t) => t.linkedUid === params.targetUid
      );
      if (params.autoAddTechnician && !alreadyLinked) {
        await addDoc(collection(db, 'technicians'), {
          name: clampStr(params.displayName, 100),
          nip: clampStr(params.nip || 'Pegawai Kominfo', 35),
          jabatan: 'Teknisi Infrastruktur & Jaringan',
          spesialisasi: params.spesialisasi || 'Jaringan & Fiber Optik',
          statusAktif: 'aktif',
          linkedUid: clampStr(params.targetUid, 128),
          createdBy: clampStr(params.grantedByUid, 128),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } else {
      // Demoted back to pelapor_skpd: remove staff/admin grants cleanly
      try {
        await deleteDoc(doc(db, 'staff_grants', params.targetUid));
      } catch {
        // Ignore if doc did not exist
      }
      try {
        await deleteDoc(doc(db, 'admins', params.targetUid));
      } catch {
        // Ignore if doc did not exist
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
