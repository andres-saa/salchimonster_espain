<template>
  <div class="order-summary-container">
    <div v-if="showDialog && order?.order_id" class="modal-overlay">
      <div class="modal-card">
        
        <header class="receipt-header">
          <h2 class="client-name">
            🤩{{ clienteNombresUpper }} {{ clienteApellidosUpper }}🤩
          </h2>
          <p class="thank-you-msg">🔥 ¡MUCHAS GRACIAS POR TU COMPRA! 🔥</p>
        </header>

        <div class="receipt-body">
          
          <div class="status-section">
            <span v-if="order.responsible_id" class="badge badge-success">Pago autorizado</span>
            <span v-if="order.responsible_id" class="badge badge-success">{{ order.name }}</span>
            
            <div class="order-meta">
              <p class="order-id">ID: {{ order.order_id }}</p>
              <p class="order-user">{{ order.user_name }} {{ order.second_name }} {{ order.first_last_name }} {{ order.second_last_name }}</p>
              <div class="order-dates">
                <span><b>Fecha:</b> {{ fechaISO }}</span>
                <span><b>Hora:</b> {{ horaISO }}</span>
              </div>
            </div>
          </div>

          <div class="products-table">
            <div class="table-header">
              <span>PRODUCTOS</span>
              <span class="text-right">TOTAL</span>
            </div>

            <div class="table-rows">
              <div v-for="(product, idx) in order.pe_json?.listaPedidos || []" :key="idx" class="product-row-group">
                
                <div class="product-row">
                  <div class="product-info">
                    <span v-if="order.site_id === 32">
                      <b>({{ product.pedido_cantidad }} kg)</b> {{ product.pedido_nombre_producto }}
                      <small>({{ product.pedido_cantidad / product.presentacion }} {{ product.presentation_unit_measure }})</small>
                    </span>
                    <span v-else>
                      <b>({{ product.pedido_cantidad }})</b> {{ product.pedido_nombre_producto }}
                    </span>
                  </div>
                  <div class="product-price">
                    {{ formatoPesosColombianos((product.pedido_base_price ?? product.pedido_precio ?? 0) * (product.pedido_cantidad ?? 0)) }}
                  </div>
                </div>

                <div v-if="product.lista_productocombo?.length > 0" class="combo-details">
                  <p class="combo-label">COMBO INCLUYE</p>
                  <p v-for="(i, k) in product.lista_productocombo" :key="k" class="combo-item">
                    -- <b>{{ i.pedido_cantidad }}</b> {{ i.pedido_nombre }}
                  </p>
                </div>

                <div v-for="(mod, j) in product.modificadorseleccionList || []" :key="j" class="modifier-row">
                  <span class="modifier-name">
                    - ({{ product.pedido_cantidad }}) <b>{{ mod.modificadorseleccion_cantidad }}</b> {{ mod.modificadorseleccion_nombre }}
                  </span>
                  <span class="modifier-price">
                    {{ formatoPesosColombianos((mod.pedido_precio ?? 0) * (mod.modificadorseleccion_cantidad ?? 0) * (product.pedido_cantidad ?? 0)) }}
                  </span>
                </div>
                
                <div class="separator"></div>
              </div>
            </div>
          </div>

          <div class="totals-section">
            <div class="total-row">
              <span>Subtotal</span>
              <b>{{ formatoPesosColombianos(subtotal) }}</b>
            </div>
            
            <div v-if="descuento > 0" class="total-row discount-text">
              <span>Descuento</span>
              <b>- <span class="strike">{{ formatoPesosColombianos(descuento) }}</span></b>
            </div>

            <div class="total-row">
              <span>Domicilio</span>
              <b>{{ formatoPesosColombianos(envio) }}</b>
            </div>

            <div class="total-row final-total">
              <span>Total</span>
              <span>{{ formatoPesosColombianos(pagocon) }}</span>
            </div>
          </div>

          <div class="section-block">
            <div class="section-title dark">Notas</div>
            <div class="notes-box">
              {{ (order.order_notes || '').toLowerCase() }}
            </div>
          </div>

          <div class="section-block">
            <div class="section-title dark">Cliente</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Nombre</span>
                <span class="value">{{ order.user_name }} {{ order.second_name }} {{ order.first_last_name }} {{ order.second_last_name }}</span>
              </div>
              
              <div v-if="order.site_id === 32" class="info-item">
                <span class="label">Cédula / NIT</span>
                <span class="value">{{ order.cedula_nit }}</span>
              </div>

              <div class="info-item">
                <span class="label">Método de entrega</span>
                <span class="value">{{ order.order_type }}</span>
              </div>

              <div v-if="order.site_id === 32" class="info-item">
                <span class="label">Fecha entrega</span>
                <span class="value">{{ order.pe_json?.delivery?.delivery_horaentrega }}</span>
              </div>

              <div v-if="order.placa" class="info-item">
                <span class="label">Placa</span>
                <span class="value">{{ order.placa }}</span>
              </div>

              <div class="info-item">
                <span class="label">Teléfono</span>
                <span class="value">{{ order.user_phone }}</span>
              </div>

              <div v-if="order.site_id === 32" class="info-item">
                <span class="label">Correo</span>
                <span class="value">{{ order.email }}</span>
              </div>

              <div v-if="order.order_type !== 'Pasar a recoger'" class="info-item">
                <span class="label">Dirección</span>
                <span class="value capitalize">{{ (order.user_address || '').toLowerCase() }}</span>
              </div>

              <div class="info-item">
                <span class="label">Método de pago</span>
                <span class="value capitalize">{{ (order.payment_method || '').toLowerCase() }}</span>
              </div>
            </div>
          </div>

          <div v-if="route.query?.ref_payco" class="section-block epayco-block">
            <h4>Información de pago</h4>
            <div class="info-grid two-cols">
              <div class="info-item"><span class="label">Ref. Comercio</span><span class="value">{{ epayco_data?.x_id_factura }}</span></div>
              <div class="info-item"><span class="label">Ref. ePayco</span><span class="value">{{ epayco_data?.x_ref_payco }}</span></div>
              <div class="info-item"><span class="label">Banco</span><span class="value">{{ epayco_data?.x_bank_name }}</span></div>
              <div class="info-item"><span class="label">Estado</span><span class="value">{{ epayco_data?.x_transaction_state }}</span></div>
              <div class="info-item"><span class="label">Total</span><span class="value">{{ formatoPesosColombianos(epayco_data?.x_amount) }}</span></div>
            </div>
          </div>

        </div>

        <footer class="modal-footer">
      <NuxtLink :to="`/rastrear?order_id=${order.order_id}`" class="full-width">
  <button class="btn btn-warning full-width">PUEDES RASTREARLO AQUÍ</button>
</NuxtLink>
          <a v-if="showBtnTransferencia" :href="whatsappUrlTransferencia" target="_blank" class="full-width">
            <button class="btn btn-whatsapp full-width pulse-anim">
              <i class="pi pi-whatsapp"></i> REALIZAR TRANSFERENCIA
            </button>
          </a>
          
          <NuxtLink to="/" class="full-width">
            <button class="btn btn-outline-danger full-width">
              <i class="pi pi-arrow-left"></i> VOLVER AL MENÚ
            </button>
          </NuxtLink>
        </footer>

      </div>
    </div>

    <div v-else class="loading-state">
      <h2>Cargando tu pedido...</h2>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
// Asegúrate de que esta ruta sea correcta en tu proyecto o define la URI aquí mismo
import { URI } from "~/service/conection"; 

const route = useRoute();

// Estado
const order = ref(null);
const showDialog = ref(false);
const epayco_data = ref({});

/* ================= UTILS ================= */
const formatoPesosColombianos = (n) => {
  const v = Number(n ?? 0);
  return v.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
};

/* ================= COMPUTED PROPERTIES ================= */

// Datos Cliente
const clienteNombresUpper = computed(() => (order.value?.pe_json?.cliente?.cliente_nombres || "").toUpperCase());
const clienteApellidosUpper = computed(() => (order.value?.pe_json?.cliente?.cliente_apellidos || "").toUpperCase());

// Fecha y Hora
const fechaISO = computed(() => (order.value?.latest_status_timestamp || "").split("T")?.[0] || "");
const horaISO = computed(() => (order.value?.latest_status_timestamp || "").split("T")?.[1]?.split(":")?.slice(0, 2)?.join(":") || "");

// Totales Financieros
const envio = computed(() => Number(order.value?.pe_json?.delivery?.delivery_costoenvio ?? 0));
const pagocon = computed(() => Number(order.value?.pe_json?.delivery?.delivery_pagocon ?? 0));
const descuento = computed(() => Number(order.value?.pe_json?.delivery?.total_descuento ?? 0));
const subtotal = computed(() => pagocon.value + descuento.value - envio.value);

// Lógica de Teléfono (Soporte)
const phoneByOrder = computed(() => {
  const id = order.value?.order_id || "";
  const prefix = id.split("-")?.[0] || "";
  return ["NEW", "NEK", "FIL", "NYK"].includes(prefix) ? "573102142549" : "573053447255";
});

// Mensajes para WhatsApp
const textTransferencia = computed(() => {
  const c = order.value?.pe_json?.cliente || {};
  const lista = order.value?.pe_json?.listaPedidos || [];
  
  const productos = lista.map((p) => {
    // Lógica específica para sitio ID 32 (Venta por peso/kilos)
    if (order.value?.site_id === 32) {
      const cantidad = p?.pedido_cantidad || 0;
      const presentacion = p?.presentacion || 1;
      const unidad = p?.presentation_unit_measure || "";
      return `*(${cantidad} kilos)* de ${p?.pedido_nombre_producto || ""} (${cantidad / presentacion} ${unidad})`;
    }
    // Lógica estándar
    return `*(${p?.pedido_cantidad || 0})* ${p?.pedido_nombre_producto || ""}`;
  }).join("\n");

  return `Hola soy *${(c.cliente_nombres || "").toUpperCase()} ${(c.cliente_apellidos || "").toUpperCase()}* 🤗 acabo de hacer el siguiente pedido en la página web.
${productos ? "\n" + productos + "\n" : ""}
El número de la orden es *#${order.value?.order_id || ""}*.

*Escribo para Realizar la Transferencia* 🙏`;
});

const whatsappUrlTransferencia = computed(() => {
  const baseUrl = "https://api.whatsapp.com/send";
  const urlParams = new URLSearchParams({ phone: phoneByOrder.value, text: textTransferencia.value });
  return `${baseUrl}?${urlParams.toString()}`;
});

// Mostrar botón solo si el método de pago es Transferencia (ID 6)
const showBtnTransferencia = computed(() => Number(order.value?.payment_method_id) === 6);

/* ================= API FETCH NATIVO ================= */

const loadOrder = async () => {
  const order_id = route.query?.order_id;
  
  if (!order_id) {
    console.warn("No se encontró order_id en la URL");
    return;
  }

  try {
    // Uso de fetch nativo
    const response = await fetch(`${URI}/order-by-id/${order_id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}` // Si necesitas token, agrégalo aquí
      }
    });

    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    // Asignación de datos
    order.value = data || null;
    showDialog.value = !!order.value?.order_id;

  } catch (e) {
    console.error("Error al obtener la orden:", e);
    order.value = null;
    showDialog.value = false;
  }
};

const loadEpaycoDataIfAny = () => {
  if (route.query?.ref_payco) {
      epayco_data.value = {
          x_id_factura: route.query?.x_id_factura,
          x_ref_payco: route.query?.x_ref_payco,
          x_transaction_state: route.query?.x_transaction_state,
          x_bank_name: route.query?.x_bank_name,
          x_amount: route.query?.x_amount,
          // Mapea los que necesites...
      }
  }
};

/* ================= LIFECYCLE ================= */
onMounted(async () => {
  await loadOrder();
  loadEpaycoDataIfAny();
});
</script>
<style scoped>
/* Contenedor General */
.order-summary-container {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #111;
}

/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}

/* Tarjeta del Recibo */
.modal-card {
  background: #fff;
  width: 100%;
  max-width: 480px; /* Ancho típico de un recibo largo */
  max-height: 95vh;
  border-radius: 0.75rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Encabezado */
.receipt-header {
  padding: 1.5rem 1rem 0.5rem 1rem;
  text-align: center;
}

.client-name {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  color: #000;
  line-height: 1.2;
}

.thank-you-msg {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: #333;
}

/* Cuerpo Scrollable */
.receipt-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Scrollbar fina */
.receipt-body::-webkit-scrollbar {
  width: 6px;
}
.receipt-body::-webkit-scrollbar-thumb {
  background-color: #ccc;
  border-radius: 3px;
}

/* Badges */
.badge {
  display: inline-block;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
  margin-right: 0.5rem;
  margin-bottom: 0.5rem;
}

.badge-success {
  background-color: #dcfce7;
  color: #166534;
}

/* Meta info de la orden */
.order-meta {
  text-align: center;
  margin-top: 0.5rem;
}
.order-id {
  font-weight: 800;
  font-size: 1.1rem;
  margin: 0;
}
.order-user {
  font-weight: 600;
  margin: 0.25rem 0;
}
.order-dates {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  color: #555;
}

/* Tabla de Productos */
.table-header {
  background-color: #000;
  color: #fff;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.5rem 0.75rem;
  display: flex;
  justify-content: space-between;
  border-radius: 4px 4px 0 0;
  font-size: 0.85rem;
}

.table-rows {
  border: 1px solid #eee;
  border-top: none;
  padding: 0.5rem;
}

.product-row-group {
  margin-bottom: 0.5rem;
}

.product-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 0.25rem;
}

.product-info {
  font-size: 0.95rem;
  line-height: 1.3;
}

.product-price {
  font-weight: 600;
  white-space: nowrap;
}

.combo-details, .modifier-row {
  font-size: 0.85rem;
  color: #555;
  padding-left: 1rem;
}

.combo-label {
  font-weight: 700;
  font-size: 0.75rem;
  margin: 0.25rem 0;
}

.modifier-row {
  display: flex;
  justify-content: space-between;
}

.separator {
  height: 1px;
  background-color: #eee;
  margin-top: 0.5rem;
}

/* Totales */
.totals-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  border-top: 2px solid #000;
  padding-top: 0.75rem;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
}

.final-total {
  font-size: 1.2rem;
  font-weight: 800;
  margin-top: 0.5rem;
}

.strike {
  text-decoration: line-through;
}
.discount-text {
  color: #b91c1c;
}

/* Bloques de Sección (Notas, Cliente) */
.section-block {
  margin-top: 0.5rem;
}

.section-title {
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.section-title.dark {
  background-color: #000;
  color: #fff;
}

.notes-box {
  border: 1px solid #000;
  padding: 0.75rem;
  font-size: 0.9rem;
  background-color: #fff;
}

/* Grid de Información */
.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.info-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 1rem;
  font-size: 0.9rem;
  align-items: baseline;
}

.info-item .label {
  font-weight: 700;
  color: #444;
}

.info-item .value {
  color: #000;
}

.capitalize {
  text-transform: capitalize;
}

/* Footer Botones */
.modal-footer {
  padding: 1rem;
  background-color: #f9fafb;
  border-top: 1px solid #eee;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.full-width {
  width: 100%;
}

.btn {
  width: 100%;
  padding: 0.85rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: transform 0.1s, opacity 0.2s;
}

.btn:active {
  transform: scale(0.98);
}

.btn-warning {
  background-color: #f59e0b;
  color: #fff;
}

.btn-whatsapp {
  background-color: #25D366;
  color: #fff;
}

.btn-outline-danger {
  background-color: transparent;
  border: 1px solid #dc2626;
  color: #dc2626;
}

/* Animaciones */
@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(37, 211, 102, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
}

.pulse-anim {
  animation: pulse-green 2s infinite;
}

/* Estado de carga */
.loading-state {
  display: flex;
  height: 90vh;
  justify-content: center;
  align-items: center;
}
</style>