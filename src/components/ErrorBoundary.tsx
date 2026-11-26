import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  detail: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', detail: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = 'Terjadi gangguan pada aplikasi saat memproses data.';
    let detail = error.message;

    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
        path?: string;
      };
      if (parsed.error && parsed.operationType) {
        message = `Akses basis data ditolak atau gagal saat operasi ${parsed.operationType.toUpperCase()} (${parsed.path || '-'}).`;
        detail = parsed.error;
      }
    } catch {
      // Not JSON structured error
    }

    return { hasError: true, message, detail };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-lg p-8">
            <div className="flex items-center gap-3 text-red-700 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h2 className="text-lg font-semibold text-slate-900">
                Kendala Akses atau Pemrosesan Data
              </h2>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed mb-3">
              {this.state.message}
            </p>
            <p className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded p-3 mb-6 break-words">
              {this.state.detail}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
