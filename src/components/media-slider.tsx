"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isVideoUrl } from "./cover-media";

export type Slide = { url: string; type?: string; caption?: string };

export function MediaSlider({
  slides,
  title,
}: {
  slides: Slide[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const touch = useRef<number | null>(null);
  const count = slides.length;
  const go = (i: number) => setIndex((i + count) % count);
  useEffect(() => {
    root.current
      ?.querySelectorAll("video")
      .forEach((v, n) => (n === index ? undefined : v.pause()));
  }, [index]);
  if (!count) return null;
  const isVideo = (s: Slide) => s.type === "video" || isVideoUrl(s.url);
  return (
    <div
      className="slider"
      ref={root}
      tabIndex={0}
      aria-roledescription="carousel"
      aria-label={title}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      <div
        className="slider-viewport"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null || count < 2) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        }}
      >
        <div
          className="slider-track"
          style={{ transform: "translateX(-" + index * 100 + "%)" }}
        >
          {slides.map((s, i) => (
            <div
              className="slider-slide"
              key={s.url + i}
              aria-hidden={i !== index}
            >
              {isVideo(s) ? (
                <video
                  src={s.url}
                  controls
                  playsInline
                  preload="metadata"
                  aria-label={s.caption || title + " " + (i + 1)}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.url}
                  alt={s.caption || title + " " + (i + 1)}
                  loading={i === 0 ? undefined : "lazy"}
                  draggable={false}
                />
              )}
            </div>
          ))}
        </div>
        {count > 1 && (
          <>
            <button
              type="button"
              className="slider-arrow left"
              aria-label="Sebelumnya"
              onClick={() => go(index - 1)}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="slider-arrow right"
              aria-label="Berikutnya"
              onClick={() => go(index + 1)}
            >
              <ChevronRight size={22} />
            </button>
            <span className="slider-count">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>
      {slides[index].caption && (
        <p className="slider-caption">{slides[index].caption}</p>
      )}
      {count > 1 && (
        <div className="slider-thumbs">
          {slides.map((s, i) => (
            <button
              type="button"
              key={s.url + i}
              className={i === index ? "active" : ""}
              aria-label={"Tampilkan media " + (i + 1)}
              onClick={() => setIndex(i)}
            >
              {isVideo(s) ? (
                <video src={s.url} muted preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.url} alt="" loading="lazy" draggable={false} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
