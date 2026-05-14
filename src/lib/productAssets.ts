const PRODUCT_ASSET_BASE_URL =
  import.meta.env.VITE_PRODUCT_ASSET_BASE_URL || "https://admin.centralcelulares.com.py";

export function resolveProductImageUrl(rawImage?: string): string | undefined {
  if (!rawImage) return undefined;
  if (
    rawImage.startsWith("http") ||
    rawImage.startsWith("blob:") ||
    rawImage.startsWith("data:")
  ) {
    return rawImage;
  }

  const normalizedPath = rawImage.startsWith("/") ? rawImage : `/${rawImage}`;
  return `${PRODUCT_ASSET_BASE_URL.replace(/\/$/, "")}${normalizedPath}`;
}
