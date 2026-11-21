from __future__ import annotations

import json
import mimetypes
import os
import secrets
import threading
from datetime import datetime
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "static"
DATA_FILE = Path(os.environ.get("KASKITA_DATA_FILE", ROOT / "data" / "kaskita.json"))
DATA_DIR = DATA_FILE.parent
MANAGER_PASSWORD = os.environ.get("KASKITA_MANAGER_PASSWORD", "INFORYZE26_PENGURUS")
COOKIE_SECURE = os.environ.get("KASKITA_COOKIE_SECURE", "false").lower() == "true"
MAX_BODY_BYTES = 2 * 1024 * 1024
LOCK = threading.RLock()
SESSIONS: dict[str, str] = {}

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
}


def read_database() -> dict:
    with LOCK:
        if not DATA_FILE.exists():
            return {"state": None, "invoices": {}}
        try:
            value = json.loads(DATA_FILE.read_text(encoding="utf-8"))
            if isinstance(value, dict):
                value.setdefault("state", None)
                value.setdefault("invoices", {})
                return value
        except (OSError, json.JSONDecodeError):
            pass
        return {"state": None, "invoices": {}}


def write_database(value: dict) -> None:
    with LOCK:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        temporary_file = DATA_FILE.with_suffix(".tmp")
        temporary_file.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
        temporary_file.replace(DATA_FILE)


class KasKitaHandler(BaseHTTPRequestHandler):
    server_version = "INFORYZE26/2.0"

    def log_message(self, format: str, *args) -> None:
        print(f"{self.log_date_time_string()} {self.address_string()} {format % args}")

    def send_json(self, status: HTTPStatus, payload: dict, headers: dict[str, str] | None = None) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self) -> dict | None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY_BYTES:
                return None
            payload = json.loads(self.rfile.read(length))
            return payload if isinstance(payload, dict) else None
        except (ValueError, json.JSONDecodeError):
            return None

    def session_role(self) -> str | None:
        cookie = SimpleCookie()
        cookie.load(self.headers.get("Cookie", ""))
        morsel = cookie.get("kaskita_session")
        if not morsel:
            return None
        return SESSIONS.get(morsel.value)

    def clear_session(self) -> None:
        cookie = SimpleCookie()
        cookie.load(self.headers.get("Cookie", ""))
        morsel = cookie.get("kaskita_session")
        if morsel:
            SESSIONS.pop(morsel.value, None)

    def do_GET(self) -> None:
        parsed_url = urlparse(self.path)
        path = unquote(parsed_url.path)
        role = self.session_role()

        # Web pages
        if path in ("/", "/index.html"):
            if role:
                self.serve_file(ROOT / "index.html")
            else:
                self.serve_file(ROOT / "login.html")
            return

        if path in ("/login", "/login.html"):
            if role:
                self.send_response(HTTPStatus.FOUND)
                self.send_header("Location", "/")
                self.end_headers()
                return
            self.serve_file(ROOT / "login.html")
            return

        # APIs
        if path == "/api/session":
            if role is None:
                self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Silakan masuk terlebih dahulu."})
                return
            self.send_json(HTTPStatus.OK, {"role": role})
            return

        if path == "/api/state":
            if role is None:
                self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Silakan masuk terlebih dahulu."})
                return
            database = read_database()
            self.send_json(HTTPStatus.OK, {"state": database["state"]})
            return

        if path == "/api/health":
            self.send_json(HTTPStatus.OK, {"ok": True})
            return

        # Static assets
        if path.startswith("/static/"):
            relative = path.removeprefix("/static/").lstrip("/")
            file_path = (STATIC_DIR / relative).resolve()
            if STATIC_DIR in file_path.parents and file_path.is_file():
                self.serve_file(file_path)
                return
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        # Legacy and direct static file paths
        direct_files = {
            "inforyze.jpg": ROOT / "inforyze.jpg",
            "qris.jpeg": ROOT / "qris.jpeg",
            "index.html": ROOT / "index.html",
            "login.html": ROOT / "login.html",
        }
        filename = path.lstrip("/")
        if filename in direct_files:
            if filename == "qris.jpeg" and role is None:
                self.send_error(HTTPStatus.FORBIDDEN)
                return
            file_path = direct_files[filename]
            if file_path.is_file():
                self.serve_file(file_path)
                return

        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        payload = self.read_json()
        if payload is None:
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Body JSON tidak valid."})
            return

        if path == "/api/login":
            role = payload.get("role")
            if role not in ("mahasiswa", "pengelola"):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Peran tidak valid."})
                return
            if role == "pengelola" and not secrets.compare_digest(
                str(payload.get("password", "")), MANAGER_PASSWORD
            ):
                self.send_json(HTTPStatus.UNAUTHORIZED, {"error": "Password tidak sesuai."})
                return
            session_id = secrets.token_urlsafe(32)
            SESSIONS[session_id] = role
            self.send_json(HTTPStatus.OK, {"role": role}, {
                "Set-Cookie": f"kaskita_session={session_id}; HttpOnly; SameSite=Lax; Path=/"
                + ("; Secure" if COOKIE_SECURE else ""),
            })
            return

        if path == "/api/logout":
            self.clear_session()
            self.send_json(HTTPStatus.OK, {"ok": True}, {
                "Set-Cookie": "kaskita_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
                + ("; Secure" if COOKIE_SECURE else ""),
            })
            return

        if path == "/api/state/initialize":
            if self.session_role() != "pengelola":
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Akses pengelola diperlukan."})
                return
            state = payload.get("state")
            if not self.valid_state(state):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Format data kas tidak valid."})
                return
            with LOCK:
                database = read_database()
                if database["state"] is None:
                    database["state"] = state
                    write_database(database)
                response_state = database["state"]
            self.send_json(HTTPStatus.OK, {"state": response_state})
            return

        if path == "/api/state/import":
            if self.session_role() != "pengelola":
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Akses pengelola diperlukan."})
                return
            state = payload.get("state")
            invoices = payload.get("invoices")
            if not self.valid_state(state) or not self.valid_invoices(invoices):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Format data migrasi tidak valid."})
                return
            with LOCK:
                database = read_database()
                if database["state"] is not None or database["invoices"]:
                    self.send_json(HTTPStatus.CONFLICT, {"error": "Data tujuan sudah terisi; migrasi dibatalkan."})
                    return
                database["state"] = state
                database["invoices"] = invoices
                write_database(database)
            self.send_json(HTTPStatus.CREATED, {"ok": True})
            return

        if path == "/api/invoices":
            if self.session_role() != "mahasiswa":
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Silakan masuk sebagai mahasiswa."})
                return
            database = read_database()
            state = database["state"]
            class_name = payload.get("className")
            student_id = payload.get("studentId")
            period = payload.get("period")
            amount = payload.get("amount")
            if (not isinstance(state, dict) or class_name not in state.get("classes", {})
                    or not isinstance(student_id, str) or not isinstance(period, str)
                    or not isinstance(amount, (int, float)) or amount < 1000 or amount > 100_000_000):
                self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Data tagihan tidak valid."})
                return
            student = next((item for item in state["classes"][class_name] if item.get("id") == student_id), None)
            if student is None:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "Mahasiswa tidak terdaftar."})
                return
            invoice_id = f"KAS{secrets.token_hex(5).upper()}"
            invoice = {
                "id": invoice_id,
                "className": class_name,
                "studentId": student_id,
                "studentName": student["name"],
                "period": period,
                "amount": int(amount),
                "method": "QRIS",
                "status": "pending",
            }
            database["invoices"][invoice_id] = invoice
            write_database(database)
            self.send_json(HTTPStatus.CREATED, {"invoice": invoice})
            return

        if path.startswith("/api/invoices/") and path.endswith("/confirm"):
            if self.session_role() != "mahasiswa":
                self.send_json(HTTPStatus.FORBIDDEN, {"error": "Silakan masuk sebagai mahasiswa."})
                return
            invoice_id = unquote(path.removeprefix("/api/invoices/").removesuffix("/confirm").strip("/"))
            database = read_database()
            invoice = database["invoices"].get(invoice_id)
            if not invoice or invoice["status"] != "pending":
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "Tagihan tidak ditemukan atau sudah diproses."})
                return
            student = next((item for item in database["state"]["classes"][invoice["className"]]
                            if item.get("id") == invoice["studentId"]), None)
            if student is None:
                self.send_json(HTTPStatus.NOT_FOUND, {"error": "Mahasiswa tidak terdaftar."})
                return
            paid_at = datetime.now().astimezone()
            student.setdefault("payments", {}).setdefault(invoice["period"], []).append({
                "id": secrets.token_urlsafe(12),
                "amount": invoice["amount"],
                "date": paid_at.strftime("%Y-%m-%d"),
                "time": paid_at.strftime("%H:%M"),
                "method": "QRIS",
                "invoiceId": invoice_id,
            })
            invoice["status"] = "confirmed_demo"
            write_database(database)
            self.send_json(HTTPStatus.OK, {"state": database["state"], "invoice": invoice})
            return

        self.send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint tidak ditemukan."})

    def do_PUT(self) -> None:
        if urlparse(self.path).path != "/api/state":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint tidak ditemukan."})
            return
        if self.session_role() != "pengelola":
            self.send_json(HTTPStatus.FORBIDDEN, {"error": "Akses pengelola diperlukan."})
            return
        payload = self.read_json()
        state = payload.get("state") if payload else None
        if not self.valid_state(state):
            self.send_json(HTTPStatus.BAD_REQUEST, {"error": "Format data kas tidak valid."})
            return
        database = read_database()
        database["state"] = state
        write_database(database)
        self.send_json(HTTPStatus.OK, {"ok": True})

    def do_DELETE(self) -> None:
        if urlparse(self.path).path != "/api/session":
            self.send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint tidak ditemukan."})
            return
        self.clear_session()
        self.send_json(HTTPStatus.OK, {"ok": True}, {
            "Set-Cookie": "kaskita_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
            + ("; Secure" if COOKIE_SECURE else ""),
        })

    @staticmethod
    def valid_state(state: object) -> bool:
        return (isinstance(state, dict) and isinstance(state.get("classes"), dict)
                and isinstance(state.get("expenses", {}), dict)
                and isinstance(state.get("monthlyDues"), (int, float)))

    @staticmethod
    def valid_invoices(invoices: object) -> bool:
        if not isinstance(invoices, dict):
            return False
        return all(
            isinstance(invoice_id, str)
            and isinstance(invoice, dict)
            and invoice.get("id") == invoice_id
            and isinstance(invoice.get("className"), str)
            and isinstance(invoice.get("studentId"), str)
            and isinstance(invoice.get("studentName"), str)
            and isinstance(invoice.get("period"), str)
            and isinstance(invoice.get("amount"), int)
            and 1000 <= invoice["amount"] <= 100_000_000
            and invoice.get("method") == "QRIS"
            and invoice.get("status") in ("pending", "confirmed_demo")
            for invoice_id, invoice in invoices.items()
        )

    def serve_file(self, target: Path) -> None:
        if not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        content_type = MIME_TYPES.get(target.suffix.lower())
        if not content_type:
            content_type = mimetypes.guess_type(target.name)[0] or "application/octet-stream"

        body = target.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        # Static files can be cached briefly; HTML should re-check
        if target.suffix == ".html":
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=3600")
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    host = os.environ.get("KASKITA_HOST", "127.0.0.1")
    port = int(os.environ.get("KASKITA_PORT", os.environ.get("PORT", "8000")))
    if host not in ("127.0.0.1", "localhost", "::1"):
        if "KASKITA_MANAGER_PASSWORD" not in os.environ or len(MANAGER_PASSWORD) < 16:
            raise RuntimeError(
                "KASKITA_MANAGER_PASSWORD harus diatur dengan minimal 16 karakter saat server dapat diakses dari jaringan."
            )
    server = ThreadingHTTPServer((host, port), KasKitaHandler)
    print(f"INFORYZE26 berjalan di http://{host}:{port}")
    print("Password pengelola dapat diatur melalui KASKITA_MANAGER_PASSWORD.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer dihentikan.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
