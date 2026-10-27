"use client";
import Link from "next/link";
import { MediaPicker } from "./media-picker";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Box,
  Image as ImageIcon,
  ShoppingBag,
  Users,
  Ticket,
  MessageSquare,
  Settings,
  FileText,
  Layers,
  Mail,
  Shield,
  Activity,
  Plus,
  ArrowUpRight,
  Upload,
  Search,
} from "lucide-react";
import { upload } from "@vercel/blob/client";
import { api, money } from "./site";
import { Logout } from "./forms";
export const adminModules = [
  ["", "Overview", LayoutDashboard],
  ["portfolio", "Portfolio", Box],
  ["products", "Products", ShoppingBag],
  ["categories", "Categories & tags", Layers],
  ["media", "Media library", ImageIcon],
  ["orders", "Orders", ShoppingBag],
  ["customers", "Customers", Users],
  ["coupons", "Coupons", Ticket],
  ["reviews", "Reviews", MessageSquare],
  ["commissions", "Commissions", FileText],
  ["messages", "Messages", Mail],
  ["services", "Services", Layers],
  ["blog", "Journal", FileText],
  ["pages", "Pages & policies", FileText],
  ["homepage", "Homepage builder", LayoutDashboard],
  ["settings", "Brand & settings", Settings],
  ["analytics", "Analytics", Activity],
  ["security", "Account & security", Shield],
  ["audit-logs", "Audit log", Activity],
] as const;
export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string;
}) {
  const path = usePathname();
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            B<span>✦</span>
          </span>
          <span>
            BLACKMAMER<small>STUDIO CONTROL ROOM</small>
          </span>
        </Link>
        <span className="eyebrow">WORKSPACE</span>
        <nav>
          {adminModules.map(([slug, name, Icon]) => (
            <Link
              className={
                path === "/admin" + (slug ? "/" + slug : "") ? "active" : ""
              }
              key={slug}
              href={"/admin" + (slug ? "/" + slug : "")}
            >
              <Icon size={15} />
              {name}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="admin-main">
        <div className="admin-top">
          <span>STUDIO / MANAGEMENT</span>
          <span>
            {email} <span className="red">●</span>
          </span>
          <Link href="/">View website ↗</Link>
          <Logout />
        </div>
        {children}
      </div>
    </div>
  );
}
type Row = Record<string, unknown>;
const defaultProject = {
  title: "",
  slug: "",
  description: "",
  category: "",
  cover: "",
  tags: [],
  media: [],
  modelUrl: "",
  featured: false,
  status: "DRAFT",
  sortOrder: 0,
  details: {},
};
const defaultProduct = {
  ...defaultProject,
  sku: "",
  specifications: {},
  prices: [
    {
      license: "Personal",
      amount: 0,
      terms: "Untuk penggunaan pribadi; dilarang mendistribusikan file sumber.",
    },
  ],
  fileIds: [],
};
const defaults: Record<string, Row> = {
  portfolio: defaultProject,
  products: defaultProduct,
  categories: { name: "", slug: "", kind: "portfolio" },
  coupons: {
    code: "",
    type: "PERCENT",
    value: 10,
    minimum: 0,
    maxUses: null,
    expiresAt: null,
    active: true,
    productIds: [],
  },
  services: {
    title: "",
    slug: "",
    description: "",
    cover: "",
    status: "DRAFT",
    sortOrder: 0,
    details: {},
  },
  blog: {
    title: "",
    slug: "",
    description: "",
    cover: "",
    status: "DRAFT",
    sortOrder: 0,
    details: {},
  },
  pages: {
    title: "",
    slug: "",
    description: "",
    cover: "",
    status: "DRAFT",
    sortOrder: 0,
    details: {},
  },
  messages: { status: "READ", notes: "" },
  commissions: { status: "IN_PROGRESS", notes: "" },
  reviews: { approved: false },
};
const labelMap: Record<string, string> = {
  title: "Judul",
  slug: "URL slug",
  description: "Deskripsi",
  category: "Kategori",
  cover: "Cover image URL",
  tags: "Tags (pisahkan dengan koma)",
  modelUrl: "GLB preview URL",
  featured: "Tampilkan sebagai featured",
  sortOrder: "Urutan tampil",
  sku: "SKU",
  status: "Status",
  name: "Nama",
  kind: "Jenis",
  code: "Kode kupon",
  type: "Jenis diskon",
  value: "Nilai diskon",
  minimum: "Minimum order (IDR)",
  maxUses: "Batas penggunaan",
  expiresAt: "Tanggal kedaluwarsa",
  active: "Aktif",
  productIds: "Berlaku untuk product IDs (kosong = semua)",
  notes: "Catatan internal",
  approved: "Setujui review",
  brand: "Brand name",
  artist: "Nama besar di hero",
  tagline: "Profesi / tagline",
  intro: "Intro hero",
  email: "Email kontak",
  whatsapp: "Nomor WhatsApp",
  location: "Lokasi",
  accent: "Warna aksen",
  heroImage: "Foto utama URL",
  heroMode: "Mode hero",
  heroVideo: "Video hero URL",
  heroModel: "Model hero GLB URL",
  about: "Tentang studio",
  availability: "Terbuka untuk kolaborasi",
  skills: "Software & skills (pisahkan dengan koma)",
  sections: "Urutan section homepage",
  theme: "Tema",
  radius: "Radius sudut (px)",
  motion: "Animasi aktif",
};
const selectOptions: Record<string, string[]> = {
  status: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  kind: ["portfolio", "products", "blog"],
  type: ["PERCENT", "FIXED"],
  heroMode: ["image", "video", "model", "gradient"],
  theme: ["dark", "light"],
};
export function AdminTable({ module, rows }: { module: string; rows: Row[] }) {
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<Row | null>(null);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const canCreate =
    Object.keys(defaults).includes(module) &&
    !["messages", "commissions", "reviews"].includes(module);
  const filtered = rows.filter((row) =>
    JSON.stringify(row).toLowerCase().includes(query.toLowerCase()),
  );
  const columns =
    module === "orders"
      ? ["id", "user", "total", "status", "createdAt"]
      : module === "customers"
        ? ["name", "email", "role", "createdAt"]
        : module === "audit-logs"
          ? ["actorId", "action", "target", "createdAt"]
          : ["messages", "commissions"].includes(module)
            ? ["name", "email", "subject", "status", "createdAt"]
            : module === "reviews"
              ? ["product", "rating", "text", "approved"]
              : module === "coupons"
                ? ["code", "type", "value", "uses", "active"]
                : module === "categories"
                  ? ["name", "kind", "slug"]
                  : ["title", "category", "status", "updatedAt"];
  function edit(row: Row) {
    setEditingId(String(row.id));
    let data: Row = { ...defaults[module] };
    for (const key of Object.keys(data))
      if (row[key] !== undefined) data[key] = row[key];
    if (module === "products") {
      data.fileIds = ((row.files as { mediaId: string }[]) || []).map(
        (f) => f.mediaId,
      );
      data.prices = ((row.prices as Row[]) || []).map(
        ({ license, amount, terms }) => ({ license, amount, terms }),
      );
    }
    setEditor(data);
  }
  function exportCsv() {
    const safe = (v: unknown) => {
      let s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
      if (/^[=+@-]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const csv = [
      columns.join(","),
      ...filtered.map((row) => columns.map((c) => safe(row[c])).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = module + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="admin-title">
        <div>
          <span className="eyebrow">MANAGE YOUR STUDIO</span>
          <h1 style={{ marginTop: 10 }}>
            {adminModules.find((m) => m[0] === module)?.[1] || module}
          </h1>
        </div>
        <div className="editor-actions">
          <button onClick={exportCsv}>Export CSV</button>
          {canCreate && (
            <button
              className="button"
              onClick={() => {
                setEditingId(undefined);
                setEditor(structuredClone(defaults[module]));
              }}
            >
              <Plus size={16} /> ADD NEW
            </button>
          )}
        </div>
      </div>
      <div className="search-input" style={{ marginBottom: 20 }}>
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search records…"
        />
      </div>
      {editor && (
        <Editor
          module={module}
          value={editor}
          id={editingId}
          onClose={() => setEditor(null)}
        />
      )}
      <p role="status" className="form-status">
        {notice}
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice((page - 1) * 20, page * 20).map((row) => (
              <tr key={String(row.id)}>
                {columns.map((c) => (
                  <td key={c}>
                    {c === "status" ? (
                      <span className={"status " + row[c]}>
                        {String(row[c])}
                      </span>
                    ) : c === "total" ? (
                      money(Number(row[c]))
                    ) : typeof row[c] === "object" ? (
                      ((row[c] as Row)?.email as string) ||
                      ((row[c] as Row)?.title as string)
                    ) : typeof row[c] === "boolean" ? (
                      row[c] ? (
                        "Yes"
                      ) : (
                        "No"
                      )
                    ) : (
                      String(row[c] ?? "—").slice(0, c === "text" ? 150 : 60)
                    )}
                  </td>
                ))}
                <td>
                  <div className="editor-actions">
                    {defaults[module] && (
                      <button onClick={() => edit(row)}>Edit</button>
                    )}
                    {module === "orders" && (
                      <button
                        onClick={async () => {
                          try {
                            await api("/api/admin/orders", { id: row.id });
                            setNotice("Status diperbarui.");
                            router.refresh();
                          } catch (e) {
                            setNotice((e as Error).message);
                          }
                        }}
                      >
                        Reconcile
                      </button>
                    )}
                    {canCreate && (
                      <button
                        onClick={async () => {
                          if (!confirm("Hapus atau arsipkan record ini?"))
                            return;
                          try {
                            await api("/api/admin/" + module, {
                              id: row.id,
                              action: "delete",
                            });
                            router.refresh();
                          } catch (e) {
                            setNotice((e as Error).message);
                          }
                        }}
                      >
                        Archive / delete
                      </button>
                    )}
                  </div>
                  {["messages", "commissions"].includes(module) && (
                    <details>
                      <summary>Read message</summary>
                      <p className="message-body">{String(row.message)}</p>
                      <p>{JSON.stringify(row.details)}</p>
                      <a
                        href={
                          "mailto:" +
                          row.email +
                          "?subject=" +
                          encodeURIComponent("Re: " + row.subject)
                        }
                      >
                        Reply by email ↗
                      </a>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty-state">
            Belum ada data.{" "}
            {canCreate
              ? "Klik Add New untuk mulai."
              : "Data akan muncul setelah ada aktivitas."}
          </div>
        )}
      </div>
      {filtered.length > 20 && (
        <div className="editor-actions" style={{ marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span>
            Page {page} / {Math.ceil(filtered.length / 20)}
          </span>
          <button
            disabled={page * 20 >= filtered.length}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
export function Editor({
  module,
  value,
  id,
  onClose,
}: {
  module: string;
  value: Row;
  id?: string;
  onClose?: () => void;
}) {
  const [data, setData] = useState<Row>(value);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const set = (key: string, v: unknown) =>
    setData((prev) => ({ ...prev, [key]: v }));
  return (
    <form
      className="admin-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setNotice("");
        try {
          await api("/api/admin/" + module, { id, data });
          setNotice("Perubahan berhasil disimpan.");
          router.refresh();
          onClose?.();
        } catch (err) {
          setNotice((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>
        {id
          ? "Edit record"
          : module === "settings" || module === "homepage"
            ? "Studio settings"
            : "Create something new"}
      </h2>
      <div className="form-grid">
        {Object.entries(data).map(([key, v]) => {
          if (key === "prices")
            return (
              <div className="full" key={key}>
                <label>Lisensi dan harga server (IDR)</label>
                {(v as Row[]).map((p, i) => (
                  <div
                    className="form-grid panel"
                    key={i}
                    style={{ marginTop: 10 }}
                  >
                    <label>
                      Lisensi
                      <input
                        required
                        value={String(p.license)}
                        onChange={(e) =>
                          set(
                            "prices",
                            (v as Row[]).map((a, n) =>
                              n === i ? { ...a, license: e.target.value } : a,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Harga
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={Number(p.amount)}
                        onChange={(e) =>
                          set(
                            "prices",
                            (v as Row[]).map((a, n) =>
                              n === i
                                ? { ...a, amount: Number(e.target.value) }
                                : a,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="full">
                      Ketentuan lisensi
                      <textarea
                        required
                        minLength={10}
                        value={String(p.terms)}
                        onChange={(e) =>
                          set(
                            "prices",
                            (v as Row[]).map((a, n) =>
                              n === i ? { ...a, terms: e.target.value } : a,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "prices",
                          (v as Row[]).filter((_, n) => n !== i),
                        )
                      }
                    >
                      Remove license
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="button outline"
                  onClick={() =>
                    set("prices", [
                      ...(v as Row[]),
                      { license: "Commercial", amount: 0, terms: "" },
                    ])
                  }
                >
                  + Add license
                </button>
              </div>
            );
          if (["media", "socials"].includes(key))
            return (
              <label key={key} className="full">
                {key === "media"
                  ? "Gallery — satu URL per baris, video .mp4/.webm dikenali otomatis"
                  : "Social links — Label | https://alamat"}
                <textarea
                  defaultValue={(v as Row[])
                    .map((m) =>
                      key === "media" ? m.url : m.label + " | " + m.url,
                    )
                    .join("\n")}
                  onChange={(e) =>
                    set(
                      key,
                      e.target.value
                        .split("\n")
                        .filter(Boolean)
                        .map((line) =>
                          key === "media"
                            ? {
                                url: line.trim(),
                                type: /\.(mp4|webm)(\?|$)/i.test(line)
                                  ? "video"
                                  : "image",
                              }
                            : {
                                label: line.split("|")[0].trim(),
                                url: line.split("|")[1]?.trim() || "",
                              },
                        ),
                    )
                  }
                />
              </label>
            );
          if (key === "sections")
            return (
              <div className="full" key={key}>
                <label>
                  Homepage sections — urutkan dengan panah, hapus untuk
                  menyembunyikan
                </label>
                {(v as string[]).map((s, i) => (
                  <div className="summary-line" key={s}>
                    <span>{s}</span>
                    <div className="editor-actions">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => {
                          const a = [...(v as string[])];
                          [a[i - 1], a[i]] = [a[i], a[i - 1]];
                          set(key, a);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={i === (v as string[]).length - 1}
                        onClick={() => {
                          const a = [...(v as string[])];
                          [a[i + 1], a[i]] = [a[i], a[i + 1]];
                          set(key, a);
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            key,
                            (v as string[]).filter((x) => x !== s),
                          )
                        }
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                ))}
                <div className="editor-actions">
                  {["portfolio", "about", "shop", "services", "contact"]
                    .filter((s) => !(v as string[]).includes(s))
                    .map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => set(key, [...(v as string[]), s])}
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              </div>
            );
          if (["details", "specifications"].includes(key))
            return (
              <label className="full" key={key}>
                {key === "specifications"
                  ? "Spesifikasi teknis"
                  : "Detail tambahan"}{" "}
                — satu Nama: Nilai per baris
                <textarea
                  defaultValue={Object.entries(v as Row)
                    .map(([k, val]) => k + ": " + val)
                    .join("\n")}
                  onChange={(e) =>
                    set(
                      key,
                      Object.fromEntries(
                        e.target.value
                          .split("\n")
                          .filter((l) => l.includes(":"))
                          .map((l) => [
                            l.slice(0, l.indexOf(":")).trim(),
                            l.slice(l.indexOf(":") + 1).trim(),
                          ]),
                      ),
                    )
                  }
                />
              </label>
            );
          if (key === "fileIds")
            return (
              <div className="full" key={key}>
                <MediaPicker
                  privateFiles
                  selected={v as string[]}
                  onChange={(ids) => set(key, ids)}
                />
              </div>
            );
          if (
            [
              "cover",
              "heroImage",
              "heroVideo",
              "heroModel",
              "modelUrl",
            ].includes(key)
          )
            return (
              <div key={key} className="full">
                <label>
                  {labelMap[key] || key}
                  <input
                    value={String(v || "")}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder="https://… atau pilih dari library"
                  />
                </label>
                <MediaPicker
                  selected={[String(v || "")]}
                  onChange={(ids) => set(key, ids[0] || "")}
                />
              </div>
            );
          if (typeof v === "boolean")
            return (
              <label
                key={key}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <input
                  type="checkbox"
                  checked={v}
                  onChange={(e) => set(key, e.target.checked)}
                />
                {labelMap[key] || key}
              </label>
            );
          const options =
            key === "status" && ["messages", "commissions"].includes(module)
              ? ["NEW", "READ", "IN_PROGRESS", "ARCHIVED"]
              : selectOptions[key];
          if (options)
            return (
              <label key={key}>
                {labelMap[key] || key}
                <select
                  value={String(v)}
                  onChange={(e) => set(key, e.target.value)}
                >
                  {options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </label>
            );
          if (["description", "intro", "about", "notes"].includes(key))
            return (
              <label className="full" key={key}>
                {labelMap[key]}
                {key === "description" && (
                  <small>
                    Rich text: # Judul · **tebal** · *miring* · - daftar ·
                    [teks](https://…) · fenced code blocks
                  </small>
                )}
                <textarea
                  value={String(v)}
                  onChange={(e) => set(key, e.target.value)}
                  style={{ minHeight: key === "description" ? 240 : 120 }}
                />
              </label>
            );
          if (Array.isArray(v))
            return (
              <label key={key} className="full">
                {labelMap[key] || key}
                <input
                  value={v.join(", ")}
                  onChange={(e) =>
                    set(
                      key,
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                />
              </label>
            );
          return (
            <label key={key}>
              {labelMap[key] || key}
              <input
                type={
                  key === "accent"
                    ? "color"
                    : key === "expiresAt"
                      ? "date"
                      : typeof v === "number" || key === "maxUses"
                        ? "number"
                        : "text"
                }
                value={
                  key === "expiresAt"
                    ? String(v || "").slice(0, 10)
                    : String(v ?? "")
                }
                onChange={(e) =>
                  set(
                    key,
                    typeof v === "number"
                      ? Number(e.target.value)
                      : key === "maxUses"
                        ? e.target.value
                          ? Number(e.target.value)
                          : null
                        : key === "expiresAt"
                          ? e.target.value || null
                          : e.target.value,
                  )
                }
              />
            </label>
          );
        })}
      </div>
      <div className="actions">
        <button className="button" disabled={busy}>
          {busy ? "SAVING…" : "SAVE CHANGES"} <ArrowUpRight size={16} />
        </button>
        {onClose && (
          <button type="button" className="button outline" onClick={onClose}>
            Cancel
          </button>
        )}
        <Link href="/" target="_blank" className="button outline">
          Preview website ↗
        </Link>
      </div>
      <p role="status" className="form-status">
        {notice}
      </p>
    </form>
  );
}
export function MediaLibrary({ rows }: { rows: Row[] }) {
  const [privateFile, setPrivateFile] = useState(false);
  const [progress, setProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  async function send(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setNotice("");
    try {
      for (const file of Array.from(files)) {
        setProgress(0);
        if (privateFile) {
          const init = await api("/api/upload", {
            action: "private-url",
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
          });
          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", init.url);
            xhr.setRequestHeader(
              "Content-Type",
              file.type || "application/octet-stream",
            );
            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable)
                setProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () =>
              xhr.status < 300
                ? resolve()
                : reject(new Error("Upload storage gagal."));
            xhr.onerror = () => reject(new Error("Koneksi upload terputus."));
            xhr.send(file);
          });
          await api("/api/upload", {
            action: "private-complete",
            name: file.name,
            size: file.size,
            contentType: file.type || "application/octet-stream",
            key: init.key,
          });
        } else {
          await upload(
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
        }
        setProgress(100);
      }
      setNotice(
        "Upload selesai. Untuk media publik, metadata muncul setelah callback storage diterima.",
      );
      router.refresh();
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-title">
        <h1>Media library</h1>
        <span className="muted">
          {rows.length} files ·{" "}
          {(rows.reduce((s, r) => s + Number(r.size), 0) / 1024 / 1024).toFixed(
            1,
          )}{" "}
          MB
        </span>
      </div>
      <div
        className="upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) void send(e.dataTransfer.files);
        }}
      >
        <Upload style={{ margin: "auto" }} />
        <h3 style={{ marginTop: 15 }}>Drop files into your studio</h3>
        <p>
          Media publik: gambar, video, GLB. File berbayar: private object
          storage.
        </p>
        <label
          style={{
            flexDirection: "row",
            justifyContent: "center",
            margin: "18px 0",
          }}
        >
          <input
            type="checkbox"
            checked={privateFile}
            onChange={(e) => setPrivateFile(e.target.checked)}
          />
          File produk privat
        </label>
        <input
          type="file"
          multiple
          disabled={busy}
          onChange={(e) => void send(e.target.files)}
        />
        {busy && <progress value={progress} max={100} />}
        <p role="status">{busy ? progress + "%" : notice}</p>
      </div>
      <label className="search-input">
        <Search size={16} />
        <input
          placeholder="Search files…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="media-grid" style={{ marginTop: 25 }}>
        {rows
          .filter((r) =>
            String(r.name).toLowerCase().includes(query.toLowerCase()),
          )
          .map((r) => (
            <div key={String(r.id)} className="media-item">
              {!r.private && String(r.contentType).startsWith("image/") && (
                <img src={String(r.url)} alt={String(r.name)} />
              )}
              <span className="status">{r.private ? "PRIVATE" : "PUBLIC"}</span>
              <h3 style={{ margin: "12px 0" }}>{String(r.name)}</h3>
              <p>{(Number(r.size) / 1024 / 1024).toFixed(1)} MB</p>
              <button
                className="button outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(
                    String(r.private ? r.id : r.url),
                  );
                  setNotice("Disalin.");
                }}
              >
                {r.private ? "Copy file ID" : "Copy public URL"}
              </button>
            </div>
          ))}
      </div>
    </>
  );
}
