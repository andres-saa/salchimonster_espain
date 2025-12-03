<!-- components/MonsterAyudaForm.vue -->
<template>
  <div class="monster-ayuda-page">
    <!-- PRIMER DIÁLOGO (OK PQR) -->
    <div v-if="visibleDialog" class="dialog-overlay">
      <div class="dialog-custom">
        <div class="dialog-header">
          <Icon name="mdi:check-circle" class="dialog-header-icon" />
          <h3 class="dialog-header-title">Solicitud recibida</h3>
        </div>
        <div class="dialog-content">
          <p class="dialog-text">
            Hemos recibido tu solicitud y ha quedado registrada con el ID:
          </p>
          <p class="last-id">{{ last_id }}</p>

          <NuxtLink to="/" class="dialog-link">
            <button class="btn btn-primary">
              <Icon name="mdi:check-circle-outline" class="btn-icon" />
              Listo
            </button>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- SEGUNDO DIÁLOGO (GRACIAS RATING) -->
    <div v-if="visibleDialogGRacias" class="dialog-overlay">
      <div class="dialog-custom">
        <div class="dialog-header dialog-header--success">
          <Icon name="mdi:emoticon-happy-outline" class="dialog-header-icon" />
          <h3 class="dialog-header-title">¡Gracias por tu calificación!</h3>
        </div>
        <div class="dialog-content">
          <p class="gracias-message">Muchas gracias 💛</p>

          <NuxtLink to="/" class="dialog-link">
            <button class="btn btn-primary">
              <Icon name="mdi:check-circle-outline" class="btn-icon" />
              Listo
            </button>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- DIÁLOGO DE ERROR / VALIDACIONES -->
    <div v-if="visibleErrorDialog" class="dialog-overlay">
      <div class="dialog-custom">
        <div class="dialog-header dialog-header--error">
          <Icon name="mdi:alert-circle-outline" class="dialog-header-icon" />
          <h3 class="dialog-header-title">Revisa tu información</h3>
        </div>
        <div class="dialog-content">
          <p class="dialog-text">
            {{ errorMessage }}
          </p>

          <button
            class="btn btn-primary"
            type="button"
            @click="visibleErrorDialog = false"
          >
            <Icon name="mdi:close" class="btn-icon" />
            Entendido
          </button>
        </div>
      </div>
    </div>

    <!-- CONTENIDO PRINCIPAL -->
    <main class="main-wrapper">
      <section class="card">
        <!-- HEADER -->
        <header class="card-header">
          <div class="card-title-group">
            <h1 class="title">
              🔥 <b>MONSTER AYUDA</b> 🔥
            </h1>
            <p class="subtitle">
              Cada día trabajamos para darte una mejor experiencia.
            </p>
          </div>

          <img
            src="https://www.salchimonster.com/images/kids/3.png"
            alt="Monster Ayuda"
            class="main-image"
          />
        </header>

        <!-- FORMULARIO -->
        <div class="form-container">
          <!-- TIPO DE REQUERIMIENTO -->
          <div class="form-group">
            <label class="field-label">
              ¿Cómo te podemos ayudar?
              <span class="field-required">*</span>
            </label>
            <select
              class="input input-select input-uppercase"
              v-model.number="selectedType"
            >
              <option value="" disabled>Selecciona una opción</option>
              <option
                v-for="t in types.filter(t => t.show_on_web)"
                :key="t.id"
                :value="t.id"
              >
                {{ t.name }}
              </option>
            </select>
          </div>

          <!-- CLASIFICACIÓN DEL INCONVENIENTE -->
          <div class="form-group" v-if="selectedType && selectedType !== 8">
            <label class="field-label">
              Clasifica tu inconveniente
              <span class="field-required">*</span>
            </label>
            <select
              class="input input-select"
              v-model.number="selectedTagId"
            >
              <option value="" disabled>Selecciona una opción</option>
              <option v-for="tag in tags" :key="tag.id" :value="tag.id">
                {{ tag.name }}
              </option>
            </select>

            <!-- Muestra el color del tag seleccionado -->
            <div v-if="currentTag" class="tag-preview">
              <span
                class="tag-circle"
                :style="{ backgroundColor: currentTag.color }"
              ></span>
              <span class="tag-name">{{ currentTag.name }}</span>
            </div>
          </div>

          <!-- SEDE -->
          <div class="form-group" v-if="selectedType">
            <label class="field-label">
              Sede
              <span class="field-required">*</span>
            </label>
            <select
              class="input input-select"
              v-model.number="selecteSite"
            >
              <option value="" disabled>Selecciona una sede</option>
              <option
                v-for="s in sites.filter(s => s.show_on_web)"
                :key="s.site_id"
                :value="s.site_id"
              >
                {{ s.site_name }}
              </option>
            </select>
          </div>

          <!-- ID ORDEN -->
          <div class="form-group" v-if="selectedType === 9">
            <label class="field-label">
              ID de la orden
              <span class="field-hint">Ejemplo: <b>BRE-0554</b></span>
              <span class="field-required">*</span>
            </label>
            <input
              v-model="orderId"
              class="input"
              type="text"
              placeholder="Escribe el número de la orden"
            />
          </div>

          <!-- RATING (solo tipo 8) -->
          <div
            class="form-group rating-section"
            v-if="selectedType === 8"
          >
            <label class="field-label">
              Califícanos
              <span class="field-required">*</span>
            </label>
            <div class="rating-stars">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                class="star-button"
                :class="{ active: rating >= star }"
                @click="rating = star"
              >
                <Icon
                  :name="rating >= star ? 'mdi:star' : 'mdi:star-outline'"
                  class="star-icon"
                />
              </button>
            </div>
          </div>

          <!-- COMENTARIOS -->
          <div class="form-group" v-if="selectedType">
            <label class="field-label">
              Comentarios
              <span v-if="selectedType !== 8" class="field-required">*</span>
            </label>
            <textarea
              v-model="comments"
              rows="4"
              class="input textarea"
              placeholder="Cuéntanos qué sucedió o cómo fue tu experiencia"
            ></textarea>
          </div>

          <!-- GRID DE DATOS PERSONALES -->
          <div
            class="form-grid"
            v-if="selectedType"
          >
            <!-- NOMBRE -->
            <div class="form-group">
              <label class="field-label">
                Nombre
                <span v-if="selectedType !== 8" class="field-required">*</span>
              </label>
              <input
                v-model="userName"
                class="input"
                type="text"
                placeholder="Escribe tu nombre"
              />
            </div>

            <!-- TELÉFONO -->
            <div class="form-group">
              <label class="field-label">
                Número de teléfono
                <span v-if="selectedType !== 8" class="field-required">*</span>
              </label>
              <input
                v-model="userPhone"
                class="input"
                type="tel"
                placeholder="Celular o número de contacto"
              />
            </div>

            <!-- CORREO -->
            <div class="form-group">
              <label class="field-label">
                Correo electrónico
                <span v-if="selectedType !== 8" class="field-required">*</span>
              </label>
              <input
                v-model="userEmail"
                class="input"
                type="email"
                placeholder="Escribe tu correo"
              />
            </div>

            <!-- DIRECCIÓN -->
            <div class="form-group">
              <label class="field-label">
                Dirección
                <span v-if="selectedType !== 8" class="field-required">*</span>
              </label>
              <input
                v-model="userAddress"
                class="input"
                type="text"
                placeholder="Dirección donde ocurrió el servicio"
              />
            </div>
          </div>

          <!-- PIE DE FORMULARIO -->
          <div class="form-footer">
            <p class="form-note">
              <span class="field-required">*</span> Campos obligatorios
            </p>
            <button
              class="btn btn-primary"
              type="button"
              @click="handleSubmit"
            >
              <Icon name="mdi:send" class="btn-icon" />
              Enviar solicitud
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { URI } from '~/service/conection'

const last_id = ref('')
const visibleDialog = ref(false)
const visibleDialogGRacias = ref(false)

// Nuevo: diálogo de error
const visibleErrorDialog = ref(false)
const errorMessage = ref('')

const selectedType = ref(null)
const selecteSite = ref(null)

const sites = ref([])
const types = ref([])
const tags = ref([])

const selectedTagId = ref(null)

const orderId = ref('')
const userName = ref('')
const userPhone = ref('')
const userEmail = ref('')
const userAddress = ref('')
const comments = ref('')
const rating = ref(0)

// Tag actual seleccionado (para mostrar color y nombre)
const currentTag = computed(() =>
  tags.value.find(t => t.id === selectedTagId.value) || null
)

const showError = (msg) => {
  errorMessage.value = msg
  visibleErrorDialog.value = true
}

const handleSubmit = async () => {
  // VALIDACIONES
  if (!selectedType.value) {
    showError('Por favor, selecciona un tipo de requerimiento.')
    return
  }

  if (selectedType.value === 9 && !orderId.value) {
    showError('Por favor, ingresa el ID de la orden.')
    return
  }

  if (selectedType.value !== 8 && !selectedTagId.value) {
    showError('Por favor, clasifica tu inconveniente.')
    return
  }

  if (selectedType.value !== 8 && !comments.value) {
    showError('Por favor, cuéntanos lo sucedido.')
    return
  }

  if (
    selectedType.value !== 8 &&
    (!userName.value || !userPhone.value || !userAddress.value || !userEmail.value)
  ) {
    showError(
      'Por favor, completa los campos obligatorios: nombre, teléfono, dirección y correo electrónico.'
    )
    return
  }

  if (!selecteSite.value) {
    showError('Por favor, selecciona la sede.')
    return
  }

  if (selectedType.value === 8 && !rating.value) {
    showError('Por favor, selecciona una calificación.')
    return
  }

  // OBJETO DE DATOS
  const data = {
    data: {
      reques_type_id: selectedType.value,
      content: comments.value || 'Sin comentarios',
      channel_id: 1,
      rating: rating.value || null,
      site_id: selecteSite.value || null,
      order_id: orderId.value || null,
      network_id: 4,
      tag_id: selectedTagId.value || 7,
      restaurant_id: 1
    },
    user: {
      user_name: userName.value || '',
      user_phone: userPhone.value?.toString() || '',
      user_address: userAddress.value || '',
      site_id: selecteSite.value || null,
      email: userEmail.value || ''
    }
  }

  try {
    const res = await fetch(`${URI}/create-pqr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!res.ok) {
      throw new Error('Respuesta no válida del servidor')
    }

    const result = await res.json()
    last_id.value = result?.pqr_id?.[0]?.id || ''

    if (selectedType.value === 8) {
      visibleDialogGRacias.value = true
    } else {
      visibleDialog.value = true
    }
  } catch (error) {
    console.error('Error al enviar la solicitud:', error)
    showError('Hubo un error al enviar tu solicitud. Por favor, inténtalo nuevamente.')
  }
}

onMounted(async () => {
  try {
    const [typesRes, sitesRes, tagsRes] = await Promise.all([
      fetch(`${URI}/get-all-pqrs-types`),
      fetch(`${URI}/sites`),
      fetch(`${URI}/get-all-pqr-tags`)
    ])

    if (!typesRes.ok || !sitesRes.ok || !tagsRes.ok) {
      throw new Error('Error al cargar datos iniciales')
    }

    types.value = await typesRes.json()
    sites.value = await sitesRes.json()
    tags.value = await tagsRes.json()

    // Tipo por defecto
    selectedType.value = 9
  } catch (err) {
    console.error(err)
    showError('No se pudieron cargar los datos iniciales. Por favor, recarga la página.')
  }
})
</script>

<style scoped>
:root {
  --monster-primary: #ffca28;
  --monster-primary-strong: #ff9800;
  --monster-bg: #f5f5f7;
  --monster-text: #222;
  --monster-muted: #6b7280;
}

/* LAYOUT GENERAL */
.monster-ayuda-page {
  position: relative;
  min-height: 100vh;
  background: var(--monster-bg);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 3rem 1rem;
  box-sizing: border-box;
}

/* CONTENEDOR PRINCIPAL */
.main-wrapper {
  width: 100%;
  max-width: 900px;
}

/* CARD PRINCIPAL */
.card {
  background-color: #ffffff;
  border-radius: .3rem;
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.17),
    0 0 0 1px rgba(148, 163, 184, 0.12);
  padding: 2rem;
  backdrop-filter: blur(6px);
}

/* HEADER CARD */
.card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.3);
  padding-bottom: 1.5rem;
}

.card-title-group {
}

.title {
  margin: 0;
  font-size: 1.8rem;
  line-height: 1.2;
  color: #111827;
}

.subtitle {
  margin-top: 0.4rem;
  font-size: 0.98rem;
  color: var(--monster-muted);
}

.main-image {
  width: 160px;
  max-width: 40%;
}

/* FORMULARIO */
.form-container {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.field-required {
  color: #ef4444;
  font-size: 0.8rem;
}

.field-hint {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--monster-muted);
}

/* INPUTS GENERALES */
.input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 0.55rem;
  border: 1px solid rgba(148, 163, 184, 0.7);
  font-size: 0.9rem;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
  background-color: #f9fafb;
}

.input::placeholder {
  color: #9ca3af;
}

.input:focus {
  border-color: var(--monster-primary-strong);
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.3);
  background-color: #ffffff;
}

.input-select {
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, #9ca3af 50%),
    linear-gradient(135deg, #9ca3af 50%, transparent 50%);
  background-position:
    calc(100% - 14px) calc(50% - 3px),
    calc(100% - 8px) calc(50% - 3px);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

.input-uppercase {
  text-transform: uppercase;
}

.textarea {
  min-height: 100px;
  resize: vertical;
}

/* GRID DATOS PERSONALES */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.25rem;
}

/* TAG PREVIEW */
.tag-preview {
  margin-top: 0.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background-color: rgba(15, 23, 42, 0.03);
}

.tag-circle {
  height: 0.9rem;
  width: 0.9rem;
  border-radius: 50%;
  border: 1px solid rgba(148, 163, 184, 0.7);
}

.tag-name {
  font-size: 0.8rem;
  color: #4b5563;
}

/* RATING */
.rating-section {
  padding: 0.75rem 0.9rem;
  border-radius: 0.75rem;
  background: linear-gradient(
    135deg,
    rgba(255, 193, 7, 0.06),
    rgba(56, 189, 248, 0.08)
  );
  border: 1px dashed rgba(148, 163, 184, 0.7);
}

.rating-stars {
  display: flex;
  gap: 0.35rem;
  margin-top: 0.4rem;
}

.star-button {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.15rem;
  transition: transform 0.1s ease;
}

.star-button:hover {
  transform: translateY(-1px) scale(1.03);
}

.star-icon {
  font-size: 1.8rem;
  color: #d1d5db;
}

.star-button.active .star-icon {
  color: #f59e0b;
}

/* PIE DE FORMULARIO */
.form-footer {
  margin-top: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.form-note {
  font-size: 0.8rem;
  color: var(--monster-muted);
}

/* BOTONES */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 999px;
  padding: 0.5rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  border: none;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition:
    transform 0.1s ease,
    box-shadow 0.15s ease,
    filter 0.1s ease;
  white-space: nowrap;
}

.btn-primary {
  background: var(--primary-color);
  color: #ffffff;
  border-radius: 0.3rem;
}

.btn-primary:hover {
  filter: brightness(1.03);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow:
    0 4px 12px rgba(245, 158, 11, 0.35),
    0 0 0 1px rgba(251, 191, 36, 0.7);
}

.btn-icon {
  font-size: 1.1rem;
}

/* DIÁLOGOS */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.55);
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.dialog-custom {
  width: 100%;
  max-width: 420px;
  background-color: #ffffff;
  border-radius: .3rem;
 
  animation: dialog-pop 0.22s ease-out;
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.9rem 1.4rem;
  background: linear-gradient(135deg, #0f172a, #1f2937);
  color: #f9fafb;
}

.dialog-header--success {
  background: linear-gradient(135deg, #16a34a, #22c55e);
}

/* Nuevo header rojo para errores */
.dialog-header--error {
  background: linear-gradient(135deg, #b91c1c, #ef4444);
}

.dialog-header-icon {
  font-size: 1.6rem;
}

.dialog-header-title {
  font-size: 1rem;
  font-weight: 600;
}

.dialog-content {
  padding: 1.4rem 1.6rem 1.2rem 1.6rem;
  text-align: center;
}

.dialog-text {
  margin: 0 0 0.75rem 0;
  font-size: 0.95rem;
  color: #374151;
}

.last-id {
  font-size: 2.4rem;
  font-weight: 800;
  color: #111827;
  letter-spacing: 0.08em;
  margin: 0.3rem 0 0.4rem 0;
}

.gracias-message {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 0.8rem;
  color: #111827;
}

.dialog-link {
  text-decoration: none;
}

/* ANIMACIONES */
@keyframes dialog-pop {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.98);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* RESET LOCAL */
h1,
h2,
h3,
p {
  margin: 0;
  padding: 0;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .monster-ayuda-page {
    padding: 2rem 1rem;
  }

  .card {
    padding: 1.5rem 1.3rem;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .main-image {
    align-self: center;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-footer {
    flex-direction: column-reverse;
    align-items: flex-start;
  }

  .form-note {
    text-align: left;
  }
}
</style>
