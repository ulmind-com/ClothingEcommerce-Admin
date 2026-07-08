import { useEffect, useRef, useState } from "react";
import { api } from "../api";

type UserRow = { id: string; name: string; email: string; role: string };

export default function Notifications() {
  const [target, setTarget] = useState<"all" | "first_order" | "user">("all");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [picked, setPicked] = useState<UserRow | null>(null);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const debounce = useRef<any>(null);

  // Live user search when targeting a single user.
  useEffect(() => {
    if (target !== "user") return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      api.get<UserRow[]>(`/users/admin/list?limit=20${q ? `&q=${encodeURIComponent(q)}` : ""}`)
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
  }, [q, target]);

  const send = async () => {
    setErr(""); setMsg("");
    if (!title.trim() || !body.trim()) { setErr("Title and message are required"); return; }
    if (target === "user" && !picked) { setErr("Pick a user to send to"); return; }
    setSending(true);
    try {
      await api.post("/notifications/send", {
        title: title.trim(),
        body: body.trim(),
        target,
        user_id: target === "user" ? picked!.id : null,
      });
      const who = target === "all" ? "everyone" : target === "first_order" ? "first-order customers" : picked!.name || picked!.email;
      setMsg(`Sent to ${who} ✓`);
      setTitle(""); setBody("");
    } catch (e: any) { setErr(e.message); }
    finally { setSending(false); }
  };

  return (
    <>
      <h1>Notifications</h1>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Send a notification</h3>

        <label>Send to</label>
        <div className="flex" style={{ gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {([
            ["all", "Everyone"],
            ["first_order", "First-order customers"],
            ["user", "A specific user"],
          ] as const).map(([val, lbl]) => (
            <button
              key={val}
              className={`btn ${target === val ? "" : "ghost"} sm`}
              onClick={() => { setTarget(val); setMsg(""); }}
            >
              {lbl}
            </button>
          ))}
        </div>

        {target === "user" && (
          <div style={{ marginBottom: 12 }}>
            {picked ? (
              <div className="between" style={{ background: "#fff6f0", borderRadius: 8, padding: "8px 12px" }}>
                <span><b>{picked.name || "(no name)"}</b> <span className="muted">{picked.email}</span></span>
                <button className="btn ghost sm" onClick={() => setPicked(null)}>Change</button>
              </div>
            ) : (
              <>
                <input placeholder="Search users by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
                <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                  {results.length === 0 ? (
                    <div className="muted" style={{ padding: 12 }}>No users found.</div>
                  ) : results.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => { setPicked(u); setResults([]); setQ(""); }}
                      style={{ padding: "8px 12px", cursor: "pointer", borderBottom: "1px solid #f0f0f0" }}
                    >
                      <b>{u.name || "(no name)"}</b> <span className="muted">· {u.email}</span>
                      {u.role === "admin" && <span style={{ marginLeft: 8, fontSize: 11, color: "#F26A21" }}>admin</span>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Flash sale is live! ⚡" maxLength={80} />

        <label>Message</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Up to 50% off across the store for the next 24 hours." rows={3} maxLength={200} />

        {err && <div className="err">{err}</div>}
        <div className="flex" style={{ marginTop: 14, gap: 12 }}>
          <button className="btn" onClick={send} disabled={sending}>{sending ? "Sending…" : "Send notification"}</button>
          {msg && <span style={{ color: "#2fae5f", fontWeight: 600 }}>{msg}</span>}
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Every recipient also gets an in-app copy in their notification inbox. Push delivery activates once Firebase is configured on the server.
        </p>
      </div>
    </>
  );
}
