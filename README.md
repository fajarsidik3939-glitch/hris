# HRIS — Absensi Selfie GPS

Aplikasi HRIS (Next.js + PostgreSQL/Supabase). Dokumentasi proyek ada di `docs/`; status terakhir di `docs/PROGRESS.md`.

## Menjalankan di laptop

1. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`, `DIRECT_URL`, dan `SEED_ADMIN_PASSWORD`.
2. Pasang dependency: `npm install`
3. Buat tabel di database: `npm run db:migrate`
4. Isi data awal (role, permission, Super Admin): `npm run db:seed`
5. Jalankan: `npm run dev`, lalu buka http://localhost:3000

Login pertama: ID `admin` (atau nilai `SEED_ADMIN_LOGIN`) dengan `SEED_ADMIN_PASSWORD`; aplikasi akan meminta ganti password.

## Data contoh (database DEV saja)

- `npx tsx scripts/sample-org.ts` — 3 cabang, departemen, jabatan, 8 karyawan, hari libur.
- `npx tsx scripts/create-test-accounts.ts` — akun uji (password di `.env.test-accounts`, tidak ikut Git).

Setiap ada migrasi baru, jalankan `npm run db:migrate` sebelum/sesudah push agar database cocok dengan kode yang di-deploy Vercel.

## Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm test` | Unit test |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run lint` | Cek kode (ESLint) |
| `npm run build` | Build production |
