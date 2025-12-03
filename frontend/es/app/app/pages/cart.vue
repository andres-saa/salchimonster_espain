<template>
  <div style="max-width: 900px;margin: 0 auto;">
    <div class="cart-has-products" v-if="store.cart.length > 0">
      <h1 class="cart-title text-center text-2xl my-8">
        <b>CARRITO DE COMPRAS</b>
      </h1>

      <div class="cart-grid">
        <!-- Columna izquierda: items -->
        <div class="cart-items-container">
          <div
            class="cart-product-item"
            v-for="product in store.cart"
            :key="product.pedido_productoid"
          >
            <!-- HEADER: imagen + info principal + botón eliminar -->
            <div class="cart-product-main">
              <div class="cart-product-left">
                <img
                  class="cart-product-img"
                  :src="`https://img.restpe.com/${product.productogeneral_urlimagen}`"
                  :alt="product.pedido_nombre_producto"
                />
              </div>

              <div class="cart-product-center">
                <!-- Título + botón eliminar -->
                <div class="cart-product-header-row">
                  <div class="cart-product-description-container">
                    <span class="cart-product-name">
                      {{ product.pedido_nombre_producto }}
                    </span>
                  </div>

                  <!-- Botón ELIMINAR PRODUCTO -->
                  <button
                    type="button"
                    class="cart-delete-product-button"
                    @click="store.removeProductFromCart(product.signature)"
                    aria-label="Eliminar producto del carrito"
                  >
                    <Icon name="mdi:trash-can-outline" class="cart-icon" />
                  </button>
                </div>

                <!-- Cantidad + precios -->
                <div class="cart-product-bottom-row">
                  <!-- CONTROL DE CANTIDAD PRODUCTO -->
                  <div class="cart-product-quantity-container">
                    <div class="cart-product-quantity-control">
                      <button
                        type="button"
                        class="cart-quantity-btn cart-quantity-btn-minus"
                        @click="store.decrementProduct(product.signature)"
                      >
                        <Icon name="mdi:minus" class="cart-icon" />
                      </button>

                      <span class="cart-product-quantity-label">
                        {{ product.pedido_cantidad }}
                      </span>

                      <button
                        type="button"
                        class="cart-quantity-btn cart-quantity-btn-plus"
                        @click="store.incrementProduct(product.signature)"
                      >
                        <Icon name="mdi:plus" class="cart-icon" />
                      </button>
                    </div>
                  </div>

                  <!-- PRECIOS -->
                  <div class="cart-product-price-block">
                    <p
                      v-if="product.pedido_descuento > 0"
                      class="cart-product-price cart-product-price--old"
                    >
                      {{
                        formatoPesosColombianos(
                          product.pedido_precio * product.pedido_cantidad
                        )
                      }}
                    </p>

                    <p class="cart-product-price cart-product-price--final">
                      {{
                        formatoPesosColombianos(
                          (product.pedido_precio - product.pedido_descuento) *
                            product.pedido_cantidad
                        )
                      }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- ADICIONALES -->
            <div
              v-if="product?.modificadorseleccionList?.length > 0"
              class="cart-additions-box"
            >
              <p class="cart-additions-title">Adicionales</p>

              <div
                class="cart-additions-item"
                v-for="item in product.modificadorseleccionList"
                :key="item.modificadorseleccion_id || item.id"
              >
                <div class="cart-additions-item-left">
                  <span class="cart-addition-name">
                    ({{ product.pedido_cantidad }})
                    <b>{{ item.modificadorseleccion_cantidad }}</b>
                    {{ item.modificadorseleccion_nombre }}
                  </span>
                </div>

                <div class="cart-additions-item-right">
                  <span
                    v-if="item.pedido_precio > 0"
                    class="cart-addition-price"
                  >
                    {{
                      formatoPesosColombianos(
                        item.pedido_precio *
                          item.modificadorseleccion_cantidad *
                          product.pedido_cantidad
                      )
                    }}
                  </span>

                  <div class="cart-addition-quantity-control">
                    <button
                      type="button"
                      class="cart-addition-quantity-btn cart-addition-quantity-btn-minus"
                      @click="
                        store.decrementAdditional(product.signature, item)
                      "
                    >
                      <Icon name="mdi:minus" class="cart-icon" />
                    </button>

                    <span class="cart-addition-quantity-label">
                      {{
                        item.modificadorseleccion_cantidad *
                        product.pedido_cantidad
                      }}
                    </span>

                    <button
                      type="button"
                      class="cart-addition-quantity-btn cart-addition-quantity-btn-plus"
                      @click="
                        store.incrementAdditional(product.signature, item)
                      "
                    >
                      <Icon name="mdi:plus" class="cart-icon" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <!-- /ADICIONALES -->
          </div>
        </div>

        <!-- Columna derecha: resumen -->
        <resumen class="cart-summary-column shadow-6" />
      </div>
    </div>

    <!-- Carrito vacío -->
    <div v-else class="cart-empty-container">
      <!-- Podrías meter aquí otro Icon bonito + CTA -->
      <!-- <Icon name="mdi:cart-off" class="cart-empty-icon" /> -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeMount } from 'vue'

import { usecartStore } from '#imports'
import { formatoPesosColombianos } from '@/service/utils/formatoPesos'
import { useSitesStore } from '#imports'
import { useUserStore } from '#imports'
import { URI } from '@/service/conection'

const store = usecartStore()
const siteStore = useSitesStore()
const selectedAdditions = ref({})
const agrupados = ref({})
const user = useUserStore()

const mycart = ref([])

onMounted(() => {
  console.log(store.cart)
})

onBeforeMount(() => {
  if (!siteStore.location.site?.site_id) {
    siteStore.visibles.currentSite = true
  }
})

const update = () => {
  // Si luego quieres agrupar adicionales, lo puedes hacer aquí
}

watch(
  () => store.cart?.additions,
  () => {
    update()
  },
  { deep: true }
)

const increment = (adition) => {
  const new_adition = { ...adition }
  new_adition.quantity = 1
  store.addAdditionToCart(new_adition)
}

const decrement = (adition) => {
  if (adition.quantity > 1) {
    store.removeAdditionFromCart(adition.id)
  }
}

const deleteAd = (adicion) => {
  store.removeAdditionCompletelyFromCart(adicion.id)
  update()
}

const deleteGroup = (items) => {
  items.forEach((item) => {
    deleteAd(item)
  })
}

watch(
  () => store.visibles.addAdditionToCart,
  (newval) => {
    if (newval) {
      selectedAdditions.value = {}
    }
  },
  { deep: true }
)

onMounted(async () => {
  if (user.user.payment_method_option?.productogeneral_id != 7) {
    siteStore.setNeighborhoodPrice()
  } else {
    siteStore.setNeighborhoodPriceCero()
  }

  const product_id = 53
  // si luego usas product_id para traer adicionales, aquí
})
</script>

<style scoped>
/* ÍCONOS NuxtIcon */
.cart-icon {
  font-size: 0.9rem;
}

/* Si quieres que todos los Icon dentro del carrito tengan el mismo tamaño: */
/* :deep(svg) para NuxtIcon */
:deep(.cart-delete-product-button svg),
:deep(.cart-quantity-btn svg),
:deep(.cart-addition-quantity-btn svg) {
  width: 1rem;
  height: 1rem;
}

/* ------ NUEVO LAYOUT DEL CARRITO ------ */

.cart-has-products {
  padding-inline: 1rem;
}

/* Título del carrito */
.cart-title {
  text-align: center;
  margin: 2rem auto;
}

/* Grid principal para dividir en 2 columnas */
.cart-grid {
  max-width: 1100px;
  margin: 0 auto;
  margin-top: 2rem;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 2fr);
  gap: 2rem;
}

/* Columna de items */
.cart-items-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Columna resumen */
.cart-summary-column {
  width: 100%;
}

/* Card de producto */
.cart-product-item {
  background-color: #ffffff;
  border-radius: 0.75rem;
  padding: 1rem 1.1rem;
  box-shadow: 0 0.2rem 0.6rem rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Layout principal dentro del item */
.cart-product-main {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.9rem;
  align-items: center;
}

/* Columna izquierda: imagen */
.cart-product-left {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Imagen del producto */
.cart-product-img {
  width: 4.5rem;
  height: 4.5rem;
  object-fit: cover;
  border-radius: 999px;
  border: 3px solid var(--primary-color);
}

/* Columna centro: info + controles */
.cart-product-center {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

/* Fila superior: nombre + botón eliminar */
.cart-product-header-row {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

/* Nombre del producto */
.cart-product-name {
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: none;
  line-height: 1.25;
}

/* Botón para eliminar producto */
.cart-delete-product-button {
  margin-left: auto;
  border: none;
  outline: none;
  width: 2rem;
  height: 2rem;
  background-color: #fef2f2;
  color: #dc2626;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.15s ease, transform 0.1s ease;
}

.cart-delete-product-button:hover {
  background-color: #fee2e2;
  transform: translateY(-1px);
  cursor: pointer;
}

/* Fila inferior: cantidad + precios */
.cart-product-bottom-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

/* Contenedor de cantidad */
.cart-product-quantity-container {
  display: flex;
  align-items: center;
}

/* Control de cantidad pill */
.cart-product-quantity-control {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background-color: #f9fafb;
  box-shadow: 0 0 0.3rem rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

/* Botones + / - de los productos */
.cart-quantity-btn {
  border: none;
  outline: none;
  width: 2rem;
  height: 2rem;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-quantity-btn-minus {
  border-right: 1px solid #e5e7eb;
}

.cart-quantity-btn-plus {
  border-left: 1px solid #e5e7eb;
}

/* Cantidad */
.cart-product-quantity-label {
  min-width: 2.6rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Bloque de precios */
.cart-product-price-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
}

/* Precios */
.cart-product-price {
  margin: 0;
  font-size: 0.95rem;
}

.cart-product-price--old {
  opacity: 0.5;
  text-decoration: line-through;
}

.cart-product-price--final {
  font-weight: 800;
  font-size: 1.05rem;
}

/* ADICIONALES */
.cart-additions-box {
  margin-top: 0.3rem;
  border-radius: 0.5rem;
  background-color: #f9fafb;
  padding: 0.6rem 0.7rem;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.cart-additions-title {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #6b7280;
  font-weight: 600;
}

.cart-additions-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

/* Lado izquierdo del adicional */
.cart-additions-item-left {
  flex: 1;
}

.cart-addition-name {
  font-size: 0.8rem;
  text-transform: capitalize;
}

/* Lado derecho del adicional */
.cart-additions-item-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.cart-addition-price {
  font-size: 0.85rem;
  font-weight: 700;
}

/* Control cantidad adicional */
.cart-addition-quantity-control {
  display: inline-flex;
  align-items: center;
  border-radius: 0.35rem;
  background-color: #ffffff;
  box-shadow: 0 0 0.3rem rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.cart-addition-quantity-btn {
  width: 1.7rem;
  height: 1.8rem;
  border: none;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-addition-quantity-btn-minus {
  border-right: 1px solid #e5e7eb;
}

.cart-addition-quantity-btn-plus {
  border-left: 1px solid #e5e7eb;
}

.cart-addition-quantity-label {
  width: 2rem;
  height: 1.8rem;
  font-weight: 700;
  font-size: 0.8rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Cuando no hay productos en el carrito */
.cart-empty-container {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 0;
  height: calc(100vh - 8rem);
  width: 100%;
  padding: 1rem;
  max-width: 50rem;
  margin: auto;
}

/* ------ Responsive ------ */
@media (width < 900px) {
  .cart-grid {
    grid-template-columns: 1fr;
    padding-inline: 0.5rem;
  }

  .cart-product-main {
    grid-template-columns: auto 1fr;
  }

  .cart-product-bottom-row {
    flex-direction: row;
    align-items: center;
  }
}

/* ------ Estilos legacy que ya tenías (por si los usas en otros lados) ------ */

*:focus {
  border: none;
}

.led {
  animation: cambiaColor 1s infinite;
}

.name-product::first-letter {
  text-transform: uppercase;
}

img {
  border-radius: 50%;
}

.domi-name {
  text-transform: capitalize;
}

.descripcion::first-letter {
  text-transform: uppercase;
}

@keyframes cambiaColor {
  0% {
    background-color: rgb(0, 0, 0);
  }

  50% {
    background-color: rgb(30, 255, 0);
  }

  100% {
    background-color: var(--primary-color);
  }
}

h6,
span {
  text-transform: uppercase;
  font-size: 0.9rem;
}

.triangulo {
  width: 0;
  height: 0;
  border-left: 1rem solid transparent;
  border-right: 1rem solid transparent;
  border-bottom: 2rem solid #ffede1;
  transform: rotate(-65deg);
  position: absolute;
  top: -1rem;
  left: -1.2rem;
}

.container {
  background-color: rgb(0, 0, 0);
}

.scrollit {
  float: left;
  width: 71%;
}

.contenedor-producto {
  align-items: center;
  border-radius: 0.5rem;
  overflow: hidden;
  height: 7rem;
  position: relative;
}

.producto {
  border-bottom: 2px solid #00000020;
}

.cantidad:focus {
  outline: none;
}

.imagen {
  height: 100px;
  object-fit: contain;
}

.contador {
  background-color: white;
  display: flex;
  border-radius: 0.1rem;
  padding: 0.1rem 1rem;
  box-shadow: 0 0.3rem 5px rgba(0, 0, 0, 0.174);
  position: absolute;
  right: 1rem;
  bottom: 1rem;
  width: 8rem;
  height: 2.5rem;
}

button:hover {
  cursor: pointer;
}

@media (min-width: 768px) and (max-width: 991px) {
  .clase {
    min-width: 720px;
  }
}

@media (min-width: 1200px) and (max-width: 1920px) {
  .clase {
    min-width: 1024px;
  }

  .productos-scroll {
    overflow-y: auto;
    border-radius: 2rem;
  }
}

::-webkit-scrollbar {
  width: 1rem;
  padding-top: 1rem;
  position: absolute;
}

::-webkit-scrollbar-thumb {
  background-color: rgb(255, 0, 0);
  border-radius: 9px;
  border: 5px solid var(--primary-color);
  height: 10rem;
  width: 10rem;
}

.p-shadow {
  box-shadow: 0 0.2rem 5px rgba(0, 0, 0, 0.15);
}
</style>
