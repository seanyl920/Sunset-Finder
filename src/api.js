// All external data access lives here.
//   - Open-Meteo Geocoding  → city name to coordinates (free, no key)
//   - Sunrise-Sunset API     → precise sunset time for today (free, no key)
//   - Open-Meteo Forecast    → hourly clouds/humidity/visibility + 7-day sunsets
//   - BigDataCloud           → reverse geocode for "use my location" (free, no key)
//   - /api/spots             → our Express proxy to the Claude API

import { sunsetScore, describeSunset } from "./scoring.js";

/**
 * Format the wall-clock time straight from an ISO string (e.g. "2026-06-06T20:31"
 * or "...T20:31:00-07:00") to "8:31 PM". Both Open-Meteo and Sunrise-Sunset return
 * times already local to the location, so we must NOT re-apply a timezone shift.
 */
export function formatClock(iso) {
  const m = /T(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return "—";
  let hour = parseInt(m[1], 10);
  const min = m[2];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${min} ${ampm}`;
}

async function getJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

/** Resolve a city name to coordinates + a tidy display label. */
export async function geocodeCity(name) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    name,
  )}&count=1&language=en&format=json`;
  const data = await getJSON(url);
  const hit = data.results?.[0];
  if (!hit) throw new Error(`Couldn't find "${name}". Try another city.`);
  const label = [hit.name, hit.admin1, hit.country]
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");
  return { lat: hit.latitude, lon: hit.longitude, label, name: hit.name };
}

/** Reverse-geocode coordinates to a city label (for "use my location"). */
export async function reverseGeocode(lat, lon) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const data = await getJSON(url);
    const name = data.city || data.locality || data.principalSubdivision || "Your location";
    const label = [data.city || data.locality, data.principalSubdivision, data.countryName]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(", ");
    return { label: label || name, name };
  } catch {
    return { label: "Your location", name: "your area" };
  }
}

/** Browser geolocation, promisified. */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation isn't available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => reject(new Error("Location permission denied.")),
      { timeout: 10000 },
    );
  });
}

/** Precise sunset time for today via the Sunrise-Sunset API. */
async function getTodaysSunsetTime(lat, lon, tzid) {
  const url = `https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&date=today&formatted=0&tzid=${encodeURIComponent(
    tzid,
  )}`;
  const data = await getJSON(url);
  if (data.status !== "OK") throw new Error("Sunset time unavailable.");
  return data.results.sunset; // ISO 8601 with offset, e.g. 2026-06-06T20:31:00-07:00
}

// Find the hourly index closest to a given local ISO timestamp.
function nearestHourIndex(times, target) {
  const t = new Date(target).getTime();
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < times.length; i++) {
    const diff = Math.abs(new Date(times[i]).getTime() - t);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

/**
 * Fetch everything needed to render the forecast.
 * @returns {{ timezone, today, week: Array }}
 */
export async function getForecast(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high,relative_humidity_2m,visibility` +
    `&daily=sunrise,sunset&timezone=auto&forecast_days=7`;
  const data = await getJSON(url);
  const tz = data.timezone;
  const h = data.hourly;

  // Build a per-day forecast by scoring conditions at each day's sunset hour.
  const week = data.daily.sunset.map((sunsetISO, dayIdx) => {
    const idx = nearestHourIndex(h.time, sunsetISO);
    const conditions = {
      cloudHigh: h.cloud_cover_high[idx],
      cloudMid: h.cloud_cover_mid[idx],
      cloudLow: h.cloud_cover_low[idx],
      humidity: h.relative_humidity_2m[idx],
      visibility: h.visibility?.[idx],
    };
    const { score, factors } = sunsetScore(conditions);
    return {
      date: sunsetISO.slice(0, 10),
      sunsetISO,
      score,
      factors,
      conditions,
      isToday: dayIdx === 0,
    };
  });

  // Today's precise sunset time + a written verdict.
  let todaySunset = week[0].sunsetISO;
  try {
    todaySunset = await getTodaysSunsetTime(lat, lon, tz);
  } catch {
    /* fall back to the Open-Meteo daily sunset */
  }

  const today = {
    ...week[0],
    sunsetISO: todaySunset,
    description: describeSunset(week[0].factors),
  };

  return { timezone: tz, today, week };
}

/** Ask our server (which calls Claude) for curated sunset spots. */
export async function getSpots(city) {
  const res = await fetch("/api/spots", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Could not load sunset spots.");
  return data.spots || [];
}
