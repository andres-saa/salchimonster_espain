<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
// import { URI } from '~/service/conection' // Assuming this is used elsewhere or okay to keep

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  activeCategoryId: {
    // 👇 FIX 1: Allow String so URL params don't break validation
    type: [Number, String, null], 
    default: null
  }
})

const emit = defineEmits(['select-category'])
const containerRef = ref(null)

// ... (keep your formatLabel function) ...
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

// ... (keep your scroll logic, it looks fine) ...
const isPinned = ref(true)
const isAtTop = ref(true)
const lastScrollY = ref(0)

const handleScroll = () => {
  if (typeof window === 'undefined') return
  const currentY = window.scrollY || window.pageYOffset || 0
  const delta = currentY - lastScrollY.value

  isAtTop.value = currentY < 10

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
  // Ensure we check strict window existence
  if (typeof window !== 'undefined') {
    lastScrollY.value = window.scrollY || 0
    window.addEventListener('scroll', handleScroll, { passive: true })
    // Optional: center pill on initial load
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
          style="height: 1.5rem; width: 1.5rem; border-radius: .3rem; aspect-ratio: 1 / 1; object-fit: cover;" 
          :src="`https://img.restpe.com/${cat.products[0]?.productogeneral_urlimagen}`" 
          alt=""
        > 
        <span style="padding:0 .5rem;">{{ formatLabel(cat.category_name) }}</span>  
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ... (Keep your existing styles) ... */
.menu-categories-bar {
  position: sticky;
  top: 3rem;
  z-index: 100;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  transition: .3s all ease;
}

.menu-categories-bar__scroll {
  margin: 0 auto;
  padding: 0.5rem 1rem;
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
}

.menu-categories-bar__item {
  padding: 0.2rem ;
  display: flex;
  align-items: center;
  border-radius: .3rem;
  border: 1px solid #e5e7eb;
  background: #f3f4f6;
  color: #374151;
  font-size: 1rem;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.1s ease, color 0.2s ease;
  white-space: nowrap;
}

.menu-categories-bar__item:hover {
  background: #fee2e2;
  border-color: #fecaca;
  color: #b91c1c;
  transform: translateY(-1px);
}

.menu-categories-bar__item--active {
  background: var(--primary-color);
  border-color: transparent;
  color: #ffffff;
}

@media (max-width: 768px) {
  .menu-categories-bar {
    top: 3.2rem;
  }
}
</style>