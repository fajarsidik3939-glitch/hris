# Progress — HRIS

| Fase | Nama | Status |
|------|------|--------|
| 0 | Project Audit & Initial Assessment | APPROVED (2026-10-22) |
| 1 | Requirement Discovery & Business Analysis | APPROVED (2026-10-22, revisi 1) |
| 2 | Mind Mapping, Module Mapping & Scope Planning | APPROVED (2026-10-22) |
| 3 | UI/UX Planning & Wireframe | APPROVED (2026-10-22, revisi 1) |
| 4 | System Architecture & Technology Selection | APPROVED (2026-10-22) |
| 5 | Database Design, ERD & Business Rules | APPROVED (2026-10-22) |
| 6 | Development Roadmap & Acceptance Criteria | APPROVED (2026-10-22) |
| 7 | Implementation Foundation & Authentication | APPROVED (2026-10-23, login dari HP berhasil) |
| 8 | Employee Management & Organization | APPROVED (2026-10-23) |
| 9 | Selfie GPS Attendance | APPROVED (2026-10-23) |
| 10 | Attendance Management, Shift & Scheduling | APPROVED (2026-10-23) |
| 11 | Leave, Permission & Approval Workflow | APPROVED (2026-10-23) |
| 12 | Impor Fingerprint (slot semula Overtime; lembur pindah ke Phase 15) | BLOCKED (menunggu contoh file mesin, Q9) |
| 13 | Dashboard, Reports & Notifications | READY FOR REVIEW |
| 14 | Payroll & Benefits | SKIPPED (di luar scope) |
| 15 | Additional HR Modules | NOT STARTED |
| 16 | Integration Testing, Security Review & UAT | NOT STARTED |
| 17 | Deployment Planning & Go-Live Approval | NOT STARTED |
| 18 | Post-Launch Evaluation & Improvement | NOT STARTED |

## Phase 0 — hasil audit (2026-10-22)
- Folder proyek: kosong (proyek baru, belum ada kode, belum git repository).
- Lingkungan Windows 11: Node.js v24.22.1, npm 11.19.1 terpasang.
- Belum terpasang: Git, PostgreSQL, Docker, Python, pnpm.
- Fitur yang sudah ada: tidak ada.
- File dibuat: `CLAUDE.md`, `docs/PROGRESS.md`, `docs/DECISIONS.md`.
- Test: belum ada (belum ada kode).

## Masalah terbuka
- Folder proyek permanen belum dipilih (saat ini di folder sementara sesi).
- Git dan PostgreSQL perlu dipasang sebelum Phase 7.

## Phase 1 — draf requirement (2026-10-22)
- Draf di `docs/REQUIREMENTS.md`, berisi asumsi sementara (label [ASUMSI]) dan pertanyaan terbuka Q1–Q8.
- Belum ada kode fitur.
- Revisi 1: jawaban Q1–Q8 dimasukkan (manufaktur 100 org, 3 cabang WIB, kantor+shift+lapangan, approval atasan→HR, absensi luar radius tetap diterima dengan label, payroll di sistem lain, integrasi fingerprint, cloud gratis untuk testing). Pertanyaan baru Q9–Q11 tidak menghambat Phase 2.

## Phase 2 — mind map & scope (2026-10-22)
- `docs/MINDMAP.md`: mind map sistem, dependensi modul, alur absensi/approval/fingerprint, MVP scope, future scope, prioritas, risiko.

## Phase 3 — UI/UX plan (2026-10-22)
- `docs/UI_UX_PLAN.md`: sitemap per role, user journeys, wireframe ASCII 11 halaman, design system, component inventory, state UI, acceptance criteria.
- Revisi 1 (permintaan user: pakai gambar): mockup visual statis `docs/mockup/index.html` (12 layar). Preview lokal via `.claude/launch.json` (port 5500).

## Phase 4 — arsitektur (2026-10-22)
- `docs/ARCHITECTURE.md`: stack, hosting free tier, diagram arsitektur, struktur folder, alur data absensi, API, auth, keamanan, deployment, risiko.

## Phase 5 — desain database (2026-10-22)
- `docs/DATABASE_DESIGN.md`: ERD 28 tabel MVP, data dictionary, constraint & index, permission matrix, aturan bisnis detail, retensi, rencana migrasi.

## Phase 6 — roadmap (2026-10-22)
- `docs/IMPLEMENTATION_PLAN.md`: milestone M0–M9, pemetaan ke Phase 7–17, acceptance criteria, test plan, DoD, risiko.

## M0 — prasyarat
- [x] Folder permanen: `D:\HRIS` (2026-10-22).
- [x] Git 2.55.0 terpasang via winget (2026-10-22).
- [x] Akun GitHub `fajarsidik3939-glitch`, repo privat `hris` (oleh user).
- [x] Akun Vercel (oleh user).
- [x] Proyek Supabase `hris-dev` (oleh user).

## Phase 7 / M1 — fondasi & auth (IN PROGRESS)
Sudah dibuat (2026-10-22):
- Next.js 16.4 + TypeScript + Tailwind v4 + shadcn/ui (radix), Prisma 7.10 (adapter `pg`), Zod 4, Vitest 5, tsx.
- Migrasi `20261022000001_auth_audit_settings` (9 tabel) + trigger append-only `audit_logs` + RLS aktif di semua tabel (menutup REST API Supabase).
- Seed: 6 role, 21 permission + matrix, system_settings default, Super Admin dari `SEED_ADMIN_PASSWORD`.
- Auth: hash scrypt (N=2^17), session DB (token di-hash SHA-256, cookie httpOnly, idle 12 jam sliding), rate limit login (5 gagal/15 menit per akun, 30 per IP), wajib ganti password sementara.
- Halaman: `/login`, `/ganti-password`, `/beranda`, `/admin/pengguna` (buat akun, role, reset password, nonaktifkan), 403 (`forbidden()`), error state.
- Header keamanan (CSP, HSTS, nosniff, X-Frame-Options, Permissions-Policy kamera/lokasi).

Hasil cek:
- `npm test`: 10/10 lulus (hash password, merge permission, matrix, validator).
- `npm run typecheck`, `npm run lint`, `npm run build`: lulus.
- Git: remote `origin` = github.com/fajarsidik3939-glitch/hris. Push pertama harus dijalankan user (butuh login GitHub interaktif) — BELUM berhasil per 2026-10-22.
- Supabase dev (`snbvslgcszifcstwpidh`, host `aws-0-ap-southeast-1.pooler`): migrasi 001 + seed sudah diterapkan. Catatan: karakter `#` di password DB harus ditulis `%23` di URL.
- Cek database: 6 role, 21 permission, 69 role_permissions, 7 settings; UPDATE/DELETE/TRUNCATE `audit_logs` ditolak; semua tabel ber-RLS.
- Akun uji DEV: `uji-admin` (Super Admin), `uji-karyawan` (Employee, sekarang nonaktif), `uji-supervisor`; password di `.env.test-accounts` (di-ignore Git). Skrip: `scripts/create-test-accounts.ts`.

Hasil uji end-to-end (browser, localhost):
| Acceptance M1 | Hasil |
|---|---|
| 1. Login benar → Beranda; salah → pesan generik | LULUS |
| 2. 5x gagal / 15 menit → diblokir | LULUS (percobaan ke-6 diblokir) |
| 3. Akun nonaktif tidak bisa login, sesi terhapus | LULUS |
| 4. Password tersimpan hash scrypt | LULUS (cek DB) |
| 5. Halaman tanpa izin → 403 | LULUS (HTTP 403; tanpa login → 307 ke /login) |
| 6. Audit login/logout/akun; UPDATE/DELETE audit ditolak DB | LULUS; tidak ada password/hash/token di audit |
| 7. Bisa dibuka di HP via HTTPS Vercel | Online di https://hris-2ohe.vercel.app (region sin1, header keamanan aktif, /admin tanpa login → 307 /login). Uji login dari HP oleh user: MENUNGGU |
- Wajib ganti password sementara, validasi konfirmasi password, tampilan 375 px tanpa scroll horizontal: LULUS.
- Kinerja (production lokal → Supabase Singapore): login ±0,7 detik; request pertama setelah server start ±9 detik (cold start).

- Deploy: GitHub `main` → Vercel otomatis. `vercel.json` mengunci framework Next.js + region `sin1` (deploy pertama 404 karena preset terdeteksi salah).

## Phase 8 / M2 — organisasi & karyawan (READY FOR REVIEW, 2026-10-23)
Dibuat:
- Migrasi `20261023000002_org_employee`: companies, branches, departments, positions, work_locations, holidays, employees + CHECK (radius 10–5000, koordinat, atasan ≠ diri, tgl keluar ≥ tgl masuk, hari kerja 1–7) + unique hari libur `NULLS NOT DISTINCT` + RLS. Sudah diterapkan ke Supabase dev.
- `/organisasi` (org.manage): tab Perusahaan, Cabang, Departemen, Jabatan, Lokasi Kerja (peta Leaflet/OSM, klik untuk pilih titik, lingkaran radius), Hari Libur.
- `/karyawan` (employee.read + scope): cari, filter cabang/dept/status, pagination 20; tambah/ubah (employee.manage); detail tab Profil/Pekerjaan/Riwayat Perubahan; nonaktifkan (tgl keluar + alasan, akun ikut nonaktif + sesi dihapus) & aktifkan kembali; buat akun login (ID = NIK, password sementara tampil sekali).
- Scope data: OWN (Employee → langsung ke profil sendiri), TEAM (diri + bawahan langsung), DEPARTMENT, ALL; di luar scope → 404.
- Data contoh dev: `scripts/sample-org.ts` (3 cabang, 5 dept, 4 jabatan, 8 karyawan, 2 hari libur; koordinat perkiraan). Akun uji tambahan: `uji-hr` (HR Admin).

Hasil cek:
- `npm test` 21/21 lulus (+ siklus atasan, scope, validator organisasi). typecheck, lint, build lulus.
- Uji browser (localhost): NIK & ID fingerprint duplikat ditolak (keduanya sekaligus); metode fingerprint tanpa ID ditolak; siklus atasan ditolak; tgl keluar < tgl masuk ditolak; nonaktif → akun nonaktif; riwayat perubahan terbaca (label & nama, bukan ID); radius 5 m ditolak; hari libur ganda ditolak; klik peta mengisi koordinat; Supervisor lihat 3 orang (diri + 2 bawahan), data di luar tim 404, /organisasi & /karyawan/baru & /admin/pengguna 403; Employee hanya profil sendiri; tampilan 375 px tanpa scroll horizontal halaman.
- Bug ditemukan & diperbaiki saat uji: (1) form login sebelum JS siap terkirim GET → password di URL (dev, akun uji) — login kembali pakai `action`, form lain `method="post"`; (2) password sementara akun karyawan hilang dari layar setelah refresh; (3) peta tidak pindah ke titik lokasi saat dibuka; (4) duplikat NIK + fingerprint hanya 1 error.
- Kinerja: membuka koneksi baru ke pooler Supabase kadang 9–16 detik dari laptop ini (TCP ±50 ms, query ±50 ms) → koneksi idle dipertahankan 5 menit. Halaman normal 0,4–0,6 detik; request pertama setelah server start tetap lambat.


## Phase 9 / M3 — selfie GPS (IN PROGRESS, 2026-10-23)
Dibuat:
- Migrasi `20261023000003_shift_attendance`: shifts (menit sejak 00:00 WIB), employees.default_shift_id, attendance_records (unik per karyawan × tanggal kerja), attendance_events + trigger: tidak bisa diubah/dihapus kecuali mengosongkan photo_path (retensi). RLS aktif.
- `src/lib/attendance.ts`: tanggal kerja (shift malam ikut tanggal mulai), terlambat (toleransi), pulang awal, haversine, label lokasi, keputusan masuk/pulang (`decideAction`).
- API `POST /api/attendance`: cek Origin (CSRF), sesi, izin, karyawan aktif & metode absen; foto JPEG ≤ 1 MB; jam server; idempotency; upload ke bucket privat `attendance-photos` (Supabase Storage REST) lalu transaksi record + event + audit; foto dihapus bila transaksi gagal.
- `GET /api/attendance/photo/[eventId]`: cek izin + scope → redirect signed URL 5 menit.
- Halaman: `/absen` (kamera depan tanpa galeri, status kamera/lokasi, preview, ulangi, kirim, layar hasil, panduan izin Android/iPhone, batas tunggu GPS 15 detik), Beranda (shift, tombol CLOCK IN/OUT, masuk/pulang/durasi), `/riwayat` (31 hari, link foto). Tab Shift di Organisasi; shift default di form karyawan.
- Shift contoh di data dev: Kantor 08–17, Pagi 07–15, Siang 15–23, Malam 23–07.
- Ditunda (ponytail): jadwal rotasi per tanggal (`employee_schedules`) → M4; tabel impor fingerprint → M6.

Hasil cek (localhost, akun uji-karyawan, foto JPEG uji dari canvas karena kamera diblokir di browser aplikasi):
- `npm test` 39/39 (+ shift malam, toleransi, label, masuk/pulang termasuk shift siang→pagi). typecheck, lint, build lulus.
- Clock-in 33 m dari lokasi → Dalam radius, tanggal kerja benar; kirim ulang kunci sama → hasil sama tanpa data dobel; tap lagi < 30 menit → 409; bukan JPEG → 400; tanpa Origin/Origin asing → 403; tanpa login → 401.
- Clock-out 4,4 km → Luar radius (tetap diterima); clock-out ulang tanpa GPS → Akurasi rendah; Beranda menampilkan durasi.
- Foto tampil lewat signed URL; akses langsung ke storage tanpa izin → 400 (privat).
- Trigger: ubah jam / ganti foto / hapus event ditolak; kosongkan foto diizinkan.
- Review (ponytail-review) menemukan 8 hal; semua diperbaiki: shift berurutan dianggap pulang, kamera bisa hitam, GPS tunggu tanpa batas, logika masuk/pulang tanpa test, trigger belum diuji, Origin "null", kirim ulang tumpang tindih, join tak terpakai.
- Data uji absensi uji-karyawan 23 Okt tersimpan permanen di DB dev (event tidak bisa dihapus — sesuai desain).
- Uji HP oleh user (23 Okt 05:54): Android — login, clock-in selfie GPS sukses; akurasi ±11,7 m; foto 34 KB; label Luar radius 30,5 km (koordinat pabrik masih contoh). User menyatakan sukses dan minta lanjut.
- BELUM diuji: iPhone/Safari, clock-out dari HP (jeda 30 menit), jalur izin ditolak di HP.


## Phase 10 / M4 — jadwal, kehadiran, koreksi & approval (READY FOR REVIEW, 2026-10-23)
Dibuat:
- Migrasi `20261023000004_schedule_approval`: employee_schedules (jadwal per tanggal; shift null = libur), approval_requests, approval_steps, attendance_corrections, notifications (+ CHECK alasan/jam/komentar tolak, RLS).
- `/jadwal` (schedule.read/manage): grid mingguan; HR centang karyawan + rentang tanggal → shift / libur / kembali ke default (maks. 62 hari). Jadwal per tanggal menang atas shift default & hari libur.
- `/kehadiran` (attendance.read, disembunyikan untuk scope OWN): harian (status semua karyawan termasuk yang belum absen, label lokasi, foto di dialog + link peta OSM, filter cabang/dept/status/label, pagination) & rekap bulanan (hadir, terlambat, tidak hadir, belum clock-out, libur, total terlambat & jam kerja). Hari sebelum tanggal masuk tidak dihitung.
- Koreksi: `/pengajuan/koreksi` (jam masuk/pulang, alasan ≥ 10, maks. 31 hari ke belakang, tidak di masa depan, dicek terhadap jam yang sudah tercatat, 1 koreksi menunggu per tanggal) → `/pengajuan` (status per tahap, batalkan).
- `/approval`: tahap atasan (atasan tercatat + approval.manager) → tahap HR (approval.hr); tolak wajib alasan; baris dikunci (SELECT … FOR UPDATE) saat memutuskan; koreksi final → event CORRECTION + hitung ulang record (data asli tetap).
- Notifikasi in-app: lonceng + jumlah belum dibaca, `/notifikasi` (tandai semua dibaca); dedupe per kejadian × penerima.
- Clock-in (M3) kini memakai jadwal per tanggal (rotasi) via `loadShiftResolvers`.

Hasil cek:
- `npm test` 53/53 (+ jadwal per tanggal, status harian, koreksi, aturan approval). typecheck, lint, build lulus.
- Uji browser (HR → karyawan → supervisor → HR): jadwal Malam 2 orang × 2 hari tersimpan; Kehadiran harian (Hadir/Belum absen benar), foto di dialog, filter Luar radius, rekap bulanan; validasi koreksi (tanpa jam, masa depan, alasan pendek); koreksi 22 Okt disetujui atasan → HR → diterapkan (08:00–17:00, Terlambat 60m vs shift Pagi, "Dikoreksi"); koreksi 21 Okt ditolak atasan dengan alasan → tidak diteruskan ke HR; notifikasi tepat sasaran tanpa dobel; audit lengkap.
- Diperbaiki saat uji: rekap menghitung hari sebelum tanggal masuk sebagai tidak hadir; koreksi jam masuk saja bisa melewati jam pulang tercatat; pesan masa depan di field yang salah.
- Belum: uji di HP untuk halaman baru; ekspor Excel (M7); cuti/izin di status harian (M5).


## Phase 11 / M5 — cuti & izin (READY FOR REVIEW, 2026-10-23)
Dibuat:
- Migrasi `20261023000005_leave`: leave_types, leave_requests, leave_transactions (buku besar; trigger append-only; GRANT unik per karyawan × jenis × periode; CHECK tanggal/½ hari/alasan penyesuaian; RLS). Jenis default via seed: Tahunan, Sakit, Izin Pribadi, Menikah.
- `src/lib/leave.ts`: hitung hari kerja (dari jadwal; libur/off tidak dihitung; ½ hari = 0,5), periode hak cuti (ulang tahun masa kerja; tanpa carry-over), irisan tanggal.
- `src/server/leave.ts`: saldo = SUM buku besar periode berjalan; tersedia = saldo − menunggu; proses hak tahunan (aman diulang); kunci baris karyawan (FOR UPDATE).
- `/pengajuan/cuti`: pilih jenis (aturan tampil), tanggal, ½ hari, alasan, lampiran foto/PDF ≤ 2 MB (jenis dicek dari isi berkas) → bucket privat `leave-attachments`; validasi saldo, maks. hari, tumpuk tanggal, 31 hari kalender, 31 hari ke belakang.
- Approval memakai engine M4: kartu cuti dengan saldo sebelum/sesudah, lampiran, rekan tim/departemen yang cuti di tanggal sama; final approve → cek ulang saldo (terkunci) + transaksi USE.
- Batal: menunggu kapan saja; disetujui hanya sebelum tanggal mulai → REVERSAL (saldo kembali).
- Organisasi → tab Jenis Cuti (CRUD + tombol Proses saldo tahunan). Karyawan → tab Cuti (saldo, buku besar, penyesuaian HR Manager dengan alasan, tidak boleh minus). Beranda → sisa cuti. Kehadiran → status Cuti/Izin (harian & bulanan).
- Storage digeneralisasi (`uploadObject/removeObject/signedUrl` per bucket); batas body Server Action 3 MB.

Hasil cek:
- `npm test` 60/60 (+ hari kerja cuti, periode hak, status Cuti/Izin). typecheck, lint, build lulus.
- Uji browser (HR → karyawan → supervisor → HR → karyawan): proses saldo 8 karyawan, ulang = 0 baru; melebihi saldo, Sakit tanpa lampiran, ½ hari dua tanggal, tanggal bertumpuk → ditolak; cuti 3 hari & sakit + lampiran terkirim; saldo tersedia 9 (3 menunggu); lampiran tampil (signed URL); atasan & HR setujui → buku besar −3; batal cuti disetujui → +3, Beranda kembali 12.
- DB: transaksi saldo tidak bisa diubah/dihapus; GRANT dobel ditolak (23505); audit leave.submit/grant_annual/approval.*.
- Belum: uji di HP; uji konkurensi dua approval sekaligus secara nyata (dijaga kunci baris + cek saldo saat ajukan & saat setujui final).


## Phase 13 / M7 — dashboard, laporan & ekspor (READY FOR REVIEW, 2026-10-23)
Phase 12 (Impor Fingerprint) BLOCKED: menunggu contoh file ekspor mesin + merek/tipe (Q9). Phase 13 dikerjakan lebih dulu (sesuai risiko roadmap).

Dibuat:
- `src/server/recap.ts`: `attendanceDays` (status per karyawan × tanggal, 4 query untuk seluruh rentang) + `summarize` + `monthRange` — satu sumber angka untuk Kehadiran, ekspor, dan dashboard (Kehadiran direfaktor memakainya).
- Dashboard di Beranda untuk HR (semua) / atasan (tim/departemen): aktif, hadir, terlambat, belum absen, tidak hadir, cuti; kehadiran per cabang; approval menunggu; absen luar radius hari ini; karyawan masuk/keluar bulan ini (HR).
- `/laporan` + `GET /api/laporan` (attendance.export + scope; cuti juga perlu leave.read): Rekap bulanan (kolom payroll umum), Detail harian (≤ 31 hari), Daftar cuti (≤ 31 hari); format Excel (exceljs; tanggal dd/mm/yyyy, header beku + filter) atau CSV (Excel Indonesia: ";" + desimal koma + BOM); setiap unduhan diaudit (report.export).
- Retensi foto: Organisasi → Perusahaan (settings.manage): hapus berkas storage foto > photo.retention_months lalu kosongkan photo_path (dibolehkan trigger); data absensi tetap.
- `removeObject` menerima banyak path (hapus massal).

Hasil cek:
- `npm test` 61/61 (+ format CSV). typecheck, lint, build lulus.
- Angka dashboard = halaman Kehadiran (Hadir 2, Belum absen 6, luar radius 1, masuk/keluar 1/1).
- Ekspor: Excel valid (ZIP/xlsx), CSV rekap/harian/cuti berisi data benar (mis. koreksi 22 Okt: Terlambat 60m, Dikoreksi Ya); rentang > 31 hari → 400; atasan hanya mendapat 3 orang timnya.
- Retensi: event uji Jan 2025 → berkas terhapus dari storage, photo_path null, label & tanggal tetap; 6 foto baru tidak tersentuh; audit tercatat.
- Kinerja production (8 karyawan dev): rekap Excel 0,7–1,5 dtk, harian 31 hari CSV 0,6 dtk, Kehadiran bulanan 0,4 dtk, Beranda 0,9 dtk.
- Diperbaiki saat uji: angka "luar radius" dashboard disamakan dengan filter Kehadiran; kartu "belum terhubung" disembunyikan untuk pengguna dashboard; helper retensi dipindah dari file server action (agar tidak jadi endpoint publik).
- Data uji tambahan: absensi uji EMP-0003 tanggal 15 Jan 2025 (tanpa foto). Password uji-admin diganti (lihat .env.test-accounts).
- Belum: kontrak mendekati berakhir (belum ada data kontrak), laporan PDF (future scope), format kolom payroll khusus (Q11), uji 100 karyawan nyata.

## Langkah berikutnya
Approval Phase 13. Setelah APPROVE: Phase 12 (Impor Fingerprint) bila contoh file mesin sudah ada; bila belum, Phase 16 (Integration Testing, Security Review & UAT) untuk MVP tanpa fingerprint.
