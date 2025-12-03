<template>
  <div class="finalizar-compra-container">
    <!-- MODAL SELECCIÓN DE SEDE / COBERTURA -->
    <div v-if="see_sites" class="modal-overlay">
      <div class="modal">
        <header class="modal-header">
          <h3 class="modal-title">{{ t('site_selector') }}</h3>
        </header>

        <section class="modal-body">
          <template v-if="!user.user.order_type || user.user.order_type.id !== 2">
            <div class="modal-body-inner">
              <!-- Autocomplete de direcciones -->
              <div class="form-group">
                <div class="autocomplete">
                  <input
                    type="text"
                    class="native-input"
                    v-model="addressQuery"
                    :placeholder="t('address_placeholder')"
                    @input="onAddressInput"
                    @focus="onAddressInput"
                  />
                  <ul
                    v-if="showAddressSuggestions && (dir_options.length || autocompleteError)"
                    class="autocomplete-list"
                  >
                    <li
                      v-for="item in dir_options"
                      :key="item.place_id"
                      class="autocomplete-item"
                      @click="onAddressSelect(item)"
                    >
                      <div class="autocomplete-item-text">
                        <span>{{ item.description }}</span>
                        <small class="autocomplete-item-sub">{{ item.place_id }}</small>
                      </div>
                    </li>
                    <li v-if="!dir_options.length && addressQuery" class="autocomplete-empty">
                      <small>No hay resultados</small>
                    </li>
                    <li v-if="autocompleteError" class="autocomplete-error">
                      <small>{{ autocompleteError.message || autocompleteError }}</small>
                    </li>
                  </ul>
                </div>
              </div>

              <!-- Estado de cobertura -->
              <span
                v-if="user.user.site?.delivery_cost_cop != null"
                class="tag"
                :class="user.user.site?.nearest?.in_coverage ? 'tag-success' : 'tag-danger'"
              >
                {{ user.user.site?.nearest?.in_coverage ? t('in_coverage') : t('not_in_coverage') }}
              </span>

              <!-- Error de cobertura -->
              <div
                v-if="user.user.site?.error"
                class="coverage-error-box"
              >
                <strong class="coverage-error-title">{{ t('coverage_error') }}:</strong>
                <div class="coverage-error-text">
                  {{ lang === 'en' ? user.user.site.error.message_en : user.user.site.error.message_es }}
                </div>
                <small class="coverage-error-code">(code: {{ user.user.site.error.code }})</small>
              </div>

              <span
                v-if="user.user.site?.distance_miles != null && user?.user?.site?.nearest?.site?.site_id != 36"
              >
                <strong>{{ t('distance') }}: </strong>
                {{ user.user.site?.distance_miles }} {{ t('km') }}
              </span>

              <span
                v-if="user.user.site?.nearest?.site?.site_name && user?.user?.site?.nearest?.site?.site_id != 36"
              >
                <strong>{{ t('ships_from_site') }}: </strong>
                {{ user.user.site?.nearest?.site?.site_name }}
              </span>

              <span
                v-if="user.user.site?.delivery_cost_cop != null"
                class="tag tag-success"
              >
                <strong>
                  {{ t('delivery_price') }}: {{ formatCOP(user.user.site?.delivery_cost_cop) }}
                </strong>
              </span>
            </div>
          </template>
        </section>

        <footer class="modal-footer">
          <button
            type="button"
            class="btn btn-ghost btn-danger"
            @click="() => { see_sites = false; user.user.site = {}; addressQuery = '' }"
          >
            {{ t('cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="save"
            :disabled="!user.user.site?.nearest?.in_coverage"
          >
            {{ t('save') }}
          </button>
        </footer>
      </div>
    </div>

    <!-- TÍTULO -->
    <p class="title">{{ t('finalize_purchase') }}</p>

    <div class="form-grid">
      <div class="form-column">
        <!-- Selector de tipos de orden -->
        <div
          class="sticky-wrapper"
          :style="!sticky ? 'top: 3.5rem;' : 'top: 0;'"
        >
          <div
            class="order-type-native"
            role="radiogroup"
            :aria-label="t('delivery_method')"
          >
            <label
              v-for="opt in get_order_types_for"
              :key="opt.id"
              class="order-type-pill"
              :class="{ 'is-active': orderTypeIdStr === String(opt.id) }"
            >
              <input
                type="radio"
                class="sr-only"
                name="order_type"
                :value="String(opt.id)"
                v-model="orderTypeIdStr"
              />
              <span>{{ user.lang.name === 'es' ? opt.name : opt.english_name }}</span>
            </label>
          </div>
        </div>

        <!-- Cupón de descuento -->
        <div class="coupon-header">
          <span>{{ t('code') }} <i class="pi pi-tag"></i></span>
          <input
            type="checkbox"
            v-model="have_discount"
          />
        </div>

        <div
          class="form-group coupon-row"
          v-if="have_discount"
        >
          <input
            type="text"
            class="native-input"
            :disabled="temp_code?.status === 'active'"
            :placeholder="t('code_placeholder')"
            v-model="temp_discount"
          />

          <button
            v-if="temp_code?.status === 'active'"
            type="button"
            class="btn-icon check"
          >
            ✓
          </button>

          <button
            v-if="temp_code?.status === 'active'"
            type="button"
            class="btn-icon btn-danger"
            @click="() => { temp_code = { status: null }; temp_discount = '' }"
          >
            🗑
          </button>

          <button
            v-else
            type="button"
            class="btn btn-primary"
            :disabled="!temp_discount"
            @click="validateDiscoun(temp_discount)"
          >
            Validar
          </button>
        </div>

        <span
          v-if="temp_code?.status && have_discount"
          class="tag"
          :class="temp_code?.status === 'active' ? 'tag-success' : 'tag-danger'"
        >
          {{ temp_code?.status === 'active' ? 'Codigo válido' : 'Codigo inválido' }}
        </span>

        <!-- Detalle del descuento -->
        <div
          v-if="temp_code?.status === 'active' && have_discount"
          class="discount-details"
        >
          <div class="discount-row">
            <span><b>Nombre</b></span>
            <span>{{ temp_code?.discount_name }}</span>
          </div>

          <div class="discount-row">
            <span><b>Tipo</b></span>
            <span>{{ temp_code?.type?.name }}</span>
          </div>

          <div class="discount-row">
            <span><b>Detalle</b></span>
            <span>{{ temp_code?.detail_type_id?.name }}</span>
          </div>

          <div
            v-if="temp_code?.end_date"
            class="discount-row"
          >
            <span><b>Finaliza</b></span>
            <span>{{ temp_code?.end_date || 'No finaliza' }}</span>
          </div>

          <div
            v-if="temp_code?.min_purchase"
            class="discount-row"
          >
            <span><b>Compra mínima</b></span>
            <span>{{ formatoPesosColombianos(temp_code?.min_purchase) || 'No aplica' }}</span>
          </div>

          <div
            v-if="temp_code?.amount"
            class="discount-row"
          >
            <span><b>Monto</b></span>
            <span>{{ formatoPesosColombianos(temp_code?.amount) || 'No aplica' }}</span>
          </div>

          <div
            v-if="temp_code?.percent"
            class="discount-row"
          >
            <span><b>Porcentaje</b></span>
            <span>{{ temp_code?.percent || 'No aplica' }}%</span>
          </div>
        </div>

        <!-- Nombre -->
        <span>{{ t('name') }}</span>
        <div class="form-group">
          <input
            id="username"
            type="text"
            class="native-input"
            :placeholder="t('name')"
            v-model="user.user.name"
          />
        </div>

        <!-- Ubicación / sede según tipo de orden -->
        <template v-if="!user.user.order_type || user.user.order_type.id !== 2">
          <span>Ubicación</span>
          <div class="form-group">
            <input
              type="text"
              class="native-input"
              @click="siteStore.setVisible('currentSite', true)"
              :value="siteStore?.location?.site?.site_name || ''"
              id="neighborhood"
              placeholder="Ubicación"
              readonly
            />
          </div>
        </template>

        <template v-if="!user.user.order_type || user.user.order_type.id !== 2">
          <span>{{ t('address') }}</span>
          <div class="form-group">
            <input
              type="text"
              class="native-input"
              v-model="user.user.address"
            />
          </div>
        </template>

        <template
          v-if="!user.user.order_type || user.user.order_type.id === 2"
        >
          <span>{{ t('site_recoger') }}</span>
          <div class="form-group pickup-group">
            <input
              type="text"
              class="native-input"
              @click="siteStore.setVisible('currentSiteSites', true)"
              :value="siteStore?.location?.site?.site_name || ''"
              id="neighborhood_pick"
              placeholder="Ubicación"
              readonly
            />
            <span class="tag">
              {{ siteStore?.location?.site?.site_address }}
            </span>
          </div>
        </template>

        <!-- Teléfono -->
        <span>{{ t('phone') }}</span>
        <div class="form-group phone-row">
          <!-- Selector de país -->
          <div class="country-select">
            <button
              type="button"
              class="country-selected"
              @click="toggleCountryDropdown"
            >
              <template v-if="user.user.phone_code">
                <img
                  :alt="user.user.phone_code.flag"
                  :src="user.user.phone_code.flag"
                  class="country-flag"
                />
                <span>{{ user.user.phone_code.dialCode }}</span>
              </template>
              <template v-else>
                <span class="country-placeholder">
                  {{ t('search_country_or_code') }}
                </span>
              </template>
            </button>

            <div
              v-if="showCountryDropdown"
              class="country-dropdown"
            >
              <input
                type="text"
                class="native-input country-search-input"
                v-model="countryQuery"
                :placeholder="t('search_country_or_code')"
                @input="onCountryInput"
              />
              <ul class="country-list">
                <li
                  v-for="option in countrySuggestions"
                  :key="option.code"
                  class="country-item"
                  @click="selectCountry(option)"
                >
                  <img
                    :alt="option.flag"
                    :src="option.flag"
                    class="country-flag"
                  />
                  <span>{{ option.name }} {{ option.dialCode }}</span>
                </li>
              </ul>
            </div>
          </div>

          <!-- Número -->
          <div class="phone-number">
            <input
              :disabled="!user.user.phone_code?.dialCode"
              type="tel"
              class="native-input"
              v-model="user.user.phone_number"
              id="phone_number"
              :placeholder="t('phone')"
              @blur="formatPhoneOnBlur"
            />
            <div
              v-if="phoneError"
              class="phone-error"
            >
              {{ phoneError }}
            </div>
          </div>
        </div>

        <!-- Correo -->
        <span>{{ t('email') }}</span>
        <div class="form-group">
          <input
            type="email"
            class="native-input"
            v-model="user.user.email"
            id="email"
            :placeholder="t('email')"
          />
        </div>

        <!-- Placa (drive thru) -->
        <template
          v-if="user?.user?.order_type && user?.user?.order_type?.id === 2 && [33, 35, 36].includes(siteStore.location?.site?.site_id)"
        >
          <span>{{ t('vehicle_plate') }}</span>
          <div class="form-group">
            <input
              type="text"
              class="native-input"
              v-model="user.user.placa"
              id="placa"
              :placeholder="t('vehicle_plate')"
            />
          </div>
        </template>

        <!-- Método de pago -->
        <span>{{ t('payment_method') }}</span>
        <div class="form-group">
          <select
            class="native-select"
            v-model="user.user.payment_method_option"
          >
            <option
              v-if="!computedPaymentOptions || !computedPaymentOptions.length"
              disabled
              value=""
            >
              {{ t('payment_method') }}
            </option>

            <option
              v-for="opt in computedPaymentOptions || []"
              :key="opt.id"
              :value="opt"
            >
              {{ lang === 'en' ? (opt.english_name || opt.name) : opt.name }}
            </option>
          </select>
        </div>

        <!-- Notas -->
        <span>{{ t('notes') }}</span>
        <textarea
          v-model="store.cart.order_notes"
          class="order-notes"
          :placeholder="t('additional_notes')"
        ></textarea>
      </div>

      <!-- RESUMEN -->
      <resumen
        class="resumen-column"
        style="margin: 0 .3rem; padding-top: .5rem;"
      />
    </div>
  </div>
</template>
<script setup>
import { ref, onMounted, watch, computed, onBeforeUnmount } from 'vue'
import resumen from '../resumen.vue'
import { usecartStore } from '#imports'
import { useSitesStore } from '#imports'
import { useUserStore } from '#imports'
import { URI } from '~/service/conection'
import { buildCountryOptions } from '~/service/utils/countries'
import { parsePhoneNumberFromString } from 'libphonenumber-js/min'
import { formatoPesosColombianos } from '~/service/utils/formatoPesos'

/* ================= STORES ================= */
const user = useUserStore()
const siteStore = useSitesStore()
const store = usecartStore()

/* ================= DESCUENTO ================= */
const temp_code = ref({ status: null })
const have_discount = ref(false)
const temp_discount = ref('')

/* ================= i18n ================= */
const lang = computed(() => {
  const v = (user?.lang?.name || 'es').toString().toLowerCase()
  return v === 'en' ? 'en' : 'es'
})

const DICT = {
  es: {
    site_selector: 'Seleccionar sede',
    address_placeholder: 'Escribe tu dirección',
    in_coverage: 'En cobertura',
    not_in_coverage: 'Fuera de cobertura',
    coverage_error: 'Error de cobertura',
    distance: 'Distancia',
    miles: 'Millas',
    km: 'km',
    ships_from_site: 'Sale de la sede',
    delivery_price: 'Costo de envío',
    cancel: 'Cancelar',
    save: 'Guardar',
    finalize_purchase: 'Finalizar compra',
    name: 'Nombre',
    code: '¿Tienes un cupón de descuento?',
    address: 'Dirección',
    phone: 'Teléfono',
    email: 'Correo electrónico',
    vehicle_plate: 'Placa de tu vehículo',
    payment_method: 'Método de pago',
    notes: 'Notas',
    additional_notes: 'Notas adicionales',
    delivery_method: 'Método de entrega',
    site_recoger: 'Sede donde vas a recoger',
    code_placeholder: 'Ingresa tu código',
    search_country_or_code: 'Buscar país o código (+57, 57, US, +1 929)...'
  },
  en: {
    site_selector: 'Site selector',
    address_placeholder: 'Type your address',
    in_coverage: 'In coverage',
    not_in_coverage: 'Out of coverage',
    coverage_error: 'Coverage error',
    distance: 'Distance',
    miles: 'Miles',
    code: 'Do you have a discount coupon?',
    code_placeholder: 'Enter your code',
    km: 'km',
    ships_from_site: 'Ships from',
    delivery_price: 'Delivery price',
    cancel: 'Cancel',
    save: 'Save',
    finalize_purchase: 'Checkout',
    name: 'Name',
    address: 'Address',
    site_recoger: 'Pick-up place',
    phone: 'Phone',
    email: 'Email',
    vehicle_plate: 'Vehicle plate',
    payment_method: 'Payment method',
    notes: 'Notes',
    additional_notes: 'Additional notes',
    delivery_method: 'Delivery method',
    search_country_or_code: 'Search country or code (+57, 57, US, +1 929)...'
  }
}
const t = (key) => (DICT[lang.value]?.[key]) ?? DICT.es[key] ?? key

const formatCOP = (v) => {
  try {
    return new Intl.NumberFormat(
      lang.value === 'en' ? 'en-CO' : 'es-CO',
      { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }
    ).format(Number(v || 0))
  } catch {
    return `COP ${Number(v || 0).toLocaleString()}`
  }
}

/* Helper fetch simple */
const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, options)
  if (!res.ok) {
    console.error('HTTP error', res.status, 'en', url)
    throw new Error(`HTTP ${res.status}`)
  }
  return await res.json()
}

/* =============== Sticky header =============== */
const lastScrollY = ref(0)
const sticky = ref(false)
const handleScroll = () => {
  const currentScroll = window.scrollY
  if (currentScroll > lastScrollY.value) sticky.value = true
  else if (currentScroll < lastScrollY.value) sticky.value = false
  lastScrollY.value = currentScroll
}
onMounted(() => {
  if (typeof window !== 'undefined') {
    lastScrollY.value = window.scrollY
    window.addEventListener('scroll', handleScroll)
  }
})
onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', handleScroll)
  }
})

/* =============== Catálogos / reglas =============== */
const order_types_catalog = ref([])
const payment_method_catalog = ref([])
const sitePaymentsComplete = ref([])
const sites = ref([])

const DEFAULT_ORDER_TYPES = Object.freeze([
  { id: 3, name: 'Enviar a domicilio', english_name: 'Delivery' },
  { id: 2, name: 'Recoger', english_name: 'Pickup' }
])

/* =============== Países / teléfono =============== */
const countries = ref([])
const countrySuggestions = ref([])
const countryQuery = ref('')
const showCountryDropdown = ref(false)

const norm = (s) => (s || '').toString().trim().toLowerCase()
const onlyDigits = (s) => (s || '').replace(/\D+/g, '')
const toFlagEmoji = (iso2) => {
  if (!iso2) return '🏳️'
  return iso2
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join('')
}

const countryComplete = (e) => {
  const q = (e?.query ?? '')
  const qNorm = norm(q)
  const qDigits = onlyDigits(q)

  if (!qNorm) {
    countrySuggestions.value = countries.value.slice(0, 25)
    return
  }

  let list = countries.value.filter((c) => {
    const name = norm(c.name)
    const iso = norm(c.code)
    const dialDigits = c.dialDigits
    if (name.includes(qNorm) || iso.includes(qNorm)) return true
    if (!qDigits) return false
    if (dialDigits.startsWith(qDigits) || qDigits.startsWith(dialDigits)) return true
    return false
  })

  countrySuggestions.value = list
    .filter((o) => o && typeof o === 'object' && typeof o.name === 'string')
    .slice(0, 50)
}

const toggleCountryDropdown = () => {
  showCountryDropdown.value = !showCountryDropdown.value
  if (showCountryDropdown.value) {
    countrySuggestions.value = countries.value.slice(0, 25)
  }
}

const onCountryInput = () => {
  countryComplete({ query: countryQuery.value })
}

const selectCountry = (option) => {
  user.user.phone_code = option
  showCountryDropdown.value = false
  countryQuery.value = ''
}

/* =============== Dirección (autocomplete / coverage) =============== */
const see_sites = ref(false)
const uri_api_google = 'https://api.stripe.salchimonster.com'
const addressQuery = ref('')
const dir_options = ref([])
const sessionToken = ref(null)
const autocompleteError = ref(null)
const showAddressSuggestions = ref(false)

const maxSuggestions = 5

const newSession = () => {
  sessionToken.value =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`
}
const endSession = () => { sessionToken.value = null }

const searchAddress = async (query) => {
  const q = (query || '').trim()
  if (!q) {
    dir_options.value = []
    autocompleteError.value = null
    return
  }
  if (!sessionToken.value) newSession()

  const params = new URLSearchParams({
    input: q,
    session_token: sessionToken.value,
    language: lang.value,
    limit: String(maxSuggestions)
  })

  try {
    const url = `${uri_api_google}/co/places/autocomplete?${params.toString()}`
    const res = await apiFetch(url)
    const predictions = Array.isArray(res)
      ? res
      : Array.isArray(res?.predictions)
        ? res.predictions
        : []
    dir_options.value = predictions.filter((p) => p?.description && p?.place_id)
    autocompleteError.value = (res && !Array.isArray(res) && res.error) ? res.error : null
  } catch (err) {
    console.error('Autocomplete error:', err)
    dir_options.value = []
    autocompleteError.value = null
  }
}

const onAddressInput = async () => {
  showAddressSuggestions.value = true
  await searchAddress(addressQuery.value)
}

const onAddressSelect = async (item) => {
  if (!item?.place_id) return
  autocompleteError.value = null
  user.user.place_id = item.place_id
  try {
    const params = new URLSearchParams({
      place_id: item.place_id,
      session_token: sessionToken.value || '',
      language: lang.value
    })
    const url = `${uri_api_google}/co/places/coverage-details?${params.toString()}`
    const details = await apiFetch(url)

    user.user.site = details || {}
    user.user.site.description = details?.formatted_address || item.description
    user.user.lat = details?.lat || null
    user.user.lng = details?.lng || null
    store.address_details = details
    addressQuery.value = user.user.site.description || item.description
    autocompleteError.value = details?.error || null

    if (details?.delivery_cost_cop != null) {
      siteStore.location.neigborhood.delivery_price = details.delivery_cost_cop
    } else {
      siteStore.location.neigborhood.delivery_price = null
    }

    ensureValidOrderTypeForCurrentSite()
  } catch (err) {
    console.error('Coverage Details error:', err)
    user.user.address = item.description
    user.user.site = {}
  } finally {
    endSession()
    showAddressSuggestions.value = false
  }
}

/* =============== Teléfono: validación y formateo =============== */
const phoneError = ref(null)

const formatPhoneOnBlur = () => {
  const countryIso = user.user.phone_code?.code || undefined
  const phone = parsePhoneNumberFromString(user.user.phone_number || '', countryIso)
  if (phone && phone.isValid()) {
    user.user.phone_number = phone.formatNational()
  }
}

watch(
  [() => user.user.phone_number, () => user.user.phone_code],
  ([num, country]) => {
    phoneError.value = null
    const raw = (num || '').toString().trim()
    if (!raw) {
      user.user.phone_e164 = null
      return
    }
    const countryIso = country?.code || undefined
    const phone = parsePhoneNumberFromString(raw, countryIso)
    if (phone && phone.isValid()) {
      user.user.phone_e164 = phone.number
    } else {
      user.user.phone_e164 = null
      phoneError.value =
        lang.value === 'en'
          ? 'Invalid phone number for selected country.'
          : 'Número inválido para el país seleccionado.'
    }
  },
  { immediate: true }
)

/* =============== Control de tipos de orden / métodos por sede =============== */
const orderTypeIdStr = computed({
  get: () => (user.user.order_type?.id != null ? String(user.user.order_type.id) : null),
  set: (idStr) => {
    const id = Number(idStr)
    const opt = computedOrderTypesVisible.value.find((o) => o.id === id) || null
    user.user.order_type = opt
  }
})

const getEntryForSite = (site_id) => {
  const idStr = String(site_id ?? '')
  if (!idStr) return null
  const entry = sitePaymentsComplete.value.find((s) => String(s.site_id) === idStr)
  return entry || null
}

const docMethodsFor = (site_id, order_type_id) => {
  const entry = getEntryForSite(site_id)
  if (!entry || !Array.isArray(entry.order_types)) return []
  const ot = entry.order_types.find((o) => Number(o.id) === Number(order_type_id))
  if (!ot || !Array.isArray(ot.methods)) return []
  return ot.methods
    .map((m) => (m && typeof m === 'object' ? m : { id: m }))
    .filter((x) => x?.id != null)
}

const getPaymentOptionsFor = (site_id, order_type_id) => {
  const raw = docMethodsFor(site_id, order_type_id)
  let methods = raw.map((m) => {
    const pm = payment_method_catalog.value.find((p) => p.id === m.id)
    return {
      id: m.id,
      name: m.name ?? pm?.name ?? `M ${m.id}`,
      english_name: m.english_name ?? pm?.english_name ?? null,
      icon: m.icon ?? pm?.icon ?? pm?.icon_class ?? null,
      code: m.code ?? pm?.code ?? pm?.slug ?? null
    }
  })
  if (Number(order_type_id) === 3) {
    methods = methods.filter((m) => m.id !== 8)
  }
  return methods
}

const computedOrderTypesVisible = computed(() => {
  const currentSiteId = siteStore.location?.site?.site_id
  const entry = getEntryForSite(currentSiteId)
    
  const base = entry && Array.isArray(entry.order_types) && entry.order_types.length
    ? entry.order_types.map((ot) => ({
      id: Number(ot.id),
      name:
        ot.name ??
        (order_types_catalog.value.find((o) => o.id === Number(ot.id))?.name ?? `OT ${ot.id}`),
      english_name: ot.english_name ?? null
    }))
    : DEFAULT_ORDER_TYPES

  return base
    .filter((ot) => [1, 2, 3].includes(ot.id))
    .filter((ot) => getPaymentOptionsFor(currentSiteId, ot.id).length > 0)
})

const get_order_types_for = computed(() => {
  const siteId = siteStore.location?.site?.site_id
  if (!siteId) return []

  const entry = sitePaymentsComplete.value?.find(
    (s) => String(s.site_id) === String(siteId)
  )

  const valid_order_types = entry?.order_types?.filter((o) => o.methods?.length > 0)
  return valid_order_types || []
})

const computedPaymentOptions = computed(() => {
  const data = get_order_types_for.value.find(
    (o) => String(o.id) === String(orderTypeIdStr.value)
  )
  return data?.methods || []
})

watch(get_order_types_for, (newval) => {
  if (newval?.length === 1) {
    user.user.payment_method_option = newval[0]
  }
})

const ensureValidOrderTypeForCurrentSite = () => {
  const list = computedOrderTypesVisible.value
  const selectedId = user.user.order_type?.id
  const stillValid = list.some((o) => o.id === Number(selectedId))
  if (!stillValid) {
    const prefer = list.find((o) => o.id === 3) || list[0] || null
    user.user.order_type = prefer
  }
}

/* =============== Guardado del modal de sedes =============== */
const save = () => {
  see_sites.value = false
  siteStore.location.site = user.user.site?.nearest?.site
  siteStore.location.neigborhood.delivery_price = user.user.site?.delivery_cost_cop ?? null
  ensureValidOrderTypeForCurrentSite()
}

/* ================== Descuentos ================== */
const validateDiscoun = async (code) => {
  if (!siteStore.location.site) {
    alert('Por favor selecciona una sede para validar tu descuento')
    return
  }

  // aquí sí usamos useFetch como querías
  const { data } = await useFetch(`${URI}/discount/get-discount-by-code/${code}`, {
    server: false
  })

  const discount = data.value
  if (discount) {
    if (!discount.sites.some((s) => s.site_id === siteStore.location.site.site_id)) {
      const site_names = discount.sites.map((s) => s.site_name).join(', ')
      alert(`El código solo es válido para las siguientes sedes: ${site_names}`)
      temp_code.value.status = 'no_site'
      return
    }
    temp_code.value = discount
  } else {
    temp_code.value.status = 'no_code'
  }
}

/* ================== Montaje ================== */
onMounted(async () => {
  // Países
  countries.value = buildCountryOptions(lang.value).map((c) => ({
    ...c,
    dialDigits: (c.dialCode || '').replace(/\D+/g, ''),
    flag: `https://flagcdn.com/h20/${c.code.toLowerCase()}.png`,
    flagEmoji: toFlagEmoji(c.code),
    _imgError: false
  }))
  countrySuggestions.value = countries.value.slice(0, 25)

  const bySite = siteStore.location?.site?.country_code?.toUpperCase?.()
  const defIso =
    bySite && countries.value.some((c) => c.code === bySite)
      ? bySite
      : (lang.value === 'en' ? 'US' : 'CO')

  if (typeof user.user.phone_code === 'string') {
    const raw = user.user.phone_code.trim().toLowerCase()
    let found = countries.value.find((c) => c.code.toLowerCase() === raw)
    if (!found) found = countries.value.find((c) => c.name.toLowerCase() === raw)
    if (!found) found = countries.value.find((c) => c.dialDigits === raw.replace(/\D+/g, ''))
    user.user.phone_code = found || null
  }
  if (!user.user.phone_code) {
    user.user.phone_code = countries.value.find((c) => c.code === defIso) || null
  }

  // Cargas iniciales con fetch nativo
  try {
    const [sitesData, paymentMethodsData, orderTypesData, sitePaymentsData] = await Promise.all([
      apiFetch(`${URI}/sites`),
      apiFetch(`${URI}/payment_methods`),
      apiFetch(`${URI}/get_all_order_types`),
      apiFetch(`${URI}/site-payments-complete`)
    ])

    sites.value = sitesData || []
    payment_method_catalog.value = paymentMethodsData || []
    order_types_catalog.value = orderTypesData || []
    sitePaymentsComplete.value = sitePaymentsData || []
  } catch (err) {
    console.error('Error cargando catálogos:', err)
  }

  // Tipo de orden por defecto
  if (!user.user.order_type?.id) {
    const list = computedOrderTypesVisible.value
    user.user.order_type = list.find((o) => o.id === 3) || list[0] || null
  }

  // Sincronizar precio de envío
  if (user.user.site?.delivery_cost_cop && user?.user?.order_type?.id === 3) {
    siteStore.location.neigborhood.delivery_price = user.user.site?.delivery_cost_cop
  }
})

/* Reaccionar a cambios de idioma para el selector de país */
watch(lang, (new_val) => {
  const prev = user.user.phone_code?.code
  countries.value = buildCountryOptions(new_val).map((c) => ({
    ...c,
    dialDigits: (c.dialCode || '').replace(/\D+/g, ''),
    flag: `https://flagcdn.com/h20/${c.code.toLowerCase()}.png`,
    flagEmoji: toFlagEmoji(c.code),
    _imgError: false
  }))
  countrySuggestions.value = countries.value.slice(0, 25)
  user.user.phone_code =
    countries.value.find((c) => c.code === prev) ||
    countries.value.find((c) => c.code === (new_val === 'en' ? 'US' : 'CO'))
})

/* Si cambia el tipo de orden, ajusta delivery price y valida método de pago */
watch(
  () => user.user.order_type,
  (new_val) => {
    if (new_val?.id === 2) {
      siteStore.location.neigborhood.delivery_price = 0
    } else {
      if (user.user.site?.delivery_cost_cop != null) {
        siteStore.location.neigborhood.delivery_price = user.user.site.delivery_cost_cop
      } else if (siteStore?.delivery_price > 0) {
        siteStore.location.neigborhood.delivery_price = siteStore.delivery_price
      } else {
        siteStore.setVisible('currentSite', true)
      }
    }

    const methods = computedPaymentOptions.value || []
    const ids = new Set(methods.map((m) => m.id))
    if (!ids.has(user.user?.payment_method_option?.id)) {
      user.user.payment_method_option = null
    }
  }
)

/* Si cambia la sede, revalida tipo y método de pago */
watch(
  () => siteStore.location?.site?.site_id,
  () => {
    ensureValidOrderTypeForCurrentSite()
    const methods = computedPaymentOptions.value || []
    const ids = new Set(methods.map((m) => m.id))
    if (!ids.has(user.user?.payment_method_option?.id)) {
      user.user.payment_method_option = null
    }
  }
)
</script>


<style scoped>
.finalizar-compra-container {
  padding: 0;
  padding-bottom: 2rem;
}

.title {
  text-align: center;
  font-size: 2rem;
  margin: 2rem 0;
  font-weight: bold;
}

.sticky-wrapper {
  position: sticky;
  background-color: #f8f4fc;
  transition: all 0.3s ease;
  z-index: 5;
  margin-bottom: 0;
  padding-top: 0.5rem;
}

.order-type-native {
  display: flex;
  z-index: 10;
  transition: all ease 0.3s;
  width: 100%;
  background-color: white;
  border: 1px solid #000;
  border-radius: 0.5rem;
  overflow: hidden;
}

.order-type-pill {
  flex: 1 1 0;
  display: grid;
  place-items: center;
  padding: 0.6rem 1rem;
  background: #fff !important;
  color: #000 !important;
  border-radius: 0.5rem;
  cursor: pointer;
  border: none;
}

.order-type-pill + .order-type-pill {
  border-left: 1px solid #000;
  border: none;
}

.order-type-pill.is-active {
  background: #000 !important;
  color: #fff !important;
  border: none;
}

.order-type-pill:focus-within {
  outline: 2px solid rgba(231, 41, 41, 0.25);
  outline-offset: 2px;
  border: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  border: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

/* Grid principal */
.form-grid {
  display: grid;
  max-width: 1024px;
  margin: 0 auto;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 768px) {
  .form-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.form-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.form-group {
  display: flex;
  /* flex-direction: column; */
  gap: 0.25rem;
}

/* Inputs nativos */
.native-input,
.native-select,
.order-notes {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #ccc;
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background-color: #fff;
}

.native-input:focus,
.native-select:focus,
.order-notes:focus {
  border-color: #000;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
}

.order-notes {
  height: 8rem;
  resize: none;
}

/* Teléfono */
.phone-row {
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
}

.phone-number {
  flex: 1 1 auto;
}

.phone-error {
  color: #b00020;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}

/* Selector de país */
.country-select {
  position: relative;
  width: max-content;
  min-width: 5rem;
  height: 100%;
}

.country-selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border-radius: 0.5rem;
  border: 1px solid #ccc;
  background: #fff;
  height: 100%;
  cursor: pointer;
  min-width: 5.5rem;
}

.country-flag {
  width: 20px;
  height: 14px;
  object-fit: cover;
  border-radius: 2px;
}

.country-placeholder {
  font-size: 0.8rem;
  opacity: 0.7;
}

.country-dropdown {
  position: absolute;
  top: 110%;
  left: 0;
  width: 240px;
  max-height: 260px;
  background: #fff;
  border-radius: 0.5rem;
  border: 1px solid #ddd;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  padding: 0.5rem;
  z-index: 20;
}

.country-search-input {
  margin-bottom: 0.5rem;
}

.country-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 200px;
  overflow-y: auto;
}

.country-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.3rem;
  cursor: pointer;
  border-radius: 0.35rem;
  font-size: 0.9rem;
}

.country-item:hover {
  background-color: #f3f4f6;
}

/* Autocomplete direcciones */
.autocomplete {
  position: relative;
  width: 100%;
}

.autocomplete-list {
  position: absolute;
  top: 110%;
  left: 0;
  width: 100%;
  max-height: 280px;
  background: #fff;
  border-radius: 0.5rem;
  border: 1px solid #ddd;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  padding: 0.25rem 0;
  z-index: 30;
}

.autocomplete-item {
  padding: 0.35rem 0.6rem;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
}

.autocomplete-item:hover {
  background-color: #f3f4f6;
}

.autocomplete-item-text {
  display: flex;
  flex-direction: column;
}

.autocomplete-item-sub {
  opacity: 0.7;
  font-size: 0.75rem;
}

.autocomplete-empty,
.autocomplete-error {
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

/* Tags */
.tag {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: .3rem;
  font-size: 0.8rem;
  background-color: #e5e7eb;
  color: #111827;
  width: max-content;
}

.tag-success {
  background-color: #dcfce7;
  color: #166534;
}

.tag-danger {
  background-color: #fee2e2;
  color: #991b1b;
}

/* Botones */
.btn {
  border-radius: 0.5rem;
  padding: 0.45rem 0.9rem;
  font-size: 0.9rem;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.btn-primary {
  background-color: #000;
  color: #fff;
}

.btn-primary:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-ghost {
  background: transparent;
  border: 1px solid #e5e7eb;
}

.btn-danger {
  color: #b91c1c;
  border-color: #fecaca;
}

.btn-icon {
  border-radius: .3rem;
  border: 1px solid #ccc;
  background: #fff;
  width: 2.5rem;
  height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  cursor: pointer;
}

.btn-icon.btn-danger {
  border-color: #fecaca;
  color: #b91c1c;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  z-index: 50;
}

.modal {
  width: 100%;
  max-width: 30rem;
  border-radius: 0.75rem;
  background: #fff;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.modal-body {
  padding: 0.75rem 1rem;
  overflow-y: auto;
}

.modal-body-inner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.modal-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* Cupón */
.coupon-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.coupon-row {
  display: flex;
  gap: 0.5rem;
}

/* Detalle descuento */
.discount-details {
  display: flex;
  flex-direction: column;
  background-color: #dcfce7;
  padding: 0.5rem;
  max-width: 30rem;
  gap: 0.25rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}

.discount-row {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
}

/* Pickup group */
.pickup-group {
  align-items: flex-start;
  justify-content: flex-start;
  gap: 0.25rem;
}

/* Coverage error box */
.coverage-error-box {
  border: 1px solid #ff6b6b;
  border-radius: 0.5rem;
  background: #fff0f0;
  padding: 1rem;
}

.coverage-error-title {
  color: #b00020;
}

.coverage-error-text {
  margin-top: 0.25rem;
}

.coverage-error-code {
  opacity: 0.8;
}

/* Scrollbar demo */
::-webkit-scrollbar {
  width: 1rem;
}

::-webkit-scrollbar-thumb {
  background-color: rgb(255, 0, 0);
  border-radius: 9px;
  border: 5px solid var(--primary-color);
  height: 10rem;
  width: 10rem;
}

/* Animación botón check */
@keyframes scaler {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.check {
  animation: scaler 0.5s ease infinite;
}

/* ========== COUNTRY DROPDOWN (CÓDIGO + BANDERA) ========== */

.country-select {
  position: relative;
  min-width: 7rem;
  height: 100%;
}

.country-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  padding: 0.45rem 0.8rem;
  border-radius: .3rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  height: 100%;
  cursor: pointer;
  min-width: 6rem;
  font-size: 0.85rem;
  transition: background-color 0.15s ease, border-color 0.15s ease,
    box-shadow 0.15s ease, transform 0.1s ease;
}

.country-selected:hover {
  background-color: #f3f4f6;
  border-color: #d1d5db;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.country-selected:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
}

.country-selected::after {
  content: '⌵';
  font-size: 0.7rem;
  opacity: 0.7;
  margin-left: 0.25rem;
}

/* Bandera un poco más cuidada */
.country-flag {
  width: 18px;
  height: 13px;
  object-fit: cover;
  border-radius: 3px;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.08);
}

/* Texto placeholder más discreto */
.country-placeholder {
  font-size: 0.8rem;
  opacity: 0.6;
}

/* Contenedor del dropdown */
.country-dropdown {
  position: absolute;
  top: 115%;
  left: 0;
  width: 260px;
  max-height: 280px;
  background: #ffffff;
  border-radius: 0.9rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 35px rgba(15, 23, 42, 0.18);
  padding: 0.65rem;
  z-index: 40;
  animation: dropdown-fade 0.16s ease-out;
}

/* Animación sutil de aparición */
@keyframes dropdown-fade {
  0% {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Input de búsqueda dentro del dropdown */
.country-search-input {
  margin-bottom: 0.4rem;
  font-size: 0.85rem;
  padding: 0.45rem 0.7rem;
  border-radius: .3rem;
  background-color: #f3f4f6;
  border-color: #e5e7eb;
}

.country-search-input:focus {
  border-color: #111827;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.15);
}

/* Lista de países */
.country-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 210px;
  overflow-y: auto;
}

/* Scrollbar del dropdown de países */
.country-list::-webkit-scrollbar {
  width: 6px;
}

.country-list::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: .3rem;
}

/* Cada opción de país */
.country-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.45rem;
  cursor: pointer;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  transition: background-color 0.12s ease, transform 0.08s ease;
}

.country-item span {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.country-item:hover {
  background-color: #f3f4f6;
  transform: translateY(-1px);
}

/* ========== SELECT NATIVO (MÉTODO DE PAGO) ========== */

.native-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  position: relative;
  background-color: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  padding: 0.55rem 2.2rem 0.55rem 0.75rem;
  font-size: 0.95rem;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease,
    background-color 0.15s ease;
}

/* Flechita decorativa del select nativo */
.native-select {
  background-image: linear-gradient(45deg, transparent 50%, #6b7280 50%),
    linear-gradient(135deg, #6b7280 50%, transparent 50%);
  background-position: calc(100% - 1.1rem) 48%, calc(100% - 0.8rem) 48%;
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.native-select:focus {
  outline: none;
  border-color: #111827;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.15);
  background-color: #ffffff;
}

/* Que no se pegue tanto a los bordes en mobile */
@media (max-width: 640px) {
  .native-select {
    font-size: 0.9rem;
  }
}

</style>
