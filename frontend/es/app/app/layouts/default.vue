<template>
  <div class="app-layout">
    <!-- TOPBAR: PUEDE CRECER A TODO EL ANCHO -->
    <header
      class="app-layout__topbar"
      :style="isPinned ? 'top:0' : 'top:-4rem'"
      style="transition: all ease .3s; position: sticky;"
    >
      <TopBar />
    </header>

    <!-- CONTENEDOR (SIDEBAR + CONTENIDO) -->
    <div
      class="app-layout__shell"
      :class="{ 'app-layout__shell--full': isCartaRoute }"
    >
      <div style="position: fixed;left: 0;top: 0;z-index: -1;">
        <div style="width: 100vw;height: 100vh;"></div>
        <!-- <img
          style="position: fixed;left: 0;top: 0; width: 100vw;z-index: -1;opacity: .2;height: 100vh;object-fit: cover;filter: blur(10px)"
          src="https://niceeat.co/files/tn/1666829837_301691710_1158873957998851_8576388724181114818_n.jpg"
          alt=""
        /> -->
      </div>

      <aside
        class="app-layout__sidebar"
        :style="
          isPinned
            ? 'top:3.2rem; transition: all .3s ease;'
            : 'top:0; transition: all .3s ease;'
        "
      >
        <Sidebar />
      </aside>

      <main
        class="app-layout__content"
        
        :class="{ 'app-layout__content--full': isCartaRoute }"
      >
        <!-- 🔥 Transición Nuxt entre páginas -->
        
          <slot  />
       
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute } from '#imports'

const route = useRoute()

/* 👇 LÓGICA DE SCROLL: OCULTAR AL BAJAR, MOSTRAR AL SUBIR */
const isPinned = ref(true)        // true = visible, false = oculto
const isAtTop = ref(true)         // para saber si estamos arriba del todo
const lastScrollY = ref(0)

const handleScroll = () => {
  if (typeof window === 'undefined') return

  const currentY = window.scrollY || window.pageYOffset || 0
  const delta = currentY - lastScrollY.value

  // estamos cerca del top
  isAtTop.value = currentY < 10

  // evitar ruido de scroll muy pequeño
  if (Math.abs(delta) < 5) {
    lastScrollY.value = currentY
    return
  }

  if (delta > 0 && currentY > 80) {
    // 👉 bajando
    isPinned.value = false
  } else {
    // 👆 subiendo (o muy arriba)
    isPinned.value = true
  }

  lastScrollY.value = currentY
}

/* ✅ detectar si estamos en /carta (o subrutas) */
const isCartaRoute = computed(() => {
  const path = route.path || ''
  
  // Lista de textos a buscar
  const keywords = ['/carta', '/cart', '/sedes', '/franquicias', '/colaboraciones', '/sonando', '/producto']

  // .some() devuelve true si AL MENOS UNO de los elementos cumple la condición
  return keywords.some(keyword => path.includes(keyword))
})

onMounted(() => {
  if (typeof window === 'undefined') return
  lastScrollY.value = window.scrollY || 0
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  if (typeof window === 'undefined') return
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
}

/* TOPBAR FULL-WIDTH */
.app-layout__topbar {
  flex: 0 0 auto;
  top: 0;
  z-index: 1000;
  background: #ffffff71;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* SHELL por defecto (con límite en 2K) */
.app-layout__shell {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  display: flex;
}

/* En pantallas MÁS GRANDES que 2K, limitamos a 1920px y centramos */
@media (min-width: 2049px) {
  .app-layout__shell {
    max-width: 1600px;
    margin: 0 auto;
  }

  /* 👇 Pero si es /carta, quitamos ese límite */
  .app-layout__shell.app-layout__shell--full {
    max-width: none;
    margin: 0;
  }
}

/* === SIDEBAR === */
.app-layout__sidebar {
  width: 260px;
  color: #fff;
  overflow-y: auto;
  max-height: 100vh;
  position: fixed;
  z-index: 9999;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.app-layout__sidebar::-webkit-scrollbar {
  display: none;
}

/* === CONTENIDO === */
.app-layout__content {
  width: 100%;
  padding: 0;
  padding-left: 260px; /* espacio reservado para sidebar en rutas normales */
}

/* 👇 En /carta: el main se come TODO el ancho, sin left */
.app-layout__content--full {
  padding-left: 0;
}

/* === TRANSICIÓN NUXT (page) === */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .app-layout {
    max-height: none;
  }

  .app-layout__shell {
    flex-direction: column;
    max-width: 100%;
    position: relative;
  }

  .app-layout__content,
  .app-layout__content--full {
    padding: 0;
    overflow-y: visible;
  }
}
</style>
