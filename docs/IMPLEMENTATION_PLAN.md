# Implementation Plan — HRIS (Phase 6)

Status: READY FOR REVIEW (2026-10-22). Dasar: semua dokumen Phase 1–5 yang sudah APPROVED.

## 1. Ringkasan milestone
| Milestone | Phase | Isi | Dependensi | Status |
|---|---|---|---|---|
| **M0** Prasyarat | sebelum 7 | Git, akun GitHub/Vercel/Supabase, folder permanen | – | NOT STARTED |
| **M1** Fondasi & Auth | 7 | Proyek, login, RBAC, audit, layout per role, deploy preview | M0 | NOT STARTED |
| **M2** Organisasi & Karyawan | 8 | Cabang, dept, jabatan, lokasi + peta, hari libur, karyawan, akun | M1 | NOT STARTED |
| **M3** Selfie GPS Attendance | 9 | Master shift + clock-in/out selfie GPS, riwayat karyawan | M2 | NOT STARTED |
| **M4** Jadwal, Rekap & Koreksi | 10 | Jadwal rotasi, rekap harian/bulanan, kehadiran HR, approval engine, koreksi, notifikasi | M3 | NOT STARTED |
| **M5** Cuti & Izin | 11 | Jenis cuti, saldo (ledger), pengajuan, approval, pembatalan | M4 | NOT STARTED |
| **M6** Impor Fingerprint | 12 * | Unggah file, pemetaan kolom, preview, gabung ke rekap | M4 + contoh file mesin (Q9) | NOT STARTED |
| **M7** Dashboard, Laporan & Ekspor | 13 | Dashboard 3 role, laporan, ekspor xlsx/csv untuk payroll | M5, M6 + format payroll (Q11) | NOT STARTED |
| – | 14 | Payroll & Benefits | **Di luar scope** (keputusan Phase 1) | SKIPPED |
| – | 15 | Modul tambahan (lembur, rekrutmen, dll.) | Setelah MVP stabil | NOT STARTED |
| **M8** Testing, Security & UAT | 16 | Uji menyeluruh, review keamanan, UAT dengan pengguna HR | M7 | NOT STARTED |
| **M9** Deployment & Go-Live | 17 | Rencana production, backup, checklist go-live | M8 | NOT STARTED |

\* **Perubahan slot:** Phase 12 semula "Overtime Management". Karena lembur sudah dipindah ke future scope (keputusan Phase 2), slot Phase 12 dipakai untuk **Impor Fingerprint**. Lembur dikerjakan di Phase 15.

Setiap milestone diakhiri laporan approval. Milestone berikutnya tidak dimulai sebelum APPROVE.

## 2. Definition of Done (berlaku untuk semua milestone)
- [ ] Scope milestone selesai, tanpa fitur di luar scope.
- [ ] Acceptance criteria dicek satu per satu, dengan hasil dilaporkan jujur.
- [ ] Validasi input di server (Zod) dan pengecekan permission + scope data di server.
- [ ] Unit test untuk logika baru; semua test lulus (`npm test`).
- [ ] `npm run lint`, `npm run typecheck`, dan `npm run build` lulus.
- [ ] Migrasi tersedia dan sudah diterapkan di database dev.
- [ ] Aksi penting tercatat di audit log.
- [ ] UI memiliki state loading, empty, error, dan success; dicek di lebar 360 px dan desktop.
- [ ] `docs/PROGRESS.md` dan `docs/DECISIONS.md` diperbarui; risiko yang tersisa dilaporkan.
- [ ] Deploy preview Vercel berjalan (mulai M1).

## 3. Detail milestone

### M0 — Prasyarat (dikerjakan user, dibantu panduan)
- **Tujuan:** lingkungan siap untuk coding dan deploy.
- **Tugas:**
  1. Pilih folder permanen untuk proyek; sesi dipindah ke sana.
  2. Pasang Git for Windows.
  3. Buat akun GitHub, Vercel, dan Supabase. User sendiri yang login, membuat akun, dan menyalin kunci.
  4. Buat proyek Supabase "hris-dev" di region Singapore.
  5. Buat repository GitHub privat.
- **Acceptance:** `git --version` jalan; proyek Supabase aktif; repo privat ada.
- **Risiko:** salah menyalin kunci rahasia ke chat. Kunci hanya dimasukkan langsung ke `.env.local` dan dashboard Vercel.

### M1 — Fondasi & Authentication (Phase 7)
- **Tujuan:** aplikasi kosong yang aman, bisa login, dan sudah online di URL HTTPS.
- **Scope:**
  - Scaffold Next.js + TypeScript + Tailwind + shadcn/ui + Prisma + Zod + Vitest.
  - Migrasi `001_auth_audit_settings` + seed (6 role, permission matrix, Super Admin, settings default).
  - Login/logout, session DB, rate limit, wajib ganti password di login pertama, ubah password.
  - Helper `requireUser` / `requirePermission` + scope data; helper audit log.
  - Layout: sidebar desktop dan bottom nav HP, dengan menu sesuai role.
  - Halaman Super Admin: kelola pengguna (buat, nonaktifkan, reset password, atur role).
  - Header keamanan, `.env.example`, deploy ke Vercel preview.
- **Area terdampak:** `prisma/`, `src/server/auth.ts`, `src/server/audit.ts`, `src/app/(auth)`, `src/app/(app)/layout`, `src/app/(app)/admin`.
- **Acceptance criteria:**
  1. Login benar → masuk Beranda; login salah → pesan generik.
  2. Gagal login 5× dalam 15 menit → login diblokir sementara.
  3. Akun nonaktif tidak bisa login, dan session-nya langsung terhapus.
  4. Password tersimpan sebagai hash scrypt (dicek di DB).
  5. Menu dan URL halaman yang tidak diizinkan → ditolak (403), bukan sekadar disembunyikan.
  6. Login, logout, buat/ubah pengguna, dan reset password tercatat di audit log; UPDATE/DELETE pada `audit_logs` ditolak database.
  7. Aplikasi bisa dibuka di HP lewat URL HTTPS Vercel.
- **Test plan:** unit (hash/verify password, rate limit, permission resolver); integrasi (login → session → logout; akses tanpa izin = 403; trigger audit); E2E Playwright login.
- **Risiko:** konfigurasi koneksi Supabase (pooler vs direct URL) untuk Prisma di Vercel.

### M2 — Organisasi & Karyawan (Phase 8)
- **Tujuan:** HR bisa mengisi data master dan karyawan.
- **Scope:**
  - Migrasi `002_org_employee`.
  - CRUD: cabang, departemen, jabatan, hari libur.
  - Lokasi kerja dengan peta Leaflet (klik peta / isi koordinat, lingkaran radius).
  - Karyawan: daftar (cari, filter, pagination), tambah, ubah, detail (tab Profil/Pekerjaan/Riwayat Perubahan), nonaktifkan, buat akun login.
  - Atur atasan langsung (cegah diri sendiri dan siklus).
  - Atur tipe kerja dan metode absen.
- **Acceptance criteria:**
  1. NIK karyawan dan ID fingerprint unik; duplikat ditolak dengan pesan jelas.
  2. Atasan tidak boleh diri sendiri atau membentuk siklus.
  3. Supervisor hanya melihat bawahan langsung; Dept Manager hanya departemennya; Employee hanya profil sendiri.
  4. Nonaktifkan karyawan → akun nonaktif + session terhapus + tercatat di audit (sebelum/sesudah).
  5. Radius lokasi hanya menerima 10–5000 m.
  6. Data master yang masih dipakai tidak bisa dihapus (hanya dinonaktifkan).
- **Test plan:** unit (validasi siklus atasan, validator); integrasi (CRUD + scope data per role); E2E (HR menambah karyawan + membuat akun → karyawan login).

### M3 — Selfie GPS Attendance (Phase 9) ★ fitur utama
- **Tujuan:** karyawan bisa clock-in/out dengan selfie + GPS dari HP.
- **Scope:**
  - Migrasi `003_shift_schedule` (master shift + shift default karyawan) dan `004_attendance`.
  - Pengaturan shift (termasuk shift malam).
  - Halaman Absen: komponen kamera (tanpa galeri), status izin, ambil lokasi + akurasi, kompres foto, idempotency key, layar hasil, layar error izin (Android & iPhone).
  - API `/api/attendance`: validasi, jam server, penentuan tanggal kerja (§5.1), clock-out (§5.2), label lokasi (§5.3), terlambat/durasi (§5.5), simpan foto privat, transaksi + audit.
  - Beranda karyawan (status hari ini, tombol Clock In/Out) dan Riwayat milik sendiri.
- **Acceptance criteria:**
  1. Clock-in dari HP Android (Chrome) dan iPhone (Safari) lewat URL HTTPS selesai < 30 detik.
  2. Hanya kamera langsung; tidak ada pilihan unggah galeri.
  3. Kamera ditolak / lokasi ditolak → panduan tampil, tidak ada error teknis.
  4. Tanpa lokasi atau akurasi > 100 m → tetap tersimpan dengan label **Akurasi rendah**.
  5. Jarak dihitung server; label benar untuk dalam radius, luar radius, dan Lapangan.
  6. Tekan Kirim dua kali / jaringan mengulang request → hanya 1 event tersimpan.
  7. Shift malam 22:00–06:00: clock-in 21:50 dan clock-out 06:05 keesokan hari masuk ke satu record dengan tanggal kerja hari pertama.
  8. Jam yang tercatat adalah jam server, walaupun jam HP diubah.
  9. Foto tidak bisa dibuka tanpa login/izin; link foto kedaluwarsa dalam 5 menit.
  10. Ukuran foto tersimpan ≤ 150 KB.
- **Test plan:**
  - Unit: haversine, label lokasi, penentuan tanggal kerja (shift pagi, malam, tanpa jadwal), terlambat dengan toleransi, idempotency.
  - Integrasi: API clock-in/out dengan berbagai skenario.
  - Manual di HP sungguhan: Android + iPhone, izin ditolak, GPS mati, sinyal lemah.
- **Risiko:** perbedaan perilaku kamera di Safari; GPS indoor kurang akurat (akan banyak label Akurasi rendah).

### M4 — Jadwal, Rekap & Koreksi (Phase 10)
- **Tujuan:** HR/atasan melihat kehadiran yang benar; kesalahan absensi bisa dikoreksi lewat approval.
- **Scope:**
  - Jadwal per tanggal (`employee_schedules`), penugasan massal per minggu/bulan, dan cek bentrok.
  - Rekap harian/bulanan dengan status sesuai §5.6.
  - Halaman Kehadiran (filter, pagination, foto + peta lokasi di modal).
  - Migrasi `005_approval_correction`.
  - Approval engine 2 tingkat (§5.8), halaman Approval, pengajuan koreksi (§5.9).
  - Notifikasi in-app (lonceng) tanpa duplikat.
- **Acceptance criteria:**
  1. Status "Tidak Hadir" hanya muncul jika hari kerja terjadwal, sudah lewat, tanpa cuti/izin/libur.
  2. Koreksi melalui atasan → HR; penolakan wajib alasan; koreksi final mengubah rekap, sedangkan event asli tetap ada.
  3. Karyawan tanpa atasan → langsung tahap HR.
  4. Tidak ada yang bisa menyetujui pengajuannya sendiri.
  5. Supervisor hanya melihat dan menyetujui timnya.
  6. Satu kejadian = satu notifikasi per penerima.
- **Test plan:** unit (status rekap semua kombinasi, alur approval, skip atasan); integrasi (koreksi end-to-end + audit before/after); E2E (karyawan ajukan koreksi → atasan setuju → HR setuju → rekap berubah).

### M5 — Cuti & Izin (Phase 11)
- **Tujuan:** pengajuan cuti/izin digital dengan saldo yang konsisten.
- **Scope:**
  - Migrasi `006_leave`.
  - Pengaturan jenis cuti.
  - Tombol "Proses saldo tahunan" dan penyesuaian saldo (HR Manager, alasan wajib).
  - Form pengajuan (hitung hari kerja, setengah hari, lampiran).
  - Approval memakai engine M4; pembatalan; riwayat transaksi saldo; kalender cuti tim sederhana.
  - Rekap menampilkan Cuti/Izin/Sakit.
- **Acceptance criteria:**
  1. Jumlah hari tidak menghitung hari libur dan hari off.
  2. Pengajuan melebihi saldo tersedia (saldo − pending) ditolak.
  3. Tanggal tumpang tindih dengan pengajuan sendiri ditolak.
  4. Final approve → saldo berkurang tepat sekali; batal sebelum tanggal mulai → saldo kembali.
  5. Dua approval bersamaan untuk karyawan yang sama tidak membuat saldo minus (uji konkurensi).
  6. Jenis yang wajib lampiran tidak bisa dikirim tanpa lampiran.
  7. Semua perubahan saldo terlihat di riwayat transaksi dan audit log.
- **Test plan:** unit (hitung hari kerja, saldo tersedia, grant ulang tahun masa kerja); integrasi (approve/reject/cancel + konkurensi); E2E (ajukan → 2 tahap approval → saldo berkurang).

### M6 — Impor Fingerprint (Phase 12)
- **Prasyarat:** contoh file ekspor dari mesin fingerprint + merek/tipe (Q9).
- **Scope:**
  - Pengaturan pemetaan kolom.
  - Unggah xlsx/csv (≤ 5 MB), lalu preview valid/duplikat/ID tidak dikenal.
  - Simpan per batch dalam transaksi, lalu gabung ke rekap (§5.4).
  - Riwayat impor.
- **Acceptance criteria:**
  1. Impor file yang sama dua kali → 0 data baru pada impor kedua.
  2. ID mesin yang tidak terdaftar ditampilkan dan tidak disimpan.
  3. Karyawan "Keduanya" (selfie + fingerprint) → jam masuk paling awal dan jam pulang paling akhir.
  4. Scan shift malam masuk ke tanggal kerja yang benar.
  5. File > 5 MB atau format salah ditolak dengan pesan jelas.
- **Test plan:** unit (parser, pemetaan kolom, penggabungan); integrasi memakai file contoh asli dari mesin.

### M7 — Dashboard, Laporan & Ekspor (Phase 13)
- **Prasyarat:** daftar kolom yang dibutuhkan sistem payroll (Q11).
- **Scope:**
  - Dashboard HR, atasan, dan karyawan sesuai mockup.
  - Laporan kehadiran, keterlambatan, ketidakhadiran, dan cuti (filter tanggal/cabang/dept/status).
  - Ekspor xlsx/csv, termasuk format rekap untuk payroll.
  - Penghapusan otomatis foto > 12 bulan (tombol HR / jadwal).
- **Acceptance criteria:**
  1. Angka dashboard sama dengan hasil query rekap; tidak ada angka dummy.
  2. Ekspor mengikuti filter dan scope role; atasan hanya mengekspor timnya.
  3. File ekspor terbuka benar di Excel (tanggal Indonesia, angka tidak rusak).
  4. Rekap 1 bulan untuk 100 karyawan selesai < 5 detik.
- **Test plan:** integrasi (angka dashboard vs rekap, scope ekspor); manual (buka file di Excel).

### M8 — Testing, Security Review & UAT (Phase 16)
- Checklist dari master prompt §14: login & permission, pemisahan data, CRUD karyawan, validasi lokasi, GPS buruk, kamera/lokasi ditolak, absen dobel, shift malam, koreksi, approval & saldo cuti, audit log, akses foto, migrasi, production build.
- Review keamanan: OWASP Top 10, header, rate limit, dependency audit (`npm audit`).
- UAT dengan 3–5 pengguna nyata (HR, atasan, karyawan pabrik dan lapangan) di HP masing-masing.
- **Output:** `docs/TESTING.md` berisi hasil per skenario, bug, dan perbaikannya.

### M9 — Deployment & Go-Live (Phase 17)
- Pilih hosting production (berbayar/VPS, mempertimbangkan UU PDP).
- Backup otomatis harian + uji restore, rencana rollback, smoke test.
- Panduan admin dan pengguna, serta pemberitahuan pemrosesan data ke karyawan.
- **Output:** `docs/DEPLOYMENT.md`. Go-live hanya dengan approval terpisah.

## 4. Risiko roadmap
| Risiko | Dampak | Mitigasi |
|---|---|---|
| M0 tertunda (akun/Git belum siap) | Phase 7 tidak bisa mulai | Panduan langkah demi langkah di awal Phase 7. |
| Contoh file fingerprint (Q9) belum ada | M6 tertunda | M6 bisa digeser setelah M7; M7 tetap jalan dengan data selfie saja. |
| Format payroll (Q11) belum ada | Ekspor payroll belum final | Ekspor rekap umum dulu; format khusus menyusul. |
| Uji HP butuh perangkat nyata (Android + iPhone) | Bug kamera/GPS lolos | Sediakan minimal 1 Android dan 1 iPhone untuk uji di M3. |
| Free tier habis / di-pause | Testing terhenti | Pantau kuota; aktifkan ulang proyek Supabase. |

## 5. Yang dibutuhkan dari user per milestone
| Kapan | Kebutuhan |
|---|---|
| Sebelum M1 | M0 selesai (folder, Git, akun). |
| M2 | Daftar cabang, departemen, jabatan, koordinat lokasi kerja, daftar karyawan (boleh data contoh dulu). |
| M3 | 1 HP Android + 1 iPhone untuk uji; jam shift yang berlaku. |
| M5 | Konfirmasi jenis cuti dan aturan perusahaan. |
| M6 | Contoh file ekspor mesin fingerprint (Q9). |
| M7 | Kolom yang dibutuhkan sistem payroll (Q11). |
| M8 | 3–5 pengguna untuk UAT. |
