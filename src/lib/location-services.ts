import exifr from "exifr";
import { fetchWithRetry } from "./net";

/**
 * Location Services for ARtisan
 *
 * Extracts exact location from photos and gathers real-world data:
 * - GPS coordinates from EXIF
 * - Reverse geocoding for address
 * - Nearby places (shops, restaurants, landmarks)
 * - Street View imagery
 * - 3D building data
 */

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface LocationData {
  coordinates: GPSCoordinates;
  address: {
    formatted: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  nearbyPlaces: NearbyPlace[];
  streetViewUrl?: string;
  placeDetails?: PlaceDetails;
}

export interface NearbyPlace {
  id: string;
  name: string;
  type: string; // restaurant, shop, landmark, etc.
  distance: number; // meters
  address: string;
  coordinates: { lat: number; lng: number };
  rating?: number;
  photoUrls?: string[];
}

export interface PlaceDetails {
  name: string;
  description?: string;
  category: string;
  openingHours?: string[];
  website?: string;
  phoneNumber?: string;
}

/**
 * Extract GPS coordinates from photo EXIF data
 */
export async function extractGPSFromPhoto(photoUrl: string): Promise<GPSCoordinates | null> {
  try {
    console.log("Extracting GPS from photo:", photoUrl);

    // Fetch the image
    const response = await fetchWithRetry(photoUrl, {}, { timeoutMs: 30_000, retries: 2 });
    const buffer = await response.arrayBuffer();

    // Extract EXIF data
    const exif = await exifr.parse(buffer, {
      gps: true,
      tiff: true,
    });

    if (!exif || !exif.latitude || !exif.longitude) {
      console.log("No GPS data found in photo EXIF");
      return null;
    }

    const coordinates: GPSCoordinates = {
      latitude: exif.latitude,
      longitude: exif.longitude,
      altitude: exif.altitude,
    };

    console.log("GPS coordinates extracted:", coordinates);
    return coordinates;
  } catch (error) {
    console.error("Failed to extract GPS from photo:", error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to get address
 * Uses Google Maps Geocoding API
 */
export async function reverseGeocode(coordinates: GPSCoordinates): Promise<LocationData["address"] | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not configured");
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.latitude},${coordinates.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetchWithRetry(url, {}, { timeoutMs: 10_000, retries: 2 });
    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.error("Reverse geocoding failed:", data.status);
      return null;
    }

    const result = data.results[0];
    const addressComponents = result.address_components || [];

    // Extract address parts
    const getComponent = (type: string) => {
      const component = addressComponents.find((c: { types: string[] }) => c.types.includes(type));
      return component?.long_name;
    };

    return {
      formatted: result.formatted_address,
      street: getComponent("route"),
      city: getComponent("locality") || getComponent("administrative_area_level_2"),
      state: getComponent("administrative_area_level_1"),
      country: getComponent("country"),
      postalCode: getComponent("postal_code"),
    };
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    return null;
  }
}

/**
 * Get nearby places using Google Places API
 */
export async function getNearbyPlaces(
  coordinates: GPSCoordinates,
  radius: number = 200 // meters
): Promise<NearbyPlace[]> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not configured");
    return [];
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${coordinates.latitude},${coordinates.longitude}&radius=${radius}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetchWithRetry(url, {}, { timeoutMs: 10_000, retries: 2 });
    const data = await response.json();

    if (data.status !== "OK" || !data.results) {
      console.error("Nearby places search failed:", data.status);
      return [];
    }

    // Map results to our format
    const places: NearbyPlace[] = data.results.slice(0, 20).map((place: {
      place_id: string;
      name: string;
      types: string[];
      vicinity: string;
      geometry: { location: { lat: number; lng: number } };
      rating?: number;
      photos?: { photo_reference: string }[];
    }) => {
      // Calculate distance
      const distance = calculateDistance(
        coordinates.latitude,
        coordinates.longitude,
        place.geometry.location.lat,
        place.geometry.location.lng
      );

      // Get photo URLs
      const photoUrls = place.photos
        ? place.photos.slice(0, 3).map((photo) =>
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
          )
        : [];

      return {
        id: place.place_id,
        name: place.name,
        type: place.types[0] || "place",
        distance,
        address: place.vicinity,
        coordinates: place.geometry.location,
        rating: place.rating,
        photoUrls,
      };
    });

    // Sort by distance
    places.sort((a, b) => a.distance - b.distance);

    console.log(`Found ${places.length} nearby places`);
    return places;
  } catch (error) {
    console.error("Error fetching nearby places:", error);
    return [];
  }
}

/**
 * Get Street View image URL for the location
 */
export function getStreetViewUrl(
  coordinates: GPSCoordinates,
  heading: number = 0, // direction camera is facing (0-360)
  pitch: number = 0, // up/down angle (-90 to 90)
  fov: number = 90 // field of view (0-120)
): string | null {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return null;
  }

  return `https://maps.googleapis.com/maps/api/streetview?size=1200x800&location=${coordinates.latitude},${coordinates.longitude}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
}

/**
 * Get Street View metadata to check if imagery is available
 */
export async function checkStreetViewAvailability(
  coordinates: GPSCoordinates
): Promise<{ available: boolean; heading?: number; date?: string }> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return { available: false };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${coordinates.latitude},${coordinates.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetchWithRetry(url, {}, { timeoutMs: 5_000 });
    const data = await response.json();

    if (data.status === "OK") {
      return {
        available: true,
        heading: data.location?.heading,
        date: data.date,
      };
    }

    return { available: false };
  } catch (error) {
    console.error("Error checking Street View availability:", error);
    return { available: false };
  }
}

/**
 * Get 360° panorama images from Street View
 */
export async function getStreetViewPanorama(
  coordinates: GPSCoordinates
): Promise<{ panoId: string; imageUrls: string[] } | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return null;
  }

  try {
    // First, check if Street View is available
    const availability = await checkStreetViewAvailability(coordinates);
    if (!availability.available) {
      console.log("Street View not available for this location");
      return null;
    }

    // Get Street View images from multiple angles
    const imageUrls: string[] = [];
    const headings = [0, 90, 180, 270]; // North, East, South, West

    for (const heading of headings) {
      const url = getStreetViewUrl(coordinates, heading, 0, 90);
      if (url) imageUrls.push(url);
    }

    return {
      panoId: `pano_${coordinates.latitude}_${coordinates.longitude}`,
      imageUrls,
    };
  } catch (error) {
    console.error("Error getting Street View panorama:", error);
    return null;
  }
}

/**
 * Get detailed place information
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,type,opening_hours,website,formatted_phone_number,editorial_summary&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetchWithRetry(url, {}, { timeoutMs: 10_000 });
    const data = await response.json();

    if (data.status !== "OK" || !data.result) {
      return null;
    }

    const result = data.result;

    return {
      name: result.name,
      description: result.editorial_summary?.overview,
      category: result.types?.[0] || "place",
      openingHours: result.opening_hours?.weekday_text,
      website: result.website,
      phoneNumber: result.formatted_phone_number,
    };
  } catch (error) {
    console.error("Error fetching place details:", error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Get satellite imagery from Google Maps Static API
 * This provides aerial/satellite view of the exact location
 */
export function getSatelliteImageUrl(
  coordinates: GPSCoordinates,
  zoom: number = 20, // 20 is max zoom for satellite
  size: string = "640x640",
  mapType: "satellite" | "hybrid" | "roadmap" = "satellite"
): string | null {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return null;
  }

  // Google Maps Static API for satellite imagery
  return `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.latitude},${coordinates.longitude}&zoom=${zoom}&size=${size}&maptype=${mapType}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
}

/**
 * Get multiple satellite images at different zoom levels
 * Useful for understanding the area at different scales
 */
export function getSatelliteImageUrls(coordinates: GPSCoordinates): {
  close: string | null;
  medium: string | null;
  wide: string | null;
} {
  return {
    close: getSatelliteImageUrl(coordinates, 20, "640x640", "hybrid"), // Max zoom with labels
    medium: getSatelliteImageUrl(coordinates, 18, "640x640", "satellite"), // Medium zoom
    wide: getSatelliteImageUrl(coordinates, 16, "640x640", "satellite"), // Wide area view
  };
}

/**
 * Get Street View panorama images from all 4 directions
 * This provides 360° ground-level imagery
 */
export async function getStreetView360Images(
  coordinates: GPSCoordinates
): Promise<string[] | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return null;
  }

  // Check if Street View is available
  const availability = await checkStreetViewAvailability(coordinates);
  if (!availability.available) {
    console.log("Street View not available at this location");
    return null;
  }

  // Get images from 8 directions for full 360° coverage
  const imageUrls: string[] = [];
  const headings = [0, 45, 90, 135, 180, 225, 270, 315]; // Every 45 degrees

  for (const heading of headings) {
    const url = getStreetViewUrl(coordinates, heading, 0, 90);
    if (url) imageUrls.push(url);
  }

  console.log(`Generated ${imageUrls.length} Street View images for 360° coverage`);
  return imageUrls;
}

/**
 * Analyze satellite and Street View imagery to understand the environment
 * This provides aerial and ground-level context beyond the original photo
 */
export async function analyzeReferenceImages(
  coordinates: GPSCoordinates
): Promise<{
  satelliteImageUrls: { close: string | null; medium: string | null; wide: string | null };
  streetViewImageUrls: string[] | null;
  hasSatellite: boolean;
  hasStreetView: boolean;
} | null> {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.warn("Google Maps API key not configured - skipping reference image analysis");
    return null;
  }

  console.log("Fetching reference images from Google Maps...");

  // Get satellite images at different zoom levels
  const satelliteImageUrls = getSatelliteImageUrls(coordinates);
  const hasSatellite = satelliteImageUrls.close !== null;

  // Get Street View 360° images
  const streetViewImageUrls = await getStreetView360Images(coordinates);
  const hasStreetView = streetViewImageUrls !== null && streetViewImageUrls.length > 0;

  console.log(`Reference images: Satellite=${hasSatellite}, Street View=${hasStreetView}`);

  return {
    satelliteImageUrls,
    streetViewImageUrls,
    hasSatellite,
    hasStreetView,
  };
}

/**
 * Get complete location data from photo
 * Now includes satellite imagery for accurate environment recreation
 */
export async function getLocationDataFromPhoto(photoUrl: string): Promise<LocationData | null> {
  // Step 1: Extract GPS coordinates
  const coordinates = await extractGPSFromPhoto(photoUrl);
  if (!coordinates) {
    console.log("No GPS data in photo, cannot determine location");
    return null;
  }

  // Step 2: Get address via reverse geocoding
  const address = await reverseGeocode(coordinates);
  if (!address) {
    console.warn("Could not determine address from coordinates");
    return {
      coordinates,
      address: { formatted: "Unknown location" },
      nearbyPlaces: [],
    };
  }

  // Step 3: Get nearby places (within 200m)
  const nearbyPlaces = await getNearbyPlaces(coordinates, 200);

  // Step 4: Get Street View URL if available
  const streetViewUrl = getStreetViewUrl(coordinates);

  console.log(`Location data complete: ${address.formatted}, ${nearbyPlaces.length} nearby places`);

  return {
    coordinates,
    address,
    nearbyPlaces,
    streetViewUrl: streetViewUrl || undefined,
  };
}
