/**
 * Launcher-ikonin URL. Sama origin (/static/…), koska ikonit generoidaan
 * ajon aikana palvelimelle — CDN-bundle ei sisällä niitä.
 *
 * Uudet ikonit tallennetaan tiedostopäätteen kanssa (esim. "abc123.svg").
 * Vanhat ikonit ovat pelkkä id ilman päätettä → oletetaan legacy .webp.
 */
export function appIconSrc(iconId: string | null | undefined): string | null {
  if (!iconId) return null;
  const file = iconId.includes(".") ? iconId : `${iconId}.webp`;
  return `/static/app-icons/${file}`;
}

/**
 * PNG-variantin URL (esim. iOS apple-touch-icon, joka ei tue SVG:tä).
 * Uudet SVG-ikonit tallennetaan PNG-sisaren kanssa; muille palautetaan sama tiedosto.
 */
export function appIconPngSrc(iconId: string | null | undefined): string | null {
  if (!iconId) return null;
  if (iconId.endsWith(".svg")) return `/static/app-icons/${iconId.slice(0, -4)}.png`;
  return appIconSrc(iconId);
}

/** Best-guess MIME type for an icon reference, for <link type="…"> hints. */
export function appIconMimeType(iconId: string | null | undefined): string | null {
  if (!iconId) return null;
  if (iconId.endsWith(".svg")) return "image/svg+xml";
  if (iconId.endsWith(".png")) return "image/png";
  return "image/webp";
}
