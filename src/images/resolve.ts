// Turns an image link from the sheet into a downloadable image URL (ARCHITECTURE §6, D1, D11).
// Used by the image job (GitHub Actions or the owner's PC); never called while serving pages.

export type SourceKind = "pin_short" | "pinterest_pin" | "share_google" | "direct" | "invalid";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36";

/** First http(s) URL in a cell — also repairs a URL pasted twice ("https://a…https://a…"). */
export function extractFirstUrl(cell: string | null | undefined): string | null {
  if (!cell) return null;
  const match = cell.trim().match(/https?:\/\/.+?(?=https?:\/\/|\s|$)/i);
  return match ? match[0] : null;
}

export function classifySource(url: string): SourceKind {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "invalid";
  }
  if (host === "pin.it") return "pin_short";
  if (/(^|\.)pinterest\.[a-z.]+$/.test(host) && /\/pin\//.test(url)) return "pinterest_pin";
  if (host === "share.google") return "share_google";
  return "direct";
}

/** i.pinimg.com/736x/ab/cd/… → i.pinimg.com/originals/ab/cd/… */
export function toOriginalSize(pinimgUrl: string): string {
  return pinimgUrl.replace(/(i\.pinimg\.com\/)[^/]+\//, "$1originals/");
}

/** Reads og:image (either attribute order) or, failing that, the first i.pinimg.com 736x image. */
export function findPinImage(html: string): string | null {
  const meta =
    html.match(/<meta[^>]+(?:property|name)="og:image"[^>]+content="([^"]+)"/i) ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="og:image"/i);
  if (meta) return meta[1];
  const fallback = html.match(/https:\/\/i\.pinimg\.com\/736x\/[0-9a-f/]+\.(?:jpg|jpeg|png|webp)/i);
  return fallback ? fallback[0] : null;
}

export type ResolveResult =
  | { ok: true; kind: SourceKind; imageUrls: string[] }
  | { ok: false; kind: SourceKind; reason: string };

/** Candidate image URLs to try in order (largest first). Does not download the image itself. */
export async function resolveImageSource(url: string, fetchImpl: typeof fetch = fetch): Promise<ResolveResult> {
  const kind = classifySource(url);
  if (kind === "invalid") return { ok: false, kind, reason: "not a valid URL" };
  if (kind === "share_google") return { ok: false, kind, reason: "share.google links are not fetched — please replace (D11)" };
  if (kind === "direct") return { ok: true, kind, imageUrls: [url] };

  let res: Response;
  try {
    res = await fetchImpl(url, { redirect: "follow", headers: { "user-agent": BROWSER_UA, accept: "text/html" } });
  } catch (err) {
    return { ok: false, kind, reason: `network error: ${(err as Error).message}` };
  }
  if (!res.ok) return { ok: false, kind, reason: `Pinterest answered HTTP ${res.status}` };
  const image = findPinImage(await res.text());
  if (!image) return { ok: false, kind, reason: "no og:image on the pin page (blocked or markup changed)" };
  const original = toOriginalSize(image);
  return { ok: true, kind, imageUrls: original === image ? [image] : [original, image] };
}
