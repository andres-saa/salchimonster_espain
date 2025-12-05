<script setup>
 
import { onMounted } from '#imports'
import { useSitesStore } from '#imports'
import { useSedeFromSubdomain } from '#imports'
import { URI } from './service/conection'

const siteStore = useSitesStore()

// 1. Detectar subdominio (Funciona en Servidor y Cliente)
// Necesitamos una función que lea el host header en el server o window en el cliente
const getSubdomain = () => {
  if (import.meta.server) {
    // ESTAMOS EN EL SERVIDOR
    const event = useRequestEvent()
    const host = event?.node?.req?.headers?.host || ''
    // host es tipo "bogota.tudominio.com". Extraemos el primer segmento.
    return host.split('.')[0]
  } else {
    // ESTAMOS EN EL CLIENTE
    return window.location.hostname.split('.')[0]
  }
}

const currentSede = getSubdomain()

// 2. Fetch INTELIGENTE (Se ejecuta en servidor y el estado viaja al cliente)
// Usamos useAsyncData para bloquear la carga hasta tener la info
const { data: siteData, error } = await useAsyncData(
  `site-info-${currentSede}`, // Key única por sede
  () => $fetch(`${URI}/sites/subdomain/${currentSede}`)
)

// 3. Guardar en el Store inmediatamente
if (siteData.value && siteData.value[0]) {
  siteStore.location.site = siteData.value[0]
}

// 4. Manejo de estado (Opcional, pero recomendado)
// Si necesitas el watcher de status, ese sí puede ir en onMounted
// porque es lógica "viva" del cliente.
onMounted(() => {
  if (siteStore.location.site) {
    siteStore.initStatusWatcher()
  }
})
</script>

<template>
  <div>
    <div v-if="!siteStore.location.site" class="loading-screen">
      Cargando restaurante...
    </div>

    <div v-else>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
      <ToastContainer />
      <siteDialog />
      <CartBar />
    </div>
  </div>
</template>