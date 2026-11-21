# INFORYZE26 - Sistem Kas Angkatan

Aplikasi pengelolaan kas kelas dan angkatan Informatika 26 dengan backend Python (tanpa dependensi eksternal) dan frontend modern berbasis JavaScript.

## Menjalankan Aplikasi

Pastikan Python 3.10 atau lebih baru sudah terpasang. Dari folder proyek, jalankan:

```powershell
python server.py
```

Server otomatis berjalan pada mode **semua antarmuka jaringan (`0.0.0.0`)**:

* **Akses dari Laptop/PC**: `http://localhost:8000` atau `http://127.0.0.1:8000`
* **Akses dari HP / Perangkat Lain (Satu Wi-Fi)**: `http://<IP-Laptop>:8000` (contoh: `http://192.168.18.40:8000`)
  * *IP jaringan Anda akan langsung ditampilkan di terminal saat server dijalankan.*

### Akun & Hak Akses
* **Mahasiswa**: Dapat langsung masuk tanpa kata sandi untuk melihat rekap dan melakukan simulasi pembayaran kas via QRIS.
* **Pengelola / Pengurus**: Memerlukan kata sandi pengelola. Password bawaan: `INFORYZE26_PENGURUS` (dapat diubah melalui *environment variable* `KASKITA_MANAGER_PASSWORD`).

---

## Push ke GitHub

Proyek ini sudah dilengkapi dengan template data bawaan (`data/default_state.json`) dan konfigurasi `.gitignore` yang bersih:

1. Buat repository baru di GitHub (misal: `inforyze26`).
2. Jalankan perintah git berikut dari terminal proyek:

```bash
git add .
git commit -m "Update: backend, frontend modular, dan network access 0.0.0.0"
git branch -M main
git remote add origin https://github.com/USERNAME/inforyze26.git
git push -u origin main
```

*(Jika remote `origin` sudah ada, cukup jalankan `git push origin main`)*

---

## Hosting di Render / Cloud

File `render.yaml` sudah disiapkan untuk deployment satu klik di [Render](https://render.com) (atau platform lain seperti Railway / Koyeb):

1. Hubungkan repository GitHub Anda ke Render.
2. Buat **New Blueprint** dan pilih repository ini.
3. Render akan otomatis mendeteksi konfigurasi `render.yaml`, menyetel host ke `0.0.0.0`, dan menginisialisasi database dari template.

---

## Catatan Simulasi QRIS
Konfirmasi pembayaran QRIS pada aplikasi ini adalah simulasi pencatatan kas internal dan belum terhubung ke gateway pembayaran perbankan riil.
