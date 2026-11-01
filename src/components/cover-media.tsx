const VIDEO = /\.(mp4|webm|mov)(\?|#|$)/i;
export const isVideoUrl = (url?: string | null) => VIDEO.test(url || "");
export function CoverMedia({
  src,
  alt,
  className,
  lazy = true,
}: {
  src: string;
  alt: string;
  className?: string;
  lazy?: boolean;
}) {
  if (isVideoUrl(src))
    return (
      <video
        className={className}
        src={src}
        aria-label={alt}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={lazy ? "lazy" : undefined}
    />
  );
}
