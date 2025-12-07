<template>
  <div class="carta-page">
    <div class="carta-body">

      <div v-if="loading" class="state-container loading">
        <div class="spinner"></div>
        <p>Cargando sabores...</p>
      </div>

      <div v-else-if="error" class="state-container error">
        <span class="icon">⚠️</span>
        <p>Ocurrió un error al cargar la carta.</p>
        <button @click="refresh" class="retry-btn">Reintentar</button>
      </div>

      <div v-else-if="!activeMenu || !activeCards.length" class="state-container empty">
        <span class="icon">🍽️</span>
        <p>No hay imágenes disponibles para esta selección.</p>
      </div>

      <div v-else class="image-gallery">
        <div 
          v-for="card in activeCards" 
          :key="card.id"
          class="image-wrapper"
          :class="{ 
            'is-loaded': imageStates[card.id] === 'loaded',
            'horizontal-layout': !isMobile,
            'vertical-layout': isMobile
          }"
          @click="openZoom(bigUrl(card.img_identifier))"
        >
          
          <div v-if="imageStates[card.id] !== 'loaded'" class="skeleton-loader"></div>

          <img
            :src="bigUrl(card.img_identifier)"
            :alt="`Menú ${activeMenu.name}`"
            class="main-image"
            loading="lazy"
            @load="onImageLoad(card.id)"
            @error="onImageError($event, card.id)"
          />

          <div class="zoom-hint" v-if="imageStates[card.id] === 'loaded'">🔍</div>
        </div>
      </div>
    
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div v-if="zoomedImage" class="lightbox-overlay" @click="closeZoom">
          <button class="close-btn">&times;</button>
          <img :src="zoomedImage" class="lightbox-image" @click.stop />
        </div>
      </Transition>
    </Teleport>

    <a
      href="https://local.bot.salchimonster.com/ubicacion/1"
      class="promo-fab"
      :class="{ 'is-hidden': isScrolling }"
      aria-label="Ver promociones"
    >
      <div class="glow-ring"></div> <div class="fab-content">
        <img
          class="fab-icon"
          src="https://backend.salchimonster.com/read-photo-product/5Dqs9XtT"
          alt="Promos"
        >
      </div>
    </a>

  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onBeforeUnmount } from 'vue'
import { URI } from '@/service/conection'
import { useUserStore } from '@/stores/user'

const user = useUserStore()

// --- ESTADOS GLOBALES ---
const carta = ref('colombia')
const windowWidth = ref(1024)
const isScrolling = ref(false)
let hideTimer = null

// Estado para el zoom
const zoomedImage = ref(null)
// Estado reactivo para la carga de CADA imagen individualmente
const imageStates = reactive({})

// --- FETCH DE DATOS ---
const {
  data: rawMenus,
  pending: loading,
  error,
  refresh // Asumiendo que useFetch retorna refresh, si no, borrar esto
} = await useFetch(`${URI}/cartas-all`)

const menuData = computed(() => rawMenus.value || [])

// --- UTILS DE TEXTO / MATCHING (Tu código original) ---
const normalize = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

const hasAll = (name, ...kw) =>
  kw.every((k) => normalize(name).includes(normalize(k)))

const itemHasImages = (m) =>
  Array.isArray(m.cartas) && m.cartas.some((c) => c.img_identifier)

const firstMatch = (patterns) => {
  for (const kw of patterns) {
    const hit = menuData.value.find(
      (m) => hasAll(m.name, ...kw) && itemHasImages(m)
    )
    if (hit) return hit
  }
  return null
}

// --- RESPONSIVE: HORIZONTAL / VERTICAL ---
const isMobile = computed(() => windowWidth.value < 600)

const updateWidth = () => {
  if (typeof window === 'undefined') return
  windowWidth.value = window.innerWidth
}

// URLs
const bigUrl = (id) => `${URI}/read-photo-product/${id}`
const plainUrl = (id) => `${URI}/read-photo-product/${id}`

// --- SELECCIÓN DE MENÚ ACTIVO (Tu lógica exacta) ---
const activeMenu = computed(() => {
  if (!menuData.value.length || !carta.value) return null

  const primary = isMobile.value ? 'vertical' : 'horizontal'
  const secondary = isMobile.value ? 'horizontal' : 'vertical'

  const prefLang = user.lang?.name === 'es' ? 'espanol' : 'ingles'
  const otherLang = prefLang === 'espanol' ? 'ingles' : 'espanol'

  // Reglas CO
  const rulesCol = [
    [primary, 'colombia'],
    [secondary, 'colombia'],
    ['colombia']
  ]

  // Reglas NJ
  const rulesNJ = [
    [primary, 'nj', prefLang],
    [secondary, 'nj', prefLang],
    [primary, 'nj', otherLang],
    [secondary, 'nj', otherLang],
    ['nj']
  ]

  return firstMatch(
    carta.value === 'colombia'
      ? [...rulesCol, ...rulesNJ]
      : [...rulesNJ, ...rulesCol]
  )
})

// --- CARTAS ACTIVAS ---
const activeCards = computed(() => {
  if (!activeMenu.value || !Array.isArray(activeMenu.value.cartas)) return []
  return [...activeMenu.value.cartas].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0)
  )
})

// --- MANEJO DE IMÁGENES (Smart Logic) ---
const onImageLoad = (id) => {
  imageStates[id] = 'loaded'
}

const onImageError = (event, id) => {
  imageStates[id] = 'error'
  // Fallback a imagen sin procesar o placeholder
  event.target.src = plainUrl(id) 
}

// --- ZOOM / LIGHTBOX ---
const openZoom = (url) => {
  zoomedImage.value = url
  document.body.style.overflow = 'hidden' // Bloquea scroll
}

const closeZoom = () => {
  zoomedImage.value = null
  document.body.style.overflow = '' // Libera scroll
}

// --- SCROLL HANDLING (Tu lógica original + debounce) ---
const onScroll = () => {
  if (!isScrolling.value) isScrolling.value = true
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    isScrolling.value = false
  }, 180)
}

// --- LIFECYCLE ---
onMounted(() => {
  if (!user.lang?.name) {
    user.lang = {
      name: 'es',
      label: 'Español',
      flag: 'https://flagcdn.com/w20/co.png'
    }
  }

  carta.value = 'colombia'

  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth
    window.addEventListener('resize', updateWidth, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateWidth)
    window.removeEventListener('scroll', onScroll)
  }
  clearTimeout(hideTimer)
})
</script>

<style scoped>
/* --- CONFIGURACIÓN DE PÁGINA --- */
.carta-page {
  background-color: var(--p-primary-color, #000); /* Fallback negro */
  min-height: 120vh;
  padding-bottom: 80px; /* Espacio para no tapar contenido al final */
}

.carta-body {
  margin: auto;
  width: 100%;
  max-width: 1400px; /* Limite para pantallas grandes */
}

/* --- ESTADOS (LOADING / ERROR) --- */
.state-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: #fff;
  gap: 1rem;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.retry-btn {
  background: #ff0055;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

/* --- GALERÍA DE IMÁGENES MEJORADA --- */
.image-gallery {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}

.image-wrapper {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #1a1a1a; /* Fondo oscuro mientras carga */
  cursor: zoom-in;
  /* Min-height previene colapso total, se ajusta según horizontal/vertical */
  min-height: 200px; 
}

/* Ajustes de relación de aspecto según layout */
.image-wrapper.vertical-layout {
  aspect-ratio: 9/16; /* Típico formato historia/celular */
}
.image-wrapper.horizontal-layout {
  aspect-ratio: 16/9; /* Típico formato pantalla ancha */
}

.main-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain; /* O cover, según prefieras */
  opacity: 0;
  transition: opacity 0.5s ease;
}

/* Cuando la imagen carga (clase agregada por JS) */
.image-wrapper.is-loaded .main-image {
  opacity: 1;
}

/* Skeleton Loader (Animación de carga) */
.skeleton-loader {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #222 25%, #333 50%, #222 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  z-index: 1;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Lupa indicadora */
.zoom-hint {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0,0,0,0.6);
  color: white;
  padding: 6px;
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}
.image-wrapper:hover .zoom-hint { opacity: 1; }

/* --- LIGHTBOX (ZOOM) --- */
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background-color: rgba(0, 0, 0, 0.95);
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(5px);
  cursor: zoom-out;
}

.lightbox-image {
  max-width: 95vw;
  max-height: 95vh;
  object-fit: contain;
  box-shadow: 0 0 30px rgba(0,0,0,0.8);
}

.close-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255,255,255,0.2);
  border: none;
  color: white;
  font-size: 2rem;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  z-index: 10;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* --- BOTÓN PROMO (FAB - Diseño Neon) --- */
.promo-fab {
  position: fixed;
  right: 15px;
  bottom: 50%; /* Manteniendo tu posición original */
  width: 90px;
  height: 90px;
  z-index: 9999;
  
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  border-radius: 50%;
  
  /* Transiciones para ocultar */
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease;
}

/* Estado oculto al hacer scroll */
.promo-fab.is-hidden {
  transform: translateX(150%) scale(0.8);
  opacity: 0.2;
  pointer-events: none;
}

.fab-content {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(0,0,0,0.5);
  border: 2px solid rgba(255,255,255,0.2);
  z-index: 2;
  display: flex; /* Centrar imagen */
  justify-content: center;
  align-items: center;
}

.fab-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s;
}

.promo-fab:hover .fab-icon {
  transform: scale(1.1);
}

/* Anillo de Neón */
.glow-ring {
  position: absolute;
  top: -5px; left: -5px; right: -5px; bottom: -5px;
  border-radius: 50%;
  background: linear-gradient(45deg, #ff0055, #00ddff, #ff0055);
  background-size: 400%;
  z-index: 1;
  opacity: 0.7;
  filter: blur(8px);
  animation: glowing 3s linear infinite;
}

@keyframes glowing {
  0% { background-position: 0 0; }
  50% { background-position: 400% 0; }
  100% { background-position: 0 0; }
}

@media (max-width: 480px) {
  .promo-fab {
    width: 70px;
    height: 70px;
  }
}
</style>