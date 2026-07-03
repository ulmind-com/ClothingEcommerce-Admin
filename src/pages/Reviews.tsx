import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

type Review = {
  id: string;
  product_id: string;
  product_title: string;
  user_name: string;
  rating: number;
  title?: string;
  text?: string;
  photos?: string[];
  tags?: string[];
  helpful_count?: number;
  unhelpful_count?: number;
  created_at: string;
};

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" style={{ display: "inline-block" }}
      fill={filled ? "#F5A623" : "none"} stroke="#F5A623" strokeWidth="1.6"
      strokeLinejoin="round">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18.9 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <span style={{ whiteSpace: "nowrap", display: "inline-flex", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={value >= n} />
      ))}
    </span>
  );
}

// Minimal inline icons (no emojis)
const ThumbUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3BB54A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3zm0 0l4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 16.8 20H7" />
  </svg>
);
const ThumbDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E23744" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 13V4h3a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-3zm0 0l-4 8a2 2 0 0 1-2-2v-4H6a2 2 0 0 1-2-2.3l1.2-6A2 2 0 0 1 7.2 4H17" />
  </svg>
);

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<string>("");
  const [minStars, setMinStars] = useState<number>(0);

  useEffect(() => {
    api
      .get<Review[]>("/reviews/admin/all")
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, []);

  const products = useMemo(() => {
    const map = new Map<string, string>();
    reviews.forEach((r) => map.set(r.product_id, r.product_title));
    return [...map.entries()];
  }, [reviews]);

  const filtered = reviews.filter(
    (r) => (!product || r.product_id === product) && (!minStars || r.rating >= minStars)
  );

  const avg = filtered.length
    ? (filtered.reduce((s, r) => s + r.rating, 0) / filtered.length).toFixed(1)
    : "0.0";

  return (
    <>
      <h1>Customer Reviews</h1>

      <div className="card" style={{ display: "flex", gap: 28, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div className="muted">Total reviews</div>
          <div style={{ fontSize: 26, fontWeight: 700 }}>{reviews.length}</div>
        </div>
        <div>
          <div className="muted">Average rating</div>
          <div style={{ fontSize: 26, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            {avg} <Stars value={parseFloat(avg)} />
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <select value={product} onChange={(e) => setProduct(e.target.value)}>
            <option value="">All products</option>
            {products.map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>
          <select value={minStars} onChange={(e) => setMinStars(Number(e.target.value))}>
            <option value={0}>All ratings</option>
            {[5, 4, 3, 2, 1].map((s) => (
              <option key={s} value={s}>{s} stars & up</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Photos</th>
              <th>Helpful</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ maxWidth: 160 }}>{r.product_title}</td>
                <td>{r.user_name}</td>
                <td><Stars value={r.rating} /></td>
                <td style={{ maxWidth: 320 }}>
                  {r.title && <div style={{ fontWeight: 600 }}>{r.title}</div>}
                  {r.text && <div className="muted" style={{ fontSize: 13 }}>{r.text}</div>}
                  {!!r.tags?.length && (
                    <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {r.tags.map((t) => (
                        <span key={t} className="pill" style={{ background: "#FFF3EB", color: "#F26A21" }}>{t}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(r.photos || []).slice(0, 3).map((p, i) => (
                      <a key={i} href={p} target="_blank" rel="noreferrer">
                        <img className="thumb" src={p} style={{ width: 40, height: 40, objectFit: "cover" }} />
                      </a>
                    ))}
                    {!r.photos?.length && <span className="muted">—</span>}
                  </div>
                </td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 10 }}>
                    <ThumbUp /> {r.helpful_count || 0}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <ThumbDown /> {r.unhelpful_count || 0}
                  </span>
                </td>
                <td className="muted">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="muted">No reviews yet.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={7} className="muted">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
