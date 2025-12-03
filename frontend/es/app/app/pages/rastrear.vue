<template>
  <div class="track-page">
    <main class="track-main">
      <!-- TARJETA PRINCIPAL -->
      <section class="track-card">
        <header class="track-card__header">
          <h1 class="track-title">Rastrea tu pedido</h1>
          <p class="track-subtitle">
            Ingresa el ID de tu pedido para ver su estado actual y el historial.
          </p>
        </header>

        <!-- BUSCADOR -->
        <form @submit.prevent="getStatusHistory" class="search-wrapper">
          <div class="search-input-wrapper">
            <Icon name="mdi:tag-outline" class="search-input-icon" />
            <input
              v-model="orderId"
              type="text"
              class="search-input"
              placeholder="Ejemplo: MOD-0054..."
            />
          </div>

          <button type="submit" class="search-button" :disabled="loading">
            <Icon
              name="mdi:magnify"
              class="search-icon"
            />
          </button>
        </form>

        <!-- MENSAJES DE ESTADO -->
        <div class="track-messages">
          <!-- LOADING -->
          <div v-if="loading" class="alert alert--info">
            <Icon name="mdi:clock-outline" class="alert__icon" />
            <span>Buscando tu pedido...</span>
          </div>

          <!-- ERROR -->
          <div v-else-if="error" class="alert alert--error">
            <Icon name="mdi:alert-circle-outline" class="alert__icon" />
            <span>{{ error }}</span>
          </div>
        </div>

        <!-- ESTADO ACTUAL -->
        <section
          v-if="!loading && !error && currentStatus"
          class="current-status"
        >
          <h2 class="current-status__title">
            ¡Gracias por tu compra!
          </h2>

          <p v-if="currentStatus.status === 'generada'" class="current-status__text">
            Tu pedido ha sido recibido y está en proceso de ser atendido.
          </p>
          <p v-else-if="currentStatus.status === 'en preparacion'" class="current-status__text">
            Tu pedido se encuentra en preparación y en breve estará listo para enviarse.
          </p>
          <p v-else-if="currentStatus.status === 'enviada'" class="current-status__text">
            ¡Tu pedido está en camino!
          </p>
          <p v-else class="current-status__text">
            Estado actual: <strong>{{ currentStatus.status }}</strong>
          </p>

          <div
            v-if="currentStatus.status === 'enviada'"
            class="current-status__badge"
          >
            <Icon name="mdi:truck-delivery-outline" class="current-status__badge-icon" />
            <span>Tu pedido está en camino</span>
          </div>
        </section>

        <!-- HISTORIAL DE ESTADO -->
        <section
          v-if="!loading && !error && currentStatus && firstHistory && firstHistory.status_history"
          class="history"
        >
          <h3 class="history__title">Historial de estado</h3>
          <ul class="status-timeline">
            <li
              v-for="stat in firstHistory.status_history"
              :key="stat.timestamp"
              class="status-timeline__item"
            >
              <div class="status-timeline__marker"></div>
              <div class="status-timeline__content">
                <p class="status-timeline__status">
                  {{ stat.status }}
                </p>
                <p class="status-timeline__timestamp">
                  {{ stat.timestamp }}
                </p>
              </div>
            </li>
          </ul>
        </section>

        <!-- MENSAJE INICIAL SIN RESULTADOS -->
        <section
          v-if="!loading && !error && !currentStatus && !firstHistory"
          class="empty-state"
        >
          <Icon name="mdi:clipboard-text-search-outline" class="empty-state__icon" />
          <p class="empty-state__text">
            Ingresa el ID de tu pedido para ver su estado.
          </p>
        </section>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { URI } from '@/service/conection'

const orderId = ref('')
const history = ref([])          // respuesta completa del backend
const currentStatus = ref(null)  // estado actual
const loading = ref(false)
const error = ref(null)

const firstHistory = computed(() => {
  return Array.isArray(history.value) && history.value.length > 0
    ? history.value[0]
    : null
})

const getStatusHistory = async () => {
  if (!orderId.value) {
    error.value = 'Por favor ingresa el ID de tu pedido.'
    currentStatus.value = null
    history.value = []
    return
  }

  loading.value = true
  error.value = null

  try {
    const result = await $fetch(`${URI}/history-my-orden/${orderId.value}`)
    history.value = Array.isArray(result) ? result : []
    currentStatus.value = history.value[0]?.current_status || null

    if (!currentStatus.value) {
      error.value = 'No encontramos el estado actual de tu pedido.'
    }
  } catch (err) {
    console.error('Error al obtener el historial de estado:', err)
    error.value = 'No pudimos encontrar tu pedido. Verifica el ID e inténtalo de nuevo.'
    history.value = []
    currentStatus.value = null
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
:root {
  /* Por si no tienes definida esta variable en global */
  --primary-color: #d60000;
}

.track-page {
  min-height: 80vh;
  display: flex;
  justify-content: center;
  padding: 2rem 1rem 3rem;
 
}

.track-main {
  width: 100%;
  max-width: 720px;
  margin: auto;
}

.track-card {
  background-color: #ffffff;
  border-radius: 1.5rem;
  padding: 2rem 1.75rem 2.5rem;
  box-shadow: 0 22px 45px rgba(15, 23, 42, 0.12);
  border: 1px solid rgba(148, 163, 184, 0.3);
}

/* HEADER */
.track-card__header {
  text-align: center;
  margin-bottom: 2rem;
}

.track-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: var(--primary-color);
}

.track-subtitle {
  margin-top: 0.5rem;
  margin-bottom: 0;
  font-size: 0.95rem;
  color: #6b7280;
}

/* BUSCADOR */
.search-wrapper {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: nowrap;
}

.search-input-wrapper {
  position: relative;
  flex: 1;
}

.search-input-icon {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.1rem;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background-color: #ffffff;
  font-size: 0.95rem;
  color: #111827;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(214, 0, 0, 0.12);
  background-color: #fff;
}

.search-button {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  background: var(--primary-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}

.search-button:disabled {
  opacity: 0.75;
  cursor: wait;
}

.search-button:not(:disabled):hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
  box-shadow: 0 12px 25px rgba(214, 0, 0, 0.35);
}

.search-icon {
  font-size: 1.4rem;
  color: #ffffff;
}

/* MENSAJES */
.track-messages {
  min-height: 1.5rem;
  margin-bottom: 0.5rem;
}

.alert {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
}

.alert__icon {
  font-size: 1.1rem;
}

.alert--info {
  background-color: #e0f2fe;
  color: #0369a1;
}

.alert--info .alert__icon {
  color: #0284c7;
}

.alert--error {
  background-color: #fee2e2;
  color: #b91c1c;
}

.alert--error .alert__icon {
  color: #ef4444;
}

/* ESTADO ACTUAL */
.current-status {
  margin-top: 1.2rem;
  padding: 1.25rem 1rem 1.5rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #fef2f2, #fff7ed);
  border: 1px solid rgba(252, 165, 165, 0.6);
  text-align: center;
}

.current-status__title {
  margin: 0 0 0.4rem;
  font-size: 1.4rem;
  font-weight: 700;
  color: #b91c1c;
}

.current-status__text {
  margin: 0;
  font-size: 0.95rem;
  color: #4b5563;
}

.current-status__badge {
  margin-top: 0.9rem;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background-color: #dcfce7;
  color: #166534;
  font-size: 0.85rem;
}

.current-status__badge-icon {
  font-size: 1.1rem;
}

/* HISTORIAL */
.history {
  margin-top: 1.8rem;
}

.history__title {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: #111827;
}

.status-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.status-timeline__item {
  display: flex;
  gap: 0.75rem;
  position: relative;
  padding-bottom: 1rem;
}

.status-timeline__item:last-child {
  padding-bottom: 0;
}

.status-timeline__item::before {
  content: '';
  position: absolute;
  left: 0.5rem;
  top: 0.7rem;
  width: 2px;
  height: calc(100% - 0.7rem);
  background: linear-gradient(to bottom, #fecaca, transparent);
  opacity: 0.7;
}

.status-timeline__item:last-child::before {
  display: none;
}

.status-timeline__marker {
  width: 0.9rem;
  height: 0.9rem;
  border-radius: 999px;
  background: #ef4444;
  margin-top: 0.3rem;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.3);
  flex-shrink: 0;
}

.status-timeline__content {
  flex: 1;
}

.status-timeline__status {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: capitalize;
  color: #111827;
}

.status-timeline__timestamp {
  margin: 0.1rem 0 0;
  font-size: 0.8rem;
  color: #6b7280;
}

/* EMPTY STATE */
.empty-state {
  margin-top: 1.25rem;
  padding: 1.2rem 1rem;
  border-radius: 1rem;
  background-color: #f9fafb;
  border: 1px dashed #e5e7eb;
  text-align: center;
}

.empty-state__icon {
  font-size: 2rem;
  color: #9ca3af;
}

.empty-state__text {
  margin-top: 0.5rem;
  font-size: 0.9rem;
  color: #6b7280;
}

/* RESPONSIVE */
@media (max-width: 640px) {
  .track-card {
    padding: 1.5rem 1.25rem 2rem;
    border-radius: 1.25rem;
  }

  .track-title {
    font-size: 1.6rem;
  }

  .search-wrapper {
    flex-wrap: nowrap;
  }

  .search-button {
    width: 2.6rem;
    height: 2.6rem;
  }
}
</style>
