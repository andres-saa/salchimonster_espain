<template>
  <div class="summary-wrapper">
    <div class="summary-card">
      <div class="card-header">
        <h5 class="title">Resumen</h5>
      </div>

      <div class="product-list">
        <div 
          v-for="product in store.cart" 
          :key="product.productogeneral_id" 
          class="product-item"
        >
          <div class="product-main-row">
            <div class="product-info">
              <span class="qty-badge">( {{ product.pedido_cantidad }} )</span>
              <span class="product-name">
                {{ formatName(product.pedido_nombre_producto) }}
              </span>
            </div>
            
            <div class="product-price">
              <span v-if="product.modificadorseleccionList.length < 1">
                {{ formatoPesosColombianos(product.pedido_precio * product.pedido_cantidad) }}
              </span>
              <span v-else>
                {{ formatoPesosColombianos(product.pedido_base_price * product.pedido_cantidad) }}
              </span>
            </div>
          </div>

          <div 
            v-if="product.lista_productocombo && product.lista_productocombo.length > 0"
            class="combo-list"
          >
            <div 
              v-for="comboItem in product.lista_productocombo" 
              :key="comboItem.producto_id"
              class="combo-item"
            >
              <span class="combo-qty">( {{ product.pedido_cantidad }} ) <b>{{ parseInt(comboItem.pedido_cantidad) }}</b></span>
              <span class="combo-name">{{ formatName(comboItem.pedido_nombre) }}</span>
            </div>
          </div>

          <div 
            v-if="product.modificadorseleccionList && product.modificadorseleccionList.length > 0"
            class="additions-list"
          >
            <div 
              v-for="item in product.modificadorseleccionList" 
              :key="item.modificadorseleccion_id || item.modificadorseleccion_nombre"
              class="addition-row"
            >
              <div class="addition-name">
                - ( {{ product.pedido_cantidad }} ) <b>{{ item.modificadorseleccion_cantidad }}</b> {{ formatName(item.modificadorseleccion_nombre) }}
              </div>
              <div v-if="item.pedido_precio > 0" class="addition-price">
                {{ formatoPesosColombianos(item.pedido_precio * item.modificadorseleccion_cantidad * product.pedido_cantidad) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="summary-totals">
        <div class="total-row">
          <span class="label">Subtotal</span>
          <span class="value">{{ formatoPesosColombianos(store.cartSubtotal) }}</span>
        </div>

        <div class="total-row" v-if="store.cartTotalDiscount > 0">
          <span class="label discount">Descuento</span>
          <span class="value discount">- {{ formatoPesosColombianos(store.cartTotalDiscount) }}</span>
        </div>

        <div class="total-row" v-if="siteStore?.location?.site?.site_id != 33">
          <span class="label" :class="{ 'strike': siteStore.location.neigborhood.delivery_price == 0 }">
            Domicilio
          </span>
          
          <span class="value">
            <template v-if="siteStore.location.neigborhood.delivery_price === 0">
               <span class="free-delivery">
                 {{ route.path.includes('reservas') ? 'Ir a la sede' : 'Recoger en local' }}
               </span>
            </template>
            <template v-else-if="siteStore.location.neigborhood.delivery_price > 0">
              {{ formatoPesosColombianos(siteStore.location.neigborhood.delivery_price) }}
            </template>
          </span>
        </div>

        <div class="total-row final-total">
          <span class="label">Total</span>
          <span class="value">
            {{ 
              formatoPesosColombianos(
                store.cartTotal + (siteStore.location.neigborhood.delivery_price || 0)
              ) 
            }}
          </span>
        </div>
      </div>

      <div class="actions-container">
        
        <div v-if="siteStore.status?.status == 'closed' && route.path != '/reservas'" class="closed-alert">
          <i class="pi pi-clock"></i> Cerrado, abre a las {{ siteStore.status.next_opening_time }}
        </div>

        <div class="buttons-stack">

            <NuxtLink to="/" v-if="route.path.includes('cart')" class="link-wrapper">
                <button type="button" class="btn btn-text">
                    Volver al menú
                </button>
            </NuxtLink>

            <NuxtLink to="/cart" v-else-if="route.path != '/reservas'" class="link-wrapper">
                <button type="button" class="btn btn-text">
                    Volver al carrito
                </button>
            </NuxtLink>

            <NuxtLink 
                to="/pay" 
                v-if="route.path.includes('cart') && (siteStore.status?.status !== 'closed' && route.path == '/reservas')"
                class="link-wrapper"
            >
                <button type="button" class="btn btn-primary">
                    Pedir
                </button>
            </NuxtLink>

            <NuxtLink to="/pay" v-else-if="route.path == '/cart'" class="link-wrapper">
                <button type="button" class="btn btn-primary">
                    Finalizar pedido
                </button>
            </NuxtLink>

            <button
                v-else-if="route.path == '/pay' && !reportes.loading.visible && siteStore.status?.status !== 'closed' && user.user.payment_method_option?.id != 9"
                type="button"
                class="btn btn-primary"
                :disabled="reportes.loading.visible"
                @click="orderService.sendOrder()"
            >
                <span v-if="reportes.loading.visible">Procesando...</span>
                <span v-else>Finalizar pedido</span>
            </button>

            <button
                v-else-if="route.path == '/pay' && !reportes.loading.visible && siteStore.status?.status !== 'closed' && user.user.payment_method_option?.id == 9"
                type="button"
                class="btn btn-primary"
                :disabled="reportes.loading.visible"
                @click="pay"
            >
                <span v-if="reportes.loading.visible">Procesando...</span>
                <span v-else>Pagar con tarjeta</span>
            </button>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute } from '#imports'
import { formatoPesosColombianos } from '~/service/utils/formatoPesos'
import { usecartStore, useSitesStore, useUserStore, useReportesStore } from '#imports'
import { orderService } from '@/service/order/orderService.ts'
import { orderServiceEpayco } from '@/service/order/orderServiceEpayco'
import { URI, SELF_URI } from '@/service/conection'

const reportes = useReportesStore()
const route = useRoute()
const store = usecartStore()
const siteStore = useSitesStore()
const user = useUserStore()
const order_id = ref('')
const epaycoPublicKey = import.meta.env.VITE_EPAYCO_PUBLIC_KEY

// Función para capitalizar solo la primera letra (Sentence case)
const formatName = (str) => {
  if (!str) return ''
  const lower = str.toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

onMounted(() => {
  if (user.user.payment_method_option?.id != 7 && !route.path.includes('reservas')) {
    siteStore.setNeighborhoodPrice()
  } else {
    siteStore.setNeighborhoodPriceCero()
  }
})

// Observador para actualizar cambios en adiciones
watch(() => store.cart.additions, () => {}, { deep: true })

const pay = async () => {
  order_id.value = await orderServiceEpayco.sendOrder()
  if (!order_id.value) return
  payWithEpayco(order_id.value)
}

const payWithEpayco = (id) => {
  if (typeof window === 'undefined' || !window.ePayco) return

  const handler = window.ePayco.checkout.configure({
    key: epaycoPublicKey,
    test: false,
    response_type: 'redirect',
    onClosed: () => console.log('Modal cerrado')
  })

  const totalAPagar = store.cartTotal + (siteStore.location.neigborhood.delivery_price || 0)

  handler.open({
    name: id,
    description: `Pedido ${id}`,
    amount: totalAPagar,
    currency: siteStore?.location?.site?.time_zone === 'America/New_York' ? 'usd' : 'cop',
    invoice: id,
    country: 'co',
    lang: 'es',
    external: 'false',
    confirmation: `${URI}/confirmacion-epayco`,
    response: `${SELF_URI}/gracias-epayco`,
    name_billing: user.user.name || '',
    address_billing: user.user.address || '',
    type_doc_billing: 'cc',
    mobilephone_billing: user.user.phone_number || '',
    email_billing: user.user.email || '',
    methodsDisable: ['SP', 'CASH']
  })
}
</script>

<style scoped>
/* --- Card --- */
.summary-card {
  background-color: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
  padding: 1.5rem;
  position: sticky;
  top: 6rem;
  transition: all 0.3s ease;
}

/* Título */
.title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 1rem;
  /* Eliminado text-transform: uppercase */
}

/* --- Lista de Productos --- */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.product-list::-webkit-scrollbar { width: 4px; }
.product-list::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 4px; }

.product-item {
  border-bottom: 1px dashed var(--border-color);
  padding-bottom: 1rem;
}
.product-item:last-child { border-bottom: none; padding-bottom: 0; }

.product-main-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  font-size: 0.95rem;
  color: var(--text-main);
  margin-bottom: 0.25rem;
}

.product-info { display: flex; gap: 0.5rem; }

.qty-badge {
  font-weight: 600;
  min-width: 24px;
  color: var(--primary);
  min-width: max-content;
}

.product-name {
  font-weight: 500;
  line-height: 1.4;
}

.product-price {
  font-weight: 600;
  white-space: nowrap;
  margin-left: 0.5rem;
}

/* --- Combos y Adiciones --- */
.combo-list, .additions-list {
  margin-left: 1.8rem;
  margin-top: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.combo-item, .addition-row {
  display: flex;
  justify-content: start;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.combo-qty { font-weight: 600; margin-right: 0.5rem; }
.addition-price { font-weight: 500; white-space: nowrap; margin-left: 0.5rem; }

/* --- Totales --- */
.divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 1.5rem 0;
}

.summary-totals {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.95rem;
  color: var(--text-main);
}

.label { color: var(--text-secondary); }
.value { font-weight: 600; }

.discount { color: var(--success-text); }
.strike { text-decoration: line-through; opacity: 0.6; }
.free-delivery { color: var(--success-text); font-weight: 700; font-size: 0.8rem; }

.final-total {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 2px solid var(--border-color);
  font-size: 1.25rem;
}
.final-total .label { color: var(--text-main); font-weight: 700; }
.final-total .value { font-weight: 800; }

/* --- Botones --- */
.actions-container { margin-top: 2rem; }

.closed-alert {
  background-color: var(--danger-bg);
  color: var(--danger-text);
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  text-align: center;
  margin-bottom: 1rem;
  border: 1px solid #fecaca;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.buttons-stack { 
    display: flex; 
    flex-direction: column-reverse; /* Invertimos para que 'Volver' quede abajo visualmente si se apilan, similar a tu diseño anterior, o quítalo si prefieres orden normal */
    gap: 0.75rem; 
}

/* Si prefieres el orden normal (principal arriba, volver abajo), quita flex-direction: column-reverse */

.btn {
  width: 100%;
  padding: 0.875rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  /* IMPORTANTE: Sin text-transform uppercase */
}

.btn-primary {
  background-color: var(--primary);
  color: white;
  border: 1px solid var(--primary);
}
.btn-primary:hover:not(:disabled) {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.btn-text {
  background-color: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
}
.btn-text:hover {
  color: var(--text-main);
  text-decoration: underline;
  background-color: #f9fafb;
}

.link-wrapper { text-decoration: none; display: block; width: 100%; }

/* --- Responsive --- */
@media (max-width: 768px) {
  .summary-card {
    position: relative;
    top: 0;
    box-shadow: none;
    border: none;
    background-color: transparent;
    padding: 0;
  }
  .summary-wrapper { padding: 0; margin-top: 2rem; }
  .final-total { font-size: 1.1rem; }
}
</style>