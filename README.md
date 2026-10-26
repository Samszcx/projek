# INFORYZE26

## Menjalankan aplikasi

Perlu Python 3.10 atau lebih baru. Dari folder proyek, jalankan:

```powershell
python server.py
```

Buka `http://127.0.0.1:8000` di browser. Server menyajikan frontend sekaligus API dan menyimpan data bersama di `data/kaskita.json`.

## Catatan pembayaran

Konfirmasi pembayaran QRIS di aplikasi ini masih berupa simulasi. Backend belum terhubung ke penyedia pembayaran, sehingga konfirmasi tidak membuktikan transfer benar-benar diterima. Jangan gunakan untuk mengelola uang sungguhan sebelum integrasi gateway pembayaran dan verifikasi webhook ditambahkan.
