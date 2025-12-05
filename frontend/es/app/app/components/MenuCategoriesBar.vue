<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  activeCategoryId: {
    type: [Number, String, null], 
    default: null
  }
})

const emit = defineEmits(['select-category'])
const containerRef = ref(null)

const formatLabel = (str) => {
  const s = String(str || '').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const onClickCategory = (category) => {
  emit('select-category', category)
}

const centerActiveCategoryPill = () => {
  const container = containerRef.value
  if (!container) return

  const activeId = props.activeCategoryId
  if (!activeId) return

  const activeEl = container.querySelector(
    `[data-cat-pill-id="${activeId}"]`
  )
  if (!activeEl) return

  const targetScrollLeft =
    activeEl.offsetLeft +
    activeEl.offsetWidth / 2 -
    container.clientWidth / 2

  container.scrollTo({
    left: Math.max(0, targetScrollLeft),
    behavior: 'smooth'
  })
}

watch(
  () => props.activeCategoryId,
  () => {
    nextTick(() => {
      centerActiveCategoryPill()
    })
  }
)

const isPinned = ref(true)
const lastScrollY = ref(0)

const handleScroll = () => {
  if (typeof window === 'undefined') return
  const currentY = window.scrollY || window.pageYOffset || 0
  const delta = currentY - lastScrollY.value

  if (Math.abs(delta) < 5) {
    lastScrollY.value = currentY
    return
  }

  if (delta > 0 && currentY > 80) {
    isPinned.value = false
  } else {
    isPinned.value = true
  }
  lastScrollY.value = currentY
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    lastScrollY.value = window.scrollY || 0
    window.addEventListener('scroll', handleScroll, { passive: true })
    centerActiveCategoryPill()
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <div class="menu-categories-bar" :style="isPinned? 'top:3rem' : 'top:0' ">
    <div class="menu-categories-bar__scroll" ref="containerRef">
      <button
        v-for="cat in categories"
        :key="cat.category_id"
        class="menu-categories-bar__item"
        :class="{ 
          'menu-categories-bar__item--active': cat.category_id == activeCategoryId 
        }"
        :data-cat-pill-id="cat.category_id"
        @click="onClickCategory(cat)"
      >
        <img 
          class="menu-categories-bar__img"
          :src="`https://img.restpe.com/${cat.products[0]?.productogeneral_urlimagen}`" 
          alt=""
        > 
        <span class="menu-categories-bar__text">{{ formatLabel(cat.category_name) }}</span>  
      </button>
    </div>
  </div>
</template>

<style scoped>
.menu-categories-bar {
  position: sticky;
  top: 3rem;
  z-index: 100;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  transition: .3s all ease;
  /* Sombra suave para separar del contenido */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); 
}

.menu-categories-bar__scroll {
  margin: 0 auto;
  padding: 0.75rem 1rem; /* Aumentado un poco el padding vertical */
  display: flex;
  gap: 0.75rem; /* Más espacio entre botones */
  overflow-x: auto;
  /* Ocultar scrollbar visualmente pero mantener funcionalidad */
  scrollbar-width: none; 
}
.menu-categories-bar__scroll::-webkit-scrollbar {
  display: none;
}

.menu-categories-bar__item {
  /* 👇 CAMBIO: Padding más generoso por defecto */
  padding: 0.4rem 0.8rem; 
  display: flex;
  align-items: center;
  border-radius: 99px; /* Pill shape completa se ve más moderna */
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #374151;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  /* Evita que el botón se aplaste */
  flex-shrink: 0; 
}

.menu-categories-bar__text {
  padding-left: 0.5rem;
}

/* 👇 NUEVO: Estilos de imagen controlados por clase */
.menu-categories-bar__img {
  height: 1.5rem;
  width: 1.5rem;
  border-radius: 50%; /* Redonda se suele ver mejor en pills */
  aspect-ratio: 1 / 1;
  object-fit: cover;
  transition: all 0.2s ease;
}

.menu-categories-bar__item:hover {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
  transform: translateY(-1px);
}

.menu-categories-bar__item--active {
  background: var(--primary-color);
  border-color: var(--primary-color); /* Mejor que transparent */
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/* 👇 CAMBIO IMPORTANTE: Ajustes para Móviles */
@media (max-width: 768px) {
  .menu-categories-bar {
    top: 3.2rem;
  }
  
  .menu-categories-bar__scroll {
    padding: 0.75rem; /* Un poco más de aire */
    gap: 0.6rem;
  }

  .menu-categories-bar__item {
    /* Botones más grandes para dedos */
    padding: 0.5rem 1rem; 
    font-size: 1rem; /* Texto legible */
  }

  .menu-categories-bar__img {
    /* Imagen un poco más grande en móvil para que destaque */
    height: 1.8rem;
    width: 1.8rem;
  }
}
</style>