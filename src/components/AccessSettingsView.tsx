import React, { useState } from 'react';
import { Database, Save, UserPlus } from 'lucide-react';
import {
  adminUpdateUserRole,
  createTechnician,
  updateUserProfileSelf,
} from '../lib/ticketService';
import {
  SKPD_PRESETS,
  Technician,
  TECHNICIAN_SPECIALTIES,
  TechnicianSpecialty,
  UserProfile,
  UserRole,
} from '../types/ticket';

interface AccessSettingsViewProps {
  userProfile: UserProfile;
  allUsers: UserProfile[];
  technicians: Technician[];
  seeding: boolean;
  onSeedData: () => void;
}

export function AccessSettingsView({
  userProfile,
  allUsers,
  technicians,
  seeding,
  onSeedData,
}: AccessSettingsViewProps) {
  const [displayName, setDisplayName] = useState(userProfile.displayName);
  const [unitSkpd, setUnitSkpd] = useState(userProfile.unitSkpd);
  const [savingSelf, setSavingSelf] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);

  // Quick Add Technician inside Hak Akses
  const [newTechName, setNewTechName] = useState('');
  const [newTechNip, setNewTechNip] = useState('');
  const [newTechJabatan, setNewTechJabatan] = useState('Pranata Komputer Ahli Pertama');
  const [newTechSpec, setNewTechSpec] = useState<TechnicianSpecialty>('Jaringan & Fiber Optik');
  const [newTechUid, setNewTechUid] = useState('');
  const [addingTech, setAddingTech] = useState(false);

  const isKepalaSeksi = userProfile.role === 'kepala_seksi';

  async function handleSaveSelf(e: React.FormEvent) {
    e.preventDefault();
    setSavingSelf(true);
    setNotice(null);
    try {
      await updateUserProfileSelf(userProfile.uid, displayName, unitSkpd);
      setNotice('Profil akun Anda berhasil diperbarui.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal memperbarui profil.');
    } finally {
      setSavingSelf(false);
    }
  }

  async function handleRoleChange(target: UserProfile, newRole: UserRole) {
    setUpdatingUid(target.uid);
    setNotice(null);
    try {
      await adminUpdateUserRole({
        targetUid: target.uid,
        targetEmail: target.email,
        role: newRole,
        unitSkpd: target.unitSkpd,
        displayName: target.displayName,
        grantedByUid: userProfile.uid,
        autoAddTechnician: newRole === 'teknisi',
        existingTechnicians: technicians,
      });
      setNotice(
        newRole === 'teknisi'
          ? `${target.displayName} kini berperan sebagai Teknisi Kominfo dan ditambahkan ke daftar penugasan teknisi.`
          : `Peran untuk ${target.displayName} diperbarui menjadi ${newRole}.`
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal mengubah peran pengguna.');
    } finally {
      setUpdatingUid(null);
    }
  }

  async function handleAddTechnician(e: React.FormEvent) {
    e.preventDefault();
    if (newTechName.trim().length < 2 || newTechNip.trim().length < 3) {
      setNotice('Nama dan NIP teknisi wajib diisi.');
      return;
    }
    setAddingTech(true);
    setNotice(null);
    try {
      await createTechnician({
        name: newTechName.trim(),
        nip: newTechNip.trim(),
        jabatan: newTechJabatan.trim(),
        spesialisasi: newTechSpec,
        statusAktif: 'aktif',
        linkedUid: newTechUid.trim(),
        createdBy: userProfile.uid,
      });
      // If linked to an existing registered user, also upgrade their role to teknisi
      const matchedUser = allUsers.find((u) => u.uid === newTechUid.trim());
      if (matchedUser && matchedUser.role === 'pelapor_skpd') {
        await adminUpdateUserRole({
          targetUid: matchedUser.uid,
          targetEmail: matchedUser.email,
          role: 'teknisi',
          unitSkpd: matchedUser.unitSkpd,
          displayName: matchedUser.displayName,
          grantedByUid: userProfile.uid,
        });
      }
      setNewTechName('');
      setNewTechNip('');
      setNewTechUid('');
      setNotice('Teknisi baru berhasil ditambahkan ke direktori Seksi Infrastruktur & Jaringan.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gagal menambahkan teknisi.');
    } finally {
      setAddingTech(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {notice && (
        <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800">
          {notice}
        </div>
      )}

      {/* Self Profile Form */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <h2 className="font-display text-base font-semibold text-slate-900 mb-1">
          Profil Pengguna &amp; Unit Kerja
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Informasi identitas yang ditampilkan saat melaporkan atau menangani tiket gangguan
        </p>

        <form onSubmit={handleSaveSelf} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Unit / SKPD
              </label>
              <input
                type="text"
                list="skpd-presets-list"
                value={unitSkpd}
                onChange={(e) => setUnitSkpd(e.target.value)}
                maxLength={120}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
              <datalist id="skpd-presets-list">
                <option value="Diskominfo - Seksi Infrastruktur & Jaringan" />
                {SKPD_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3">
            <div>
              <span className="font-semibold text-slate-700">Email Terdaftar:</span>{' '}
              <span className="font-mono">{userProfile.email}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">UID Akun:</span>{' '}
              <span className="font-mono">{userProfile.uid}</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingSelf}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              {savingSelf ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
            </button>
          </div>
        </form>
      </section>

      {/* Kepala Seksi: Role Switching (User -> Teknisi) & Direct Add Teknisi */}
      {isKepalaSeksi && (
        <>
          <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Hak Akses Pengguna (Ubah User Menjadi Teknisi / Kepala Seksi)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Mengubah peran user menjadi Teknisi otomatis memberikan akses dashboard teknisi dan mendaftarkannya ke tim penugasan
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4">Nama &amp; Email</th>
                    <th className="py-3 px-4">Unit / SKPD</th>
                    <th className="py-3 px-4 font-mono">UID</th>
                    <th className="py-3 px-4">Peran Akses</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {allUsers.map((u) => (
                    <tr key={u.uid}>
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{u.displayName}</p>
                        <p className="text-xs font-mono text-slate-500">{u.email}</p>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700">{u.unitSkpd}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {u.uid.slice(0, 14)}...
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={u.role}
                          disabled={updatingUid === u.uid || u.uid === userProfile.uid}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md disabled:opacity-60"
                        >
                          <option value="kepala_seksi">Kepala Seksi</option>
                          <option value="teknisi">Teknisi Kominfo</option>
                          <option value="pelapor_skpd">Pelapor SKPD</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="font-display text-base font-semibold text-slate-900 mb-1">
              Tambahkan Teknisi Kominfo Baru
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Tambahkan personel teknis baru untuk ditugaskan menangani tiket gangguan jaringan dan server
            </p>

            <form onSubmit={handleAddTechnician} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar
                </label>
                <input
                  type="text"
                  value={newTechName}
                  onChange={(e) => setNewTechName(e.target.value)}
                  maxLength={100}
                  required
                  placeholder="Contoh: Andi Saputra, S.Kom."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP / ID Pegawai
                </label>
                <input
                  type="text"
                  value={newTechNip}
                  onChange={(e) => setNewTechNip(e.target.value)}
                  maxLength={35}
                  required
                  placeholder="19940101 202012 1 003"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jabatan
                </label>
                <input
                  type="text"
                  value={newTechJabatan}
                  onChange={(e) => setNewTechJabatan(e.target.value)}
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
                  value={newTechSpec}
                  onChange={(e) => setNewTechSpec(e.target.value as TechnicianSpecialty)}
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
                  Tautkan Akun User (Opsional)
                </label>
                <select
                  value={newTechUid}
                  onChange={(e) => setNewTechUid(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                >
                  <option value="">-- Belum Ditautkan ke Akun Login --</option>
                  {allUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={addingTech}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer disabled:opacity-60"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {addingTech ? 'Menambahkan...' : 'Tambahkan Teknisi'}
                </button>
              </div>
            </form>
          </section>

          <section className="bg-white border border-slate-200 rounded-lg p-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Data Operasional Contoh (Triwulan III &amp; IV)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Muat daftar teknisi Kominfo dan 12 tiket gangguan SKPD lintas bulan (termasuk On Hold &amp; penugasan multi-teknisi)
              </p>
            </div>
            <button
              type="button"
              disabled={seeding}
              onClick={onSeedData}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-50 rounded-md cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <Database className="w-4 h-4 text-blue-700" />
              {seeding ? 'Memuat Data...' : 'Muat Data Operasional Contoh'}
            </button>
          </section>
        </>
      )}
    </div>
  );
}
