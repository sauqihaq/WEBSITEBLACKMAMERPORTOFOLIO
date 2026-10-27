"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Media = {
  id: string;
  name: string;
  url: string | null;
  private: boolean;
  contentType: string;
  size: number;
};
export function MediaPicker({
  privateFiles = false,
  selected,
  onChange,
}: {
  privateFiles?: boolean;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [items, setItems] = useState<Media[]>([]);
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    fetch("/api/admin/media")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setNotice(d.error);
        else setItems(d.media);
      })
      .catch(() => setNotice("Media belum dapat dimuat."));
  }, [refresh]);
  const available = items.filter((m) => m.private === privateFiles);
  return (
    <div className="panel">
      <label>
        {privateFiles ? "Pilih file produk privat" : "Pilih dari media library"}
      </label>
      {privateFiles ? (
        available.map((m) => (
          <label
            key={m.id}
            style={{
              flexDirection: "row",
              alignItems: "center",
              margin: "12px 0",
            }}
          >
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, m.id]
                    : selected.filter((id) => id !== m.id),
                )
              }
            />
            {m.name} · {(m.size / 1048576).toFixed(1)} MB
          </label>
        ))
      ) : (
        <select
          aria-label="Choose public media"
          value={selected[0] || ""}
          onChange={(e) => onChange([e.target.value])}
        >
          <option value="">Pilih media…</option>
          {available.map((m) => (
            <option key={m.id} value={m.url || ""}>
              {m.name}
            </option>
          ))}
        </select>
      )}
      <div className="editor-actions" style={{ marginTop: 15 }}>
        <Link href="/admin/media" target="_blank" className="text-link">
          Upload media ↗
        </Link>
        <button type="button" onClick={() => setRefresh(refresh + 1)}>
          Refresh library
        </button>
      </div>
      {!available.length && <p className="tiny">Belum ada media yang cocok.</p>}
      <p role="status">{notice}</p>
    </div>
  );
}
