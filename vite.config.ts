import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const RAGEO_GEOCODER_URL = 'https://ra.synchronix.sk/geocoder/api/v1/search'
const SK_MUNICIPALITY_LAYER_URL = 'https://services5.arcgis.com/xLgsg0kCC5lIjsBX/ArcGIS/rest/services/Obec/FeatureServer/0/query'
const SK_MUNICIPALITY_PART_LAYER_URL = 'https://gis.scitanie.sk/server/rest/services/Hosted/hranice/FeatureServer/16/query'

const normalizeText = (value: unknown) => String(value || '').trim().replace(/\s+/g, ' ')
const normalizeKey = (value: unknown) => normalizeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
const stripDiacritics = (value: unknown) => normalizeText(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')

const mapAddressItem = (item: any, index: number) => {
  const latitude = Number(item?.location?.lat)
  const longitude = Number(item?.location?.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const name = normalizeText(item.text) || normalizeText(item.description) || normalizeText(item.municipality)
  const description = normalizeText(item.description)
  const municipality = normalizeText(item.municipality)
  const county = normalizeText(item.county)

  return {
    id: item.source || `${name}-${latitude}-${longitude}-${index}`,
    name,
    latitude,
    longitude,
    country: 'Slovenská republika',
    country_code: 'SK',
    admin1: '',
    admin2: county,
    admin3: municipality,
    description,
    category: item.category || '',
    score: item.score ?? null
  }
}

const toCitySuggestions = (results: any[], district: string) => {
  const districtKey = normalizeKey(district)
  const map = new Map<string, any>()

  results.forEach((location) => {
    const municipality = normalizeText(location.admin3)
    if (!municipality) return
    if (districtKey && normalizeKey(location.admin2) !== districtKey) return

    const key = `municipality:${normalizeKey(location.admin2)}:${normalizeKey(municipality)}`
    if (map.has(key)) return

    map.set(key, {
      ...location,
      id: key,
      name: municipality,
      description: [location.admin2 ? `okres ${location.admin2}` : '', location.country].filter(Boolean).join(', '),
      category: 'obec'
    })
  })

  return Array.from(map.values()).slice(0, 12)
}

const escapeArcgisString = (value: unknown) => normalizeText(value).replace(/'/g, "''")

const normalizeRegionName = (value: unknown) => {
  const clean = normalizeText(value)
  if (!clean) return ''
  return clean.toLowerCase().endsWith('kraj') ? clean : `${clean} kraj`
}

const searchMunicipalities = async (query: string, district: string) => {
  const queryKey = normalizeKey(query)
  const where = district ? `NM3='${escapeArcgisString(district)}'` : '1=1'
  const params = new URLSearchParams({
    f: 'json',
    where,
    outFields: 'IDN4,NM4,IDN3,NM3,IDN2,NM2,LAU2_CODE,LAU1_CODE,NUTS3_CODE',
    returnGeometry: 'false',
    returnCentroid: 'true',
    outSR: '4326',
    orderByFields: 'NM4',
    resultRecordCount: '2000'
  })

  const response = await fetch(`${SK_MUNICIPALITY_LAYER_URL}?${params.toString()}`)
  if (!response.ok) throw new Error('Číselník obcí momentálne neodpovedá.')

  const data = await response.json()
  const municipalities = (data.features || [])
    .map((feature: any) => {
      const attrs = feature.attributes || {}
      const name = normalizeText(attrs.NM4)
      const latitude = Number(feature.centroid?.y)
      const longitude = Number(feature.centroid?.x)
      if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

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
      }
    })
    .filter(Boolean)

  const municipalityByCode = new Map<string, any>(municipalities.map((item: any) => [item.id.replace('municipality:', ''), item]))
  const parentCodes = Array.from(municipalityByCode.keys()).filter(Boolean)
  const parts = parentCodes.length > 0
    ? await searchMunicipalityParts(queryKey, parentCodes, municipalityByCode)
    : []

  const combined = [...municipalities, ...parts]
  const startsWith = combined.filter((item: any) => normalizeKey(item.name).startsWith(queryKey))
  const fallback = startsWith.length > 0
    ? startsWith
    : combined.filter((item: any) => normalizeKey(item.name).includes(queryKey))

  const deduped = new Map<string, any>()
  fallback
    .sort((a: any, b: any) => a.name.localeCompare(b.name, 'sk'))
    .forEach((item: any) => {
      const key = `${normalizeKey(item.admin2)}:${normalizeKey(item.name)}`
      if (!deduped.has(key)) deduped.set(key, item)
    })

  return Array.from(deduped.values()).slice(0, 30)
}

const searchMunicipalityParts = async (queryKey: string, parentCodes: string[], municipalityByCode: Map<string, any>) => {
  const where = `obec IN (${parentCodes.map((code) => `'${escapeArcgisString(code)}'`).join(',')})`
  const params = new URLSearchParams({
    f: 'json',
    where,
    outFields: 'kod,nazov,obec',
    returnGeometry: 'false',
    returnCentroid: 'true',
    outSR: '4326',
    orderByFields: 'nazov',
    resultRecordCount: '2000'
  })

  const response = await fetch(`${SK_MUNICIPALITY_PART_LAYER_URL}?${params.toString()}`)
  if (!response.ok) return []

  const data = await response.json()
  return (data.features || [])
    .map((feature: any) => {
      const attrs = feature.attributes || {}
      const name = normalizeText(attrs.nazov)
      const parent = municipalityByCode.get(normalizeText(attrs.obec))
      const latitude = Number(feature.centroid?.y)
      const longitude = Number(feature.centroid?.x)
      if (!name || !parent || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
      if (normalizeKey(name) === normalizeKey(parent.name)) return null
      if (!normalizeKey(name).startsWith(queryKey) && !normalizeKey(name).includes(queryKey)) return null

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
      }
    })
    .filter(Boolean)
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'local-address-search-api',
        configureServer(server) {
          server.middlewares.use('/api/address-search', async (req, res) => {
            try {
              const requestUrl = new URL(req.url || '', 'http://localhost')
              const query = normalizeText(requestUrl.searchParams.get('q'))
              const mode = requestUrl.searchParams.get('mode') === 'city' ? 'city' : 'address'
              const district = normalizeText(requestUrl.searchParams.get('district'))

              res.setHeader('Content-Type', 'application/json; charset=utf-8')
                if (query.length < 2) {
                  res.end(JSON.stringify({ results: [] }))
                  return
                }

                if (mode === 'city') {
                  const results = await searchMunicipalities(query, district)
                  res.end(JSON.stringify({ results }))
                  return
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
              })

              if (!response.ok) {
                res.statusCode = 502
                res.end(JSON.stringify({ error: 'Adresný register momentálne neodpovedá.' }))
                return
              }

                const data = await response.json()
                const results = (data.items || []).map(mapAddressItem).filter(Boolean)
                res.end(JSON.stringify({ results }))
              } catch (error) {
                res.statusCode = 502
                res.end(JSON.stringify({ error: 'Adresný register momentálne nie je dostupný.' }))
              }
            })
        }
      }
    ],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      '__APP_BUILD_ID__': JSON.stringify(`${Date.now()}`)
    },
    optimizeDeps: {
      include: ['html2pdf.js']
    },
    build: {
      commonjsOptions: {
        include: [/html2pdf.js/, /node_modules/]
      }
    }
  }
})
