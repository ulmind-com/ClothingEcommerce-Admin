import { useEffect, useState } from "react";
import { api } from "../api";

const money = (n: any) => `₹${Number(n ?? 0).toFixed(2)}`;
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : "—");
const fmtDT = (d?: string) => (d ? new Date(d).toLocaleString() : "—");

const rolePill = (role?: string) => (
  <span
    className="pill"
    style={{
      background: role === "admin" ? "#eee7fb" : "#f1f1f4",
      color: role === "admin" ? "#6b3fd4" : "#6b6b70",
    }}
  >
    {(role || "user").toUpperCase()}
  </span>
);

export default function Users() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const load = (query = "") => {
    setLoading(true);
    api
      .get(`/users/admin/all${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then(setRows)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => load(q.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const toggleCod = async (u: any) => {
    setErr(""); setBusy(u.id);
    try {
      const blocked = !u.cod_blocked;
      const r = await api.patch(`/users/admin/${u.id}/cod`, { blocked });
      setRows((prev) => prev.map((x) => (x.id === u.id ? { ...x, cod_blocked: r.cod_blocked } : x)));
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <h1>Users</h1>
      <p className="muted" style={{ marginTop: -8 }}>
        Every customer with full details and lifetime order stats. Turn Cash on Delivery off for any individual user here.
      </p>

      <div className="card" style={{ padding: 14 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email or phone…"
          style={{ marginBottom: 0 }}
        />
      </div>

      {err && <div className="err">{err}</div>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Customer</th><th>Phone</th><th>Role</th><th>Joined</th>
              <th>Orders</th><th>Spent</th><th>COD</th><th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <>
                <tr key={u.id}>
                  <td>
                    <b>{u.name || "—"}</b>
                    <div className="muted">{u.email}</div>
                  </td>
                  <td>{u.phone || <span className="muted">—</span>}</td>
                  <td>{rolePill(u.role)}</td>
                  <td className="muted">{fmtDate(u.created_at)}</td>
                  <td>{u.orders_count}</td>
                  <td><b>{money(u.total_spent)}</b></td>
                  <td>
                    {u.cod_blocked ? (
                      <span className="pill" style={{ background: "#fdecec", color: "#c0392b" }}>COD off</span>
                    ) : (
                      <span className="pill" style={{ background: "#e7f5ec", color: "#1c8a4a" }}>COD on</span>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      className="btn ghost sm"
                      disabled={busy === u.id || u.role === "admin"}
                      onClick={() => toggleCod(u)}
                      title={u.role === "admin" ? "Admins don't use COD" : ""}
                    >
                      {busy === u.id ? "…" : u.cod_blocked ? "Enable COD" : "Disable COD"}
                    </button>
                    <button className="btn ghost sm" style={{ marginLeft: 6 }} onClick={() => setOpen(open === u.id ? null : u.id)}>
                      {open === u.id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>
                {open === u.id && (
                  <tr key={u.id + "d"}>
                    <td colSpan={8} style={{ background: "#faf9f8" }}>
                      <div className="detailwrap">
                        <div className="section-title">Account</div>
                        <div className="pdetail">
                          <div className="kv"><span className="k">User ID</span><span className="v mono">{u.id}</span></div>
                          <div className="kv"><span className="k">Name</span><span className="v">{u.name || "—"}</span></div>
                          <div className="kv"><span className="k">Email</span><span className="v">{u.email || "—"}</span></div>
                          <div className="kv"><span className="k">Phone</span><span className="v">{u.phone || "—"}</span></div>
                          <div className="kv"><span className="k">Role</span><span className="v">{u.role}</span></div>
                          <div className="kv"><span className="k">Sign-in</span><span className="v">{u.provider || "email"}</span></div>
                          <div className="kv"><span className="k">Joined</span><span className="v">{fmtDT(u.created_at)}</span></div>
                          <div className="kv"><span className="k">Push devices</span><span className="v">{u.fcm_tokens}</span></div>
                          <div className="kv"><span className="k">COD</span><span className="v">{u.cod_blocked ? "Disabled" : "Enabled"}</span></div>
                        </div>

                        <div className="section-title">Lifetime</div>
                        <div className="pdetail">
                          <div className="kv"><span className="k">Orders</span><span className="v">{u.orders_count}</span></div>
                          <div className="kv"><span className="k">Total spent</span><span className="v">{money(u.total_spent)}</span></div>
                        </div>

                        <div className="section-title">Saved addresses ({(u.addresses || []).length})</div>
                        {(u.addresses || []).length === 0 ? (
                          <span className="muted">No saved addresses.</span>
                        ) : (
                          <div className="pdetail">
                            {(u.addresses || []).map((a: any, i: number) => (
                              <div className="kv" key={i}>
                                <span className="k">{a.tag || "Address"}</span>
                                <span className="v">
                                  {[a.house, a.area, a.city, a.state, a.pincode].filter(Boolean).join(", ") || "—"}
                                  {a.phone ? ` · ${a.phone}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="muted">No users found.</td></tr>}
            {loading && <tr><td colSpan={8} className="muted">Loading…</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
