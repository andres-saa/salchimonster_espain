<template>
  <div class="menu-page">
    <CarouselBanners />

    <MenuCategoriesBar
      :categories="categories"
      :active-category-id="activeCategoryId"
      @select-category="onClickCategory"
    />

    <div class="menu-background">
      <div class="menu-content">
        <section
          v-for="(cat, index) in categories"
          :key="cat.category_id"
          :ref="(el) => setCategoryRef(cat.category_id, el)"
          class="menu-category-section"
        >
          <header class="menu-category-section__header">
            <h2 
              class="menu-category-section__title" 
              :style="index === 0 ? 'color:white' : ''"
            >
              {{ formatLabel(cat.category_name) }}
            </h2>
            <p 
              class="menu-category-section__count" 
              :style="index === 0 ? 'color:white' : ''"
            >
              {{ cat.products?.length || 0 }} productos
            </p>
          </header>

          <div class="menu-category-section__grid">
            <MenuProductCard
              v-for="prod in cat.products"
              :key="prod.id"
              :product="prod"
              :category-id="cat.category_id"
              :image-base-url="URI"
              :set-product-ref="setProductRef"
              @click="onClickProduct(cat, prod)"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CarouselBanners from '~/components/carouselBanners.vue'
import MenuCategoriesBar from '~/components/MenuCategoriesBar.vue'
import MenuProductCard from '~/components/MenuProductCard.vue'
import { URI } from '~/service/conection'
import { useHead, useFetch } from '#imports'

const route = useRoute()
const router = useRouter()

const pe_id = 38

// 📡 Traer data (Mantenemos la estructura del primero con 'key' para hidratación)
const { data: rawCategoriesData } = useFetch(
  () => `${URI}/tiendas/${pe_id || 1}/products`,
  {
    key: 'menu-data', 
    default: () => ({ categorias: [] })
  }
)

// Normalizar texto
const normalize = (str) =>
  String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

// Formato de etiqueta
const formatLabel = (str) => {
  const s = String(str || '').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* ==========================
   ADAPTACIÓN DE LA DATA
   ========================== */
const categories = computed(() => {
  const raw = rawCategoriesData.value
  if (!raw || !Array.isArray(raw.categorias)) return []

  return raw.categorias
    .filter(
      (cat) =>
        cat.visible &&
        Array.isArray(cat.products) &&
        cat.products.length > 0
    )
    .map((cat) => {
      const category_id = Number(cat.categoria_id)
      const category_name = cat.categoria_descripcion || cat.english_name || ''

      const products = (cat.products || []).map((p) => {
        return {
          ...p,
          id: p.producto_id,
          product_name:
            p.productogeneral_descripcionweb ||
            p.productogeneral_descripcion ||
            p.english_name ||
            '',
          price: Number(p.productogeneral_precio ?? 0),
          image_url:
            p.productogeneral_urlimagen ||
            (p.lista_productobase &&
              p.lista_productobase[0] &&
              p.lista_productobase[0].producto_urlimagen) ||
            ''
        }
      })

      return {
        ...cat,
        category_id,
        category_name,
        products
      }
    })
})

/* ==========================
   NAVEGACIÓN DE PRODUCTOS (Versión Original)
   ========================== */
const onClickProduct = (category, product) => {
  // Redirección simple a la página de detalle
  router.push(`/producto/${product.id}`)
}

/* ==========================
   REFS / OBSERVERS (Lógica Avanzada del Segundo)
   ========================== */
const activeCategoryId = ref(null)
const categoryRefs = ref({}) 
const productRefs = ref({}) 

// Observers avanzados
const productObserver = ref(null)          // Para animación de entrada
const productCategoryObserver = ref(null)  // Para scroll spy preciso

const isProgrammaticScroll = ref(false)
let programmaticScrollTimer = null

onMounted(() => {
  // 1. Observer para animación de productos (Fade In)
  productObserver.value = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        const el = entry.target
        if (!el) return
        if (entry.isIntersecting) {
          el.classList.remove('menu-product-card--hidden')
          el.classList.add('menu-product-card--visible')
          obs.unobserve(el)
        }
      })
    },
    {
      root: null,
      rootMargin: '0px 0px -10% 0px',
      threshold: 0.1
    }
  )

  // 2. Observer para actualizar categoría activa (Scroll Spy)
  // Detecta qué productos están visibles para saber en qué categoría estamos
  productCategoryObserver.value = new IntersectionObserver(
    (entries) => {
      if (isProgrammaticScroll.value) return

      const visibles = []
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const el = entry.target
        if (!el) return
        
        const catId = Number(el.dataset.categoryId || '')
        if (!catId) return

        visibles.push({
          catId,
          top: entry.boundingClientRect.top
        })
      })

      if (!visibles.length) return
      
      // Tomamos el producto más cercano arriba
      visibles.sort((a, b) => a.top - b.top)
      const best = visibles[0]

      if (best.catId && best.catId !== activeCategoryId.value) {
        activeCategoryId.value = best.catId
      }
    },
    {
      root: null,
      rootMargin: '-120px 0px -60% 0px',
      threshold: 0.3
    }
  )

  // Observar elementos si ya están montados
  nextTick(() => {
    Object.values(productRefs.value).forEach((el) => {
      if (!el) return
      el.classList.add('menu-product-card--hidden')
      if (productObserver.value) productObserver.value.observe(el)
      if (productCategoryObserver.value) productCategoryObserver.value.observe(el)
    })
  })
})

onBeforeUnmount(() => {
  if (productObserver.value) productObserver.value.disconnect()
  if (productCategoryObserver.value) productCategoryObserver.value.disconnect()
  clearTimeout(programmaticScrollTimer)
})

// Ref para la sección (usado para hacer scroll hacia ella)
const setCategoryRef = (id, el) => {
  if (!el) {
    delete categoryRefs.value[id]
    return
  }
  categoryRefs.value[id] = el
}

// Ref para el producto (usado para los observers)
const setProductRef = (productId, categoryId, el) => {
  if (!el) {
    const prevEl = productRefs.value[productId]
    if (prevEl) {
      if (productObserver.value) productObserver.value.unobserve(prevEl)
      if (productCategoryObserver.value) productCategoryObserver.value.unobserve(prevEl)
    }
    delete productRefs.value[productId]
    return
  }

  productRefs.value[productId] = el
  // Clase inicial para animación (asegúrate de tener CSS para esto o quitarlo si no lo usas)
  el.classList.add('menu-product-card--hidden')
  
  // Data attributes necesarios para el observer
  el.dataset.productId = String(productId)
  el.dataset.categoryId = String(categoryId)

  if (productObserver.value) productObserver.value.observe(el)
  if (productCategoryObserver.value) productCategoryObserver.value.observe(el)
}

/* ==========================
   SCROLL A CATEGORÍA
   ========================== */
const HEADER_OFFSET = 7 * 16 

const scrollToCategoryId = (id) => {
  const el = categoryRefs.value[id]
  if (!el) return

  const y = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET

  isProgrammaticScroll.value = true
  clearTimeout(programmaticScrollTimer)

  window.scrollTo({
    top: y,
    behavior: 'smooth'
  })

  programmaticScrollTimer = window.setTimeout(() => {
    isProgrammaticScroll.value = false
  }, 400)
}

/* ==========================
   URL & NAVEGACIÓN (Categorías)
   ========================== */
const onClickCategory = (category) => {
  activeCategoryId.value = category.category_id
  
  router.push({
    path: route.path,
    query: {
      category: category.category_name
    }
  })

  nextTick(() => {
    scrollToCategoryId(category.category_id)
  })
}

const scrollFromRoute = () => {
  const q = route.query.category
  if (!q || typeof q !== 'string') return

  const target = categories.value.find(
    (c) => normalize(c.category_name) === normalize(q)
  )

  if (!target) return
  activeCategoryId.value = target.category_id

  nextTick(() => {
    scrollToCategoryId(target.category_id)
  })
}

watch(
  () => route.query.category,
  () => {
    scrollFromRoute()
  },
  { immediate: true, flush: 'post' }
)

watch(
  categories,
  (list) => {
    if (!list.length) return

    if (route.query.category && typeof route.query.category === 'string') {
      scrollFromRoute()
      return
    }

    if (activeCategoryId.value == null) {
      activeCategoryId.value = list[0].category_id
    }
  },
  { immediate: true, flush: 'post' }
)

/* ==========================
   SEO / META
   ========================== */
const pageTitle = computed(() => {
  const base = 'Carta Salchimonster'
  const categoryQ = route.query.category

  if (categoryQ && typeof categoryQ === 'string') {
    return `${formatLabel(categoryQ)} | ${base}`
  }
  return base
})

useHead(() => ({
  title: pageTitle.value
}))
</script>

<style scoped>
.menu-page {
  min-height: 100vh;
  color: #111827;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* CONTENIDO */
.menu-content {
  max-width: 1300px;
  margin: 0rem auto 2.5rem;
  padding: 0 1rem 1rem;
}

/* SECCIÓN CATEGORÍA */
.menu-category-section {
  padding-top: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.menu-category-section:last-of-type {
  border-bottom: none;
  padding-bottom: 0;
}

.menu-category-section__header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.menu-category-section__title {
  font-size: 2rem;
  font-weight: 700;
  margin: 1rem 0;
  text-transform: none;
}

.menu-category-section__count {
  margin: 0;
  font-size: 0.8rem;
  color: #6b7280;
}

/* GRID PRODUCTOS */
.menu-category-section__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.9rem;
  padding-bottom: 5rem;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .menu-content {
    padding: 0.5rem 0.5rem 1.5rem;
    margin-bottom: 1.5rem;
  }

  .menu-category-section {
    padding-top: 1.2rem;
    padding-bottom: 1rem;
  }

  .menu-category-section__title {
    font-size: 1.5rem;
  }

  .menu-category-section__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }
}

.menu-background {
  min-height: 100vh;
  background-image:
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.596) 0,
      rgb(255, 255, 255) 50vh,
      #ffffff 50vh 
    ),
    url('https://backend.salchimonster.com/read-photo-product/Ym5HMDik');
  background-repeat: no-repeat;
  background-size: 100%;
}
</style>