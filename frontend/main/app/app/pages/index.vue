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

        <div class="search-wrapper">
          <input
            v-model="sidebarAddressQuery"
            type="text"
            class="search-input"
            placeholder="📍 Escribe tu dirección para ver cobertura..."
            @input="onSidebarAddressInput"
            autocomplete="off"
          />
          <ul v-if="showSidebarSuggestions" class="autocomplete-list">
            <li
              v-for="s in sidebarSuggestions"
              :key="s.place_id"
              class="autocomplete-item"
              @click="onSelectSidebarSuggestion(s)"
            >
              <Icon name="mdi:map-marker-outline" class="item-icon" />
              {{ s.description }}
            </li>
            <li v-if="loadingSidebar" class="autocomplete-loading">Buscando...</li>
          </ul>
        </div>
      </header>

      <main class="stores-list">
        <article
          v-for="store in filteredStores"
          :key="store.id"
          class="store-item"
          :class="{ 'store-item--active': store.id === selectedStoreId }"
          @click="handleStoreClick(store)"
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
                <Icon name="mdi:check-circle-outline" size="1.1em" /> Abierto
              </span>
              <span v-else-if="store.status === 'closed' || store.status === 'close'" class="status-flex">
                <Icon name="mdi:close-circle-outline" size="1.1em" /> Cerrado
              </span>
              <span v-else class="status-flex">
                <Icon name="mdi:progress-clock" size="1.1em" /> ...
              </span>
            </button>
          </div>

          <button class="store-arrow" @click.stop="handleStoreClick(store)">
             <Icon name="mdi:chevron-right" size="1.6em" />
          </button>
        </article>

        <p v-if="filteredStores.length === 0" class="no-results">
          No se encontraron sedes.
        </p>
      </main>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-content">
        <button class="modal-close" @click="closeModal">
          <Icon name="mdi:close" size="1.5em" />
        </button>
        
        <div class="modal-header">
          <h3 class="modal-title">
            {{ getModalTitle() }}
          </h3>
          <p class="modal-subtitle" v-if="pendingStore">
            Sede: <strong>{{ pendingStore.name }}</strong>
          </p>
        </div>

        <div v-if="modalStep === 'select'" class="modal-actions">
          <button class="modal-btn btn-pickup" @click="selectPickup">
            <Icon name="mdi:shopping-outline" size="1.6em" />
            <div>
              <span>Pasar a Recoger</span>
              <small>Ir al menú para llevar</small>
            </div>
          </button>

          <button class="modal-btn btn-delivery" @click="goToAddressStep">
            <Icon name="mdi:moped" size="1.6em" />
            <div>
              <span>Pedir a Domicilio</span>
              <small>Verificar cobertura y costo</small>
            </div>
          </button>
        </div>

        <div v-else class="modal-address-step">
          <div class="modal-input-wrapper">
            <input 
              ref="modalInputRef"
              v-model="modalAddressQuery"
              type="text" 
              class="modal-search-input"
              placeholder="Ingresa tu dirección exacta..."
              @input="onModalAddressInput"
              autocomplete="off"
            />
            
            <ul v-if="showModalSuggestions" class="modal-autocomplete-list">
              <li
                v-for="s in modalSuggestions"
                :key="s.place_id"
                class="modal-autocomplete-item"
                @click="onSelectModalSuggestion(s)"
              >
                <Icon name="mdi:map-marker-outline" class="item-icon" />
                {{ s.description }}
              </li>
              <li v-if="loadingModalAutocomplete" class="modal-loading-item">Buscando...</li>
            </ul>
          </div>

          <div v-if="calculatingCoverage" class="coverage-loading">
            <Icon name="mdi:loading" size="2em" class="spin-icon" />
            <p>Verificando cobertura...</p>
          </div>

          <div v-if="modalCoverageResult && !calculatingCoverage" class="modal-coverage-result">
            <div class="result-row">
              <span class="label">Dirección:</span>
              <span class="value address" :title="modalCoverageResult.formatted_address">
                {{ modalCoverageResult.formatted_address }}
              </span>
            </div>
            
            <div class="result-row" v-if="modalCoverageResult.nearest?.site && pendingStore && modalCoverageResult.nearest.site.site_id !== pendingStore.id">
               <span class="label">Atendido por:</span>
               <span class="value highlight-store">{{ modalCoverageResult.nearest.site.site_name }}</span>
            </div>

            <div class="result-row">
              <span class="label">Costo envío:</span>
              <span class="value price">{{ formatCOP(modalCoverageResult.delivery_cost_cop) }}</span>
            </div>
            
            <div class="result-status" :class="modalCoverageResult.nearest?.in_coverage ? 'status-ok' : 'status-fail'">
               <Icon :name="modalCoverageResult.nearest?.in_coverage ? 'mdi:check-circle' : 'mdi:alert-circle'" />
               {{ modalCoverageResult.nearest?.in_coverage ? '¡Estás en zona!' : 'Fuera de zona' }}
            </div>

            <button 
              v-if="modalCoverageResult.nearest?.in_coverage"
              class="modal-confirm-btn"
              @click="confirmDeliveryAndGo"
            >
              Realizar Pedido
              <Icon name="mdi:arrow-right" />
            </button>
          </div>

          <button v-if="modalStep === 'address'" class="modal-back-link" @click="modalStep = 'select'">
            Cambiar a Recoger
          </button>
        </div>

      </div>
    </div>

    <Transition name="fade">
      <div v-if="isRedirecting" class="redirect-overlay">
        <div class="redirect-content">
          <div class="redirect-spinner">
            <Icon name="mdi:rocket-launch-outline" size="3em" class="rocket-icon" />
            <div class="pulse-ring"></div>
          </div>
          <h2 class="redirect-title">Te estamos llevando a</h2>
          <h3 class="redirect-store">{{ redirectStoreName }}</h3>
          <p class="redirect-subtitle">Preparando el menú...</p>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import 'leaflet/dist/leaflet.css'

// ==========================================
// CONFIGURACIÓN
// ==========================================
const BACKEND_BASE = 'https://backend.salchimonster.com'
const LOCATIONS_BASE = 'https://api.locations.salchimonster.com'

const map = ref<any>(null)
const leafletModule = ref<any>(null)

// Interfaces
interface Store {
  id: number; name: string; city: string; cityId: number; address: string; lat: number; lng: number
  services: string[]; status?: string; subdomain: string; img_id?: number | null
}
interface RawSite {
  site_id: number; site_name: string; site_address: string | null; city_name: string; city_id: number
  show_on_web: boolean; time_zone: string; location?: [number, number] | null; subdomain: string; img_id?: number | null
}
interface PlaceSuggestion { description: string; place_id: string }
interface CoverageDetails {
  place_id: string; formatted_address: string; lat: number; lng: number; delivery_cost_cop: number;
  nearest: { site: { site_id: number; site_name: string; subdomain?: string }; in_coverage: boolean } | null
}

const stores = ref<Store[]>([])
const selectedStoreId = ref<number | null>(null)
const sessionToken = ref(Math.random().toString(36).slice(2))

// ==========================================
// ESTADO DE REDIRECCIÓN
// ==========================================
const isRedirecting = ref(false)
const redirectStoreName = ref('')

// ==========================================
// ESTADO DEL MODAL Y BÚSQUEDA
// ==========================================
const showModal = ref(false)
const modalStep = ref<'select' | 'address'>('select')
const pendingStore = ref<Store | null>(null)

// Modal Internals
const modalAddressQuery = ref('')
const modalSuggestions = ref<PlaceSuggestion[]>([])
const showModalSuggestions = ref(false)
const loadingModalAutocomplete = ref(false)
const calculatingCoverage = ref(false)
const modalCoverageResult = ref<CoverageDetails | null>(null)
const modalInputRef = ref<HTMLInputElement | null>(null)

// Sidebar Search
const sidebarAddressQuery = ref('')
const sidebarSuggestions = ref<PlaceSuggestion[]>([])
const showSidebarSuggestions = ref(false)
const loadingSidebar = ref(false)

// Imágenes
const imgCache = ref<Record<number, string>>({})
const FALLBACK_IMG = `${BACKEND_BASE}/read-photo-product/default`
const currentImage = (s: Store) => imgCache.value[s.id] || (s.img_id ? `${BACKEND_BASE}/read-photo-product/${s.img_id}` : FALLBACK_IMG)
const loadHighResImage = (s: Store) => { if(s.img_id) { const i = new Image(); i.src = `${BACKEND_BASE}/read-photo-product/${s.img_id}`; i.onload = () => imgCache.value[s.id] = i.src } }
const onImgError = (s: Store) => imgCache.value[s.id] = FALLBACK_IMG

// ==========================================
// LÓGICA PRINCIPAL DE INTERACCIÓN
// ==========================================

// CASO 1: CLICK EN LA TARJETA DE TIENDA
function handleStoreClick(store: Store) {
  pendingStore.value = store
  resetModalState()
  modalStep.value = 'select' 
  showModal.value = true
}

// CASO 2: SELECCIÓN EN EL BUSCADOR LATERAL
async function onSelectSidebarSuggestion(s: PlaceSuggestion) {
  showSidebarSuggestions.value = false
  sidebarAddressQuery.value = s.description
  
  resetModalState()
  modalStep.value = 'address' 
  modalAddressQuery.value = s.description
  showModal.value = true
  
  await fetchModalCoverage(s.place_id)
  
  if (modalCoverageResult.value?.nearest?.site) {
    const found = stores.value.find(st => st.id === modalCoverageResult.value!.nearest!.site.site_id)
    if (found) pendingStore.value = found
  }
}

// LÓGICA INTERNA DEL MODAL
function resetModalState() {
  modalAddressQuery.value = ''
  modalSuggestions.value = []
  showModalSuggestions.value = false
  modalCoverageResult.value = null
  calculatingCoverage.value = false
}

function getModalTitle() {
  if (modalStep.value === 'select') return '¿Cómo quieres tu pedido?'
  if (modalCoverageResult.value) return 'Resultado de Cobertura'
  return 'Ingresa tu dirección'
}

function selectPickup() {
  if (pendingStore.value) {
    goToStoreUrl(pendingStore.value, 'pickup')
  }
}

function goToAddressStep() {
  modalStep.value = 'address'
}

// AUTOCOMPLETE DEL MODAL
let modalTimeout: any = null
function onModalAddressInput() {
  modalCoverageResult.value = null
  showModalSuggestions.value = true
  if (modalTimeout) clearTimeout(modalTimeout)
  if (!modalAddressQuery.value.trim()) return
  modalTimeout = setTimeout(() => fetchAutocomplete(modalAddressQuery.value, 'modal'), 300)
}

function onSelectModalSuggestion(s: PlaceSuggestion) {
  modalAddressQuery.value = s.description
  showModalSuggestions.value = false
  fetchModalCoverage(s.place_id)
}

// API CALLS
async function fetchModalCoverage(placeId: string) {
  try {
    calculatingCoverage.value = true
    const params = new URLSearchParams()
    params.append('place_id', placeId)
    params.append('session_token', sessionToken.value)
    params.append('language', 'es')

    const res = await fetch(`${LOCATIONS_BASE}/es/places/coverage-details?${params.toString()}`)
    if (!res.ok) throw new Error('Err coverage')
    const data = (await res.json()) as CoverageDetails
    modalCoverageResult.value = data
  } catch (e) {
    console.error(e)
  } finally {
    calculatingCoverage.value = false
  }
}

function confirmDeliveryAndGo() {
  if (!modalCoverageResult.value?.nearest?.in_coverage) return
  
  let target = pendingStore.value
  const apiSiteId = modalCoverageResult.value.nearest.site.site_id
  const apiStore = stores.value.find(s => s.id === apiSiteId)
  
  if (apiStore) target = apiStore

  if (target) {
    goToStoreUrl(target, 'delivery', {
      address: modalCoverageResult.value.formatted_address,
      cost: modalCoverageResult.value.delivery_cost_cop
    })
  }
}

function closeModal() {
  showModal.value = false
  pendingStore.value = null
}

// ==========================================
// REDIRECCIÓN CON ANIMACIÓN
// ==========================================
function goToStoreUrl(store: Store, mode: 'delivery' | 'pickup', data?: { address: string, cost: number }) {
  if (typeof window === 'undefined') return
  
  redirectStoreName.value = store.name.replace('SALCHIMONSTER', '').trim() || store.name
  closeModal() 
  isRedirecting.value = true 

  const protocol = window.location.protocol || 'http:'
  let url = `${protocol}//${store.subdomain}.salchimonster.es`
  
  const params = new URLSearchParams()
  if (mode === 'delivery' && data) {
    params.append('address', data.address)
    params.append('delivery_cost', data.cost.toString())
    params.append('modality', 'delivery')
  } else {
    params.append('modality', 'pickup')
  }

  const qs = params.toString()
  if (qs) url += `?${qs}`

  setTimeout(() => {
    window.location.href = url
  }, 2500)
}

// AUTOCOMPLETE SIDEBAR
let sidebarTimeout: any = null
function onSidebarAddressInput() {
  showSidebarSuggestions.value = true
  if (sidebarTimeout) clearTimeout(sidebarTimeout)
  if (!sidebarAddressQuery.value.trim()) {
    sidebarSuggestions.value = []
    return
  }
  sidebarTimeout = setTimeout(() => fetchAutocomplete(sidebarAddressQuery.value, 'sidebar'), 300)
}

async function fetchAutocomplete(query: string, origin: 'sidebar' | 'modal') {
  try {
    if (origin === 'sidebar') loadingSidebar.value = true
    else loadingModalAutocomplete.value = true
    
    const params = new URLSearchParams()
    params.append('input', query)
    params.append('language', 'es')
    params.append('countries', 'es')
    params.append('limit', '5')
    params.append('session_token', sessionToken.value)
    
    const res = await fetch(`${LOCATIONS_BASE}/es/places/autocomplete?${params.toString()}`)
    const data = await res.json()
    const mapped = (data.predictions || []).map((p: any) => ({ place_id: p.place_id, description: p.description || '' }))

    if (origin === 'sidebar') sidebarSuggestions.value = mapped
    else modalSuggestions.value = mapped
  } catch(e) { 
    console.error(e) 
  } finally {
    loadingSidebar.value = false
    loadingModalAutocomplete.value = false
  }
}

// UTILS
function formatCOP(val: number | null | undefined) {
  if (val == null) return ''
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val)
}

// CARGA INICIAL
async function loadData() {
  try {
    const resStores = await fetch(`${BACKEND_BASE}/sites`)
    const rawStores = (await resStores.json()) as RawSite[]
    stores.value = rawStores
      .filter(s => s.show_on_web && s.time_zone === 'Europe/Madrid')
      .map(s => ({
        id: s.site_id, name: `SALCHIMONSTER ${s.site_name}`, city: s.city_name, cityId: s.city_id,
        address: s.site_address ?? '', lat: s.location?.[0] ?? 40.416, lng: s.location?.[1] ?? -3.703,
        services: ['RECOGIDA', 'DOMICILIO'], status: 'unknown', subdomain: s.subdomain, img_id: s.img_id
      }))
    
    stores.value.forEach(async (s) => {
      try {
        const r = await fetch(`${BACKEND_BASE}/site/${s.id}/status`)
        const d = await r.json()
        s.status = d.status
      } catch {}
    })
  } catch(e) { console.error(e) }
}

const filteredStores = computed(() => stores.value)

// ==========================================
// INICIALIZACIÓN DEL MAPA (Lógica del "Viejo")
// ==========================================
onMounted(async () => {
    window.addEventListener('pageshow', (event) => {
    // Si la página se cargó desde la caché (persisted) o simplemente al mostrarse
    isRedirecting.value = false
    
    // Opcional: Si quieres que al volver también se cierre el modal
    // showModal.value = false 
  })
  // ---------------------

  isRedirecting.value = false

  await loadData()
  const mod = await import('leaflet')
  const L = (mod as any).default ?? mod
  leafletModule.value = L

  // 1. DEFINIMOS LOS LÍMITES (BOUNDS) DE ESPAÑA IGUAL QUE EN EL VIEJO
  const spainBounds = L.latLngBounds(
    L.latLng(27.5, -18.5),
    L.latLng(43.9, 4.5)
  )

  // 2. INICIALIZAMOS EL MAPA CON LAS RESTRICCIONES (No zoom, no scroll, no drag)
  map.value = L.map('vicio-map', {
    zoom: 6,
    minZoom: 5,
    maxZoom: 16,
    maxBounds: spainBounds,
    maxBoundsViscosity: 1.0,
    zoomControl: false,       // Sin controles de zoom
    scrollWheelZoom: false,   // Sin zoom con rueda
    doubleClickZoom: false,   // Sin zoom doble click
    touchZoom: false,         // Sin zoom táctil
    boxZoom: false,
    keyboard: false,
    dragging: false,          // MAPA ESTATICO (NO ARRASTRABLE)
    tap: false
  })

  // 3. CAPA DE MOSAICO (TILES)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
    attribution: '&copy; OpenStreetMap' 
  }).addTo(map.value)
  
  // 4. ICONO DE FUEGO (GIF) DEL VIEJO
  const fireIcon = L.divIcon({ 
    className: 'leaflet-div-icon fire-icon', 
    html: `<img src="https://cdn.deliclever.com/viciocdn/ecommerce/icon-fire-color.gif" class="fire-img" alt="Salchimonster" />` 
  })

  // 5. AÑADIR MARCADORES Y CENTRAR
  const latlngs: [number, number][] = []
  
  stores.value.forEach(s => {
    L.marker([s.lat, s.lng], { icon: fireIcon })
      .addTo(map.value)
      .bindPopup(`<strong>${s.name}</strong>`)
    
    latlngs.push([s.lat, s.lng])
  })

  // 6. AJUSTAR LA VISTA INICIAL
  // Si hay sedes, centramos en ellas, sino vista general de España (Valencia por defecto)
  if (latlngs.length > 0) {
    const bounds = L.latLngBounds(latlngs)
    map.value.fitBounds(bounds, { padding: [40, 40] })
  } else {
    map.value.setView([39.478, -0.349], 6) // Centro en Valencia aprox
  }
})

watch(() => modalStep.value, (val) => {
  if (val === 'address' && !modalAddressQuery.value) {
    nextTick(() => modalInputRef.value?.focus())
  }
})
</script>

<style scoped>
/* ESTRUCTURA GENERAL */
/* USAMOS dvh (dynamic viewport height) PARA MOVILES CON BARRAS FLOTANTES */
.vicio-page { display: flex; min-height: 100dvh; width: 100%; font-family: 'Roboto', sans-serif; background: #f8fafc; }
.vicio-map { flex: 1 1 55%; height: 100dvh; background: #e2e8f0; }
.vicio-sidebar { flex: 1 1 45%; display: flex; flex-direction: column; background: #fff; box-shadow: -5px 0 20px rgba(0,0,0,0.05); z-index: 20; position: relative; }

.sidebar-header { padding: 1.5rem; background: #fff; border-bottom: 1px solid #f1f5f9; box-shadow: 0 4px 6px rgba(0,0,0,0.02); z-index: 10; }
.sidebar-title { font-size: 0.9rem; font-weight: 800; text-transform: uppercase; margin-bottom: 1rem; color: #1e293b; letter-spacing: 0.05em; }

/* INPUT SIDEBAR */
.search-wrapper { position: relative; }
.search-input { width: 100%; padding: 0.8rem 1rem; border: 1px solid #e2e8f0; border-radius: 0.6rem; background: #f8fafc; font-size: 0.95rem; outline: none; box-sizing: border-box; }
.search-input:focus { background: #fff; border-color: #ff6600; box-shadow: 0 0 0 3px rgba(255,102,0,0.1); }

/* LISTA SEDES */
.stores-list { flex: 1; overflow-y: auto; padding: 0; }
.store-item { display: flex; padding: 1rem 1.5rem; border-bottom: 1px solid #f1f5f9; cursor: pointer; align-items: center; gap: 1rem; transition: background 0.2s; }
.store-item:hover { background: #f8fafc; }
.store-img-wrapper { width: 70px; height: 70px; border-radius: 0.5rem; overflow: hidden; background: #eee; flex-shrink: 0; }
.store-img { width: 100%; height: 100%; object-fit: cover; }
.store-info { flex: 1; }
.store-name { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; }
.store-services { font-size: 0.7rem; color: #ff6600; font-weight: 700; margin: 0.2rem 0; }
.store-address { font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem; }
.store-action { border: none; font-size: 0.7rem; font-weight: 700; padding: 0.3rem 0.6rem; border-radius: 20px; display: inline-flex; align-items: center; gap: 0.3rem; }
.store-action[data-status='open'] { background: #dcfce7; color: #15803d; }
.store-action[data-status='closed'] { background: #fee2e2; color: #991b1b; }
.store-arrow { width: 32px; height: 32px; border-radius: 50%; background: #000; color: #fff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; }

/* AUTOCOMPLETE LISTS */
.autocomplete-list { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.5rem; margin-top: 0.5rem; list-style: none; padding: 0; z-index: 50; box-shadow: 0 10px 15px rgba(0,0,0,0.05); max-height: 250px; overflow-y: auto; }
.autocomplete-item { padding: 0.8rem 1rem; cursor: pointer; display: flex; gap: 0.5rem; font-size: 0.9rem; color: #334155; }
.autocomplete-item:hover { background: #fff7ed; color: #ea580c; }
.autocomplete-loading { padding: 1rem; text-align: center; color: #94a3b8; font-size: 0.8rem; }

/* ESTILOS MODAL */
.modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh; background: rgba(15, 23, 42, 0.7); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }

.modal-content {
  background: #ffffff; width: 90%; max-width: 420px; border-radius: 1rem;
  overflow: visible; 
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex; flex-direction: column; position: relative;
  animation: modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes modalPop { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.modal-header { padding: 1.5rem 1.5rem 1rem; text-align: center; background: #fff; border-radius: 1rem 1rem 0 0; }
.modal-title { margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a; }
.modal-subtitle { margin: 0.2rem 0 0; font-size: 0.9rem; color: #64748b; }
.modal-close { position: absolute; top: 1rem; right: 1rem; background: transparent; border: none; cursor: pointer; color: #94a3b8; }
.modal-close:hover { color: #0f172a; }

.modal-actions { padding: 0 1.5rem 2rem; display: flex; flex-direction: column; gap: 0.8rem; }
.modal-btn { display: flex; align-items: center; gap: 1rem; padding: 1rem; border-radius: 0.8rem; border: none; cursor: pointer; text-align: left; transition: transform 0.1s; }
.modal-btn:active { transform: scale(0.98); }
.modal-btn div { display: flex; flex-direction: column; }
.modal-btn span { font-weight: 800; font-size: 1rem; text-transform: uppercase; }
.modal-btn small { font-size: 0.8rem; font-weight: 500; opacity: 0.8; }

.btn-pickup { background: #f1f5f9; color: #334155; }
.btn-pickup:hover { background: #e2e8f0; }
.btn-delivery { background: #ff6600; color: #fff; box-shadow: 0 4px 10px rgba(255, 102, 0, 0.2); }
.btn-delivery:hover { background: #ea580c; }

.modal-address-step { padding: 0 1.5rem 2rem; display: flex; flex-direction: column; gap: 1rem; min-height: 200px; }
.modal-input-wrapper { position: relative; z-index: 100; }
.modal-search-input { width: 100%; padding: 0.8rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 1rem; box-sizing: border-box; outline: none; }
.modal-search-input:focus { border-color: #ff6600; }

.modal-autocomplete-list { position: absolute; top: 100%; left: 0; right: 0; background: #fff; border: 1px solid #e2e8f0; max-height: 200px; overflow-y: auto; z-index: 999; margin-top: 4px; border-radius: 0.5rem; box-shadow: 0 10px 20px rgba(0,0,0,0.1); list-style: none; padding: 0; }
.modal-autocomplete-item { padding: 0.8rem; border-bottom: 1px solid #f8fafc; font-size: 0.9rem; cursor: pointer; display: flex; gap: 0.5rem; }
.modal-autocomplete-item:hover { background: #fff7ed; color: #ea580c; }

.modal-coverage-result { background: #f8fafc; padding: 1rem; border-radius: 0.8rem; border: 1px solid #e2e8f0; }
.result-row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; }
.result-row .label { color: #64748b; }
.result-row .value { font-weight: 700; color: #0f172a; text-align: right; }
.result-row .highlight-store { color: #ff6600; }
.result-row .price { color: #16a34a; font-size: 1.1rem; }
.result-row .address { font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }

.result-status { margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px dashed #cbd5e1; text-align: center; font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 0.4rem; text-transform: uppercase; }
.status-ok { color: #16a34a; }
.status-fail { color: #ef4444; }

.modal-confirm-btn { width: 100%; background: #0f172a; color: #fff; padding: 1rem; border: none; border-radius: 0.5rem; font-weight: 700; margin-top: 1rem; cursor: pointer; text-transform: uppercase; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.modal-confirm-btn:hover { background: #334155; }
.modal-back-link { background: none; border: none; text-decoration: underline; color: #94a3b8; cursor: pointer; margin-top: 0.5rem; font-size: 0.85rem; }
.coverage-loading { text-align: center; padding: 2rem; color: #64748b; }
.spin-icon { animation: spin 1s linear infinite; color: #ff6600; margin-bottom: 0.5rem; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* ICONO DE FUEGO (LEAFLET) */
:global(.leaflet-div-icon.fire-icon) { width: 42px!important; height: 42px!important; background: transparent; border: none; }
:global(.leaflet-div-icon.fire-icon .fire-img) { width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }
:deep(.leaflet-tile) { filter: grayscale(100%) !important; }

/* MEDIA QUERY ACTUALIZADA PARA CORREGIR IPHONE */
@media (max-width: 900px) {
  .vicio-page { flex-direction: column; height: 100dvh; overflow: hidden; }
  .vicio-map { flex: 0 0 40%; height: 40% !important; }
  .vicio-sidebar { flex: 1 1 60%; height: 60% !important; border-radius: 1.5rem 1.5rem 0 0; margin-top: -1.5rem; box-shadow: 0 -4px 20px rgba(0,0,0,0.15); }

  /* FIX IPHONE: Alineación inferior en el contenedor */
  .modal-backdrop {
    align-items: flex-end; 
  }

  /* FIX IPHONE: Padding inferior seguro y ancho completo */
  .modal-content { 
    width: 100%; 
    max-width: none; 
    border-radius: 1.5rem 1.5rem 0 0; 
    position: relative;
    bottom: auto;
    
    /* Variable para respetar la barra inferior del iPhone */
    padding-bottom: calc(2rem + env(safe-area-inset-bottom));
    max-height: 85dvh;
    overflow-y: auto;

    animation: slideUpMobile 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes slideUpMobile { from { transform: translateY(100%); } to { transform: translateY(0); } }
}

/* REDIRECT OVERLAY */
.redirect-overlay {
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100dvh;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(15px);
  z-index: 99999;
  display: flex; align-items: center; justify-content: center;
}
.redirect-content { text-align: center; animation: popIn 0.5s ease-out; }
@keyframes popIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.redirect-spinner { position: relative; display: inline-flex; margin-bottom: 2rem; color: #ff6600; }
.rocket-icon { z-index: 2; animation: rocketFloat 1.5s ease-in-out infinite alternate; }
.pulse-ring {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: 80px; height: 80px; border-radius: 50%; border: 2px solid #ff6600;
  opacity: 0; animation: pulse 2s infinite;
}
.redirect-title { font-size: 1.2rem; color: #64748b; margin: 0; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; }
.redirect-store { font-size: 2.5rem; font-weight: 900; color: #0f172a; margin: 0.5rem 0; line-height: 1.1; max-width: 90vw; }
.redirect-subtitle { font-size: 1rem; color: #94a3b8; margin-top: 1rem; }
@keyframes rocketFloat { from { transform: translateY(0); } to { transform: translateY(-10px); } }
@keyframes pulse { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; } 100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>