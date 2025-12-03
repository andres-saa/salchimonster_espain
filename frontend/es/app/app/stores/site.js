// /stores/sites.ts o /stores/sites.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { URI } from '../service/conection'

export const useSitesStore = defineStore(
  'site-d3sd422',
  () => {
    // ───────────── STATE ─────────────
    const location = ref({
      site: {
        site_id: 1,
        site_name: 'PRINCIPAL',
        site_address: null,
        site_phone: null,
        site_business_hours: null,
        horario_semanal: null,
        wsp_link: null,
        city_id: 8,
        maps: null,
        show_on_web: true,
        email_address: null,
        status: false,
        comming_soon: false,
      },
      neigborhood: {
        name: '',
        delivery_price: null,
        neighborhood_id: null,
      },
    })

    const visibles = ref({
      currentSite: false,
      loading: false,
    })

    const current_delivery = ref(0)
    const status = ref('closed')

    // ───────────── ACTIONS ─────────────
    function setLocation(newLocation) {
      location.value = newLocation
    }

    async function setVisible(item, value) {
      if (item === 'loading') {
        visibles.value.loading = true

        if (!value) {
          setTimeout(() => {
            visibles.value.loading = false
          }, 500)
        } else {
          visibles.value.loading = value
        }
      } else {
        visibles.value[item] = value
      }
    }

    async function setNeighborhoodPrice() {
      const neighborhoodId = location.value?.neigborhood?.neighborhood_id
      if (!neighborhoodId) return null

      try {
        const res = await fetch(`${URI}/neighborhood/${neighborhoodId}/`)

        if (!res.ok) {
          console.error(
            'An error occurred while fetching the neighborhood:',
            res.status,
          )
          return null
        }

        const data = await res.json()
        location.value.neigborhood = data
        return data
      } catch (error) {
        console.error(
          'An error occurred while fetching the neighborhood:',
          error,
        )
        return null
      }
    }

    function setNeighborhoodPriceCero() {
      if (!location.value.neigborhood) return
      location.value.neigborhood.delivery_price = 0
    }

    // (equivalente a tu getter fucion: () => 0)
    function fucion() {
      return 0
    }

    // Lo que expones en el store
    return {
      // state
      location,
      visibles,
      current_delivery,
      status,

      // getters "a mano"
      fucion,

      // actions
      setLocation,
      setVisible,
      setNeighborhoodPrice,
      setNeighborhoodPriceCero,
    }
  },
  {
    // ───────────── PERSIST ─────────────
    persist: {
      key: 'sidte',
      paths: ['location'],
      // Si usas @pinia-plugin-persistedstate/nuxt,
      // puedes usar storage: persistedState.localStorage
      // storage: persistedState.localStorage,
    },
  },
)
