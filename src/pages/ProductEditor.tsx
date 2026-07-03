import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, uploadImage } from "../api";

type Variant = { name: string; hex: string; images: string[]; stock: number };

const empty = {
  title: "", description: "", brand: "", category_id: "",
  mrp: 0, price: 0, discount_pct: 0, discount_on: "price",
  images: [] as string[], colors: [] as Variant[], sizes: [] as string[],
  stock: 0, low_stock_threshold: 5,
  rating: 0, review_count: 0, sold_count: 0, is_active: true,
};

export default function ProductEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState({ ...empty });
  const [cats, setCats] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const genFile = useRef<HTMLInputElement>(null);

  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get("/categories").then(setCats).catch(() => {});
    if (id) api.get(`/products/${id}`).then((p) => setF({ ...empty, ...p, category_id: p.category_id || "" }));
  }, [id]);

  // live price preview
  const base = f.discount_on === "mrp" ? f.mrp : f.price;
  const final = f.discount_pct > 0 ? Math.round(base * (1 - f.discount_pct / 100) * 100) / 100 : f.price;
  const off = f.mrp > final ? Math.round(((f.mrp - final) / f.mrp) * 100) : 0;

  const uploadTo = async (files: FileList | null, cb: (urls: string[]) => void) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) urls.push(await uploadImage(file));
      cb(urls);
    } catch (e: any) { setErr(e.message); } finally { setUploading(false); }
  };

  const addVariant = () => set("colors", [...f.colors, { name: "", hex: "#000000", images: [], stock: 0 }]);
  const updVariant = (i: number, k: string, v: any) =>
    set("colors", f.colors.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const rmVariant = (i: number) => set("colors", f.colors.filter((_, idx) => idx !== i));

  const save = async () => {
    setErr("");
    if (!f.title || !f.price) { setErr("Title and needed price are required"); return; }
    const { rating, review_count, sold_count, ...rest } = f as any;
    const body = {
      ...rest,
      category_id: f.category_id || null,
      mrp: Number(f.mrp), price: Number(f.price), discount_pct: Number(f.discount_pct),
      stock: Number(f.stock), low_stock_threshold: Number(f.low_stock_threshold),
    };
    setSaving(true);
    try {
      if (id) await api.patch(`/products/${id}`, body);
      else await api.post("/products", body);
      nav("/products");
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  };

  return (
    <>
      <h1>{id ? "Edit Product" : "New Product"}</h1>

      <div className="card">
        <label>Title *</label>
        <input value={f.title} onChange={(e) => set("title", e.target.value)} />
        <label>Description</label>
        <textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} />
        <div className="row">
          <div><label>Brand</label><input value={f.brand} onChange={(e) => set("brand", e.target.value)} /></div>
          <div>
            <label>Category</label>
            <select value={f.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">— none —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Pricing</h3>
        <div className="row">
          <div><label>Actual price (MRP, struck)</label><input type="number" value={f.mrp} onChange={(e) => set("mrp", e.target.value)} /></div>
          <div><label>Needed price (selling)</label><input type="number" value={f.price} onChange={(e) => set("price", e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label>Extra discount %</label><input type="number" value={f.discount_pct} onChange={(e) => set("discount_pct", e.target.value)} /></div>
          <div>
            <label>Discount applies on</label>
            <select value={f.discount_on} onChange={(e) => set("discount_on", e.target.value)}>
              <option value="price">Needed price</option>
              <option value="mrp">Actual price (MRP)</option>
            </select>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 14 }}>
          Customer sees: <span style={{ textDecoration: "line-through" }}>₹{f.mrp}</span>{" "}
          <b style={{ color: "#f26a21", fontSize: 16 }}>₹{final}</b>{" "}
          {off > 0 && <span style={{ color: "#2fae5f" }}>({off}% off)</span>}
        </p>
      </div>

      {/* General images */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Gallery images</h3>
        <div className="imgs">
          {f.images.map((u, i) => (
            <div className="imgbox" key={u + i}>
              <img src={u} />
              <button className="x" onClick={() => set("images", f.images.filter((_, idx) => idx !== i))}>×</button>
            </div>
          ))}
          <button className="addimg" onClick={() => genFile.current?.click()} disabled={uploading}>{uploading ? "…" : "+ Add"}</button>
          <input ref={genFile} type="file" accept="image/*" multiple hidden
            onChange={(e) => uploadTo(e.target.files, (urls) => set("images", [...f.images, ...urls]))} />
        </div>
      </div>

      {/* Colour variants */}
      <div className="card">
        <div className="between"><h3 style={{ margin: 0 }}>Colour variants (colour-wise images + stock)</h3>
          <button className="btn ghost sm" onClick={addVariant}>+ Add colour</button></div>
        {f.colors.length === 0 && <p className="muted">No colour variants. Add one so customers can pick a colour and see its images.</p>}
        {f.colors.map((c, i) => (
          <div className="variant" key={i}>
            <div className="row">
              <div><label>Colour name</label><input value={c.name} onChange={(e) => updVariant(i, "name", e.target.value)} placeholder="Orange" /></div>
              <div><label>Swatch</label><input type="color" value={c.hex} onChange={(e) => updVariant(i, "hex", e.target.value)} style={{ height: 44 }} /></div>
              <div><label>Stock</label><input type="number" value={c.stock} onChange={(e) => updVariant(i, "stock", Number(e.target.value))} /></div>
            </div>
            <label>Images for this colour</label>
            <div className="imgs">
              {c.images.map((u, idx) => (
                <div className="imgbox" key={u + idx}>
                  <img src={u} />
                  <button className="x" onClick={() => updVariant(i, "images", c.images.filter((_, x) => x !== idx))}>×</button>
                </div>
              ))}
              <label className="addimg" style={{ cursor: "pointer" }}>
                +<input type="file" accept="image/*" multiple hidden
                  onChange={(e) => uploadTo(e.target.files, (urls) => updVariant(i, "images", [...c.images, ...urls]))} />
              </label>
            </div>
            <button className="btn danger sm" style={{ marginTop: 10 }} onClick={() => rmVariant(i)}>Remove colour</button>
          </div>
        ))}
      </div>

      {/* Inventory + sizes + ratings */}
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Inventory & details</h3>
        <div className="row">
          <div><label>Stock (if no colour variants)</label><input type="number" value={f.stock} onChange={(e) => set("stock", e.target.value)} /></div>
          <div><label>Low-stock alert at</label><input type="number" value={f.low_stock_threshold} onChange={(e) => set("low_stock_threshold", e.target.value)} /></div>
        </div>
        <label>Sizes (comma separated)</label>
        <input value={f.sizes.join(", ")} onChange={(e) => set("sizes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="S, M, L" />
        <p className="muted" style={{ marginTop: 16 }}>
          Rating & reviews are collected from delivered customers. Units sold is
          counted automatically when orders are delivered. These update on their own.
          See the Reviews tab for all customer feedback.
        </p>
        <label className="flex" style={{ marginTop: 16 }}>
          <input type="checkbox" style={{ width: "auto" }} checked={f.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Visible in store
        </label>
      </div>

      {err && <div className="err">{err}</div>}
      <div className="flex" style={{ marginTop: 8 }}>
        <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Product"}</button>
        <button className="btn ghost" onClick={() => nav("/products")}>Cancel</button>
      </div>
    </>
  );
}
