import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { setAuth } from "../auth";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@shop.com");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.user.role !== "admin") throw new Error("Not an admin account");
      setAuth(res.access_token, res.user);
      nav("/");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="center">
      <form className="card login" onSubmit={submit}>
        <h2 style={{ marginTop: 0 }}>Admin Login</h2>
        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div className="err">{err}</div>}
        <button className="btn" style={{ width: "100%", marginTop: 18 }} disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
