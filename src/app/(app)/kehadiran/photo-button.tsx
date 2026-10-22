"use client";

import { useRef } from "react";

/** Foto absensi di dialog + jarak & link peta; foto dimuat lewat signed URL hanya saat dibuka. */
export function PhotoButton({ eventId, caption, lat, lng }: { eventId: string; caption: string; lat: number | null; lng: number | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const img = useRef<HTMLImageElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (img.current && !img.current.src) img.current.src = `/api/attendance/photo/${eventId}`;
          dialog.current?.showModal();
        }}
        className="text-xs text-primary underline"
      >
        Foto
      </button>
      <dialog ref={dialog} className="m-auto max-w-sm rounded-lg p-0 backdrop:bg-black/50" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="space-y-2 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL privat, tidak lewat optimasi gambar */}
          <img ref={img} alt={`Foto absensi: ${caption}`} className="aspect-[3/4] w-full rounded bg-slate-200 object-cover" />
          <p className="text-sm">{caption}</p>
          {lat !== null && lng !== null && (
            <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
              Lihat titik di peta
            </a>
          )}
          <button type="button" onClick={() => dialog.current?.close()} className="block w-full rounded-md border py-2 text-sm">
            Tutup
          </button>
        </div>
      </dialog>
    </>
  );
}
