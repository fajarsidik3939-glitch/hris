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
| 7 | Implementation Foundation & Authentication | IN PROGRESS (M0 prasyarat) |
| 8 | Employee Management & Organization | NOT STARTED |
| 9 | Selfie GPS Attendance | NOT STARTED |
| 10 | Attendance Management, Shift & Scheduling | NOT STARTED |
| 11 | Leave, Permission & Approval Workflow | NOT STARTED |
| 12 | Impor Fingerprint (slot semula Overtime; lembur pindah ke Phase 15) | NOT STARTED |
| 13 | Dashboard, Reports & Notifications | NOT STARTED |
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
- BELUM: migrasi & seed ke Supabase, uji login end-to-end, push GitHub, deploy Vercel (menunggu `.env` diisi user).

## Langkah berikutnya
User mengisi `.env` (DATABASE_URL, DIRECT_URL, SEED_ADMIN_PASSWORD) → migrasi + seed → uji login → push → deploy Vercel. Setelah Phase 1 di-APPROVE, lanjut ke Phase 2 (Mind Map & Scope).
