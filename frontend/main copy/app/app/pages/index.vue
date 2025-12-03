<template>
  <div class="vicio-page">
    <ClientOnly>
      <div id="vicio-map" class="vicio-map"></div>
    </ClientOnly>

    <div class="vicio-sidebar">
      <header class="sidebar-header">
        <h2 class="sidebar-title">
          ELIGE TU SALCHIMONSTER MÁS CERCANO
        </h2>

        <div class="city-select-wrapper">
          <label class="city-label" for="city-select">Ciudad</label>
          <div class="city-select-container">
            <select
              id="city-select"
              v-model.number="selectedCityId"
              class="city-select"
              @change="onCityChange"
            >
              <option :value="0">Todas las ciudades</option>
              <option
                v-for="city in orderedCities"
                :key="city.city_id"
                :value="city.city_id"
              >
                {{ city.city_name }}
              </option>
            </select>
            <span class="city-select-arrow">
              <Icon name="mdi:chevron-down" size="1.2em" />
            </span>
          </div>
        </div>

        <div class="search-wrapper">
          <input
            v-model="addressQuery"
            type="text"
            class="search-input"
            placeholder="Escribe tu dirección para domicilio…"
            @input="onAddressInput"
            autocomplete="off"
          />
          <ul v-if="showSuggestions" class="autocomplete-list">
            <li
              v-for="s in suggestions"
              :key="s.place_id"
              class="autocomplete-item"
              @click="onSelectSuggestion(s)"
            >
              <Icon name="mdi:map-marker-outline" class="item-icon" />
              {{ s.description }}
            </li>
            <li
              v-if="!suggestions.length && addressQuery.trim().length > 0 && !loadingAutocomplete"
              class="autocomplete-empty"
            >
              No se encontraron resultados.
            </li>
            <li v-if="loadingAutocomplete" class="autocomplete-loading">
              Buscando…
            </li>
          </ul>
        </div>
      </header>

      <section v-if="coverageResult" class="coverage-card">
        <div class="coverage-header">
          <Icon name="mdi:map-marker-check" size="1.4em" class="coverage-icon" />
          <h3 class="coverage-title">Resumen de domicilio</h3>
        </div>
        
        <div class="coverage-body">
          <div class="coverage-row">
            <span class="coverage-label">Dirección:</span>
            <span class="coverage-value address-text">{{ coverageResult.formatted_address }}</span>
          </div>
          
          <div class="coverage-row">
            <span class="coverage-label">Sede más cercana:</span>
            <span class="coverage-value">
              {{ coverageResult.nearest?.site?.site_name || 'N/A' }} 
              <small v-if="coverageResult.nearest">({{ coverageResult.nearest.distance_km.toFixed(1) }} km)</small>
            </span>
          </div>

          <div class="coverage-row highlight">
            <span class="coverage-label">Costo envío:</span>
            <span class="coverage-value price">{{ formatCOP(coverageResult.delivery_cost_cop) }}</span>
          </div>

          <div class="coverage-status-text" :class="coverageResult.nearest?.in_coverage ? 'text-ok' : 'text-fail'">
             {{ coverageResult.nearest?.in_coverage ? '✅ Cubrimos tu zona' : '❌ Fuera de zona de entrega' }}
          </div>
        </div>

        <div class="coverage-actions">
            <button 
                v-if="coverageResult.nearest?.in_coverage && getStoreById(coverageResult.nearest.site.site_id)"
                class="btn-action btn-delivery"
                @click="goToStore(getStoreById(coverageResult.nearest.site.site_id)!, 'delivery')"
            >
                <Icon name="mdi:moped" size="1.2em" />
                Pedir Domicilio
            </button>

            <button 
                v-if="coverageResult.nearest && getStoreById(coverageResult.nearest.site.site_id)"
                class="btn-action btn-pickup"
                @click="goToStore(getStoreById(coverageResult.nearest.site.site_id)!, 'pickup')"
            >
                <Icon name="mdi:shopping-outline" size="1.2em" />
                Recoger en Sede
            </button>
        </div>
      </section>

      <main class="stores-list">
        <article
          v-for="store in filteredStores"
          :key="store.id"
          class="store-item"
          :class="{ 'store-item--active': store.id === selectedStoreId }"
          @click="goToStore(store, 'default')"
        >
          <div class="store-img-wrapper">
            <img
              :src="currentImage(store)"
              @load="loadHighResImage(store)"
              @error="onImgError(store)"
              class="store-img"
              alt="Foto sede"
            />
          </div>

          <div class="store-info">
            <h3 class="store-name">{{ store.name }}</h3>
            <p class="store-services">
              <span v-for="(service, idx) in store.services" :key="service">
                {{ service }}
                <span v-if="idx < store.services.length - 1"> | </span>
              </span>
            </p>
            <p class="store-address">
              {{ store.address }} – {{ store.city }}
            </p>
            
            <button
              class="store-action"
              :data-status="store.status || 'unknown'"
            >
              <span v-if="store.status === 'open'" class="status-flex">
                <Icon name="mdi:check-circle-outline" size="1.1em" />
                Abierto
              </span>
              <span v-else-if="store.status === 'closed' || store.status === 'close'" class="status-flex">
                <Icon name="mdi:close-circle-outline" size="1.1em" />
                Cerrado
              </span>
              <span v-else class="status-flex">
                <Icon name="mdi:progress-clock" size="1.1em" />
                Consultando…
              </span>
            </button>
          </div>

          <button class="store-arrow" @click.stop="goToStore(store, 'default')">
             <Icon name="mdi:chevron-right" size="1.6em" />
          </button>
        </article>

        <p v-if="filteredStores.length === 0" class="no-results">
          No se encontraron sedes en el área visible.
          <br />
          Mueve el mapa o cambia la ciudad seleccionada.
        </p>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import 'leaflet/dist/leaflet.css'

// ==========================================
// CONFIGURACIÓN E INTERFACES
// ==========================================
const BACKEND_BASE = 'https://backend.salchimonster.com'
const LOCATIONS_BASE = 'https://api.locations.salchimonster.com'

const map = ref<any>(null)
const leafletModule = ref<any>(null)
const markers = ref<Record<number, any>>({})
const mapBounds = ref<MapBounds | null>(null)
const initialBounds = ref<any | null>(null)

interface Store {
  id: number
  name: string
  city: string
  cityId: number
  postalCode: string
  address: string
  lat: number
  lng: number
  services: string[]
  status?: string
  nextOpeningTime?: string | null
  subdomain: string
  img_id?: number | null
}

interface MapBounds {
  north: number
  south: number
  east: number
  west: number
}

interface RawSite {
  site_id: number
  site_name: string
  site_address: string | null
  city_name: string
  city_id: number
  show_on_web: boolean
  time_zone: string
  location?: [number, number] | null
  subdomain: string
  img_id?: number | null
  site_phone?: string
}

interface City {
  city_id: number
  city_name: string
  visible: boolean
  index: number
}

interface PlaceSuggestion {
  description: string
  place_id: string
}

interface CoverageNearestSite {
  site: {
    site_id: number
    site_name: string
    site_address: string | null
    time_zone: string
    city: string
  }
  distance_km: number
  in_coverage: boolean
  driving_distance_km: number
}

interface CoverageDetails {
  place_id: string
  formatted_address: string
  lat: number
  lng: number
  nearest: CoverageNearestSite | null
  delivery_cost_cop: number
  distance_km: number
  error: any
}

const stores = ref<Store[]>([])
const cities = ref<City[]>([])
const selectedCityId = ref<number>(0)
const selectedStoreId = ref<number | null>(null)

// Autocomplete
const addressQuery = ref('')
const suggestions = ref<PlaceSuggestion[]>([])
const loadingAutocomplete = ref(false)
const showSuggestions = ref(false)
const coverageResult = ref<CoverageDetails | null>(null)
const dropoffMarker = ref<any | null>(null)
let dropoffIcon: any = null

const sessionToken = ref(
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
)

// ==========================================
// LÓGICA DE IMÁGENES
// ==========================================
const imgCache = ref<Record<number, string>>({})
const lowResSite = (site_id: number)  => `${BACKEND_BASE}/read-product-image/96/site-${site_id}`
const highResSite = (site_id: number) => `${BACKEND_BASE}/read-product-image/600/site-${site_id}`
const byImgId = (img_id: number)      => `${BACKEND_BASE}/read-photo-product/${img_id}`

const currentImage = (store: Store) => {
  if (imgCache.value[store.id]) return imgCache.value[store.id]
  imgCache.value[store.id] = lowResSite(store.id)
  return imgCache.value[store.id]
}

const loadHighResImage = (store: Store) => {
  if (store.img_id) {
    const hi = byImgId(store.img_id)
    const probe = new Image()
    probe.src = hi
    probe.onload = () => { imgCache.value[store.id] = hi }
    probe.onerror = () => {
      const fallbackHi = highResSite(store.id)
      const p2 = new Image()
      p2.src = fallbackHi
      p2.onload = () => { imgCache.value[store.id] = fallbackHi }
    }
    return
  }
  const hi = highResSite(store.id)
  const probe = new Image()
  probe.src = hi
  probe.onload = () => { imgCache.value[store.id] = hi }
}

const onImgError = (store: Store) => {
  imgCache.value[store.id] = lowResSite(store.id)
}

// ==========================================
// UTILIDADES
// ==========================================
function getPostalCode(city: string): string {
  switch (city) {
    case 'Cali': return '760001'
    case 'Jamundí': return '764001'
    case 'Bogotá': return '110111'
    case 'Medellín': return '050001'
    default: return 'Colombia'
  }
}

function getFallbackCoords(site: RawSite): { lat: number; lng: number } {
   if (site.site_id === 32) return { lat: 3.5005, lng: -76.506 }
   if (site.city_name === 'Cali') return { lat: 3.4516, lng: -76.532 }
   if (site.city_name === 'Bogotá') return { lat: 4.711, lng: -74.0721 }
   if (site.city_name === 'Medellín') return { lat: 6.2442, lng: -75.5812 }
   return { lat: 4.5, lng: -74.1 }
}

function getCoordsFromSite(site: RawSite): { lat: number; lng: number } {
  if (site.location && site.location.length === 2) {
    const [lat, lng] = site.location
    return { lat, lng }
  }
  return getFallbackCoords(site)
}

function formatCOP(value: number | null | undefined): string {
  if (value == null) return ''
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)
}

function getStoreById(id: number): Store | undefined {
    return stores.value.find(s => s.id === id)
}

// ==========================================
// CARGA DE DATOS
// ==========================================
async function loadCities() {
  try {
    const response = await fetch(`${BACKEND_BASE}/cities`)
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`)
    const data = (await response.json()) as City[]
    cities.value = data.filter(c => c.visible !== false)
  } catch (err) {
    console.error('Error ciudades:', err)
  }
}

async function loadStores() {
  try {
    const response = await fetch(`${BACKEND_BASE}/sites`)
    if (!response.ok) throw new Error(`Error HTTP ${response.status}`)
    const data = (await response.json()) as RawSite[]
    const colombianSites = data.filter(
      (s) => s.show_on_web && s.time_zone === 'America/Bogota'
    )
    stores.value = colombianSites.map((s) => {
      const { lat, lng } = getCoordsFromSite(s)
      return {
        id: s.site_id,
        name: `SALCHIMONSTER ${s.site_name}`,
        city: s.city_name,
        cityId: s.city_id,
        postalCode: getPostalCode(s.city_name),
        address: s.site_address ?? 'Dirección próximamente',
        lat,
        lng,
        services: ['RECOGIDA', 'EN LOCAL', 'DOMICILIO'],
        status: 'unknown',
        nextOpeningTime: null,
        subdomain: s.subdomain,
        img_id: s.img_id
      }
    })
  } catch (err) {
    console.error('Error sedes:', err)
  }
}

async function loadStatuses() {
  const promises = stores.value.map(async (store) => {
    try {
      const res = await fetch(`${BACKEND_BASE}/site/${store.id}/status`)
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`)
      const data = await res.json() as { status: string; next_opening_time: string | null }
      store.status = data.status
      store.nextOpeningTime = data.next_opening_time
    } catch (err) {
      if (!store.status) store.status = 'unknown'
    }
  })
  await Promise.all(promises)
}

// ==========================================
// NAVEGACIÓN A TIENDA (CONTROLADA)
// ==========================================
// 'mode' define qué datos se envían.
// 'delivery': envía address y costo (solo desde botón cobertura).
// 'pickup' / 'default': NO envían datos de domicilio.
function goToStore(store: Store, mode: 'delivery' | 'pickup' | 'default') {
  if (typeof window === 'undefined') return
  const protocol = window.location.protocol || 'http:'
  let url = `${protocol}//${store.subdomain}.localhost:3000` // Cambiar localhost por tu dominio real en producción

  const params = new URLSearchParams()

  // REGLA DE SEGURIDAD: Solo adjuntar datos si el modo es explícitamente 'delivery'
  // y tenemos un resultado de cobertura válido cargado.
  if (mode === 'delivery' && coverageResult.value) {
    params.append('address', coverageResult.value.formatted_address)
    if (coverageResult.value.delivery_cost_cop !== undefined && coverageResult.value.delivery_cost_cop !== null) {
        params.append('delivery_cost', coverageResult.value.delivery_cost_cop.toString())
    }
    // Opcional: indicar que es delivery
    params.append('modality', 'delivery')
  } else if (mode === 'pickup') {
      // Opcional: forzar modalidad recoger
      params.append('modality', 'pickup')
  }

  const queryString = params.toString()
  if (queryString) {
      url += `?${queryString}`
  }

  window.location.href = url
}

// ==========================================
// FILTROS & MAPA
// ==========================================
const orderedCities = computed(() => {
  return [...cities.value.filter(s => ![18, 15].includes(s.city_id))]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
})
const selectedCity = computed(() => cities.value.find(c => c.city_id === selectedCityId.value) ?? null)
const filteredStores = computed(() => {
  let base = stores.value
  if (selectedCityId.value) base = base.filter(s => s.cityId === selectedCityId.value)
  const bounds = mapBounds.value
  if (bounds) {
    base = base.filter((s) => s.lat <= bounds.north && s.lat >= bounds.south && s.lng <= bounds.east && s.lng >= bounds.west)
  }
  return base
})

function updateBounds() {
  if (!map.value) return
  const b = map.value.getBounds()
  mapBounds.value = { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() }
}

onMounted(async () => {
  const mod = await import('leaflet')
  const L = (mod as any).default ?? mod
  leafletModule.value = L

  const colombiaBounds = L.latLngBounds(L.latLng(-4.5, -79.5), L.latLng(13.5, -66.5))
  map.value = L.map('vicio-map', {
    zoom: 6, minZoom: 5, maxZoom: 16,
    maxBounds: colombiaBounds, maxBoundsViscosity: 1.0, zoomControl: false,
    scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false,
    boxZoom: false, keyboard: false, dragging: false, tap: false
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map.value)
  
  const fireIcon = L.divIcon({
    className: 'leaflet-div-icon fire-icon',
    html: `<img src="https://cdn.deliclever.com/viciocdn/ecommerce/icon-fire-color.gif" alt="Salchimonster flame" class="fire-img" />`
  })
  dropoffIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41], iconAnchor: [12, 41]
  })

  await Promise.all([loadCities(), loadStores()])
  await loadStatuses()

  const latlngs: [number, number][] = []
  stores.value.forEach((store) => {
    const marker = L.marker([store.lat, store.lng], { icon: fireIcon }).addTo(map.value).bindPopup(`<strong>${store.name}</strong><br>${store.address}`)
    markers.value[store.id] = marker
    latlngs.push([store.lat, store.lng])
  })

  if (latlngs.length > 0) {
    const bounds = L.latLngBounds(latlngs)
    const zoomForSites = map.value.getBoundsZoom(bounds)
    map.value.fitBounds(bounds, { padding: [40, 40] })
    map.value.setMinZoom(zoomForSites)
    initialBounds.value = bounds
  } else {
    initialBounds.value = colombiaBounds
    map.value.fitBounds(colombiaBounds, { padding: [40, 40] })
  }
  updateBounds()
  map.value.on('moveend', updateBounds)
})

function onCityChange() {
  coverageResult.value = null
  addressQuery.value = ''
  suggestions.value = []
  showSuggestions.value = false
  if (!map.value || !leafletModule.value) return
  const L = leafletModule.value
  const cityIdAtClick = selectedCityId.value
  if (!initialBounds.value) initialBounds.value = map.value.getBounds()
  
  if (!cityIdAtClick) {
    map.value.flyToBounds(initialBounds.value, { padding: [40, 40], animate: true, duration: 0.9 })
    return
  }
  const cityStores = stores.value.filter(s => s.cityId === cityIdAtClick)
  const latlngs: [number, number][] = cityStores.map(s => [s.lat, s.lng])
  if (!latlngs.length) return
  const targetBounds = L.latLngBounds(latlngs)
  
  map.value.flyToBounds(initialBounds.value, { padding: [40, 40], animate: true, duration: 0.7 })
  setTimeout(() => {
    if (!map.value || selectedCityId.value !== cityIdAtClick) return
    map.value.flyToBounds(targetBounds, { padding: [40, 40], animate: true, duration: 0.9 })
  }, 750)
}

// ==========================================
// AUTOCOMPLETE
// ==========================================
let autocompleteTimeout: any = null
function onAddressInput() {
  coverageResult.value = null
  showSuggestions.value = true
  if (autocompleteTimeout) clearTimeout(autocompleteTimeout)
  const query = addressQuery.value.trim()
  if (!query) { suggestions.value = []; loadingAutocomplete.value = false; return }
  autocompleteTimeout = setTimeout(() => { fetchAutocomplete(query) }, 300)
}

async function fetchAutocomplete(query: string) {
  try {
    loadingAutocomplete.value = true
    const params = new URLSearchParams()
    params.append('input', query); params.append('language', 'es'); params.append('countries', 'co');
    params.append('limit', '5'); params.append('session_token', sessionToken.value)
    if (selectedCity.value && !selectedCity.value.city_name.toLowerCase().includes('solo pick up')) {
      params.append('city', selectedCity.value.city_name)
    }
    const res = await fetch(`${LOCATIONS_BASE}/co/places/autocomplete?${params.toString()}`)
    if (!res.ok) throw new Error('Error autocomplete')
    const data = await res.json()
    const preds = Array.isArray(data.predictions) ? data.predictions : []
    suggestions.value = preds.map((p: any) => ({ place_id: p.place_id, description: p.description || '' }))
  } catch (e) { console.error(e); suggestions.value = [] } finally { loadingAutocomplete.value = false }
}

function onSelectSuggestion(s: PlaceSuggestion) {
  addressQuery.value = s.description; showSuggestions.value = false; suggestions.value = []
  fetchCoverageDetails(s.place_id)
}

async function fetchCoverageDetails(placeId: string) {
  try {
    const params = new URLSearchParams()
    params.append('place_id', placeId); params.append('session_token', sessionToken.value); params.append('language', 'es')
    const res = await fetch(`${LOCATIONS_BASE}/co/places/coverage-details?${params.toString()}`)
    if (!res.ok) throw new Error('Error coverage')
    const data = (await res.json()) as CoverageDetails
    coverageResult.value = data
    if (!map.value || !leafletModule.value) return
    const L = leafletModule.value
    if (data.lat != null && data.lng != null) {
      if (dropoffMarker.value) map.value.removeLayer(dropoffMarker.value)
      dropoffMarker.value = L.marker([data.lat, data.lng], { icon: dropoffIcon }).addTo(map.value)
    }
    let nearestStore: Store | undefined
    if (data.nearest && data.nearest.site) nearestStore = stores.value.find((s) => s.id === data.nearest!.site.site_id)
    if (nearestStore) {
      const cityId = nearestStore.cityId
      selectedCityId.value = cityId; selectedStoreId.value = nearestStore.id
      const cityStores = stores.value.filter((s) => s.cityId === cityId)
      const latlngs: [number, number][] = cityStores.map((s) => [s.lat, s.lng])
      if (latlngs.length > 0) {
        if (!initialBounds.value) initialBounds.value = map.value.getBounds()
        const targetBounds = L.latLngBounds(latlngs)
        const cityIdAtMoment = cityId
        map.value.flyToBounds(initialBounds.value, { padding: [40, 40], animate: true, duration: 0.7 })
        setTimeout(() => {
          if (!map.value || selectedCityId.value !== cityIdAtMoment) return
          map.value.flyToBounds(targetBounds, { padding: [40, 40], animate: true, duration: 0.9 })
        }, 750)
        const marker = markers.value[nearestStore!.id]
        if (marker) marker.openPopup()
        return
      }
    }
    if (data.lat != null && data.lng != null) map.value.setView([data.lat, data.lng], 14, { animate: true })
  } catch (e) { console.error(e) }
}
</script>

<style scoped>
/* =========================================
   ESTILOS GENERALES
   ========================================= */
.vicio-page {
  display: flex; min-height: 100vh; width: 100%; overflow-x: hidden;
  background: var(--bg-page); color: var(--text-primary); font-family: 'Roboto', sans-serif;
}
.vicio-map { flex: 1 1 55%; height: 100vh; background: #e2e8f0; }

/* SIDEBAR */
.vicio-sidebar {
  flex: 1 1 45%; display: flex; flex-direction: column;
  background: #ffffff; border-left: 1px solid var(--border-subtle);
  box-shadow: -5px 0 25px rgba(0, 0, 0, 0.05); max-height: 100vh;
}
.sidebar-header {
  padding: 1.4rem 1.8rem 1rem; border-bottom: 1px solid var(--border-subtle);
  background: #ffffff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
  position: relative; z-index: 5;
}
.sidebar-title {
  font-size: 0.82rem; letter-spacing: 0.18em; font-weight: 800; margin: 0 0 0.9rem;
  text-transform: uppercase; color: var(--text-primary); display: flex; align-items: center; gap: 0.4rem;
}
.sidebar-title::before { content: "🔥"; font-size: 1rem; }

/* SELECT CIUDAD */
.city-select-wrapper { margin-bottom: 0.9rem; }
.city-label {
  display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.12em; color: var(--text-soft); margin-bottom: 0.35rem;
}
.city-select-container { position: relative; display: flex; align-items: center; }
.city-select {
  width: 100%; padding: 0.55rem 2.4rem 0.55rem 0.9rem;
  border-radius: 0.55rem; border: 1px solid var(--border-subtle);
  font-size: 0.86rem; outline: none; background: #ffffff; color: var(--text-primary);
  cursor: pointer; appearance: none;
}
.city-select:hover { border-color: var(--accent); background-color: #f8fafc; }
.city-select-arrow {
  position: absolute; right: 0.9rem; pointer-events: none;
  display: flex; color: var(--text-primary);
}

/* SEARCH */
.search-wrapper { position: relative; display: flex; flex-direction: column; gap: 0.25rem; }
.search-input {
  padding: 0.55rem 1rem; border-radius: 0.55rem; border: 1px solid var(--border-subtle);
  font-size: 0.9rem; background: #f1f5f9; outline: none;
}
.search-input:focus { background: #ffffff; border-color: var(--accent); }

/* AUTOCOMPLETE */
.autocomplete-list {
  position: absolute; top: 100%; left: 0; right: 0; margin-top: 0.35rem;
  background: #ffffff; border-radius: 0.55rem; border: 1px solid var(--border-subtle);
  max-height: 220px; overflow-y: auto; list-style: none; padding: 0.25rem 0;
  z-index: 20; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}
.autocomplete-item {
  padding: 0.6rem 1rem; font-size: 0.86rem; cursor: pointer;
  display: flex; align-items: center; gap: 0.55rem;
}
.autocomplete-item:hover { background: #fff7ed; color: var(--accent); }
.item-icon { color: var(--text-soft); font-size: 1.1em; }
.autocomplete-empty, .autocomplete-loading { padding: 0.8rem; text-align: center; font-size: 0.8rem; color: #888; }

/* COVERAGE CARD */
.coverage-card {
  margin: 1rem 1.8rem; background-color: #ffffff;
  border: 1px solid #e2e8f0; border-radius: 0.75rem; overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}
.coverage-header {
  background: #f8fafc; padding: 0.75rem 1rem; display: flex;
  align-items: center; gap: 0.5rem; border-bottom: 1px solid #e2e8f0;
}
.coverage-icon { color: #ff6600; }
.coverage-title { margin: 0; font-size: 0.85rem; font-weight: 800; text-transform: uppercase; color: #334155; }
.coverage-body { padding: 1rem; font-size: 0.9rem; }
.coverage-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
.coverage-label { color: #64748b; font-weight: 500; font-size: 0.85rem; }
.coverage-value { color: #1e293b; font-weight: 600; text-align: right; max-width: 60%; }
.coverage-value.address-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.coverage-value.price { color: #16a34a; font-weight: 800; font-size: 1rem; }
.coverage-status-text { margin-top: 0.8rem; padding-top: 0.5rem; border-top: 1px dashed #e2e8f0; text-align: center; font-size: 0.85rem; font-weight: 700; }
.text-ok { color: #15803d; }
.text-fail { color: #b91c1c; }

/* BOTONES DE ACCIÓN DE COBERTURA */
.coverage-actions {
    display: flex; gap: 0.8rem; padding: 0 1rem 1rem; flex-wrap: wrap;
}
.btn-action {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.4rem;
    padding: 0.7rem; border-radius: 0.5rem; font-size: 0.85rem; font-weight: 700;
    text-transform: uppercase; cursor: pointer; border: none; transition: transform 0.1s;
}
.btn-action:active { transform: scale(0.97); }
.btn-delivery {
    background-color: #ff6600; color: #ffffff; box-shadow: 0 4px 10px rgba(255, 102, 0, 0.25);
}
.btn-delivery:hover { background-color: #e65c00; }
.btn-pickup {
    background-color: #ffffff; color: #334155; border: 2px solid #e2e8f0;
}
.btn-pickup:hover { border-color: #334155; background-color: #f8fafc; }

/* LISTA DE SEDES */
.stores-list { flex: 1; overflow-y: auto; padding: 0.45rem 0; background: #ffffff; }
.store-item {
  display: flex; align-items: center; justify-content: flex-start;
  padding: 0.95rem 1.8rem; border-bottom: 1px solid #f1f5f9;
  cursor: pointer; gap: 1rem; transition: all 0.15s ease;
}
.store-item:hover { background: #f8fafc; transform: translateY(-1px); }
.store-item--active { background: #fff7ed; border-left: 3px solid #ff6600; }

/* IMAGEN SEDE */
.store-img-wrapper {
  width: 90px; height: 90px; flex-shrink: 0; border-radius: 0.5rem;
  overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background-color: #f1f5f9;
}
.store-img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
.store-item:hover .store-img { transform: scale(1.05); }

/* INFO */
.store-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
.store-name { margin: 0; font-size: 1rem; font-weight: 800; color: var(--text-primary); }
.store-services { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: #ff6600; letter-spacing: 0.12em; }
.store-address { font-size: 0.84rem; color: var(--text-soft); margin-bottom: 0.4rem; }

/* BOTÓN ESTADO */
.store-action {
  align-self: flex-start; border: none; font-size: 0.72rem; font-weight: 800;
  padding: 0.38rem 0.85rem; border-radius: 999px; text-transform: uppercase;
  letter-spacing: 0.12em; display: inline-flex; align-items: center;
}
.status-flex { display: flex; align-items: center; gap: 0.35rem; }
.store-action[data-status='open'] { background: #dcfce7; color: #166534; }
.store-action[data-status='closed'], .store-action[data-status='close'] { background: #fee2e2; color: #991b1b; }
.store-action[data-status='unknown'] { background: #f1f5f9; color: #94a3b8; }

/* FLECHA */
.store-arrow {
  background: #000000; color: #ffffff; width: 40px; height: 40px;
  border-radius: 50%; border: none; cursor: pointer; display: flex;
  align-items: center; justify-content: center; transition: transform 0.2s ease, background 0.2s ease;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2); flex-shrink: 0;
}
.store-arrow:hover { background: #333333; transform: scale(1.1); }
.no-results { padding: 2rem; text-align: center; color: #64748b; font-size: 0.9rem; }

/* LEAFLET & RESPONSIVE */
:global(.leaflet-div-icon.fire-icon) { width: 42px !important; height: 42px !important; border: none; background: transparent; display: flex; align-items: center; justify-content: center; }
:global(.leaflet-div-icon.fire-icon .fire-img) { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
:deep(.leaflet-tile) { filter: grayscale(100%) !important; }

/* LAYOUT MOVIL */
@media (max-width: 900px) {
  .vicio-page { flex-direction: column; height: 100vh; overflow: hidden; }
  .vicio-map { flex: 0 0 40%; height: 40% !important; width: 100%; z-index: 10; }
  .vicio-sidebar {
    flex: 1 1 60%; height: 60% !important; width: 100%;
    overflow: hidden; 
    border-radius: 1.5rem 1.5rem 0 0;
    margin-top: -1.5rem;
    z-index: 20;
    box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
  }
  .stores-list { flex: 1; overflow-y: auto; padding-bottom: 2rem; }
  .sidebar-header { flex-shrink: 0; position: sticky; top: 0; }
  .store-img-wrapper { width: 70px; height: 70px; }
  .store-item { padding: 0.8rem 1rem; }
  .coverage-card { margin: 1rem; }
}
</style>