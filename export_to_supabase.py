import json
from pathlib import Path


def esc(val: object) -> str:
    return "'" + str(val or "").replace("'", "''") + "'"


def main() -> None:
    data = json.loads(Path("data/kaskita.json").read_text(encoding="utf-8"))
    state = data.get("state") or {}
    invoices = data.get("invoices") or {}

    lines = ["-- Seed Data INFORYZE26 ke Supabase\n"]

    dues = int(state.get("monthlyDues", 10000))
    lines.append(
        f"insert into public.app_settings (key, value) values ('monthly_dues', '{dues}'::jsonb) "
        "on conflict (key) do update set value = excluded.value;"
    )

    for cls_name, students in (state.get("classes") or {}).items():
        for s in students:
            lines.append(
                "insert into public.students (id, class_name, name, npm) values "
                f"({esc(s['id'])}, {esc(cls_name)}, {esc(s['name'])}, {esc(s.get('npm', ''))}) "
                "on conflict (id) do nothing;"
            )

    for inv_id, inv in invoices.items():
        lines.append(
            "insert into public.invoices (id, class_name, student_id, student_name, period, amount, method, status) values "
            f"({esc(inv_id)}, {esc(inv['className'])}, {esc(inv['studentId'])}, {esc(inv['studentName'])}, "
            f"{esc(inv['period'])}, {int(inv['amount'])}, {esc(inv.get('method', 'QRIS'))}, {esc(inv.get('status', 'pending'))}) "
            "on conflict (id) do nothing;"
        )

    for cls_name, students in (state.get("classes") or {}).items():
        for s in students:
            for period, pay_list in (s.get("payments") or {}).items():
                for p in pay_list:
                    inv_ref = esc(p["invoiceId"]) if p.get("invoiceId") else "null"
                    lines.append(
                        "insert into public.payments (id, student_id, period, amount, date, time, method, invoice_id) values "
                        f"({esc(p['id'])}, {esc(s['id'])}, {esc(period)}, {int(p['amount'])}, "
                        f"{esc(p['date'])}, {esc(p.get('time', ''))}, {esc(p.get('method', 'QRIS'))}, {inv_ref}) "
                        "on conflict (id) do nothing;"
                    )

    for cls_name, periods in (state.get("expenses") or {}).items():
        for period, exp_list in periods.items():
            for e in exp_list:
                lines.append(
                    "insert into public.expenses (id, class_name, period, amount, note, date, time) values "
                    f"({esc(e['id'])}, {esc(cls_name)}, {esc(period)}, {int(e['amount'])}, "
                    f"{esc(e['note'])}, {esc(e['date'])}, {esc(e.get('time', ''))}) "
                    "on conflict (id) do nothing;"
                )

    Path("supabase_seed.sql").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Berhasil membuat supabase_seed.sql!")


if __name__ == "__main__":
    main()
