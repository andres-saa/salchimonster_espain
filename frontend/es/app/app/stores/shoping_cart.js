import { defineStore } from 'pinia'


export const usecartStore = defineStore('salchi_supegsasr_cart_web443', {
  persist: {
    key: 'salchi_sup34er_gsacart_web4ddf43ssv',
    paths: ['cart', 'last_order', 'menu', 'address_details'],
  },

  state: () => ({
    currentProduct: {},
    currentSection: {},
    currentVideoIndex: 0,
    currentVideoTime: 0,
    discount_codes: [],

    visibles: {
      currentProduct: false,
      addAdditionToCart: false,
      loading: true,
      last_order: '',
    },

    cart: [],                 // cada item es un "pedido_*"
    address_details: {},
    last_order: '',
    sending_order: false,
    was_reserva: false,
  
  }),

  getters: {
    // 🔢 Total de ítems en el carrito (para el ícono del carrito, etc.)
    totalItems(state) {
      if (!Array.isArray(state.cart) || state.cart.length === 0) return 0
      return state.cart.reduce(
        (acc, p) => acc + (Number(p.pedido_cantidad) || 0),
        0,
      )
    },

    // 💰 Total del carrito con descuentos aplicados
    cartTotal(state) {
      if (!Array.isArray(state.cart) || state.cart.length === 0) return 0
      return state.cart.reduce(
        (total, product) => total + this.calculateTotalProduct(product),
        0,
      )
    },

    // ¿Existe un producto por ID (sin considerar modificadores)?
    isProductInCart: (state) => (productId) => {
      return state.cart.some(
        (item) => item.pedido_productoid === productId,
      )
    },

    // (por si la usas en algún lado, corregida para usar this)
    getProductTotal() {
      return (product) => {
        const productBasePrice = this.getProductPrice(product)
        let total = productBasePrice

        if (
          product.modificadorseleccionList &&
          product.modificadorseleccionList.length > 0
        ) {
          product.modificadorseleccionList.forEach((ad) => {
            const adPrice = parseInt(ad.pedido_precio) || 0
            const adQuantity =
              parseInt(ad.modificadorseleccion_cantidad) || 1
            total += adPrice * adQuantity
          })
        }

        return total * (product.pedido_cantidad || 1)
      }
    },

    // 🧮 Total de descuento aplicado (suma de pedido_descuento * cantidad)
    cartTotalDiscount(state) {
      if (!Array.isArray(state.cart) || state.cart.length === 0) return 0

      return state.cart.reduce((acc, p) => {
        const qty = Number(p.pedido_cantidad) || 1
        const disc = Number(p.pedido_descuento) || 0
        return acc + disc * qty
      }, 0)
    },

    // 💵 Subtotal SIN descuento (base + adiciones)
    cartSubtotal(state) {
      if (!Array.isArray(state.cart) || state.cart.length === 0) return 0
      return state.cart.reduce(
        (total, product) => total + this.calculateSubtotalProduct(product),
        0,
      )
    },
  },

  actions: {
    // ===== Helpers de precio =====

    // Subtotal de un producto (sin descuento): (base + adiciones) * cantidad
    calculateSubtotalProduct(product) {
      if (!product || typeof product !== 'object') return 0

      const {
        pedido_base_price = 0,
        pedido_cantidad = 1,
        modificadorseleccionList = [],
      } = product

      const basePrice = Number(pedido_base_price) || 0
      const cantidad = Number(pedido_cantidad) || 1

      const adiciones = Array.isArray(modificadorseleccionList)
        ? modificadorseleccionList.reduce(
            (
              total,
              {
                pedido_precio = 0,
                modificadorseleccion_cantidad = 1,
              },
            ) =>
              total +
              (Number(pedido_precio) || 0) *
                (Number(modificadorseleccion_cantidad) || 1),
            0,
          )
        : 0

      return (basePrice + adiciones) * cantidad
    },

    // Total de un producto con descuento aplicado:
    // ((base_price - pedido_descuento) + adiciones) * cantidad
    calculateTotalProduct(product) {
      if (!product || typeof product !== 'object') return 0

      const {
        pedido_base_price = 0,
        pedido_cantidad = 1,
        modificadorseleccionList = [],
        pedido_descuento = product.pedido_descuento || 0,
      } = product

      const basePrice =
        Number(pedido_base_price) - Number(pedido_descuento) || 0
      const cantidad = Number(pedido_cantidad) || 1

      const adiciones = Array.isArray(modificadorseleccionList)
        ? modificadorseleccionList.reduce(
            (
              total,
              {
                pedido_precio = 0,
                modificadorseleccion_cantidad = 1,
              },
            ) =>
              total +
              (Number(pedido_precio) || 0) *
                (Number(modificadorseleccion_cantidad) || 1),
            0,
          )
        : 0

      return (basePrice + adiciones) * cantidad
    },

    // ===== UI helpers =====

    setCurrentVideoIndex(index) {
      this.currentVideoIndex = index
    },
    setCurrentVideoTime(time) {
      this.currentVideoTime = time
    },

    setCurrentProduct(product) {
      this.currentProduct = product
    },
    setVisible(item, status) {
      this.visibles[item] = status
    },

    // ===== Identificadores / base price =====

    getProductId(product) {
      if (
        product.lista_presentacion &&
        product.lista_presentacion.length > 0
      ) {
        return product.lista_presentacion[0].producto_id
      } else if (product.producto_id) {
        return product.producto_id
      }
    },

    getProductPrice(product) {
      if (product.productogeneral_precio) {
        return Number(product.productogeneral_precio) || 0
      } else if (
        product.lista_presentacion &&
        product.lista_presentacion.length > 0
      ) {
        return (
          Number(product.lista_presentacion[0].producto_precio) || 0
        )
      }
      return 0
    },

    // firma = product_id + JSON de modificadores (id + cantidad)
    buildSignature(product_id, modificadores = []) {
      const aditions = modificadores.map((p) => ({
        id: p.modificadorseleccion_id,
        quantity: p.modificadorseleccion_cantidad,
      }))
      return `${product_id}-${JSON.stringify(aditions)}`
    },

    // ===== Carrito =====

    /**
     * addProductToCart
     * product: objeto del menú (productogeneral_*, lista_productobase, etc.)
     * quantity: cantidad a agregar
     * additionalItems: array de modificadores seleccionados
     *   { modificador_id, modificadorseleccion_id, modificadorseleccion_precio, modificadorseleccion_cantidad, modificadorseleccion_nombre }
     */
    addProductToCart(product, quantity = 1, additionalItems = []) {
      const basePrice = this.getProductPrice(product)

      const newProduct = {
        pedido_precio: basePrice,
        pedido_escombo: product.productogeneral_escombo,
        pedido_cantidad: quantity,
        pedido_base_price: basePrice,
        pedido_productoid: this.getProductId(product),
        pedido_descuento: Number(product.discount_amount || 0),

        // productos base del combo (si aplica)
        lista_productocombo: product.lista_productobase
          ? product.lista_productobase.map((p) => ({
              pedido_productoid: p.producto_id,
              pedido_cantidad: p.productocombo_cantidad,
              pedido_precio: p.productocombo_precio,
              pedido_nombre: p.producto_descripcion,
            }))
          : [],

        pedido_nombre_producto: product.productogeneral_descripcion,

        // adiciones / modificadores seleccionados
        modificadorseleccionList: additionalItems.map((add) => ({
          modificador_id: add.modificador_id,
          modificadorseleccion_id: add.modificadorseleccion_id,
          pedido_precio: add.modificadorseleccion_precio,
          modificadorseleccion_cantidad:
            add.modificadorseleccion_cantidad || 1,
          modificadorseleccion_nombre: add.modificadorseleccion_nombre,
        })),

        productogeneral_urlimagen: product.productogeneral_urlimagen,
      }

      const signature = this.buildSignature(
        newProduct.pedido_productoid,
        newProduct.modificadorseleccionList,
      )
      newProduct.signature = signature

      const existIndex = this.cart.findIndex(
        (p) => p.signature === signature,
      )

      if (existIndex !== -1) {
        const existingProduct = this.cart[existIndex]
        existingProduct.pedido_cantidad += quantity
      } else {
        this.cart.push(newProduct)
      }
    },

    removeProductFromCart(signature) {
      const existIndex = this.cart.findIndex(
        (p) => p.signature === signature,
      )
      if (existIndex !== -1) {
        this.cart.splice(existIndex, 1)
      }
    },

    decrementProduct(signature) {
      const existIndex = this.cart.findIndex(
        (p) => p.signature === signature,
      )
      if (existIndex !== -1) {
        const existingProduct = this.cart[existIndex]
        existingProduct.pedido_cantidad -= 1
        if (existingProduct.pedido_cantidad <= 0) {
          this.cart.splice(existIndex, 1)
        }
      }
    },

    incrementProduct(signature) {
      const existIndex = this.cart.findIndex(
        (p) => p.signature === signature,
      )
      if (existIndex !== -1) {
        const existingProduct = this.cart[existIndex]
        existingProduct.pedido_cantidad += 1
      }
    },

    // ===== Adicionales dentro del producto =====

    incrementAdditional(signature, additionalItem) {
      const existIndex = this.cart.findIndex(
        (p) => p.signature === signature,
      )
      if (existIndex !== -1) {
        const existingProduct = this.cart[existIndex]
        const aditional =
          existingProduct.modificadorseleccionList.find(
            (a) => a === additionalItem,
          )
        if (aditional) {
          aditional.modificadorseleccion_cantidad++
        }
      }
    },

    decrementAdditional(signature, additionalItem) {
      const existIndex = this.cart.findIndex(
        (p) => p.signature === signature,
      )
      if (existIndex !== -1) {
        const existingProduct = this.cart[existIndex]
        const aditionalIndex =
          existingProduct.modificadorseleccionList.findIndex(
            (a) => a === additionalItem,
          )

        if (aditionalIndex !== -1) {
          const target =
            existingProduct.modificadorseleccionList[aditionalIndex]
          target.modificadorseleccion_cantidad--

          if (target.modificadorseleccion_cantidad < 1) {
            existingProduct.modificadorseleccionList.splice(
              aditionalIndex,
              1,
            )
          }
        }
      }
    },
  },
})
