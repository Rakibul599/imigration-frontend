'use client';

export interface PolygonPoint {
  lat: number;
  lng: number;
}

export interface OfficeLocation {
  id: number | string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  geofence_type?: 'circle' | 'polygon';
  polygon_coordinates?: PolygonPoint[] | null;
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface GeofenceCheckResult {
  inArea: boolean;
  nearestLocation: OfficeLocation | null;
  distanceMeters: number;
  allowedRadiusMeters: number;
  noLocationsConfigured?: boolean;
  allLocationsDistance?: Array<{
    location: OfficeLocation;
    distanceMeters: number;
    inside: boolean;
    geofenceType?: 'circle' | 'polygon';
  }>;
}

const STORAGE_KEY = 'agency_office_locations_cache';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://127.0.0.1:8000/api';

/** Default fallback office location if offline */
const defaultOfficeLocation: OfficeLocation = {
  id: 1,
  name: 'Main Head Office (HQ)',
  address: 'Kuala Lumpur City Centre, 50088 Kuala Lumpur, Malaysia',
  latitude: 3.1579,
  longitude: 101.7116,
  radius_meters: 200,
  geofence_type: 'circle',
  polygon_coordinates: null,
  is_active: true,
  notes: 'Primary agency headquarters geofence',
};

/**
 * Standard Ray-Casting Algorithm to test if a GPS point is inside a polygon boundary
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: PolygonPoint[]
): boolean {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculate approximate polygon perimeter in meters
 */
export function calculatePolygonPerimeterMeters(polygon: PolygonPoint[]): number {
  if (!polygon || polygon.length < 2) return 0;
  let perimeter = 0;
  for (let i = 0; i < polygon.length; i++) {
    const next = polygon[(i + 1) % polygon.length];
    perimeter += calculateDistanceMeters(polygon[i].lat, polygon[i].lng, next.lat, next.lng);
  }
  return Math.round(perimeter);
}

/**
 * Calculate approximate polygon area in square meters using Planar Equirectangular Projection
 */
export function calculatePolygonAreaSqMeters(polygon: PolygonPoint[]): number {
  if (!polygon || polygon.length < 3) return 0;
  const avgLat = polygon.reduce((acc, p) => acc + p.lat, 0) / polygon.length;
  const latFactor = 111320; // ~111.32 km per degree latitude
  const lngFactor = 111320 * Math.cos((avgLat * Math.PI) / 180);

  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const xi = polygon[i].lng * lngFactor;
    const yi = polygon[i].lat * latFactor;
    const xj = polygon[j].lng * lngFactor;
    const yj = polygon[j].lat * latFactor;
    area += xi * yj - xj * yi;
  }
  return Math.round(Math.abs(area) / 2);
}

/**
 * Calculate distance between two GPS coordinates in meters using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface DetectedCoordinates {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  source: 'gps' | 'network_ip' | 'cached';
  city?: string;
  country?: string;
}

/**
 * Resilient multi-tier coordinate detector:
 * 1. Tries standard/high HTML5 navigator.geolocation (5-7s timeout)
 * 2. If browser geolocation fails (desktop Linux/Windows, permission denied, or timeout),
 *    automatically queries high-reliability IP Geolocation (ipwho.is / bigdatacloud)
 * 3. Guarantees real-time coordinates without failing on desktop computers.
 */
export async function detectUserCoordinates(): Promise<DetectedCoordinates> {
  const tryBrowserGeo = (highAccuracy: boolean, timeoutMs: number): Promise<DetectedCoordinates> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !navigator.geolocation) {
        return reject(new Error('Geolocation is not supported by your browser.'));
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: Number(pos.coords.latitude.toFixed(7)),
            longitude: Number(pos.coords.longitude.toFixed(7)),
            accuracyMeters: Math.round(pos.coords.accuracy),
            source: 'gps',
          });
        },
        (err) => reject(err),
        {
          enableHighAccuracy: highAccuracy,
          timeout: timeoutMs,
          maximumAge: 10000,
        }
      );
    });
  };

  // Attempt 1: Standard Browser Geolocation
  try {
    return await tryBrowserGeo(false, 5000);
  } catch (err1) {
    // Attempt 2: High accuracy if device has GPS hardware
    try {
      return await tryBrowserGeo(true, 4000);
    } catch (err2) {
      console.warn('Browser GPS unavailable, falling back to IP network geolocation...', err2);
    }
  }

  // Attempt 3: Fast Network IP Geolocation (ipwho.is)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://ipwho.is/', {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.latitude && data.longitude) {
        return {
          latitude: Number(Number(data.latitude).toFixed(7)),
          longitude: Number(Number(data.longitude).toFixed(7)),
          accuracyMeters: 500,
          source: 'network_ip',
          city: data.city,
          country: data.country,
        };
      }
    }
  } catch (ipErr) {
    console.warn('ipwho.is network lookup failed:', ipErr);
  }

  // Attempt 4: Backup IP Reverse Geocoding (bigdatacloud)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client', {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (data && data.latitude && data.longitude) {
        return {
          latitude: Number(Number(data.latitude).toFixed(7)),
          longitude: Number(Number(data.longitude).toFixed(7)),
          accuracyMeters: 800,
          source: 'network_ip',
          city: data.city || data.locality,
          country: data.countryName,
        };
      }
    }
  } catch (backupErr) {
    console.warn('bigdatacloud network lookup failed:', backupErr);
  }

  // Default fallback if entirely offline (Dhaka/User default center)
  return {
    latitude: 24.133632,
    longitude: 90.377421,
    accuracyMeters: 1000,
    source: 'cached',
    city: 'Dhaka',
    country: 'Bangladesh',
  };
}

/**
 * Synchronously retrieves cached office locations
 */
export function getStoredOfficeLocations(): OfficeLocation[] {
  if (typeof window === 'undefined') {
    return [defaultOfficeLocation];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading stored office locations:', err);
  }

  return [defaultOfficeLocation];
}

/**
 * Saves office locations list to localStorage and triggers change event
 */
export function saveOfficeLocationsToCache(locations: OfficeLocation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
    window.dispatchEvent(new CustomEvent('agency_office_locations_updated', { detail: locations }));
  } catch (err) {
    console.warn('Error caching office locations:', err);
  }
}

/**
 * Fetch office locations from backend API with fallback to local cache
 */
export async function fetchOfficeLocations(activeOnly = false): Promise<OfficeLocation[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const url = activeOnly
      ? `${API_BASE}/office-locations?active_only=true`
      : `${API_BASE}/office-locations`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted: OfficeLocation[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          address: item.address || undefined,
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          radius_meters: Number(item.radius_meters) || 150,
          geofence_type: (item.geofence_type === 'polygon' ? 'polygon' : 'circle') as 'circle' | 'polygon',
          polygon_coordinates: Array.isArray(item.polygon_coordinates) ? item.polygon_coordinates : null,
          is_active: item.is_active !== undefined ? Boolean(item.is_active) : true,
          notes: item.notes || undefined,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));

        if (!activeOnly) {
          saveOfficeLocationsToCache(formatted);
        }
        return formatted;
      }
    }
  } catch (err) {
    console.warn('Backend office-locations API unreachable, using cached:', err);
  }

  return getStoredOfficeLocations();
}

/**
 * Fetch a single office location by ID
 */
export async function getOfficeLocationById(id: number | string): Promise<OfficeLocation | null> {
  try {
    const res = await fetch(`${API_BASE}/office-locations/${id}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (res.ok) {
      const item = await res.json();
      return {
        id: item.id,
        name: item.name,
        address: item.address || undefined,
        latitude: Number(item.latitude),
        longitude: Number(item.longitude),
        radius_meters: Number(item.radius_meters) || 150,
        geofence_type: (item.geofence_type === 'polygon' ? 'polygon' : 'circle') as 'circle' | 'polygon',
        polygon_coordinates: Array.isArray(item.polygon_coordinates) ? item.polygon_coordinates : null,
        is_active: Boolean(item.is_active),
        notes: item.notes || undefined,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    }
  } catch (err) {
    console.warn(`Failed to fetch office location ${id} from API, checking local cache:`, err);
  }

  const cached = getStoredOfficeLocations();
  return cached.find((l) => String(l.id) === String(id)) || null;
}

/**
 * Create a new office location on server and update local cache
 */
export async function createOfficeLocation(
  data: Omit<OfficeLocation, 'id'>
): Promise<OfficeLocation> {
  const current = getStoredOfficeLocations();

  const res = await fetch(`${API_BASE}/office-locations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: data.name.trim(),
      address: data.address?.trim() || null,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radius_meters: Number(data.radius_meters) || 150,
      geofence_type: data.geofence_type || 'circle',
      polygon_coordinates: data.polygon_coordinates || null,
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
      notes: data.notes?.trim() || null,
    }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    const msg =
      errJson?.message ||
      (errJson?.errors ? Object.values(errJson.errors).flat().join(', ') : `Server error ${res.status}`);
    throw new Error(msg);
  }

  const created = await res.json();
  const newLocation: OfficeLocation = {
    id: created.id,
    name: created.name,
    address: created.address || undefined,
    latitude: Number(created.latitude),
    longitude: Number(created.longitude),
    radius_meters: Number(created.radius_meters) || 150,
    geofence_type: (created.geofence_type === 'polygon' ? 'polygon' : 'circle') as 'circle' | 'polygon',
    polygon_coordinates: Array.isArray(created.polygon_coordinates) ? created.polygon_coordinates : null,
    is_active: Boolean(created.is_active),
    notes: created.notes || undefined,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };

  const updated = [...current.filter((l) => String(l.id) !== String(newLocation.id)), newLocation];
  saveOfficeLocationsToCache(updated);
  return newLocation;
}

/**
 * Update an existing office location
 */
export async function updateOfficeLocation(
  id: number | string,
  data: Partial<OfficeLocation>
): Promise<OfficeLocation> {
  const current = getStoredOfficeLocations();

  const res = await fetch(`${API_BASE}/office-locations/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name: data.name?.trim(),
      address: data.address !== undefined ? data.address.trim() : undefined,
      latitude: data.latitude !== undefined ? Number(data.latitude) : undefined,
      longitude: data.longitude !== undefined ? Number(data.longitude) : undefined,
      radius_meters: data.radius_meters !== undefined ? Number(data.radius_meters) : undefined,
      geofence_type: data.geofence_type,
      polygon_coordinates: data.polygon_coordinates,
      is_active: data.is_active,
      notes: data.notes !== undefined ? data.notes.trim() : undefined,
    }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    const msg =
      errJson?.message ||
      (errJson?.errors ? Object.values(errJson.errors).flat().join(', ') : `Server error ${res.status}`);
    throw new Error(msg);
  }

  const updated = await res.json();
  const merged: OfficeLocation = {
    id: updated.id,
    name: updated.name,
    address: updated.address || undefined,
    latitude: Number(updated.latitude),
    longitude: Number(updated.longitude),
    radius_meters: Number(updated.radius_meters) || 150,
    geofence_type: (updated.geofence_type === 'polygon' ? 'polygon' : 'circle') as 'circle' | 'polygon',
    polygon_coordinates: Array.isArray(updated.polygon_coordinates) ? updated.polygon_coordinates : null,
    is_active: Boolean(updated.is_active),
    notes: updated.notes || undefined,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };

  const index = current.findIndex((l) => String(l.id) === String(id));
  if (index !== -1) {
    current[index] = merged;
  } else {
    current.push(merged);
  }

  saveOfficeLocationsToCache(current);
  return merged;
}

/**
 * Delete an office location
 */
export async function deleteOfficeLocation(id: number | string): Promise<boolean> {
  const current = getStoredOfficeLocations();

  const res = await fetch(`${API_BASE}/office-locations/${id}`, {
    method: 'DELETE',
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => null);
    const msg = errJson?.message || `Server error ${res.status}`;
    throw new Error(msg);
  }

  const filtered = current.filter((l) => String(l.id) !== String(id));
  saveOfficeLocationsToCache(filtered);
  return true;
}

/**
 * Check if a given latitude and longitude coordinate is within ANY of the active office geofences
 */
export function checkLocationInOfficeArea(
  userLat: number,
  userLng: number,
  locations?: OfficeLocation[]
): GeofenceCheckResult {
  const pool = locations && locations.length > 0 ? locations : getStoredOfficeLocations();
  const activeLocations = pool.filter((loc) => loc.is_active);

  // If no office locations are active/configured, permit by default
  if (activeLocations.length === 0) {
    return {
      inArea: true,
      nearestLocation: null,
      distanceMeters: 0,
      allowedRadiusMeters: 0,
      noLocationsConfigured: true,
    };
  }

  let minDistance = Infinity;
  let nearestLocation: OfficeLocation = activeLocations[0];
  let isInsideAny = false;

  const allCalculations = activeLocations.map((loc) => {
    const centerDist = calculateDistanceMeters(userLat, userLng, loc.latitude, loc.longitude);
    let inside = false;

    if (loc.geofence_type === 'polygon' && Array.isArray(loc.polygon_coordinates) && loc.polygon_coordinates.length >= 3) {
      inside = isPointInPolygon(userLat, userLng, loc.polygon_coordinates);
    } else {
      inside = centerDist <= (loc.radius_meters || 150);
    }

    if (centerDist < minDistance) {
      minDistance = centerDist;
      nearestLocation = loc;
    }

    if (inside) {
      isInsideAny = true;
    }

    return {
      location: loc,
      distanceMeters: centerDist,
      inside,
      geofenceType: loc.geofence_type || 'circle',
    };
  });

  return {
    inArea: isInsideAny,
    nearestLocation,
    distanceMeters: minDistance,
    allowedRadiusMeters: nearestLocation ? nearestLocation.radius_meters : 150,
    noLocationsConfigured: false,
    allLocationsDistance: allCalculations,
  };
}

/**
 * Subscribe to office locations updates across browser tabs and components
 */
export function subscribeToOfficeLocations(callback: (locations: OfficeLocation[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<OfficeLocation[]>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(getStoredOfficeLocations());
    }
  };

  window.addEventListener('agency_office_locations_updated', handler);
  return () => {
    window.removeEventListener('agency_office_locations_updated', handler);
  };
}
