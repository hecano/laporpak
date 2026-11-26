import {
  BarChart3,
  FilePlus2,
  FileSpreadsheet,
  Inbox,
  LogOut,
  Shield,
  Users,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/ticket';

export type NavSection =
  | 'overview'
  | 'tickets'
  | 'create_report'
  | 'technicians'
  | 'reports'
  | 'access';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  userProfile: UserProfile;
  effectiveRole: UserRole;
  unassignedCount: number;
  onSignOut: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  kepala_seksi: 'Kepala Seksi Infrastruktur',
  teknisi: 'Teknisi Kominfo',
  pelapor_skpd: 'Pelapor SKPD',
};

export function Sidebar({
  activeSection,
  onSelectSection,
  userProfile,
  effectiveRole,
  unassignedCount,
  onSignOut,
}: SidebarProps) {
  const navItems: {
    id: NavSection;
    label: string;
    icon: typeof BarChart3;
    badge?: number;
  }[] =
    effectiveRole === 'pelapor_skpd'
      ? [
          {
            id: 'create_report',
            label: 'Buat Laporan',
            icon: FilePlus2,
          },
          {
            id: 'tickets',
            label: 'Rincian Laporan Saya',
            icon: Inbox,
          },
        ]
      : effectiveRole === 'teknisi'
      ? [
          {
            id: 'tickets',
            label: 'Semua & Tugas Tiket',
            icon: Inbox,
          },
          {
            id: 'overview',
            label: 'Ringkasan & SLA',
            icon: BarChart3,
          },
          {
            id: 'reports',
            label: 'Ekspor Tugas Saya',
            icon: FileSpreadsheet,
          },
          {
            id: 'access',
            label: 'Profil Akun',
            icon: Shield,
          },
        ]
      : [
          {
            id: 'overview',
            label: 'Ringkasan & SLA',
            icon: BarChart3,
          },
          {
            id: 'tickets',
            label: 'Tiket & Penugasan',
            icon: Inbox,
            badge: unassignedCount > 0 ? unassignedCount : undefined,
          },
          {
            id: 'technicians',
            label: 'Kinerja Teknisi',
            icon: Users,
          },
          {
            id: 'reports',
            label: 'Laporan PDF & Excel',
            icon: FileSpreadsheet,
          },
          {
            id: 'access',
            label: 'Hak Akses & Teknisi',
            icon: Shield,
          },
        ];

  return (
    <aside className="w-full lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between lg:min-h-screen">
      <div>
        <div className="px-6 py-4 lg:py-5 border-b border-slate-200 flex items-center justify-between lg:block">
          <div>
            <p className="font-display text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
              Lapor Kominfo
            </p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Seksi Infrastruktur &amp; Jaringan
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 rounded-md"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar
          </button>
        </div>

        <nav
          className="p-3 lg:p-4 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible"
          aria-label="Menu Utama"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`lg:w-full flex items-center justify-between gap-2.5 px-3 py-2 lg:py-2.5 text-sm font-medium rounded-md transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-blue-700' : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span className="text-xs font-mono tabular-nums font-semibold text-red-700 shrink-0">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="hidden lg:block p-4 border-t border-slate-200">
        <div className="px-2 pb-3">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {userProfile.displayName}
          </p>
          <p className="text-xs text-slate-600 truncate mt-0.5">
            {ROLE_LABELS[effectiveRole]}
          </p>
          <p className="text-xs text-slate-500 truncate mt-0.5">
            {userProfile.unitSkpd}
          </p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          Keluar dari Sistem
        </button>
      </div>
    </aside>
  );
}
