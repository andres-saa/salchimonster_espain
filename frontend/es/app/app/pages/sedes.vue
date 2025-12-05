<template>
  <div class="main-container">
    <div class="container">
      <div
        v-for="sede in sedes.filter(s => s.city_id && s.show_on_web && !s.comming_soon && s.time_zone == 'Europe/Madrid' && s.site_id !== 32)"
        :key="sede.site_id"
        class="sede-card"
        @click="openSedeDialog(sede)"
      >
        <div class="sede-image-container">
          <img
            :src="currentImage(sede)"
            @load="loadHighResImage(sede)"
            @error="onImgError(sede)"
            class="sede-image"
            alt=""
          />
          <div class="sede-details">
            <p class="sede-location">
              <span class="sede-icon">
                <Icon name="mdi:map-marker" class="nuxt-icon" />
              </span>
              {{ cityName(sede.city_id) }}
              <span class="sede-address">{{ sede.site_address }}</span>
            </p>

            <p class="sede-name">SALCHIMONSTER {{ sede.site_name }}</p>

            <!-- Teléfono: link directo a WhatsApp -->
            <a
              v-if="waLink(sede)"
              :href="waLink(sede)"
              target="_blank"
              rel="noopener"
              class="sede-phone"
              :aria-label="`Chatear por WhatsApp con ${sede.site_name}`"
              @click.stop
            >
              <span class="sede-icon">
                <Icon name="mdi:whatsapp" class="nuxt-icon whatsapp-icon" />
              </span>
              {{ displayPhone(sede.site_phone) }}
            </a>
            <p v-else class="sede-phone">
              <span class="sede-icon">
                <Icon name="mdi:whatsapp" class="nuxt-icon whatsapp-icon" />
              </span>
              {{ displayPhone(sede.site_phone) }}
            </p>

            <div class="maps-icon">
              <a
                :href="sede.maps"
                target="_blank"
                rel="noopener"
                @click.stop
              >
                <img
                  class="maps-image"
                  src="https://th.bing.com/th/id/R.68201495ac2d0c4d1cd3cbf6d25f6755?rik=l%2bilUrRDF30tdw&pid=ImgRaw&r=0"
                  alt="Map icon"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DIALOGO DE SEDE -->
    <div
      v-if="showDialog && selectedSede"
      class="dialog-overlay"
      @click.self="closeDialog"
    >
      <div class="dialog">
        <button class="dialog-close" @click="closeDialog" aria-label="Cerrar">
          ×
        </button>

        <h2 class="dialog-title">
          SALCHIMONSTER {{ selectedSede.site_name }}
        </h2>

        <p class="dialog-row">
          <span class="dialog-icon">
            <Icon name="mdi:map-marker" class="nuxt-icon" />
          </span>
          {{ cityName(selectedSede.city_id) }}
        </p>

        <p class="dialog-row">
          <span class="dialog-label">Dirección:</span>
          <span>{{ selectedSede.site_address }}</span>
        </p>

        <p class="dialog-row">
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
        </p>

        <p class="dialog-row" v-if="selectedSede.maps">
          <span class="dialog-label">Ver en mapa:</span>
          <a
            :href="selectedSede.maps"
            target="_blank"
            rel="noopener"
            class="dialog-link"
          >
            Abrir en Google Maps
          </a>
        </p>
      </div>
    </div>
  </div>
</template>



<script setup>
import { onMounted, ref } from 'vue'
import { URI } from '@/service/conection'

// Cache en memoria de la URL actual de cada sede
const imgCache = ref({})

// 🔥 Sólo este endpoint
const byImgId = (img_id) => `${URI}/read-photo-product/${img_id}`

// Imagen de fallback si no hay img_id o falla la carga
const FALLBACK_IMG =
  'https://gestion.salchimonster.com/images/logo.png'

// Devuelve la URL actual a mostrar para la sede
const currentImage = (sede) => {
  if (imgCache.value[sede.site_id]) return imgCache.value[sede.site_id]

  if (sede?.img_id) {
    imgCache.value[sede.site_id] = byImgId(sede.img_id)
  } else {
    imgCache.value[sede.site_id] = FALLBACK_IMG
  }

  return imgCache.value[sede.site_id]
}

// Ya no hay “low/high res”: solo aseguramos que la que tenemos carga
const loadHighResImage = (sede) => {
  if (!sede?.img_id) return
  const url = byImgId(sede.img_id)
  const probe = new Image()
  probe.src = url
  probe.onload = () => {
    imgCache.value[sede.site_id] = url
  }
}

// Fallback si <img> falla
const onImgError = (sede) => {
  imgCache.value[sede.site_id] = FALLBACK_IMG
}

// ------------------ Datos ------------------
// El resto de tu lógica queda igual
const sedes  = ref([])
const cities = ref([])

const getSites = async () => {
  try {
    const response = await fetch(`${URI}/sites`)
    if (response.ok) return await response.json()
  } catch (error) {
    console.error('Error fetching sites:', error)
  }
  return []
}

const getCities = async () => {
  try {
    const response = await fetch(`${URI}/cities`)
    if (response.ok) return await response.json()
  } catch (error) {
    console.error('Error fetching cities:', error)
  }
  return []
}

onMounted(async () => {
  sedes.value = await getSites()
  cities.value = await getCities()
})

// ------------------ Utils ------------------
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
  const msg = `Hola, quiero más información sobre SALCHIMONSTER ${sede?.site_name ?? ''} en ${cityName(sede?.city_id)}.`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

// ------------------ Dialog ------------------
const showDialog = ref(false)
const selectedSede = ref(null)

const openSedeDialog = (sede) => {
  selectedSede.value = sede
  showDialog.value = true
}

const closeDialog = () => {
  showDialog.value = false
  selectedSede.value = null
}
</script>




<style scoped>
.main-container {
  position: relative;
  padding: 0;
}

.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin: 0 auto;
  max-width: 1600px;
  padding: 2rem;
  padding-top: 2rem;
}

.sede-card {
  border-radius: 0.5rem;
  overflow: hidden;
  max-width: 50%;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.sede-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.7);
}

.sede-image-container {
  position: relative;
  height: min-content;
  box-shadow: 0 0 10px black;
  border-radius: 0.5rem;
}

.sede-image {
  width: 100%;
  height: 30rem;
  object-fit: cover;
  border-radius: 0.5rem;
  transition: opacity 0.5s ease-in-out, transform 0.3s ease-in-out,
    filter 0.3s ease-in-out;
}

.sede-card:hover .sede-image {
 
  filter: brightness(1.05);
}

.sede-details {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40%;
  background: linear-gradient(to top, black, transparent);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 1rem;
  border-radius: 0 0 0.5rem 0.5rem;
  transition: background 0.3s ease;
}

.sede-card:hover .sede-details {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.95), transparent);
}

.sede-location,
.sede-phone {
  color: white;
  font-size: 1rem;
}

.sede-location {
  font-weight: bold;
  color: var(--primary-color);
}

.sede-address {
  font-weight: normal;
  color: white;
  padding-left: 1rem;
}

.sede-name {
  color: white;
  font-weight: bold;
  margin-top: 0.25rem;
}

.sede-phone {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  font-weight: 600;
  margin-top: 0.25rem;
}

.sede-phone .sede-icon {
  font-weight: bold;
}

/* Nuxt Icon genérico */
.nuxt-icon {
  display: inline-block;
  font-size: 1.3rem;
  vertical-align: middle;
}

/* Color verde para WhatsApp */
.whatsapp-icon {
  color: rgb(58, 255, 58);
}

/* Icono de maps */
.maps-icon {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 5rem;
  height: 5rem;
  background-color: transparent;
  display: flex;
  padding: 1rem;
  align-items: center;
  justify-content: center;
}

.maps-nuxt-icon {
  font-size: 2.3rem;
  color: white;
}

.maps-image {
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  background-color: rebeccapurple;
}

/* -------- Dialog styles -------- */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.dialog {
  background: #111;
  color: #fff;
  border-radius: 0.75rem;
  padding: 1.5rem 1.75rem;
  width: 90%;
  max-width: 480px;
  box-shadow: 0 0 25px rgba(0, 0, 0, 0.9);
  position: relative;
}

.dialog-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.dialog-row {
  margin: 0.35rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.dialog-label {
  font-weight: 600;
  min-width: 90px;
}

.dialog-link {
  color: var(--primary-color, #ffcc00);
  text-decoration: underline;
}

.dialog-close {
  position: absolute;
  top: 0.4rem;
  right: 0.6rem;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}
</style>
