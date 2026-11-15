# INFORYZE26

## Menjalankan aplikasi secara lokal

Perlu Python 3.10 atau lebih baru. Dari folder proyek, jalankan:

```powershell
python server.py
```

Buka `http://127.0.0.1:8000`. Data bersama tersimpan di `data/kaskita.json`. Mahasiswa dapat masuk tanpa kata sandi; kata sandi bawaan pengelola adalah `INFORYZE26_PENGURUS`. Jangan gunakan kata sandi bawaan saat server dibuka ke jaringan.

## Hosting di Render

File `render.yaml` menyiapkan layanan Python, HTTPS-only session cookie, kata sandi acak, dan disk persisten untuk data. Disk persisten memerlukan paket Render berbayar; tanpa disk, data bisa hilang saat layanan dibuat ulang.

1. Pastikan repository GitHub terhubung ke akun Render.
2. Di Render, buat **Blueprint** dari repository ini dan tinjau konfigurasi `render.yaml`.
3. Setelah layanan aktif, lihat `KASKITA_MANAGER_PASSWORD` pada Environment layanan dan jangan bagikan kata sandi pengelola.
4. Sebelum ada pengelola yang pertama kali masuk, jalankan migrasi dari folder proyek lokal:

   ```powershell
   python migrate_data.py https://URL-LAYANAN-ANDA.onrender.com
   ```

   Masukkan password pengelola Render saat diminta. Script mengirim `data/kaskita.json` melalui HTTPS dan hanya menerima migrasi jika penyimpanan tujuan masih kosong. Jangan jalankan setelah data baru dibuat di Render.
5. Setelah migrasi berhasil, uji login mahasiswa/pengelola dan pastikan data tetap ada setelah layanan dimulai ulang. Jika ingin memulai tanpa data lama, lewati migrasi; data awal dibuat saat pengelola pertama kali masuk.

Login mahasiswa tidak memverifikasi identitas. Siapa pun yang membuka aplikasi dapat masuk sebagai mahasiswa, melihat data kas, dan mencatat konfirmasi pembayaran simulasi untuk semua kelas. Jangan gunakan aplikasi ini untuk menyimpan informasi sensitif atau mengelola uang sungguhan tanpa kontrol akses individual dan integrasi pembayaran yang sesuai.

## Catatan pembayaran

Konfirmasi QRIS di aplikasi ini masih simulasi. Backend belum terhubung ke penyedia pembayaran, sehingga konfirmasi tidak membuktikan transfer benar-benar diterima. Jangan gunakan untuk mengelola uang sungguhan sebelum integrasi gateway pembayaran dan verifikasi webhook ditambahkan.
