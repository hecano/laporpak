import { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import {
  buildReportSummary,
  exportReportToExcel,
  exportReportToPdf,
} from '../lib/exportReports';
import {
  formatDateTimeId,
  formatDurationMinutes,
  getAssignedTechLabel,
  getResolutionSlaEvaluation,
  getResponseSlaEvaluation,
  isTicketAssignedToUser,
  MONTH_NAMES_ID,
  QUARTER_OPTIONS,
  ReportPeriodType,
  Technician,
  Ticket,
  UserProfile,
  UserRole,
} from '../types/ticket';

interface ReportsExportViewProps {
  tickets: Ticket[];
  technicians: Technician[];
  userProfile: UserProfile;
  effectiveRole: UserRole;
}

export function ReportsExportView({
  tickets,
  technicians,
  userProfile,
  effectiveRole,
}: ReportsExportViewProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const [periodType, setPeriodType] = useState<ReportPeriodType>('bulanan');
  const [year, setYear] = useState<number>(currentYear);
  const [monthIndex, setMonthIndex] = useState<number>(now.getMonth());
  const [quarter, setQuarter] = useState<number>(Math.floor(now.getMonth() / 3) + 1);
  const [selectedTechId, setSelectedTechId] = useState<string>('semua');

  const isTechnicianRole = effectiveRole === 'teknisi';

  const linkedTechIds = useMemo(
    () => technicians.filter((t) => t.linkedUid === userProfile.uid).map((t) => t.id),
    [technicians, userProfile.uid]
  );

  // If Teknisi role: strictly filter to tickets assigned to them!
  // If Kepala Seksi: can export all or filter by specific technician
  const scopedTickets = useMemo(() => {
    if (isTechnicianRole) {
      return tickets.filter((t) =>
        isTicketAssignedToUser(t, userProfile.uid, linkedTechIds)
      );
    }
    if (selectedTechId !== 'semua') {
      return tickets.filter(
        (t) =>
          t.assignedTechId === selectedTechId ||
          t.assignedTechIds?.includes(selectedTechId)
      );
    }
    return tickets;
  }, [tickets, isTechnicianRole, userProfile.uid, linkedTechIds, selectedTechId]);

  const scopeLabel = useMemo(() => {
    if (isTechnicianRole) {
      return `Laporan Khusus Tugas Teknisi: ${userProfile.displayName}`;
    }
    if (selectedTechId !== 'semua') {
      const tech = technicians.find((t) => t.id === selectedTechId);
      return tech ? `Laporan Khusus Penanganan: ${tech.name}` : undefined;
    }
    return undefined;
  }, [isTechnicianRole, userProfile.displayName, selectedTechId, technicians]);

  const summary = useMemo(
    () =>
      buildReportSummary(
        scopedTickets,
        technicians,
        {
          periodType,
          year,
          monthIndex,
          quarter,
        },
        scopeLabel
      ),
    [scopedTickets, technicians, periodType, year, monthIndex, quarter, scopeLabel]
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear, currentYear - 1]);
    for (const t of tickets) {
      years.add(new Date(t.reportedAtMs).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [tickets, currentYear]);

  return (
    <div className="space-y-6">
      {/* Period Selector & Export Actions */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              {isTechnicianRole
                ? 'Ekspor Laporan Khusus Tiket yang Anda Tangani'
                : 'Pusat Rekapitulasi & Ekspor Laporan Bulanan / Triwulanan'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isTechnicianRole
                ? 'Menampilkan dan mengekspor hanya tiket gangguan yang ditugaskan kepada akun Anda dalam format PDF atau Excel (.xlsx)'
                : 'Pilih periode pelaporan bulanan atau triwulanan untuk meninjau kinerja SLA dan mengunduh dokumen PDF / Excel (.xlsx)'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => exportReportToPdf(summary)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileDown className="w-4 h-4" />
              Ekspor PDF {isTechnicianRole ? '(Tugas Saya)' : ''}
            </button>
            <button
              type="button"
              onClick={() => exportReportToExcel(summary)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              Ekspor Excel (.xlsx) {isTechnicianRole ? '(Tugas Saya)' : ''}
            </button>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-5 flex flex-wrap items-end gap-4">
          <div>
            <span className="block text-xs font-semibold text-slate-600 mb-1.5">
              Jenis Periode
            </span>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setPeriodType('bulanan')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  periodType === 'bulanan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Laporan Bulanan
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('triwulanan')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  periodType === 'triwulanan'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Laporan Triwulanan
              </button>
            </div>
          </div>

          {periodType === 'bulanan' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Pilih Bulan
              </label>
              <select
                value={monthIndex}
                onChange={(e) => setMonthIndex(Number(e.target.value))}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              >
                {MONTH_NAMES_ID.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Pilih Triwulan
              </label>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              >
                {QUARTER_OPTIONS.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Tahun
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-3 py-2 text-sm font-mono bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {!isTechnicianRole && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Cakupan Teknisi
              </label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              >
                <option value="semua">Seluruh Teknisi &amp; Tiket</option>
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    Khusus: {tech.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary Preview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Total Tiket ({summary.periodLabel})</p>
          <p className="font-mono tabular-nums text-xl font-bold text-slate-900 mt-1.5">
            {summary.totalTickets}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Open / On Hold / Closed</p>
          <p className="font-mono tabular-nums text-lg font-bold text-slate-900 mt-1.5">
            {summary.openCount} / {summary.onHoldCount} / {summary.resolvedCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Rata-Rata Respon</p>
          <p className="font-mono tabular-nums text-xl font-bold text-slate-900 mt-1.5">
            {formatDurationMinutes(summary.avgResponseMin)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">Rata-Rata Selesai</p>
          <p className="font-mono tabular-nums text-xl font-bold text-slate-900 mt-1.5">
            {formatDurationMinutes(summary.avgResolutionMin)}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-xs text-slate-500">SLA Respon / Selesai</p>
          <p className="font-mono tabular-nums text-xl font-bold text-blue-700 mt-1.5">
            {summary.responseSlaPct}% / {summary.resolutionSlaPct}%
          </p>
        </div>
      </div>

      {/* Technician Performance Preview (only when Kepala Seksi exports all) */}
      {!scopeLabel && (
        <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-display text-sm font-semibold text-slate-900">
              Pratinjau Tabel 1: Rekap Kinerja Teknisi Kominfo — {summary.periodLabel}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama Pegawai</th>
                  <th className="py-3 px-4">Spesialisasi</th>
                  <th className="py-3 px-4 text-right">Ditugaskan</th>
                  <th className="py-3 px-4 text-right">Selesai</th>
                  <th className="py-3 px-4 text-right">Rata-Rata Respon</th>
                  <th className="py-3 px-4 text-right">Rata-Rata Selesai</th>
                  <th className="py-3 px-4 text-right">Kepatuhan SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {summary.techRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 px-4 text-center text-xs text-slate-500">
                      Belum ada data penugasan teknisi pada periode ini.
                    </td>
                  </tr>
                ) : (
                  summary.techRows.map((row) => (
                    <tr key={row.name}>
                      <td className="py-2.5 px-4 font-medium text-slate-900">{row.name}</td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">{row.spesialisasi}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {row.totalAssigned}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                        {row.resolvedCount}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatDurationMinutes(row.avgResponseMin)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {formatDurationMinutes(row.avgResolutionMin)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold">
                        {row.resolvedCount > 0 ? `${row.slaCompliancePct}%` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Ticket Ledger Preview */}
      <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Pratinjau Daftar Tiket Gangguan — {summary.periodLabel}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">No. Tiket</th>
                <th className="py-3 px-4 whitespace-nowrap">Waktu Lapor</th>
                <th className="py-3 px-4">SKPD &amp; Judul Gangguan</th>
                <th className="py-3 px-4">Teknisi Ditunjuk</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Respon</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Selesai</th>
                <th className="py-3 px-4 whitespace-nowrap">Evaluasi SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {summary.tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-xs text-slate-500">
                    {isTechnicianRole
                      ? 'Belum ada tiket yang ditunjuk kepada Anda pada periode ini.'
                      : `Tidak ada tiket gangguan yang dilaporkan pada ${summary.periodLabel}.`}
                  </td>
                </tr>
              ) : (
                summary.tickets.map((t) => {
                  const respEval = getResponseSlaEvaluation(t);
                  const resEval = getResolutionSlaEvaluation(t);
                  const label = t.status === 'Selesai' ? resEval.label : respEval.label;
                  const techLabel = getAssignedTechLabel(t);
                  return (
                    <tr key={t.id}>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {t.ticketNumber}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                        {formatDateTimeId(t.reportedAtMs)}
                      </td>
                      <td className="py-2.5 px-4 max-w-sm">
                        <p className="font-medium text-slate-900 truncate">{t.title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {t.skpdName} · {t.category} ({t.priority})
                        </p>
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-800 max-w-[200px]">
                        {techLabel || 'Belum Ditunjuk'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        {formatDurationMinutes(t.responseMinutes)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        {formatDurationMinutes(t.resolutionMinutes)}
                      </td>
                      <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                        <span className="font-semibold text-slate-900">
                          {t.status === 'Selesai' ? 'Closed' : t.status}
                        </span>
                        <span className="text-slate-400 mx-1">·</span>
                        <span
                          className={
                            label.includes('Sesuai')
                              ? 'text-emerald-700 font-medium'
                              : label.includes('Melebihi') || label.includes('Terlambat')
                              ? 'text-red-700 font-medium'
                              : 'text-slate-600'
                          }
                        >
                          {label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
