"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
const Scene = dynamic(() => import("./viewer-scene"), { ssr: false });
function PortraitDepth({ image }: { image: string }) {
  const portrait = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const element = portrait.current;
    const hero = element?.closest<HTMLElement>(".hero");
    if (!element || !hero) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function reset() {
      for (const key of ["--portrait-x", "--portrait-y", "--portrait-rx", "--portrait-ry"])
        element!.style.removeProperty(key);
    }
    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse" || reducedMotion.matches ||
          document.documentElement.dataset.motion === "false") {
        reset();
        return;
      }
      const bounds = hero!.getBoundingClientRect();
      const x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5));
      const y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5));
      element!.style.setProperty("--portrait-x", `${x * 26}px`);
      element!.style.setProperty("--portrait-y", `${y * 16}px`);
      element!.style.setProperty("--portrait-rx", `${-y * 7}deg`);
      element!.style.setProperty("--portrait-ry", `${x * 10}deg`);
    }
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", reset);
    hero.addEventListener("pointercancel", reset);
    reducedMotion.addEventListener("change", reset);
    return () => {
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", reset);
      hero.removeEventListener("pointercancel", reset);
      reducedMotion.removeEventListener("change", reset);
    };
  }, []);
  return <img ref={portrait} className="hero-portrait" src={image}
    alt="Portrait — BLACKMAMERSTUDIO" fetchPriority="high" draggable={false} />;
}
export function HeroMedia({
  mode,
  image,
  video,
  model,
}: {
  mode: string;
  image: string;
  video: string;
  model: string;
}) {
  if (mode === "video" && video)
    return (
      <video
        className="hero-video"
        src={video}
        autoPlay
        loop
        muted
        playsInline
        poster={image}
      />
    );
  if (mode === "gradient") return <div className="hero-gradient" />;
  if (mode === "model" && model)
    return (
      <div className="hero-model">
        <Scene url={model} />
      </div>
    );
  return <PortraitDepth image={image} />;
}
