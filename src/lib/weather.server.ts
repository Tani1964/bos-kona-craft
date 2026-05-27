// Server-only OpenWeather wrapper with in-memory 10-min cache.
// NEVER import from client code.

type WeatherSnapshot = {
  condition: string;
  temp_c: number;
  humidity: number;
  rain_prob_3h: number; // 0..1
  raw: unknown;
};

const cache = new Map<string, { at: number; value: WeatherSnapshot }>();
const TTL_MS = 10 * 60 * 1000;

function bucket(lat: number, lng: number) {
  // ~300m precision
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

export async function getWeather({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}): Promise<WeatherSnapshot> {
  const key = bucket(lat, lng);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new Error("OPENWEATHER_API_KEY not configured");

  // Current conditions + 3h forecast pop
  const [curRes, fcRes] = await Promise.all([
    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${apiKey}`,
    ),
    fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&cnt=1&units=metric&appid=${apiKey}`,
    ),
  ]);
  if (!curRes.ok) throw new Error(`OpenWeather error ${curRes.status}`);
  const cur: any = await curRes.json();
  const fc: any = fcRes.ok ? await fcRes.json() : null;

  const value: WeatherSnapshot = {
    condition: cur?.weather?.[0]?.main ?? "Unknown",
    temp_c: typeof cur?.main?.temp === "number" ? cur.main.temp : 0,
    humidity: typeof cur?.main?.humidity === "number" ? cur.main.humidity : 0,
    rain_prob_3h:
      typeof fc?.list?.[0]?.pop === "number" ? Number(fc.list[0].pop) : 0,
    raw: { current: cur, forecast: fc?.list?.[0] ?? null },
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function computeEffectiveStress({
  weather,
  durationHours,
  transportMode,
}: {
  weather: { rain_prob_3h: number; humidity: number };
  durationHours: number;
  transportMode: "walking" | "transit" | "car";
}) {
  const weatherFactor =
    1 + weather.rain_prob_3h * 0.8 + (weather.humidity / 100) * 0.2;
  const transportFactor =
    transportMode === "walking" ? 1.0 : transportMode === "transit" ? 0.6 : 0.3;
  return Number(
    (weatherFactor * Math.max(0, durationHours) * transportFactor).toFixed(3),
  );
}
