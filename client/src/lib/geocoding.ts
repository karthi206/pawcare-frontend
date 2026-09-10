import { apiFetch } from "./api-client";

// In-memory cache for resolved coordinate addresses to avoid redundant network requests
const geocodeCache = new Map<string, string>();

/**
 * Checks if a string looks like raw coordinates e.g. "13.0567, 80.1637"
 */
export function isCoordinateString(str?: string | null): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  const parts = trimmed.split(",");
  if (parts.length !== 2) return false;
  const lat = parseFloat(parts[0].trim());
  const lng = parseFloat(parts[1].trim());
  return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Formats structured address components into a clean, human-readable wording address.
 */
function cleanAddressParts(parts: (string | undefined | null)[]): string {
  const seen = new Set<string>();
  const cleanList: string[] = [];

  for (const part of parts) {
    if (!part) continue;
    const clean = part
      .replace(/\s+Corporation\b/gi, "")
      .replace(/\s+District\b/gi, "")
      .trim();
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      cleanList.push(clean);
    }
  }

  return cleanList.join(", ");
}

/**
 * Reverse geocodes latitude and longitude into a clean wording address.
 * Uses a multi-tiered strategy:
 * 1. Backend proxy (/geocode/reverse)
 * 2. Client-side OpenStreetMap Nominatim
 * 3. Client-side BigDataCloud reverse geocode
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  // 1. Attempt via Backend API
  try {
    const res = await apiFetch(`/geocode/reverse?lat=${lat}&lng=${lng}`, { timeoutMs: 6000 });
    if (res.ok) {
      const data = await res.json();
      if (data?.address) {
        geocodeCache.set(cacheKey, data.address);
        return data.address;
      }
    }
  } catch (err) {
    console.warn("Backend reverse geocode attempt failed, falling back to direct lookup:", err);
  }

  // 2. Direct browser call to OpenStreetMap Nominatim
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const osmRes = await fetch(osmUrl, {
      headers: { Accept: "application/json" },
    });
    if (osmRes.ok) {
      const osmData = await osmRes.json();
      const addr = osmData.address || {};
      const road = addr.road || addr.pedestrian;
      const neighborhood = addr.neighbourhood || addr.suburb || addr.residential;
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county;
      const state = addr.state;

      const formatted = cleanAddressParts([road, neighborhood, city, state]);
      if (formatted) {
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
      if (osmData.display_name) {
        geocodeCache.set(cacheKey, osmData.display_name);
        return osmData.display_name;
      }
    }
  } catch (osmErr) {
    console.warn("Direct Nominatim lookup failed, falling back to BigDataCloud:", osmErr);
  }

  // 3. Direct browser call to BigDataCloud free reverse geocode
  try {
    const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const bdcRes = await fetch(bdcUrl);
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const formatted = cleanAddressParts([
        bdcData.locality,
        bdcData.city,
        bdcData.principalSubdivision,
      ]);
      if (formatted) {
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch (bdcErr) {
    console.warn("BigDataCloud lookup failed:", bdcErr);
  }

  return "";
}
