# UI/UX Plan — HRIS (Phase 3)

Status: READY FOR REVIEW (revisi 1, 2026-10-22). Berdasarkan MVP di `docs/MINDMAP.md` §5 (APPROVED). Halaman payroll tidak ada (di luar scope); diganti **Ekspor Rekap**.

**Mockup visual:** `docs/mockup/index.html` (buka di browser), berisi 12 layar: 9 layar HP karyawan/atasan + 3 layar desktop HR.

## 1. Prinsip
- **Mobile-first untuk karyawan** (absen, riwayat, pengajuan). **Desktop-first untuk HR/admin** (tabel, impor, pengaturan), tetap bisa dibuka di HP.
- Satu aplikasi web, satu login; menu menyesuaikan role.
- Bahasa Indonesia sederhana, tanpa istilah teknis di pesan error.
- Format: tanggal `Rabu, 22 Okt 2026`, jam `07:58 WIB` (24 jam), angka `1.234`.

## 2. Sitemap & navigasi per role
| Menu | Employee | Supervisor / Dept Manager | HR Admin / HR Manager | Super Admin |
|------|:-:|:-:|:-:|:-:|
| Beranda (dashboard sesuai role) | ✓ | ✓ | ✓ | ✓ |
| Absen (clock-in/out) | ✓ | ✓ | ✓ | – |
| Riwayat Absensi saya | ✓ | ✓ | ✓ | – |
| Pengajuan saya (cuti, izin, koreksi) | ✓ | ✓ | ✓ | – |
| Approval | – | ✓ (tim) | ✓ (tahap HR) | – |
| Kehadiran Tim / Semua | – | ✓ (tim) | ✓ (semua) | – |
| Karyawan | – | lihat tim | ✓ kelola | – |
| Jadwal & Shift | – | lihat tim | ✓ kelola | – |
| Impor Fingerprint | – | – | ✓ | – |
| Laporan & Ekspor | – | tim | ✓ | – |
| Pengaturan (organisasi, lokasi, hari libur, jenis cuti, toleransi) | – | – | ✓ | ✓ |
| Pengguna, Role & Permission, Audit Log | – | – | lihat audit (HR Manager) | ✓ |
| Notifikasi (ikon lonceng) | ✓ | ✓ | ✓ | ✓ |
| Profil & Ubah Password | ✓ | ✓ | ✓ | ✓ |

**Navigasi:**
- **HP:** bottom tab 4 item — `Beranda · Absen · Pengajuan · Lainnya`. Untuk atasan, tab `Approval` menggantikan `Lainnya` dan menu lain masuk ke `Lainnya`.
- **Desktop:** sidebar kiri (bisa diciutkan) + top bar (nama cabang, lonceng notifikasi, menu profil).

## 3. User journeys

**J1 — Karyawan absen masuk (target < 30 detik)**
Buka aplikasi (sudah login) → Beranda menampilkan tombol besar **Clock In** → kamera terbuka + lokasi diambil bersamaan → ambil selfie → preview → **Kirim** → layar hasil (jam, lokasi, label) → kembali ke Beranda, tombol berubah menjadi **Clock Out**.

**J2 — Karyawan mengajukan cuti**
Pengajuan → **+ Ajukan** → pilih jenis (sisa saldo tampil) → tanggal mulai/selesai (jumlah hari dihitung otomatis, hari libur dikecualikan) → alasan / lampiran → Kirim → status "Menunggu Atasan".

**J3 — Atasan menyetujui**
Notifikasi lonceng / badge di tab Approval → daftar pengajuan → buka detail (saldo, kalender tim di tanggal itu) → **Setujui** atau **Tolak** (alasan wajib) → item pindah ke tahap HR.

**J4 — HR mengimpor fingerprint**
Impor Fingerprint → unggah file → preview (valid / ID tidak dikenal / duplikat) → **Simpan** → ringkasan hasil.

**J5 — HR menarik rekap untuk payroll**
Laporan & Ekspor → pilih periode, cabang, departemen → tampil rekap → **Unduh Excel/CSV**.

**J6 — Karyawan lupa clock-out**
Riwayat → hari tersebut bertanda "Belum clock-out" → **Ajukan Koreksi** → isi jam + alasan → masuk approval atasan → HR.

## 4. Wireframe (low-fidelity)

### W1. Login (HP & desktop)
```
┌──────────────────────────┐
│        [Logo PT]         │
│      Masuk ke HRIS       │
│ ID Karyawan / Email      │
│ [______________________] │
│ Password            👁   │
│ [______________________] │
│ [        MASUK         ] │
│ Lupa password? Hubungi HR│
└──────────────────────────┘
```

### W2. Beranda Karyawan (HP)
```
┌──────────────────────────┐
│ Halo, Budi        🔔 2   │
│ Rabu, 22 Okt 2026        │
├──────────────────────────┤
│ Shift Pagi 08:00–17:00   │
│ Cabang Cikarang          │
│                          │
│   ┌──────────────────┐   │
│   │    CLOCK IN      │   │ ← tombol besar, warna utama
│   └──────────────────┘   │
│ Masuk: --:--  Pulang: --:-- │
├──────────────────────────┤
│ Sisa cuti: 9 hari        │
│ Pengajuan: 1 menunggu    │
│ 5 hari terakhir: ✓✓⚠✓✓   │
├──────────────────────────┤
│ Beranda  Absen  Pengajuan  Lainnya │
└──────────────────────────┘
```

### W3. Clock In — 3 langkah (HP)
```
(a) Kamera                 (b) Preview                (c) Hasil
┌────────────────────┐    ┌────────────────────┐    ┌────────────────────┐
│ ← Clock In         │    │ ← Ulangi           │    │        ✓           │
│ ┌────────────────┐ │    │ ┌────────────────┐ │    │  Clock In berhasil │
│ │  [ kamera  ]   │ │    │ │   [ foto ]     │ │    │     07:58 WIB      │
│ │  bingkai wajah │ │    │ └────────────────┘ │    │ 📍 Dalam radius    │
│ └────────────────┘ │    │ 📍 Lokasi didapat  │    │  Kantor Cikarang   │
│ 📷 Kamera aktif ✓  │    │   akurasi ±12 m    │    │  (35 m)            │
│ 📍 Mencari lokasi… │    │                    │    │                    │
│    ( ◉ AMBIL )     │    │ [ KIRIM ABSEN ]    │    │ [ KEMBALI ]        │
└────────────────────┘    └────────────────────┘    └────────────────────┘
```
Aturan layar:
- Status izin kamera & lokasi selalu terlihat (✓ / ⏳ / ✕).
- Tombol **Kirim** aktif setelah foto ada; jika lokasi belum didapat dalam 15 detik, tetap bisa kirim dan absensi diberi label **Akurasi rendah** (sesuai keputusan Q5: tidak ditolak).
- Hanya kamera langsung, tidak ada pilihan galeri.
- Tombol dinonaktifkan selama mengirim (mencegah klik dobel).
- Label hasil: 🟢 Dalam radius · 🟡 Luar radius (xxx m) · 🟠 Akurasi rendah · 🔵 Lapangan.

Error yang mudah dipahami:
```
┌────────────────────────────┐
│ ✕ Kamera tidak diizinkan   │
│ Absen butuh foto selfie.   │
│ Cara mengaktifkan:         │
│ Chrome: ketuk 🔒 di alamat │
│ → Izin → Kamera → Izinkan  │
│ [ COBA LAGI ]              │
└────────────────────────────┘
```
(Varian sama untuk: lokasi tidak diizinkan, tidak ada internet, sudah absen hari ini → tampilkan jam absen sebelumnya.)

### W4. Riwayat Absensi (HP: kartu; desktop: tabel)
```
┌──────────────────────────┐
│ Riwayat   [Okt 2026 ▾]   │
├──────────────────────────┤
│ Rab 22 Okt  07:58–17:05  │
│ 🟢 Dalam radius  9j 07m  │
├──────────────────────────┤
│ Sel 21 Okt  08:21–17:00  │
│ ⚠ Terlambat 6m  🟡 Luar  │
├──────────────────────────┤
│ Sen 20 Okt  07:55– --:-- │
│ ✕ Belum clock-out        │
│ [Ajukan Koreksi]         │
└──────────────────────────┘
```

### W5. Pengajuan Cuti / Izin (HP)
```
┌──────────────────────────┐
│ ← Ajukan Cuti            │
│ Jenis [Cuti Tahunan ▾]   │
│ Sisa saldo: 9 hari       │
│ Mulai  [27 Okt 2026]     │
│ Sampai [29 Okt 2026]     │
│ = 3 hari kerja           │
│ Alasan [______________]  │
│ Lampiran (opsional) [+]  │
│ [       KIRIM        ]   │
└──────────────────────────┘
```

### W6. Approval (HP & desktop)
```
┌────────────────────────────────────────────┐
│ Approval   [Menunggu (3)] [Riwayat]        │
├────────────────────────────────────────────┤
│ Siti — Cuti Tahunan 27–29 Okt (3 hari)     │
│ Tahap: Atasan   Saldo setelah: 6 hari      │
│ [Tolak]                       [Setujui]    │
├────────────────────────────────────────────┤
│ Andi — Koreksi 20 Okt clock-out 17:00      │
│ Alasan: lupa clock-out                     │
│ [Tolak]                       [Setujui]    │
└────────────────────────────────────────────┘
```
Tolak → modal dengan alasan wajib. Setujui → konfirmasi singkat.

### W7. Dashboard HR (desktop)
```
┌────────┬──────────────────────────────────────────────────┐
│ HRIS   │ Beranda          Cabang [Semua ▾]   🔔  HR Admin ▾│
│        ├──────────┬──────────┬──────────┬─────────────────┤
│Beranda │ Karyawan │ Hadir    │ Terlambat│ Belum absen     │
│Kehadir.│ aktif 100│ hari ini │ hari ini │ (sesuai jadwal) │
│Approval│          │ 82       │ 6        │ 9               │
│Karyawan├──────────┴──────────┴──────────┴─────────────────┤
│Jadwal  │ Kehadiran per cabang (bar)  │ Approval menunggu  │
│Impor FP│ Cikarang ███████ 40/45      │ • 3 cuti           │
│Laporan │ Karawang █████   28/32      │ • 2 koreksi        │
│Pengatur│ Bekasi   ████    14/23      │                    │
│        ├─────────────────────────────┴────────────────────┤
│        │ Perlu dicek: 4 absensi Luar radius hari ini  →   │
└────────┴──────────────────────────────────────────────────┘
```
Dashboard atasan = versi sama, terbatas tim (hadir/terlambat tim, approval menunggu, jadwal tim).

### W8. Kehadiran (desktop, HR/atasan)
```
Filter: [Tanggal 22 Okt ▾] [Cabang ▾] [Dept ▾] [Status ▾] [Label lokasi ▾] [Cari nama]
┌──────────┬────────┬───────┬───────┬────────┬──────────────┬──────┬───────┐
│ Nama     │ Cabang │ Masuk │Pulang │ Sumber │ Lokasi       │ Foto │ Status│
├──────────┼────────┼───────┼───────┼────────┼──────────────┼──────┼───────┤
│ Budi     │ Ckr    │ 07:58 │ 17:05 │ Selfie │ 🟢 35 m      │ [👁] │ Hadir │
│ Siti     │ Krw    │ 08:21 │ 17:00 │ Selfie │ 🟡 1,2 km    │ [👁] │ Telat │
│ Andi     │ Ckr    │ 06:59 │ 15:02 │ FP     │ –            │  –   │ Hadir │
└──────────┴────────┴───────┴───────┴────────┴──────────────┴──────┴───────┘
                                   ‹ 1 2 3 ›   20 per halaman
```
Klik foto → modal foto + peta titik lokasi vs lokasi kerja (hanya role berizin).

### W9. Karyawan — daftar & detail (desktop)
```
Daftar:  [Cari] [Cabang ▾] [Dept ▾] [Status ▾]           [+ Tambah Karyawan]
         NIK | Nama | Jabatan | Dept | Cabang | Metode absen | Status | ⋯

Detail (tab): [Profil] [Pekerjaan] [Jadwal] [Absensi] [Cuti] [Riwayat Perubahan]
  Pekerjaan: cabang, dept, jabatan, atasan, tgl masuk, status kerja,
             metode absen (Selfie GPS / Fingerprint / Keduanya),
             tipe (Kantor / Shift / Lapangan), ID mesin fingerprint.
```

### W10. Impor Fingerprint (desktop)
```
1 Unggah   2 Preview   3 Selesai
[ Tarik file Excel/CSV ke sini atau Pilih File ]
Preview: 1.240 baris │ ✓ 1.198 valid │ ⚠ 30 duplikat (dilewati) │ ✕ 12 ID tidak dikenal [lihat]
[Batal]                                              [Simpan 1.198 baris]
```

### W11. Pengaturan Lokasi Kerja (desktop)
```
Nama [Kantor Cikarang]  Cabang [Cikarang ▾]
Latitude [-6.2xxx]  Longitude [107.1xxx]  [Ambil dari peta]
Radius [100] m      (peta: titik + lingkaran radius)
[Simpan]
```
Halaman pengaturan lain (shift, hari libur, jenis cuti, toleransi, role) memakai pola **tabel + form di panel samping**.

## 5. Design system (usulan)
- **Warna:**
  - Primer biru `#1D4ED8` (aksi utama)
  - Sukses hijau `#15803D`
  - Peringatan kuning `#B45309`
  - Bahaya merah `#B91C1C`
  - Info `#0369A1`
  - Netral abu-abu
  - Status tidak hanya dibedakan lewat warna; selalu ada ikon + teks.
- **Tipografi:** font sistem / Inter; body 16 px di HP (mencegah zoom otomatis iOS), 14 px di tabel desktop.
- **Spasi:** kelipatan 4 px. Radius sudut 8 px.
- **Target sentuh:** minimal 44×44 px; tombol Clock In minimal 64 px tinggi.
- **Tema:** terang saja untuk MVP.
- **Ikon:** satu set ikon garis yang konsisten.

## 6. Component inventory
| Kelompok | Komponen |
|----------|----------|
| Layout | AppShell (sidebar + topbar), BottomNav (HP), PageHeader, Card |
| Aksi | Button (primer, sekunder, bahaya, ghost), IconButton, tombol besar ClockButton |
| Form | Input, PasswordInput, Select, DatePicker, DateRange, Textarea, FileUpload, Checkbox, Switch, field error |
| Data | DataTable (sort, filter, pagination, empty state), StatCard, Badge status, Label lokasi, Avatar/foto kecil |
| Umpan balik | Toast, Alert banner, Modal konfirmasi, Modal alasan (tolak/koreksi), Skeleton loading, Spinner |
| Khusus | CameraCapture (kamera + preview), LocationStatus (izin + akurasi), MapPreview (titik vs radius), Stepper (impor), NotificationBell |

## 7. State UI (wajib di setiap halaman data)
| State | Pola |
|-------|------|
| Loading | Skeleton seukuran konten (bukan layar kosong). |
| Empty | Ilustrasi kecil + kalimat + aksi, mis. "Belum ada pengajuan. [+ Ajukan]". |
| Error | Pesan awam + tombol **Coba lagi**; detail teknis tidak ditampilkan. |
| Success | Toast singkat; untuk absen, layar hasil penuh (W3c). |
| Konfirmasi kritis | Modal untuk: tolak, nonaktifkan karyawan, simpan impor, ubah radius. |
| Offline | Banner "Tidak ada internet" dan tombol kirim dinonaktifkan. |

## 8. Aksesibilitas & responsif
- Kontras teks minimal WCAG AA (4.5:1).
- Semua input punya label; error dibacakan ke screen reader.
- Navigasi keyboard + fokus terlihat di desktop.
- Breakpoint: HP < 640 px, tablet 640–1024 px, desktop > 1024 px. Tabel di HP berubah menjadi kartu.

## 9. UI/UX acceptance criteria
1. Karyawan bisa clock-in dari Beranda dalam ≤ 3 ketukan dan < 30 detik di HP Android kelas menengah dengan 4G.
2. Status izin kamera & lokasi selalu terlihat selama proses absen; jika ditolak, muncul panduan cara mengizinkan.
3. Selfie hanya dari kamera langsung, dengan preview dan tombol ulangi.
4. Setelah absen, layar hasil menampilkan jam (WIB), nama lokasi, jarak, dan label lokasi.
5. Tombol kirim tidak bisa ditekan dua kali; absen ulang di jadwal yang sama menampilkan data yang sudah ada.
6. Menu dan data yang tampil sesuai role (karyawan tidak melihat menu HR; atasan hanya melihat timnya).
7. Setiap tabel punya filter, pagination, serta state loading, empty, dan error.
8. Aksi tolak wajib alasan; aksi kritis wajib konfirmasi.
9. Semua tanggal dalam format Indonesia dan jam dalam WIB.
10. Semua halaman bisa dipakai di lebar 360 px tanpa scroll horizontal.
