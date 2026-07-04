import { useEffect, useState } from "react";
import { api } from "../api";

type Section = {
  id?: string;
  title: string;
  type: "recommendation" | "manual" | "category";
  layout: "rail" | "grid";
  product_ids: string[];
  category_id: string | null;
  limit: number;
  order: number;
  active: boolean;
};

type Prod = { id: string; title: string; brand?: string; images?: string[]; category_id?: string | null };
type Cat = { id: string; name: string };

const BLANK: Section = {
  title: "", type: "manual", layout: "rail", product_ids: [],
  category_id: null, limit: 10, order: 0, active: true,
};

const TYPE_LABEL: Record<string, string> = {
  recommendation: "AI Recommendation",
  manual: "Hand-picked products",
  category: "From a category",
};

export default function HomeLayout() {
  const [sections, setSections] = useState<Section[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [editing, setEditing] = useState<Section | null>(null);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [desc, setDesc] = useState<Record<string, string[]>>({}); // category -> itself + children
  const [saving, setSaving] = useState(false);

  const load = () =>
    api.get<Section[]>("/home-sections").then(setSections).catch(() => {});

  useEffect(() => {
    load();
    api.get<Prod[]>("/products?limit=100&admin=true").then(setProducts).catch(() => {});
    api.get<any[]>("/categories/tree").then((tree) => {
      const flat: Cat[] = [];
      const d: Record<string, string[]> = {};
      (tree || []).forEach((t) => {
        flat.push({ id: t.id, name: t.name });
        const childIds = (t.children || []).map((c: any) => c.id);
        d[t.id] = [t.id, ...childIds]; // picking a parent includes its sub-categories
        (t.children || []).forEach((c: any) => {
          flat.push({ id: c.id, name: `${t.name} › ${c.name}` });
          d[c.id] = [c.id];
        });
      });
      setCats(flat);
      setDesc(d);
    }).catch(() => {});
  }, []);

  const move = async (idx: number, dir: -1 | 1) => {
    const next = [...sections];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setSections(next);
    await api.put("/home-sections/order", { ids: next.map((s) => s.id) });
  };

  const toggleActive = async (s: Section) => {
    await api.patch(`/home-sections/${s.id}`, { active: !s.active });
    load();
  };

  const remove = async (s: Section) => {
    if (!confirm(`Delete section "${s.title}"?`)) return;
    await api.del(`/home-sections/${s.id}`);
    load();
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim()) return alert("Title is required");
    if (editing.type === "manual" && editing.product_ids.length === 0)
      return alert("Pick at least one product");
    if (editing.type === "category" && !editing.category_id)
      return alert("Choose a category");
    setSaving(true);
    try {
      const body = { ...editing, title: editing.title.trim() };
      if (editing.id) await api.patch(`/home-sections/${editing.id}`, body);
      else await api.post("/home-sections", { ...body, order: sections.length });
      setEditing(null);
      setSearch("");
      setCatFilter("");
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (id: string) => {
    if (!editing) return;
    const has = editing.product_ids.includes(id);
    setEditing({
      ...editing,
      product_ids: has
        ? editing.product_ids.filter((p) => p !== id)
        : [...editing.product_ids, id],
    });
  };

  const filtered = products.filter((p) => {
    const inCat = !catFilter || (desc[catFilter] || [catFilter]).includes(p.category_id || "");
    const inSearch = (p.title + " " + (p.brand || "")).toLowerCase().includes(search.toLowerCase());
    return inCat && inSearch;
  });

  return (
    <>
      <div className="flex" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>Home Layout</h1>
        <button className="btn" onClick={() => setEditing({ ...BLANK })}>+ Add Section</button>
      </div>
      <p className="muted" style={{ marginTop: -6 }}>
        Build the app home screen. Drag order with ▲▼ — the top section shows first.
      </p>

      {/* Section list */}
      <div className="card">
        <table>
          <thead>
            <tr><th>Order</th><th>Title</th><th>Type</th><th>View</th><th>Items</th><th>Live</th><th></th></tr>
          </thead>
          <tbody>
            {sections.map((s, i) => (
              <tr key={s.id}>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn ghost sm" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>{" "}
                  <button className="btn ghost sm" disabled={i === sections.length - 1} onClick={() => move(i, 1)}>▼</button>
                </td>
                <td><b>{s.title}</b></td>
                <td><span className="pill" style={{ background: "#f1eee9" }}>{TYPE_LABEL[s.type] || s.type}</span></td>
                <td>{s.layout === "rail" ? "Side-by-side" : "Grid"}</td>
                <td className="muted">
                  {s.type === "manual" ? `${s.product_ids.length} picked`
                    : s.type === "category" ? "category"
                    : "auto"}
                </td>
                <td>
                  <label className="flex" style={{ gap: 6 }}>
                    <input type="checkbox" style={{ width: "auto" }} checked={s.active} onChange={() => toggleActive(s)} />
                  </label>
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button className="btn ghost sm" onClick={() => setEditing({ ...s })}>Edit</button>{" "}
                  <button className="btn danger sm" onClick={() => remove(s)}>Delete</button>
                </td>
              </tr>
            ))}
            {sections.length === 0 && <tr><td colSpan={7} className="muted">No sections yet. Add one to build the home screen.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Editor */}
      {editing && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>{editing.id ? "Edit section" : "New section"}</h3>
          <div className="row">
            <div style={{ flex: 2 }}>
              <label>Section title</label>
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. Summer Collection" />
            </div>
            <div>
              <label>Content</label>
              <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as Section["type"] })}>
                <option value="recommendation">AI Recommendation</option>
                <option value="manual">Hand-picked products</option>
                <option value="category">From a category</option>
              </select>
            </div>
            <div>
              <label>View</label>
              <select value={editing.layout} onChange={(e) => setEditing({ ...editing, layout: e.target.value as Section["layout"] })}>
                <option value="rail">Side-by-side (rail)</option>
                <option value="grid">Grid (stacked)</option>
              </select>
            </div>
            <div>
              <label>Max items</label>
              <input type="number" value={editing.limit} onChange={(e) => setEditing({ ...editing, limit: Math.max(1, Number(e.target.value) || 1) })} />
            </div>
          </div>

          {editing.type === "category" && (
            <div style={{ marginTop: 12 }}>
              <label>Category</label>
              <select value={editing.category_id || ""} onChange={(e) => setEditing({ ...editing, category_id: e.target.value || null })}>
                <option value="">Select a category…</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {editing.type === "manual" && (
            <div style={{ marginTop: 12 }}>
              <label>Products ({editing.product_ids.length} selected — shown in the order you pick)</label>
              <div className="row">
                <div style={{ flex: 1 }}>
                  <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                    <option value="">All categories</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
              </div>
              <div style={{ maxHeight: 280, overflow: "auto", marginTop: 10, border: "1px solid var(--border)", borderRadius: 10 }}>
                {filtered.map((p) => {
                  const sel = editing.product_ids.includes(p.id);
                  const pos = editing.product_ids.indexOf(p.id) + 1;
                  return (
                    <label key={p.id} className="flex" style={{ gap: 10, padding: "8px 12px", borderBottom: "1px solid var(--border)", cursor: "pointer", background: sel ? "#FFF3EB" : undefined }}>
                      <input type="checkbox" style={{ width: "auto" }} checked={sel} onChange={() => toggleProduct(p.id)} />
                      <img className="thumb" src={p.images?.[0] || "https://via.placeholder.com/40"} style={{ width: 34, height: 34 }} />
                      <span style={{ flex: 1 }}>{p.title}{p.brand ? <span className="muted"> · {p.brand}</span> : null}</span>
                      {sel && <span className="pill" style={{ background: "#F26A21", color: "#fff" }}>#{pos}</span>}
                    </label>
                  );
                })}
                {filtered.length === 0 && <div className="muted" style={{ padding: 12 }}>No products match.</div>}
              </div>
            </div>
          )}

          {editing.type === "recommendation" && (
            <p className="muted" style={{ marginTop: 12 }}>
              Auto-filled with personalised AI recommendations for each shopper. No manual picking needed.
            </p>
          )}

          <label className="flex" style={{ marginTop: 14 }}>
            <input type="checkbox" style={{ width: "auto" }} checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            Visible on home screen
          </label>

          <div className="flex" style={{ marginTop: 14 }}>
            <button className="btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save section"}</button>
            <button className="btn ghost" onClick={() => { setEditing(null); setSearch(""); setCatFilter(""); }}>Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
