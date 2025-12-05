<template>
  <div class="main-container">
    <h1 class="sr-only">Nuestras Sedes Salchimonster</h1>

    <div class="container">
      <article
        v-for="sede in filteredSedes"
        :key="sede.site_id"
        class="sede-card"
        @click="openSedeDialog(sede)"
        itemscope
        itemtype="https://schema.org/Restaurant"
      >
        <div class="sede-image-wrapper">
          <img
            :src="currentImage(sede)"
            @load="loadHighResImage(sede)"
            @error="onImgError(sede)"
            class="sede-image"
            :alt="`Fachada Restaurante Salchimonster ${sede.site_name} en ${cityName(sede.city_id)}`"
            itemprop="image"
          />
          
          <div class="map-floating-btn" @click.stop>
            <a
              :href="sede.maps"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="`Ver ubicación de ${sede.site_name} en Google Maps`"
            >
               <Icon name="mdi:google-maps" class="map-icon" />
            </a>
          </div>

          <div class="sede-overlay">
            <div class="sede-info">
              <p class="sede-location">
                <Icon name="mdi:map-marker" class="icon-small" />
                {{ cityName(sede.city_id) }}
              </p>
              
              <h3 class="sede-name" itemprop="name">
                SALCHIMONSTER {{ sede.site_name }}
              </h3>

              <address class="sede-address" itemprop="address">
                {{ sede.site_address }}
              </address>

              <a
                v-if="waLink(sede)"
                :href="waLink(sede)"
                target="_blank"
                rel="noopener noreferrer"
                class="sede-action-link"
                @click.stop
              >
                <Icon name="mdi:whatsapp" class="whatsapp-icon" />
                <span itemprop="telephone">{{ displayPhone(sede.site_phone) }}</span>
              </a>
              <p v-else class="sede-phone-text">
                <Icon name="mdi:whatsapp" class="whatsapp-icon" />
                <span>{{ displayPhone(sede.site_phone) }}</span>
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>

    <Transition name="fade">
      <div
        v-if="showDialog && selectedSede"
        class="dialog-overlay"
        @click.self="closeDialog"
        role="dialog"
        aria-modal="true"
      >
        <div class="dialog">
          <button class="dialog-close" @click="closeDialog" aria-label="Cerrar ventana">
            <Icon name="mdi:close" />
          </button>

          <h2 class="dialog-title">
            SALCHIMONSTER {{ selectedSede.site_name }}
          </h2>

          <div class="dialog-content">
            <div class="dialog-row">
              <Icon name="mdi:map-marker" class="dialog-icon" />
              <span>{{ cityName(selectedSede.city_id) }}</span>
            </div>

            <div class="dialog-row">
              <span class="dialog-label">Dirección:</span>
              <span class="dialog-value">{{ selectedSede.site_address }}</span>
            </div>

            <div class="dialog-row">
              <span class="dialog-label">Teléfono:</span>
              <a
                v-if="waLink(selectedSede)"
                :href="waLink(selectedSede)"
                target="_blank"
                rel="noopener"
                class="dialog-link"
              >
                {{ displayPhone(selectedSede.site_phone) }}
              </a>
              <span v-else>{{ displayPhone(selectedSede.site_phone) }}</span>
            </div>

            <div class="dialog-action" v-if="selectedSede.maps">
              <a
                :href="selectedSede.maps"
                target="_blank"
                rel="noopener"
                class="btn-maps"
              >
                <Icon name="mdi:google-maps" />
                Abrir en Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { useHead } from '#imports' // Asegúrate de que esto funcione en tu versión de Nuxt
import { URI } from '@/service/conection'

// --- State ---
const sedes = ref([])
const cities = ref([])
const imgCache = ref({})
const showDialog = ref(false)
const selectedSede = ref(null)

const FALLBACK_IMG = 'https://gestion.salchimonster.com/images/logo.png'

// --- Computed Filter (Mejora de performance) ---
const filteredSedes = computed(() => {
  return sedes.value.filter(s => 
    s.city_id && 
    s.show_on_web && 
    !s.comming_soon && 
    s.time_zone === 'Europe/Madrid' && 
    s.site_id !== 32
  )
})

// --- Image Logic ---
const byImgId = (img_id) => `${URI}/read-photo-product/${img_id}`

const currentImage = (sede) => {
  if (imgCache.value[sede.site_id]) return imgCache.value[sede.site_id]
  if (sede?.img_id) {
    imgCache.value[sede.site_id] = byImgId(sede.img_id)
  } else {
    imgCache.value[sede.site_id] = FALLBACK_IMG
  }
  return imgCache.value[sede.site_id]
}

const loadHighResImage = (sede) => {
  if (!sede?.img_id) return
  const url = byImgId(sede.img_id)
  const probe = new Image()
  probe.src = url
  probe.onload = () => { imgCache.value[sede.site_id] = url }
}

const onImgError = (sede) => {
  imgCache.value[sede.site_id] = FALLBACK_IMG
}

// --- Data Fetching ---
const getSites = async () => {
  try {
    const res = await fetch(`${URI}/sites`)
    if (res.ok) return await res.json()
  } catch (e) { console.error(e) }
  return []
}

const getCities = async () => {
  try {
    const res = await fetch(`${URI}/cities`)
    if (res.ok) return await res.json()
  } catch (e) { console.error(e) }
  return []
}

onMounted(async () => {
  const [sitesData, citiesData] = await Promise.all([getSites(), getCities()])
  sedes.value = sitesData
  cities.value = citiesData
})

// --- Utils ---
const cityName = (city_id) => {
  const c = cities.value.find(s => s.city_id === city_id)
  return c?.city_name ?? ''
}

const displayPhone = (raw = '') => raw?.trim() || '—'

const toE164CO = (raw = '') => {
  let d = String(raw).replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('57')) return d
  if (d.length === 10 && d.startsWith('3')) return '57' + d
  return d
}

const waLink = (sede) => {
  const num = toE164CO(sede?.site_phone || '')
  if (!num) return ''
  const msg = `Hola, quiero más info sobre SALCHIMONSTER ${sede?.site_name ?? ''} en ${cityName(sede?.city_id)}.`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

// --- Dialog Logic ---
const openSedeDialog = (sede) => {
  selectedSede.value = sede
  showDialog.value = true
}
const closeDialog = () => {
  showDialog.value = false
  selectedSede.value = null
}

// --- SEO: Structured Data (JSON-LD) ---
// Esto inyecta un script en el head para que Google entienda que son negocios locales
useHead(() => {
  const structuredData = filteredSedes.value.map(sede => ({
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": `Salchimonster ${sede.site_name}`,
    "image": sede.img_id ? byImgId(sede.img_id) : FALLBACK_IMG,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": sede.site_address,
      "addressLocality": cityName(sede.city_id),
      "addressCountry": "ES" // Asumo España por 'Europe/Madrid'
    },
    "telephone": sede.site_phone,
    "url": sede.maps
  }))

  return {
    script: [
      {
        type: 'application/ld+json',
        children: JSON.stringify(structuredData)
      }
    ]
  }
})
</script>

<style scoped>
/* Variables para consistencia */
:root {
  --primary:var(--primary-color);
  --dark-bg: #1a1a1a;
  --text-white: #ffffff;
  --overlay-gradient: linear-gradient(to top, rgba(0, 0, 0, 0.9) 0%, rgba(0, 0, 0, 0.6) 50%, transparent 100%);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.main-container {
  width: 100%;
  padding-bottom: 3rem;
}

.container {
  display: grid;
  /* Grid responsivo moderno: columnas de min 320px */
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 2rem;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

/* Card Styles */
.sede-card {
  position: relative;
  border-radius: 1rem;
  overflow: hidden;
  cursor: pointer;
  background-color: #000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), 
              box-shadow 0.3s ease;
}

.sede-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.6);
}

.sede-image-wrapper {
  position: relative;
  width: 100%;
  /* Aspect Ratio vertical para fotos de sedes (estilo Instagram Story/TikTok) */
  aspect-ratio: 3/4; 
}

.sede-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.sede-card:hover .sede-image {
  transform: scale(1.05);
}

/* Mapa Flotante (Mejorado) */
.map-floating-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  transition: background 0.2s, transform 0.2s;
}

.map-floating-btn:hover {
  background: #fff;
  transform: scale(1.1);
}

.map-icon {
  font-size: 1.5rem;
  color: #333;
}

/* Overlay de información */
.sede-overlay {
  position: absolute;
  inset: 0;
  background: var(--overlay-gradient, linear-gradient(to top, rgba(0,0,0,0.95), transparent));
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 1.5rem;
}

.sede-info {
  color: white;
  transform: translateY(0);
  transition: transform 0.3s ease;
}

.sede-location {
  color:var(--primary-color); /* Color primario */
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sede-name {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.sede-address {
  font-style: normal;
  font-size: 0.95rem;
  opacity: 0.9;
  margin-bottom: 1rem;
  display: block;
}

/* WhatsApp Link */
.sede-action-link,
.sede-phone-text {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(4px);
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  color: white;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  transition: background 0.2s ease;
}

.sede-action-link:hover {
  background: rgba(37, 211, 102, 0.2); /* Tinte verde WA */
  color: #4ade80;
}

.whatsapp-icon {
  color: #4ade80;
  font-size: 1.2rem;
}

/* --- Dialog Styles --- */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.dialog {
  background: #1e1e1e;
  color: white;
  width: 100%;
  max-width: 500px;
  border-radius: 1rem;
  padding: 2rem;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.dialog-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: transparent;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.dialog-close:hover { opacity: 1; }

.dialog-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  color:var(--primary-color);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 1rem;
}

.dialog-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.dialog-label {
  font-weight: 600;
  color: #aaa;
  min-width: 80px;
}

.dialog-link {
  color: white;
  text-decoration: underline;
  text-decoration-color:var(--primary-color);
  text-underline-offset: 3px;
}

.dialog-action {
  margin-top: 2rem;
}

.btn-maps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.8rem;
  background:var(--primary-color);
  color: black;
  font-weight: 700;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: filter 0.2s;
}

.btn-maps:hover {
  filter: brightness(1.1);
}

/* Transiciones Vue */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>