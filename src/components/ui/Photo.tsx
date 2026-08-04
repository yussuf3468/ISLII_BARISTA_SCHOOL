import { useEffect, useRef, useState } from 'react';
import { getPhoto, type PhotoKey } from '@/lib/images';
import { cn } from '@/lib/utils';

export type PhotoOverlay = 'none' | 'soft' | 'strong' | 'bottom' | 'duotone';

export interface PhotoProps {
  /** Key into the image registry. Alt text comes with it automatically. */
  name: PhotoKey;
  /** Crop ratio (w/h). Defaults to the photo's native ratio. */
  ratio?: number;
  /** `sizes` attribute — tells the browser which srcset entry to pick. */
  sizes?: string;
  /** Largest width this image is ever rendered at, in CSS px. */
  width?: number;
  className?: string;
  imgClassName?: string;
  /** Load eagerly with high priority. Use for above-the-fold images ONLY. */
  priority?: boolean;
  /** Slow scale-up on hover of the nearest `.group` ancestor. */
  zoom?: boolean;
  overlay?: PhotoOverlay;
  /** Override the registry's alt text, or pass "" for decorative images. */
  alt?: string;
}

const OVERLAYS: Record<PhotoOverlay, string> = {
  none: '',
  soft: 'bg-gradient-to-t from-espresso-950/65 via-espresso-950/12 to-transparent',
  strong: 'bg-espresso-950/45',
  bottom: 'bg-gradient-to-t from-espresso-950 via-espresso-950/45 to-transparent',
  duotone: 'bg-espresso-900/55 mix-blend-multiply',
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Photo — every image on the site goes through here.
 * ─────────────────────────────────────────────────────────────────────────────
 *  Handles, in one place:
 *    · Responsive `srcset` + `sizes` so phones never download a 2560px file
 *    · AVIF/WebP negotiation via the CDN's `auto=format`
 *    · Zero layout shift — the frame reserves the aspect ratio before load
 *    · Colour-matched blur-up: the frame is painted the photo's true average
 *      colour, so loading reads as a gentle tonal fade instead of a white flash
 *    · Correct decoding/loading/fetchpriority hints per position
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function Photo({
  name,
  ratio,
  sizes = '100vw',
  width = 1600,
  className,
  imgClassName,
  priority = false,
  zoom = false,
  overlay = 'none',
  alt,
}: PhotoProps) {
  const photo = getPhoto(name, { width, ratio });
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // An image served from cache can finish before React attaches onLoad, which
  // would leave it stuck at opacity 0. Check `complete` once on mount.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{
        backgroundColor: photo.tone,
        aspectRatio: ratio ?? photo.ratio,
      }}
    >
      <img
        ref={imgRef}
        src={photo.src}
        srcSet={photo.srcSet}
        sizes={sizes}
        alt={alt ?? photo.alt}
        width={Math.round(width)}
        height={Math.round(width / (ratio ?? photo.ratio))}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={() => setLoaded(true)}
        className={cn(
          'absolute inset-0 size-full object-cover',
          'transition-[opacity,transform] duration-[1200ms] ease-luxe',
          loaded ? 'opacity-100' : 'opacity-0',
          zoom && 'group-hover:scale-[1.06] motion-reduce:group-hover:scale-100',
          imgClassName,
        )}
      />

      {overlay !== 'none' && (
        <div aria-hidden="true" className={cn('absolute inset-0', OVERLAYS[overlay])} />
      )}
    </div>
  );
}
