import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState({ products: 0, categories: 0, orders: 0, revenue: 0 });
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [prods, cats, orders, low] = await Promise.all([
          api.get("/products?limit=100&admin=true"),
          api.get("/categories"),
          api.get("/orders/admin/all"),
          api.get("/products/admin/low-stock"),
        ]);
        const revenue = orders
          .filter((o: any) => o.status !== "cancelled")
          .reduce((s: number, o: any) => s + (o.amount || 0), 0);
        setStats({ products: prods.length, categories: cats.length, orders: orders.length, revenue });
        setLowStock(low);
      } catch {}
    })();
  }, []);

  return (
    <>
      <h1>Dashboard</h1>
      <div className="grid4" style={{ marginTop: 18 }}>
        <div className="stat"><div className="n">{stats.products}</div><div className="l">Products</div></div>
        <div className="stat"><div className="n">{stats.categories}</div><div className="l">Categories</div></div>
        <div className="stat"><div className="n">{stats.orders}</div><div className="l">Orders</div></div>
        <div className="stat"><div className="n">₹{stats.revenue.toFixed(0)}</div><div className="l">Revenue</div></div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="between">
          <h3 style={{ margin: 0 }}>Low stock alerts</h3>
          <Link to="/products" className="btn ghost sm">Manage products</Link>
        </div>
        {lowStock.length === 0 ? (
          <p className="muted">All products are well stocked.</p>
        ) : (
          <table>
            <thead><tr><th>Product</th><th>Stock</th></tr></thead>
            <tbody>
              {lowStock.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td><span className="pill" style={{ background: "#fdecec", color: "#e23744" }}>{p.total_stock} left</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
