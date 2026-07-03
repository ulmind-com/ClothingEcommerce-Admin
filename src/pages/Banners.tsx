import { useEffect, useRef, useState } from "react";
import { api, uploadImage } from "../api";

const empty = { image: "", title: "", subtitle: "", code: "", active: true, order: 0 };

export default function Banners() {
  const [items, setItems] = useState<any[]>([]);
  const [f, setF] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const load = () => api.get("/banners?admin=true").then(setItems).catch(() => {});
  useEffect(() => { load(); }, []);

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const reset = () => { setF({ ...empty }); setEditId(null); setErr(""); };

  const upload = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    try { set("image", await uploadImage(files[0])); }
    catch (e: any) { setErr(e.message); } finally { setUploading(false); }
  };

  const save = async () => {
    setErr("");
    if (!f.image) { setErr("Please upload a banner image"); return; }
    const body = { ...f, order: Number(f.order) };
    if (editId) await api.patch(`/banners/${editId}`, body);
    else await api.post("/banners", body);
    reset(); load();
  };

  const edit = (b: any) => {
    setF({ image: b.image, title: b.title || "", subtitle: b.subtitle || "", code: b.code || "", active: b.active, order: b.order ?? 0 });
    setEditId(b.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setOrder = async (b: any, order: number) => { await api.patch(`/banners/${b.id}`, { order }); load(); };
  const toggle = async (b: any) => { await api.patch(`/banners/${b.id}`, { active: !b.active }); load(); };
  const del = async (id: string) => { if (confirm("Delete banner?")) { await api.del(`/banners/${id}`); if (editId === id) reset(); load(); } };

  return (
    <>
      <h1>Banners / Offers</h1>

      <div className="card">
        <div className="between">
          <h3 style={{ marginTop: 0 }}>{editId ? "Edit banner" : "Add banner"}</h3>
          {editId && <button className="btn ghost sm" onClick={reset}>Cancel edit</button>}
        </div>
        <p className="muted">Recommended image size: <b>1000 × 420 px</b> (≈ 2.4:1). Banners show in the home carousel sorted by <b>Order</b> (low → high).</p>
        <div className="imgs">
          {f.image
            ? <div className="imgbox"><img style={{ width: 220, height: 92 }} src={f.image} /><button className="x" onClick={() => set("image", "")}>×</button></div>
            : <button className="addimg" style={{ width: 220, height: 92 }} onClick={() => file.current?.click()} disabled={uploading}>{uploading ? "…" : "+ Upload banner"}</button>}
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files)} />
        </div>
        <div className="row">
          <div><label>Title (e.g. 50% OFF)</label><input value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
          <div><label>Subtitle (e.g. TODAY ONLY)</label><input value={f.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label>Coupon code to show (optional)</label><input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="WELCOMEOFFER" /></div>
          <div><label>Order (lower shows first)</label><input type="number" value={f.order} onChange={(e) => set("order", e.target.value)} /></div>
        </div>
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ marginTop: 14 }} onClick={save}>{editId ? "Save changes" : "Add banner"}</button>
      </div>

      {items.map((b) => (
        <div className="card" key={b.id} style={editId === b.id ? { borderColor: "var(--orange)" } : {}}>
          <div className="between">
            <div className="flex">
              <img style={{ width: 160, height: 66, objectFit: "cover", borderRadius: 8 }} src={b.image} />
              <div>
                <b>{b.title || "(no title)"}</b>
                <div className="muted">{b.subtitle} {b.code ? `· ${b.code}` : ""}</div>
              </div>
            </div>
            <div className="flex">
              <label style={{ margin: 0 }} className="muted">Order</label>
              <input type="number" value={b.order ?? 0} style={{ width: 70 }} onChange={(e) => setOrder(b, Number(e.target.value))} />
              <button className="btn ghost sm" onClick={() => edit(b)}>Edit</button>
              <button className="btn ghost sm" onClick={() => toggle(b)}>{b.active ? "Active ✓" : "Hidden"}</button>
              <button className="btn danger sm" onClick={() => del(b.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 && <p className="muted">No banners yet.</p>}
    </>
  );
}
