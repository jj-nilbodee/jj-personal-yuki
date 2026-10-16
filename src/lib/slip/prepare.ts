// Browser-only: shrink the photo before upload and look for a slip QR offline.
// jsQR is ~50 KB gzipped and only needed once a photo is picked, so it is
// loaded then instead of with every page of the app.
import type decodeQr from 'jsqr';

type JsQR = typeof decodeQr;

const MAX_DIMENSION = 1600;

export interface PreparedSlip {
  blob: Blob;
  qrText: string | null;
}

export async function prepareSlip(file: File): Promise<PreparedSlip> {
  const [bitmap, { default: jsQR }] = await Promise.all([createImageBitmap(file), import('jsqr')]);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const qrText = findQr(jsQR, ctx, canvas.width, canvas.height);

  // Safari can't encode WebP and silently returns PNG, so fall back to JPEG.
  let blob = await toBlob(canvas, 'image/webp', 0.82);
  if (blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', 0.85);
  return { blob, qrText };
}

function findQr(jsQR: JsQR, ctx: CanvasRenderingContext2D, width: number, height: number): string | null {
  const full = ctx.getImageData(0, 0, width, height);
  const hit = jsQR(full.data, width, height, { inversionAttempts: 'dontInvert' });
  if (hit) return hit.data;
  // Slip QRs are small and usually sit in the lower half; retry on that region.
  const top = Math.floor(height / 2);
  const lower = ctx.getImageData(0, top, width, height - top);
  return jsQR(lower.data, width, height - top, { inversionAttempts: 'attemptBoth' })?.data ?? null;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), type, quality),
  );
}
