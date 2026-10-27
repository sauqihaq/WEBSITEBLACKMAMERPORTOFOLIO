"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="error-page">
      <h1 style={{ fontSize: 65 }}>A SMALL DETOUR.</h1>
      <p>
        Halaman belum dapat dimuat. Periksa koneksi dan konfigurasi layanan.
      </p>
      <button className="button" onClick={reset}>
        COBA LAGI ↗
      </button>
    </div>
  );
}
