<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
  product: {
    type: Object,
    required: true
  },
  categoryId: {
    type: [Number, String],
    required: true
  },
  imageBaseUrl: {
    type: String,
    required: true
  },
  // callback del padre para registrar el ref y usar los observers
  setProductRef: {
    type: Function,
    required: true
  },
  // idioma opcional, por defecto ES. Si luego quieres puedes pasarlo desde arriba.
  lang: {
    type: String,
    default: 'es'
  }
})

const emit = defineEmits(['click', 'add-to-cart'])

const rootEl = ref(null)

// === Utils ===
const normalizeSpaces = (str) =>
  String(str || '')
    // 1) Comas: sin espacios antes y uno después
    .replace(/\s*,\s*/g, ', ')
    // 2) '+' con espacios cuando está entre letras/números
    .replace(/([\p{L}\p{N}])\+([\p{L}\p{N}])/gu, '$1 + $2')
    // 3) Colapsar espacios múltiples
    .replace(/ {2,}/g, ' ')
    // 4) Limpiar espacio antes de coma
    .replace(/ \,/g, ',')
    .trim()

const currentLang = computed(() => (props.lang || 'es').toLowerCase())

const formatCOP = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value || 0))

// === Nombre mostrado (ES / EN) ===
// 🔧 Corregido: ahora el título usa primero NOMBRE y no la descripción.
const displayName = computed(() => {
  const p = props.product

  if (currentLang.value === 'es') {
    return normalizeSpaces(
      // 1) Nombre principal para la carta / sistema
      p.productogeneral_descripcion ||
      // 2) Nombre interno del producto
      p.product_name ||
      // 3) Nombre/descripcion web como último fallback
      p.productogeneral_descripcionweb ||
      ''
    )
  }

  // Inglés: nombre inglés si existe, si no el nombre interno
  return normalizeSpaces(
    p.english_name ||
    p.product_name ||
    ''
  )
})

// === Descripción cruda (ES / EN) ===
// 🔧 Corregido para que no vuelva a reutilizar el mismo campo del nombre como primera opción.
const rawDescription = computed(() => {
  const p = props.product

  if (currentLang.value === 'es') {
    return (
      // descripción adicional corta
      p.productogeneral_descripcionadicional ||
      // descripción pensada para la web
      p.productogeneral_descripcionweb ||
      ''
    )
  }

  return (
    p.english_description ||
    p.productogeneral_descripcionweb ||
    ''
  )
})

const truncatedDescription = computed(() => {
  const desc = String(rawDescription.value || '')
  if (!desc) {
    return currentLang.value === 'es'
      ? 'Sin descripción'
      : 'No description'
  }
  return desc.length > 100 ? desc.substring(0, 100) + '...' : desc
})

// === Precios y descuentos ===
const discountAmount = computed(() =>
  Number(props.product.discount_amount || 0)
)
const discountPercent = computed(() =>
  Number(props.product.discount_percent || 0)
)
const hasDiscount = computed(
  () => discountAmount.value > 0 && discountPercent.value > 0
)

// precio base:
// 1) si tiene presentaciones -> primera presentación
// 2) si no, productogeneral_precio
// 3) si no, `price` mapeado
const basePrice = computed(() => {
  const p = props.product

  const presentationPrice = Number(
    p.lista_presentacion?.[0]?.producto_precio ?? 0
  )

  if (presentationPrice > 0) {
    return presentationPrice
  }

  const generalPrice = Number(p.productogeneral_precio ?? 0)
  if (generalPrice > 0) {
    return generalPrice
  }

  return Number(p.price ?? 0)
})

const finalPrice = computed(() => {
  const base = basePrice.value
  const disc = discountAmount.value
  const out = base - disc
  return out > 0 ? out : base
})

const showOriginalPrice = computed(
  () => hasDiscount.value && basePrice.value > 0
)

// === Combo / sabores ===
const isCombo = computed(() => {
  if (props.product.is_combo != null) return !!props.product.is_combo
  return String(props.product.productogeneral_escombo || '') === '1'
})

const maxFlavor = computed(() =>
  Number(props.product.max_flavor || 0)
)

// === Imagen ===
const fullImageUrl = computed(() => {
  const p = props.product

  // Prioridad 1: URL de Salchimonster
  if (p.productogeneral_urlimagen) {
    return `https://img.restpe.com/${p.productogeneral_urlimagen}`
  }

  // Prioridad 2: image_url ya mapeada
  if (p.image_url) {
    if (p.image_url.startsWith('http')) {
      return p.image_url
    }
    return `${props.imageBaseUrl}/${p.image_url}`
  }

  // Prioridad 3: img_identifier (Tezo's Pizza)
  if (p.img_identifier) {
    return `${props.imageBaseUrl}/read-photo-product/${p.img_identifier}/600`
  }

  // Fallback
  return `${props.imageBaseUrl}/placeholder.png`
})

// === Interacción ===
const handleClick = () => {
  emit('click')
}

const handleKeyUp = (event) => {
  if (event.key === 'Enter') {
    emit('click')
  }
}

// El padre decide qué hacer (abrir modal, agregar al carrito, etc.)
const handleAddToCart = () => {
  emit('add-to-cart', props.product)
}

onMounted(() => {
  if (rootEl.value) {
    props.setProductRef(props.product.id, props.categoryId, rootEl.value)
  }
})

onBeforeUnmount(() => {
  // pasar null para limpiar el observer en el padre
  props.setProductRef(props.product.id, props.categoryId, null)
})
</script>

<template>
  <article
    ref="rootEl"
    class="menu-product-card"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keyup="handleKeyUp"
  >
    <div class="menu-product-card__image-wrapper">
      <img
        class="menu-product-card__image"
        :src="fullImageUrl"
        :alt="displayName"
        loading="lazy"
      />
      <!-- Botón flotante + -->
      <button
        type="button"
        class="menu-product-card__add-btn"
        @click.stop="handleAddToCart"
        aria-label="Agregar al carrito"
      >
        +
      </button>
    </div>

    <div class="menu-product-card__body">
      <h3 class="menu-product-card__name">
        {{ displayName }}
      </h3>

      <p class="menu-product-card__desc">
        {{ truncatedDescription }}
      </p>

      <div class="menu-product-card__footer">
        <!-- Bloque precios -->
        <div class="menu-product-card__price-block">
          <span
            v-if="showOriginalPrice"
            class="menu-product-card__price menu-product-card__price--old"
          >
            {{ formatCOP(basePrice) }}
          </span>

          <span class="menu-product-card__price">
            {{ formatCOP(finalPrice) }}
          </span>
        </div>

        <!-- Badges: descuento / combo / sabores -->
        <div class="menu-product-card__badges">
          <!-- Descuento (ES / EN) -->
          <span
            v-if="hasDiscount && currentLang === 'es'"
            class="menu-product-card__tag menu-product-card__tag--discount"
          >
            {{ discountPercent }}% • -{{ formatCOP(discountAmount) }}
          </span>

          <span
            v-else-if="hasDiscount && currentLang === 'en'"
            class="menu-product-card__tag menu-product-card__tag--discount"
          >
            {{ discountPercent }}% Off • Save {{ formatCOP(discountAmount) }}
          </span>

          <!-- Si no hay descuento, volvemos a tus tags anteriores -->
          <span
            v-else-if="isCombo"
            class="menu-product-card__tag menu-product-card__tag--combo"
          >
            Combo
          </span>

          <span
            v-else-if="maxFlavor > 1"
            class="menu-product-card__tag menu-product-card__tag--flavors"
          >
            Hasta {{ maxFlavor }} sabores
          </span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.menu-product-card {
  background: #ffffff;
  border-radius: 0.3rem;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 190px;
  cursor: pointer;
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.4s ease-out,
    transform 0.4s ease-out,
    box-shadow 0.12s ease,
    border-color 0.12s ease;
}

/* estados usados por el observer del padre */
.menu-product-card--hidden {
  opacity: 0;
  transform: translateX(-16px);
}

.menu-product-card--visible {
  opacity: 1;
  transform: translateX(0);
}

.menu-product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 35px rgba(15, 23, 42, 0.15);
  border-color: #fecaca;
}

.menu-product-card__image-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: #f3f4f6;
}

.menu-product-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Botón flotante + */
.menu-product-card__add-btn {
  position: absolute;
  right: 0.6rem;
  bottom: 0.6rem;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: none;
  background: #dc2626;
  color: #ffffff;
  font-size: 1.2rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    background-color 0.15s ease;
}

.menu-product-card__add-btn:hover {
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
  background: #b91c1c;
}

/* BODY */
.menu-product-card__body {
  padding: 0.7rem 0.8rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.menu-product-card__name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
}

.menu-product-card__desc {
  margin: 0;
  font-size: 0.78rem;
  color: #6b7280;
  max-height: 3.2em;
  overflow: hidden;
  text-overflow: ellipsis;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* FOOTER */
.menu-product-card__footer {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.menu-product-card__price-block {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.menu-product-card__price {
  font-size: 0.98rem;
  font-weight: 700;
  color: #b91c1c;
}

.menu-product-card__price--old {
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  text-decoration: line-through;
  opacity: 0.7;
}

.menu-product-card__badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
}

.menu-product-card__tag {
  font-size: 0.7rem;
  padding: 0.18rem 0.6rem;
  border-radius: 999px;
  text-transform: none;
  letter-spacing: 0.06em;
  border: 1px solid #d1d5db;
  color: #374151;
  background: #f9fafb;
}

.menu-product-card__tag--combo {
  border-color: #bbf7d0;
  color: #166534;
  background: #dcfce7;
}

.menu-product-card__tag--flavors {
  border-color: #bfdbfe;
  color: var(--secondary-color, #1d4ed8);
  background: #dbeafe;
}

.menu-product-card__tag--discount {
  border-color: #fecaca;
  color: #b91c1c;
  background: #fee2e2;
}

/* 📱 RESPONSIVE MÓVIL */
@media (max-width: 768px) {
  .menu-product-card {
    border-radius: 0.7rem;
    min-height: 0;
  }

  .menu-product-card__body {
    padding: 0.5rem 0.5rem 0.6rem;
    gap: 0.25rem;
  }

  .menu-product-card__name {
    font-size: 0.8rem;
  }

  .menu-product-card__desc {
    font-size: 0.68rem;
    line-height: 1.1;
  }

  .menu-product-card__price {
    font-size: 0.8rem;
  }

  .menu-product-card__tag {
    font-size: 0.6rem;
    padding: 0.14rem 0.45rem;
  }

  .menu-product-card__add-btn {
    width: 1.7rem;
    height: 1.7rem;
    font-size: 1rem;
  }
}
</style>
