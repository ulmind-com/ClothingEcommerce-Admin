import { useEffect, useState } from "react";
import { api } from "../api";

const empty = { code: "", type: "percent", value: 10, min_order: 0, max_discount: 0, active: true, first_order_only: false, valid_from: "", valid_until: "", description: "" };

export default function Coupons() {
  const [items, setItems] = useState<any[]>([]);
  const [f, setF] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = () => api.get("/coupons").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const reset = () => { setF({ ...empty }); setEditId(null); setErr(""); };

  const save = async () => {
    setErr("");
    if (!f.code.trim()) { setErr("Coupon code required"); return; }
    const body = {
      ...f, code: f.code.toUpperCase(), value: Number(f.value),
      min_order: Number(f.min_order), max_discount: Number(f.max_discount),
      valid_from: f.valid_from || null, valid_until: f.valid_until || null,
    };
    try {
      if (editId) await api.patch(`/coupons/${editId}`, body);
      else await api.post("/coupons", body);
      reset(); load();
    } catch (e: any) { setErr(e.message); }
  };

  const edit = (c: any) => {
    setF({
      code: c.code, type: c.type, value: c.value, min_order: c.min_order || 0,
      max_discount: c.max_discount || 0, active: c.active, first_order_only: !!c.first_order_only,
      valid_from: c.valid_from || "", valid_until: c.valid_until || "", description: c.description || "",
    });
    setEditId(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggle = async (c: any) => { await api.patch(`/coupons/${c.id}`, { active: !c.active }); load(); };
  const del = async (id: string) => { if (confirm("Delete coupon?")) { await api.del(`/coupons/${id}`); if (editId === id) reset(); load(); } };

  return (
    <>
      <h1>Coupons</h1>

      <div className="card">
        <div className="between">
          <h3 style={{ marginTop: 0 }}>{editId ? "Edit coupon" : "Create coupon"}</h3>
          {editId && <button className="btn ghost sm" onClick={reset}>Cancel edit</button>}
        </div>
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
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={f.first_order_only} onChange={(e) => set("first_order_only", e.target.checked)} style={{ width: "auto", margin: 0 }} />
          First-order only (usable only on a customer's first order)
        </label>
        <p className="muted">When on, this coupon shows and applies only for customers who haven't ordered yet. It joins the auto-apply pool, so the best offer still wins if the customer has a better one.</p>
        <label>Description</label>
        <input value={f.description} onChange={(e) => set("description", e.target.value)} placeholder="10% off up to ₹150" />
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ marginTop: 14 }} onClick={save}>{editId ? "Save changes" : "Create coupon"}</button>
      </div>

      <div className="card">
        <table>
          <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Window</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} style={editId === c.id ? { background: "#fff6f0" } : {}}>
                <td>
                  <b>{c.code}</b>
                  {c.first_order_only && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: "#F26A21", background: "#fff3eb", padding: "2px 7px", borderRadius: 6 }}>1st order</span>}
                  <div className="muted">{c.description}</div>
                </td>
                <td>{c.type === "percent" ? `${c.value}%${c.max_discount ? ` (max ₹${c.max_discount})` : ""}` : `₹${c.value}`}</td>
                <td>{c.min_order ? `₹${c.min_order}` : "—"}</td>
                <td className="muted">{c.valid_from ? new Date(c.valid_from).toLocaleDateString() : "—"} → {c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "∞"}</td>
                <td><button className="btn ghost sm" onClick={() => toggle(c)}>{c.active ? "Active ✓" : "Inactive"}</button></td>
                <td className="flex">
                  <button className="btn ghost sm" onClick={() => edit(c)}>Edit</button>
                  <button className="btn danger sm" onClick={() => del(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="muted">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
