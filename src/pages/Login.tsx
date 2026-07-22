import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { setAuth } from "../auth";
import "./Login.css";

const LAMP_STATES = [
  { themeColor: "#2a2c30", glow: "42, 44, 48", shade: "#2c2c2c", bulb: "#1a1a1a", light: "0", btnBg: "#2a2c30", btnText: "#888", awake: false },
  { themeColor: "#22c55e", glow: "34, 197, 94", shade: "#6c8c73", bulb: "#e6ffe6", light: "0.15", btnBg: "#22c55e", btnText: "#fff", awake: true },
  { themeColor: "#2a2c30", glow: "42, 44, 48", shade: "#2c2c2c", bulb: "#1a1a1a", light: "0", btnBg: "#2a2c30", btnText: "#888", awake: false },
  { themeColor: "#f97316", glow: "249, 115, 22", shade: "#947463", bulb: "#fff0e6", light: "0.15", btnBg: "#f97316", btnText: "#fff", awake: true },
];

/* Pull-string feel: how far the cord can stretch, and how far you must pull to click it. */
const MAX_PULL = 60;
const TRIGGER_PULL = 24;

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [lampIndex, setLampIndex] = useState(0);

  // Cord stretch in SVG units — driven by the pointer while dragging, by a spring on release.
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ startY: number; pull: number; moved: boolean } | null>(null);
  const rafRef = useRef<number | null>(null);

  const lamp = LAMP_STATES[lampIndex];

  const toggleLamp = () => setLampIndex((i) => (i + 1) % LAMP_STATES.length);

  // Damped oscillation back to rest, so the cord recoils instead of snapping.
  const springBack = (from: number) => {
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 700;
      if (t >= 1) {
        setPull(0);
        rafRef.current = null;
        return;
      }
      setPull(from * Math.exp(-8 * t) * Math.cos(14 * t));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    dragRef.current = { startY: e.clientY, pull: 0, moved: false };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;

    const move = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      // Screen pixels → SVG units, so the handle tracks the pointer exactly.
      const rect = svgRef.current?.getBoundingClientRect();
      const scale = rect ? rect.height / 450 : 1;
      const next = Math.max(0, Math.min(MAX_PULL, (e.clientY - drag.startY) / scale));
      if (next > 3) drag.moved = true;
      drag.pull = next;
      setPull(next);
    };

    const end = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      setDragging(false);
      if (!drag) return;
      // Pulled far enough, or tapped without dragging at all.
      if (drag.pull >= TRIGGER_PULL || !drag.moved) toggleLamp();
      springBack(drag.pull);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [dragging]);

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

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

  const themeVars = {
    "--theme-color": lamp.themeColor,
    "--theme-glow-rgb": lamp.glow,
    "--shade-color": lamp.shade,
    "--bulb-color": lamp.bulb,
    "--light-opacity": lamp.light,
    "--btn-bg": lamp.btnBg,
    "--btn-text-color": lamp.btnText,
  } as React.CSSProperties;

  return (
    <div className="lamp-login" style={themeVars}>
      <div className="container">
        <div className="lamp-section">
          <div className="lamp-ambient-glow" />
          <svg ref={svgRef} className="lamp-svg" viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lightConeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>
              <clipPath id="mouthClip">
                <path d="M 125 155 Q 150 190 175 155 Z" />
              </clipPath>
            </defs>

            <polygon points="90,180 210,180 320,450 -20,450" fill="url(#lightConeGrad)" className="light-cone" />
            <ellipse cx="150" cy="400" rx="60" ry="15" fill="#151515" />
            <ellipse cx="150" cy="395" rx="60" ry="15" fill="#3a3c40" />
            <rect x="140" y="180" width="20" height="220" fill="#2a2c30" />
            <rect x="142" y="180" width="8" height="220" fill="#4a4c50" />
            <ellipse cx="150" cy="175" rx="90" ry="20" className="shade-inner" />

            <g
              className={`pull-string-group${dragging ? " dragging" : ""}`}
              onPointerDown={startDrag}
              role="button"
              aria-label="Pull the lamp cord"
            >
              {/* Fat invisible cord so it's easy to grab */}
              <line x1="105" y1="180" x2="105" y2={310 + pull} stroke="rgba(0,0,0,0)" strokeWidth="30" strokeLinecap="round" pointerEvents="stroke" />
              <line x1="105" y1="180" x2="105" y2={280 + pull} stroke="#555" strokeWidth="3" />
              <line x1="105" y1={280 + pull} x2="105" y2={310 + pull} stroke="#888" strokeWidth="6" strokeLinecap="round" className="string-handle" />
            </g>

            <path d="M 95 60 Q 150 45 205 60 L 240 175 Q 150 195 60 175 Z" className="shade-main" />

            <g className="face-sleep" style={{ opacity: lamp.awake ? 0 : 1 }}>
              <path d="M 115 130 Q 125 140 135 130" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M 165 130 Q 175 140 185 130" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />
            </g>

            <g className="face-awake" style={{ opacity: lamp.awake ? 1 : 0 }}>
              <path d="M 115 130 Q 125 115 135 130" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />
              <path d="M 165 130 Q 175 115 185 130" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />
              <g>
                <path d="M 125 155 Q 150 190 175 155 Z" fill="#111" />
                <path d="M 140 165 Q 150 190 160 165 Z" fill="#f87171" clipPath="url(#mouthClip)" />
              </g>
            </g>
          </svg>
        </div>

        <div className="login-section">
          <div className="login-card">
            <h2>Welcome Back</h2>
            <p className="sub">Admin Panel</p>
            <form onSubmit={submit}>
              <div className="input-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {err && <div className="err">{err}</div>}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "Signing in…" : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
