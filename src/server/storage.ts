import "server-only";

// Supabase Storage lewat REST (tanpa SDK). Bucket privat; akses berkas hanya via signed URL berumur pendek.
export const PHOTO_BUCKET = "attendance-photos";
export const LEAVE_BUCKET = "leave-attachments";

function config() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}` } };
}

export async function uploadObject(bucket: string, path: string, bytes: Uint8Array<ArrayBuffer>, contentType: string) {
  const { url, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": contentType, "x-upsert": "false" },
    body: bytes,
  });
  if (!res.ok) throw new Error(`Upload berkas gagal (${res.status})`);
}

/** Hapus berkas (rollback upload gagal / retensi). Tidak melempar error; true bila berhasil. */
export async function removeObject(bucket: string, ...paths: string[]): Promise<boolean> {
  const { url, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: paths }),
  }).catch(() => null);
  return Boolean(res?.ok);
}

/** URL sementara untuk membuka berkas (default 5 menit). */
export async function signedUrl(bucket: string, path: string, expiresInSec = 300): Promise<string> {
  const { url, headers } = config();
  const res = await fetch(`${url}/storage/v1/object/sign/${bucket}/${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: expiresInSec }),
  });
  if (!res.ok) throw new Error(`Gagal membuat URL berkas (${res.status})`);
  const { signedURL } = (await res.json()) as { signedURL: string };
  return `${url}/storage/v1${signedURL}`;
}
