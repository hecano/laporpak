import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { CheckCircle2, PauseCircle, Play, Trash2, UserCheck, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  assignTechniciansToTicket,
  deleteTicketRecord,
  holdTicket,
  resolveTicket,
  startHandlingTicket,
  updateTicketPriorityOrCategory,
} from '../lib/ticketService';
import {
  formatDateTimeId,
  formatDurationMinutes,
  getAssignedTechLabel,
  getResolutionSlaEvaluation,
  getResponseSlaEvaluation,
  isTicketAssignedToUser,
  Technician,
  Ticket,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TicketCategory,
  TicketLog,
  TicketPriority,
  UserProfile,
  UserRole,
} from '../types/ticket';

interface TicketDetailModalProps {
  ticket: Ticket;
  technicians: Technician[];
  userProfile: UserProfile;
  effectiveRole: UserRole;
  onClose: () => void;
}

export function TicketDetailModal({
  ticket,
  technicians,
  userProfile,
  effectiveRole,
  onClose,
}: TicketDetailModalProps) {
  const [logs, setLogs] = useState<TicketLog[]>([]);
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>(
    ticket.assignedTechIds && ticket.assignedTechIds.length > 0
      ? ticket.assignedTechIds
      : ticket.assignedTechId
      ? [ticket.assignedTechId]
      : []
  );
  const [dispatchNote, setDispatchNote] = useState('');
  const [handlingNote, setHandlingNote] = useState('');
  const [holdReason, setHoldReason] = useState(ticket.holdReason || '');
  const [rootCause, setRootCause] = useState(ticket.rootCause || '');
  const [resolutionNotes, setResolutionNotes] = useState(ticket.resolutionNotes || '');
  const [editPriority, setEditPriority] = useState<TicketPriority>(ticket.priority);
  const [editCategory, setEditCategory] = useState<TicketCategory>(ticket.category);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isRealKepalaSeksi = userProfile.role === 'kepala_seksi';
  const isKepalaSeksiView = effectiveRole === 'kepala_seksi' && isRealKepalaSeksi;
  const isPelaporView = effectiveRole === 'pelapor_skpd';

  const linkedTechIds = technicians
    .filter((t) => t.linkedUid === userProfile.uid)
    .map((t) => t.id);
  const isAssignedTech = isTicketAssignedToUser(ticket, userProfile.uid, linkedTechIds);
  const canOperateTicket =
    !isPelaporView &&
    (isRealKepalaSeksi || (isAssignedTech && ticket.status !== 'Selesai'));

  useEffect(() => {
    const logsPath = `tickets/${ticket.id}/logs`;
    const baseCol = collection(db, logsPath);
    const isStaffRole = userProfile.role === 'kepala_seksi' || userProfile.role === 'teknisi';
    const q = isStaffRole
      ? query(baseCol, orderBy('createdAt', 'desc'))
      : query(baseCol, where('actorUid', '==', userProfile.uid));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: TicketLog[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TicketLog, 'id'>),
        }));
        setLogs(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, logsPath);
      }
    );
    return () => unsub();
  }, [ticket.id, userProfile.role, userProfile.uid]);

  const respEval = getResponseSlaEvaluation(ticket);
  const resEval = getResolutionSlaEvaluation(ticket);
  const techLabel = getAssignedTechLabel(ticket);

  function toggleTechSelection(techId: string) {
    setSelectedTechIds((prev) => {
      if (prev.includes(techId)) {
        return prev.filter((id) => id !== techId);
      }
      if (prev.length >= 10) return prev;
      return [...prev, techId];
    });
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    const chosen = technicians.filter((t) => selectedTechIds.includes(t.id));
    if (chosen.length === 0) {
      setErrorMsg('Pilih minimal 1 pegawai/teknisi Kominfo untuk ditugaskan.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      await assignTechniciansToTicket({
        ticket,
        technicians: chosen,
        adminUid: userProfile.uid,
        adminName: userProfile.displayName,
        dispatchNote: dispatchNote.trim(),
      });
      setDispatchNote('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menunjuk teknisi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleStartHandling() {
    setBusy(true);
    setErrorMsg(null);
    try {
      await startHandlingTicket({
        ticket,
        actorUid: userProfile.uid,
        actorName: userProfile.displayName,
        note: handlingNote.trim(),
      });
      setHandlingNote('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui status penanganan.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePutOnHold(e: React.FormEvent) {
    e.preventDefault();
    if (holdReason.trim().length < 4) {
      setErrorMsg('Alasan penundaan (On Hold) wajib diisi minimal 4 karakter.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      await holdTicket({
        ticket,
        actorUid: userProfile.uid,
        actorName: userProfile.displayName,
        holdReason: holdReason.trim(),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengubah status ke On Hold.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (rootCause.trim().length < 4 || resolutionNotes.trim().length < 5) {
      setErrorMsg('Akar masalah dan tindakan perbaikan wajib diisi dengan jelas.');
      return;
    }
    setBusy(true);
    setErrorMsg(null);
    try {
      await resolveTicket({
        ticket,
        actorUid: userProfile.uid,
        actorName: userProfile.displayName,
        rootCause: rootCause.trim(),
        resolutionNotes: resolutionNotes.trim(),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyelesaikan tiket.');
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateClassification() {
    setBusy(true);
    setErrorMsg(null);
    try {
      await updateTicketPriorityOrCategory({
        ticket,
        priority: editPriority,
        category: editCategory,
        actorUid: userProfile.uid,
        actorName: userProfile.displayName,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui klasifikasi.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteTicketRecord(ticket.id);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menghapus tiket.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-detail-heading"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
              <span className="font-mono font-semibold text-slate-900">
                {ticket.ticketNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span>{ticket.skpdName}</span>
              <span aria-hidden="true">·</span>
              <span>Dilaporkan {formatDateTimeId(ticket.reportedAtMs)}</span>
            </div>
            <h2
              id="ticket-detail-heading"
              className="font-display text-lg font-bold text-slate-900"
            >
              {ticket.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail tiket"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {/* SLA & Status Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 border border-slate-200 rounded-lg p-4 bg-slate-50">
            <div>
              <p className="text-xs text-slate-500">Status Tiket</p>
              <p
                className={`text-sm font-bold mt-1 ${
                  ticket.status === 'Selesai'
                    ? 'text-emerald-700'
                    : ticket.status === 'On Hold'
                    ? 'text-purple-700'
                    : ticket.status === 'Ditangani'
                    ? 'text-amber-700'
                    : ticket.status === 'Ditugaskan'
                    ? 'text-blue-700'
                    : 'text-red-700'
                }`}
              >
                {ticket.status === 'Selesai' ? 'Closed (Selesai)' : ticket.status}
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                {ticket.category} · {ticket.priority}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Teknisi Ditunjuk</p>
              <p className="text-sm font-semibold text-slate-900 mt-1">
                {techLabel || 'Belum Ditunjuk'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {ticket.assignedAtMs > 0
                  ? formatDateTimeId(ticket.assignedAtMs)
                  : 'Menunggu penugasan'}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Kecepatan Respon</p>
              <p className="font-mono tabular-nums text-sm font-bold text-slate-900 mt-1">
                {formatDurationMinutes(ticket.responseMinutes)}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  respEval.status === 'sesuai'
                    ? 'text-emerald-700'
                    : respEval.status === 'terlambat'
                    ? 'text-red-700'
                    : 'text-slate-500'
                }`}
              >
                {respEval.label} (Target {formatDurationMinutes(ticket.slaResponseTargetMinutes)})
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Durasi Penyelesaian</p>
              <p className="font-mono tabular-nums text-sm font-bold text-slate-900 mt-1">
                {formatDurationMinutes(ticket.resolutionMinutes)}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  resEval.status === 'sesuai'
                    ? 'text-emerald-700'
                    : resEval.status === 'terlambat'
                    ? 'text-red-700'
                    : 'text-slate-500'
                }`}
              >
                {resEval.label} (Target {formatDurationMinutes(ticket.slaResolutionTargetMinutes)})
              </p>
            </div>
          </div>

          {/* Description & Action Column */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className={`${isPelaporView ? 'lg:col-span-12' : 'lg:col-span-7'} space-y-5`}>
              <div>
                <h3 className="text-xs font-semibold text-slate-500 mb-1.5">
                  Kronologi &amp; Deskripsi Gangguan
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                  {ticket.description}
                </p>
                <p className="text-xs text-slate-500 mt-3">
                  Pelapor SKPD: <span className="font-medium text-slate-800">{ticket.skpdPicName}</span> · Kontak: <span className="font-mono">{ticket.skpdContact}</span>
                </p>
              </div>

              {ticket.status === 'On Hold' && ticket.holdReason && (
                <div className="border-t border-slate-200 pt-4">
                  <h3 className="text-xs font-semibold text-purple-700 mb-1">
                    Status Penundaan (On Hold)
                  </h3>
                  <p className="text-sm text-slate-800">{ticket.holdReason}</p>
                </div>
              )}

              {(ticket.rootCause || ticket.resolutionNotes) && (
                <div className="border-t border-slate-200 pt-4 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500">
                    Hasil Pemeriksaan &amp; Perbaikan
                  </h3>
                  {ticket.rootCause && (
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">Akar Masalah:</span> {ticket.rootCause}
                    </p>
                  )}
                  {ticket.resolutionNotes && (
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">Tindakan Perbaikan:</span> {ticket.resolutionNotes}
                    </p>
                  )}
                </div>
              )}

              {/* Audit Trail Logs */}
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-xs font-semibold text-slate-500 mb-3">
                  Riwayat Penanganan Tiket
                </h3>
                {logs.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Belum ada catatan aktivitas tambahan pada tiket ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="text-xs border-b border-slate-100 pb-2.5 last:border-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {log.action}
                          </span>
                          <span className="text-slate-500">
                            {log.actorName} · Status: {log.toStatus}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-relaxed">{log.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Column (Hidden in Pelapor Read-Only View) */}
            {!isPelaporView && (
              <div className="lg:col-span-5 space-y-5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-5 lg:pt-0 lg:pl-6">
                {/* 1. Kepala Seksi Multi-Technician Assignment */}
                {isKepalaSeksiView && (
                  <form onSubmit={handleAssign} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        Penugasan Teknisi (Bisa &gt; 1)
                      </h3>
                      <span className="text-xs font-mono text-slate-500">
                        {selectedTechIds.length} dipilih
                      </span>
                    </div>

                    <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-md divide-y divide-slate-100 bg-slate-50">
                      {technicians.length === 0 ? (
                        <p className="p-3 text-xs text-slate-500">
                          Belum ada teknisi terdaftar. Tambahkan di menu Hak Akses &amp; Teknisi.
                        </p>
                      ) : (
                        technicians.map((tech) => {
                          const checked = selectedTechIds.includes(tech.id);
                          return (
                            <label
                              key={tech.id}
                              className="flex items-start gap-2.5 px-3 py-2 text-xs hover:bg-white cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTechSelection(tech.id)}
                                className="mt-0.5 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">
                                  {tech.name}
                                </p>
                                <p className="text-slate-500 truncate">
                                  {tech.spesialisasi}
                                </p>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <input
                      type="text"
                      value={dispatchNote}
                      onChange={(e) => setDispatchNote(e.target.value)}
                      maxLength={500}
                      placeholder="Instruksi penugasan (opsional)..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                    />
                    <button
                      type="submit"
                      disabled={busy || selectedTechIds.length === 0}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {selectedTechIds.length > 1
                        ? `Tugaskan ${selectedTechIds.length} Teknisi`
                        : 'Simpan Penugasan Teknisi'}
                    </button>
                  </form>
                )}

                {/* 2. Start / Resume Handling */}
                {canOperateTicket &&
                  (ticket.status === 'Ditugaskan' ||
                    ticket.status === 'Baru' ||
                    ticket.status === 'On Hold') && (
                    <div className="border-t border-slate-200 pt-4 space-y-2.5">
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        {ticket.status === 'On Hold'
                          ? 'Lanjutkan Penanganan'
                          : 'Mulai Penanganan Lapangan / Remote'}
                      </h3>
                      <input
                        type="text"
                        value={handlingNote}
                        onChange={(e) => setHandlingNote(e.target.value)}
                        maxLength={500}
                        placeholder="Catatan penanganan (opsional)..."
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleStartHandling}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        {ticket.status === 'On Hold'
                          ? 'Lanjutkan ke Sedang Ditangani'
                          : 'Tandai Sedang Ditangani'}
                      </button>
                    </div>
                  )}

                {/* 3. Put Ticket On Hold */}
                {canOperateTicket &&
                  ticket.status !== 'Selesai' &&
                  ticket.status !== 'On Hold' && (
                    <form
                      onSubmit={handlePutOnHold}
                      className="border-t border-slate-200 pt-4 space-y-2.5"
                    >
                      <h3 className="font-display text-sm font-semibold text-slate-900">
                        Tunda Penanganan (On Hold)
                      </h3>
                      <input
                        type="text"
                        value={holdReason}
                        onChange={(e) => setHoldReason(e.target.value)}
                        maxLength={500}
                        required
                        placeholder="Alasan penundaan (mis. menunggu suku cadang / vendor)..."
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                      />
                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors cursor-pointer"
                      >
                        <PauseCircle className="w-3.5 h-3.5" />
                        Tandai On Hold
                      </button>
                    </form>
                  )}

                {/* 4. Resolve Ticket (Closed) */}
                {canOperateTicket && ticket.status !== 'Selesai' && (
                  <form
                    onSubmit={handleResolve}
                    className="border-t border-slate-200 pt-4 space-y-3"
                  >
                    <h3 className="font-display text-sm font-semibold text-slate-900">
                      Penyelesaian Gangguan (Closed)
                    </h3>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Akar Masalah (Root Cause)
                      </label>
                      <input
                        type="text"
                        value={rootCause}
                        onChange={(e) => setRootCause(e.target.value)}
                        maxLength={500}
                        required
                        placeholder="Contoh: Kabel patch FO rusak / port switch hang"
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Tindakan Perbaikan yang Dilakukan
                      </label>
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        maxLength={2000}
                        rows={3}
                        required
                        placeholder="Jelaskan langkah perbaikan & hasil pengujian koneksi..."
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-md transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tutup Tiket (Selesai) &amp; Hitung SLA
                    </button>
                  </form>
                )}

                {/* 5. Priority / Category Adjustment (Kepala Seksi) */}
                {isKepalaSeksiView && (
                  <div className="border-t border-slate-200 pt-4 space-y-2.5">
                    <h3 className="text-xs font-semibold text-slate-600">
                      Penyesuaian Prioritas &amp; Kategori
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as TicketCategory)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      >
                        {TICKET_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as TicketPriority)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                      >
                        {TICKET_PRIORITIES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(editPriority !== ticket.priority || editCategory !== ticket.category) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleUpdateClassification}
                        className="w-full px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                      >
                        Simpan Klasifikasi Baru
                      </button>
                    )}
                  </div>
                )}

                {/* 6. Delete option (Kepala Seksi) */}
                {isKepalaSeksiView && (
                  <div className="border-t border-slate-200 pt-4">
                    {!confirmDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 hover:text-red-900 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus Tiket Ini
                      </button>
                    ) : (
                      <div className="flex items-center justify-between gap-2 bg-red-50 border border-red-200 rounded-md p-2.5">
                        <span className="text-xs text-red-800">Konfirmasi hapus permanen?</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-300 rounded cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={handleDelete}
                            className="px-2.5 py-1 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
