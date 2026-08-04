const RAGEO_GEOCODER_URL = 'https://ra.synchronix.sk/geocoder/api/v1/search';
const SK_MUNICIPALITY_LAYER_URL = 'https://services5.arcgis.com/xLgsg0kCC5lIjsBX/ArcGIS/rest/services/Obec/FeatureServer/0/query';
const SK_MUNICIPALITY_PART_LAYER_URL = 'https://gis.scitanie.sk/server/rest/services/Hosted/hranice/FeatureServer/16/query';

const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');
const normalizeKey = (value) => normalizeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();
const stripDiacritics = (value) => normalizeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const pickNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const mapRageoItem = (item, index) => {
  const lat = pickNumber(item?.location?.lat);
  const lon = pickNumber(item?.location?.lon);
  if (lat == null || lon == null) return null;

  const mainText = normalizeText(item.text);
  const description = normalizeText(item.description);
  const municipality = normalizeText(item.municipality);
  const county = normalizeText(item.county);

  return {
    id: item.source || `${mainText}-${lat}-${lon}-${index}`,
    name: mainText || description || municipality,
    latitude: lat,
    longitude: lon,
    country: 'Slovenská republika',
    country_code: 'SK',
    admin1: '',
    admin2: county,
    admin3: municipality,
    description,
    category: item.category || '',
    score: item.score ?? null
  };
};

const toCitySuggestions = (results, district) => {
  const districtKey = normalizeKey(district);
  const map = new Map();

  results.forEach((location) => {
    const municipality = normalizeText(location.admin3);
    if (!municipality) return;
    if (districtKey && normalizeKey(location.admin2) !== districtKey) return;

    const key = `municipality:${normalizeKey(location.admin2)}:${normalizeKey(municipality)}`;
    if (map.has(key)) return;

    map.set(key, {
      ...location,
      id: key,
      name: municipality,
      description: [location.admin2 ? `okres ${location.admin2}` : '', location.country].filter(Boolean).join(', '),
      category: 'obec'
    });
  });

  return Array.from(map.values()).slice(0, 12);
};

const escapeArcgisString = (value) => normalizeText(value).replace(/'/g, "''");

const normalizeRegionName = (value) => {
  const clean = normalizeText(value);
  if (!clean) return '';
  return clean.toLowerCase().endsWith('kraj') ? clean : `${clean} kraj`;
};

const searchMunicipalities = async (query, district) => {
  const queryKey = normalizeKey(query);
  const where = district
    ? `NM3='${escapeArcgisString(district)}'`
    : '1=1';

  const params = new URLSearchParams({
    f: 'json',
    where,
    outFields: 'IDN4,NM4,IDN3,NM3,IDN2,NM2,LAU2_CODE,LAU1_CODE,NUTS3_CODE',
    returnGeometry: 'false',
    returnCentroid: 'true',
    outSR: '4326',
    orderByFields: 'NM4',
    resultRecordCount: '2000'
  });

  const response = await fetch(`${SK_MUNICIPALITY_LAYER_URL}?${params.toString()}`);
  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || 'Číselník obcí momentálne neodpovedá.');
  }

  const data = await response.json();
  const municipalities = (data.features || [])
    .map((feature) => {
      const attrs = feature.attributes || {};
      const name = normalizeText(attrs.NM4);
      const latitude = pickNumber(feature.centroid?.y);
      const longitude = pickNumber(feature.centroid?.x);
      if (!name || latitude == null || longitude == null) return null;
      return {
        id: `municipality:${attrs.LAU2_CODE || attrs.IDN4 || normalizeKey(name)}`,
        name,
        latitude,
        longitude,
        country: 'Slovenská republika',
        country_code: 'SK',
        admin1: normalizeRegionName(attrs.NM2),
        admin2: normalizeText(attrs.NM3),
        admin3: name,
        description: '',
        category: 'obec',
        score: null
      };
    })
    .filter(Boolean);

  const municipalityByCode = new Map(municipalities.map((item) => [item.id.replace('municipality:', ''), item]));
  const parentCodes = Array.from(municipalityByCode.keys()).filter(Boolean);
  const parts = parentCodes.length > 0
    ? await searchMunicipalityParts(queryKey, parentCodes, municipalityByCode)
    : [];

  const combined = [...municipalities, ...parts];
  const startsWith = combined.filter((item) => normalizeKey(item.name).startsWith(queryKey));
  const fallback = startsWith.length > 0
    ? startsWith
    : combined.filter((item) => normalizeKey(item.name).includes(queryKey));

  const deduped = new Map();
  fallback
    .sort((a, b) => a.name.localeCompare(b.name, 'sk'))
    .forEach((item) => {
      const key = `${normalizeKey(item.admin2)}:${normalizeKey(item.name)}`;
      if (!deduped.has(key)) deduped.set(key, item);
    });

  return Array.from(deduped.values()).slice(0, 30);
};

const searchMunicipalityParts = async (queryKey, parentCodes, municipalityByCode) => {
  const where = `obec IN (${parentCodes.map((code) => `'${escapeArcgisString(code)}'`).join(',')})`;
  const params = new URLSearchParams({
    f: 'json',
    where,
    outFields: 'kod,nazov,obec',
    returnGeometry: 'false',
    returnCentroid: 'true',
    outSR: '4326',
    orderByFields: 'nazov',
    resultRecordCount: '2000'
  });

  const response = await fetch(`${SK_MUNICIPALITY_PART_LAYER_URL}?${params.toString()}`);
  if (!response.ok) return [];

  const data = await response.json();
  return (data.features || [])
    .map((feature) => {
      const attrs = feature.attributes || {};
      const name = normalizeText(attrs.nazov);
      const parent = municipalityByCode.get(normalizeText(attrs.obec));
      const latitude = pickNumber(feature.centroid?.y);
      const longitude = pickNumber(feature.centroid?.x);
      if (!name || !parent || latitude == null || longitude == null) return null;
      if (normalizeKey(name) === normalizeKey(parent.name)) return null;
      if (!normalizeKey(name).startsWith(queryKey) && !normalizeKey(name).includes(queryKey)) return null;

      return {
        id: `municipality-part:${attrs.kod || normalizeKey(name)}`,
        name,
        latitude,
        longitude,
        country: parent.country,
        country_code: parent.country_code,
        admin1: parent.admin1,
        admin2: parent.admin2,
        admin3: name,
        description: '',
        category: 'cast_obce',
        score: null
      };
    })
    .filter(Boolean);
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const query = normalizeText(req.query?.q);
  const mode = req.query?.mode === 'city' ? 'city' : 'address';
  const district = normalizeText(req.query?.district);
  if (query.length < 2) {
    return res.status(200).json({ results: [] });
  }

  try {
    if (mode === 'city') {
      const results = await searchMunicipalities(query, district);
      return res.status(200).json({ results });
    }

    const response = await fetch(RAGEO_GEOCODER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        text: stripDiacritics(query),
        size: 12
      })
    });

    if (!response.ok) {
      const message = await response.text().catch(() => '');
      return res.status(502).json({
        error: 'Adresný register momentálne neodpovedá.',
        detail: message.slice(0, 300)
      });
    }

    const data = await response.json();
    const results = (data.items || [])
      .map(mapRageoItem)
      .filter(Boolean);

    return res.status(200).json({ results });
  } catch (error) {
    return res.status(502).json({
      error: mode === 'city'
        ? 'Číselník obcí momentálne nie je dostupný.'
        : 'Adresný register momentálne nie je dostupný.'
    });
  }
}
