// Membuat bucket privat untuk foto absensi & lampiran cuti. Aman diulang. Jalankan: npx tsx scripts/setup-storage.ts
import "dotenv/config";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env");

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const BUCKETS = [
  { id: "attendance-photos", name: "attendance-photos", public: false, file_size_limit: 1024 * 1024, allowed_mime_types: ["image/jpeg"] },
  { id: "leave-attachments", name: "leave-attachments", public: false, file_size_limit: 2 * 1024 * 1024, allowed_mime_types: ["image/jpeg", "image/png", "application/pdf"] },
];

async function main() {
  for (const bucket of BUCKETS) {
    const res = await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers, body: JSON.stringify(bucket) });
    if (res.ok) {
      console.log(`Bucket ${bucket.id} dibuat (privat).`);
      continue;
    }
    const body = await res.text();
    if (!/already exists|Duplicate/i.test(body)) throw new Error(`Gagal membuat bucket ${bucket.id}: ${res.status} ${body}`);
    const upd = await fetch(`${url}/storage/v1/bucket/${bucket.id}`, { method: "PUT", headers, body: JSON.stringify(bucket) });
    if (!upd.ok) throw new Error(`Gagal memperbarui bucket ${bucket.id}: ${upd.status}`);
    console.log(`Bucket ${bucket.id} sudah ada; pengaturan privat diperbarui.`);
  }
}

main();
