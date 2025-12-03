<script setup>
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import CarouselBanners from '~/components/carouselBanners.vue'
import ProductDialog from '~/components/ProductDialog.vue'
import MenuCategoriesBar from '~/components/MenuCategoriesBar.vue'
import MenuProductCard from '~/components/MenuProductCard.vue'
import { URI } from '~/service/conection'
import { usecartStore } from '#imports'

const route = useRoute()
const router = useRouter()
const store = usecartStore()

const pe_id = 1

// 📡 Traer data real del backend
// Ahora este endpoint devuelve: { site_id, local_id, categorias: [...] }
const { data: rawCategoriesData, pending, error } = useFetch(
  () => `${URI}/tiendas/${pe_id || 1}/products`,
  {
    // Solo en el cliente, para no bloquear SSR ni la navegación
    server: false,
    // No bloquea el render inicial, dispara luego
    lazy: true,
    // Valor por defecto para que 'categories' no truene
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

// "todo minúscula con la primera letra mayúscula"
const formatLabel = (str) => {
  const s = String(str || '').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* ==========================
   ADAPTACIÓN DE LA DATA
   ========================== */
// rawCategoriesData.value = {
//   site_id,
//   local_id,
//   categorias: [ { categoria_id, categoria_descripcion, english_name, products: [...] } ]
// }
const categories = computed(() => {
  const raw = rawCategoriesData.value
  if (!raw || !Array.isArray(raw.categorias)) return []

  return raw.categorias
    // solo categorías visibles que tengan products
    .filter(
      (cat) =>
        cat.visible &&
        Array.isArray(cat.products) &&
        cat.products.length > 0
    )
    .map((cat) => {
      const category_id = Number(cat.categoria_id)
      const category_name =
        cat.categoria_descripcion || cat.english_name || ''

      const products = (cat.products || []).map((p) => {
        return {
          // mantenemos todo lo original por si otros componentes lo usan
          ...p,
          // 👇 claves que usa este componente y los hijos (MenuProductCard, ProductDialog)
          id: p.producto_id,
          product_name:
            p.productogeneral_descripcionweb ||
            p.productogeneral_descripcion ||
            p.english_name ||
            '',
          price: Number(p.productogeneral_precio ?? 0),
          // url de imagen "normalizada" por si la necesitas
          image_url:
            p.productogeneral_urlimagen ||
            (p.lista_productobase &&
              p.lista_productobase[0] &&
              p.lista_productobase[0].producto_urlimagen) ||
            ''
        }
      })

      return {
        // mantenemos todos los campos originales
        ...cat,
        // 👇 claves normalizadas que usa el resto del componente
        category_id,
        category_name,
        products
      }
    })
})

// Lista plana de productos con referencia a su categoría
const flatProducts = computed(() => {
  const result = []
  categories.value.forEach((cat, catIndex) => {
    ;(cat.products || []).forEach((prod, prodIndex) => {
      result.push({ catIndex, prodIndex, category: cat, product: prod })
    })
  })
  return result
})

/* ==========================
   NAVEGACIÓN ENTRE PRODUCTOS
   ========================== */

const showProductDialog = ref(false)
const selectedProduct = ref(null)

const goToRelativeProduct = (step) => {
  if (!selectedProduct.value) return

  const list = flatProducts.value
  if (!list.length) return

  const currentIndex = list.findIndex(
    (item) => item.product.id === selectedProduct.value.id
  )
  if (currentIndex === -1) return

  const nextIndex = (currentIndex + step + list.length) % list.length
  const { category, product } = list[nextIndex]

  activeCategoryId.value = category.category_id

  router.push({
    path: route.path,
    query: {
      ...route.query,
      category: category.category_name,
      product: product.product_name
    }
  })

  nextTick(() => {
    scrollToCategoryId(category.category_id)
    selectedProduct.value = product
    showProductDialog.value = true
  })
}

const goToNextProduct = () => goToRelativeProduct(1)
const goToPrevProduct = () => goToRelativeProduct(-1)

/* ==========================
   REFS / OBSERVERS
   ========================== */

// ID de categoría activa (para resaltar botón)
const activeCategoryId = ref(null)

// Refs de cada sección de categoría (solo para hacer scroll)
const categoryRefs = ref({}) // { [category_id]: HTMLElement }

// Refs de productos
const productRefs = ref({}) // { [product_id]: HTMLElement }

// Observer para animación de productos
const productObserver = ref(null)

// Observer para detectar categoría activa según productos visibles
const productCategoryObserver = ref(null)

// Flag para distinguir scroll programático vs manual
const isProgrammaticScroll = ref(false)
let programmaticScrollTimer = null

/* ==========================
   INTERSECTION OBSERVERS
   ========================== */

onMounted(() => {
  // Observer para animación de entrada de productos
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

  // Observer para actualizar categoría activa según productos visibles
  productCategoryObserver.value = new IntersectionObserver(
    (entries) => {
      // Mientras estamos haciendo scroll programático NO actualizamos categoría
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

      // Tomamos el producto más cercano a la parte superior del viewport
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

  // Observar lo que ya exista en refs (por si llegaron antes del mounted)
  nextTick(() => {
    Object.values(productRefs.value).forEach((el) => {
      if (!el) return
      el.classList.add('menu-product-card--hidden')
      if (productObserver.value) {
        productObserver.value.observe(el)
      }
      if (productCategoryObserver.value) {
        productCategoryObserver.value.observe(el)
      }
    })
  })
})

onBeforeUnmount(() => {
  if (productObserver.value) {
    productObserver.value.disconnect()
  }
  if (productCategoryObserver.value) {
    productCategoryObserver.value.disconnect()
  }
  clearTimeout(programmaticScrollTimer)
})

// Asignar refs de sección (solo guardar el elemento)
const setCategoryRef = (id, el) => {
  if (!el) {
    delete categoryRefs.value[id]
    return
  }
  categoryRefs.value[id] = el
}

// Asignar refs de producto + preparar animación + observer de categoría
const setProductRef = (productId, categoryId, el) => {
  // Cuando el elemento se destruye
  if (!el) {
    const prevEl = productRefs.value[productId]
    if (prevEl) {
      if (productObserver.value) {
        productObserver.value.unobserve(prevEl)
      }
      if (productCategoryObserver.value) {
        productCategoryObserver.value.unobserve(prevEl)
      }
    }
    delete productRefs.value[productId]
    return
  }

  productRefs.value[productId] = el
  el.classList.add('menu-product-card--hidden')

  // Guardamos los ids en data-attributes para leerlos en el observer
  el.dataset.productId = String(productId)
  el.dataset.categoryId = String(categoryId)

  if (productObserver.value) {
    productObserver.value.observe(el)
  }
  if (productCategoryObserver.value) {
    productCategoryObserver.value.observe(el)
  }
}

/* ==========================
   SCROLL A CATEGORÍA
   ========================== */

const HEADER_OFFSET = 7 * 16 // 7rem asumiendo 16px de font-size base

// Scroll vertical hasta la sección de la categoría
const scrollToCategoryId = (id) => {
  const el = categoryRefs.value[id]
  if (!el) return

  const y =
    el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET

  // Marcamos que el scroll es programático
  isProgrammaticScroll.value = true
  clearTimeout(programmaticScrollTimer)

  window.scrollTo({
    top: y,
    behavior: 'smooth'
  })

  // Después de un rato liberamos el flag para que el observer vuelva a actuar
  programmaticScrollTimer = window.setTimeout(() => {
    isProgrammaticScroll.value = false
  }, 400)
}

/* ==========================
   URL & NAVEGACIÓN
   ========================== */

const onClickCategory = (category) => {
  activeCategoryId.value = category.category_id

  const { product, ...restQuery } = route.query

  router.push({
    path: route.path,
    query: {
      ...restQuery,
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
  {
    immediate: true,
    flush: 'post' // corre el watcher después del render
  }
)

watch(
  categories,
  (list) => {
    if (!list.length) return

    // 1) Si viene ?category= en la URL => usarla
    if (route.query.category && typeof route.query.category === 'string') {
      scrollFromRoute()
      return
    }

    // 2) Si no viene categoría en la URL, usar la primera
    if (activeCategoryId.value == null) {
      activeCategoryId.value = list[0].category_id
    }

    // 3) Una vez tengamos categoría activa y el DOM montado, hacemos scroll
    nextTick(() => {
      if (activeCategoryId.value != null) {
        scrollToCategoryId(activeCategoryId.value)
      }
    })
  },
  {
    immediate: true,
    flush: 'post'
  }
)

/* ==========================
   DIALOGO DE PRODUCTO
   ========================== */

const clearProductFromQuery = () => {
  const { product, ...rest } = route.query
  router.push({
    path: route.path,
    query: rest
  })
}

const onClickProduct = (category, product) => {
  router.push({
    path: route.path,
    query: {
      ...route.query,
      category: category.category_name,
      product: product.product_name
    }
  })

  nextTick(() => {
    selectedProduct.value = product
    showProductDialog.value = true
  })
}

// Abre cuando hay ?product= y cierra cuando desaparece
const openProductFromRoute = () => {
  const productQ = route.query.product

  // Si NO hay product en la URL y el diálogo está abierto, lo cerramos
  if (!productQ || typeof productQ !== 'string') {
    if (showProductDialog.value) {
      showProductDialog.value = false
      selectedProduct.value = null
    }
    return
  }

  // Si hay product en la URL, buscamos y abrimos
  if (!categories.value.length) return

  const categoryQ = route.query.category

  let targetCategory = null
  let targetProduct = null

  if (categoryQ && typeof categoryQ === 'string') {
    targetCategory = categories.value.find(
      (c) => normalize(c.category_name) === normalize(categoryQ)
    )
  }

  if (targetCategory) {
    targetProduct = (targetCategory.products || []).find(
      (p) => normalize(p.product_name) === normalize(productQ)
    )
  }

  if (!targetProduct) {
    for (const cat of categories.value) {
      const found = (cat.products || []).find(
        (p) => normalize(p.product_name) === normalize(productQ)
      )
      if (found) {
        targetCategory = cat
        targetProduct = found
        break
      }
    }
  }

  if (!targetCategory || !targetProduct) return

  activeCategoryId.value = targetCategory.category_id

  nextTick(() => {
    scrollToCategoryId(targetCategory.category_id)
    selectedProduct.value = targetProduct
    showProductDialog.value = true
  })
}

const onDialogVisibleChange = (val) => {
  showProductDialog.value = val
  if (!val) {
    selectedProduct.value = null
    clearProductFromQuery()
  }
}

/* ==========================
   TÍTULO DE LA PÁGINA
   ========================== */

const pageTitle = computed(() => {
  const base = 'Carta Salchimonster' // cambia si quieres otro título base

  const categoryQ = route.query.category
  const productQ = route.query.product

  if (productQ && typeof productQ === 'string') {
    return `${formatLabel(productQ)} | ${base}`
  }

  if (categoryQ && typeof categoryQ === 'string') {
    return `${formatLabel(categoryQ)} | ${base}`
  }

  return base
})

useHead(() => ({
  title: pageTitle.value
}))

/* ==========================
   WATCH PARA ABRIR / CERRAR PRODUCTO
   ========================== */

watch(
  [categories, () => route.query.product],
  () => {
    openProductFromRoute()
  },
  { immediate: true }
)
</script>
 <template>
 
    <div class="menu-page">
      <CarouselBanners />

      <!-- BARRA DE CATEGORÍAS COMO COMPONENTE -->
      <MenuCategoriesBar
        :categories="categories"
        :active-category-id="activeCategoryId"
        @select-category="onClickCategory"
      />

      <!-- CONTENIDO: LISTA DE CATEGORÍAS + PRODUCTOS -->

      <div class="menu-background">
   <div class="menu-content ">
        <section
          v-for="(cat,index) in categories"
          :key="cat.category_id"
          :ref="(el) => setCategoryRef(cat.category_id, el)"
          class="menu-category-section"
        >
          <header class="menu-category-section__header">
            <h2 class="menu-category-section__title" :style="index == 0? 'color:white' : ''">
              {{ formatLabel(cat.category_name) }}
            </h2>
            <p class="menu-category-section__count" :style="index == 0? 'color:white' : ''">
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
   

      <!-- DIALOGO DE PRODUCTO -->
      <ProductDialog
        v-if="selectedProduct"
        v-model:visible="showProductDialog"
        :product="selectedProduct"
        @update:visible="onDialogVisibleChange"
        @next="goToNextProduct"
        @prev="goToPrevProduct"
      />
    </div>
 
</template>

<style scoped>
.menu-page {
  min-height: 100vh;
  /* background: #f3f4f6; */
  color: #111827;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
    sans-serif;

}

/* HERO (si lo quieres usar) */
.menu-hero {
  position: relative;
  height: 220px;
  width: 100%;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.95)),
    url('https://images.pexels.com/photos/4109087/pexels-photo-4109087.jpeg');
  background-size: cover;
  background-position: center;
}

.menu-hero__overlay {
  position: absolute;
  inset: 0;
}

.menu-hero__content {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.5rem;
    
}

.menu-hero__title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  margin: 0 0 0.5rem;
  text-transform: none;
}

.menu-hero__subtitle {
  margin: 0;
  opacity: 0.8;
  max-width: 480px;
  font-size: 0.95rem;
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
  margin:1rem 0;
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

/* RESPONSIVE ESCRITORIO */
@media (min-width: 1024px) {
  .menu-hero__title {
    font-size: 2.4rem;
  }
}

/* 📱 RESPONSIVE MÓVIL */
@media (max-width: 768px) {
  .menu-hero {
    height: 180px;
  }

  .menu-hero__title {
    font-size: 1.4rem;
  }

  .menu-hero__subtitle {
    font-size: 0.8rem;
  }

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
  /* Primero el degradado encima, luego la imagen */
  background-image:
    linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.596) 0,
      rgb(255, 255, 255) 50vh, /* hasta 300px transparente */
      #ffffff 50vh 
    ),
    url('https://backend.salchimonster.com/read-photo-product/Ym5HMDik');
    background-repeat: no-repeat;
    background-size: 100%
    ;
   
}

</style>
