# Testing & Security Review — HRIS (Phase 16)

Status: READY FOR REVIEW (2026-10-23), kecuali UAT pengguna (lihat `docs/UAT.md`).
Lingkungan uji: laptop (Next.js dev & production lokal) + database Supabase dev + Vercel (https://hris-2ohe.vercel.app). Data: 8 karyawan contoh + 4 akun uji.

## 1. Ringkasan
| Area | Hasil |
|---|---|
| Unit test (`npm test`) | 61/61 lulus — shift malam, toleransi, label lokasi, masuk/pulang, status harian, koreksi, approval, hari cuti, periode hak cuti, CSV, hash password, permission, validator |
| Typecheck, lint, production build | Lulus |
| Uji end-to-end per fase (browser) | Lulus — rincian di `docs/PROGRESS.md` per Phase 7–13 |
| Matriks hak akses otomatis | **72/72** sesuai + 3 uji tanpa login |
| Review keamanan | 1 temuan serius **diperbaiki** (§4.1); risiko sisa di §5 |
| Dependency produksi (`npm audit --omit=dev`) | 0 kerentanan (setelah override `uuid`) |
| UAT pengguna nyata (Android + iPhone) | **BELUM** — menunggu user |

## 2. Checklist master prompt §14
| Skenario | Status | Bukti |
|---|---|---|
| Login & permission | ✓ | Login benar/salah, wajib ganti password, blokir 5x gagal, akun nonaktif ditolak (Phase 7); matriks §3 |
| Pemisahan akses data | ✓ | Employee hanya diri sendiri, Supervisor hanya tim, data luar scope → 404 (Phase 8, §3) |
| CRUD karyawan | ✓ | Tambah/ubah/nonaktif/aktifkan, NIK & fingerprint unik, siklus atasan ditolak (Phase 8) |
| Validasi lokasi | ✓ | Dalam radius 33 m, luar radius 4,4 km & 30,5 km (HP Android), Lapangan; jarak dihitung server (Phase 9) |
| GPS accuracy buruk | ✓ | Tanpa GPS / akurasi > 100 m → "Akurasi rendah", tetap diterima (Phase 9) |
| Kamera ditolak | ✓ (laptop) | Panduan Android/iPhone tampil; **belum diuji di HP** |
| Izin lokasi ditolak | ◐ | Jalur kode + batas tunggu 15 detik; **belum diuji di HP** |
| Clock-in/out ganda | ✓ | Kunci idempotensi (hasil sama), tap < 30 menit → 409, unik per tanggal kerja (Phase 9) |
| Shift malam | ✓ (unit) | 21:50 → 06:05 satu tanggal kerja; shift siang → pagi besok tidak jadi "pulang" (unit test); **belum diuji shift malam nyata** |
| Koreksi absensi | ✓ | Atasan → HR → diterapkan, event asli tetap, ditolak tidak diteruskan (Phase 10) |
| Approval cuti | ✓ | 2 tingkat, tolak wajib alasan, tidak bisa menyetujui diri sendiri (Phase 10–11) |
| Saldo cuti | ✓ | +12 / −3 / +3 (batal), tersedia = saldo − menunggu, melebihi saldo ditolak, buku besar append-only (Phase 11) |
| Lembur | – | Di luar MVP (future scope) |
| Payroll calculation | – | Di luar scope (sistem payroll lain; ekspor rekap tersedia) |
| Audit log | ✓ | Login/logout, data karyawan, absensi, approval, saldo, ekspor, retensi; UPDATE/DELETE/TRUNCATE ditolak DB |
| Akses foto & dokumen | ✓ | Bucket privat, signed URL 5 menit, scope dicek; akses langsung → 400 (Phase 9, 11, §3) |
| Database migration | ✓ | 6 migrasi diterapkan berurutan ke Supabase dev, semuanya tambahan (tidak destruktif) |
| Production build | ✓ | `npm run build` + deploy Vercel tiap fase |

## 3. Matriks hak akses (production lokal, 2026-10-23)
Kode: angka = HTTP status; R = diarahkan (redirect). "LAIN" = karyawan di luar tim; "FOTO-SPV" = foto absen Supervisor; "LAMPIRAN-KRY" = lampiran cuti Uji Karyawan (bawahan Supervisor).

| Halaman / API | Karyawan | Supervisor | HR Admin | Super Admin |
|---|:-:|:-:|:-:|:-:|
| /beranda | 200 | 200 | 200 | 200 |
| /absen, /riwayat | 200 | 200 | 200 | 403 |
| /pengajuan, /pengajuan/cuti | 200 | 200 | 200 | 403 |
| /approval | 403 | 200 | 200 | 403 |
| /kehadiran | 200 (diri sendiri) | 200 | 200 | 403 |
| /jadwal | 200 (diri sendiri) | 200 | 200 | 403 |
| /laporan, /api/laporan | 403 | 200 (tim) | 200 | 403 |
| /karyawan | R (ke profil sendiri) | 200 | 200 | 200 |
| /karyawan/LAIN | 404 | 404 | 200 | 200 |
| /karyawan/baru | 403 | 403 | 200 | 403 |
| /organisasi | 403 | 403 | 200 | 200 |
| /admin/pengguna | 403 | 403 | 403 | 200 |
| /notifikasi | 200 | 200 | 200 | 200 |
| /api/attendance/photo/FOTO-SPV | 404 | R (signed URL) | R | 403 |
| /api/leave/attachment/LAMPIRAN-KRY | R (miliknya) | R (bawahan) | R | 403 |

Tanpa login: halaman → R ke /login; /api/laporan & foto → 401. Semua 75 hasil sesuai permission matrix (`docs/DATABASE_DESIGN.md` §4).

## 4. Review keamanan
### 4.1 Temuan & perbaikan
| # | Temuan | Dampak | Perbaikan | Status |
|---|---|---|---|---|
| 1 | Tabel `_prisma_migrations` tanpa RLS; role `anon` (kunci publik Supabase) bisa **membaca & menghapus** riwayat migrasi lewat REST API (terbukti dengan simulasi role, di-rollback) | Gangguan deploy/migrasi; kebocoran info skema | Migrasi `20261023000006_lock_public_api`: RLS di tabel itu + cabut semua hak `anon`/`authenticated` di skema public + default privileges | **Diperbaiki & diuji** (anon ditolak di semua tabel) |
| 2 | `uuid` < 11.1.1 (via exceljs), moderate | Tidak tereksploitasi (exceljs pakai v4) | `overrides.uuid = ^11.1.1`; ekspor Excel diuji ulang | **Diperbaiki** |
| 3 | Helper retensi foto sempat diekspor dari file `"use server"` (jadi endpoint publik) | Info pengaturan terbuka | Dipindah ke `src/server/settings.ts` | **Diperbaiki** (Phase 13) |
| 4 | Form login sebelum JS siap bisa terkirim GET (password di URL) | Password di log/riwayat | Login memakai `<form action>` (POST); form lain `method="post"` | **Diperbaiki** (Phase 8) |

### 4.2 Yang diperiksa dan aman
- Semua 35 server action (termasuk login/logout yang memang publik) & 4 route API memeriksa login + permission di server sebelum menyentuh data (diaudit per fungsi); setiap halaman memanggil `requireUser`/`requirePermission`.
- CSRF: Server Action dicek Origin oleh Next.js; `POST /api/attendance` cek Origin manual (termasuk `Origin: null`); cookie `SameSite=Lax`, `HttpOnly`, `Secure` di production.
- SQL injection: hanya Prisma + `$queryRaw` tagged template (terparameter); tidak ada `queryRawUnsafe`.
- XSS: tidak ada `dangerouslySetInnerHTML`/`eval`; React escape; CSP aktif.
- Upload: foto JPEG dicek magic bytes ≤ 1 MB; lampiran JPEG/PNG/PDF dicek dari isi ≤ 2 MB; nama berkas acak; bucket privat + batas tipe/ukuran di bucket.
- Rahasia: tidak ada kunci/password di repo maupun riwayat git; `.env*` dan `.env.test-accounts` di-ignore.
- Data immutable di DB: `audit_logs`, `attendance_events` (kecuali kosongkan foto), `leave_transactions`.
- Header: CSP, HSTS, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (kamera/lokasi hanya situs sendiri).
- Enumerasi akun: pesan login generik + hash dummy (waktu respons sama).

## 5. Risiko sisa (diterima / ditunda)
| Risiko | Tingkat | Catatan |
|---|---|---|
| CSP masih `script-src 'unsafe-inline'` | Sedang | Diperlukan Next.js tanpa nonce; bisa diperketat dengan nonce via proxy sebelum production |
| 9 kerentanan "high" di alat development (shadcn CLI, eslint-config-next → braces/micromatch) | Rendah | Tidak ikut ke aplikasi yang berjalan; "fix" npm justru downgrade major |
| GPS palsu / foto dari layar | Bisnis | Tidak bisa dicegah penuh; label lokasi + metadata + pemeriksaan HR |
| Aksi `employee.manage`/`schedule.manage` tidak memfilter scope | Rendah | Saat ini hanya HR (scope ALL); perlu filter bila role ini diberi scope TEAM |
| Tabel `login_attempts` terus bertambah | Rendah | Kecil untuk 100 karyawan; bersihkan > 30 hari sebelum production |
| Free tier (Vercel non-komersial, Supabase pause 7 hari, backup manual) | Tinggi untuk production | Diputuskan di Phase 17 |
| Belum ada uji otomatis E2E (Playwright) | Sedang | Uji E2E dilakukan manual/skrip browser per fase; Playwright butuh DB uji terpisah |
| Belum diuji: iPhone/Safari, izin lokasi ditolak di HP, shift malam nyata, 100 karyawan nyata | Sedang | Masuk UAT (`docs/UAT.md`) |

## 6. Cara menjalankan ulang
- `npm test` — unit test.
- `npm run typecheck && npm run lint && npm run build`.
- `npm audit --omit=dev` — dependency produksi.
- Matriks hak akses: login sebagai tiap akun uji (`.env.test-accounts`) lalu buka halaman di tabel §3.
