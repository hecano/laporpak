import { ArrowRight, Database, Plus } from 'lucide-react';
import { buildReportSummary } from '../lib/exportReports';
import {
  formatDateTimeId,
  formatDurationMinutes,
  getAssignedTechLabel,
  getResponseSlaEvaluation,
  matchesTicketBucket,
  Technician,
  Ticket,
  TICKET_CATEGORIES,
  UserProfile,
  UserRole,
} from '../types/ticket';

interface OverviewDashboardProps {
  tickets: Ticket[];
  technicians: Technician[];
  userProfile: UserProfile;
  effectiveRole: UserRole;
  loading: boolean;
  seeding: boolean;
  onSeedData: () => void;
  onOpenNewTicket: () => void;
  onSelectTicket: (ticket: Ticket) => void;
  onNavigateTickets: () => void;
  onNavigateReports: () => void;
}

export function OverviewDashboard({
  tickets,
  technicians,
  userProfile,
  effectiveRole,
  loading,
  seeding,
  onSeedData,
  onOpenNewTicket,
  onSelectTicket,
  onNavigateTickets,
  onNavigateReports,
}: OverviewDashboardProps) {
  const isKepalaSeksi = effectiveRole === 'kepala_seksi' && userProfile.role === 'kepala_seksi';
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthlySummary = buildReportSummary(tickets, technicians, {
    periodType: 'bulanan',
    year: currentYear,
    monthIndex: currentMonth,
    quarter: Math.floor(currentMonth / 3) + 1,
  });

  const totalAll = tickets.length;
  const openCountAll = tickets.filter((t) => matchesTicketBucket(t.status, 'open')).length;
  const onHoldCountAll = tickets.filter((t) => matchesTicketBucket(t.status, 'on_hold')).length;
  const resolvedAll = tickets.filter((t) => t.status === 'Selesai');
  const respondedAll = tickets.filter((t) => t.respondedAtMs > 0 && t.responseMinutes > 0);
  const avgResponseAll =
    respondedAll.length > 0
      ? Math.round(respondedAll.reduce((s, t) => s + t.responseMinutes, 0) / respondedAll.length)
      : 0;
  const avgResolutionAll =
    resolvedAll.length > 0
      ? Math.round(resolvedAll.reduce((s, t) => s + t.resolutionMinutes, 0) / resolvedAll.length)
      : 0;
  const slaResMetAll = resolvedAll.filter(
    (t) => t.resolutionMinutes <= t.slaResolutionTargetMinutes
  ).length;
  const overallSlaPct =
    resolvedAll.length > 0 ? Math.round((slaResMetAll / resolvedAll.length) * 100) : 0;

  const urgentQueue = tickets
    .filter((t) => t.status !== 'Selesai')
    .sort((a, b) => {
      const rank = { Kritis: 0, Tinggi: 1, Sedang: 2, Rendah: 3 };
      const diff = rank[a.priority] - rank[b.priority];
      return diff !== 0 ? diff : a.reportedAtMs - b.reportedAtMs;
    })
    .slice(0, 6);

  const categoryStats = TICKET_CATEGORIES.map((cat) => {
    const items = tickets.filter((t) => t.category === cat);
    const done = items.filter((t) => t.status === 'Selesai');
    const slaOk = done.filter((t) => t.resolutionMinutes <= t.slaResolutionTargetMinutes).length;
    return {
      category: cat,
      total: items.length,
      slaPct: done.length > 0 ? Math.round((slaOk / done.length) * 100) : null,
    };
  }).filter((c) => c.total > 0);

  const quarterlySummary = buildReportSummary(tickets, technicians, {
    periodType: 'triwulanan',
    year: currentYear,
    monthIndex: currentMonth,
    quarter: Math.floor(currentMonth / 3) + 1,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-lg p-5 animate-pulse" />
          ))}
        </div>
        <div className="h-72 bg-white border border-slate-200 rounded-lg p-6 animate-pulse" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center max-w-2xl mx-auto mt-8">
        <h2 className="font-display text-lg font-semibold text-slate-900 mb-2">
          Belum Ada Tiket Gangguan Tercatat
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Mulai catat laporan gangguan jaringan atau server dari SKPD untuk melacak waktu respon teknisi Kominfo, kepatuhan SLA, serta rekapitulasi laporan bulanan dan triwulanan.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onOpenNewTicket}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Buat Tiket Gangguan Pertama
          </button>
          {isKepalaSeksi && (
            <button
              type="button"
              onClick={onSeedData}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Database className="w-4 h-4" />
              {seeding ? 'Memuat Data Contoh...' : 'Muat Data Operasional Contoh (Triwulan)'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Strip */}
      <section aria-label="Ringkasan Indikator Kinerja">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">
              Total &amp; Status Tiket
            </p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-2">
              {totalAll}
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {openCountAll} Open · {onHoldCountAll} On Hold · {resolvedAll.length} Closed
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">
              Rata-Rata Kecepatan Respon
            </p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-2">
              {formatDurationMinutes(avgResponseAll)}
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {respondedAll.length} tiket terespon · {monthlySummary.responseSlaPct}% sesuai target bulan ini
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">
              Rata-Rata Waktu Penyelesaian
            </p>
            <p className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-2">
              {formatDurationMinutes(avgResolutionAll)}
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {resolvedAll.length} dari {totalAll} gangguan telah tuntas diselesaikan
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <p className="text-xs font-medium text-slate-500">
              Kepatuhan SLA Penyelesaian
            </p>
            <p
              className={`font-mono tabular-nums text-2xl font-bold mt-2 ${
                overallSlaPct >= 85
                  ? 'text-emerald-700'
                  : overallSlaPct >= 65
                  ? 'text-amber-700'
                  : 'text-red-700'
              }`}
            >
              {resolvedAll.length > 0 ? `${overallSlaPct}%` : '—'}
            </p>
            <p className="text-xs text-slate-600 mt-2">
              {slaResMetAll} tiket selesai tepat waktu sesuai batas SLA
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <section className="xl:col-span-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Antrean Tiket Aktif (Open &amp; On Hold)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Diurutkan berdasarkan tingkat prioritas dan waktu masuk laporan SKPD
              </p>
            </div>
            <button
              type="button"
              onClick={onNavigateTickets}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Lihat Semua Tiket
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {urgentQueue.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-emerald-700">
                Seluruh gangguan yang masuk telah selesai ditangani (Closed).
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Anda dapat meninjau riwayat penyelesaian pada menu Tiket atau Laporan PDF &amp; Excel.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4 whitespace-nowrap">No. Tiket</th>
                    <th className="py-3 px-4">Gangguan &amp; SKPD</th>
                    <th className="py-3 px-4 whitespace-nowrap">Prioritas</th>
                    <th className="py-3 px-4">Teknisi Ditunjuk</th>
                    <th className="py-3 px-4 whitespace-nowrap">Status &amp; SLA</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {urgentQueue.map((ticket) => {
                    const respEval = getResponseSlaEvaluation(ticket);
                    const techLabel = getAssignedTechLabel(ticket);
                    return (
                      <tr
                        key={ticket.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                          {ticket.ticketNumber}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="font-medium text-slate-900 truncate">
                            {ticket.title}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {ticket.skpdName} · {formatDateTimeId(ticket.reportedAtMs)}
                          </p>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs font-semibold">
                          <span
                            className={
                              ticket.priority === 'Kritis'
                                ? 'text-red-700'
                                : ticket.priority === 'Tinggi'
                                ? 'text-amber-700'
                                : 'text-slate-700'
                            }
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs max-w-[200px]">
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
                        <td className="py-3 px-4 whitespace-nowrap text-xs">
                          <span
                            className={`font-semibold ${
                              ticket.status === 'On Hold'
                                ? 'text-purple-700'
                                : ticket.status === 'Ditangani'
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {ticket.status}
                          </span>
                          <span className="text-slate-400 mx-1">·</span>
                          <span
                            className={
                              respEval.status === 'terlambat'
                                ? 'text-red-700 font-medium'
                                : respEval.status === 'sesuai'
                                ? 'text-emerald-700 font-medium'
                                : 'text-amber-700 font-medium'
                            }
                          >
                            {respEval.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => onSelectTicket(ticket)}
                            className="px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md transition-colors cursor-pointer"
                          >
                            {isKepalaSeksi && !techLabel ? 'Tunjuk Teknisi' : 'Detail'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="xl:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 mb-1">
              Sebaran &amp; Kepatuhan per Kategori
            </h2>
            <p className="text-xs text-slate-500 mb-5">
              Persentase penyelesaian sesuai SLA menurut jenis infrastruktur
            </p>
            <div className="space-y-4">
              {categoryStats.map((cat) => {
                const widthPct = Math.round((cat.total / Math.max(1, totalAll)) * 100);
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-medium text-slate-800 truncate pr-2">
                        {cat.category}
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 shrink-0">
                        {cat.total} tiket
                        {cat.slaPct !== null ? ` · ${cat.slaPct}% SLA` : ''}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full"
                        style={{ width: `${Math.max(6, widthPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 mb-1">
              {effectiveRole === 'teknisi'
                ? 'Ekspor Laporan Penanganan Saya'
                : 'Rekap Laporan Bulanan & Triwulanan'}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {effectiveRole === 'teknisi'
                ? 'Unduh rekapitulasi khusus tiket gangguan yang ditunjuk kepada Anda dalam format PDF atau Excel.'
                : 'Unduh rekap kinerja respon, penyelesaian gangguan, dan beban tugas pegawai dalam format PDF atau Excel.'}
            </p>
            <button
              type="button"
              onClick={onNavigateReports}
              className="w-full px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              {effectiveRole === 'teknisi'
                ? 'Buka Ekspor Tugas Saya'
                : 'Buka Pusat Laporan PDF & Excel'}
            </button>
          </div>
        </aside>
      </div>

      {/* Technician Performance Board */}
      {isKepalaSeksi && quarterlySummary.techRows.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Evaluasi Kinerja Teknisi Kominfo ({quarterlySummary.periodLabel})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tracking penugasan (termasuk penugasan tim), kecepatan respon, dan penyelesaian masalah
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama Pegawai</th>
                  <th className="py-3 px-4">Spesialisasi</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Ditugaskan</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Selesai</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Proses</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Rata-Rata Respon</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Rata-Rata Selesai</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Kepatuhan SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {quarterlySummary.techRows.map((row) => (
                  <tr key={row.name} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{row.name}</p>
                      <p className="text-xs font-mono tabular-nums text-slate-500">
                        NIP {row.nip}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">
                      {row.spesialisasi}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                      {row.totalAssigned}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                      {row.resolvedCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700">
                      {row.inProgressCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {formatDurationMinutes(row.avgResponseMin)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                      {formatDurationMinutes(row.avgResolutionMin)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {row.resolvedCount > 0 ? (
                        <span
                          className={
                            row.slaCompliancePct >= 85
                              ? 'text-emerald-700'
                              : row.slaCompliancePct >= 65
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }
                        >
                          {row.slaCompliancePct}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
