"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { signIn, signOut } from "next-auth/react";
import { useForm } from "react-hook-form";
import { api, ArrowUpRight } from "./site";
type Fields = Record<string, string>;
export function ContactForm({ commission = false }: { commission?: boolean }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<Fields>();
  const [message, setMessage] = useState("");
  return (
    <form
      className="form-grid"
      onSubmit={handleSubmit(async (data) => {
        setMessage("");
        try {
          const token = (
            document.querySelector(
              '[name="cf-turnstile-response"]',
            ) as HTMLInputElement | null
          )?.value;
          const r = await api("/api/contact", {
            ...data,
            kind: commission ? "COMMISSION" : "CONTACT",
            turnstileToken: token,
          });
          setMessage(r.message);
          reset();
        } catch (e) {
          setMessage((e as Error).message);
        }
      })}
    >
      <label>
        Nama lengkap
        <input
          required
          minLength={2}
          autoComplete="name"
          {...register("name")}
        />
      </label>
      <label>
        Email
        <input
          required
          type="email"
          autoComplete="email"
          {...register("email")}
        />
      </label>
      {commission && (
        <>
          <label>
            Perusahaan / brand
            <input {...register("company")} />
          </label>
          <label>
            Budget
            <select {...register("budget")}>
              <option>Belum ditentukan</option>
              <option>Di bawah Rp 2.000.000</option>
              <option>Rp 2.000.000–5.000.000</option>
              <option>Rp 5.000.000–15.000.000</option>
              <option>Di atas Rp 15.000.000</option>
            </select>
          </label>
          <label>
            Target deadline
            <input type="date" {...register("deadline")} />
          </label>
        </>
      )}
      <label className="full">
        {commission ? "Jenis project" : "Subject"}
        <input
          required
          minLength={2}
          {...register("subject")}
          placeholder="Ceritain ide lo dalam satu kalimat"
        />
      </label>
      <label className="full">
        Tentang project lo
        <textarea
          required
          minLength={20}
          {...register("message")}
          placeholder="Tujuan, style, kebutuhan deliverable, dan referensi…"
        />
      </label>
      <label className="honeypot" aria-hidden="true">
        Website
        <input
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
          defaultValue=""
        />
      </label>
      {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" />
          <div
            className="cf-turnstile"
            data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
          />
        </>
      )}
      <div className="full">
        <button className="button" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "LET’S START SOMETHING"}
          <ArrowUpRight size={18} />
        </button>
        <p className="form-status" role="status">
          {message}
        </p>
        <p className="tiny muted" style={{ marginTop: 15 }}>
          Dengan mengirim, lo menyetujui{" "}
          <Link href="/privacy">kebijakan privasi</Link>.
        </p>
      </div>
    </form>
  );
}
export function AuthForm({ mode = "login" }: { mode?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Fields>();
  const titles: Record<string, string> = {
    login: "WELCOME BACK.",
    register: "JOIN THE STUDIO.",
    "forgot-password": "RESET ACCESS.",
    "reset-password": "NEW PASSWORD.",
    "verify-email": "VERIFY EMAIL.",
  };
  return (
    <div className="auth-card">
      <span className="eyebrow">BLACKMAMERSTUDIO / ACCOUNT</span>
      <h1>{titles[mode] || titles.login}</h1>
      <form
        onSubmit={handleSubmit(async (data) => {
          setMessage("");
          try {
            if (mode === "login") {
              const result = await signIn("credentials", {
                ...data,
                redirect: false,
              });
              if (result?.error)
                throw new Error(
                  "Login gagal. Periksa email/password dan konfigurasi database.",
                );
              router.push(params.get("admin") === "1" ? "/admin" : "/account");
              router.refresh();
            } else {
              const r = await api("/api/account/" + mode, {
                ...data,
                token: params.get("token"),
              });
              setMessage(r.message);
            }
          } catch (e) {
            setMessage((e as Error).message);
          }
        })}
      >
        {mode === "register" && (
          <label>
            Nama
            <input
              required
              {...register("name")}
              autoComplete="name"
              minLength={2}
            />
          </label>
        )}
        {["login", "register", "forgot-password"].includes(mode) && (
          <label>
            Email
            <input
              required
              type="email"
              autoComplete="email"
              {...register("email")}
            />
          </label>
        )}
        {["login", "register", "reset-password"].includes(mode) && (
          <label>
            Password
            <input
              required
              minLength={mode === "login" ? 1 : 12}
              maxLength={128}
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              {...register("password")}
            />
            {mode !== "login" && <small>Minimum 12 karakter.</small>}
          </label>
        )}
        <button className="button" disabled={isSubmitting}>
          {isSubmitting
            ? "Memproses…"
            : mode === "login"
              ? "SIGN IN"
              : mode === "register"
                ? "CREATE ACCOUNT"
                : mode === "verify-email"
                  ? "VERIFY MY EMAIL"
                  : "CONTINUE"}
          <ArrowUpRight size={17} />
        </button>
        <p role="status" className="form-status">
          {message}
        </p>
      </form>
      <div className="auth-links">
        <Link href={mode === "register" ? "/login" : "/register"}>
          {mode === "register" ? "Sudah punya akun? Masuk" : "Buat akun baru"}
        </Link>
        <Link href="/forgot-password">Lupa password?</Link>
      </div>
    </div>
  );
}
export function Logout() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/" })}>Keluar ↗</button>
  );
}
export function ActionButton({
  path,
  payload,
  label,
}: {
  path: string;
  payload: unknown;
  label: string;
}) {
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        className="button outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const r = await api(path, payload);
            setNotice(r.message || r.status || "Berhasil.");
            router.refresh();
          } catch (e) {
            setNotice((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Memproses…" : label}
      </button>
      <span className="form-status" role="status">
        {notice}
      </span>
    </>
  );
}
export function ProfileForm({ name }: { name: string }) {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Fields>({ defaultValues: { name } });
  const [message, setMessage] = useState("");
  return (
    <form
      className="form-grid"
      onSubmit={handleSubmit(async (data) => {
        try {
          const r = await api("/api/account/profile", {
            ...data,
            newPassword: data.newPassword || undefined,
            currentPassword: data.currentPassword || undefined,
          });
          setMessage(r.message);
        } catch (e) {
          setMessage((e as Error).message);
        }
      })}
    >
      <label className="full">
        Nama
        <input required {...register("name")} />
      </label>
      <label>
        Password saat ini
        <input
          type="password"
          autoComplete="current-password"
          {...register("currentPassword")}
        />
      </label>
      <label>
        Password baru
        <input
          type="password"
          minLength={12}
          autoComplete="new-password"
          {...register("newPassword")}
        />
      </label>
      <button disabled={isSubmitting} className="button">
        Simpan perubahan
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
export function ReviewForm({ productId }: { productId: string }) {
  const [message, setMessage] = useState("");
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        try {
          const r = await api("/api/account/review", {
            productId,
            rating: Number(data.get("rating")),
            text: data.get("text"),
          });
          setMessage(r.message);
        } catch (err) {
          setMessage((err as Error).message);
        }
      }}
    >
      <label>
        Rating
        <select name="rating">
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} / 5
            </option>
          ))}
        </select>
      </label>
      <label className="full">
        Review
        <textarea name="text" minLength={10} required />
      </label>
      <button className="button outline">Kirim review pembelian</button>
      <p role="status">{message}</p>
    </form>
  );
}
