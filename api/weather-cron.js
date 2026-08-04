import { supabaseAdmin } from './_security.js';

const weatherCodeToLabel = (code) => {
  if (code == null) return 'Polooblačno';
  if (code === 0) return 'Slnečno';
  if ([1, 2].includes(code)) return 'Polooblačno';
  if ([3, 45, 48].includes(code)) return 'Oblačno';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Dážď';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Sneženie';
  if ([95, 96, 99].includes(code)) return 'Búrka';
  return 'Polooblačno';
};

const formatTemperature = (value) => {
  if (value == null || Number.isNaN(value)) return '';
  return String(Math.round(value));
};

const getHourlyValue = (times = [], values = [], hour) => {
  const index = times.findIndex((time) => time.endsWith(`T${hour}:00`));
  return index >= 0 ? values[index] : null;
};

const getBratislavaDate = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bratislava',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
};

const getBratislavaHour = () => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Bratislava',
    hour: '2-digit',
    hour12: false
  });
  return Number(formatter.format(new Date()));
};

const shouldUseWeatherSlot = (dateStr, hour) => {
  const todayStr = getBratislavaDate();
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;
  return getBratislavaHour() >= hour;
};

const fetchWeather = async (latitude, longitude, dateStr) => {
  const todayStr = getBratislavaDate();
  const baseUrl = dateStr < todayStr
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: dateStr,
    end_date: dateStr,
    timezone: 'Europe/Bratislava',
    hourly: 'temperature_2m,weather_code',
    daily: 'weather_code'
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  if (!response.ok) throw new Error('Open-Meteo nedostupne.');
  const data = await response.json();

  const hourlyTimes = data.hourly?.time || [];
  const hourlyTemps = data.hourly?.temperature_2m || [];
  const hourlyCodes = data.hourly?.weather_code || [];
  const useMorning = shouldUseWeatherSlot(dateStr, 8);
  const useNoon = shouldUseWeatherSlot(dateStr, 12);
  const useEvening = shouldUseWeatherSlot(dateStr, 17);
  const morningCode = useMorning ? (getHourlyValue(hourlyTimes, hourlyCodes, '08') ?? data.daily?.weather_code?.[0]) : null;
  const noonCode = useNoon ? (getHourlyValue(hourlyTimes, hourlyCodes, '12') ?? data.daily?.weather_code?.[0]) : null;
  const eveningCode = useEvening ? (getHourlyValue(hourlyTimes, hourlyCodes, '17') ?? data.daily?.weather_code?.[0]) : null;

  return {
    weather: noonCode != null ? weatherCodeToLabel(noonCode) : '',
    weather_morning: morningCode != null ? weatherCodeToLabel(morningCode) : '',
    weather_noon: noonCode != null ? weatherCodeToLabel(noonCode) : '',
    weather_evening: eveningCode != null ? weatherCodeToLabel(eveningCode) : '',
    temperature_morning: useMorning ? formatTemperature(getHourlyValue(hourlyTimes, hourlyTemps, '08')) : '',
    temperature_noon: useNoon ? formatTemperature(getHourlyValue(hourlyTimes, hourlyTemps, '12')) : '',
    temperature_evening: useEvening ? formatTemperature(getHourlyValue(hourlyTimes, hourlyTemps, '17')) : ''
  };
};

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Supabase service key nie je nakonfigurovany.' });
  }

  const expectedSecret = process.env.CRON_SECRET || process.env.WEATHER_CRON_SECRET;
  const providedSecret = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.query?.secret;
  if (expectedSecret && providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Neplatny cron token.' });
  }

  const weatherDate = typeof req.query?.date === 'string' ? req.query.date : getBratislavaDate();

  const { data: sites, error } = await supabaseAdmin
    .from('sites')
    .select('id, organization_id, name, status, latitude, longitude, location_label, address')
    .neq('status', 'completed')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(5000);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const snapshots = [];
  const failures = [];

  for (const site of sites || []) {
    try {
      const savedLatitude = Number(site.latitude);
      const savedLongitude = Number(site.longitude);
      const hasCoordinates = Number.isFinite(savedLatitude) && Number.isFinite(savedLongitude);
      if (!hasCoordinates) {
        failures.push({ site_id: site.id, site_name: site.name, error: 'Chyba poloha zakazky.' });
        continue;
      }

      const weather = await fetchWeather(savedLatitude, savedLongitude, weatherDate);
      snapshots.push({
        organization_id: site.organization_id,
        site_id: site.id,
        weather_date: weatherDate,
        location_label: site.location_label || site.address || site.name,
        ...weather,
        source: 'open-meteo',
        fetched_at: new Date().toISOString()
      });
    } catch (error) {
      failures.push({ site_id: site.id, site_name: site.name, error: error.message });
    }
  }

  if (snapshots.length > 0) {
    const { error: upsertError } = await supabaseAdmin
      .from('site_weather_snapshots')
      .upsert(snapshots, { onConflict: 'site_id,weather_date' });

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message, prepared: snapshots.length });
    }
  }

  return res.status(200).json({
    ok: true,
    date: weatherDate,
    saved: snapshots.length,
    failed: failures.length,
    failures: failures.slice(0, 10)
  });
}
