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
import { onMounted } from '#imports'
import { useSitesStore } from '#imports'
import { useSedeFromSubdomain } from '#imports'
import { URI } from './service/conection'

const siteStore = useSitesStore()
const sede = useSedeFromSubdomain()

onMounted(async () => {
  try {
    // Por si useSedeFromSubdomain devuelve un ref
    const currentSede = typeof sede === 'string' ? sede : sede?.value
    if (!currentSede) return

    const response = await fetch(`${URI}/sites/subdomain/${currentSede}`)

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`)
    }

    const data = await response.json()

 

    // Guarda la data de la sede en el store
    siteStore.location.site = data?.[0]
     
    siteStore.initStatusWatcher()
  } catch (err) {
    console.error('Error cargando sede desde subdominio:', err)
    // Aquí podrías lanzar un toast si tienes algo tipo useToast()
  }
})
</script>
