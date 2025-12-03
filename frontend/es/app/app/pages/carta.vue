<template>
  <div class="carta-page">
    <div class="carta-body">
      <!-- Indicador de carga -->
      <div v-if="loading" class="loading">
        <p>Cargando imágenes...</p>
      </div>

      <!-- Error al cargar -->
      <div v-else-if="error" class="no-images">
        <p>Ocurrió un error al cargar la carta.</p>
      </div>

      <!-- Mensaje si no hay imágenes / menú activo -->
      <div
        v-else-if="!activeMenu || !activeCards.length"
        class="no-images"
      >
        <p>No hay imágenes en la carta.</p>
      </div>

      <!-- Contenedor de imágenes (usa cartas-all) -->
      <div v-else class="image-gallery">
        <img
          v-for="card in activeCards"
          :key="card.id"
          :src="bigUrl(card.img_identifier)"
          :alt="`Menú ${activeMenu.name}`"
          :class="{ 'horizontal-image': !isMobile, 'vertical-image': isMobile }"
          @error="e => (e.target.src = plainUrl(card.img_identifier))"
        />
      </div>

    
    </div>

    <!-- Botón Promos: redondo, FIXED y que se esconde al hacer scroll -->
    <a
      href="https://local.bot.salchimonster.com/ubicacion/1"
      class="promo-anchor"
      :class="{ 'is-hidden': isScrolling }"
      aria-label="Ver promociones"
    >
      <img
        class="promo-round"
        src="https://backend.salchimonster.com/read-photo-product/5Dqs9XtT"
        alt="Promos"
      >
    </a>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { URI } from '@/service/conection'
import { useUserStore } from '@/stores/user'

const user = useUserStore()

// País por defecto: COLOMBIA
const carta = ref('colombia')

// ===== Fetch de cartas-all =====
const {
  data: rawMenus,
  pending: loading,
  error
} = await useFetch(`${URI}/cartas-all`)

const menuData = computed(() => rawMenus.value || [])

// ===== Utils de texto / matching =====
const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

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

// ===== Responsive: horizontal / vertical =====
const windowWidth = ref(1024)
const isMobile = computed(() => windowWidth.value < 600)

const updateWidth = () => {
  if (typeof window === 'undefined') return
  windowWidth.value = window.innerWidth
}

// URLs de imágenes
const bigUrl = (id) => `${URI}/read-photo-product/${id}`
const plainUrl = (id) => `${URI}/read-photo-product/${id}`

// ===== Selección de menú activo (Colombia por defecto) =====
const activeMenu = computed(() => {
  if (!menuData.value.length || !carta.value) return null

  const primary = isMobile.value ? 'vertical' : 'horizontal'
  const secondary = isMobile.value ? 'horizontal' : 'vertical'

  // idioma preferido para NJ (si lo quieres usar)
  const prefLang = user.lang?.name === 'es' ? 'espanol' : 'ingles'
  const otherLang = prefLang === 'espanol' ? 'ingles' : 'espanol'

  // Reglas CO
  const rulesCol = [
    [primary, 'colombia'],
    [secondary, 'colombia'],
    ['colombia']
  ]

  // Reglas NJ (por si luego cambias carta.value = 'nj')
  const rulesNJ = [
    [primary, 'nj', prefLang],
    [secondary, 'nj', prefLang],
    [primary, 'nj', otherLang],
    [secondary, 'nj', otherLang],
    ['nj']
  ]

  // Por ahora: carta = 'colombia' siempre (pero queda listo para cambiar)
  return firstMatch(
    carta.value === 'colombia'
      ? [...rulesCol, ...rulesNJ]
      : [...rulesNJ, ...rulesCol]
  )
})

// Cartas ordenadas por index
const activeCards = computed(() => {
  if (!activeMenu.value || !Array.isArray(activeMenu.value.cartas)) return []
  return [...activeMenu.value.cartas].sort(
    (a, b) => (a.index ?? 0) - (b.index ?? 0)
  )
})

// ===== Ocultar botón durante scroll =====
const isScrolling = ref(false)
let hideTimer = null

const onScroll = () => {
  if (!isScrolling.value) isScrolling.value = true
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    isScrolling.value = false
  }, 180)
}

onMounted(() => {
  // idioma por defecto si no hay
  if (!user.lang?.name) {
    user.lang = {
      name: 'es',
      label: 'Español',
      flag: 'https://flagcdn.com/w20/co.png'
    }
  }

  carta.value = 'colombia' // <- carga Colombia por defecto

  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth
    window.addEventListener('resize', updateWidth)
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
.carta-page {
  background-color: var(--p-primary-color);
  min-height: 120vh;
 
}

.carta-body {
  /* max-width: 1300px; */
  margin: auto;
}

/* Galería de imágenes */
.image-gallery {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
}

.horizontal-image,
.vertical-image {
  width: 100%;
  margin: 0;
  padding: 0;
}

/* Estados de carga / error */
.loading,
.no-images {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  font-size: 1.2rem;
  color: #555;
}

/* ===== Botón Promos: redondo, FIXED, con animación ===== */
.promo-anchor {
  position: fixed;
  right: 0;
  bottom: 50%;
  z-index: 9999;
  text-decoration: none;

  transform: translateX(0);
  transition: transform .28s ease, opacity .28s ease, filter .2s ease;
  will-change: transform, opacity, filter;
}

.promo-anchor.is-hidden {
  transform: translateX(120%);
  opacity: .2;
  pointer-events: none;
}

.promo-round {
  width: 6rem;
  height: 6rem;
  border: none;
  outline: none;
  cursor: pointer;
  position: relative;
  color: #fff;
  display: grid;
  place-items: center;

  animation: blink 1.1s infinite, pulse .5s ease-in-out infinite;
  transition: transform .15s ease-out, filter .15s ease-out;
}

.promo-round:hover {
  transform: scale(1.06);
  filter: brightness(1.08);
}

.promo-round:active {
  transform: scale(.98);
}

@media (max-width: 480px) {
  .promo-round {
    width: 4.25rem;
    height: 4.25rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .promo-round {
    animation: none;
  }
}

/* Parpadeo */
@keyframes blink {
  0%   { opacity: 1; }
  50%  { opacity: .8; filter: invert(4); }
  100% { opacity: 1; }
}

/* Pulso suave */
@keyframes pulse {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.03); }
  100% { transform: scale(1); }
}
</style>
