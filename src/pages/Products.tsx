import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Products() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/products?limit=100&admin=true").then(setItems).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const del = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    await api.del(`/products/${id}`);
    setItems((p) => p.filter((x) => x.id !== id));
  };

  return (
    <>
      <div className="between">
        <h1>Products</h1>
        <Link to="/products/new" className="btn">+ Add Product</Link>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <table>
            <thead>
              <tr><th></th><th>Title</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td><img className="thumb" src={p.images?.[0] || p.colors?.[0]?.images?.[0] || "https://via.placeholder.com/60"} /></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.title}</div>
                    <div className="muted">{p.brand}</div>
                  </td>
                  <td>
                    {p.struck_price && <span style={{ textDecoration: "line-through", color: "#a79e95", marginRight: 6 }}>₹{p.struck_price}</span>}
                    <b>₹{p.final_price}</b>
                    {p.off_pct > 0 && <span style={{ color: "#2fae5f" }}> ({p.off_pct}% off)</span>}
                  </td>
                  <td>
                    <span className="pill" style={{ background: p.total_stock <= 5 ? "#fdecec" : "#eaf7ee", color: p.total_stock <= 5 ? "#e23744" : "#2fae5f" }}>
                      {p.total_stock}
                    </span>
                  </td>
                  <td>{p.is_active ? "Active" : <span className="muted">Hidden</span>}</td>
                  <td className="flex">
                    <Link to={`/products/${p.id}`} className="btn ghost sm">Edit</Link>
                    <button className="btn danger sm" onClick={() => del(p.id, p.title)}>Delete</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={6} className="muted">No products yet.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
