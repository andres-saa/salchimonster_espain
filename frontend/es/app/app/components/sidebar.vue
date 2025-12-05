<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useSidebarStore, useRoute } from '#imports'
import { texts } from '#imports'
import { useUserStore } from '#imports'
const route = useRoute()
const store = useSidebarStore()
const user = useUserStore()
 


const menus = computed(() => {
  const langKey = (user.lang?.name || 'es').toLowerCase()
  const t = texts[langKey]?.menus || {}

  return [
    { label: t.domicilios || 'Domicilios', to: '/' },
    // { label: t.kids || 'Kids', to: `/kids` },
    { label: t.sedes || 'Sedes', to: `/sedes` },
    { label: t.carta || 'Carta', to: `/carta` },
    { label: t.rastrear || 'Rastrear', to: `/rastrear` },
    // { label: t.franquicias || 'Franquicias', to: `/franquicias` },
    { label: t.ayuda || 'Ayuda', to: `/pqr` },
    { label: t.colaboraciones || 'Colaboraciones', to: `/colaboraciones` },
      { label: t.sonando || 'Sonando', to: `/sonando` }
  ]
})

// 🔹 Lista de publicaciones: SOLO type, to, image
const posts = ref([
  {
    type: 'instagram',
    to: 'https://www.instagram.com/p/DMVpYaJx0aL/',
    image:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRbUpauKUZtgu5hNAaZi1I6wMJlbb8wX08K8KxeN2lZYiDEmICL0dkKUfN7GWop4jInRro&usqp=CAU'
  },
  {
    type: 'facebook',
    to: 'https://www.facebook.com/facebook/posts/10153231379946729',
    image:
      'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSp4y5LQHclGpdypvXlLeKbrvA2jq6Ao1qK_w&s'
  },
  {
    type: 'youtube',
    to: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    image:
      'https://i.ytimg.com/vi/Y5T5EHBLH1c/oardefault.jpg?sqp=-oaymwEYCJUDENAFSFqQAgHyq4qpAwcIARUAAIhC&rs=AOn4CLB2KZPEiel96qlJ6RpqA0ULUhkgnw'
  },
  {
    type: 'tiktok',
    to: 'https://www.tiktok.com/@salchimonster/video/1234567890',
    image:
      'https://i.ytimg.com/vi/Y5T5EHBLH1c/oardefault.jpg?sqp=-oaymwEYCJUDENAFSFqQAgHyq4qpAwcIARUAAIhC&rs=AOn4CLB2KZPEiel96qlJ6RpqA0ULUhkgnw'
  }
])

const networkLabel = (type) => {
  if (type === 'instagram') return 'Instagram'
  if (type === 'facebook') return 'Facebook'
  if (type === 'youtube') return 'YouTube'
  if (type === 'tiktok') return 'TikTok'
  return 'Post'
} 

const closeSidebar = () => {
  store.side_bar_visible = false
}

/* referencia al contenedor que scrollea */
const containerRef = ref(null)

/* LÓGICA DE SCROLL */
const isPinned = ref(true)
const isAtTop = ref(true)
const lastScrollY = ref(0)
const lastToggleY = ref(0)

const MIN_SCROLL_DELTA = 5
const TOGGLE_DISTANCE = 60

const handleScroll = () => {
  const el = containerRef.value
  if (!el) return

  const currentY = el.scrollTop || 0
  const delta = currentY - lastScrollY.value

  isAtTop.value = currentY < 10

  if (Math.abs(delta) < MIN_SCROLL_DELTA) {
    lastScrollY.value = currentY
    return
  }

  if (isPinned.value) {
    const scrolledDownSinceToggle = currentY - lastToggleY.value
    if (delta > 0 && currentY > 80 && scrolledDownSinceToggle > TOGGLE_DISTANCE) {
      isPinned.value = false
      lastToggleY.value = currentY
    }
  } else {
    const scrolledUpSinceToggle = lastToggleY.value - currentY
    if ((delta < 0 && scrolledUpSinceToggle > TOGGLE_DISTANCE) || currentY < 10) {
      isPinned.value = true
      lastToggleY.value = currentY
    }
  }

  lastScrollY.value = currentY
}

/* ✅ detectar si estamos en /carta (o debajo) */
const isCartaRoute = computed(() => {
  const path = route.path || ''
  
  // Lista de textos a buscar
  const keywords = ['/carta', '/cart', '/sedes', '/franquicias', '/colaboraciones', '/sonando', '/producto']

  // .some() devuelve true si AL MENOS UNO de los elementos cumple la condición
  return keywords.some(keyword => path.includes(keyword))
})

/* 🔒 al entrar a /carta, arrancar con sidebar cerrada */
watch(
  isCartaRoute,
  (val) => {
    if (val) {
      store.side_bar_visible = false
    }
  },
  { immediate: true }
)

onMounted(() => {
  const el = containerRef.value
  if (!el) return
  const y = el.scrollTop || 0
  lastScrollY.value = y
  lastToggleY.value = y
  el.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  const el = containerRef.value
  if (!el) return
  el.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div>
    <!-- BACKDROP -->
    <div
      v-if="store.side_bar_visible"
      class="sidebar-backdrop"
      @click="closeSidebar"
    ></div>

    <aside
      ref="containerRef"
      class="container"
      :class="{
        'container--mobile-open': store.side_bar_visible,
        'container--drawer-desktop': isCartaRoute
      }"
    >
      <!-- MENÚ MOBILE STICKY (dentro del panel) -->
      <nav class="mobile-menu">
        <NuxtLink
          v-for="item in menus"
          :key="item.to"
          :to="item.to"
          class="mobile-menu__link"
          @click="closeSidebar"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- LISTA DE POSTS (solo imagen + logo red) -->
      <div class="posts-wrapper">
        <a
          v-for="(post, index) in posts"
          :key="post.to || index"
          class="post-item"
          :href="post.to"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div class="post-thumb">
            <img
              :src="post.image"
              :alt="networkLabel(post.type)"
              loading="lazy"
            />

            <!-- Overlay con texto + color por red al hover -->
            <div
              class="post-overlay"
              :class="`post-overlay--${post.type}`"
            >
              <span class="post-overlay__text">Ver publicación</span>
            </div>

            <!-- Badge con logo de la red -->
            <div class="post-badge" :class="`post-badge--${post.type}`">
              <Icon
                v-if="post.type === 'instagram'"
                name="mdi:instagram"
                class="post-badge__icon"
              />
              <Icon
                v-else-if="post.type === 'facebook'"
                name="mdi:facebook"
                class="post-badge__icon"
              />
              <Icon
                v-else-if="post.type === 'youtube'"
                name="mdi:youtube"
                class="post-badge__icon"
              />
              <Icon
                v-else-if="post.type === 'tiktok'"
                name="fa7-brands:tiktok"
                class="post-badge__icon"
              />
            </div>
          </div>
        </a>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* CONTENEDOR DE LA SIDEBAR (DESKTOP NORMAL) */
.container {
  padding-bottom: 1rem;
  color: rgb(255, 191, 191);
  /* background-color: white; */
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
  margin: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.container::-webkit-scrollbar {
  display: none;
}

/* MENÚ MOBILE (por defecto oculto, solo móviles) */
.mobile-menu {
  display: none;
}

/* HEADER (si luego lo usas) */
.sidebar-header {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 99;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  padding: 0.5rem;
  background: var(--primary-color);
}

.ig-logo {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.ig-icon {
  font-size: 2rem;
}

.sidebar-title {
  margin: 0;
  color: white;
  font-size: 1.5rem;
}

/* LISTA DE POSTS */
.posts-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
 
}

/* Tarjeta clickeable por post */
.post-item {
  display: block;
  background-color: #fafafa;
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.08);
  border-radius: 0.3rem;
  text-decoration: none;
  color: inherit;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.post-item:hover {
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.18);
}

/* Contenedor de la miniatura */
.post-thumb {
  position: relative;
  width: 100%;
  border-radius: 0.3rem;
}

.post-thumb img {
  display: block;
  width: 100%;
  height: 260px;
  object-fit: cover;
  transition: transform 0.4s ease;
}

/* Overlay sutil (se activa al hover) */
.post-overlay {
  position: absolute;
  inset: 0;
  opacity: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.post-item:hover .post-overlay {
  opacity: 1;
}

.post-overlay__text {
  color: #ffffff;
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  width: 100%;
  text-align: center;
  padding: 0.8rem;
  background-color: var(--primary-color); /* default */
  font-weight: 600;
  transition: background 0.25s ease, color 0.25s ease;
}

/* 🔹 Cambiar color de fondo según red al hacer hover */
.post-item:hover .post-overlay--instagram .post-overlay__text {
  background: radial-gradient(
    circle at 30% 30%,
    #ffd600,
    #ff7a00,
    #ff0069,
    #d300c5,
    #7638fa
  );
}

.post-item:hover .post-overlay--facebook .post-overlay__text {
  background: #1877f2;
}

.post-item:hover .post-overlay--youtube .post-overlay__text {
  background: #ff0000;
}

.post-item:hover .post-overlay--tiktok .post-overlay__text {
  /* ligerito efecto TikTok */
  background: linear-gradient(135deg, #69c9d0, #ee1d52 60% );
}

/* Badge con icono en la esquina */
.post-badge {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  height: 2.5rem;
  width: 2.5rem;
  border-radius: 999px;
  padding: 0.3rem 0.45rem;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
}

.post-badge__icon {
  font-size: 1.3rem;
  color: #ffffff;
}

/* Colores por red */
.post-badge--instagram {
  background: radial-gradient(
    circle at 30% 30%,
    #ffd600,
    #ff7a00,
    #ff0069,
    #d300c5,
    #7638fa
  );
}

.post-badge--facebook {
  background: #1877f2;
}

.post-badge--youtube {
  background: #ff0000;
}

.post-badge--tiktok {
  background: linear-gradient( to left, #69c9d0, #ee1d52  );
}

/* BACKDROP (como antes, solo visible por media query en móvil) */
.sidebar-backdrop {
  display: none;
}

/* 🔽 SOLO MÓVILES: PANEL DESDE LA IZQUIERDA PARA TODAS LAS RUTAS */
@media (max-width: 768px) {
  .container {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    max-width: 340px;
    width: 85%;
    transform: translateX(-100%);
    transition: transform 0.25s ease-in-out;
    z-index: 9999;
    background-color: white;
  }

  .container.container--mobile-open {
    transform: translateX(0);
  }

  .mobile-menu {
    display: flex;
    flex-direction: column;
    top: 0;
    z-index: 100;
    gap: 0.5rem;
    padding: 0.5rem;
    background: #ffffff;
    overflow-x: auto;
  }

  .mobile-menu__link {
    white-space: nowrap;
    padding: 0.35rem 0.75rem;
    border-radius: 0.3rem;
    font-size: 0.85rem;
    border: 1px solid #eee;
    text-decoration: none;
    color: #333;
  }

  .mobile-menu__link.router-link-active {
    font-weight: 600;
    border-color: var(--primary-color);
    color: white;
    background-color: var(--primary-color);
  }

  .sidebar-header {
    position: static;
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 9990;
    backdrop-filter: blur(5px);
    transition: 0.3s ease all;
  }

  .post-thumb img {
    height: 220px;
  }
}

/* 💻 DESKTOP EN /carta: QUE SE COMPORTE COMO DRAWER IZQUIERDO */
.container--drawer-desktop {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  max-width: 340px;
  width: 85%;
  transform: translateX(-100%);
  transition: transform 0.8s ease-in-out;
  z-index: 9999;
  box-shadow: 4px 0 18px rgba(0, 0, 0, 0.35);
}

.container--drawer-desktop.container--mobile-open {
  transform: translateX(0);
}
</style>
