# HRIS — Absensi Selfie GPS

Aplikasi HRIS (Next.js + PostgreSQL/Supabase). Dokumentasi proyek ada di `docs/`; status terakhir di `docs/PROGRESS.md`.

## Menjalankan di laptop

1. Salin `.env.example` menjadi `.env`, lalu isi `DATABASE_URL`, `DIRECT_URL`, dan `SEED_ADMIN_PASSWORD`.
2. Pasang dependency: `npm install`
3. Buat tabel di database: `npm run db:migrate`
4. Isi data awal (role, permission, Super Admin): `npm run db:seed`
5. Jalankan: `npm run dev`, lalu buka http://localhost:3000

Login pertama: ID `admin` (atau nilai `SEED_ADMIN_LOGIN`) dengan `SEED_ADMIN_PASSWORD`; aplikasi akan meminta ganti password.

## Perintah lain

| Perintah | Fungsi |
|---|---|
| `npm test` | Unit test |
| `npm run typecheck` | Cek tipe TypeScript |
| `npm run lint` | Cek kode (ESLint) |
| `npm run build` | Build production |
