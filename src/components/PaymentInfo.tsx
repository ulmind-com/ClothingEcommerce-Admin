import { useState } from "react";
import { api } from "../api";

const fmtDT = (d?: string | null) => (d ? new Date(d).toLocaleString() : "—");
const money = (n: any) => `₹${Number(n ?? 0).toFixed(2)}`;

function Copyable({ value }: { value?: string | null }) {
  const [done, setDone] = useState(false);
  if (!value) return <span className="muted">—</span>;
  const copy = () =>
    navigator.clipboard?.writeText(value).then(() => {
      setDone(true);
      setTimeout(() => setDone(false), 1200);
    });
  return (
    <span className="mono">
      {value}
      <button className="copy-btn" onClick={copy} title="Copy">{done ? "✓" : "⧉"}</button>
    </span>
  );
}

function KV({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="kv">
      <span className="k">{k}</span>
      <span className="v">{children}</span>
    </div>
  );
}

const payPill = (m?: string) => (
  <span
    className="pill"
    style={{
      background: m === "online" ? "#e6f0ff" : "#f1f1f4",
      color: m === "online" ? "#1f5ed6" : "#6b6b70",
    }}
  >
    {(m || "—").toUpperCase()}
  </span>
);

const refundPill = (s?: string) => {
  const map: Record<string, { bg: string; fg: string }> = {
    initiated: { bg: "#e7f5ec", fg: "#1c8a4a" },
    processed: { bg: "#e7f5ec", fg: "#1c8a4a" },
    failed: { bg: "#fdecec", fg: "#c0392b" },
  };
  const m = map[s || ""] || { bg: "#f1f1f4", fg: "#6b6b70" };
  return <span className="pill" style={{ background: m.bg, color: m.fg }}>{s || "—"}</span>;
};

/**
 * Full transaction + coupon details for an order-like object. Works for Orders,
 * Refunds (order docs) and Returns (order fields enriched by the API). Pass
 * `orderId` to enable the on-demand "Fetch from Razorpay" gateway lookup.
 */
export default function PaymentInfo({ o, orderId }: { o: any; orderId?: string }) {
  const [gw, setGw] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const online = o.payment_method === "online";
  const id = orderId || o.order_id || o.id;
  const couponDiscount = o.coupon_discount ?? o.discount;

  const fetchGateway = async () => {
    if (!id) return;
    setBusy(true);
    setErr("");
    try {
      setGw(await api.get(`/orders/${id}/payment`));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="section-title">Payment / Transaction</div>
      <div className="pdetail">
        <KV k="Method">{payPill(o.payment_method)}</KV>
        {online && <KV k="Transaction ID"><Copyable value={o.razorpay_payment_id} /></KV>}
        {online && <KV k="Razorpay Order ID"><Copyable value={o.razorpay_order_id} /></KV>}
        {online && <KV k="Paid at">{fmtDT(o.paid_at)}</KV>}
        <KV k="Placed at">{fmtDT(o.created_at || o.order_created_at)}</KV>
        {o.cancelled_at && <KV k="Cancelled at">{fmtDT(o.cancelled_at)}</KV>}
        {o.delivered_at && <KV k="Delivered at">{fmtDT(o.delivered_at)}</KV>}
        {(o.refund_status || o.refund_id) && <KV k="Refund status">{refundPill(o.refund_status)}</KV>}
        {o.refund_id && <KV k="Refund ID"><Copyable value={o.refund_id} /></KV>}
      </div>

      <div className="section-title">Coupon &amp; Discount</div>
      <div className="pdetail">
        <KV k="Coupon code">
          {o.coupon_code ? (
            <span className="pill" style={{ background: "#fff4e5", color: "#a15c00" }}>{o.coupon_code}</span>
          ) : (
            <span className="muted">No coupon used</span>
          )}
        </KV>
        <KV k="Discount">{couponDiscount ? `− ${money(couponDiscount)}` : money(0)}</KV>
      </div>

      {online && id && (
        <>
          <div className="section-title">
            Gateway details
            {!gw && (
              <button className="btn ghost sm" disabled={busy} onClick={fetchGateway}>
                {busy ? "Loading…" : "Fetch from Razorpay"}
              </button>
            )}
          </div>
          {err && <div className="err">{err}</div>}
          {gw && (
            <div className="pdetail">
              <KV k="Payment method">{gw.method ? gw.method.toUpperCase() : "—"}</KV>
              <KV k="Status">{gw.status || "—"}{gw.captured ? " · captured" : ""}</KV>
              {gw.bank && <KV k="Bank">{gw.bank}</KV>}
              {gw.wallet && <KV k="Wallet">{gw.wallet}</KV>}
              {gw.vpa && <KV k="UPI VPA"><Copyable value={gw.vpa} /></KV>}
              {gw.card_last4 && (
                <KV k="Card">
                  •••• {gw.card_last4}
                  {gw.card_network ? ` · ${gw.card_network}` : ""}
                  {gw.card_type ? ` · ${gw.card_type}` : ""}
                </KV>
              )}
              {gw.contact && <KV k="Contact">{gw.contact}</KV>}
              {gw.email && <KV k="Email">{gw.email}</KV>}
              <KV k="Gateway fee">{money(gw.fee)}{gw.tax ? ` (tax ${money(gw.tax)})` : ""}</KV>
              <KV k="Captured">{money(gw.amount)} {gw.currency || ""}</KV>
              {gw.created_at && <KV k="Gateway time">{fmtDT(new Date(gw.created_at * 1000).toISOString())}</KV>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
