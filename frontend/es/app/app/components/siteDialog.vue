<template>
  <!-- BACKDROP / MODAL -->
  <div
    v-if="store.visibles?.currentSite"
    class="location-dialog-backdrop"
    @click.self="closeDialog"
  >
 
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useSitesStore } from '@/stores/site'
import { formatoPesosColombianos } from '@/service/utils/formatoPesos'

// stores
const store = useSitesStore()
const user = useUserStore()



watch(() => store.visibles.currentSite, (newval) => {
  if (newval) {
  location.href = 'http://valencia.localhost:3001/'
    store.visibles.currentSite = false
  }
})

// estados
const temp_barrio = ref('')
const temp_dir = ref('')
const map = ref(null)
const marker = ref(null)
const mapContainer = ref(null)
const neigborhood = ref({ delivery_price: 0, name: '' })
const validado = ref(false)

const GOOGLE_MAPS_API_KEY = 'AIzaSyD1D4di1V3GaXtM5EL-4LGldvvz-fH0bPI'

// singleton para cargar Google Maps
let googleMapsPromise = null

const loadGoogleMaps = () => {
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Maps sólo está disponible en el cliente'))
      return
    }

    if (typeof google !== 'undefined' && google.maps) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=marker`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

// inicializar mapa
const inicializarMapa = async () => {
  try {
    await loadGoogleMaps()

    if (!mapContainer.value) {
      console.error('mapContainer no está disponible en el DOM.')
      return
    }

    map.value = new google.maps.Map(mapContainer.value, {
      center: { lat: 6.2717264431772985, lng: -75.55841542945669 },
      zoom: 14,
      minZoom: 13,
      maxZoom: 15
    })

    const kmlLayer = new google.maps.KmlLayer({
      url: 'https://www.google.com/maps/d/kml?mid=1fAENw6dNOT4jjL4tNdUtRX4Cqor1iVD5&ehbc=2E312F=en',
      map: map.value,
      preserveViewport: true
    })

    kmlLayer.addListener('status_changed', () => {
      if (kmlLayer.getStatus() !== google.maps.KmlLayerStatus.OK) {
        console.error('Error al cargar el mapa desde KML:', kmlLayer.getStatus())
      }
    })
  } catch (error) {
    console.error('Error al inicializar el mapa:', error)
  }
}

// geocodificar usando $fetch nativo de Nuxt
const geocodeAddress = async (address) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${GOOGLE_MAPS_API_KEY}`

  const data = await $fetch(url)
  const result = data?.results?.[0]

  if (!result) {
    throw new Error('No se pudo encontrar la dirección')
  }

  const { lat, lng } = result.geometry.location
  return { lat, lng }
}

// validar dirección
const validarDireccion = async () => {
  try {
    if (!temp_dir.value || !temp_barrio.value) {
      alert('Por favor ingresa la dirección y el barrio.')
      return
    }

    const complete = `${temp_dir.value}, ${temp_barrio.value}, Medellín, Colombia`
    const { lat, lng } = await geocodeAddress(complete)

    // marcador
    if (marker.value) {
      marker.value.setMap(null)
    }

    marker.value = new google.maps.Marker({
      position: { lat, lng },
      map: map.value,
      title: temp_dir.value,
      animation: google.maps.Animation.DROP
    })

    map.value.setCenter({ lat, lng })
    map.value.setZoom(14)

    // consultar zona en backend con $fetch
    const result = await $fetch('https://tezos-back.arhook.com/consultar_zona/', {
      method: 'POST',
      body: {
        latitud: lat,
        longitud: lng
      }
    })

    if (result?.zona) {
      if (result.latitud && result.longitud) {
        map.value.setCenter({ lat: result.latitud, lng: result.longitud })
        map.value.setZoom(15)
      }

      neigborhood.value = {
        name: temp_barrio.value,
        delivery_price: result.valor_domicilio
      }
      validado.value = true
    } else {
      neigborhood.value = { name: '', delivery_price: 0 }
      validado.value = false
      alert('No se encontró cobertura.')
    }
  } catch (error) {
    console.error(error)
    alert(error.message || 'Error al procesar la dirección.')
  }
}

// actualizar barrio
const updateneigborhood = (valor, direccion) => {
  if (!user.user.location_type) {
    alert('Por favor indica el tipo de vivienda')
    return
  }

  store.location.neigborhood.name = valor
  store.location.neigborhood.delivery_price = neigborhood.value.delivery_price
  store.visibles.currentSite = false

  user.user.address = direccion
  store.location.neigborhood = neigborhood.value
}

// recoger en local
const recogerLocal = () => {
  store.location.neigborhood.name = 'Recoger en el local'
  store.location.neigborhood.delivery_price = 0
  store.visibles.currentSite = false

  user.user.address = ''
}

// cerrar
const closeDialog = () => {
  store.visibles.currentSite = false
}

// cuando se abre el modal
const handleOpen = async () => {
  validado.value = false
  await nextTick()
  await inicializarMapa()
}

onMounted(() => {
  if (store.visibles.currentSite) {
    handleOpen()
  }
})

// watcher sólo en cliente para evitar SSR issues
if (process.client) {
  watch(
    () => store.visibles.currentSite,
    (visible) => {
      if (visible) handleOpen()
    }
  )
}
</script>



<style scoped>
.location-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: stretch; /* 🔹 para que el hijo pueda usar height: 100% */
  justify-content: center;
  padding: 1.5rem;
}

/* CONTENEDOR PRINCIPAL DEL MODAL */
.location-dialog {
  position: relative;
  width: 100%;
  height: 100%;         /* 🔹 ocupa el 100% del alto disponible */
  max-width: 35rem;
  max-height: 100vh;    /* 🔹 asegura que no se pase del viewport */
  background-color: #ffffff;
  border-radius: 0.75rem;
  padding: 1.5rem 1.25rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;

  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

/* WRAPPER FORM + MAPA (columna en móvil) */
.location-dialog__content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;              /* 🔹 que crezca y empuje el footer abajo */
}

.location-dialog__close-btn {
  position: absolute;
  top: -0.85rem;
  right: -0.85rem;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: none;
  background: #ef4444;
  color: #ffffff;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.location-dialog__close-btn:hover {
  filter: brightness(0.95);
}

.location-dialog__header {
  width: 100%;
}

.location-dialog__inputs {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.location-dialog__input {
  width: 100%;
  padding: 0.65rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.location-dialog__input::placeholder {
  color: #9ca3af;
}

.location-dialog__input:focus {
  border-color: #111827;
  box-shadow: 0 0 0 1px #11182710;
}

/* DETALLES DIRECCIÓN (TEXTO Y TEXTAREA) */
.location-dialog__details-block {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.location-dialog__details-hint {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
}

.location-dialog__textarea {
  width: 100%;
  resize: none;
  min-height: 2.5rem;
  max-height: 6rem;
  padding: 0.55rem 0.8rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.location-dialog__textarea::placeholder {
  color: #9ca3af;
}

.location-dialog__textarea:focus {
  border-color: #111827;
  box-shadow: 0 0 0 1px #11182710;
}

.location-dialog__map {
  width: 100%;
  aspect-ratio: 4 / 2;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #e5e5e5;
}

.location-dialog__footer {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.location-dialog__tag {
  width: 100%;
  padding: 0.55rem 0.85rem;
  border-radius: 0.5rem;
  background: #f4f4f5;
  border: 1px solid #e4e4e7;
}

.location-dialog__tag-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}

.location-dialog__tag-text {
  margin: 0;
  font-size: 0.85rem;
  color: #4b5563;
}

/* wrapper para acciones en footer */
.location-dialog__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.location-dialog__btn {
  width: 100%;
  border-radius: 0.5rem;
  padding: 0.65rem 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    transform 0.05s ease;
}

.location-dialog__btn:active {
  transform: translateY(1px);
}

/* primaria (Guardar) */
.location-dialog__btn--primary {
  background-color: #000000;
  color: #ffffff;
  border-color: #000000;
}

/* outline (Validar) */
.location-dialog__btn--outline {
  background-color: #ffffff;
  color: #111827;
  border-color: #111827;
}

/* danger (Recoger en el local) */
.location-dialog__btn--danger {
  background-color: #ef4444;
  color: #ffffff;
  border-color: #ef4444;
}

.location-dialog__btn--primary:hover {
  background-color: #111827;
}

.location-dialog__btn--outline:hover {
  background-color: #111827;
  color: #ffffff;
}

.location-dialog__btn--danger:hover {
  background-color: #dc2626;
}

/* 📱 MOBILE */
@media (max-width: 640px) {
  .location-dialog-backdrop {
    padding: 0;
  }

  .location-dialog {
    padding-inline: 1rem;
    border-radius: 0;
    padding-top: 3rem;
    max-width: 100%;
    max-height: 100vh;  /* full height en móvil también */
  }

  .location-dialog__close-btn {
    right: 0;
    top: 0;
    border-radius: 0.1rem;
  }
}

/* 💻 DESKTOP / TABLET: MÁS ANCHO Y 2 COLUMNAS */
@media (min-width: 768px) {
  .location-dialog-backdrop {
    padding: 2rem;
  }

  .location-dialog {
    max-width: 80rem;   /* más ancho, pero sigue a 100% de alto */
  }

  .location-dialog__content {
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.2fr);
    gap: 1.25rem;
    align-items: stretch;
  }

  .location-dialog__map {
    aspect-ratio: auto;
    height: 100%;       /* 🔹 el mapa estira para rellenar la columna */
    min-height: 18rem;
  }

  .location-dialog__footer {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .location-dialog__tag {
    flex: 1;
  }

  .location-dialog__actions {
    flex-direction: row;
    justify-content: flex-end;
  }

  .location-dialog__btn {
    width: auto;
    min-width: 8rem;
  }
}
</style>
