// Sunset Quality scoring.
//
// A beautiful sunset needs light to bounce off something high in the sky.
// The recipe:
//   - High & mid-level clouds (cirrus, altocumulus) CATCH and scatter color.
//     Too few = a plain fade; too many = a grey lid. A moderate band is ideal.
//   - Low clouds near the horizon BLOCK the sun — they kill the show.
//   - Low humidity keeps the air clear so colors stay vivid and saturated.
//   - Good visibility (low haze/aerosol) lets distant light through cleanly.

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Score a single moment from its weather conditions.
 * @returns {{ score: number, factors: object }} score is 1–10.
 */
export function sunsetScore({ cloudHigh, cloudMid, cloudLow, humidity, visibility }) {
  cloudHigh = clamp(cloudHigh ?? 0, 0, 100);
  cloudMid = clamp(cloudMid ?? 0, 0, 100);
  cloudLow = clamp(cloudLow ?? 0, 0, 100);
  humidity = clamp(humidity ?? 50, 0, 100);
  // visibility comes in metres from Open-Meteo; treat 24km+ as pristine.
  const visKm = (visibility ?? 24000) / 1000;

  // High + mid clouds are the canvas. Weight high clouds a touch more —
  // cirrus is the classic "fire in the sky" maker. Ideal coverage ~55%.
  const canvas = cloudHigh * 0.6 + cloudMid * 0.4;
  const cloudScore = clamp(100 - Math.abs(canvas - 55) * 1.7, 0, 100);

  const humidityScore = 100 - humidity; // drier = more vivid
  const visScore = clamp((visKm / 24) * 100, 0, 100);

  let raw = cloudScore * 0.5 + humidityScore * 0.25 + visScore * 0.25;
  raw -= cloudLow * 0.35; // low clouds on the horizon are the biggest spoiler
  raw = clamp(raw, 0, 100);

  const score = clamp(Math.round(raw / 10), 1, 10);

  return {
    score,
    factors: { canvas, cloudLow, humidity, visKm, cloudHigh, cloudMid },
  };
}

/** A short human-readable verdict for a given score. */
export function scoreLabel(score) {
  if (score >= 9) return "Spectacular";
  if (score >= 7) return "Beautiful";
  if (score >= 5) return "Pleasant";
  if (score >= 3) return "Muted";
  return "Washed out";
}

/**
 * Build a one-line explanation of why a sunset will (or won't) look good,
 * e.g. "High cirrus clouds + low humidity = golden-hour potential."
 */
export function describeSunset({ canvas, cloudLow, humidity, visKm }) {
  const parts = [];
  const heavyLow = cloudLow >= 55;

  // The canvas (high/mid cloud) line. Skip the "clear skies" framing when low
  // cloud is heavy — an overcast horizon isn't a clean fade.
  if (canvas >= 35 && canvas <= 75) parts.push("High cirrus clouds to catch the light");
  else if (canvas > 75) parts.push("Heavy upper cloud may dull the colors");
  else if (!heavyLow) parts.push("Clear skies for a clean, simple fade");

  if (heavyLow) parts.push("thick low cloud is likely to smother the sunset");
  else if (cloudLow >= 25) parts.push("some low cloud near the horizon");

  if (humidity <= 40) parts.push("low humidity for vivid color");
  else if (humidity >= 75) parts.push("high humidity may mute the hues");

  if (visKm < 8) parts.push("hazy air");

  if (parts.length === 0) parts.push("Mixed conditions for the evening");

  const sentence = parts
    .join(" + ")
    .replace(/\+ ([a-z])/g, (_, c) => "+ " + c); // keep lowercase mid-sentence

  // Capitalize the first character, end with a period.
  const text = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return text.endsWith(".") ? text : text + ".";
}

/** Map a score to a warm color used across the UI. */
export function scoreColor(score) {
  // 1 (dusty grey) → 10 (electric magenta/gold)
  const palette = {
    1: "#6b6f76",
    2: "#7c7480",
    3: "#9a7a6e",
    4: "#c08457",
    5: "#e0913f",
    6: "#f59e3d",
    7: "#fb7a4a",
    8: "#f25c6e",
    9: "#e84d97",
    10: "#d94fd0",
  };
  return palette[score] || "#f59e3d";
}
