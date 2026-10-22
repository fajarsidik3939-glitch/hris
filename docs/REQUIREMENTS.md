# Requirements — HRIS (Phase 1, Revisi 1)

Status: READY FOR REVIEW (revisi 1, 2026-10-22). Jawaban user Q1–Q8 sudah dimasukkan. Butir bertanda **[ASUMSI]** masih menunggu konfirmasi.

## 1. Business requirements
1. Mencatat kehadiran karyawan secara mandiri lewat HP dengan selfie + GPS; lokasi selalu disimpan dan jaraknya ke lokasi kerja dihitung di server.
2. Menyediakan data karyawan dan struktur organisasi sebagai sumber tunggal (single source of truth).
3. Mendigitalkan pengajuan dan persetujuan cuti, izin, dan koreksi absensi (2 tingkat: atasan → HR).
4. Menggabungkan data absensi mesin fingerprint dengan absensi selfie GPS dalam satu rekap.
5. Menyediakan rekap kehadiran dan laporan untuk HR dan atasan, dengan ekspor Excel/CSV sebagai input sistem payroll terpisah.
6. Memenuhi aspek keamanan dan privasi data pribadi (UU PDP No. 27/2022): data minimal, akses terbatas, audit log.

## 2. Profil perusahaan
- Usaha: **manufaktur**, sekitar **100 karyawan**.
- **3 cabang**, semuanya **WIB**.
- Pola kerja: **kantor (jam tetap), shift (termasuk shift malam [ASUMSI]), dan lapangan**.
- Payroll dihitung di **sistem lain**; HRIS ini hanya mengekspor rekap.
- Integrasi wajib: **mesin fingerprint**.
- Hosting: **cloud gratis (free tier) untuk tahap testing**; production dibahas di Phase 17.
- **[ASUMSI]** Karyawan memakai HP masing-masing (Android/iPhone) dengan browser modern; HR memakai laptop/PC. Aplikasi berbasis web responsif.
- **[ASUMSI]** Karyawan pabrik/shift absen lewat fingerprint; karyawan kantor & lapangan absen lewat selfie GPS. Satu karyawan bisa memakai salah satu atau keduanya (diatur per karyawan).

## 3. User roles
| Role | Ringkasan hak akses |
|------|--------------------|
| Super Admin | Semua pengaturan sistem, role & permission. |
| HR Admin | Kelola data karyawan, organisasi, lokasi, shift, koreksi absensi, impor fingerprint. |
| HR Manager | Seperti HR Admin + approval tingkat HR + seluruh laporan. |
| Department Manager | Lihat data & approval untuk departemennya. |
| Supervisor | Lihat kehadiran & approval tim langsung. |
| Employee | Absensi, riwayat, pengajuan, profil sendiri. |

Role Payroll Admin **dihapus dari MVP** karena payroll ada di sistem lain; ekspor rekap dilakukan HR. Role dan permission dapat dikonfigurasi.

## 4. Modul yang dibutuhkan
**MVP (usulan)**
1. Authentication & RBAC.
2. Employee & Organization (perusahaan, 3 cabang, departemen, jabatan, atasan).
3. Work locations (koordinat + radius per cabang).
4. Selfie GPS attendance (clock-in/out), termasuk karyawan lapangan.
5. Shift & jadwal dasar (termasuk shift malam), hari libur.
6. Riwayat & rekap absensi, koreksi absensi + approval.
7. Cuti & izin + saldo + approval 2 tingkat (atasan → HR).
8. Impor data fingerprint ke rekap absensi.
9. Dashboard dasar (HR, atasan, karyawan) + ekspor rekap Excel/CSV untuk payroll.
10. Audit log + notifikasi dalam aplikasi.

**Setelah MVP:** lembur (ikut diekspor ke payroll), notifikasi email, laporan PDF, sinkron fingerprint otomatis, recruitment, performance & training.

**Di luar scope:** perhitungan payroll, BPJS, PPh 21, slip gaji (ditangani sistem payroll lain).

## 5. Aturan bisnis awal
- **Absensi:** waktu resmi = waktu server; satu clock-in dan satu clock-out per jadwal kerja; idempotency untuk mencegah duplikat.
- **GPS (keputusan user Q5):** absensi **selalu diterima dan disimpan**, berapa pun jarak dan akurasinya. Server tetap menghitung jarak ke lokasi kerja terdekat dan memberi label informasi **"Dalam radius" / "Luar radius" / "Akurasi rendah"**, tanpa menolak dan tanpa antrian verifikasi. Label ini tampil di riwayat & laporan supaya HR/atasan bisa memeriksa bila perlu.
- **Karyawan lapangan:** tidak terikat radius; lokasi clock-in/out cukup dicatat.
- **Radius:** default 100 m, bisa diubah per lokasi.
- **Selfie:** foto diambil langsung dari kamera (bukan galeri), disimpan privat, akses dibatasi role; tanpa face recognition dan tanpa menyimpan data biometrik.
- **Fingerprint:** **[ASUMSI]** tahap awal memakai impor file (Excel/CSV) hasil ekspor mesin; data dicocokkan lewat ID karyawan di mesin. Data fingerprint dan selfie GPS untuk hari yang sama digabung (jam masuk paling awal, jam pulang paling akhir).
- **Keterlambatan:** dihitung dari jadwal shift dengan toleransi yang bisa dikonfigurasi (**[ASUMSI]** default 15 menit).
- **Shift malam:** absensi dikaitkan ke tanggal mulai shift, bukan tanggal kalender clock-out.
- **Ketidakhadiran:** status "Tidak Hadir" hanya ditetapkan setelah memeriksa jadwal, hari libur, cuti, izin, dan dinas.
- **Cuti:** **[ASUMSI]** cuti tahunan 12 hari setelah 12 bulan bekerja (UU Ketenagakerjaan); saldo berubah hanya lewat transaksi yang tercatat.
- **Approval (keputusan user Q4):** 2 tingkat, atasan langsung → HR. Berlaku untuk cuti, izin, dan koreksi absensi.
- **Koreksi data:** semua koreksi absensi wajib berisi alasan dan tercatat di audit log.
- **Lokasi:** tidak ada pelacakan lokasi terus-menerus; lokasi hanya diambil saat clock-in/out.

## 6. Kebutuhan non-fungsional
- Web responsif, mobile-first untuk absensi; Bahasa Indonesia; format tanggal Indonesia; zona waktu WIB.
- HTTPS wajib (kamera & GPS di browser hanya jalan lewat HTTPS).
- Password di-hash; session aman; rate limiting; validasi di server.
- Foto selfie dikompres (target ±100 KB per foto) agar muat di storage gratis selama testing.
- Backup database berkala.

## 7. Pertanyaan terbuka (tidak menghambat Phase 2)
- **Q9.** Merek/tipe mesin fingerprint (mis. ZKTeco, Solution, Fingerspot)? Bisa ekspor file Excel/CSV? Menentukan cara integrasi (Phase 4).
- **Q10.** Apakah ada shift malam di pabrik? (asumsi: ada)
- **Q11.** Format file rekap yang diminta sistem payroll (kolom apa saja)? Bisa menyusul sebelum Phase 13.

## 8. Batasan proyek
- Bukan aplikasi native Android/iOS (web responsif); PWA dapat dievaluasi kemudian.
- Selfie + GPS mengurangi kecurangan, tetapi **tidak dapat menjamin** pencegahan GPS palsu atau foto palsu; karena absensi di luar radius tetap diterima, kontrolnya bergantung pada pemeriksaan HR/atasan atas label lokasi.
- Free tier cloud hanya untuk testing: kapasitas storage, database, dan uptime terbatas; tidak untuk data karyawan production.
- Integrasi fingerprint otomatis bergantung pada merek mesin; tahap awal memakai impor file.

## 9. Kriteria keberhasilan (MVP)
- Karyawan bisa clock-in/out dengan selfie + GPS dari HP dalam waktu < 30 detik.
- 100% absensi tercatat dengan waktu server, foto, koordinat, jarak, dan label lokasi.
- Tidak ada clock-in/out ganda untuk jadwal yang sama.
- Data fingerprint satu bulan bisa diimpor dan tergabung di rekap tanpa duplikasi.
- HR dapat menarik rekap kehadiran bulanan per cabang/departemen dan mengekspornya ke Excel/CSV untuk sistem payroll.
- Pengajuan cuti/izin dan koreksi melewati approval atasan → HR; saldo cuti konsisten.
- Karyawan hanya bisa melihat datanya sendiri; atasan hanya timnya.
