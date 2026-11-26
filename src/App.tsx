import { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { AccessSettingsView } from './components/AccessSettingsView';
import { AuthGate } from './components/AuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NewTicketModal } from './components/NewTicketModal';
import { OverviewDashboard } from './components/OverviewDashboard';
import { PelaporReportForm } from './components/PelaporReportForm';
import { ReportsExportView } from './components/ReportsExportView';
import { NavSection, Sidebar } from './components/Sidebar';
import { TechniciansView } from './components/TechniciansView';
import { TicketDetailModal } from './components/TicketDetailModal';
import { TicketListView } from './components/TicketListView';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './lib/firebase';
import { seedInitialDiskominfoData } from './lib/seedData';
import { normalizeTicket, Technician, Ticket, UserProfile, UserRole } from './types/ticket';

function getSectionMeta(section: NavSection, role: UserRole): {
  title: string;
  breadcrumb: string;
} {
  if (role === 'pelapor_skpd') {
    if (section === 'create_report') {
      return {
        title: 'Buat Laporan Gangguan',
        breadcrumb: 'Lapor Kominfo / Pelapor SKPD / Buat Laporan',
      };
    }
    return {
      title: 'Rincian Laporan Saya',
      breadcrumb: 'Lapor Kominfo / Pelapor SKPD / Rincian Laporan',
    };
  }

  if (role === 'teknisi') {
    if (section === 'tickets') {
      return {
        title: 'Daftar & Tugas Tiket Teknisi',
        breadcrumb: 'Lapor Kominfo / Teknisi / Tiket Gangguan',
      };
    }
    if (section === 'reports') {
      return {
        title: 'Ekspor Laporan Penanganan Saya',
        breadcrumb: 'Lapor Kominfo / Teknisi / Ekspor PDF & Excel',
      };
    }
    if (section === 'access') {
      return {
        title: 'Profil Akun Teknisi',
        breadcrumb: 'Lapor Kominfo / Teknisi / Profil',
      };
    }
    return {
      title: 'Ringkasan & Status SLA',
      breadcrumb: 'Lapor Kominfo / Teknisi / Ringkasan',
    };
  }

  const map: Record<NavSection, { title: string; breadcrumb: string }> = {
    overview: {
      title: 'Ringkasan Kinerja & SLA',
      breadcrumb: 'Lapor Kominfo / Kepala Seksi / Ringkasan',
    },
    tickets: {
      title: 'Tiket Gangguan & Penugasan Teknisi',
      breadcrumb: 'Lapor Kominfo / Kepala Seksi / Tiket & Penugasan',
    },
    create_report: {
      title: 'Buat Laporan Gangguan',
      breadcrumb: 'Lapor Kominfo / Kepala Seksi / Buat Laporan',
    },
    technicians: {
      title: 'Kinerja & Direktori Teknisi',
      breadcrumb: 'Lapor Kominfo / Kepala Seksi / Kinerja Teknisi',
    },
    reports: {
      title: 'Laporan PDF & Excel Bulanan / Triwulanan',
      breadcrumb: 'Lapor Kominfo / Kepala Seksi / Laporan',
    },
    access: {
      title: 'Hak Akses & Manajemen Teknisi',
      breadcrumb: 'Lapor Kominfo / Kepala Seksi / Hak Akses',
    },
  };
  return map[section];
}

function MainApplication() {
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const effectiveRole: UserRole =
    userProfile?.role === 'kepala_seksi' && previewRole
      ? previewRole
      : userProfile?.role || 'pelapor_skpd';

  // Ensure activeSection stays valid when role or previewRole changes
  useEffect(() => {
    if (!userProfile) return;
    if (effectiveRole === 'pelapor_skpd') {
      if (activeSection !== 'create_report' && activeSection !== 'tickets') {
        setActiveSection('tickets');
      }
    } else if (effectiveRole === 'teknisi') {
      if (activeSection === 'technicians' || activeSection === 'create_report') {
        setActiveSection('tickets');
      }
    } else {
      if (activeSection === 'create_report') {
        setActiveSection('overview');
      }
    }
  }, [effectiveRole, userProfile, activeSection]);

  // 1. Auth & User Profile Bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setTickets([]);
        setTechnicians([]);
        setAllUsers([]);
        setPreviewRole(null);
        setAuthReady(true);
        setDataLoading(false);
        return;
      }

      const profilePath = `users/${user.uid}`;
      try {
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        const isBootAdmin =
          user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

        if (!snap.exists()) {
          const initialRole: UserRole = isBootAdmin ? 'kepala_seksi' : 'pelapor_skpd';
          const newProfile: UserProfile = {
            uid: user.uid,
            displayName: (user.displayName || user.email || 'Pengguna').slice(0, 100),
            email: user.email || '',
            role: initialRole,
            unitSkpd: isBootAdmin
              ? 'Diskominfo - Seksi Infrastruktur & Jaringan'
              : 'Perangkat Daerah (SKPD)',
          };
          await setDoc(ref, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setUserProfile(newProfile);
          setActiveSection(initialRole === 'pelapor_skpd' ? 'tickets' : 'overview');
        } else {
          const existingData = snap.data() as UserProfile;
          const resolvedProfile =
            isBootAdmin && existingData.role !== 'kepala_seksi'
              ? { ...existingData, role: 'kepala_seksi' as UserRole }
              : existingData;
          setUserProfile(resolvedProfile);
          if (resolvedProfile.role === 'pelapor_skpd') {
            setActiveSection('tickets');
          } else if (resolvedProfile.role === 'teknisi') {
            setActiveSection('tickets');
          }
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, profilePath);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 2. Live Firestore Subscriptions (strictly matching RBAC rules)
  useEffect(() => {
    if (!authReady || !firebaseUser || !userProfile) return;

    setDataLoading(true);
    const isBootAdmin =
      firebaseUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase() ||
      userProfile.role === 'kepala_seksi';
    const isStaffUser = isBootAdmin || userProfile.role === 'teknisi';

    const unsubscribers: Array<() => void> = [];

    if (isStaffUser) {
      const qTickets = query(collection(db, 'tickets'), orderBy('reportedAtMs', 'desc'));
      unsubscribers.push(
        onSnapshot(
          qTickets,
          (snap) => {
            setTickets(
              snap.docs.map((d) =>
                normalizeTicket(d.id, d.data() as Record<string, unknown>)
              )
            );
            setDataLoading(false);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'tickets')
        )
      );

      const qTechs = query(collection(db, 'technicians'), orderBy('name', 'asc'));
      unsubscribers.push(
        onSnapshot(
          qTechs,
          (snap) => {
            setTechnicians(
              snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as Omit<Technician, 'id'>),
              }))
            );
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'technicians')
        )
      );
    } else {
      const qReported = query(
        collection(db, 'tickets'),
        where('reporterUid', '==', firebaseUser.uid)
      );
      unsubscribers.push(
        onSnapshot(
          qReported,
          (snap) => {
            setTickets(
              snap.docs
                .map((d) =>
                  normalizeTicket(d.id, d.data() as Record<string, unknown>)
                )
                .sort((a, b) => b.reportedAtMs - a.reportedAtMs)
            );
            setDataLoading(false);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'tickets')
        )
      );
    }

    if (isBootAdmin) {
      unsubscribers.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => {
            setAllUsers(snap.docs.map((d) => d.data() as UserProfile));
          },
          (err) => handleFirestoreError(err, OperationType.LIST, 'users')
        )
      );
    }

    unsubscribers.push(
      onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserProfile);
          }
        },
        (err) =>
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`)
      )
    );

    return () => {
      for (const unsub of unsubscribers) unsub();
    };
  }, [authReady, firebaseUser?.uid, userProfile?.role]);

  async function handleSignIn() {
    setAuthLoading(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Gagal masuk dengan Google. Pastikan pop-up diizinkan browser.'
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
  }

  async function handleSeedData() {
    if (!userProfile) return;
    setSeeding(true);
    try {
      await seedInitialDiskominfoData(userProfile.uid, userProfile.displayName);
    } finally {
      setSeeding(false);
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        Memuat sesi Lapor Kominfo...
      </div>
    );
  }

  if (!firebaseUser || !userProfile) {
    return (
      <AuthGate
        onSignIn={handleSignIn}
        loading={authLoading}
        errorMsg={authError}
      />
    );
  }

  const unassignedCount = tickets.filter(
    (t) => (!t.assignedTechIds || t.assignedTechIds.length === 0) && !t.assignedTechId
  ).length;
  const selectedTicket =
    tickets.find((t) => t.id === selectedTicketId) || null;
  const headerMeta = getSectionMeta(activeSection, effectiveRole);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        userProfile={userProfile}
        effectiveRole={effectiveRole}
        unassignedCount={unassignedCount}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on left, 1 primary action on right */}
        <header className="bg-white border-b border-slate-200 px-6 lg:px-8 py-4 flex items-center justify-between gap-8">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">{headerMeta.breadcrumb}</p>
            <h1 className="font-display text-lg font-bold text-slate-900 truncate">
              {headerMeta.title}
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              effectiveRole === 'pelapor_skpd'
                ? setActiveSection('create_report')
                : setNewTicketOpen(true)
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat Laporan Gangguan
          </button>
        </header>

        {/* Workspace Role Switcher Toolbar (only for Kepala Seksi to preview all 3 role dashboards) */}
        {userProfile.role === 'kepala_seksi' && (
          <div className="bg-slate-100 border-b border-slate-200 px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-600">
              Mode Tampilan Dashboard (Kepala Seksi dapat meninjau tampilan tiap peran):
            </span>
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
              {(
                [
                  { id: 'kepala_seksi', label: 'Kepala Seksi' },
                  { id: 'teknisi', label: 'Teknisi' },
                  { id: 'pelapor_skpd', label: 'Pelapor' },
                ] as const
              ).map((r) => {
                const isActive = effectiveRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setPreviewRole(r.id === 'kepala_seksi' ? null : r.id)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-blue-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <main className="flex-1 p-6 lg:p-8 max-w-[1360px] w-full">
          {activeSection === 'create_report' && effectiveRole === 'pelapor_skpd' && (
            <PelaporReportForm
              existingTickets={tickets}
              userProfile={userProfile}
              onCreated={() => setActiveSection('tickets')}
            />
          )}

          {activeSection === 'overview' && effectiveRole !== 'pelapor_skpd' && (
            <OverviewDashboard
              tickets={tickets}
              technicians={technicians}
              userProfile={userProfile}
              effectiveRole={effectiveRole}
              loading={dataLoading}
              seeding={seeding}
              onSeedData={handleSeedData}
              onOpenNewTicket={() => setNewTicketOpen(true)}
              onSelectTicket={(t) => setSelectedTicketId(t.id)}
              onNavigateTickets={() => setActiveSection('tickets')}
              onNavigateReports={() => setActiveSection('reports')}
            />
          )}

          {activeSection === 'tickets' && (
            <TicketListView
              tickets={tickets}
              technicians={technicians}
              userProfile={userProfile}
              effectiveRole={effectiveRole}
              onSelectTicket={(t) => setSelectedTicketId(t.id)}
              onOpenNewTicket={() =>
                effectiveRole === 'pelapor_skpd'
                  ? setActiveSection('create_report')
                  : setNewTicketOpen(true)
              }
            />
          )}

          {activeSection === 'technicians' && effectiveRole === 'kepala_seksi' && (
            <TechniciansView
              technicians={technicians}
              tickets={tickets}
              userProfile={userProfile}
            />
          )}

          {activeSection === 'reports' && effectiveRole !== 'pelapor_skpd' && (
            <ReportsExportView
              tickets={tickets}
              technicians={technicians}
              userProfile={userProfile}
              effectiveRole={effectiveRole}
            />
          )}

          {activeSection === 'access' && effectiveRole !== 'pelapor_skpd' && (
            <AccessSettingsView
              userProfile={userProfile}
              allUsers={allUsers}
              technicians={technicians}
              seeding={seeding}
              onSeedData={handleSeedData}
            />
          )}
        </main>
      </div>

      {newTicketOpen && (
        <NewTicketModal
          existingTickets={tickets}
          userProfile={userProfile}
          onClose={() => setNewTicketOpen(false)}
          onCreated={() => setActiveSection('tickets')}
        />
      )}

      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          technicians={technicians}
          userProfile={userProfile}
          effectiveRole={effectiveRole}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApplication />
    </ErrorBoundary>
  );
}
