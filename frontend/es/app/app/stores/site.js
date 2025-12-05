// /stores/site.js o /stores/sites.js
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { URI } from '../service/conection'

export const useSitesStore = defineStore(
  'site-d3sdd422',
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

    // 🔥 Status completo de la sede actual (sin tipos TS)
    const status = ref({
      status: 'unknown',          // 'open' | 'closed' | 'unknown'
      next_opening_time: null,    // string o null
      networks: null,             // array, objeto o null
    })

    let statusTimer = null

    // ───────────── ACTIONS ─────────────
    function setLocation(newLocation) {
      location.value = newLocation
      visibles.value.currentSite = true
      // el watcher de site_id se encarga de pedir el status
    }

    function setVisible(item, value) {
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

    function fucion() {
      return 0
    }

    // ───────────── STATUS DE LA SEDE ACTUAL ─────────────
    async function fetchSiteStatus(explicitSiteId) {
      const siteId =
        explicitSiteId ||
        (location.value?.site?.site_id ? location.value.site.site_id : null)

      if (!siteId) return

      try {
        const res = await fetch(`${URI}/site/${siteId}/status`)
        if (!res.ok) {
          throw new Error(`Error HTTP ${res.status}`)
        }

        const data = await res.json()
        // data esperado: { status: "open" | "closed" | "close", next_opening_time, networks }

        const raw = data.status || 'unknown'
        let normalized = 'unknown'
        if (raw === 'open') normalized = 'open'
        else if (raw === 'closed' || raw === 'close') normalized = 'closed'

        status.value = {
          status: normalized,
          next_opening_time: data.next_opening_time || null,
          networks: data.networks || status.value.networks || null,
        }
      } catch (err) {
        console.error('Error al obtener el status de la sede:', err)
        status.value = {
          status: 'unknown',
          next_opening_time: null,
          networks: status.value.networks || null,
        }
      }
    }

    function initStatusWatcher() {
      if (statusTimer) return

      // primera llamada
      fetchSiteStatus()

      statusTimer = setInterval(() => {
        fetchSiteStatus()
      }, 30000)
    }

    // cuando cambie el site_id → pedir status nuevo
    watch(
      () => location.value?.site?.site_id,
      (newId, oldId) => {
        if (!newId || newId === oldId) return
        fetchSiteStatus(newId)
      },
      { immediate: true },
    )

    return {
      // state
      location,
      visibles,
      current_delivery,
      status,

      // getters manuales
      fucion,

      // actions
      setLocation,
      setVisible,
      setNeighborhoodPrice,
      setNeighborhoodPriceCero,
      fetchSiteStatus,
      initStatusWatcher,
    }
  },
  {
    persist: {
      key: 'sidtest',
      paths: ['location'], // status no se persiste, siempre fresco
    },
  },
)
