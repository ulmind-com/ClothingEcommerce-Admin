import { useEffect, useState } from "react";
import { api } from "../api";
import PaymentInfo from "../components/PaymentInfo";

const badge = (status?: string) => {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    initiated: { bg: "#e7f5ec", fg: "#1c8a4a", label: "Refund initiated" },
    failed: { bg: "#fdecec", fg: "#c0392b", label: "Refund failed" },
  };
  const m = map[status || ""] || { bg: "#f1f1f4", fg: "#6b6b70", label: "No refund" };
  return <span className="pill" style={{ background: m.bg, color: m.fg }}>{m.label}</span>;
};

export default function Refunds() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = () =>
    api.get("/orders/admin/refunds").then(setRows).catch((e) => setErr(e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const retry = async (id: string) => {
    setErr(""); setBusy(id);
    try {
      const r = await api.post(`/orders/${id}/refund`);
      setRows((prev) => prev.map((o) => (o.id === id ? { ...o, refund_status: r.refund_status, refund_id: r.refund_id } : o)));
    } catch (e: any) {
      setErr(e.message);
      setRows((prev) => prev.map((o) => (o.id === id ? { ...o, refund_status: "failed" } : o)));
    } finally { setBusy(null); }
  };

  const money = (n: number) => `₹${(n ?? 0).toFixed(2)}`;
  const when = (d?: string) => (d ? new Date(d).toLocaleString() : "—");

  return (
    <>
      <h1>Refunds &amp; Cancellations</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Every cancelled order. Online-paid orders are auto-refunded on cancellation; retry any that failed.
      </p>
      {err && <div className="err">{err}</div>}

      <div className="card">
        <table>
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Amount</th><th>Pay</th><th>Refund</th><th>Refund ID</th><th>Cancelled</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((o) => {
              const online = o.payment_method === "online" && o.razorpay_payment_id;
              const canRetry = online && o.refund_status !== "initiated";
              return (
                <>
                  <tr key={o.id}>
                    <td><b>#{o.id.slice(-6).toUpperCase()}</b><div className="muted">{new Date(o.created_at).toLocaleDateString()}</div></td>
                    <td>{o.address?.name || "—"}<div className="muted">{o.address?.phone}</div></td>
                    <td><b>{money(o.amount)}</b></td>
                    <td><span className="pill" style={{ background: "#f1f1f4" }}>{o.payment_method?.toUpperCase()}</span></td>
                    <td>{online ? badge(o.refund_status) : <span className="muted">COD — n/a</span>}</td>
                    <td className="muted" style={{ fontSize: 12 }}>{o.refund_id || "—"}</td>
                    <td className="muted">{when(o.cancelled_at)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {canRetry && (
                        <button className="btn ghost sm" disabled={busy === o.id} onClick={() => retry(o.id)}>
                          {busy === o.id ? "…" : o.refund_status === "failed" ? "Retry refund" : "Refund"}
                        </button>
                      )}
                      <button className="btn ghost sm" style={{ marginLeft: 6 }} onClick={() => setOpen(open === o.id ? null : o.id)}>
                        {open === o.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {open === o.id && (
                    <tr key={o.id + "d"}>
                      <td colSpan={8} style={{ background: "#faf9f8" }}>
                        <div style={{ padding: "6px 4px" }}>
                          <b>Delivery to:</b> {[o.address?.house, o.address?.area, o.address?.city, o.address?.state, o.address?.pincode].filter(Boolean).join(", ")}
                          <div className="muted" style={{ marginTop: 8 }}>
                            Subtotal ₹{o.subtotal} · Discount ₹{o.discount} · Delivery ₹{o.delivery} · Tax ₹{o.tax} · <b>Total ₹{o.amount}</b>
                          </div>
                          <div style={{ marginTop: 14 }}>
                            <PaymentInfo o={o} orderId={o.id} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="muted">No cancellations yet.</td></tr>}
            {loading && <tr><td colSpan={8} className="muted">Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
