from __future__ import annotations

import argparse
import getpass
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_DATA_FILE = ROOT / "data" / "kaskita.json"


def request_json(
    opener: urllib.request.OpenerDirector,
    url: str,
    payload: dict | None = None,
    method: str | None = None,
) -> tuple[int, dict]:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"} if data is not None else {},
        method=method or ("POST" if data is not None else "GET"),
    )
    try:
        with opener.open(request, timeout=30) as response:
            return response.status, json.loads(response.read())
    except urllib.error.HTTPError as error:
        try:
            payload = json.loads(error.read())
        except (json.JSONDecodeError, UnicodeDecodeError):
            payload = {}
        return error.code, payload


def main() -> int:
    parser = argparse.ArgumentParser(description="Pindahkan data kas lokal ke penyimpanan Render yang masih kosong.")
    parser.add_argument("url", help="URL layanan, misalnya https://inforyze26.onrender.com")
    parser.add_argument("--data-file", type=Path, default=DEFAULT_DATA_FILE, help="Path file JSON kas lokal")
    args = parser.parse_args()

    parsed_url = urllib.parse.urlparse(args.url)
    if parsed_url.scheme != "https" and parsed_url.hostname not in ("localhost", "127.0.0.1", "::1"):
        parser.error("Gunakan URL HTTPS untuk migrasi data ke server publik.")
    base_url = args.url.rstrip("/")

    try:
        database = json.loads(args.data_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"File data lokal tidak dapat dibaca: {error}", file=sys.stderr)
        return 1
    if (not isinstance(database, dict) or not isinstance(database.get("state"), dict)
            or not isinstance(database.get("invoices", {}), dict)):
        print("File lokal tidak memiliki format data kas yang diharapkan.", file=sys.stderr)
        return 1
    database.setdefault("invoices", {})

    password = getpass.getpass("Password pengelola Render: ")
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
    try:
        status, response = request_json(opener, f"{base_url}/api/login", {
            "role": "pengelola",
            "password": password,
        })
    except urllib.error.URLError as error:
        print(f"Tidak dapat menghubungi layanan: {error.reason}", file=sys.stderr)
        return 1
    if status != 200:
        print(response.get("error", "Login pengelola gagal."), file=sys.stderr)
        return 1

    try:
        status, response = request_json(opener, f"{base_url}/api/state")
        if status != 200:
            print(response.get("error", "Tidak dapat memeriksa data tujuan."), file=sys.stderr)
            return 1
        if response.get("state") is not None:
            print("Data tujuan sudah berisi. Migrasi dibatalkan agar data tidak tertimpa.", file=sys.stderr)
            return 1

        status, response = request_json(opener, f"{base_url}/api/state/import", {
            "state": database["state"],
            "invoices": database["invoices"],
        })
        if status != 201:
            print(response.get("error", "Migrasi gagal."), file=sys.stderr)
            return 1
        print("Migrasi selesai. Data kas dan tagihan lokal sudah dipindahkan.")
        return 0
    except urllib.error.URLError as error:
        print(f"Tidak dapat menghubungi layanan: {error.reason}", file=sys.stderr)
        return 1
    finally:
        try:
            status, response = request_json(opener, f"{base_url}/api/session", method="DELETE")
            if status != 200:
                print(response.get("error", "Sesi pengelola tidak dapat dihapus."), file=sys.stderr)
        except urllib.error.URLError as error:
            print(f"Peringatan: sesi pengelola tidak dapat dihapus: {error.reason}", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
