import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

/**
 * QR preview.
 *
 * Rendered as SVG rather than a canvas/PNG so it stays sharp when the admin
 * prints a certificate cover sheet, and so it costs nothing to scale. Matches
 * how the Edge Function draws the QR into the PDF — vector, error-correction
 * level M, generous quiet zone.
 *
 * The URL is always shown as text beneath it: a QR that will not scan (dirty
 * lens, cracked screen, bad print) must never be the only way to reach the
 * record.
 */
export function QrPreview({
  value, size = 176, className, showUrl = true,
}: {
  value: string;
  size?: number;
  className?: string;
  showUrl?: boolean;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    QRCode.toString(value, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
      color: { dark: '#120d0a', light: '#ffffff' },
    })
      .then((out) => !cancelled && setSvg(out))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [value]);

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div
        className="overflow-hidden rounded-lg bg-white p-2 ring-1 ring-slate-300/15"
        style={{ width: size, height: size }}
      >
        {svg ? (
          <div
            className="size-full [&>svg]:size-full"
            aria-label={`QR code linking to ${value}`}
            role="img"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : failed ? (
          <div className="grid size-full place-items-center text-center font-sans text-[0.6875rem] text-slate-500">
            QR unavailable
          </div>
        ) : (
          <div className="size-full animate-pulse rounded bg-slate-400/10" />
        )}
      </div>

      {showUrl && (
        <p className="mt-2.5 max-w-[16rem] break-all text-center font-mono text-[0.6875rem] leading-relaxed text-slate-500">
          {value.replace(/^https?:\/\//, '')}
        </p>
      )}
    </div>
  );
}
