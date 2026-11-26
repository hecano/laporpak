import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  generateTicketNumber,
  SLA_TARGETS,
  SKPD_PRESETS,
  Ticket,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TicketCategory,
  TicketPriority,
  UserProfile,
} from '../types/ticket';
import { createTicket } from '../lib/ticketService';

interface NewTicketModalProps {
  existingTickets: Ticket[];
  userProfile: UserProfile;
  onClose: () => void;
  onCreated: () => void;
}

export function NewTicketModal({
  existingTickets,
  userProfile,
  onClose,
  onCreated,
}: NewTicketModalProps) {
  const [skpdChoice, setSkpdChoice] = useState<string>(
    SKPD_PRESETS.includes(userProfile.unitSkpd) ? userProfile.unitSkpd : SKPD_PRESETS[0]
  );
  const [customSkpd, setCustomSkpd] = useState('');
  const [skpdPicName, setSkpdPicName] = useState(userProfile.displayName || '');
  const [skpdContact, setSkpdContact] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Jaringan LAN/WAN');
  const [priority, setPriority] = useState<TicketPriority>('Tinggi');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nextTicketNumber = generateTicketNumber(existingTickets, new Date().getFullYear());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const finalSkpd = skpdChoice === '__lainnya__' ? customSkpd.trim() : skpdChoice;
    if (finalSkpd.length < 2) {
      setErrorMsg('Nama SKPD pelapor wajib diisi.');
      return;
    }
    if (title.trim().length < 5) {
      setErrorMsg('Judul gangguan minimal 5 karakter.');
      return;
    }
    if (description.trim().length < 5) {
      setErrorMsg('Deskripsi kronologi gangguan minimal 5 karakter.');
      return;
    }
    if (skpdContact.trim().length < 3) {
      setErrorMsg('Kontak / nomor ekstensi pelapor wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await createTicket({
        ticketNumber: nextTicketNumber,
        title: title.trim(),
        description: description.trim(),
        skpdName: finalSkpd,
        skpdPicName: skpdPicName.trim() || userProfile.displayName,
        skpdContact: skpdContact.trim(),
        category,
        priority,
        reporterUid: userProfile.uid,
        reporterName: userProfile.displayName,
      });
      onCreated();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan tiket gangguan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-ticket-title"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="new-ticket-title" className="font-display text-base font-semibold text-slate-900">
              Buat Tiket Pelaporan Gangguan Baru
            </h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Nomor Tiket Otomatis: {nextTicketNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                SKPD / Perangkat Daerah Pelapor
              </label>
              <select
                value={skpdChoice}
                onChange={(e) => setSkpdChoice(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              >
                {SKPD_PRESETS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__lainnya__">SKPD Lainnya (Ketik Manual)</option>
              </select>
            </div>

            {skpdChoice === '__lainnya__' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama SKPD
                </label>
                <input
                  type="text"
                  value={customSkpd}
                  onChange={(e) => setCustomSkpd(e.target.value)}
                  maxLength={120}
                  placeholder="Contoh: Dinas Sosial Kabupaten"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama PIC / Pelapor SKPD
              </label>
              <input
                type="text"
                value={skpdPicName}
                onChange={(e) => setSkpdPicName(e.target.value)}
                maxLength={100}
                required
                placeholder="Nama pejabat/staf pelapor"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kontak / Ekstensi Kantor
              </label>
              <input
                type="text"
                value={skpdContact}
                onChange={(e) => setSkpdContact(e.target.value)}
                maxLength={60}
                required
                placeholder="Contoh: Ext. 204 / 0812-xxxx"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Judul Ringkas Gangguan
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                required
                placeholder="Contoh: Koneksi Fiber Optik Gedung Utama Terputus Total"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kategori Infrastruktur
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tingkat Prioritas (Target SLA)
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {SLA_TARGETS[priority].label}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Detail &amp; Kronologi Gangguan
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
                required
                placeholder="Jelaskan gejala gangguan, lokasi ruangan/lantai, perangkat terdampak, dan waktu mulai kejadian..."
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'Mengirim Tiket...' : 'Kirim Tiket Gangguan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
