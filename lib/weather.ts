export type LocationResult = {
  id: number | string;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
  description?: string;
  category?: string;
  score?: number | null;
};

export type SiteWeather = {
  weather: string;
  weather_morning?: string;
  weather_noon?: string;
  weather_evening?: string;
  temperature_morning: string;
  temperature_noon: string;
  temperature_evening?: string;
};

const weatherCodeToLabel = (code?: number) => {
  if (code == null) return 'Polooblačno';
  if (code === 0) return 'Slnečno';
  if ([1, 2].includes(code)) return 'Polooblačno';
  if ([3, 45, 48].includes(code)) return 'Oblačno';
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return 'Dážď';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return 'Sneženie';
  if ([95, 96, 99].includes(code)) return 'Búrka';
  return 'Polooblačno';
};

const formatTemperature = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return '';
  return String(Math.round(value));
};

const getHourlyValue = (times: string[] = [], values: Array<number | null> = [], hour: string) => {
  const index = times.findIndex(time => time.endsWith(`T${hour}:00`));
  if (index >= 0) return values[index];
  return null;
};

const getLocalDateString = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const shouldUseWeatherSlot = (dateStr: string, hour: number) => {
  const now = new Date();
  const todayStr = getLocalDateString(now);
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;
  return now.getHours() >= hour;
};

export const formatLocationLabel = (location: LocationResult) => {
  return [
    location.name,
    location.description,
    location.admin3,
    location.admin2,
    location.admin1,
    location.country
  ].filter(Boolean).filter((part, index, arr) => arr.indexOf(part) === index).join(', ');
};

export const searchProjectLocations = async (
  query: string,
  mode: 'city' | 'address' = 'address',
  filters: { district?: string } = {}
): Promise<LocationResult[]> => {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const params = new URLSearchParams({ q: clean, mode });
  if (filters.district) params.set('district', filters.district);

  const response = await fetch(`/api/address-search?${params.toString()}`);
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || 'Nepodarilo sa vyhľadať adresu.');
  }
  const data = await response.json();
  return data.results || [];
};

export const fetchSiteWeather = async (latitude: number, longitude: number, dateStr: string): Promise<SiteWeather> => {
  const todayStr = getLocalDateString(new Date());
  const isPast = dateStr < todayStr;
  const baseUrl = isPast
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: dateStr,
    end_date: dateStr,
    timezone: 'auto',
    hourly: 'temperature_2m,weather_code',
    daily: 'weather_code'
  });

  const response = await fetch(`${baseUrl}?${params.toString()}`);
  if (!response.ok) throw new Error('Nepodarilo sa načítať počasie.');
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
