import { useEffect, useRef, useState } from "react";
import { api } from "../api";

declare const L: any; // Leaflet loaded via CDN

export default function Settings() {
  const [s, setS] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [mapSearch, setMapSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [cancelUnit, setCancelUnit] = useState<"hours" | "days">("hours");

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => { api.get("/settings").then(setS).catch((e) => setErr(e.message)); }, []);

  // Initialize Leaflet map once settings are loaded
  useEffect(() => {
    if (!s || !mapRef.current || leafletMap.current) return;

    const lat = s.shop.lat || 22.0667;
    const lng = s.shop.lng || 88.0698;

    const map = L.map(mapRef.current).setView([lat, lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
    markerRef.current = marker;

    // When marker is dragged, update lat/lng
    marker.on("dragend", () => {
      const pos = marker.getLatLng();
      setS((p: any) => ({
        ...p,
        shop: { ...p.shop, lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) },
      }));
    });

    // Click on map to move marker
    map.on("click", (e: any) => {
      marker.setLatLng(e.latlng);
      map.panTo(e.latlng);
      setS((p: any) => ({
        ...p,
        shop: { ...p.shop, lat: parseFloat(e.latlng.lat.toFixed(6)), lng: parseFloat(e.latlng.lng.toFixed(6)) },
      }));
    });

    leafletMap.current = map;

    // Fix map rendering issues
    setTimeout(() => map.invalidateSize(), 200);
  }, [s]);

  // Update marker when lat/lng change from manual input
  useEffect(() => {
    if (!markerRef.current || !leafletMap.current || !s) return;
    const lat = Number(s.shop.lat);
    const lng = Number(s.shop.lng);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMap.current.setView([lat, lng], leafletMap.current.getZoom());
    }
  }, [s?.shop?.lat, s?.shop?.lng]);

  // Search places using Nominatim (OpenStreetMap free geocoding)
  const handleMapSearch = (query: string) => {
    setMapSearch(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setSearchResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
        );
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectPlace = (place: any) => {
    const lat = parseFloat(parseFloat(place.lat).toFixed(6));
    const lng = parseFloat(parseFloat(place.lon).toFixed(6));
    setS((p: any) => ({
      ...p,
      shop: { ...p.shop, lat, lng, address: place.display_name },
    }));
    if (markerRef.current && leafletMap.current) {
      markerRef.current.setLatLng([lat, lng]);
      leafletMap.current.setView([lat, lng], 16);
    }
    setMapSearch("");
    setSearchResults([]);
  };

  if (!s) return <p className="muted">Loading…</p>;

  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }));
  const setShop = (k: string, v: any) => setS((p: any) => ({ ...p, shop: { ...p.shop, [k]: v } }));
  const setDel = (k: string, v: any) => setS((p: any) => ({ ...p, delivery: { ...p.delivery, [k]: v } }));

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setShop("lat", lat);
        setShop("lng", lng);
        if (markerRef.current && leafletMap.current) {
          markerRef.current.setLatLng([lat, lng]);
          leafletMap.current.setView([lat, lng], 16);
        }
      },
      () => alert("Could not get location")
    );
  };

  const save = async () => {
    setErr(""); setSaved(false);
    try {
      const body = {
        currency: s.currency, currency_code: s.currency_code,
        cancel_window_hours: Number(s.cancel_window_hours ?? 24),
        return_window_days: Number(s.return_window_days ?? 7),
        shop: {
          ...s.shop,
          lat: s.shop.lat === "" ? null : Number(s.shop.lat),
          lng: s.shop.lng === "" ? null : Number(s.shop.lng),
        },
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
        </div>
        <p className="muted" style={{ marginTop: 4 }}>GST is set per product (CGST / SGST / IGST) in the product editor.</p>

        <div className="row" style={{ marginTop: 4 }}>
          <div>
            <label>Order cancellation window</label>
            <input
              type="number"
              min={0}
              value={cancelUnit === "days" ? Number(s.cancel_window_hours ?? 24) / 24 : Number(s.cancel_window_hours ?? 24)}
              onChange={(e) => set("cancel_window_hours", (Number(e.target.value) || 0) * (cancelUnit === "days" ? 24 : 1))}
            />
          </div>
          <div>
            <label>Unit</label>
            <select value={cancelUnit} onChange={(e) => setCancelUnit(e.target.value as "hours" | "days")}>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </div>
        <p className="muted" style={{ marginTop: 4 }}>
          Customers can cancel an order within this time of placing it (before it ships). Set to 0 to disable cancellation. Currently: {Number(s.cancel_window_hours ?? 24) === 0 ? "disabled" : `${Number(s.cancel_window_hours ?? 24)} hour(s)`}.
        </p>

        <div className="row" style={{ marginTop: 4 }}>
          <div>
            <label>Return / exchange window (days)</label>
            <input type="number" min={0} value={Number(s.return_window_days ?? 7)} onChange={(e) => set("return_window_days", Number(e.target.value) || 0)} />
          </div>
          <div style={{ flex: 1 }} />
        </div>
        <p className="muted" style={{ marginTop: 4 }}>
          Customers can request a return/exchange within this many days of delivery. Set to 0 to disable returns.
        </p>
      </div>

      <div className="card">
        <div className="between"><h3 style={{ margin: 0 }}>Shop location</h3>
          <button className="btn ghost sm" onClick={useMyLocation}>📍 Use my current location</button></div>

        <div className="row">
          <div style={{ flex: 2 }}><label>Shop name</label><input value={s.shop.name || ""} onChange={(e) => setShop("name", e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Phone number</label><input type="tel" value={s.shop.phone || ""} placeholder="+91 XXXXX XXXXX" onChange={(e) => setShop("phone", e.target.value)} /></div>
          <div style={{ flex: 1 }}><label>Support email</label><input type="email" value={s.shop.email || ""} placeholder="support@store.com" onChange={(e) => setShop("email", e.target.value)} /></div>
        </div>

        <div className="row">
          <div style={{ flex: 1 }}>
            <label>State</label>
            <input value={s.shop.state || ""} placeholder="West Bengal" onChange={(e) => setShop("state", e.target.value)} />
          </div>
          <div style={{ flex: 1 }} />
        </div>

        <label>Address</label>
        <input value={s.shop.address || ""} onChange={(e) => setShop("address", e.target.value)} />

        {/* Map with search */}
        <div style={{ marginTop: 16, position: "relative" }}>
          <label>Search location on map</label>
          <input
            value={mapSearch}
            onChange={(e) => handleMapSearch(e.target.value)}
            placeholder="Search for a place, city, or address..."
            style={{ marginBottom: 0 }}
          />
          {/* Search results dropdown */}
          {searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 1000,
              background: "#1e1e2e", border: "1px solid #333", borderRadius: 8,
              maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,.4)"
            }}>
              {searchResults.map((p: any, i: number) => (
                <div
                  key={i}
                  onClick={() => selectPlace(p)}
                  style={{
                    padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid #2a2a3a",
                    fontSize: 13, color: "#ccc",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a3a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  📍 {p.display_name}
                </div>
              ))}
            </div>
          )}
          {searching && <p className="muted" style={{ margin: "4px 0" }}>Searching...</p>}
        </div>

        {/* Leaflet map */}
        <div
          ref={mapRef}
          style={{
            width: "100%", height: 350, borderRadius: 12, marginTop: 12,
            border: "2px solid #333", overflow: "hidden",
          }}
        />

        <div className="row" style={{ marginTop: 12 }}>
          <div><label>Latitude</label><input type="number" value={s.shop.lat ?? ""} onChange={(e) => setShop("lat", e.target.value)} /></div>
          <div><label>Longitude</label><input type="number" value={s.shop.lng ?? ""} onChange={(e) => setShop("lng", e.target.value)} /></div>
        </div>
        <p className="muted">Click on the map or drag the marker to set location. Lat/Lng update automatically.</p>
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
          Example: within {s.delivery.free_radius_km} km → free. Beyond that → ₹{s.delivery.base_fee} + ₹{s.delivery.per_km_rate} × total km
          (e.g. 10 km → ₹{Number(s.delivery.base_fee) + Number(s.delivery.per_km_rate) * 10}). Orders above ₹{s.delivery.free_above} ship free. No delivery beyond {s.delivery.max_service_km} km.
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
