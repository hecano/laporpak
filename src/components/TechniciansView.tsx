import React, { useState } from 'react';
import { Plus, UserCog, X } from 'lucide-react';
import { createTechnician, updateTechnician } from '../lib/ticketService';
import {
  formatDurationMinutes,
  Technician,
  TECHNICIAN_SPECIALTIES,
  TechnicianActiveStatus,
  TechnicianSpecialty,
  Ticket,
  UserProfile,
} from '../types/ticket';

interface TechniciansViewProps {
  technicians: Technician[];
  tickets: Ticket[];
  userProfile: UserProfile;
}

export function TechniciansView({
  technicians,
  tickets,
  userProfile,
}: TechniciansViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [name, setName] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('Pranata Komputer Ahli Pertama');
  const [spesialisasi, setSpesialisasi] = useState<TechnicianSpecialty>('Jaringan & Fiber Optik');
  const [statusAktif, setStatusAktif] = useState<TechnicianActiveStatus>('aktif');
  const [linkedUid, setLinkedUid] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function openCreate() {
    setEditingTech(null);
    setName('');
    setNip('');
    setJabatan('Pranata Komputer Ahli Pertama');
    setSpesialisasi('Jaringan & Fiber Optik');
    setStatusAktif('aktif');
    setLinkedUid('');
    setErrorMsg(null);
    setModalOpen(true);
  }

  function openEdit(tech: Technician) {
    setEditingTech(tech);
    setName(tech.name);
    setNip(tech.nip);
    setJabatan(tech.jabatan);
    setSpesialisasi(tech.spesialisasi);
    setStatusAktif(tech.statusAktif);
    setLinkedUid(tech.linkedUid || '');
    setErrorMsg(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (name.trim().length < 2 || nip.trim().length < 3) {
      setErrorMsg('Nama dan NIP pegawai wajib diisi dengan benar.');
      return;
    }
    setSaving(true);
    try {
      if (editingTech) {
        await updateTechnician(
          editingTech.id,
          {
            name: name.trim(),
            nip: nip.trim(),
            jabatan: jabatan.trim(),
            spesialisasi,
            statusAktif,
            linkedUid: linkedUid.trim(),
          },
          userProfile.uid
        );
      } else {
        await createTechnician({
          name: name.trim(),
          nip: nip.trim(),
          jabatan: jabatan.trim(),
          spesialisasi,
          statusAktif,
          linkedUid: linkedUid.trim(),
          createdBy: userProfile.uid,
        });
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan data pegawai.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900">
            Pegawai &amp; Teknisi Seksi Infrastruktur &amp; Jaringan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pemantauan beban kerja aktif, kecepatan respon rata-rata, dan tingkat penyelesaian sesuai SLA per teknisi
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Teknisi Kominfo
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {technicians.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-800">
              Belum ada data pegawai teknisi Kominfo terdaftar.
            </p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Tambahkan pegawai Seksi Infrastruktur &amp; Jaringan agar dapat ditunjuk menangani tiket gangguan SKPD.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Teknisi Pertama
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Nama &amp; NIP</th>
                  <th className="py-3 px-4">Jabatan · Spesialisasi</th>
                  <th className="py-3 px-4 whitespace-nowrap">Ketersediaan</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Aktif</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Selesai</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Rata-Rata Respon</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Rata-Rata Selesai</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Kepatuhan SLA</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {technicians.map((tech) => {
                  const assigned = tickets.filter(
                    (t) =>
                      t.assignedTechId === tech.id ||
                      t.assignedTechIds?.includes(tech.id)
                  );
                  const active = assigned.filter((t) => t.status !== 'Selesai');
                  const resolved = assigned.filter((t) => t.status === 'Selesai');
                  const responded = assigned.filter(
                    (t) => t.respondedAtMs > 0 && t.responseMinutes > 0
                  );
                  const avgResp =
                    responded.length > 0
                      ? Math.round(
                          responded.reduce((s, t) => s + t.responseMinutes, 0) /
                            responded.length
                        )
                      : 0;
                  const avgRes =
                    resolved.length > 0
                      ? Math.round(
                          resolved.reduce((s, t) => s + t.resolutionMinutes, 0) /
                            resolved.length
                        )
                      : 0;
                  const slaMet = resolved.filter(
                    (t) => t.resolutionMinutes <= t.slaResolutionTargetMinutes
                  ).length;
                  const slaPct =
                    resolved.length > 0 ? Math.round((slaMet / resolved.length) * 100) : null;

                  return (
                    <tr key={tech.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-900">{tech.name}</p>
                        <p className="text-xs font-mono tabular-nums text-slate-500">
                          NIP {tech.nip}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <p className="font-medium text-slate-800">{tech.jabatan}</p>
                        <p className="text-slate-500 mt-0.5">{tech.spesialisasi}</p>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium whitespace-nowrap">
                        <span
                          className={
                            tech.statusAktif === 'aktif'
                              ? 'text-emerald-700'
                              : tech.statusAktif === 'lapangan'
                              ? 'text-amber-700'
                              : 'text-slate-500'
                          }
                        >
                          {tech.statusAktif === 'aktif'
                            ? 'Siaga Kantor'
                            : tech.statusAktif === 'lapangan'
                            ? 'Tugas Lapangan'
                            : 'Cuti / Izin'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-amber-700 font-semibold">
                        {active.length}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-semibold">
                        {resolved.length}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {formatDurationMinutes(avgResp)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">
                        {formatDurationMinutes(avgRes)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {slaPct !== null ? (
                          <span
                            className={
                              slaPct >= 85
                                ? 'text-emerald-700'
                                : slaPct >= 65
                                ? 'text-amber-700'
                                : 'text-red-700'
                            }
                          >
                            {slaPct}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEdit(tech)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                          Ubah
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">
                {editingTech ? 'Perbarui Data Teknisi Kominfo' : 'Tambah Teknisi Kominfo Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Contoh: Rizky Pratama, S.Kom."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP / Nomor Pegawai
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    maxLength={35}
                    required
                    placeholder="19910512 201903 1 008"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Ketersediaan
                  </label>
                  <select
                    value={statusAktif}
                    onChange={(e) => setStatusAktif(e.target.value as TechnicianActiveStatus)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  >
                    <option value="aktif">Siaga Kantor</option>
                    <option value="lapangan">Tugas Lapangan</option>
                    <option value="cuti">Cuti / Izin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jabatan
                </label>
                <input
                  type="text"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  maxLength={100}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bidang Spesialisasi
                </label>
                <select
                  value={spesialisasi}
                  onChange={(e) => setSpesialisasi(e.target.value as TechnicianSpecialty)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                >
                  {TECHNICIAN_SPECIALTIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UID Akun Google Pegawai (Opsional)
                </label>
                <input
                  type="text"
                  value={linkedUid}
                  onChange={(e) => setLinkedUid(e.target.value)}
                  maxLength={128}
                  placeholder="Isi UID jika teknisi login langsung untuk update tiket"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div className="border-t border-slate-200 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 rounded-md cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Pegawai'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
