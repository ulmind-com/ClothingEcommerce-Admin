import { useEffect, useMemo, useRef, useState } from "react";
import { api, uploadImage, uploadVideo } from "../api";

interface SectionSpec {
  key: string;
  label: string;
  kind: "image" | "video";
  slots: number;
  aspect: string;
  description: string;
  captions: boolean;
}

interface MediaItem {
  id: string;
  section: string;
  url: string;
  poster: string | null;
  title: string;
  subtitle: string;
  order: number;
  active: boolean;
}

export default function Media() {
  const [sections, setSections] = useState<SectionSpec[]>([]);
  const [active, setActive] = useState<string>("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const dragId = useRef<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const spec = useMemo(
    () => sections.find((s) => s.key === active),
    [sections, active],
  );
  const sectionItems = useMemo(
    () => items.filter((i) => i.section === active).sort((a, b) => a.order - b.order),
    [items, active],
  );

  useEffect(() => {
    (async () => {
      try {
        const [specs, media] = await Promise.all([
          api.get<SectionSpec[]>("/site-media/sections"),
          api.get<MediaItem[]>("/site-media/admin"),
        ]);
        setSections(specs);
        setItems(media);
        setActive((a) => a || specs[0]?.key || "");
      } catch (e: any) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function refresh() {
    setItems(await api.get<MediaItem[]>("/site-media/admin"));
  }

  async function handleFiles(files: FileList | File[]) {
    if (!spec) return;
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    setErr("");
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        setProgress(`Uploading ${i + 1} of ${list.length} — ${file.name}`);

        const isVideo = file.type.startsWith("video/");
        if (spec.kind === "video" && !isVideo) {
          throw new Error(`${file.name} is not a video`);
        }
        if (spec.kind === "image" && !file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image`);
        }

        if (spec.kind === "video") {
          const up = await uploadVideo(file);
          await api.post("/site-media", {
            section: spec.key,
            url: up.url,
            poster: up.poster,
          });
        } else {
          const url = await uploadImage(file);
          await api.post("/site-media", { section: spec.key, url });
        }
      }
      await refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
      setProgress("");
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function patch(id: string, body: Partial<MediaItem>) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...body } as MediaItem : i)),
    );
    try {
      await api.patch(`/site-media/${id}`, body);
    } catch (e: any) {
      setErr(e.message);
      refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this from the section? The file stays in Cloudinary."))
      return;
    try {
      await api.del(`/site-media/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) {
      setErr(e.message);
    }
  }

  async function onDrop(targetId: string) {
    const sourceId = dragId.current;
    dragId.current = null;
    if (!sourceId || sourceId === targetId) return;

    const ordered = [...sectionItems];
    const from = ordered.findIndex((i) => i.id === sourceId);
    const to = ordered.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);

    // Optimistic: renumber locally, then persist the whole order.
    setItems((prev) =>
      prev.map((i) => {
        const idx = ordered.findIndex((o) => o.id === i.id);
        return idx >= 0 ? { ...i, order: idx } : i;
      }),
    );
    try {
      await api.put("/site-media/order", { ids: ordered.map((i) => i.id) });
    } catch (e: any) {
      setErr(e.message);
      refresh();
    }
  }

  if (loading) return <p className="muted">Loading…</p>;

  const liveCount = sectionItems.filter((i) => i.active).length;

  return (
    <>
      <div className="between">
        <div>
          <h1>Media</h1>
          <p className="muted">
            Photos and clips for the storefront's editorial sections.
          </p>
        </div>
      </div>

      {err && <div className="err">{err}</div>}

      <div className="media-shell">
        {/* Section rail */}
        <nav className="media-rail">
          {sections.map((s) => {
            const count = items.filter(
              (i) => i.section === s.key && i.active,
            ).length;
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className={`media-tab ${active === s.key ? "on" : ""}`}
              >
                <span className="media-tab-top">
                  <span className="media-tab-label">{s.label}</span>
                  <span className={`kindpill ${s.kind}`}>{s.kind}</span>
                </span>
                <span className="media-tab-meta">
                  {count} of {s.slots} slots filled
                </span>
                <span className="media-bar">
                  <span
                    style={{
                      width: `${Math.min(100, (count / s.slots) * 100)}%`,
                    }}
                  />
                </span>
              </button>
            );
          })}
        </nav>

        {/* Section detail */}
        <section className="media-body">
          {spec && (
            <>
              <header className="media-head">
                <div>
                  <h2>{spec.label}</h2>
                  <p className="muted">{spec.description}</p>
                </div>
                <div className="media-spec">
                  <span className="kv-chip">{spec.aspect}</span>
                  <span className="kv-chip">
                    {liveCount}/{spec.slots} live
                  </span>
                </div>
              </header>

              {liveCount < spec.slots && (
                <p className="media-hint">
                  This section shows {spec.slots}. The remaining{" "}
                  {spec.slots - liveCount} fall back to the bundled artwork
                  until you upload replacements.
                </p>
              )}

              {/* Dropzone */}
              <label
                className={`dropzone ${dragOver ? "over" : ""} ${busy ? "busy" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.length)
                    handleFiles(e.dataTransfer.files);
                }}
              >
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept={spec.kind === "video" ? "video/*" : "image/*"}
                  hidden
                  disabled={busy}
                  onChange={(e) =>
                    e.target.files && handleFiles(e.target.files)
                  }
                />
                {busy ? (
                  <>
                    <span className="spinner" />
                    <span className="drop-title">{progress}</span>
                    <span className="muted">
                      Large clips take a moment to transcode.
                    </span>
                  </>
                ) : (
                  <>
                    <span className="drop-icon">
                      {spec.kind === "video" ? "▶" : "◳"}
                    </span>
                    <span className="drop-title">
                      Drop {spec.kind === "video" ? "clips" : "photos"} here, or
                      click to browse
                    </span>
                    <span className="muted">
                      {spec.aspect} works best · multiple files allowed
                    </span>
                  </>
                )}
              </label>

              {/* Grid */}
              {sectionItems.length === 0 ? (
                <p className="muted media-empty">
                  Nothing uploaded for this section yet.
                </p>
              ) : (
                <div className="media-grid">
                  {sectionItems.map((item, idx) => (
                    <article
                      key={item.id}
                      draggable
                      onDragStart={() => (dragId.current = item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => onDrop(item.id)}
                      className={`media-card ${item.active ? "" : "off"}`}
                    >
                      <div className="media-thumb">
                        {spec.kind === "video" ? (
                          <video
                            src={item.url}
                            poster={item.poster ?? undefined}
                            muted
                            loop
                            playsInline
                            onMouseEnter={(e) =>
                              (e.currentTarget as HTMLVideoElement).play()
                            }
                            onMouseLeave={(e) => {
                              const v = e.currentTarget as HTMLVideoElement;
                              v.pause();
                              v.currentTime = 0;
                            }}
                          />
                        ) : (
                          <img src={item.url} alt="" />
                        )}
                        <span className="media-index">{idx + 1}</span>
                        {idx >= spec.slots && (
                          <span className="media-overflow">
                            beyond {spec.slots}
                          </span>
                        )}
                      </div>

                      {spec.captions && (
                        <div className="media-fields">
                          <input
                            value={item.title}
                            placeholder="Title"
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id
                                    ? { ...i, title: e.target.value }
                                    : i,
                                ),
                              )
                            }
                            onBlur={(e) =>
                              patch(item.id, { title: e.target.value })
                            }
                          />
                          <input
                            value={item.subtitle}
                            placeholder="Subtitle"
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((i) =>
                                  i.id === item.id
                                    ? { ...i, subtitle: e.target.value }
                                    : i,
                                ),
                              )
                            }
                            onBlur={(e) =>
                              patch(item.id, { subtitle: e.target.value })
                            }
                          />
                        </div>
                      )}

                      <footer className="media-actions">
                        <button
                          className={`toggle ${item.active ? "on" : ""}`}
                          onClick={() =>
                            patch(item.id, { active: !item.active })
                          }
                        >
                          {item.active ? "Live" : "Hidden"}
                        </button>
                        <button
                          className="btn danger sm"
                          onClick={() => remove(item.id)}
                        >
                          Remove
                        </button>
                      </footer>
                    </article>
                  ))}
                </div>
              )}

              {sectionItems.length > 1 && (
                <p className="muted media-empty">
                  Drag a card onto another to reorder — position sets the order
                  on the storefront.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}
