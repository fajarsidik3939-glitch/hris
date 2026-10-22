"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Circle, Map as LeafletMap } from "leaflet";

// Default: kawasan industri Cikarang, dipakai bila koordinat belum diisi.
const DEFAULT_CENTER: [number, number] = [-6.3, 107.15];

type Props = {
  latitude: number | null;
  longitude: number | null;
  radiusM: number;
  onPick: (lat: number, lng: number) => void;
};

/** Peta OpenStreetMap: klik untuk memilih titik; lingkaran menunjukkan radius absensi. */
export function MapPicker(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const circle = useRef<Circle | null>(null);
  const latest = useRef(props);

  // Terapkan titik & radius terbaru ke peta (dipanggil setelah peta siap dan setiap props berubah).
  const sync = () => {
    const { latitude, longitude, radiusM } = latest.current;
    if (!map.current || !circle.current || latitude === null || longitude === null) return;
    circle.current.setLatLng([latitude, longitude]).setRadius(radiusM || 0);
    map.current.setView([latitude, longitude], Math.max(map.current.getZoom(), 16));
  };

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current || map.current) return;
      map.current = L.map(el.current).setView(DEFAULT_CENTER, 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      }).addTo(map.current);
      circle.current = L.circle(DEFAULT_CENTER, { radius: 0, color: "#1d4ed8" }).addTo(map.current);
      map.current.on("click", (e) => latest.current.onPick(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))));
      sync();
      // Gambar ulang setelah ukuran kontainer final (mis. di dalam form yang baru dibuka).
      setTimeout(() => map.current?.invalidateSize(), 100);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // Peta dibuat sekali; nilai terbaru dibaca lewat ref `latest`.
  }, []);

  useEffect(() => {
    latest.current = props;
    sync();
  });

  return (
    <div className="space-y-1">
      <div ref={el} className="h-64 w-full overflow-hidden rounded-md border" role="application" aria-label="Peta lokasi kerja" />
      <p className="text-xs text-muted-foreground">Klik peta untuk memilih titik lokasi. Lingkaran biru = radius absensi.</p>
    </div>
  );
}
