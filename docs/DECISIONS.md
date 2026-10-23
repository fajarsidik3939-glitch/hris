# Decisions — HRIS

Hanya keputusan yang sudah disetujui user (APPROVE) dicatat di sini.

| Tanggal | Fase | Keputusan | Status |
|---------|------|-----------|--------|
| 2026-10-22 | 0 | Proyek dimulai dari nol (greenfield); tidak ada kode lama yang perlu dipertahankan. | APPROVED |
| 2026-10-22 | 1 | Requirement revisi 1 (`docs/REQUIREMENTS.md`): manufaktur ±100 karyawan, 3 cabang WIB, pola kerja kantor/shift/lapangan. | APPROVED |
| 2026-10-22 | 1 | Approval cuti/izin/koreksi 2 tingkat: atasan langsung → HR. | APPROVED |
| 2026-10-22 | 1 | Absensi selfie GPS selalu diterima; lokasi disimpan + label (Dalam radius / Luar radius / Akurasi rendah), tanpa penolakan. Karyawan lapangan tanpa radius. | APPROVED |
| 2026-10-22 | 1 | Payroll di luar scope (sistem lain); HRIS mengekspor rekap Excel/CSV. Role Payroll Admin dihapus dari MVP. | APPROVED |
| 2026-10-22 | 1 | Integrasi fingerprint masuk MVP, tahap awal via impor file. | APPROVED |
| 2026-10-22 | 1 | Hosting testing di cloud free tier. | APPROVED |
| 2026-10-22 | 2 | MVP = 12 modul di `docs/MINDMAP.md` §5; lembur masuk future scope. | APPROVED |
| 2026-10-22 | 2 | Prioritas: Fondasi → Organisasi/Lokasi/Karyawan → Selfie GPS → Shift → Rekap+Approval → Cuti → Fingerprint → Dashboard/Ekspor. | APPROVED |
| 2026-10-22 | 2 | Karyawan tanpa atasan: approval langsung ke HR. Reset password MVP oleh admin. Label lokasi "Lapangan" untuk karyawan lapangan. | APPROVED |
| 2026-10-22 | 3 | UI/UX sesuai `docs/UI_UX_PLAN.md` + mockup `docs/mockup/index.html`: biru primer, 4 label lokasi berwarna + ikon, bottom nav HP, sidebar desktop, tema terang. | APPROVED |

| 2026-10-22 | 4 | Monolit Next.js (App Router) + TypeScript, Tailwind + shadcn/ui, PostgreSQL + Prisma, Zod, exceljs, Leaflet/OSM, Vitest + Playwright, Git + GitHub privat. | APPROVED |
| 2026-10-22 | 4 | Auth sendiri: scrypt (node:crypto) + session di DB + cookie httpOnly; rate limit login di DB. | APPROVED |
| 2026-10-22 | 4 | Hosting testing: Vercel Hobby + Supabase Free (Singapore, DB + storage privat). Dev lokal pakai Supabase "dev", tanpa Postgres/Docker lokal. | APPROVED |
| 2026-10-22 | 4 | Backup testing: pg_dump manual mingguan. Production diputuskan di Phase 17. | APPROVED |
| 2026-10-22 | 5 | Skema 28 tabel MVP + aturan bisnis sesuai `docs/DATABASE_DESIGN.md` (saldo cuti = ledger, audit append-only via trigger, tanpa hard delete). | APPROVED |
| 2026-10-22 | 5 | Tidak menyimpan KTP/NPWP/rekening di MVP; foto selfie dihapus otomatis setelah 12 bulan (configurable). | APPROVED |
| 2026-10-22 | 5 | Super Admin tanpa akses data absensi/foto; saldo cuti tahunan diproses via tombol HR; absen di cabang lain = Luar radius. | APPROVED |
| 2026-10-22 | 6 | Roadmap M0–M9 (`docs/IMPLEMENTATION_PLAN.md`); Phase 12 = Impor Fingerprint, Phase 14 Payroll SKIPPED; master shift dibuat di M3. | APPROVED |
| 2026-10-23 | 7 | M1 (fondasi, auth, RBAC, audit, kelola pengguna) diterima; online di https://hris-2ohe.vercel.app. | APPROVED |
| 2026-10-23 | 8 | M2 (organisasi, lokasi + peta, karyawan, scope data, akun karyawan) diterima. | APPROVED |
| 2026-10-23 | 9 | M3 (shift, absensi selfie GPS, foto privat, Beranda/Absen/Riwayat) diterima; diuji di Android. | APPROVED |
| 2026-10-23 | 10 | M4 (jadwal rotasi, kehadiran harian/bulanan, koreksi + approval 2 tingkat, notifikasi) diterima. | APPROVED |
| 2026-10-23 | 11 | Jenis cuti default (tanpa aturan khusus dari user): Tahunan 12 hari/12 bulan kerja (potong saldo, ½ hari), Sakit (wajib lampiran), Izin Pribadi (½ hari), Menikah (maks. 3 hari); sisa cuti tidak terbawa. | APPROVED (default) |
| 2026-10-23 | 11 | M5 (cuti & izin, saldo buku besar, lampiran, approval, pembatalan) diterima ("lanjut fase selanjutnya"). | APPROVED |
| 2026-10-23 | 12/13 | Phase 13 (Dashboard & Ekspor) dikerjakan sebelum Phase 12 karena contoh file fingerprint belum ada (sesuai risiko roadmap). | APPROVED |
| 2026-10-23 | 13 | M7 (dashboard, laporan & ekspor Excel/CSV, retensi foto) diterima; lanjut Phase 16 (fingerprint masih menunggu contoh file). | APPROVED |

## Keputusan teknis kecil saat implementasi (default wajar, dicatat)
| Tanggal | Milestone | Keputusan | Alasan |
|---------|-----------|-----------|--------|
| 2026-10-22 | M1 | Kolom tambahan `users.display_name`. | Akun tanpa data karyawan (Super Admin) tetap punya nama tampilan. |
| 2026-10-22 | M1 | Rahasia di file `.env` (bukan `.env.local`). | Prisma CLI dan Next.js sama-sama membaca `.env`; tetap di-ignore Git. |
| 2026-10-22 | M1 | RLS diaktifkan di semua tabel (tanpa policy). | Supabase membuka skema `public` lewat REST API; RLS menutupnya. |
| 2026-10-22 | M1 | Tanpa `SESSION_SECRET`. | Token sesi acak 32 byte dan hanya hash-nya disimpan, jadi tidak perlu kunci penanda tangan. |
| 2026-10-22 | M1 | Prisma 7 memakai driver adapter `@prisma/adapter-pg`; `tsx` untuk menjalankan seed. | Kebutuhan Prisma 7. |
| 2026-10-23 | M2 | HR (employee.manage) boleh membuat akun karyawan hanya dengan role Employee/Supervisor/Department Manager; role HR/Super Admin hanya lewat Super Admin. | Pemisahan tugas; HR tidak bisa memberi dirinya/rekan hak admin. |
| 2026-10-23 | M2 | Hari libur boleh dihapus (tidak dirujuk data lain); isi sebelum dihapus disimpan di audit log. | Lebih sederhana daripada kolom aktif/nonaktif untuk data kalender. |
| 2026-10-23 | M2 | Employee (scope OWN) yang membuka /karyawan langsung diarahkan ke profilnya. | Daftar & filter tidak berguna bila hanya 1 data. |
| 2026-10-23 | M2 | Form panjang memakai submit tanpa reset (isian tidak hilang saat error) + `method="post"`; form login/password tetap `action` bawaan. | Mencegah isian hilang; mencegah password masuk URL bila JS belum siap. |
| 2026-10-23 | M2 | Koneksi DB idle dipertahankan 5 menit. | Membuka koneksi baru ke pooler Supabase gratis kadang 9–16 detik. |
| 2026-10-23 | M2 | Tabel di HP bisa digeser horizontal (belum diubah jadi kartu). | Cukup untuk halaman HR; kartu untuk halaman karyawan dibuat di M3/M4. |
| 2026-10-23 | M3 | Jam shift disimpan sebagai menit sejak 00:00 WIB (bukan tipe time). | Hitungan shift malam lebih sederhana; semua cabang WIB. |
| 2026-10-23 | M3 | Jadwal rotasi per tanggal ditunda ke M4; M3 memakai shift default + hari kerja per karyawan. | Cukup untuk clock-in; rotasi dibuat saat dipakai. |
| 2026-10-23 | M3 | Foto ke Supabase Storage lewat REST (tanpa SDK); bucket `attendance-photos` privat, JPEG ≤ 1 MB. | Tanpa dependency tambahan. |
| 2026-10-23 | M3 | Tap berikutnya = pulang hanya bila absensi masih terbuka atau tanggal kerjanya sama (clock-out ulang); selain itu masuk. Lupa clock-in diselesaikan lewat koreksi (M4). | Mencegah shift berurutan tercatat sebagai pulang. |
| 2026-10-23 | M4 | Tahap atasan hanya bisa diputuskan atasan langsung yang tercatat saat pengajuan (dan punya izin approval.manager); HR tidak bisa melompati tahap atasan. | Sesuai §5.8; atasan tanpa role Supervisor perlu diberi role agar pengajuan tidak tertahan. |
| 2026-10-23 | M4 | Foto di Kehadiran tampil dalam dialog; peta lewat link OpenStreetMap (bukan peta di dalam dialog). | Lebih sederhana; informasi jarak & akurasi tetap tampil. |
| 2026-10-23 | M4 | Notifikasi ditandai dibaca lewat tombol "Tandai semua dibaca", bukan otomatis saat halaman dibuka. | Prefetch halaman tidak boleh menandai baca tanpa dilihat. |
| 2026-10-23 | M4 | Jadwal & Kehadiran memuat semua karyawan dalam scope di satu query (±100 orang). | Cukup untuk skala perusahaan; pagination/batching bila > 300 karyawan. |
| 2026-10-23 | M5 | Kalender cuti tim versi sederhana: kartu approval menampilkan rekan (atasan/departemen sama) yang cuti di tanggal sama. | Cukup untuk keputusan atasan; kalender penuh bila dibutuhkan. |
| 2026-10-23 | M5 | Proses saldo tahunan dijalankan HR (employee.manage) lewat tombol; tanpa cron. | Sesuai desain §5.7; aman diulang. |
| 2026-10-23 | M5 | Cuti disetujui yang sudah dimulai tidak bisa dibatalkan karyawan; koreksi lewat HR (penyesuaian saldo). | Mencegah saldo/rekap berubah setelah cuti berjalan. |
| 2026-10-23 | M5 | Lampiran cuti di bucket privat terpisah (JPEG/PNG/PDF ≤ 2 MB), jenis dicek dari isi berkas. | Foto absensi tetap khusus JPEG. |
| 2026-10-23 | M7 | CSV memakai ";" + desimal koma + BOM (Excel berlokal Indonesia); Excel (.xlsx) direkomendasikan untuk payroll. | Mencegah CSV terbuka satu kolom di Excel Indonesia. |
| 2026-10-23 | M7 | Rekap ekspor bersifat umum (kolom payroll lazim) sampai format sistem payroll diketahui (Q11). | Belum ada spesifikasi kolom dari user. |
| 2026-10-23 | M7 | Retensi foto dijalankan manual lewat tombol (settings.manage), bukan cron. | Free tier tanpa scheduler; tombol aman diulang. |
| 2026-10-23 | M7 | Widget "kontrak mendekati berakhir" tidak dibuat: belum ada data kontrak (future scope Dokumen & Kontrak). | Tidak ada sumber data. |
| 2026-10-23 | M8 | Aplikasi tidak memakai REST API Supabase: semua hak role anon/authenticated di skema public dicabut (migrasi 006). | Defense in depth setelah temuan _prisma_migrations. |
| 2026-10-23 | M8 | Uji E2E otomatis (Playwright) belum dibuat; diganti uji browser terskrip per fase + matriks hak akses. | Playwright perlu database uji terpisah; dipertimbangkan sebelum production. |
| 2026-10-23 | M8 | Kerentanan di alat development (shadcn CLI, eslint-config-next) diterima. | Tidak ikut runtime; perbaikan npm = downgrade major. |
