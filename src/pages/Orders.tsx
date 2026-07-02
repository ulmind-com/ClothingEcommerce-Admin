import { useEffect, useState } from "react";
import { api } from "../api";

const STAGES = ["placed", "confirmed", "shipped", "out_for_delivery", "delivered", "cancelled"];
const label = (s: string) => s.replace(/_/g, " ");

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const load = () => api.get("/orders/admin/all").then(setOrders).catch(() => {});
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    await api.patch(`/orders/${id}/status`, { status });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  return (
    <>
      <h1>Orders</h1>
      <div className="card">
        <table>
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Pay</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <>
                <tr key={o.id}>
                  <td><b>#{o.id.slice(-6).toUpperCase()}</b><div className="muted">{new Date(o.created_at).toLocaleDateString()}</div></td>
                  <td>{o.address?.name || "—"}<div className="muted">{o.address?.phone}</div></td>
                  <td>{o.items?.length}</td>
                  <td><b>₹{o.amount?.toFixed(2)}</b></td>
                  <td><span className="pill" style={{ background: "#f1f1f4" }}>{o.payment_method?.toUpperCase()}</span></td>
                  <td>
                    <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
                      {STAGES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
                    </select>
                  </td>
                  <td><button className="btn ghost sm" onClick={() => setOpen(open === o.id ? null : o.id)}>{open === o.id ? "Hide" : "View"}</button></td>
                </tr>
                {open === o.id && (
                  <tr key={o.id + "d"}>
                    <td colSpan={7} style={{ background: "#faf9f8" }}>
                      <div style={{ padding: "6px 4px" }}>
                        <b>Delivery to:</b> {[o.address?.house, o.address?.area, o.address?.city, o.address?.state, o.address?.pincode].filter(Boolean).join(", ")}
                        {o.distance_km != null && <span className="muted"> · {o.distance_km} km</span>}
                        <table style={{ marginTop: 10 }}>
                          <tbody>
                            {o.items?.map((it: any, i: number) => (
                              <tr key={i}>
                                <td><img className="thumb" src={it.image || "https://via.placeholder.com/40"} /></td>
                                <td>{it.title}{it.color ? ` · ${it.color}` : ""}{it.size ? ` · ${it.size}` : ""}</td>
                                <td>x{it.qty}</td>
                                <td>₹{(it.price * it.qty).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="muted" style={{ marginTop: 8 }}>
                          Subtotal ₹{o.subtotal} · Discount ₹{o.discount} · Delivery ₹{o.delivery} · Tax ₹{o.tax} · <b>Total ₹{o.amount}</b>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {orders.length === 0 && <tr><td colSpan={7} className="muted">No orders yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
