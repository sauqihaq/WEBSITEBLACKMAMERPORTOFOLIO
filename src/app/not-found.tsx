import Link from "next/link";
export default function NotFound() {
  return (
    <div className="error-page">
      <span className="eyebrow">OUTSIDE THIS DIMENSION</span>
      <h1>
        404<span className="red">.</span>
      </h1>
      <p>Halaman yang lo cari belum ada di dunia ini.</p>
      <Link href="/" className="button">
        BACK TO THE STUDIO ↗
      </Link>
    </div>
  );
}
