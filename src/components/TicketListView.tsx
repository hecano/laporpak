import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import {
  formatDateTimeId,
  formatDurationMinutes,
  getAssignedTechLabel,
  getResolutionSlaEvaluation,
  getResponseSlaEvaluation,
  isTicketAssignedToUser,
  matchesTicketBucket,
  Technician,
  Ticket,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TicketBucketFilter,
  UserProfile,
  UserRole,
} from '../types/ticket';

interface TicketListViewProps {
  tickets: Ticket[];
  technicians: Technician[];
  userProfile: UserProfile;
  effectiveRole: UserRole;
  onSelectTicket: (ticket: Ticket) => void;
  onOpenNewTicket: () => void;
}

export function TicketListView({
  tickets,
  technicians,
  userProfile,
  effectiveRole,
  onSelectTicket,
  onOpenNewTicket,
}: TicketListViewProps) {
  const [search, setSearch] = useState('');
  const [bucketFilter, setBucketFilter] = useState<TicketBucketFilter>('semua');
  const [scopeFilter, setScopeFilter] = useState<'semua' | 'ditunjuk_saya'>('semua');
  const [priorityFilter, setPriorityFilter] = useState<string>('Semua');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');

  const isPelapor = effectiveRole === 'pelapor_skpd';
  const isKepalaSeksi = effectiveRole === 'kepala_seksi';

  const linkedTechIds = useMemo(
    () => technicians.filter((t) => t.linkedUid === userProfile.uid).map((t) => t.id),
    [technicians, userProfile.uid]
  );

  // Base tickets for role scope
  const roleScopedTickets = useMemo(() => {
    if (isPelapor) {
      return tickets.filter((t) => t.reporterUid === userProfile.uid);
    }
    if (scopeFilter === 'ditunjuk_saya') {
      return tickets.filter((t) =>
        isTicketAssignedToUser(t, userProfile.uid, linkedTechIds)
      );
    }
    return tickets;
  }, [tickets, isPelapor, scopeFilter, userProfile.uid, linkedTechIds]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return roleScopedTickets
      .filter((t) => {
        if (!isPelapor && !matchesTicketBucket(t.status, bucketFilter)) return false;
        if (priorityFilter !== 'Semua' && t.priority !== priorityFilter) return false;
        if (categoryFilter !== 'Semua' && t.category !== categoryFilter) return false;
        if (!q) return true;
        return (
          t.ticketNumber.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.skpdName.toLowerCase().includes(q) ||
          getAssignedTechLabel(t).toLowerCase().includes(q) ||
          t.skpdPicName.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.reportedAtMs - a.reportedAtMs);
  }, [roleScopedTickets, isPelapor, bucketFilter, priorityFilter, categoryFilter, search]);

  const bucketCounts = useMemo(
    () => ({
      semua: roleScopedTickets.length,
      open: roleScopedTickets.filter((t) => matchesTicketBucket(t.status, 'open')).length,
      on_hold: roleScopedTickets.filter((t) => matchesTicketBucket(t.status, 'on_hold')).length,
      closed: roleScopedTickets.filter((t) => matchesTicketBucket(t.status, 'closed')).length,
    }),
    [roleScopedTickets]
  );

  const assignedToMeCount = useMemo(
    () =>
      tickets.filter((t) => isTicketAssignedToUser(t, userProfile.uid, linkedTechIds)).length,
    [tickets, userProfile.uid, linkedTechIds]
  );

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {!isPelapor ? (
            <div className="flex flex-wrap items-center gap-3">
              {/* All vs Assigned-to-me toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setScopeFilter('semua')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    scopeFilter === 'semua'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Seluruh Laporan ({tickets.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter('ditunjuk_saya')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    scopeFilter === 'ditunjuk_saya'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ditunjuk ke Saya ({assignedToMeCount})
                </button>
              </div>

              {/* Ticket Bucket Filter: Semua Tiket | Open Ticket | On Hold | Closed Ticket */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                {(
                  [
                    { id: 'semua', label: 'Semua Tiket' },
                    { id: 'open', label: 'Open Ticket' },
                    { id: 'on_hold', label: 'On Hold' },
                    { id: 'closed', label: 'Closed Ticket' },
                  ] as const
                ).map((item) => {
                  const active = bucketFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBucketFilter(item.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {item.label} ({bucketCounts[item.id]})
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Riwayat Laporan Gangguan yang Pernah Anda Kirim ({roleScopedTickets.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik baris tiket untuk melihat rincian teknisi yang ditunjuk dan perkembangan perbaikan
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenNewTicket}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat Laporan Baru
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor tiket, SKPD pelapor, judul gangguan, atau teknisi..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
            />
          </div>
          <div className="md:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter Kategori"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="Semua">Semua Kategori</option>
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter Prioritas"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:bg-white focus:border-blue-600"
            >
              <option value="Semua">Semua Prioritas</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  Prioritas {p}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {filteredTickets.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-800">
              {isPelapor && roleScopedTickets.length === 0
                ? 'Anda belum pernah mengirimkan laporan gangguan.'
                : 'Tidak ada tiket gangguan yang sesuai dengan filter.'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isPelapor && roleScopedTickets.length === 0
                ? 'Gunakan menu Buat Laporan untuk melaporkan kendala jaringan atau server SKPD.'
                : 'Ubah pilihan status (Semua Tiket, Open, On Hold, Closed) atau kata kunci pencarian.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">No. Tiket</th>
                  <th className="py-3 px-4">Gangguan &amp; SKPD Pelapor</th>
                  <th className="py-3 px-4 whitespace-nowrap">Kategori · Prioritas</th>
                  <th className="py-3 px-4">Teknisi Ditunjuk</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Respon</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Penyelesaian</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status · Evaluasi SLA</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredTickets.map((t) => {
                  const respEval = getResponseSlaEvaluation(t);
                  const resEval = getResolutionSlaEvaluation(t);
                  const activeEval = t.status === 'Selesai' ? resEval : respEval;
                  const techLabel = getAssignedTechLabel(t);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onSelectTicket(t)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {t.ticketNumber}
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <p className="font-medium text-slate-900 truncate">
                          {t.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {t.skpdName} · {formatDateTimeId(t.reportedAtMs)}
                        </p>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <span className="text-slate-700">{t.category}</span>
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span
                          className={`font-semibold ${
                            t.priority === 'Kritis'
                              ? 'text-red-700'
                              : t.priority === 'Tinggi'
                              ? 'text-amber-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs max-w-[220px]">
                        {techLabel ? (
                          <span className="font-medium text-slate-900 line-clamp-2">
                            {techLabel}
                          </span>
                        ) : (
                          <span className="font-medium text-red-700 whitespace-nowrap">
                            Belum Ditunjuk
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                        {formatDurationMinutes(t.responseMinutes)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-800 whitespace-nowrap">
                        {formatDurationMinutes(t.resolutionMinutes)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        <span
                          className={`font-semibold ${
                            t.status === 'Selesai'
                              ? 'text-emerald-700'
                              : t.status === 'On Hold'
                              ? 'text-purple-700'
                              : t.status === 'Ditangani'
                              ? 'text-amber-700'
                              : t.status === 'Ditugaskan'
                              ? 'text-blue-700'
                              : 'text-red-700'
                          }`}
                        >
                          {t.status === 'Selesai' ? 'Closed (Selesai)' : t.status}
                        </span>
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span
                          className={
                            activeEval.status === 'sesuai'
                              ? 'text-emerald-700'
                              : activeEval.status === 'terlambat'
                              ? 'text-red-700 font-medium'
                              : 'text-slate-600'
                          }
                        >
                          {activeEval.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket(t);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors cursor-pointer"
                        >
                          {isPelapor
                            ? 'Rincian'
                            : isKepalaSeksi && !techLabel
                            ? 'Tunjuk'
                            : 'Kelola'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
