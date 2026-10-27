"use client";
import Link from "next/link";
import { ContactLinks } from "./contact-links";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Menu,
  X,
  ShoppingBag,
  UserRound,
  Search,
  Plus,
  Heart,
  LoaderCircle,
} from "lucide-react";
import { money } from "@/lib/format";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { defaultSettings } from "@/lib/demo";
export { ArrowUpRight, ArrowRight, ArrowDown };
type CartItem = {
  productId: string;
  title: string;
  cover: string;
  license: string;
  amount: number;
};
export const useCart = create<{
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (key: string) => void;
  clear: () => void;
}>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => ({
          items: s.items.some(
            (x) => x.productId === item.productId && x.license === item.license,
          )
            ? s.items
            : [...s.items, item],
        })),
      remove: (key) =>
        set((s) => ({
          items: s.items.filter((i) => i.productId + ":" + i.license !== key),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "bms-cart" },
  ),
);
export { money };
export async function api(path: string, data: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error || "Permintaan gagal");
  return result;
}
export function Navbar({ brand }: { brand: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);
  const [mounted, setMounted] = useState(false);
  const items = useCart((s) => s.items);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setOpen(false);
    setSearch(false);
  }, [path]);
  if (path.startsWith("/admin")) return null;
  return (
    <>
      <header className="navbar">
        <Link className="brand" href="/" aria-label={brand + " home"}>
          <span className="brand-icon">
            B<span>✦</span>
          </span>
          <span>
            {brand.replace("STUDIO", "")}
            <small>INDEPENDENT 3D STUDIO</small>
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          className={open ? "nav-links open" : "nav-links"}
        >
          {[
            ["/", "Home"],
            ["/portfolio", "Portfolio"],
            ["/shop", "Shop"],
            ["/services", "Services"],
            ["/about", "About"],
            ["/blog", "Journal"],
          ].map(([href, label]) => (
            <Link
              key={href}
              className={path === href ? "active" : ""}
              href={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <button aria-label="Search" onClick={() => setSearch(!search)}>
            <Search size={18} />
          </button>
          <Link href="/account" aria-label="My account">
            <UserRound size={18} />
          </Link>
          <Link className="cart-icon" href="/cart" aria-label="Shopping cart">
            <ShoppingBag size={18} />
            {mounted && items.length > 0 && <i>{items.length}</i>}
          </Link>
          <Link href="/contact" className="nav-cta">
            LET’S TALK <ArrowUpRight size={15} />
          </Link>
          <button
            className="mobile-toggle"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {search && (
        <form action="/search" className="global-search">
          <Search size={20} />
          <input
            autoFocus
            name="q"
            placeholder="Cari karya, produk, atau journal…"
            aria-label="Search projects"
          />
          <button type="submit">
            Cari <ArrowRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => setSearch(false)}
            aria-label="Close search"
          >
            <X />
          </button>
        </form>
      )}
    </>
  );
}
export function Footer({ site }: { site: typeof defaultSettings }) {
  const path = usePathname();
  if (path.startsWith("/admin")) return null;
  return (
    <footer>
      <div className="footer-contact"><ContactLinks site={site} /></div>
      <div className="footer-top">
        <Link href="/" className="footer-wordmark">
          {site.brand.replace(/STUDIO$/i, "")}
          <span>®</span>
        </Link>
        <p>
          IMAGINATION, MADE REAL.
          <br />
          INDEPENDENT 3D ART & DIGITAL ASSETS.
        </p>
        <a href="#top">BACK TO TOP ↑</a>
      </div>
      <div className="footer-bottom">
        <span>
          © {new Date().getFullYear()} {site.brand}
        </span>
        <div>
          <Link href="/licenses">Licenses</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/refund-policy">Refunds</Link>
          <Link href="/admin">Studio admin ↗</Link>
        </div>
        <span>
          MADE WITH INTENTION <b>✦</b>
        </span>
      </div>
    </footer>
  );
}
export function SectionHead({
  number,
  title,
  link,
  label = "EXPLORE ALL",
}: {
  number: string;
  title: string;
  link?: string;
  label?: string;
}) {
  return (
    <div className="section-head">
      <div>
        <span className="eyebrow">{number} / THE STUDIO</span>
        <h2>
          {title}
          <span className="red">.</span>
        </h2>
      </div>
      {link && (
        <Link className="text-link" href={link}>
          {label} <ArrowUpRight size={20} />
        </Link>
      )}
    </div>
  );
}
export type Work = {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  cover: string;
  modelUrl?: string | null;
  tags: string[];
  details?: unknown;
  prices?: { license: string; amount: number; terms: string }[];
};
export function WorkCard({
  work,
  index = 0,
  shop = false,
}: {
  work: Work;
  index?: number;
  shop?: boolean;
}) {
  return (
    <article className="work-card">
      <Link
        className="work-image"
        href={(shop ? "/shop/" : "/portfolio/") + work.slug}
      >
        <img
          src={work.cover}
          alt={work.title + " — " + work.category}
          loading="lazy"
        />
        <span className="work-category">{work.category}</span>
        <span className="image-arrow">
          <ArrowUpRight size={22} />
        </span>
        {work.id.startsWith("demo") || work.id.startsWith("sample") ? (
          <small className="sample-badge">CONCEPT / SAMPLE</small>
        ) : null}
      </Link>
      <div className="work-caption">
        <span className="work-index">{String(index + 1).padStart(2, "0")}</span>
        <div>
          <Link href={(shop ? "/shop/" : "/portfolio/") + work.slug}>
            <h3>{work.title}</h3>
          </Link>
          <p>
            {shop
              ? money(work.prices?.[0]?.amount || 0)
              : work.tags.slice(0, 2).join(" / ")}
          </p>
        </div>
        <ArrowUpRight size={19} />
      </div>
    </article>
  );
}
export function Catalog({
  items,
  shop = false,
  initialQuery = "",
}: {
  items: Work[];
  shop?: boolean;
  initialQuery?: string;
}) {
  const [category, setCategory] = useState("All");
  const [q, setQ] = useState(initialQuery);
  const [sort, setSort] = useState("latest");
  const [max, setMax] = useState("");
  const [page, setPage] = useState(1);
  const filtered = items
    .filter(
      (i) =>
        (category === "All" || i.category === category) &&
        (i.title + " " + i.category + " " + i.tags.join(" "))
          .toLowerCase()
          .includes(q.toLowerCase()) &&
        (!max || !shop || (i.prices?.[0]?.amount || 0) <= Number(max)),
    )
    .sort((a, b) =>
      sort === "low"
        ? (a.prices?.[0]?.amount || 0) - (b.prices?.[0]?.amount || 0)
        : sort === "high"
          ? (b.prices?.[0]?.amount || 0) - (a.prices?.[0]?.amount || 0)
          : sort === "az"
            ? a.title.localeCompare(b.title)
            : 0,
    );
  return (
    <>
      <div className="filter-toolbar">
        <div className="filter-tabs">
          {["All", ...new Set(items.map((i) => i.category))].map((c) => (
            <button
              className={c === category ? "selected" : ""}
              key={c}
              onClick={() => {
                setCategory(c);
                setPage(1);
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="search-input">
          <Search size={17} />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Cari sesuatu…"
            aria-label="Search"
          />
        </label>
        <select
          aria-label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="latest">Terbaru</option>
          <option value="az">A — Z</option>
          {shop && (
            <>
              <option value="low">Harga terendah</option>
              <option value="high">Harga tertinggi</option>
            </>
          )}
        </select>
        {shop && (
          <input
            type="number"
            min="0"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            placeholder="Harga maksimum IDR"
            aria-label="Maximum price"
          />
        )}
      </div>
      <div className="work-grid">
        {filtered.slice(0, page * 9).map((work, i) => (
          <WorkCard key={work.id} work={work} index={i} shop={shop} />
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          Belum ada hasil. Coba kata kunci atau kategori lain.
        </div>
      )}
      {filtered.length > page * 9 && (
        <button className="button outline" onClick={() => setPage(page + 1)}>
          Muat lebih banyak <Plus size={18} />
        </button>
      )}
    </>
  );
}
export function Purchase({
  product,
  sample = false,
}: {
  product: Work;
  sample?: boolean;
}) {
  const [license, setLicense] = useState(
    product.prices?.[0]?.license || "Personal",
  );
  const [notice, setNotice] = useState("");
  const add = useCart((s) => s.add);
  const price = product.prices?.find((p) => p.license === license);
  return (
    <div className="purchase">
      <span className="eyebrow">CHOOSE YOUR LICENSE</span>
      <select
        value={license}
        onChange={(e) => setLicense(e.target.value)}
        aria-label="License"
      >
        {product.prices?.map((p) => (
          <option key={p.license}>{p.license}</option>
        ))}
      </select>
      <p className="muted">{price?.terms}</p>
      <strong className="price">{money(price?.amount || 0)}</strong>
      <button
        disabled={sample}
        className="button"
        onClick={() => {
          add({
            productId: product.id,
            title: product.title,
            cover: product.cover,
            license,
            amount: price?.amount || 0,
          });
          setNotice("Ditambahkan ke keranjang.");
        }}
      >
        {sample ? "Produk contoh · belum dijual" : "Add to cart"}{" "}
        <ShoppingBag size={18} />
      </button>
      <button
        className="text-link"
        onClick={async () => {
          try {
            await api("/api/account/wishlist", { productId: product.id });
            setNotice("Disimpan di wishlist.");
          } catch (e) {
            setNotice((e as Error).message);
          }
        }}
      >
        <Heart size={17} /> Simpan ke wishlist
      </button>
      <p role="status">{notice}</p>
      <Link href="/licenses" className="muted">
        Baca panduan lisensi ↗
      </Link>
    </div>
  );
}
export function Cart() {
  const [ready, setReady] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { items, remove } = useCart();
  useEffect(() => setReady(true), []);
  const router = useRouter();
  if (!ready) return <div className="empty-state">Memuat keranjang…</div>;
  if (!items.length)
    return (
      <div className="empty-state">
        <ShoppingBag size={40} />
        <h2>Ruang untuk ide berikutnya.</h2>
        <p>Keranjang lo masih kosong. Temukan aset untuk project berikutnya.</p>
        <Link className="button" href="/shop">
          Explore the shop <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <div className="two-col">
      <div>
        {items.map((i) => (
          <div className="cart-row" key={i.productId + i.license}>
            <img src={i.cover} alt={i.title} />
            <div>
              <h3>{i.title}</h3>
              <small>{i.license} license</small>
              <p>{money(i.amount)}</p>
            </div>
            <button
              aria-label={"Remove " + i.title}
              onClick={() => remove(i.productId + ":" + i.license)}
            >
              <X />
            </button>
          </div>
        ))}
      </div>
      <div className="panel">
        <h2>Order summary</h2>
        <div className="summary-line">
          <span>Subtotal estimasi</span>
          <strong>{money(items.reduce((s, i) => s + i.amount, 0))}</strong>
        </div>
        <label>
          Kode kupon
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Masukkan kode"
          />
        </label>
        <p className="muted">
          Harga akhir dan kupon divalidasi di server. Lisensi mengikuti pilihan
          pada produk.
        </p>
        <button
          className="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await api("/api/commerce/checkout", {
                items: items.map(({ productId, license }) => ({
                  productId,
                  license,
                })),
                coupon,
              });
              if (result.free) router.push("/account/downloads");
              else window.location.assign(result.url);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            "Secure checkout"
          )}
          <ArrowUpRight size={18} />
        </button>
        <p className="form-status" role="status">
          {error}
        </p>
        <Link href="/login">Masuk ke akun →</Link>
        <p className="tiny muted">
          Checkout menggunakan Midtrans. Status lunas hanya ditetapkan setelah
          verifikasi server.
        </p>
      </div>
    </div>
  );
}
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="faq-list">
      {items.map((i) => (
        <details key={i.q}>
          <summary>
            {i.q}
            <Plus size={18} />
          </summary>
          <p>{i.a}</p>
        </details>
      ))}
    </div>
  );
}
