import { useEffect, useState } from "react";
import { api } from "../api";

export default function Settings() {
  const [s, setS] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { api.get("/settings").then(setS).catch((e) => setErr(e.message)); }, []);
  if (!s) return <p className="muted">Loading…</p>;

  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }));
  const setShop = (k: string, v: any) => setS((p: any) => ({ ...p, shop: { ...p.shop, [k]: v } }));
  const setDel = (k: string, v: any) => setS((p: any) => ({ ...p, delivery: { ...p.delivery, [k]: v } }));

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => { setShop("lat", pos.coords.latitude); setShop("lng", pos.coords.longitude); },
      () => alert("Could not get location")
    );
  };

  const save = async () => {
    setErr(""); setSaved(false);
    try {
      const body = {
        currency: s.currency, currency_code: s.currency_code, tax_rate: Number(s.tax_rate),
        shop: { ...s.shop, lat: s.shop.lat === "" ? null : Number(s.shop.lat), lng: s.shop.lng === "" ? null : Number(s.shop.lng) },
        delivery: {
          free_radius_km: Number(s.delivery.free_radius_km), per_km_rate: Number(s.delivery.per_km_rate),
          base_fee: Number(s.delivery.base_fee), free_above: Number(s.delivery.free_above),
          max_service_km: Number(s.delivery.max_service_km), slabs: s.delivery.slabs || [],
        },
      };
      const res = await api.put("/settings", body);
      setS(res); setSaved(true);
    } catch (e: any) { setErr(e.message); }
  };

  return (
    <>
      <h1>Settings</h1>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Store</h3>
        <div className="row">
          <div><label>Currency symbol</label><input value={s.currency} onChange={(e) => set("currency", e.target.value)} /></div>
          <div><label>Currency code</label><input value={s.currency_code} onChange={(e) => set("currency_code", e.target.value)} /></div>
          <div><label>Tax rate (e.g. 0.05 = 5%)</label><input type="number" step="0.01" value={s.tax_rate} onChange={(e) => set("tax_rate", e.target.value)} /></div>
        </div>
      </div>

      <div className="card">
        <div className="between"><h3 style={{ margin: 0 }}>Shop location</h3>
          <button className="btn ghost sm" onClick={useMyLocation}>Use my current location</button></div>
        <label>Shop name</label>
        <input value={s.shop.name || ""} onChange={(e) => setShop("name", e.target.value)} />
        <label>Address</label>
        <input value={s.shop.address || ""} onChange={(e) => setShop("address", e.target.value)} />
        <div className="row">
          <div><label>Latitude</label><input type="number" value={s.shop.lat ?? ""} onChange={(e) => setShop("lat", e.target.value)} /></div>
          <div><label>Longitude</label><input type="number" value={s.shop.lng ?? ""} onChange={(e) => setShop("lng", e.target.value)} /></div>
        </div>
        <p className="muted">Delivery fee is auto-calculated from the distance between this shop location and the customer's delivery address.</p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Delivery rules</h3>
        <div className="row">
          <div><label>Free radius (km)</label><input type="number" value={s.delivery.free_radius_km} onChange={(e) => setDel("free_radius_km", e.target.value)} /></div>
          <div><label>Rate per km (beyond free radius)</label><input type="number" value={s.delivery.per_km_rate} onChange={(e) => setDel("per_km_rate", e.target.value)} /></div>
        </div>
        <div className="row">
          <div><label>Base fee (beyond free radius)</label><input type="number" value={s.delivery.base_fee} onChange={(e) => setDel("base_fee", e.target.value)} /></div>
          <div><label>Free delivery above order value</label><input type="number" value={s.delivery.free_above} onChange={(e) => setDel("free_above", e.target.value)} /></div>
          <div><label>Max serviceable distance (km)</label><input type="number" value={s.delivery.max_service_km} onChange={(e) => setDel("max_service_km", e.target.value)} /></div>
        </div>
        <p className="muted">
          Example: within {s.delivery.free_radius_km} km → free. Beyond that → ₹{s.delivery.base_fee} + ₹{s.delivery.per_km_rate}/km.
          Orders above ₹{s.delivery.free_above} ship free. No delivery beyond {s.delivery.max_service_km} km.
        </p>
      </div>

      {err && <div className="err">{err}</div>}
      <div className="flex">
        <button className="btn" onClick={save}>Save settings</button>
        {saved && <span style={{ color: "#2fae5f", fontWeight: 600 }}>Saved ✓</span>}
      </div>
    </>
  );
}
