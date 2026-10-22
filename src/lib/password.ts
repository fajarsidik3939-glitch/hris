import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

// Parameter scrypt sesuai rekomendasi OWASP (N=2^17, r=8, p=1).
const PARAMS = { N: 2 ** 17, r: 8, p: 1 };
const KEY_LEN = 64;

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, { ...opts, maxmem: 256 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

/** Format: scrypt$N$r$p$saltBase64$hashBase64 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return ["scrypt", PARAMS.N, PARAMS.r, PARAMS.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Password sementara untuk akun baru / reset oleh admin. */
export function generateTempPassword(): string {
  // Tanpa karakter yang mirip (0/O, 1/l/I) agar mudah dibacakan.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out.slice(0, 4) + "-" + out.slice(4, 8) + "-" + out.slice(8);
}
