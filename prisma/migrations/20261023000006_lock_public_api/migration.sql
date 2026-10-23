-- Keamanan (Phase 16): aplikasi tidak memakai REST API Supabase; tutup total akses role publik.
-- _prisma_migrations sebelumnya bisa dibaca/dihapus role anon lewat REST (kunci publik).
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Pertahanan berlapis: cabut semua hak anon/authenticated di skema public (RLS tetap aktif).
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, PUBLIC;

-- Tabel/fungsi baru (migrasi berikutnya) tidak otomatis diberikan ke role publik.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;
