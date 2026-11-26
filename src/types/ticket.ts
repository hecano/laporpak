export type UserRole = 'kepala_seksi' | 'teknisi' | 'pelapor_skpd';

export type TicketCategory =
  | 'Jaringan LAN/WAN'
  | 'Server & Hosting'
  | 'Internet & Bandwidth'
  | 'VPN & Interkoneksi'
  | 'Keamanan Jaringan'
  | 'Perangkat Router/Switch';

export type TicketPriority = 'Kritis' | 'Tinggi' | 'Sedang' | 'Rendah';

export type TicketStatus = 'Baru' | 'Ditugaskan' | 'Ditangani' | 'On Hold' | 'Selesai';

export type TicketBucketFilter = 'semua' | 'open' | 'on_hold' | 'closed';

export type TechnicianSpecialty =
  | 'Jaringan & Fiber Optik'
  | 'Server & Data Center'
  | 'Keamanan & Firewall'
  | 'Wireless & Akses Publik';

export type TechnicianActiveStatus = 'aktif' | 'lapangan' | 'cuti';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  unitSkpd: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Technician {
  id: string;
  name: string;
  nip: string;
  jabatan: string;
  spesialisasi: TechnicianSpecialty;
  statusAktif: TechnicianActiveStatus;
  linkedUid: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  skpdName: string;
  skpdPicName: string;
  skpdContact: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  reporterUid: string;
  assignedTechId: string;
  assignedTechName: string;
  assignedTechUid: string;
  assignedTechIds: string[];
  assignedTechNames: string[];
  assignedTechUids: string[];
  assignedByUid: string;
  holdReason: string;
  rootCause: string;
  resolutionNotes: string;
  slaResponseTargetMinutes: number;
  slaResolutionTargetMinutes: number;
  reportedAtMs: number;
  assignedAtMs: number;
  respondedAtMs: number;
  resolvedAtMs: number;
  responseMinutes: number;
  resolutionMinutes: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TicketLog {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  note: string;
  fromStatus: '' | TicketStatus;
  toStatus: TicketStatus;
  createdAt?: unknown;
}

export type ReportPeriodType = 'bulanan' | 'triwulanan';

export const TICKET_CATEGORIES: TicketCategory[] = [
  'Jaringan LAN/WAN',
  'Server & Hosting',
  'Internet & Bandwidth',
  'VPN & Interkoneksi',
  'Keamanan Jaringan',
  'Perangkat Router/Switch',
];

export const TICKET_PRIORITIES: TicketPriority[] = [
  'Kritis',
  'Tinggi',
  'Sedang',
  'Rendah',
];

export const TICKET_STATUSES: TicketStatus[] = [
  'Baru',
  'Ditugaskan',
  'Ditangani',
  'On Hold',
  'Selesai',
];

export const TECHNICIAN_SPECIALTIES: TechnicianSpecialty[] = [
  'Jaringan & Fiber Optik',
  'Server & Data Center',
  'Keamanan & Firewall',
  'Wireless & Akses Publik',
];

export const SKPD_PRESETS: string[] = [
  'Badan Perencanaan Pembangunan Daerah (Bappeda)',
  'Dinas Kesehatan',
  'Dinas Pendidikan dan Kebudayaan',
  'Dinas Pekerjaan Umum dan Penataan Ruang (PUPR)',
  'Badan Pengelola Keuangan dan Aset Daerah (BPKAD)',
  'Dinas Kependudukan dan Pencatatan Sipil (Dukcapil)',
  'Inspektorat Daerah',
  'Sekretariat Daerah (Setda)',
  'RSUD Daerah',
  'Dinas Perhubungan',
  'Dinas Penanaman Modal dan PTSP',
  'Badan Kepegawaian Daerah (BKD)',
];

export const SLA_TARGETS: Record<
  TicketPriority,
  { responseMinutes: number; resolutionMinutes: number; label: string }
> = {
  Kritis: {
    responseMinutes: 15,
    resolutionMinutes: 120,
    label: 'Respon ≤ 15 mnt · Selesai ≤ 2 jam',
  },
  Tinggi: {
    responseMinutes: 30,
    resolutionMinutes: 240,
    label: 'Respon ≤ 30 mnt · Selesai ≤ 4 jam',
  },
  Sedang: {
    responseMinutes: 60,
    resolutionMinutes: 480,
    label: 'Respon ≤ 1 jam · Selesai ≤ 8 jam',
  },
  Rendah: {
    responseMinutes: 120,
    resolutionMinutes: 1440,
    label: 'Respon ≤ 2 jam · Selesai ≤ 24 jam',
  },
};

export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const QUARTER_OPTIONS = [
  { value: 1, label: 'Triwulan I (Januari – Maret)', months: [0, 1, 2] },
  { value: 2, label: 'Triwulan II (April – Juni)', months: [3, 4, 5] },
  { value: 3, label: 'Triwulan III (Juli – September)', months: [6, 7, 8] },
  { value: 4, label: 'Triwulan IV (Oktober – Desember)', months: [9, 10, 11] },
];

export function normalizeTicket(id: string, raw: Record<string, unknown>): Ticket {
  const base = raw as Omit<Ticket, 'id' | 'assignedTechIds' | 'assignedTechNames' | 'assignedTechUids' | 'holdReason'> & {
    assignedTechIds?: string[];
    assignedTechNames?: string[];
    assignedTechUids?: string[];
    holdReason?: string;
  };
  const assignedTechIds = Array.isArray(base.assignedTechIds)
    ? base.assignedTechIds
    : base.assignedTechId
    ? [base.assignedTechId]
    : [];
  const assignedTechNames = Array.isArray(base.assignedTechNames)
    ? base.assignedTechNames
    : base.assignedTechName
    ? [base.assignedTechName]
    : [];
  const assignedTechUids = Array.isArray(base.assignedTechUids)
    ? base.assignedTechUids
    : base.assignedTechUid
    ? [base.assignedTechUid]
    : [];

  return {
    ...base,
    id,
    assignedTechIds,
    assignedTechNames,
    assignedTechUids,
    holdReason: base.holdReason || '',
  };
}

export function getAssignedTechLabel(ticket: Ticket): string {
  if (ticket.assignedTechNames && ticket.assignedTechNames.length > 0) {
    return ticket.assignedTechNames.join(', ');
  }
  return ticket.assignedTechName || '';
}

export function isTicketAssignedToUser(
  ticket: Ticket,
  uid: string,
  linkedTechIds: string[] = []
): boolean {
  if (ticket.assignedTechUid === uid) return true;
  if (ticket.assignedTechUids?.includes(uid)) return true;
  if (linkedTechIds.some((tid) => tid === ticket.assignedTechId || ticket.assignedTechIds?.includes(tid))) {
    return true;
  }
  return false;
}

export function matchesTicketBucket(status: TicketStatus, bucket: TicketBucketFilter): boolean {
  if (bucket === 'semua') return true;
  if (bucket === 'open') return status === 'Baru' || status === 'Ditugaskan' || status === 'Ditangani';
  if (bucket === 'on_hold') return status === 'On Hold';
  return status === 'Selesai';
}

export function formatDurationMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return '—';
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} mnt`;
  const hours = Math.floor(rounded / 60);
  const rem = rounded % 60;
  if (hours < 24) {
    return rem > 0 ? `${hours}j ${rem}m` : `${hours} jam`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}h ${remHours}j` : `${days} hari`;
}

export function formatDateTimeId(ms: number): string {
  if (!ms || ms <= 0) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ms));
}

export function formatDateShortId(ms: number): string {
  if (!ms || ms <= 0) return '—';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ms));
}

export function getResponseSlaEvaluation(ticket: Ticket): {
  status: 'sesuai' | 'terlambat' | 'menunggu';
  label: string;
} {
  if (ticket.respondedAtMs <= 0) {
    const elapsedMin = Math.max(0, Math.round((Date.now() - ticket.reportedAtMs) / 60000));
    if (elapsedMin > ticket.slaResponseTargetMinutes) {
      return { status: 'terlambat', label: `Terlambat (${formatDurationMinutes(elapsedMin)})` };
    }
    return { status: 'menunggu', label: 'Menunggu Respon' };
  }
  if (ticket.responseMinutes <= ticket.slaResponseTargetMinutes) {
    return { status: 'sesuai', label: 'Sesuai SLA' };
  }
  return { status: 'terlambat', label: 'Melebihi SLA' };
}

export function getResolutionSlaEvaluation(ticket: Ticket): {
  status: 'sesuai' | 'terlambat' | 'berjalan';
  label: string;
} {
  if (ticket.resolvedAtMs <= 0 || ticket.status !== 'Selesai') {
    if (ticket.status === 'On Hold') {
      return { status: 'berjalan', label: 'Ditunda (On Hold)' };
    }
    const elapsedMin = Math.max(0, Math.round((Date.now() - ticket.reportedAtMs) / 60000));
    if (elapsedMin > ticket.slaResolutionTargetMinutes) {
      return { status: 'terlambat', label: 'Melebihi Target' };
    }
    return { status: 'berjalan', label: 'Dalam Proses' };
  }
  if (ticket.resolutionMinutes <= ticket.slaResolutionTargetMinutes) {
    return { status: 'sesuai', label: 'Sesuai SLA' };
  }
  return { status: 'terlambat', label: 'Melebihi SLA' };
}

export function generateTicketNumber(existingTickets: Ticket[], year: number): string {
  const prefix = `TIK-${year}-`;
  let maxSeq = 0;
  for (const t of existingTickets) {
    if (t.ticketNumber.startsWith(prefix)) {
      const seq = Number.parseInt(t.ticketNumber.slice(prefix.length), 10);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}
