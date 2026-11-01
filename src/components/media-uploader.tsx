"use client";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { isVideoUrl } from "./cover-media";

export type MediaItem = {
  url: string;
  type: "image" | "video";
  caption?: string;
};
const ACCEPT = ".png,.jpg,.jpeg,.webp,.avif,.mp4,.webm";
const OK = /\.(png|jpg|jpeg|webp|avif|mp4|webm)$/i;
const kind = (url: string): "image" | "video" =>
  isVideoUrl(url) ? "video" : "image";

export function MediaUploader({
  items,
  onChange,
}: {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [url, setUrl] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function send(files: FileList | File[] | null) {
    if (!files || busy) return;
    const list = Array.from(files);
    if (!list.length) return;
    setBusy(true);
    setNotice("");
    let current = [...items];
    try {
      for (const file of list) {
        if (!OK.test(file.name))
          throw new Error(
            file.name + ": format harus PNG, JPG, WEBP, AVIF, MP4, atau WEBM.",
          );
        setProgress(0);
        const blob = await upload(
          "portfolio/" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_"),
          file,
          {
            access: "public",
            handleUploadUrl: "/api/upload",
            multipart: file.size > 5 * 1024 * 1024,
            onUploadProgress: ({ percentage }) =>
              setProgress(Math.round(percentage)),
          },
        );
        current = [...current, { url: blob.url, type: kind(blob.url) }];
        onChange(current);
      }
      setNotice("Upload selesai.");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
      setProgress(0);
      if (input.current) input.current.value = "";
    }
  }
  function move(i: number, dir: -1 | 1) {
    const a = [...items];
    [a[i + dir], a[i]] = [a[i], a[i + dir]];
    onChange(a);
  }
  function addUrl() {
    const u = url.trim();
    if (!/^https:\/\//.test(u)) {
      setNotice("URL harus diawali https://");
      return;
    }
    onChange([...items, { url: u, type: kind(u) }]);
    setUrl("");
    setNotice("");
  }
  return (
    <div className="media-uploader">
      <label>
        Media (foto / video) — geser urutan, yang pertama jadi cover
      </label>
      <div
        className="mu-drop"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void send(e.dataTransfer.files);
        }}
      >
        <p>
          {busy
            ? "Mengunggah… " + progress + "%"
            : "Tarik file ke sini, atau pilih dari komputer lo"}
        </p>
        <button
          type="button"
          className="button outline"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          Pilih file…
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          hidden
          onChange={(e) => void send(e.target.files)}
        />
        {busy && <progress value={progress} max={100} />}
      </div>
      {items.length > 0 && (
        <div className="mu-grid">
          {items.map((m, i) => (
            <div className="mu-item" key={m.url + i}>
              {m.type === "video" || isVideoUrl(m.url) ? (
                <video src={m.url} muted preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.url} alt={"Media " + (i + 1)} />
              )}
              {i === 0 && <span className="mu-badge">COVER</span>}
              <div className="mu-actions">
                <button
                  type="button"
                  aria-label="Geser ke kiri"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label="Geser ke kanan"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  →
                </button>
                <button
                  type="button"
                  aria-label="Hapus media"
                  onClick={() => onChange(items.filter((_, n) => n !== i))}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <details style={{ marginTop: 10 }}>
        <summary>Atau tambah lewat URL (https)</summary>
        <div className="editor-actions" style={{ marginTop: 10 }}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
          <button type="button" onClick={addUrl}>
            Tambah
          </button>
        </div>
      </details>
      <p role="status" className="form-status">
        {notice}
      </p>
    </div>
  );
}
