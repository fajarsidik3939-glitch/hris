"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LocationBadge } from "@/components/location-badge";
import { Button } from "@/components/ui/button";

type Step = "start" | "camera" | "preview" | "sending" | "done";
type Geo = { status: "waiting" | "ok" | "denied" | "unavailable"; latitude?: number; longitude?: number; accuracy?: number };
type Result = { type: "IN" | "OUT"; at: string; label: string; distanceM: number | null; locationName: string | null; lateMinutes: number };
type Problem = "camera-denied" | "no-camera" | "insecure" | null;

const PHOTO_WIDTH = 640; // ±60–100 KB pada kualitas 0,7
const time = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });

/** Alur absen: kamera langsung (tanpa galeri) + lokasi → preview → kirim → hasil (docs/UI_UX_PLAN.md W3). */
export function ClockFlow({ action, clockInAt, clockOutAt }: { action: "IN" | "OUT"; clockInAt: string | null; clockOutAt: string | null }) {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [step, setStep] = useState<Step>("start");
  const [problem, setProblem] = useState<Problem>(null);
  const [geo, setGeo] = useState<Geo>({ status: "waiting" });
  const [photo, setPhoto] = useState<{ blob: Blob; url: string; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const stopCamera = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => stopCamera, []);

  async function openCamera() {
    setError(null);
    setProblem(null);
    if (!navigator.mediaDevices?.getUserMedia) return setProblem("insecure");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false });
    } catch (e) {
      return setProblem(e instanceof DOMException && e.name === "NotAllowedError" ? "camera-denied" : "no-camera");
    }
    setStep("camera");
    requestAnimationFrame(() => {
      if (video.current) video.current.srcObject = stream.current;
    });
  }

  function start() {
    // Lokasi diminta bersamaan dengan kamera; batas tunggu 15 detik (setelah itu tetap bisa kirim).
    setGeo({ status: "waiting" });
    navigator.geolocation?.getCurrentPosition(
      (p) => setGeo({ status: "ok", latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      (e) => setGeo({ status: e.code === e.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
    if (!navigator.geolocation) setGeo({ status: "unavailable" });
    openCamera();
  }

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(PHOTO_WIDTH, v.videoWidth);
    canvas.height = Math.round((v.videoHeight / v.videoWidth) * canvas.width);
    canvas.getContext("2d")!.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return setError("Foto gagal diambil. Coba lagi.");
        stopCamera();
        // Kunci idempotensi per foto: kirim ulang foto yang sama tidak membuat absensi dobel.
        setPhoto({ blob, url: URL.createObjectURL(blob), key: crypto.randomUUID() });
        setStep("preview");
      },
      "image/jpeg",
      0.7,
    );
  }

  function retake() {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
    openCamera();
  }

  async function send() {
    if (!photo) return;
    setStep("sending");
    setError(null);
    const body = new FormData();
    body.set("photo", photo.blob, "selfie.jpg");
    body.set("idempotencyKey", photo.key);
    if (geo.status === "ok") {
      body.set("latitude", String(geo.latitude));
      body.set("longitude", String(geo.longitude));
      body.set("accuracy", String(geo.accuracy));
    }
    try {
      const res = await fetch("/api/attendance", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Absensi gagal disimpan. Coba lagi.");
        return setStep("preview");
      }
      setResult(data);
      setStep("done");
      router.refresh();
    } catch {
      setError("Tidak ada koneksi internet. Periksa sinyal lalu tekan Kirim lagi.");
      setStep("preview");
    }
  }

  if (problem) return <ProblemGuide problem={problem} onRetry={openCamera} />;

  if (step === "done" && result) {
    return (
      <div role="status" className="space-y-4 rounded-lg border bg-white p-6 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-green-100 text-4xl font-extrabold text-green-700" aria-hidden>
          ✓
        </div>
        <p className="text-lg font-bold">{result.type === "IN" ? "Clock In berhasil" : "Clock Out berhasil"}</p>
        <p className="text-4xl font-extrabold">
          {time(result.at)} <span className="text-base">WIB</span>
        </p>
        <dl className="space-y-2 rounded-md bg-slate-50 p-3 text-left text-sm">
          <div className="flex justify-between gap-2">
            <dt>Lokasi</dt>
            <dd className="font-semibold">{result.locationName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Status lokasi</dt>
            <dd>
              <LocationBadge label={result.label} distanceM={result.distanceM} />
            </dd>
          </div>
          {result.type === "IN" && (
            <div className="flex justify-between gap-2">
              <dt>Ketepatan</dt>
              <dd className="font-semibold">{result.lateMinutes > 0 ? `Terlambat ${result.lateMinutes} menit` : "Tepat waktu"}</dd>
            </div>
          )}
        </dl>
        <Button asChild className="h-12 w-full text-base">
          <Link href="/beranda">KEMBALI KE BERANDA</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {step === "start" && (
        <div className="space-y-3 rounded-lg border bg-white p-4">
          {clockInAt && (
            <p className="text-sm">
              Masuk: <b>{time(clockInAt)}</b>
              {clockOutAt && (
                <>
                  {" "}· Pulang: <b>{time(clockOutAt)}</b> (clock-out lagi akan memperbarui jam pulang)
                </>
              )}
            </p>
          )}
          <button
            onClick={start}
            className="flex h-24 w-full flex-col items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold text-primary-foreground shadow-lg active:scale-[0.99]"
          >
            {action === "IN" ? "CLOCK IN" : "CLOCK OUT"}
            <span className="text-xs font-medium opacity-90">Ambil selfie + lokasi</span>
          </button>
        </div>
      )}

      {(step === "camera" || step === "preview" || step === "sending") && (
        <>
          <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-900">
            {step === "camera" ? (
              <>
                <video ref={video} autoPlay playsInline muted className="size-full -scale-x-100 object-cover" aria-label="Kamera depan" />
                <div className="pointer-events-none absolute inset-x-[20%] top-[12%] bottom-[22%] rounded-[50%] border-4 border-dashed border-white/80" />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- blob URL lokal, bukan aset yang dioptimasi
              <img src={photo?.url} alt="Preview selfie" className="size-full object-cover" />
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold" aria-live="polite">
            <span className="rounded-full bg-green-100 px-2 py-1 text-green-800">📷 Kamera {step === "camera" ? "aktif" : "✓"}</span>
            <GeoChip geo={geo} />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {step === "camera" ? (
            <button
              onClick={capture}
              aria-label="Ambil foto"
              className="mx-auto block size-18 rounded-full border-[6px] border-primary bg-white shadow-md active:scale-95"
            />
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" className="h-12 flex-1" onClick={retake} disabled={step === "sending"}>
                Ulangi
              </Button>
              <Button className="h-12 flex-[2] text-base" onClick={send} disabled={step === "sending" || geo.status === "waiting"}>
                {step === "sending" ? "Mengirim…" : geo.status === "waiting" ? "Menunggu lokasi…" : "KIRIM ABSEN"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GeoChip({ geo }: { geo: Geo }) {
  if (geo.status === "waiting") return <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">📍 Mencari lokasi…</span>;
  if (geo.status === "ok")
    return <span className="rounded-full bg-green-100 px-2 py-1 text-green-800">📍 Lokasi didapat (±{Math.round(geo.accuracy ?? 0)} m)</span>;
  return (
    <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-800">
      📍 {geo.status === "denied" ? "Izin lokasi ditolak" : "Lokasi tidak didapat"} — tetap bisa kirim (dicatat “Akurasi rendah”)
    </span>
  );
}

function ProblemGuide({ problem, onRetry }: { problem: Exclude<Problem, null>; onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-4 rounded-lg border bg-white p-5">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-red-100 text-3xl" aria-hidden>
        📷
      </div>
      {problem === "camera-denied" && (
        <>
          <p className="text-center text-lg font-bold">Kamera tidak diizinkan</p>
          <p className="text-center text-sm text-muted-foreground">Absen membutuhkan foto selfie. Izinkan kamera lalu coba lagi.</p>
          <div className="space-y-2 rounded-md bg-slate-50 p-3 text-sm">
            <p className="font-semibold">Android (Chrome)</p>
            <ol className="list-decimal pl-5">
              <li>Ketuk ikon 🔒 / ⓘ di sebelah alamat web</li>
              <li>Pilih Izin → Kamera (dan Lokasi)</li>
              <li>Pilih Izinkan, lalu muat ulang halaman</li>
            </ol>
            <p className="pt-1 font-semibold">iPhone (Safari)</p>
            <ol className="list-decimal pl-5">
              <li>Ketuk ikon “aA” di kolom alamat</li>
              <li>Pilih Pengaturan Situs Web</li>
              <li>Kamera dan Lokasi → Izinkan, lalu muat ulang</li>
            </ol>
          </div>
        </>
      )}
      {problem === "no-camera" && <p className="text-center text-sm">Kamera tidak ditemukan atau sedang dipakai aplikasi lain. Tutup aplikasi kamera lain lalu coba lagi.</p>}
      {problem === "insecure" && <p className="text-center text-sm">Browser ini tidak mendukung kamera di halaman ini. Buka aplikasi lewat alamat https:// di Chrome atau Safari terbaru.</p>}
      <Button className="h-12 w-full" onClick={onRetry}>
        COBA LAGI
      </Button>
    </div>
  );
}
