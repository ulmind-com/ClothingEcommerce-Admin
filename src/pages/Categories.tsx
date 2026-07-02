import { useEffect, useState } from "react";
import { api } from "../api";

const slug = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function Categories() {
  const [tree, setTree] = useState<any[]>([]);
  const [topName, setTopName] = useState("");

  const load = () => api.get("/categories/tree").then(setTree).catch(() => {});
  useEffect(() => { load(); }, []);

  const addTop = async () => {
    if (!topName.trim()) return;
    await api.post("/categories", { name: topName.trim(), slug: slug(topName), parent_id: null });
    setTopName(""); load();
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
        <div className="flex">
          <input value={topName} onChange={(e) => setTopName(e.target.value)} placeholder="Mens / Womens…" />
          <button className="btn" onClick={addTop}>Add</button>
        </div>
      </div>

      {tree.map((c) => (
        <div className="card" key={c.id}>
          <div className="between">
            <h3 style={{ margin: 0 }}>{c.name}</h3>
            <div className="flex">
              <button className="btn ghost sm" onClick={() => addSub(c.id)}>+ Sub-category</button>
              <button className="btn danger sm" onClick={() => del(c.id, c.name)}>Delete</button>
            </div>
          </div>
          {c.children?.length > 0 && (
            <table style={{ marginTop: 12 }}>
              <tbody>
                {c.children.map((s: any) => (
                  <tr key={s.id}>
                    <td>↳ {s.name}</td>
                    <td style={{ textAlign: "right" }}>
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
