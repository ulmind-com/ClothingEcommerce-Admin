import { useEffect, useState } from "react";
import { api } from "../api";

const STATUSES = ["requested", "approved", "rejected", "picked_up", "refunded", "exchanged"];
const label = (s: string) => s.replace(/_/g, " ");

const statusColor: Record<string, { bg: string; fg: string }> = {
  requested: { bg: "#fff4e5", fg: "#a15c00" },
  approved: { bg: "#e6f0ff", fg: "#1f5ed6" },
  rejected: { bg: "#fdecec", fg: "#c0392b" },
  picked_up: { bg: "#eee7fb", fg: "#6b3fd4" },
  refunded: { bg: "#e7f5ec", fg: "#1c8a4a" },
  exchanged: { bg: "#e7f5ec", fg: "#1c8a4a" },
};

export default function Returns() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = () =>
    api.get("/returns/admin/all").then(setRows).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const patch = async (id: string, body: any) => {
    setErr(""); setBusy(id);
    try {
      const updated = await api.patch(`/returns/${id}`, body);
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(null); }
  };

  const money = (n: number) => `₹${(n ?? 0).toFixed(2)}`;

  return (
    <>
      <h1>Returns &amp; Exchanges</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Customer return/exchange requests. Set a request to <b>refunded</b> to auto-issue a Razorpay refund for online payments.
      </p>
      {err && <div className="err">{err}</div>}

      <div className="card">
        <table>
          <thead>
            <tr><th>Order</th><th>Type</th><th>Items</th><th>Amount</th><th>Reason</th><th>Status</th><th>Refund</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <b>#{r.order_short}</b>
                  <div className="muted">{new Date(r.created_at).toLocaleDateString()}</div>
                </td>
                <td><span className="pill" style={{ background: "#f1f1f4" }}>{r.type}</span></td>
                <td style={{ maxWidth: 240 }}>
                  {(r.items || []).map((it: any, i: number) => (
                    <div key={i} style={{ fontSize: 13 }}>
                      {it.title} <span className="muted">×{it.qty}{it.size ? ` · ${it.size}` : ""}{it.color ? ` · ${it.color}` : ""}</span>
                    </div>
                  ))}
                </td>
                <td><b>{money(r.amount)}</b></td>
                <td style={{ maxWidth: 200, fontSize: 13 }}>
                  {r.reason || <span className="muted">—</span>}
                  {r.note && <div className="muted">Note: {r.note}</div>}
                </td>
                <td>
                  <select
                    value={r.status}
                    disabled={busy === r.id}
                    onChange={(e) => patch(r.id, { status: e.target.value })}
                    style={{ background: statusColor[r.status]?.bg, color: statusColor[r.status]?.fg, fontWeight: 600 }}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                  </select>
                </td>
                <td className="muted" style={{ fontSize: 12 }}>
                  {r.refund_status ? `${r.refund_status}${r.refund_id ? ` · ${r.refund_id}` : ""}` : (r.type === "refund" ? "—" : "n/a")}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="muted">No return requests yet.</td></tr>}
            {loading && <tr><td colSpan={7} className="muted">Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
