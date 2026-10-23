# UAT — Uji Penerimaan Pengguna (Phase 16)

Tujuan: memastikan HRIS bisa dipakai orang sungguhan di HP & laptop mereka sendiri sebelum go-live.
Alamat: **https://hris-2ohe.vercel.app** · Waktu: ±30 menit per orang · Data: **database uji** (bukan data asli).

## Peserta (3–5 orang)
| Peran | Akun | Perangkat |
|---|---|---|
| Karyawan kantor | `uji-karyawan` atau akun baru | HP **Android** (Chrome) |
| Karyawan kantor/lapangan | akun baru | **iPhone** (Safari) |
| Atasan | `uji-supervisor` | HP atau laptop |
| HR | `uji-hr` | Laptop |
| (Opsional) Super Admin | `admin` | Laptop |

Password akun uji ada di `D:\HRIS\.env.test-accounts` (berikan langsung ke peserta, jangan lewat grup chat). Untuk akun baru, HR membuatnya dari menu **Karyawan → detail → Akun login**.

## Skenario & hasil (isi ✓ / ✗ + catatan)
### A. Karyawan (Android & iPhone)
| # | Langkah | Yang diharapkan | Android | iPhone |
|---|---|---|---|---|
| A1 | Login, ganti password sementara | Masuk Beranda | | |
| A2 | Tekan CLOCK IN, izinkan kamera & lokasi, selfie, Kirim | Hasil: jam WIB, lokasi, label | | |
| A3 | Tekan CLOCK IN lagi < 30 menit | Pesan "sudah clock-in" | | |
| A4 | Tolak izin **lokasi** di pengaturan browser, absen lagi | Tetap terkirim, label "Akurasi rendah" | | |
| A5 | Tolak izin **kamera**, buka Absen | Muncul panduan cara mengizinkan | | |
| A6 | ≥ 30 menit kemudian: CLOCK OUT | Jam pulang & durasi di Beranda | | |
| A7 | Riwayat → Foto masuk | Foto sendiri tampil | | |
| A8 | Pengajuan → + Cuti/izin → Cuti Tahunan 1 hari | Status "Menunggu", saldo tersedia berkurang | | |
| A9 | Pengajuan → + Koreksi absensi (lupa clock-out kemarin) | Status "Menunggu" | | |
| A10 | Lonceng notifikasi setelah atasan & HR memutuskan | Notifikasi disetujui/ditolak | | |

### B. Atasan
| # | Langkah | Yang diharapkan | Hasil |
|---|---|---|---|
| B1 | Beranda | Ringkasan tim hari ini | |
| B2 | Approval → setujui cuti A8, tolak koreksi A9 dengan alasan | Kartu hilang; riwayat keputusan tercatat | |
| B3 | Kehadiran → foto & label anggota tim | Hanya tim sendiri | |
| B4 | Laporan → unduh rekap bulan ini (Excel) | Hanya anggota tim; terbuka rapi di Excel | |

### C. HR
| # | Langkah | Yang diharapkan | Hasil |
|---|---|---|---|
| C1 | Organisasi → Lokasi Kerja → ubah titik ke **lokasi kantor sebenarnya** (radius 100 m) | Absen berikutnya di kantor = "Dalam radius" | |
| C2 | Organisasi → Shift → sesuaikan jam shift sebenarnya | Beranda karyawan menampilkan shift baru | |
| C3 | Karyawan → tambah 1 karyawan + akun login | Password sementara tampil sekali | |
| C4 | Jadwal → pindahkan 1 karyawan ke shift lain 1 minggu | Sel biru di jadwal | |
| C5 | Approval → setujui cuti A8 (tahap HR) | Saldo berkurang di tab Cuti karyawan | |
| C6 | Kehadiran harian & rekap bulanan | Angka sama dengan Beranda | |
| C7 | Laporan → rekap bulanan (Excel) → buka di Excel | Kolom & tanggal benar, siap untuk payroll | |

## Kriteria lulus
- Semua skenario A berhasil di **minimal 1 Android dan 1 iPhone**.
- Semua skenario B dan C berhasil.
- Tidak ada pesan error teknis / layar kosong; bila ada, catat: perangkat, menu, langkah, dan screenshot.

## Laporan hasil
Kirim tabel yang sudah diisi (atau foto/screenshot) ke Claude; temuan akan diperbaiki lalu diuji ulang sebelum Phase 17 (persiapan go-live).
