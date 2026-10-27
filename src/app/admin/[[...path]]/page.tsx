import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db, configured } from "@/lib/db";
import { settings } from "@/lib/content";
import {
  AdminShell,
  AdminTable,
  Editor,
  MediaLibrary,
  adminModules,
} from "@/components/admin";
import { ProfileForm, ActionButton } from "@/components/forms";
import { money } from "@/lib/format";
export const metadata = {
  title: "Studio admin",
  robots: { index: false, follow: false },
};
const serial = (v: unknown) => JSON.parse(JSON.stringify(v));
export default async function Admin({
  params,
}: {
  params: Promise<{ path?: string[] }>;
}) {
  const { path = [] } = await params;
  const sectionKey = path[0] || "";
  if (sectionKey === "login") redirect("/login?admin=1");
  if (!configured())
    return (
      <AdminShell email="Setup required">
        <div className="admin-title">
          <h1>Connect your studio.</h1>
        </div>
        <div className="panel">
          <h2>CMS siap dikonfigurasi.</h2>
          <p>
            Dashboard memerlukan PostgreSQL dan akun owner. Akses admin tidak
            dibuka tanpa autentikasi.
          </p>
          <ol
            style={{ paddingLeft: 20, color: "var(--muted)", lineHeight: 2.4 }}
          >
            <li>
              Salin .env.example ke .env dan isi DATABASE_URL, DIRECT_URL,
              NEXTAUTH_SECRET, dan NEXTAUTH_URL.
            </li>
            <li>Jalankan npm run db:migrate.</li>
            <li>
              Isi OWNER_EMAIL dan OWNER_PASSWORD, lalu jalankan npm run db:seed.
            </li>
            <li>Restart server, lalu masuk menggunakan akun owner.</li>
          </ol>
          <Link className="button" href="/login?admin=1">
            OWNER SIGN IN ↗
          </Link>
        </div>
      </AdminShell>
    );
  let user;
  try {
    user = await requireAdmin();
  } catch {
    redirect("/login?admin=1");
  }
  let content: React.ReactNode;
  if (!sectionKey || sectionKey === "analytics") {
    const [
      revenue,
      orders,
      pending,
      products,
      projects,
      customers,
      downloads,
      messages,
      recent,
    ] = await Promise.all([
      db.order.aggregate({ _sum: { total: true }, where: { status: "PAID" } }),
      db.order.count(),
      db.order.count({ where: { status: "PENDING" } }),
      db.product.count(),
      db.project.count(),
      db.user.count({ where: { role: "CUSTOMER" } }),
      db.downloadLog.count(),
      db.inquiry.count({ where: { status: "NEW" } }),
      db.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { name: true, email: true } }, items: true },
      }),
    ]);
    const paid = await db.order.findMany({
      where: {
        status: "PAID",
        paidAt: { gte: new Date(Date.now() - 6 * 30 * 86400000) },
      },
      select: { total: true, paidAt: true },
    });
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - 5 + i);
      const key = date.toISOString().slice(0, 7);
      return {
        label: date.toLocaleDateString("id-ID", { month: "short" }),
        total: paid
          .filter((p) => p.paidAt?.toISOString().startsWith(key))
          .reduce((s, p) => s + p.total, 0),
      };
    });
    const max = Math.max(1, ...months.map((m) => m.total));
    content = (
      <>
        <div className="admin-title">
          <div>
            <span className="eyebrow">WELCOME TO YOUR CONTROL ROOM</span>
            <h1 style={{ marginTop: 10 }}>
              Studio overview<span className="red">.</span>
            </h1>
          </div>
          <Link className="button" href="/admin/products">
            MANAGE PRODUCTS ↗
          </Link>
        </div>
        <div className="stat-grid">
          {[
            ["Revenue", money(revenue._sum.total || 0)],
            ["Orders", orders],
            ["Pending payments", pending],
            ["Products", products],
            ["Portfolio projects", projects],
            ["Customers", customers],
            ["Downloads", downloads],
            ["New inquiries", messages],
          ].map(([label, value]) => (
            <div className="stat-box" key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>Revenue · last 6 months</h2>
          <div className="chart-bars">
            {months.map((m) => (
              <div
                key={m.label}
                className="chart-bar"
                style={{ height: Math.max(2, (m.total / max) * 100) + "%" }}
              >
                <strong>{money(m.total)}</strong>
                <span>{m.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 40 }}>
          <AdminTable module="orders" rows={serial(recent)} />
        </div>
      </>
    );
  } else if (["settings", "homepage", "navigation"].includes(sectionKey))
    content = (
      <>
        <div className="admin-title">
          <h1>
            {sectionKey === "homepage"
              ? "Homepage builder"
              : "Brand & settings"}
          </h1>
        </div>
        <Editor module={sectionKey} value={serial(await settings())} />
      </>
    );
  else if (sectionKey === "security")
    content = (
      <>
        <div className="admin-title">
          <h1>Account & security</h1>
        </div>
        <div className="panel">
          <p>
            Role: {user.role}. Perubahan password membatalkan semua sesi lama.
          </p>
          <ProfileForm name={user.name} />
        </div>
        <div className="panel" style={{ marginTop: 25 }}>
          <h2>Email delivery</h2>
          <p>
            Retry email transaksional yang belum terkirim. Tidak mengubah status
            pembayaran.
          </p>
          <ActionButton
            path="/api/admin/email"
            payload={{}}
            label="Retry pending email"
          />
        </div>
      </>
    );
  else if (sectionKey === "media")
    content = (
      <MediaLibrary
        rows={serial(
          await db.media.findMany({
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
        )}
      />
    );
  else {
    let rows: unknown[];
    switch (sectionKey) {
      case "portfolio":
        rows = await db.project.findMany({
          orderBy: { updatedAt: "desc" },
          take: 200,
        });
        break;
      case "products":
        rows = await db.product.findMany({
          include: { prices: true, files: true },
          orderBy: { updatedAt: "desc" },
          take: 200,
        });
        break;
      case "categories":
        rows = await db.category.findMany();
        break;
      case "orders":
        rows = await db.order.findMany({
          include: {
            user: { select: { email: true, name: true } },
            items: true,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });
        break;
      case "customers":
        rows = await db.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            deletionRequested: true,
          },
          take: 200,
        });
        break;
      case "coupons":
        rows = await db.coupon.findMany();
        break;
      case "reviews":
        rows = await db.review.findMany({
          include: { product: { select: { title: true } } },
          take: 200,
        });
        break;
      case "messages":
      case "commissions":
        rows = await db.inquiry.findMany({
          where: {
            kind: sectionKey === "commissions" ? "COMMISSION" : "CONTACT",
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        });
        break;
      case "services":
      case "blog":
      case "pages":
      case "testimonials":
        rows = await db.content.findMany({
          where: { kind: sectionKey },
          orderBy: { updatedAt: "desc" },
          take: 200,
        });
        break;
      case "audit-logs":
        rows = await db.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 200,
        });
        break;
      default:
        notFound();
    }
    content = <AdminTable module={sectionKey} rows={serial(rows)} />;
  }
  return <AdminShell email={user.email}>{content}</AdminShell>;
}
