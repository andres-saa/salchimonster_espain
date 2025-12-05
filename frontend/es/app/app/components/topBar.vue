<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useSitesStore, useSidebarStore, useUserStore, texts } from '#imports'

const route = useRoute()
const router = useRouter()
const sede = useSedeFromSubdomain()

const siteStore = useSitesStore()
const sidebarStore = useSidebarStore()
const user = useUserStore()

const siteName = ref('SALCHIMONSTER')

// ✅ Estado abierto/cerrado sincronizado con el backend
const isOpen = computed(() => {
  const st = siteStore.status
  if (!st) return false
  if (typeof st === 'string') return st === 'open'
  return st.status === 'open'
})

// (luego lo conectas al store del carrito si quieres)
const cartCount = ref(3)

// Idiomas
const languages = [
  { name: 'ES', label: 'Español', flag: 'https://flagcdn.com/w20/co.png' },
  { name: 'EN', label: 'English', flag: 'https://flagcdn.com/w20/us.png' }
]

// Idioma por defecto
if (!user.lang || !user.lang.name) {
  user.lang = languages[0]
}

const site = route.params.site

// Dropdown idioma
const isLangOpen = ref(false)

// --- refs para menús / "Más" ---
const menusContainerRef = ref(null)
const menuItemRefs = ref([])     // 👈 sin <any[]>
const moreButtonRef = ref(null)

const visibleMenus = ref([])
const overflowMenus = ref([])
const isMoreOpen = ref(false)
const windowWidth = ref(0)

// CONFIG: cuántos menús según ancho
const menuVisibilityConfig = [
  { maxWidth: 1024, visible: 4 },
  { maxWidth: 1280, visible: 6 },
  { maxWidth: Infinity, visible: 'all' }
]

// Menús dinámicos por idioma
const menusAll = computed(() => {
  const langKey = (user.lang?.name || 'es').toLowerCase()
  const t = texts[langKey]?.menus || {}

  return [
    { label: t.domicilios || 'Domicilios', to: '/' },
    { label: t.sedes || 'Sedes', to: `/sedes` },
    { label: t.carta || 'Carta', to: `/carta` },
    { label: t.rastrear || 'Rastrear', to: `/rastrear` },
    // { label: t.franquicias || 'Franquicias', to: `/franquicias` },
    { label: t.ayuda || 'Ayuda', to: `/pqr` },
    { label: t.colaboraciones || 'Colaboraciones', to: `/colaboraciones` },
    { label: t.sonando || 'Sonando', to: `/sonando` }
  ]
})

// Redes por defecto
const defaultSocialLinks = [
  {
    name: 'facebook',
    url: 'https://www.facebook.com/salchimonsteresp?locale=es_LA',
    icon: 'mdi:facebook'
  },
  {
    name: 'instagram',
    url: 'https://www.instagram.com/salchimonsteresp/',
    icon: 'mdi:instagram'
  },
  {
    name: 'whatsapp',
    url: 'https://wa.me/573005089846',
    icon: 'mdi:whatsapp'
  },
  {
    name: 'tiktok',
    url: 'https://www.tiktok.com/@salchimonsterespana',
    icon: 'fa7-brands:tiktok'
  }
]

// ✅ redes desde el status de la sede
const socialLinks = computed(() => {
  const raw =
    siteStore.status?.networks ||
    siteStore.current?.networks ||
    siteStore.site?.networks

  if (!raw) return defaultSocialLinks
  if (Array.isArray(raw)) return raw

  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? parsed : defaultSocialLinks
  } catch (e) {
    console.error('Error parseando networks:', e)
    return defaultSocialLinks
  }
})

const isActiveRoute = (path) => route.path === path

const toggleSidebar = (event) => {
  event.stopPropagation()
  sidebarStore.toggle()
}

const goToCart = () => {
  router.push('/cart')
}

const selectLang = (lang) => {
  user.lang = lang
  isLangOpen.value = false
}

const handleResize = () => {
  if (typeof window !== 'undefined') {
    windowWidth.value = window.innerWidth
  }
}

// helper para saber cuántos menús mostrar
const getVisibleCountForWidth = (width, totalMenus) => {
  const rule =
    menuVisibilityConfig.find((rule) => width <= rule.maxWidth) ||
    menuVisibilityConfig[menuVisibilityConfig.length - 1]

  if (rule.visible === 'all') return totalMenus
  return Math.min(rule.visible, totalMenus)
}

const recalcMenus = () => {
  const allMenus = menusAll.value

  if (!windowWidth.value) {
    visibleMenus.value = allMenus
    overflowMenus.value = []
    isMoreOpen.value = false
    return
  }

  // Móvil: todo se maneja por sidebar, no recortamos
  if (windowWidth.value <= 900) {
    visibleMenus.value = allMenus
    overflowMenus.value = []
    isMoreOpen.value = false
    return
  }

  const total = allMenus.length
  const visibleCount = getVisibleCountForWidth(windowWidth.value, total)

  visibleMenus.value = allMenus.slice(0, visibleCount)
  overflowMenus.value = allMenus.slice(visibleCount)

  if (!overflowMenus.value.length) {
    isMoreOpen.value = false
  }
}

const hasOverflow = computed(() => overflowMenus.value.length > 0)

onMounted(() => {
  handleResize()

  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
  }

  // arrancar polling de status cada 30s
  siteStore.initStatusWatcher()

  nextTick().then(() => {
    recalcMenus()
  })
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }
})

// Recalcular cuando cambie idioma o ancho
watch(
  [menusAll, windowWidth],
  () => {
    nextTick().then(() => {
      recalcMenus()
    })
  },
  { immediate: true }
)
</script>


<template>
  <div class="app-topbar-container">
    <div class="header">
      <div class="header-container">
        <!-- IZQUIERDA: LOGO + ESTADO + UBICACIÓN -->
        <NuxtLink
          to="/"
          class="logo-link"
        >
          <div class="logo-sesion">
            <img
              src="https://gestion.salchimonster.com/images/logo.png"
              alt="Logo"
              class="logo-img"
            />

            <div class="title-block">
              <div
                style="display: flex;gap: .5rem;  justify-content: center;align-items:center;"
              >
                <div style="display: flex;align-items: center;color: var(--primary-color);">
                  <Icon name="mdi:map-marker" />
                  <span style="text-transform: capitalize;">
                    {{ siteStore?.location?.site?.site_name }}
                  </span>
                </div>

                <!-- Estado de la sede sincronizado con siteStore.status -->
                <div
                  class="status-pill"
                  :class="isOpen ? 'status-pill--open' : 'status-pill--closed'"
                >
                  <span class="status-text">
                    {{ isOpen ? 'Abierto' : 'Cerrado' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </NuxtLink>

        <!-- CENTRO: MENÚ (SOLO DESKTOP) -->
        <nav
          class="menus"
          ref="menusContainerRef"
        >
          <!-- Menús visibles según resolución/config -->
          <NuxtLink
            v-for="item in visibleMenus"
            :key="item.to"
            :to="item.to"
            class="menu-item"
            :class="{ 'menu-item--active': isActiveRoute(item.to) }"
          >
            {{ item.label }}
          </NuxtLink>

          <!-- Botón MÁS con dropdown si hay overflow -->
          <div
            v-if="overflowMenus.length"
            class="more-wrapper"
          >
            <button
              type="button"
              class="more-button"
              ref="moreButtonRef"
              @click="isMoreOpen = !isMoreOpen"
            >
              Más ..
              <Icon name="mdi:chevron-down" class="more-chevron" />
            </button>

            <ul
              v-if="isMoreOpen"
              class="more-dropdown-menu"
            >
              <li
                v-for="item in overflowMenus"
                :key="item.to"
              >
                <NuxtLink
                  :to="item.to"
                  class="more-option"
                  :class="{ 'menu-item--active': isActiveRoute(item.to) }"
                  @click="isMoreOpen = false"
                >
                  {{ item.label }}
                </NuxtLink>
              </li>
            </ul>
          </div>

      <div class="social-icons">
        <a
          v-for="net in socialLinks"
          :key="net.name"
          :href="net.url"
          class="social-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon
            :name="net.icon"
            class="social-icon"
          />
        </a>
      </div>

        </nav>

        <!-- FILA OCULTA PARA MEDIR ANCHOS (ya no es crítica, pero la dejo por si luego la usas) -->
        <nav
          class="menus-measure"
          aria-hidden="true"
        >
          <span
            v-for="(item, index) in menusAll"
            :key="item.to"
            class="menu-item"
            :ref="el => menuItemRefs[index] = el"
          >
            {{ item.label }}
          </span>
        </nav>

        <!-- DERECHA: IDIOMA + HAMBURGUESA (MÓVIL y DESKTOP CON OVERFLOW) -->
        <div class="right-block">
          <div class="header-actions">
            <!-- Selector de idioma como DROPDOWN -->
            <div class="lang-switcher">
              <button
                type="button"
                class="lang-dropdown-trigger"
                @click="isLangOpen = !isLangOpen"
              >
                <img
                  v-if="user.lang?.flag"
                  :src="user.lang.flag"
                  :alt="user.lang?.label"
                  class="lang-flag"
                />
                <span class="lang-code">
                  {{ (user.lang?.name || 'es').toLowerCase() }}
                </span>
                <Icon name="mdi:chevron-down" class="lang-chevron" />
              </button>

              <ul
                v-if="isLangOpen"
                class="lang-dropdown-menu"
              >
                <li
                  v-for="lang in languages"
                  :key="lang.name"
                >
                  <button
                    type="button"
                    class="lang-option"
                    @click="selectLang(lang)"
                  >
                    <img
                      :src="lang.flag"
                      :alt="lang.label"
                      class="lang-flag"
                    />
                    <span class="lang-code">
                      {{ lang.name.toLowerCase() }}
                    </span>
                  </button>
                </li>
              </ul>
            </div>

            <!-- Botón menú lateral -->
            <button
              type="button"
              style="color: var(--primary-color);"
              class="icon-button button-barrras"
              :class="{ 'button-barrras--hidden-desktop': !hasOverflow }"
              @click="toggleSidebar"
            >
              <Icon name="mdi:menu" class="header-icon" />
            </button>

            <!-- Carrito (opcional)
            <button
              type="button"
              class="icon-button button-barrras cart-button"
              @click="goToCart"
            >
              <Icon name="mdi:cart-outline" class="header-icon" />
              <span class="cart-badge">
                {{ cartCount }}
              </span>
            </button>
            -->
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.topbar-mini-outer {
  width: 100%;
  background-color: rgb(12, 132, 66);
  background-image:
    linear-gradient(rgba(0, 0, 0, .5),rgba(0, 0, 0, .5)),
    url('https://www.foodandwine.com/thmb/iJw7N_NfcPpd-EB8rpYbzrkSFIM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/tomato-mozzarella-pizza-FT-RECIPE0725-e7244e979c504188a049623668c15b2e.jpg');
  background-size: cover;
  background-position: center;
}

.topbar-mini-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0.1rem 0.8rem;
  min-height: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.78rem;
}

.topbar-mini-left,
.topbar-mini-right {
  display: flex;
  align-items: center;
}

.location-button {
  border-radius: .3rem;
  background-color: #ffffff3a;
  color:var(--primary-color);
  display: inline-flex;
  border: none;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  text-transform: capitalize;
  line-height: 1;
}

/* Social icons */
.social-icons {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: black;
}

.social-icon {
  width: 1.5rem;
  text-decoration: none;
  height: 1.5rem;
}

.social-icon--facebook,
.social-icon--instagram,
.social-icon--whatsapp {
  color: #000000;
}

.app-topbar-container {
  padding: 0.1rem 0.6rem;
  background-color:rgba(255, 255, 255, 0.829);
  box-shadow: 0 0 1.6rem rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(3px);
}

.header {
  max-width: 1280px;
  margin: 0 auto;
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0 0.15rem;
}

.logo-link {
  text-decoration: none;
  color: inherit;
}

.logo-sesion {
  display: flex;
  align-items: center;
}

.logo-img {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  background-color: #ffffff;
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.title {
  letter-spacing: 0.06em;
  font-size: 1rem;
  color: var(--primary-color);
  margin: 0;
  font-weight: 700;
}

/* Estado */
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.1rem 0.3rem;
  border-radius: .2rem;
  font-size: 0.7rem;
  font-weight: 600;
  width: max-content;
  animation: blink .9s ease infinite;
}

.status-pill--open {
  background-color: #00ff6e;
  color: #000000;
}

.status-pill--closed {
  background-color: #ffd6d6;
  color: #b30000;
}

.status-text {
  text-transform: capitalize;
}

@keyframes blink {
  50% {
    opacity: .1;
  }
  100% {
    opacity: 100;
  }
}

/* Menú */
.menus {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 2rem;
  position: relative;
}

.menu-item {
  position: relative;
  color: #000000;
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  padding: 0.25rem 0;
  white-space: nowrap;
}

.menu-item--active{
    animation: .3s ease apear2;

}

.menu-item--active::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: -.5rem;
  width: 100%;
  padding: 0 .5rem;
  height: 5px;
  transition: all .2s ease;
  border-radius: 999px;
  animation: .3s ease apear;
  background-color:var(--primary-color);
}


@keyframes apear {

  0%{
    opacity: 0;
    transform: translateY(1rem) translateX(-50%);
  }

  100%{
    opacity: 100;
        transform: translateX(-50%);
  }
  
}


@keyframes apear2 {

  0%{
  
  }

  50%{
        transform:  translateY(-.5rem)  ;
     

  }

  100%{
    opacity: 100;
       
  }
  
}

/* Medidor oculto para calcular anchos */
.menus-measure {
  position: absolute;
  visibility: hidden;
  height: 0;
  overflow: hidden;
  pointer-events: none;
  white-space: nowrap;
}

/* Botón MÁS */
.more-wrapper {
  position: relative;
}

.more-button {
  border: 1px solid #e0e0e0;
  background: #ffffff;
  border-radius:.3REM;
  padding: 0.25rem 0.6rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
}

.more-chevron {
  font-size: 1rem;
}

.more-dropdown-menu {
  position: absolute;
  top: 120%;
  right: 0;
  background: #ffffff;
  border-radius: 0.4rem;
  box-shadow: 0 0.4rem 1.4rem rgba(0, 0, 0, 0.18);
  padding: 0.25rem 0;
  list-style: none;
  min-width: 7rem;
  z-index: 999;
}

.more-option {
  display: block;
  padding: 0.3rem 0.8rem;
  text-decoration: none;
  color: #000000;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.more-option:hover {
  background-color: #f5f5f5;
}

/* Derecha */
.right-block {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.icon-button {
  border: none;
  background: transparent;
  color: #000000;
  zoom: 1.5;
  cursor: pointer;
  padding: 0.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.cart-button {
  position: relative;
}

.cart-badge {
  position: absolute;
  left: 70%;
  bottom: 60%;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: #ffffff;
  color: #000000;
  font-size: 0.68rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Selector de idioma como dropdown */
.lang-switcher {
  position: relative;
  display: flex;
  align-items: center;
}

.lang-dropdown-trigger {
  border: 1px solid #e0e0e0;
  background: #ffffff;
  border-radius: .1REM;
  padding: 0.3rem;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
}

.lang-flag {
  width: 1.5rem;
  height: 1rem;
  border-radius: 2px;
  display: block;
}

.lang-code {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.lang-chevron {
  font-size: 1rem;
}

.lang-dropdown-menu {
  position: absolute;
  top: 120%;
  list-style: none;
  right: 0;
  background: #ffffff;
  border-radius: 0.4rem;
  box-shadow: 0 0.4rem 1.4rem rgba(0, 0, 0, 0.18);
  padding: 0.25rem 0;
  min-width: 5rem;
  z-index: 20;
}

.lang-option {
  width: 100%;
  border: none;
  background: transparent;
  padding: 0.2rem 0.6rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
  font-size: 0.78rem;
}

.lang-option:hover {
  background-color: #f5f5f5;
}

/* Responsive */
@media (max-width: 900px) {
  .app-topbar-container {
    padding: 0.2rem 0.7rem;
  }

  .menus {
    display: none;
  }

  .topbar-mini-inner {
    padding-inline: 0.5rem;
    font-size: 0.75rem;
  }

  .social-icons {
    gap: 0.25rem;
  }
}

/* En desktop, podemos ocultar el botón de barras sólo cuando NO hay overflow */
@media (min-width: 901px) {
  .button-barrras--hidden-desktop {
    display: none;
  }
}

/* Ícono de NuxtIcon en header */
.header-icon {
  font-size: 1.4rem;
}
</style>
