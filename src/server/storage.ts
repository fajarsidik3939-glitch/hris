import "server-only";

// Supabase Storage lewat REST (tanpa SDK). Bucket privat; akses foto hanya via signed URL berumur pendek.
export const PHOTO_BUCKET = "attendance-photos";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

export async function uploadPhoto(path: string, bytes: Uint8Array<ArrayBuffer>) {
  const { url, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/${PHOTO_BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/jpeg", "x-upsert": "false" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Upload foto gagal (${res.status})`);
}

/** Hapus foto (dipakai bila penyimpanan absensi gagal setelah upload). Tidak melempar error. */
export async function removePhoto(path: string) {
  const { url, headers } = config();
  await fetch(`${url}/storage/v1/object/${PHOTO_BUCKET}`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [path] }),
  }).catch(() => {});
}

/** URL sementara untuk melihat foto (default 5 menit). */
export async function signedPhotoUrl(path: string, expiresInSec = 300): Promise<string> {
  const { url, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/sign/${PHOTO_BUCKET}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: expiresInSec }),
  });
  if (!res.ok) throw new Error(`Gagal membuat URL foto (${res.status})`);
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${url}/storage/v1${signedURL}`;
}
