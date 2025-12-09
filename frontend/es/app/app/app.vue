<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <ToastContainer />
    <siteDialog />
    <CartBar />
  </div>
</template>

<script setup>
import { onMounted, watch } from '#imports'
import { useRoute, useRouter } from '#imports'
import { useSitesStore, useUserStore, usecartStore } from '#imports'
import { useSedeFromSubdomain } from '#imports'
import { URI } from './service/conection'

const siteStore = useSitesStore()
const userStore = useUserStore()
const cartStore = usecartStore()
const sede = useSedeFromSubdomain()
const route = useRoute()
const router = useRouter()

onMounted(async () => {
  // ---------------------------------------------------------
  // 1. RECUPERAR ESTADO DEL HASH (SOLO SI EXISTE)
  // ---------------------------------------------------------
  const hash = route.query.hash

  if (hash) {
    try {
      const response = await fetch(`${URI}/data/${hash}`)
      
      if (response.ok) {
        const data = await response.json()
        const restoredData = data?.data
        
        // Restaurar Usuario
        if (restoredData.user) {
          userStore.user = { ...userStore.user, ...restoredData.user }
        }

        // Restaurar Carrito
        if (restoredData.cart) {
          cartStore.cart = restoredData.cart
        }

        // Opcional: Limpiar el hash de la URL
        // router.replace({ query: null })
      }
    } catch (err) {
      console.error('Error restaurando datos por hash:', err)
    }
  }
  
  // ¡IMPORTANTE!: Aquí eliminamos el 'return'.
  // El código sigue bajando para ejecutar la lógica del subdominio.

  // ---------------------------------------------------------
  // 2. SIEMPRE CARGAR SEDE POR SUBDOMINIO
  // ---------------------------------------------------------
  try {
    const currentSede = typeof sede === 'string' ? sede : sede?.value
    
    if (currentSede) {
      const response = await fetch(`${URI}/sites/subdomain/${currentSede}`)

      if (!response.ok) {
        throw new Error(`Error HTTP ${response.status}`)
      }

      const data = await response.json()

      // Guarda la data de la sede en el store
      siteStore.location.site = data?.[0]
      
      // Iniciamos el watcher una vez tenemos la sede cargada
      siteStore.initStatusWatcher()
    }
  } catch (err) {
    console.error('Error cargando sede desde subdominio:', err)
  }
})
</script>