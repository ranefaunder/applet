/**
 * Launcher-ikonin URL. Sama origin (/static/…), koska ikonit generoidaan
 * ajon aikana palvelimelle — CDN-bundle ei sisällä niitä.
 */
export function appIconSrc(iconId: string | null | undefined): string | null {
  if (!iconId) return null;
  return `/static/app-icons/${iconId}.webp`;
}
