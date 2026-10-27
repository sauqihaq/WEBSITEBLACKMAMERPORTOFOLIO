import { ContactLinks } from "@/components/contact-links";
import Link from "next/link";
import { money } from "@/lib/format";
import { RichText } from "@/components/rich-text";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { settings, projects, products, contents } from "@/lib/content";
import { configured, db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  Catalog,
  Cart,
  Purchase,
  SectionHead,
  WorkCard,
  ArrowUpRight,
  Faq,
  type Work,
} from "@/components/site";
import {
  ContactForm,
  AuthForm,
  ActionButton,
  Logout,
  ProfileForm,
  ReviewForm,
} from "@/components/forms";
import Viewer from "@/components/viewer";
type Props = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = slug.at(-1)?.replace(/-/g, " ") || "Studio";
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    alternates: { canonical: "/" + slug.join("/") },
    ...([
      "account",
      "checkout",
      "login",
      "register",
      "forgot-password",
      "reset-password",
      "verify-email",
    ].includes(slug[0])
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}
function Heading({
  tag,
  title,
  text,
}: {
  tag: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="page-heading">
      <span className="eyebrow">BLACKMAMERSTUDIO / {tag}</span>
      <h1>
        {title}
        <span className="red">.</span>
      </h1>
      {text && <p>{text}</p>}
    </div>
  );
}
export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;
  const section = slug[0];
  const sub = slug[1];
  const site = await settings();
  if(section==='search'){
    const needle=(query.q||'').trim().toLowerCase();
    const [work,assets,posts]=await Promise.all([projects(),products(),contents('blog')]);
    const matches=(entry:{title:string;description:string})=>(entry.title+' '+entry.description).toLowerCase().includes(needle);
    const foundWork=needle?work.filter(matches):[];
    const foundAssets=needle?assets.filter(matches):[];
    const foundPosts=needle?posts.filter(matches):[];
    return <div className="page"><Heading tag="GLOBAL SEARCH" title="FIND YOUR NEXT IDEA" text={needle?'Hasil pencarian untuk “'+query.q+'”':'Masukkan judul karya, produk, atau topik journal.'}/><form className="filter-toolbar" action="/search"><input name="q" defaultValue={query.q||''} aria-label="Search all content" placeholder="Search the studio…"/><button className="button">SEARCH ↗</button></form><SectionHead number="01" title="PORTFOLIO"/><div className="work-grid">{foundWork.map((w,i)=><WorkCard key={w.id} work={w} index={i}/>)}</div>{!foundWork.length&&<p className="empty-state">Tidak ada karya yang cocok.</p>}<SectionHead number="02" title="ASSETS"/><div className="work-grid">{foundAssets.map((w,i)=><WorkCard key={w.id} work={w} index={i} shop/>)}</div>{!foundAssets.length&&<p className="empty-state">Tidak ada aset yang cocok.</p>}<SectionHead number="03" title="JOURNAL"/>{foundPosts.map(p=><Link key={p.id} href={'/blog/'+p.slug} className="panel"><h3>{p.title}</h3></Link>)}{!foundPosts.length&&<p className="empty-state">Tidak ada artikel yang cocok.</p>}</div>;
  }
  if (
    [
      "login",
      "register",
      "forgot-password",
      "reset-password",
      "verify-email",
    ].includes(section)
  )
    return (
      <div className="page">
        <Suspense>
          <AuthForm mode={section} />
        </Suspense>
      </div>
    );
  if (["portfolio", "shop", "collections"].includes(section)) {
    const shop = section !== "portfolio";
    const items = shop ? await products() : await projects();
    if (!sub || section === "collections") {
      const display =
        section === "collections"
          ? items.filter(
              (i) => i.category.toLowerCase().replace(/\s+/g, "-") === sub,
            )
          : items;
      return (
        <div className="page">
          <Heading
            tag={shop ? "DIGITAL ASSETS" : "SELECTED WORK"}
            title={shop ? "YOUR NEXT STARTS HERE" : "IMAGINATION, MADE REAL"}
            text={
              shop
                ? "Aset untuk ide yang lebih besar. Temukan model, environment, dan elemen visual untuk project berikutnya."
                : "Eksplorasi bentuk, cahaya, dan dunia digital. Setiap karya dimulai dari rasa ingin tahu."
            }
          />
          {!configured() && (
            <p className="notice">
              Preview konten contoh — ganti dengan karya dan aset asli melalui
              CMS setelah database tersambung.
            </p>
          )}
          <Catalog items={display} shop={shop} initialQuery={query.q} />
        </div>
      );
    }
    const item = items.find((p) => p.slug === sub);
    if (!item) notFound();
    const data = item as Work;
    const gallery = item.media as {
      url: string;
      type: string;
      caption?: string;
    }[];
    const specs = (
      "specifications" in item
        ? item.specifications
        : "details" in item
          ? item.details
          : {}
    ) as Record<string, unknown>;
    return (
      <div className="page">
        <Link className="text-link" href={shop ? "/shop" : "/portfolio"}>
          ← BACK TO {shop ? "SHOP" : "PORTFOLIO"}
        </Link>
        <Heading tag={item.category} title={item.title} />
        <img className="detail-hero" src={item.cover} alt={item.title} />
        <div className="detail-main">
          <div>
            <h2>
              THE OVERVIEW<span className="red">.</span>
            </h2>
            <RichText text={item.description} />
            {shop&&<div className="detail-meta" style={{margin:'30px 0'}}>{Object.entries(specs).filter(([key])=>key!=='sample').map(([key,value])=><div key={key}><small>{key}</small><span>{String(value)}</span></div>)}</div>}
            <div className="skill-list" style={{ margin: "25px 0" }}>
              {item.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
            {item.modelUrl && (
              <Viewer url={item.modelUrl} poster={item.cover} />
            )}
            <div className="gallery">
              {gallery.map((m, i) => (
                <figure key={i}>
                  {m.type === "video" ? (
                    <video controls preload="metadata" src={m.url} />
                  ) : (
                    <img
                      loading="lazy"
                      src={m.url}
                      alt={m.caption || item.title + " " + (i + 1)}
                    />
                  )}
                  <figcaption>{m.caption}</figcaption>
                </figure>
              ))}
            </div>
            {shop && (
              <>
                <h2>REVIEWS</h2>
                {"reviews" in item &&
                  (item.reviews as { text: string; rating: number }[]).map(
                    (r, i) => (
                      <div className="panel" key={i}>
                        <span className="status">
                          VERIFIED PURCHASE · {r.rating}/5
                        </span>
                        <p>{r.text}</p>
                      </div>
                    ),
                  )}
                <ReviewForm productId={item.id} />
              </>
            )}
          </div>
          <div>
            {shop ? (
              <Purchase product={data} sample={!configured()} />
            ) : (
              <div className="detail-meta">
                {Object.entries(specs)
                  .filter(([k]) => k !== "sample")
                  .map(([k, v]) => (
                    <div key={k}>
                      <small>{k}</small>
                      <span>{String(v)}</span>
                    </div>
                  ))}
                <Link className="button" href="/commissions">
                  LET’S BUILD YOURS <ArrowUpRight size={18} />
                </Link>
              </div>
            )}
          </div>
        </div>
        <section style={{ marginTop: 70 }}>
          <SectionHead
            number="NEXT"
            title={shop ? "MORE TO EXPLORE" : "OTHER DIMENSIONS"}
          />
          <div className="work-grid">
            {items
              .filter((i) => i.id !== item.id)
              .slice(0, 3)
              .map((w, i) => (
                <WorkCard key={w.id} work={w} index={i} shop={shop} />
              ))}
          </div>
        </section>
      </div>
    );
  }
  if (section === "cart" || (section === "checkout" && !sub))
    return (
      <div className="page">
        <Heading tag="SHOP / CART" title="YOUR CREATIVE TOOLKIT" />
        <Cart />
      </div>
    );
  if (section === "checkout" && sub) {
    return (
      <div className="page">
        <Heading
          tag="CHECKOUT"
          title={sub === "failed" ? "LET’S TRY AGAIN" : "CHECK YOUR PAYMENT"}
          text="Status pembayaran akhir diperiksa langsung melalui server Midtrans. Halaman ini tidak otomatis menandai pesanan sebagai lunas."
        />
        {query.order && (
          <ActionButton
            path="/api/commerce/reconcile"
            payload={{ orderId: query.order }}
            label="Periksa status pembayaran"
          />
        )}
        <p style={{ marginTop: 30 }}>
          <Link className="button" href="/account/orders">
            Buka riwayat order
          </Link>
        </p>
      </div>
    );
  }
  if (section === "contact" || section === "commissions")
    return (
      <div className="page">
        <Heading tag="LET’S COLLABORATE" title="GOOD THINGS START HERE" />
        <div className="contact-layout">
          <div>
            <span className="eyebrow">A NEW IDEA. A NEW DIMENSION.</span>
            <h2 style={{ marginTop: 20 }}>
              LET’S CREATE
              <br />
              SOMETHING
              <br />
              <span className="red">UNEXPECTED.</span>
            </h2>
            <p>
              Udah punya brief atau masih sebatas ide? Ceritain kebutuhan lo
              lewat form ini.
            </p>
            <p>{site.location}</p>
            <ContactLinks site={site} />
          </div>
          <ContactForm commission={section === "commissions"} />
        </div>
      </div>
    );
  if (section === "about")
    return (
      <div className="page">
        <Heading tag="ABOUT THE STUDIO" title="BEYOND THE ORDINARY" />
        <div className="two-col">
          <div
            style={{
              background: "radial-gradient(ellipse,#4a1414,#0a0a0a)",
              maxHeight: 650,
              overflow: "hidden",
            }}
          >
            <img
              src={site.heroImage}
              alt="The artist behind BLACKMAMERSTUDIO"
              style={{
                height: "100%",
                maxHeight: 650,
                margin: "auto",
                objectFit: "contain",
              }}
            />
          </div>
          <div>
            <span className="eyebrow">
              INDEPENDENT. CURIOUS. DETAIL-DRIVEN.
            </span>
            <h2 style={{ margin: "25px 0" }}>
              ART MEETS
              <br />
              <span className="red">POSSIBILITY.</span>
            </h2>
            <p className="intro-large">{site.about}</p>
            <div className="skill-list" style={{ margin: "30px 0" }}>
              {site.skills.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <Link href="/commissions" className="button">
              LET’S WORK TOGETHER <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
        <section style={{ marginTop: 90 }}>
          <SectionHead number="PROCESS" title="FROM IDEA TO IMPACT" />
          <div className="service-list">
            {[
              ["Discover", "Menyamakan tujuan, konteks, dan arah visual."],
              ["Explore", "Membangun referensi, bentuk awal, dan kemungkinan."],
              ["Create", "Modeling, texturing, lighting, dan iterasi."],
              ["Refine", "Memeriksa detail, performa, dan kebutuhan format."],
              ["Deliver", "Mengirim hasil akhir beserta panduan penggunaan."],
            ].map(([title, text], i) => (
              <Link href="/contact" key={title}>
                <span className="red">0{i + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <ArrowUpRight />
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  if (section === "services") {
    const entries = await contents("services");
    return (
      <div className="page">
        <Heading
          tag="SERVICES"
          title="CRAFTED WITH INTENTION"
          text="Dari satu aset sampai satu dunia. Ceritakan kebutuhan lo, dan kita tentukan pendekatan yang tepat."
        />
        <div className="service-list">
          {(entries.length
            ? entries
            : [
                {
                  title: "3D Modeling",
                  description:
                    "Karakter, hard surface, props, dan visualisasi objek.",
                },
                {
                  title: "Environment Art",
                  description:
                    "Konsep ruang, world building, dan atmosfer sinematik.",
                },
                {
                  title: "Game Assets",
                  description: "Aset untuk game dan pengalaman interaktif.",
                },
                {
                  title: "Texturing & Rendering",
                  description:
                    "Material, detail permukaan, dan presentasi visual.",
                },
                {
                  title: "Animation",
                  description: "Gerak yang memberi karakter pada ide.",
                },
              ]
          ).map((s, i) => (
            <Link href="/commissions" key={s.title}>
              <span className="red">0{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.description}</p>
              </div>
              <span className="text-link">
                REQUEST A QUOTE <ArrowUpRight />
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  }
  if (section === "blog") {
    const posts = await contents("blog");
    if (sub) {
      const post = posts.find((p) => p.slug === sub);
      if (!post) notFound();
      return (
        <article className="page">
          <Heading tag="STUDIO JOURNAL" title={post.title} />
          {post.cover && (
            <img className="detail-hero" src={post.cover} alt={post.title} />
          )}
          <p className="tiny muted" style={{ margin: "25px 0" }}>
            BLACKMAMERSTUDIO · {post.createdAt.toLocaleDateString("id-ID")} ·{" "}
            {Math.max(1, Math.ceil(post.description.split(/\s+/).length / 200))}{" "}
            min read
          </p>
          <RichText text={post.description} />
        </article>
      );
    }
    return (
      <div className="page">
        <Heading
          tag="STUDIO JOURNAL"
          title="NOTES FROM THE PROCESS"
          text="Eksperimen, breakdown, dan cerita di balik karya."
        />
        {posts.length ? (
          <div className="work-grid">
            {posts.map((p) => (
              <Link key={p.id} href={"/blog/" + p.slug} className="panel">
                {p.cover && <img src={p.cover} alt={p.title} />}
                <h2 style={{ margin: "20px 0" }}>{p.title}</h2>
                <p>{p.description.slice(0, 150)}…</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="red display" style={{ fontSize: 80 }}>
              IN THE MAKING.
            </span>
            <p>
              Catatan pertama sedang dipersiapkan. Kembali lagi untuk proses di
              balik karya.
            </p>
            <Link href="/portfolio" className="text-link">
              EXPLORE THE WORK <ArrowUpRight />
            </Link>
          </div>
        )}
      </div>
    );
  }
  if (section === "account") {
    if (!configured())
      return (
        <div className="page">
          <Heading
            tag="ACCOUNT"
            title="YOUR STUDIO SPACE"
            text="Akun pelanggan aktif setelah database dan autentikasi dikonfigurasi."
          />
          <Link className="button" href="/login">
            SIGN IN <ArrowUpRight />
          </Link>
        </div>
      );
    let user;
    try {
      user = await requireUser();
    } catch {
      redirect("/login");
    }
    const orders = await db.order.findMany({
      where: { userId: user.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return (
      <div className="page">
        <Heading tag="ACCOUNT" title={"HELLO, " + user.name.toUpperCase()} />
        <nav className="account-nav">
          {[
            ["", "Overview"],
            ["orders", "Orders"],
            ["downloads", "Downloads"],
            ["wishlist", "Wishlist"],
            ["settings", "Settings"],
          ].map(([href, label]) => (
            <Link href={"/account" + (href ? "/" + href : "")} key={label}>
              {label}
            </Link>
          ))}
          <Logout />
        </nav>
        {!user.emailVerified && (
          <div className="notice">
            Verifikasi email diperlukan sebelum checkout.{" "}
            <ActionButton
              path="/api/account/resend-verification"
              payload={{}}
              label="Kirim verifikasi"
            />
          </div>
        )}
        {sub === "settings" ? (
          <>
            <ProfileForm name={user.name} />
            <div style={{ marginTop: 50 }}>
              <ActionButton
                path="/api/account/profile"
                payload={{ name: user.name, deletionRequested: true }}
                label="Ajukan penghapusan akun"
              />
            </div>
          </>
        ) : sub === "wishlist" ? (
          <Wishlist userId={user.id} />
        ) : sub === "downloads" ? (
          <Downloads userId={user.id} />
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-box">
                <small>TOTAL ORDERS</small>
                <strong>{orders.length}</strong>
              </div>
              <div className="stat-box">
                <small>PAID ORDERS</small>
                <strong>
                  {orders.filter((o) => o.status === "PAID").length}
                </strong>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>
                        {o.id.slice(-10)}
                        <br />
                        <small>{o.createdAt.toLocaleDateString("id-ID")}</small>
                      </td>
                      <td>
                        {o.items.map((i) => (
                          <p key={i.id}>
                            {i.title} · {i.license}
                          </p>
                        ))}
                      </td>
                      <td>{money(o.total)}</td>
                      <td>
                        <span className={"status " + o.status}>{o.status}</span>
                      </td>
                      <td>
                        {o.status === "PENDING" && (
                          <>
                            {o.paymentUrl && (
                              <a href={o.paymentUrl} className="text-link">
                                Lanjutkan bayar ↗
                              </a>
                            )}
                            <ActionButton
                              path="/api/commerce/reconcile"
                              payload={{ orderId: o.id }}
                              label="Periksa status"
                            />
                          </>
                        )}
                        {o.status === "PAID" && (
                          <Link href="/account/downloads">Buka library ↗</Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!orders.length && (
                <div className="empty-state">Belum ada order.</div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }
  if (section === "faq")
    return (
      <div className="page">
        <Heading tag="SUPPORT" title="GOOD QUESTIONS" />
        <Faq
          items={[
            {
              q: "Bagaimana cara mendapatkan aset?",
              a: "Pilih produk dan lisensi, masuk dengan email terverifikasi, lalu selesaikan pembayaran. Unduhan muncul setelah pembayaran diverifikasi oleh server.",
            },
            {
              q: "Bisakah pesan project khusus?",
              a: "Bisa. Isi form komisi dengan jenis project, budget, deadline, dan referensi.",
            },
            {
              q: "Format apa yang tersedia?",
              a: "Format dan kompatibilitas dicantumkan pada setiap produk. Browser viewer menggunakan GLB atau glTF; format lainnya tersedia sebagai file unduhan.",
            },
            {
              q: "Bagaimana jika pembayaran masih pending?",
              a: "Buka Akun → Orders dan klik Periksa status. Jangan membayar ulang sebelum memastikan status order sebelumnya.",
            },
          ]}
        />
      </div>
    );
  if (["licenses", "terms", "privacy", "refund-policy"].includes(section)) {
    const pages = await contents("pages");
    const custom = pages.find((p) => p.slug === section);
    const copy: Record<string, [string, string]> = {
      licenses: [
        "ASSETS, WITH CLARITY",
        "Lisensi spesifik ditampilkan pada setiap produk sebelum pembelian.\n\nPersonal: untuk penggunaan pribadi sesuai ketentuan produk.\nCommercial: untuk penggunaan komersial yang secara eksplisit diizinkan dalam ketentuan produk.\nExtended: mengikuti batas distribusi dan penggunaan yang tercantum pada produk.\n\nDilarang menjual ulang atau mendistribusikan file sumber tanpa izin tertulis. Simpan bukti pembelian dan ketentuan lisensi order Anda.",
      ],
      terms: [
        "THE TERMS",
        "Website ini menyediakan portfolio dan katalog aset digital BLACKMAMERSTUDIO. Produk tersedia hanya jika telah dipublikasikan, memiliki file, dan pembayaran telah diaktifkan.\n\nHarga dinyatakan dalam IDR. Baca spesifikasi, format file, kompatibilitas, dan lisensi sebelum checkout. Jangan membagikan akun atau tautan unduhan.\n\nKonten bertanda sample adalah ilustrasi tampilan dan tidak dijual.",
      ],
      privacy: [
        "YOUR PRIVACY",
        "Data akun, order, dan pesan digunakan untuk mengelola akses, memenuhi pesanan, dan menanggapi inquiry. Pembayaran diproses oleh Midtrans; website tidak menyimpan nomor kartu pembayaran.\n\nMedia publik dapat dilihat pengunjung. File produk berbayar disimpan secara privat. Email transaksional dapat dikirim melalui Resend.\n\nAnda dapat mengajukan penghapusan akun melalui pengaturan akun. Data transaksi yang wajib disimpan tidak otomatis dihapus. Hubungi studio untuk pertanyaan terkait data.",
      ],
      "refund-policy": [
        "LET’S MAKE IT RIGHT",
        "Jika file rusak, tidak dapat diakses, atau berbeda secara material dari deskripsi produk, hubungi studio dengan nomor order dan rincian masalah.\n\nPermintaan ditinjau berdasarkan ketentuan produk dan hukum yang berlaku. Jangan mengirimkan informasi kartu pembayaran. Refund yang diverifikasi oleh gateway akan memperbarui order dan akses unduhan.",
      ],
    };
    return (
      <div className="page">
        <Heading
          tag="STUDIO INFORMATION"
          title={custom?.title || copy[section][0]}
        />
        {!custom && (
          <p className="notice">
            Draft kebijakan — pemilik studio perlu meninjau dan melengkapi
            sebelum toko diluncurkan untuk publik.
          </p>
        )}
        <RichText text={custom?.description || copy[section][1]} />
        <Link
          href="/contact"
          className="button outline"
          style={{ marginTop: 40 }}
        >
          CONTACT THE STUDIO <ArrowUpRight />
        </Link>
      </div>
    );
  }
  notFound();
}
async function Wishlist({ userId }: { userId: string }) {
  const items = await db.wishlist.findMany({
    where: { userId, product: { status: "PUBLISHED" } },
    include: { product: { include: { prices: true } } },
  });
  return (
    <div className="work-grid">
      {items.map((i, n) => (
        <div key={i.productId}>
          <WorkCard work={i.product} index={n} shop />
          <ActionButton
            path="/api/account/wishlist"
            payload={{ productId: i.productId, remove: true }}
            label="Hapus dari wishlist"
          />
        </div>
      ))}
      {!items.length && <p className="empty-state">Wishlist masih kosong.</p>}
    </div>
  );
}
async function Downloads({ userId }: { userId: string }) {
  const entitlements = await db.entitlement.findMany({
    where: { userId, revoked: false, orderItem: { order: { status: "PAID" } } },
    include: { orderItem: true },
  });
  const products = await db.product.findMany({
    where: { id: { in: entitlements.map((e) => e.productId) } },
    include: {
      files: { include: { media: { select: { name: true, size: true } } } },
    },
  });
  return (
    <div>
      {entitlements.map((e) => (
        <div className="panel" key={e.id} style={{ marginBottom: 20 }}>
          <h2>{e.orderItem.title}</h2>
          <p>
            {e.orderItem.license} · {e.downloads} download(s)
          </p>
          <p>{e.orderItem.terms}</p>
          {products
            .find((p) => p.id === e.productId)
            ?.files.map((f) => (
              <a
                className="button outline"
                key={f.id}
                href={"/api/download/" + f.id}
                style={{ marginTop: 10 }}
              >
                ↓ {f.media.name} · {(f.media.size / 1024 / 1024).toFixed(1)} MB
                · v{f.version}
              </a>
            ))}
        </div>
      ))}
      {!entitlements.length && (
        <div className="empty-state">
          Aset yang telah dibeli akan tampil di sini.
        </div>
      )}
    </div>
  );
}
