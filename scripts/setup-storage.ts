// Membuat bucket foto absensi (privat, hanya JPEG ≤ 1 MB). Aman diulang. Jalankan: npx tsx scripts/setup-storage.ts
import "dotenv/config";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env");

const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const bucket = { id: "attendance-photos", name: "attendance-photos", public: false, file_size_limit: 1024 * 1024, allowed_mime_types: ["image/jpeg"] };

async function main() {
  const res = await fetch(`${url}/storage/v1/bucket`, { method: "POST", headers, body: JSON.stringify(bucket) });
  if (res.ok) console.log("Bucket attendance-photos dibuat (privat).");
  else {
    const body = await res.text();
    if (!/already exists|Duplicate/i.test(body)) throw new Error(`Gagal membuat bucket: ${res.status} ${body}`);
    const upd = await fetch(`${url}/storage/v1/bucket/${bucket.id}`, { method: "PUT", headers, body: JSON.stringify(bucket) });
    if (!upd.ok) throw new Error(`Gagal memperbarui bucket: ${upd.status}`);
    console.log("Bucket attendance-photos sudah ada; pengaturan privat diperbarui.");
  }
}

main();
