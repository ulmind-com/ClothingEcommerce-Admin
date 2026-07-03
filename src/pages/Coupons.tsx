import { useEffect, useState } from "react";
import { api } from "../api";

const empty = { code: "", type: "percent", value: 10, min_order: 0, max_discount: 0, active: true, valid_from: "", valid_until: "", description: "" };

export default function Coupons() {
  const [items, setItems] = useState<any[]>([]);
  const [f, setF] = useState({ ...empty });
  const [err, setErr] = useState("");

  const load = () => api.get("/coupons").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  const add = async () => {
    setErr("");
    if (!f.code.trim()) { setErr("Coupon code required"); return; }
    try {
      await api.post("/coupons", {
        ...f, code: f.code.toUpperCase(), value: Number(f.value),
        min_order: Number(f.min_order), max_discount: Number(f.max_discount),
        valid_from: f.valid_from || null, valid_until: f.valid_until || null,
      });
      setF({ ...empty }); load();
    } catch (e: any) { setErr(e.message); }
  };
  const toggle = async (c: any) => { await api.patch(`/coupons/${c.id}`, { active: !c.active }); load(); };
  const del = async (id: string) => { if (confirm("Delete coupon?")) { await api.del(`/coupons/${id}`); load(); } };

  return (
    <>
      <h1>Coupons</h1>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Create coupon</h3>
        <div className="row">
          <div><label>Code</label><input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="WELCOMEOFFER" /></div>
          <div>
            <label>Type</label>
            <select value={f.type} onChange={(e) => set("type", e.target.value)}>
              <option value="percent">Percent (%)</option>
              <option value="flat">Flat (₹)</option>
            </select>
          </div>
          <div><label>{f.type === "percent" ? "Discount %" : "Flat amount ₹"}</label><input type="number" value={f.value} onChange={(e) => set("value", e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label>Min order ₹ (0 = none)</label><input type="number" value={f.min_order} onChange={(e) => set("min_order", e.target.value)} /></div>
          <div><label>Max discount ₹ (percent cap, 0 = none)</label><input type="number" value={f.max_discount} onChange={(e) => set("max_discount", e.target.value)} disabled={f.type === "flat"} /></div>
        </div>
        <div className="row">
          <div><label>Show from (optional)</label><input type="datetime-local" value={f.valid_from} onChange={(e) => set("valid_from", e.target.value)} /></div>
          <div><label>Auto-expire at (optional)</label><input type="datetime-local" value={f.valid_until} onChange={(e) => set("valid_until", e.target.value)} /></div>
        </div>
        <p className="muted">Leave times empty for an always-on coupon. Otherwise it appears in the app's Offers only within this window and hides automatically after.</p>
        <label>Description</label>
        <input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="10% off up to ₹150" />
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ marginTop: 14 }} onClick={add}>Create coupon</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Expiry</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td><b>{c.code}</b><div className="muted">{c.description}</div></td>
                <td>{c.type === "percent" ? `${c.value}%${c.max_discount ? ` (max ₹${c.max_discount})` : ""}` : `₹${c.value}`}</td>
                <td>{c.min_order ? `₹${c.min_order}` : "—"}</td>
                <td>{c.valid_until || "—"}</td>
                <td><button className="btn ghost sm" onClick={() => toggle(c)}>{c.active ? "Active ✓" : "Inactive"}</button></td>
                <td><button className="btn danger sm" onClick={() => del(c.id)}>Delete</button></td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="muted">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
