import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  formatDateTimeId,
  formatDurationMinutes,
  getAssignedTechLabel,
  getResolutionSlaEvaluation,
  getResponseSlaEvaluation,
  MONTH_NAMES_ID,
  QUARTER_OPTIONS,
  ReportPeriodType,
  Technician,
  Ticket,
} from '../types/ticket';

export interface ReportFilterConfig {
  periodType: ReportPeriodType;
  year: number;
  monthIndex: number; // 0-11
  quarter: number; // 1-4
}

export interface TechnicianReportRow {
  name: string;
  nip: string;
  spesialisasi: string;
  totalAssigned: number;
  resolvedCount: number;
  inProgressCount: number;
  avgResponseMin: number;
  avgResolutionMin: number;
  slaCompliancePct: number;
}

export interface ComputedReportSummary {
  periodLabel: string;
  fileSlug: string;
  scopeLabel?: string;
  totalTickets: number;
  resolvedCount: number;
  onHoldCount: number;
  openCount: number;
  unassignedCount: number;
  completionRatePct: number;
  avgResponseMin: number;
  avgResolutionMin: number;
  responseSlaPct: number;
  resolutionSlaPct: number;
  techRows: TechnicianReportRow[];
  tickets: Ticket[];
}

export function getPeriodLabel(config: ReportFilterConfig): {
  label: string;
  slug: string;
} {
  if (config.periodType === 'bulanan') {
    const monthName = MONTH_NAMES_ID[config.monthIndex] || 'Bulan';
    return {
      label: `Bulan ${monthName} ${config.year}`,
      slug: `Bulanan_${monthName}_${config.year}`,
    };
  }
  const qOpt = QUARTER_OPTIONS.find((q) => q.value === config.quarter) || QUARTER_OPTIONS[0];
  return {
    label: `${qOpt.label} Tahun ${config.year}`,
    slug: `Triwulan_${config.quarter}_${config.year}`,
  };
}

export function filterTicketsByPeriod(
  tickets: Ticket[],
  config: ReportFilterConfig
): Ticket[] {
  return tickets
    .filter((t) => {
      const d = new Date(t.reportedAtMs);
      if (d.getFullYear() !== config.year) return false;
      if (config.periodType === 'bulanan') {
        return d.getMonth() === config.monthIndex;
      }
      const qOpt = QUARTER_OPTIONS.find((q) => q.value === config.quarter);
      return qOpt ? qOpt.months.includes(d.getMonth()) : true;
    })
    .sort((a, b) => b.reportedAtMs - a.reportedAtMs);
}

export function buildReportSummary(
  allTickets: Ticket[],
  technicians: Technician[],
  config: ReportFilterConfig,
  scopeLabel?: string
): ComputedReportSummary {
  const { label, slug } = getPeriodLabel(config);
  const tickets = filterTicketsByPeriod(allTickets, config);
  const totalTickets = tickets.length;
  const resolved = tickets.filter((t) => t.status === 'Selesai');
  const onHold = tickets.filter((t) => t.status === 'On Hold');
  const resolvedCount = resolved.length;
  const onHoldCount = onHold.length;
  const openCount = totalTickets - resolvedCount - onHoldCount;
  const unassignedCount = tickets.filter(
    (t) => (!t.assignedTechIds || t.assignedTechIds.length === 0) && !t.assignedTechId
  ).length;
  const completionRatePct =
    totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 0;

  const responded = tickets.filter((t) => t.respondedAtMs > 0 && t.responseMinutes > 0);
  const avgResponseMin =
    responded.length > 0
      ? Math.round(responded.reduce((sum, t) => sum + t.responseMinutes, 0) / responded.length)
      : 0;

  const avgResolutionMin =
    resolved.length > 0
      ? Math.round(resolved.reduce((sum, t) => sum + t.resolutionMinutes, 0) / resolved.length)
      : 0;

  const respSlaMet = responded.filter(
    (t) => t.responseMinutes <= t.slaResponseTargetMinutes
  ).length;
  const responseSlaPct =
    responded.length > 0 ? Math.round((respSlaMet / responded.length) * 100) : 0;

  const resSlaMet = resolved.filter(
    (t) => t.resolutionMinutes <= t.slaResolutionTargetMinutes
  ).length;
  const resolutionSlaPct =
    resolved.length > 0 ? Math.round((resSlaMet / resolved.length) * 100) : 0;

  // Multi-technician aware performance rows
  const techMap = new Map<string, TechnicianReportRow>();
  for (const tech of technicians) {
    techMap.set(tech.id, {
      name: tech.name,
      nip: tech.nip,
      spesialisasi: tech.spesialisasi,
      totalAssigned: 0,
      resolvedCount: 0,
      inProgressCount: 0,
      avgResponseMin: 0,
      avgResolutionMin: 0,
      slaCompliancePct: 0,
    });
  }

  const techBuckets = new Map<string, Ticket[]>();
  for (const t of tickets) {
    const ids =
      t.assignedTechIds && t.assignedTechIds.length > 0
        ? t.assignedTechIds
        : t.assignedTechId
        ? [t.assignedTechId]
        : [];
    const names =
      t.assignedTechNames && t.assignedTechNames.length > 0
        ? t.assignedTechNames
        : t.assignedTechName
        ? [t.assignedTechName]
        : [];

    ids.forEach((tid, idx) => {
      if (!tid) return;
      if (!techMap.has(tid)) {
        techMap.set(tid, {
          name: names[idx] || 'Teknisi Kominfo',
          nip: '—',
          spesialisasi: 'Infrastruktur & Jaringan',
          totalAssigned: 0,
          resolvedCount: 0,
          inProgressCount: 0,
          avgResponseMin: 0,
          avgResolutionMin: 0,
          slaCompliancePct: 0,
        });
      }
      const list = techBuckets.get(tid) || [];
      list.push(t);
      techBuckets.set(tid, list);
    });
  }

  for (const [techId, list] of techBuckets.entries()) {
    const row = techMap.get(techId)!;
    const tResolved = list.filter((t) => t.status === 'Selesai');
    const tResponded = list.filter((t) => t.respondedAtMs > 0 && t.responseMinutes > 0);
    const tSlaMet = tResolved.filter(
      (t) => t.resolutionMinutes <= t.slaResolutionTargetMinutes
    ).length;

    row.totalAssigned = list.length;
    row.resolvedCount = tResolved.length;
    row.inProgressCount = list.length - tResolved.length;
    row.avgResponseMin =
      tResponded.length > 0
        ? Math.round(tResponded.reduce((s, t) => s + t.responseMinutes, 0) / tResponded.length)
        : 0;
    row.avgResolutionMin =
      tResolved.length > 0
        ? Math.round(tResolved.reduce((s, t) => s + t.resolutionMinutes, 0) / tResolved.length)
        : 0;
    row.slaCompliancePct =
      tResolved.length > 0 ? Math.round((tSlaMet / tResolved.length) * 100) : 0;
  }

  const techRows = Array.from(techMap.values()).sort(
    (a, b) => b.resolvedCount - a.resolvedCount || b.totalAssigned - a.totalAssigned
  );

  return {
    periodLabel: label,
    fileSlug: slug,
    scopeLabel,
    totalTickets,
    resolvedCount,
    onHoldCount,
    openCount,
    unassignedCount,
    completionRatePct,
    avgResponseMin,
    avgResolutionMin,
    responseSlaPct,
    resolutionSlaPct,
    techRows,
    tickets,
  };
}

export function exportReportToPdf(summary: ComputedReportSummary): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPOR KOMINFO — DINAS KOMUNIKASI DAN INFORMATIKA', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(
    summary.scopeLabel
      ? `Seksi Infrastruktur dan Jaringan — ${summary.scopeLabel}`
      : 'Seksi Infrastruktur dan Jaringan — Rekapitulasi Penanganan Gangguan Jaringan & Server SKPD',
    14,
    21
  );

  doc.setDrawColor(203, 213, 225);
  doc.line(14, 24, pageWidth - 14, 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`Periode Laporan: ${summary.periodLabel}`, 14, 31);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const printDate = new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  doc.text(`Dicetak pada: ${printDate}`, pageWidth - 14, 31, { align: 'right' });

  autoTable(doc, {
    startY: 36,
    head: [
      [
        'Total Tiket',
        'Open Ticket',
        'On Hold',
        'Closed (Selesai)',
        'Tingkat Selesai',
        'Rata-rata Respon',
        'Rata-rata Selesai',
        'SLA Respon',
        'SLA Penyelesaian',
      ],
    ],
    body: [
      [
        String(summary.totalTickets),
        String(summary.openCount),
        String(summary.onHoldCount),
        String(summary.resolvedCount),
        `${summary.completionRatePct}%`,
        formatDurationMinutes(summary.avgResponseMin),
        formatDurationMinutes(summary.avgResolutionMin),
        `${summary.responseSlaPct}%`,
        `${summary.resolutionSlaPct}%`,
      ],
    ],
    styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
    headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold' },
    theme: 'grid',
  });

  let nextY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  if (!summary.scopeLabel && summary.techRows.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Kinerja Penanganan Pegawai / Teknisi Kominfo', 14, nextY);

    autoTable(doc, {
      startY: nextY + 3,
      head: [
        [
          'Nama Pegawai',
          'NIP',
          'Spesialisasi',
          'Ditugaskan',
          'Selesai',
          'Proses',
          'Rata-rata Respon',
          'Rata-rata Penyelesaian',
          'Kepatuhan SLA',
        ],
      ],
      body: summary.techRows.map((row) => [
        row.name,
        row.nip,
        row.spesialisasi,
        String(row.totalAssigned),
        String(row.resolvedCount),
        String(row.inProgressCount),
        formatDurationMinutes(row.avgResponseMin),
        formatDurationMinutes(row.avgResolutionMin),
        row.resolvedCount > 0 ? `${row.slaCompliancePct}%` : '—',
      ]),
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      theme: 'grid',
    });

    nextY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Rincian Tiket Gangguan Jaringan & Server SKPD', 14, nextY);

  autoTable(doc, {
    startY: nextY + 3,
    head: [
      [
        'No. Tiket',
        'Tanggal Lapor',
        'SKPD Pelapor',
        'Judul Gangguan',
        'Kategori',
        'Prioritas',
        'Teknisi Ditunjuk',
        'Respon',
        'Penyelesaian',
        'Status / SLA',
      ],
    ],
    body:
      summary.tickets.length > 0
        ? summary.tickets.map((t) => {
            const respEval = getResponseSlaEvaluation(t);
            const resEval = getResolutionSlaEvaluation(t);
            const slaSummary =
              t.status === 'Selesai'
                ? `Closed (${resEval.label})`
                : `${t.status} (${respEval.label})`;
            return [
              t.ticketNumber,
              formatDateTimeId(t.reportedAtMs),
              t.skpdName,
              t.title,
              t.category,
              t.priority,
              getAssignedTechLabel(t) || 'Belum Ditunjuk',
              formatDurationMinutes(t.responseMinutes),
              formatDurationMinutes(t.resolutionMinutes),
              slaSummary,
            ];
          })
        : [['—', '—', 'Tidak ada tiket gangguan pada periode yang dipilih', '', '', '', '', '', '', '']],
    styles: { fontSize: 8, cellPadding: 2.2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 28 },
      2: { cellWidth: 34 },
      3: { cellWidth: 44 },
      6: { cellWidth: 32 },
      9: { cellWidth: 32 },
    },
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    theme: 'grid',
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  let signY = finalY;
  if (signY + 28 > pageHeight) {
    doc.addPage();
    signY = 25;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Mengetahui,', pageWidth - 75, signY);
  doc.setFont('helvetica', 'bold');
  doc.text('Kepala Seksi Infrastruktur dan Jaringan', pageWidth - 75, signY + 5);
  doc.setFont('helvetica', 'normal');
  doc.text('Dinas Komunikasi dan Informatika', pageWidth - 75, signY + 10);
  doc.line(pageWidth - 75, signY + 26, pageWidth - 18, signY + 26);

  doc.save(`Lapor_Kominfo_${summary.fileSlug}.pdf`);
}

export function exportReportToExcel(summary: ComputedReportSummary): void {
  const wb = XLSX.utils.book_new();

  const overviewRows = [
    ['LAPOR KOMINFO — DINAS KOMUNIKASI DAN INFORMATIKA'],
    ['SEKSI INFRASTRUKTUR DAN JARINGAN'],
    [summary.scopeLabel || 'LAPORAN REKAPITULASI PENANGANAN GANGGUAN JARINGAN & SERVER SKPD'],
    ['Periode Laporan', summary.periodLabel],
    ['Tanggal Cetak', formatDateTimeId(Date.now())],
    [],
    ['Indikator Kinerja (KPI)', 'Nilai'],
    ['Total Tiket Gangguan Masuk', summary.totalTickets],
    ['Open Ticket', summary.openCount],
    ['On Hold', summary.onHoldCount],
    ['Closed Ticket (Selesai)', summary.resolvedCount],
    ['Tingkat Penyelesaian (%)', `${summary.completionRatePct}%`],
    ['Rata-Rata Waktu Respon Kominfo', formatDurationMinutes(summary.avgResponseMin)],
    ['Rata-Rata Waktu Penyelesaian', formatDurationMinutes(summary.avgResolutionMin)],
    ['Kepatuhan SLA Respon (%)', `${summary.responseSlaPct}%`],
    ['Kepatuhan SLA Penyelesaian (%)', `${summary.resolutionSlaPct}%`],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);
  wsOverview['!cols'] = [{ wch: 42 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Ringkasan Periode');

  if (!summary.scopeLabel && summary.techRows.length > 0) {
    const techHeader = [
      'Nama Pegawai',
      'NIP',
      'Spesialisasi',
      'Total Tiket Ditugaskan',
      'Selesai',
      'Sedang Proses',
      'Rata-Rata Respon (Menit)',
      'Rata-Rata Penyelesaian (Menit)',
      'Kepatuhan SLA (%)',
    ];
    const techData = summary.techRows.map((row) => [
      row.name,
      row.nip,
      row.spesialisasi,
      row.totalAssigned,
      row.resolvedCount,
      row.inProgressCount,
      row.avgResponseMin || 0,
      row.avgResolutionMin || 0,
      row.resolvedCount > 0 ? row.slaCompliancePct : 0,
    ]);
    const wsTech = XLSX.utils.aoa_to_sheet([techHeader, ...techData]);
    wsTech['!cols'] = [
      { wch: 28 },
      { wch: 24 },
      { wch: 26 },
      { wch: 20 },
      { wch: 12 },
      { wch: 15 },
      { wch: 24 },
      { wch: 28 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, wsTech, 'Kinerja Pegawai');
  }

  const ticketHeader = [
    'No. Tiket',
    'Waktu Lapor',
    'SKPD Pelapor',
    'PIC Pelapor',
    'Kontak SKPD',
    'Judul Gangguan',
    'Kategori',
    'Prioritas',
    'Status',
    'Teknisi Ditunjuk',
    'Alasan On Hold',
    'Target Respon (Mnt)',
    'Waktu Respon Aktual (Mnt)',
    'Evaluasi SLA Respon',
    'Target Selesai (Mnt)',
    'Waktu Penyelesaian Aktual (Mnt)',
    'Evaluasi SLA Penyelesaian',
    'Akar Masalah',
    'Tindakan Perbaikan',
  ];
  const ticketData = summary.tickets.map((t) => [
    t.ticketNumber,
    formatDateTimeId(t.reportedAtMs),
    t.skpdName,
    t.skpdPicName,
    t.skpdContact,
    t.title,
    t.category,
    t.priority,
    t.status,
    getAssignedTechLabel(t) || 'Belum Ditunjuk',
    t.holdReason || '-',
    t.slaResponseTargetMinutes,
    t.responseMinutes || 0,
    getResponseSlaEvaluation(t).label,
    t.slaResolutionTargetMinutes,
    t.resolutionMinutes || 0,
    getResolutionSlaEvaluation(t).label,
    t.rootCause || '-',
    t.resolutionNotes || '-',
  ]);
  const wsTickets = XLSX.utils.aoa_to_sheet([ticketHeader, ...ticketData]);
  wsTickets['!cols'] = [
    { wch: 16 },
    { wch: 20 },
    { wch: 36 },
    { wch: 22 },
    { wch: 18 },
    { wch: 40 },
    { wch: 24 },
    { wch: 12 },
    { wch: 14 },
    { wch: 32 },
    { wch: 32 },
    { wch: 18 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 26 },
    { wch: 24 },
    { wch: 36 },
    { wch: 44 },
  ];
  XLSX.utils.book_append_sheet(wb, wsTickets, 'Daftar Tiket');

  XLSX.writeFile(wb, `Lapor_Kominfo_${summary.fileSlug}.xlsx`);
}
