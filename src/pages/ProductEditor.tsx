import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, uploadImage } from "../api";

type SizeStock = { size: string; price: number | null; mrp: number | null; discount_pct: number | null; discount_on: string | null; stock: number };
type Variant = {
  name: string; hex: string; images: string[]; stock: number;
  price: number | null; mrp: number | null; discount_pct: number | null; discount_on: string | null;
  sizes: SizeStock[];
};

const numOrNull = (v: string): number | null => (v === "" ? null : Number(v));

const empty = {
  title: "", description: "", brand: "", category_id: "",
  mrp: 0, price: 0, discount_pct: 0, discount_on: "price", tax_pct: "" as number | string,
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
  const [showHelp, setShowHelp] = useState(false);
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

  const addVariant = () =>
    set("colors", [...f.colors, { name: "", hex: "#000000", images: [], stock: 0, price: null, mrp: null, discount_pct: null, discount_on: null, sizes: [] }]);
  const updVariant = (i: number, k: string, v: any) =>
    set("colors", f.colors.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)));
  const rmVariant = (i: number) => set("colors", f.colors.filter((_, idx) => idx !== i));

  const addSize = (i: number) =>
    updVariant(i, "sizes", [...(f.colors[i].sizes || []), { size: "", price: null, mrp: null, discount_pct: null, discount_on: null, stock: 0 }]);
  const updSize = (i: number, si: number, k: string, v: any) =>
    updVariant(i, "sizes", (f.colors[i].sizes || []).map((s, idx) => (idx === si ? { ...s, [k]: v } : s)));
  const rmSize = (i: number, si: number) =>
    updVariant(i, "sizes", (f.colors[i].sizes || []).filter((_, idx) => idx !== si));

  const save = async () => {
    setErr("");
    if (!f.title || !f.price) { setErr("Title and needed price are required"); return; }
    const { rating, review_count, sold_count, ...rest } = f as any;
    const body = {
      ...rest,
      category_id: f.category_id || null,
      mrp: Number(f.mrp), price: Number(f.price), discount_pct: Number(f.discount_pct),
      tax_pct: f.tax_pct === "" ? null : Number(f.tax_pct),
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
        <div className="row">
          <div>
            <label>GST % for this product</label>
            <input type="number" value={f.tax_pct} onChange={(e) => set("tax_pct", e.target.value)} placeholder="e.g. 5, 12, 18 — blank = store default" />
          </div>
          <div />
        </div>
        <p className="muted" style={{ marginTop: 14 }}>
          Customer sees: <span style={{ textDecoration: "line-through" }}>₹{f.mrp}</span>{" "}
          <b style={{ color: "#f26a21", fontSize: 16 }}>₹{final}</b>{" "}
          {off > 0 && <span style={{ color: "#2fae5f" }}>({off}% off)</span>}
          {" · "}GST {f.tax_pct === "" ? "store default" : `${f.tax_pct}%`} (added at checkout)
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
        <div className="between">
          <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            Colour variants (colour-wise price, discount, stock)
            <button
              type="button"
              title="How pricing & inheritance works"
              onClick={() => setShowHelp((v) => !v)}
              style={{ width: 22, height: 22, borderRadius: "50%", border: "1.5px solid var(--orange)", color: "var(--orange)", background: "transparent", fontStyle: "italic", fontWeight: 700, cursor: "pointer", lineHeight: 1 }}
            >i</button>
          </h3>
          <button className="btn ghost sm" onClick={addVariant}>+ Add colour</button>
        </div>

        {showHelp && (
          <div style={{ background: "#FFF7F0", border: "1px solid #F3D8C4", borderRadius: 12, padding: 16, marginBottom: 16, fontSize: 13.5, lineHeight: 1.6 }}>
            <b>How pricing works — 3 levels, each overrides the one above</b>
            <ol style={{ margin: "8px 0 8px 18px", padding: 0 }}>
              <li><b>Base</b> (the Pricing card above): the product's default price, MRP &amp; discount.</li>
              <li><b>Colour</b>: optional overrides for a whole colour.</li>
              <li><b>Size</b>: optional overrides for one size inside a colour.</li>
            </ol>
            <p style={{ margin: "8px 0" }}>
              Fallback for <i>every</i> field is <b>Size → Colour → Base</b>. Leaving a box blank
              (or <b>“inherit”</b>) means “use the level above”. The greyed <span className="muted">₹placeholder</span> shows
              what will be inherited.
            </p>
            <ul style={{ margin: "8px 0 8px 18px", padding: 0 }}>
              <li><b>Price / MRP</b> — blank = inherit; type a number to override just that colour/size.</li>
              <li><b>Disc % + On</b> — extra discount. <b>On = price</b> cuts the selling price; <b>On = mrp</b> cuts from the MRP; <b>inherit</b> = use colour’s, else base’s.</li>
              <li><b>Stock</b> — if a colour has size rows, each size’s stock is used (Colour stock is ignored). No size rows → the Colour stock is used.</li>
            </ul>
            <p style={{ margin: "8px 0" }}>
              Customer price for a colour+size = resolve price/MRP/discount, then apply the discount.
              The product card shows the cheapest combo as <b>“from ₹X”</b>.
            </p>
            <div style={{ marginTop: 10, padding: "10px 12px", background: "#fff", border: "1px solid var(--border)", borderRadius: 10 }}>
              <b>Example — this dress</b> <span className="muted">(base ₹2799, MRP ₹3499)</span>:
              <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                <li><b>Black / XS</b>: size Disc 10% on price → <b>₹2519</b> (28% off vs MRP)</li>
                <li><b>Black / S, M</b>: all inherit → <b>₹2799</b> (20% off)</li>
                <li><b>Black / L</b>: size Price ₹3079 → <b>₹3079</b> (12% off)</li>
                <li><b>Red</b> (whole colour Price ₹2939): XS/S/M → <b>₹2939</b>; L overridden → <b>₹3079</b></li>
              </ul>
            </div>
          </div>
        )}
        {f.colors.length === 0 && <p className="muted">No colour variants. Add one so customers can pick a colour and see its images.</p>}
        {f.colors.map((c, i) => (
          <div className="variant" key={i}>
            <div className="row">
              <div><label>Colour name</label><input value={c.name} onChange={(e) => updVariant(i, "name", e.target.value)} placeholder="Orange" /></div>
              <div><label>Swatch</label><input type="color" value={c.hex} onChange={(e) => updVariant(i, "hex", e.target.value)} style={{ height: 44 }} /></div>
              <div><label>Colour stock (used if no sizes below)</label><input type="number" value={c.stock} onChange={(e) => updVariant(i, "stock", Number(e.target.value))} /></div>
            </div>
            <div className="row">
              <div><label>Colour price (optional — overrides base)</label><input type="number" value={c.price ?? ""} placeholder={`base ₹${f.price}`} onChange={(e) => updVariant(i, "price", numOrNull(e.target.value))} /></div>
              <div><label>Colour MRP (optional)</label><input type="number" value={c.mrp ?? ""} placeholder={`base ₹${f.mrp}`} onChange={(e) => updVariant(i, "mrp", numOrNull(e.target.value))} /></div>
            </div>
            <div className="row">
              <div><label>Colour discount % (optional)</label><input type="number" value={c.discount_pct ?? ""} placeholder={`base ${f.discount_pct || 0}%`} onChange={(e) => updVariant(i, "discount_pct", numOrNull(e.target.value))} /></div>
              <div>
                <label>Discount applies on</label>
                <select value={c.discount_on ?? ""} onChange={(e) => updVariant(i, "discount_on", e.target.value || null)}>
                  <option value="">— inherit base —</option>
                  <option value="price">Needed price</option>
                  <option value="mrp">Actual price (MRP)</option>
                </select>
              </div>
            </div>

            {/* Per-size price + stock within this colour */}
            <div className="between" style={{ marginTop: 12 }}>
              <label style={{ margin: 0 }}>Sizes for this colour (each can have its own price + stock)</label>
              <button className="btn ghost sm" onClick={() => addSize(i)}>+ Add size</button>
            </div>
            {(c.sizes || []).length === 0 && (
              <p className="muted" style={{ marginTop: 6 }}>No per-size rows — this colour uses the colour stock/price above.</p>
            )}
            {(c.sizes || []).map((s, si) => (
              <div className="row" key={si} style={{ alignItems: "end", flexWrap: "wrap" }}>
                <div><label>Size</label><input value={s.size} placeholder="M" onChange={(e) => updSize(i, si, "size", e.target.value)} /></div>
                <div><label>Price</label><input type="number" value={s.price ?? ""} placeholder={`₹${c.price ?? f.price}`} onChange={(e) => updSize(i, si, "price", numOrNull(e.target.value))} /></div>
                <div><label>MRP</label><input type="number" value={s.mrp ?? ""} placeholder={`₹${c.mrp ?? f.mrp}`} onChange={(e) => updSize(i, si, "mrp", numOrNull(e.target.value))} /></div>
                <div><label>Disc %</label><input type="number" value={s.discount_pct ?? ""} placeholder={`${c.discount_pct ?? f.discount_pct ?? 0}`} onChange={(e) => updSize(i, si, "discount_pct", numOrNull(e.target.value))} /></div>
                <div>
                  <label>On</label>
                  <select value={s.discount_on ?? ""} onChange={(e) => updSize(i, si, "discount_on", e.target.value || null)}>
                    <option value="">inherit</option>
                    <option value="price">price</option>
                    <option value="mrp">mrp</option>
                  </select>
                </div>
                <div><label>Stock</label><input type="number" value={s.stock} onChange={(e) => updSize(i, si, "stock", Number(e.target.value))} /></div>
                <div style={{ flex: "0 0 auto" }}><label>&nbsp;</label><button className="btn danger sm" onClick={() => rmSize(i, si)}>Remove</button></div>
              </div>
            ))}

            <label style={{ marginTop: 12 }}>Images for this colour</label>
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
