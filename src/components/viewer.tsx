"use client";
import dynamic from "next/dynamic";
import { useState, Component, type ReactNode } from "react";
const Scene = dynamic(() => import("./viewer-scene"), {
  ssr: false,
  loading: () => <div className="empty-state">Menyiapkan viewer 3D…</div>,
});
class ViewerBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="empty-state">
        Model gagal dimuat atau WebGL tidak didukung. Coba browser lain atau
        gunakan gambar preview.
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function Viewer({
  url,
  poster,
}: {
  url: string;
  poster: string;
}) {
  const [active, setActive] = useState(false);
  return active ? (
    <ViewerBoundary>
      <Scene url={url} />
    </ViewerBoundary>
  ) : (
    <div className="viewer-poster">
      <img src={poster} alt="3D model poster" />
      <button className="button" onClick={() => setActive(true)}>
        LAUNCH 3D VIEWER ↗
      </button>
    </div>
  );
}
