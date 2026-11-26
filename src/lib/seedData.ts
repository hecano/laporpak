import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  SLA_TARGETS,
  TechnicianActiveStatus,
  TechnicianSpecialty,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types/ticket';

interface SeedTechnicianDef {
  name: string;
  nip: string;
  jabatan: string;
  spesialisasi: TechnicianSpecialty;
  statusAktif: TechnicianActiveStatus;
}

const SEED_TECHNICIANS: SeedTechnicianDef[] = [
  {
    name: 'Rizky Pratama, S.Kom.',
    nip: '19910512 201903 1 008',
    jabatan: 'Pranata Komputer Ahli Pertama',
    spesialisasi: 'Jaringan & Fiber Optik',
    statusAktif: 'aktif',
  },
  {
    name: 'Dewi Anggraini, S.T.',
    nip: '19930824 202012 2 011',
    jabatan: 'Analis Infrastruktur Jaringan',
    spesialisasi: 'Server & Data Center',
    statusAktif: 'aktif',
  },
  {
    name: 'Hendra Wijaya, A.Md.Kom.',
    nip: '19891103 201801 1 004',
    jabatan: 'Teknisi Jaringan Senior',
    spesialisasi: 'Keamanan & Firewall',
    statusAktif: 'lapangan',
  },
  {
    name: 'Fajar Nugroho, S.Kom.',
    nip: '19950219 202203 1 006',
    jabatan: 'Pengelola Layanan Jaringan',
    spesialisasi: 'Wireless & Akses Publik',
    statusAktif: 'aktif',
  },
];

export async function seedInitialDiskominfoData(adminUid: string, adminName: string): Promise<void> {
  const createdTechs: { id: string; name: string }[] = [];

  try {
    for (const tech of SEED_TECHNICIANS) {
      const techRef = await addDoc(collection(db, 'technicians'), {
        ...tech,
        linkedUid: '',
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      createdTechs.push({ id: techRef.id, name: tech.name });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'technicians');
  }

  const now = Date.now();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;

  interface SeedTicketSpec {
    ticketNumber: string;
    title: string;
    description: string;
    skpdName: string;
    skpdPicName: string;
    skpdContact: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    techIndices: number[];
    reportedAtMs: number;
    responseMinutes: number;
    resolutionMinutes: number;
    holdReason: string;
    rootCause: string;
    resolutionNotes: string;
  }

  const specs: SeedTicketSpec[] = [
    {
      ticketNumber: 'TIK-2026-0118',
      title: 'Koneksi Fiber Optik Utama Gedung Bappeda Terputus',
      description: 'Seluruh akses internet dan sistem e-Planning di lantai 1-3 Bappeda mati sejak pukul 08.15 WIB. Indikator LOS merah pada OLT.',
      skpdName: 'Badan Perencanaan Pembangunan Daerah (Bappeda)',
      skpdPicName: 'Budi Santoso',
      skpdContact: 'Ext. 214 / 0812-3401-8890',
      category: 'Jaringan LAN/WAN',
      priority: 'Kritis',
      status: 'Baru',
      techIndices: [],
      reportedAtMs: now - 12 * min,
      responseMinutes: 0,
      resolutionMinutes: 0,
      holdReason: '',
      rootCause: '',
      resolutionNotes: '',
    },
    {
      ticketNumber: 'TIK-2026-0117',
      title: 'Server Aplikasi SIMRS RSUD Mengalami Timeout Gateway 504',
      description: 'Layanan pendaftaran pasien rawat jalan melambat dan muncul pesan 504 Gateway Timeout ketika diakses dari loket IGD.',
      skpdName: 'RSUD Daerah',
      skpdPicName: 'dr. Ratna Sari',
      skpdContact: 'Ext. 102 / 0813-9920-4411',
      category: 'Server & Hosting',
      priority: 'Kritis',
      status: 'Ditangani',
      techIndices: [1, 2],
      reportedAtMs: now - 48 * min,
      responseMinutes: 9,
      resolutionMinutes: 0,
      holdReason: '',
      rootCause: 'Lonjakan koneksi database pool pada VM aplikasi SIMRS.',
      resolutionNotes: '',
    },
    {
      ticketNumber: 'TIK-2026-0116',
      title: 'VPN Site-to-Site Dukcapil ke Server SIAK Terputus',
      description: 'Pelayanan cetak KTP-el terkendala karena tunnel VPN IPsec dari kantor Dukcapil ke Data Center Diskominfo tidak terhubung.',
      skpdName: 'Dinas Kependudukan dan Pencatatan Sipil (Dukcapil)',
      skpdPicName: 'Agus Firmansyah',
      skpdContact: 'Ext. 308 / 0811-7721-5520',
      category: 'VPN & Interkoneksi',
      priority: 'Tinggi',
      status: 'Ditugaskan',
      techIndices: [2],
      reportedAtMs: now - 25 * min,
      responseMinutes: 14,
      resolutionMinutes: 0,
      holdReason: '',
      rootCause: '',
      resolutionNotes: '',
    },
    {
      ticketNumber: 'TIK-2026-0119',
      title: 'Penggantian Modul SFP+ Core Switch Gedung Dinas PUPR',
      description: 'Link uplink antar gedung mengalami packet loss 35% dan port SFP+ terindikasi overheat.',
      skpdName: 'Dinas Pekerjaan Umum dan Penataan Ruang (PUPR)',
      skpdPicName: 'Irwan Setiawan',
      skpdContact: 'Ext. 411',
      category: 'Perangkat Router/Switch',
      priority: 'Tinggi',
      status: 'On Hold',
      techIndices: [0, 3],
      reportedAtMs: now - 5 * hour,
      responseMinutes: 16,
      resolutionMinutes: 0,
      holdReason: 'Menunggu pengiriman modul SFP+ 10G pengganti dari gudang vendor resmi.',
      rootCause: '',
      resolutionNotes: '',
    },
    {
      ticketNumber: 'TIK-2026-0115',
      title: 'Switch Distribusi Lantai 2 Dinas PUPR Hang',
      description: 'Port Ethernet di ruang Bidang Bina Marga tidak mendapatkan IP DHCP dari router utama.',
      skpdName: 'Dinas Pekerjaan Umum dan Penataan Ruang (PUPR)',
      skpdPicName: 'Irwan Setiawan',
      skpdContact: 'Ext. 411',
      category: 'Perangkat Router/Switch',
      priority: 'Sedang',
      status: 'Selesai',
      techIndices: [0],
      reportedAtMs: now - 2 * day,
      responseMinutes: 22,
      resolutionMinutes: 135,
      holdReason: '',
      rootCause: 'Looping kabel patch cord pada port 14 memicu STP blocking.',
      resolutionNotes: 'Cabut kabel looping, aktifkan BPDU Guard pada switch distribusi, dan verifikasi konektivitas seluruh workstation.',
    },
    {
      ticketNumber: 'TIK-2026-0114',
      title: 'Bandwidth Internet Dinas Kesehatan Sangat Lambat saat Rapat Zoom',
      description: 'Kecepatan unduh turun di bawah 2 Mbps pada jam kerja pagi sehingga menghambat pelaporan Puskesmas.',
      skpdName: 'Dinas Kesehatan',
      skpdPicName: 'Siti Rahmawati',
      skpdContact: 'Ext. 209',
      category: 'Internet & Bandwidth',
      priority: 'Tinggi',
      status: 'Selesai',
      techIndices: [3],
      reportedAtMs: now - 4 * day,
      responseMinutes: 18,
      resolutionMinutes: 95,
      holdReason: '',
      rootCause: 'Limitasi queue tree belum diperbarui pasca penambahan alokasi bandwidth.',
      resolutionNotes: 'Penyesuaian profil QoS Mikrotik untuk segmen Dinas Kesehatan menjadi 150 Mbps simetris.',
    },
    {
      ticketNumber: 'TIK-2026-0113',
      title: 'Anomali Traffic & Percobaan Brute Force Portal BPKAD',
      description: 'Log firewall mencatat lonjakan request mencurigakan ke endpoint login aplikasi keuangan daerah.',
      skpdName: 'Badan Pengelola Keuangan dan Aset Daerah (BPKAD)',
      skpdPicName: 'Wahyu Hidayat',
      skpdContact: 'Ext. 115',
      category: 'Keamanan Jaringan',
      priority: 'Kritis',
      status: 'Selesai',
      techIndices: [1, 2],
      reportedAtMs: now - 6 * day,
      responseMinutes: 11,
      resolutionMinutes: 78,
      holdReason: '',
      rootCause: 'Serangan brute-force dari 14 IP eksternal terhadap portal publik.',
      resolutionNotes: 'Blokir blok IP penyerang pada WAF & Firewall utama serta aktifkan rate-limiting login.',
    },
    {
      ticketNumber: 'TIK-2026-0112',
      title: 'Kegagalan Sinkronisasi Server Dapodik Dinas Pendidikan',
      description: 'Aplikasi internal Dinas Pendidikan gagal menghubungi server database terpusat di Data Center.',
      skpdName: 'Dinas Pendidikan dan Kebudayaan',
      skpdPicName: 'Nadia Kusuma',
      skpdContact: 'Ext. 502',
      category: 'Server & Hosting',
      priority: 'Tinggi',
      status: 'Selesai',
      techIndices: [1],
      reportedAtMs: now - 10 * day,
      responseMinutes: 38,
      resolutionMinutes: 275,
      holdReason: '',
      rootCause: 'Partisi /var/log pada server VM penuh sehingga layanan MariaDB berhenti.',
      resolutionNotes: 'Pembersihan log arsip, ekspansi volume disk 50GB, dan konfigurasi logrotate otomatis.',
    },
    {
      ticketNumber: 'TIK-2026-0111',
      title: 'Access Point Ruang Rapat Sekretariat Daerah Tidak Memancarkan SSID',
      description: 'Perangkat WiFi di ruang rapat utama mati total meskipun adaptor PoE terpasang.',
      skpdName: 'Sekretariat Daerah (Setda)',
      skpdPicName: 'Haryanto',
      skpdContact: 'Ext. 101',
      category: 'Perangkat Router/Switch',
      priority: 'Sedang',
      status: 'Selesai',
      techIndices: [3],
      reportedAtMs: now - 14 * day,
      responseMinutes: 42,
      resolutionMinutes: 190,
      holdReason: '',
      rootCause: 'Injector PoE mengalami kerusakan akibat lonjakan tegangan listrik.',
      resolutionNotes: 'Penggantian injector PoE baru dan pengujian sinyal WiFi di seluruh ruang rapat.',
    },
    {
      ticketNumber: 'TIK-2026-0105',
      title: 'Putus Koneksi Metro-E Dinas Perhubungan Terminal Induk',
      description: 'CCTV pemantau lalu lintas tidak dapat diakses dari command center karena link Metro-E down.',
      skpdName: 'Dinas Perhubungan',
      skpdPicName: 'Eko Prasetyo',
      skpdContact: 'Ext. 330',
      category: 'Jaringan LAN/WAN',
      priority: 'Tinggi',
      status: 'Selesai',
      techIndices: [0, 3],
      reportedAtMs: Date.UTC(2026, 9, 18, 2, 30),
      responseMinutes: 24,
      resolutionMinutes: 210,
      holdReason: '',
      rootCause: 'Kabel dropcore fiber optik putus tersangkut kendaraan berat.',
      resolutionNotes: 'Splicing ulang kabel fiber optik 4 core dan verifikasi redaman optik (-18 dBm).',
    },
    {
      ticketNumber: 'TIK-2026-0102',
      title: 'Sertifikat SSL Portal Perizinan DPMPTSP Kedaluwarsa',
      description: 'Browser menampilkan peringatan keamanan saat pemohon membuka portal OSS daerah.',
      skpdName: 'Dinas Penanaman Modal dan PTSP',
      skpdPicName: 'Lestari Putri',
      skpdContact: 'Ext. 221',
      category: 'Keamanan Jaringan',
      priority: 'Tinggi',
      status: 'Selesai',
      techIndices: [2],
      reportedAtMs: Date.UTC(2026, 9, 7, 1, 45),
      responseMinutes: 15,
      resolutionMinutes: 65,
      holdReason: '',
      rootCause: 'Auto-renewal sertifikat TLS gagal karena rule firewall memblokir port 80 ACME.',
      resolutionNotes: 'Pembaruan sertifikat SSL wildcard dan penyesuaian aturan ACME challenge.',
    },
    {
      ticketNumber: 'TIK-2026-0089',
      title: 'Migrasi & Pemulihan Server e-Audit Inspektorat Daerah',
      description: 'Server aplikasi e-Audit tidak merespon SSH maupun HTTP setelah pemeliharaan listrik gedung.',
      skpdName: 'Inspektorat Daerah',
      skpdPicName: 'Drs. Bambang S.',
      skpdContact: 'Ext. 188',
      category: 'Server & Hosting',
      priority: 'Kritis',
      status: 'Selesai',
      techIndices: [1],
      reportedAtMs: Date.UTC(2026, 8, 14, 3, 10),
      responseMinutes: 12,
      resolutionMinutes: 110,
      holdReason: '',
      rootCause: 'Kegagalan mount filesystem setelah shutdown mendadak.',
      resolutionNotes: 'Menjalankan fsck melalui konsol hypervisor dan memverifikasi layanan web berjalan normal.',
    },
  ];

  try {
    for (const s of specs) {
      const sla = SLA_TARGETS[s.priority];
      const techs = s.techIndices.map((idx) => createdTechs[idx]).filter(Boolean);
      const techIds = techs.map((t) => t.id);
      const techNames = techs.map((t) => t.name);
      const assignedAtMs = techs.length > 0 ? s.reportedAtMs + Math.max(5, s.responseMinutes - 3) * min : 0;
      const respondedAtMs = s.responseMinutes > 0 ? s.reportedAtMs + s.responseMinutes * min : 0;
      const resolvedAtMs = s.resolutionMinutes > 0 ? s.reportedAtMs + s.resolutionMinutes * min : 0;

      const ref = await addDoc(collection(db, 'tickets'), {
        ticketNumber: s.ticketNumber,
        title: s.title,
        description: s.description,
        skpdName: s.skpdName,
        skpdPicName: s.skpdPicName,
        skpdContact: s.skpdContact,
        category: s.category,
        priority: s.priority,
        status: s.status,
        reporterUid: adminUid,
        assignedTechId: techIds[0] || '',
        assignedTechName: techNames.join(', '),
        assignedTechUid: '',
        assignedTechIds: techIds,
        assignedTechNames: techNames,
        assignedTechUids: [],
        assignedByUid: techs.length > 0 ? adminUid : '',
        holdReason: s.holdReason,
        rootCause: s.rootCause,
        resolutionNotes: s.resolutionNotes,
        slaResponseTargetMinutes: sla.responseMinutes,
        slaResolutionTargetMinutes: sla.resolutionMinutes,
        reportedAtMs: s.reportedAtMs,
        assignedAtMs,
        respondedAtMs,
        resolvedAtMs,
        responseMinutes: s.responseMinutes,
        resolutionMinutes: s.resolutionMinutes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, `tickets/${ref.id}/logs`), {
        actorUid: adminUid,
        actorName: adminName,
        action: 'Rekam Data Tiket Operasional',
        note:
          techs.length > 0
            ? `Tiket dicatat dan ditugaskan kepada ${techNames.join(', ')}.`
            : 'Tiket gangguan masuk dan menunggu penunjukan teknisi.',
        fromStatus: '',
        toStatus: s.status,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'tickets');
  }
}
