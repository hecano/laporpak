import { ClipboardList, LogIn, ShieldCheck, Wrench } from 'lucide-react';

interface AuthGateProps {
  onSignIn: () => void;
  loading: boolean;
  errorMsg: string | null;
}

export function AuthGate({ onSignIn, loading, errorMsg }: AuthGateProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between gap-8">
        <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
          Lapor Kominfo
        </span>
        <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
          Dinas Komunikasi dan Informatika · Seksi Infrastruktur &amp; Jaringan
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700 mb-3">
                Portal Ticketing Gangguan Jaringan &amp; Server SKPD
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4 [text-wrap:balance]">
                Masuk ke Lapor Kominfo Sesuai Peran Anda
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed mb-8">
                Sistem terpusat untuk melaporkan gangguan infrastruktur TI, menugaskan tim teknisi Kominfo, memantau status Open, On Hold, hingga Closed, serta mengevaluasi kecepatan respon SLA dan ekspor laporan PDF/Excel.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-6">
              {errorMsg && (
                <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}
              <button
                type="button"
                onClick={onSignIn}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                {loading ? 'Menghubungkan Akun...' : 'Masuk dengan Akun Google'}
              </button>
              <p className="text-xs text-slate-500 mt-3">
                Hak akses dashboard otomatis menyesuaikan peran akun Anda (Kepala Seksi, Teknisi, atau Pelapor SKPD).
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-8 flex flex-col justify-between gap-6">
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-900 mb-5">
                Akses Berbasis Peran Pengguna
              </h2>
              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Kepala Seksi
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Memantau seluruh tiket &amp; SLA, menugaskan satu atau lebih teknisi, mengelola hak akses pengguna/teknisi, dan ekspor laporan bulanan/triwulanan.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 flex items-start gap-3">
                  <Wrench className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Teknisi Kominfo
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Melihat seluruh laporan dan tugas yang ditunjuk kepadanya (Open, On Hold, Closed), memperbarui progress perbaikan, serta ekspor laporan khusus tugasnya.
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5 flex items-start gap-3">
                  <ClipboardList className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Pelapor SKPD
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Membuat laporan gangguan baru dan memantau rincian progres perbaikan serta teknisi yang menangani laporan miliknya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-8 py-4 text-xs text-slate-500 flex items-center justify-between">
        <span>Lapor Kominfo — Seksi Infrastruktur dan Jaringan</span>
        <span>Dinas Komunikasi dan Informatika</span>
      </footer>
    </div>
  );
}
