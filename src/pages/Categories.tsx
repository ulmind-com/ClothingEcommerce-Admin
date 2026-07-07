import { useEffect, useState } from "react";
import { api, uploadImage } from "../api";

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const thumb = (size = 44): React.CSSProperties => ({
  width: size, height: size, borderRadius: size / 2, objectFit: "cover", background: "var(--bg)",
});

export default function Categories() {
  const [tree, setTree] = useState<any[]>([]);
  const [topName, setTopName] = useState("");
  const [topImg, setTopImg] = useState("");
  const [busy, setBusy] = useState(false);
  const [scales, setScales] = useState<Record<string, number>>({}); // percent per category

  const load = () =>
    api.get<any[]>("/categories/tree").then((t) => {
      setTree(t);
      const sc: Record<string, number> = {};
      (t || []).forEach((c) => { sc[c.id] = Math.round((c.image_scale || 1) * 100); });
      setScales(sc);
    }).catch(() => {});
  useEffect(() => { load(); }, []);

  const saveScale = (id: string, pct: number) => {
    api.patch(`/categories/${id}`, { image_scale: pct / 100 }).catch(() => {});
  };

  // Upload a file and hand back its URL.
  const upload = async (file: File | undefined, cb: (url: string) => void) => {
    if (!file) return;
    setBusy(true);
    try { cb(await uploadImage(file)); } catch (e: any) { alert(e.message); } finally { setBusy(false); }
  };

  // Upload + attach an image to an existing category.
  const setCatImage = async (id: string, file: File | undefined) => {
    await upload(file, async (url) => { await api.patch(`/categories/${id}`, { image: url }); load(); });
  };

  const addTop = async () => {
    if (!topName.trim()) return;
    await api.post("/categories", { name: topName.trim(), slug: slug(topName), parent_id: null, image: topImg || null });
    setTopName(""); setTopImg(""); load();
  };
  const addSub = async (parentId: string) => {
    const name = prompt("Sub-category name (e.g. Lehenga)");
    if (!name?.trim()) return;
    await api.post("/categories", { name: name.trim(), slug: slug(name) + "-" + Date.now().toString().slice(-4), parent_id: parentId });
    load();
  };
  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await api.del(`/categories/${id}`); load();
  };

  return (
    <>
      <h1>Categories</h1>
      <div className="card">
        <label>New top-level category</label>
        <div className="flex" style={{ alignItems: "center", gap: 10 }}>
          {topImg && <img src={topImg} style={thumb(40)} />}
          <input value={topName} onChange={(e) => setTopName(e.target.value)} placeholder="Mens / Womens / Kids…" />
          <label className="btn ghost sm" style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
            {topImg ? "Change image" : "Add image"}
            <input type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0], setTopImg)} />
          </label>
          <button className="btn" onClick={addTop} disabled={busy}>{busy ? "…" : "Add"}</button>
        </div>
        <p className="muted" style={{ marginTop: 8 }}>Add an image — the app shows each category as an image pill.</p>
      </div>

      {tree.map((c) => (
        <div className="card" key={c.id}>
          <div className="between">
            <div className="flex" style={{ alignItems: "center", gap: 12 }}>
              <img src={c.image || "https://via.placeholder.com/44?text=?"} style={thumb()} />
              <h3 style={{ margin: 0 }}>{c.name}</h3>
              <label className="btn ghost sm" style={{ cursor: "pointer" }}>
                {c.image ? "Change image" : "Add image"}
                <input type="file" accept="image/*" hidden onChange={(e) => setCatImage(c.id, e.target.files?.[0])} />
              </label>
            </div>
            <div className="flex">
              <button className="btn ghost sm" onClick={() => addSub(c.id)}>+ Sub-category</button>
              <button className="btn danger sm" onClick={() => del(c.id, c.name)}>Delete</button>
            </div>
          </div>

          {/* Home pill image size — live preview + slider */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginTop: 14 }}>
            <div style={{ position: "relative", width: 160, height: 46, background: "#fff", border: "1px solid var(--border)", borderRadius: 23, display: "flex", alignItems: "center", paddingLeft: 58, boxShadow: "0 2px 8px rgba(0,0,0,.08)", flex: "0 0 auto" }}>
              <img
                src={c.image || "https://via.placeholder.com/50?text=?"}
                style={{ position: "absolute", left: 6, bottom: 0, height: 62 * ((scales[c.id] ?? 100) / 100), width: 54 * ((scales[c.id] ?? 100) / 100), objectFit: "contain" }}
              />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
            </div>
            <div style={{ flex: 1 }}>
              <label>Home image size — {scales[c.id] ?? 100}%</label>
              <input
                type="range" min={70} max={170} step={5}
                value={scales[c.id] ?? 100}
                onChange={(e) => setScales((s) => ({ ...s, [c.id]: Number(e.target.value) }))}
                onMouseUp={() => saveScale(c.id, scales[c.id] ?? 100)}
                onTouchEnd={() => saveScale(c.id, scales[c.id] ?? 100)}
                style={{ width: "100%" }}
              />
              <p className="muted" style={{ marginTop: 2 }}>Drag to resize how this category's image shows on the app home.</p>
            </div>
          </div>
          {c.children?.length > 0 && (
            <table style={{ marginTop: 12 }}>
              <tbody>
                {c.children.map((s: any) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex" style={{ alignItems: "center", gap: 10 }}>
                        <img src={s.image || "https://via.placeholder.com/32?text=?"} style={thumb(30)} />
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <label className="btn ghost sm" style={{ cursor: "pointer" }}>
                        {s.image ? "Change image" : "Add image"}
                        <input type="file" accept="image/*" hidden onChange={(e) => setCatImage(s.id, e.target.files?.[0])} />
                      </label>{" "}
                      <button className="btn danger sm" onClick={() => del(s.id, s.name)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </>
  );
}
