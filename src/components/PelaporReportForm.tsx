import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { createTicket } from '../lib/ticketService';
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

interface PelaporReportFormProps {
  existingTickets: Ticket[];
  userProfile: UserProfile;
  onCreated: () => void;
}

export function PelaporReportForm({
  existingTickets,
  userProfile,
  onCreated,
}: PelaporReportFormProps) {
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
      setTitle('');
      setDescription('');
      setSkpdContact('');
      onCreated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim laporan gangguan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Formulir Pelaporan Gangguan Jaringan &amp; Server
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporkan kendala infrastruktur TI di SKPD Anda agar segera ditangani tim teknis Kominfo
          </p>
        </div>
        <span className="font-mono text-xs font-semibold text-slate-700">
          {nextTicketNumber}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              SKPD / Instansi Pelapor
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
                required
                placeholder="Contoh: Dinas Sosial"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Pelapor / PIC SKPD
            </label>
            <input
              type="text"
              value={skpdPicName}
              onChange={(e) => setSkpdPicName(e.target.value)}
              maxLength={100}
              required
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kontak / Nomor Telepon / Ekstensi
            </label>
            <input
              type="text"
              value={skpdContact}
              onChange={(e) => setSkpdContact(e.target.value)}
              maxLength={60}
              required
              placeholder="Contoh: 0812-xxxx / Ext. 204"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Judul Gangguan
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
              required
              placeholder="Contoh: Koneksi Internet & VPN Kantor Dinas Terputus"
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kategori Gangguan
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
              Tingkat Prioritas
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
              Target SLA: {SLA_TARGETS[priority].label}
            </p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Kronologi &amp; Detail Gangguan
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={5}
              required
              placeholder="Jelaskan lokasi ruangan/gedung, perangkat terdampak, serta gejala yang muncul..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? 'Mengirim Laporan...' : 'Kirim Laporan Gangguan'}
          </button>
        </div>
      </form>
    </div>
  );
}
