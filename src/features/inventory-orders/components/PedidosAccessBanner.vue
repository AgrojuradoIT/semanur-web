<template>
  <section v-if="visible" class="inventory-orders-access" aria-label="Pedidos de compra">
    <p class="inventory-orders-access__text">
      Compra documental: carga el pantallazo y la factura, revisa el OCR y recibe en bodega.
      La importación CSV sigue disponible en Inventario hasta el corte de U9.
    </p>
    <div class="inventory-orders-access__actions">
      <RouterLink class="inventory-orders-access__link" :to="{ name: 'inventory-orders' }">
        Pedidos
      </RouterLink>
      <RouterLink
        v-if="puedeCrear"
        class="inventory-orders-access__link inventory-orders-access__link--primary"
        :to="{ name: 'inventory-orders-new' }"
      >
        Nuevo pedido
      </RouterLink>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { useAuthStore } from '../../../shared/stores/auth';
import { isInventoryOrdersFeatureEnabled } from '../utils/flag';

/**
 * Punto de entrada aditivo desde Inventario (plan §12): sustituye visualmente
 * el viejo flujo CSV cuando el flag y el permiso lo permiten, sin retirar el
 * importador (el corte es U9).
 */
const auth = useAuthStore();
const visible = computed(() => isInventoryOrdersFeatureEnabled() && auth.hasPermission('pedidos.read'));
const puedeCrear = computed(() => visible.value && auth.hasPermission('pedidos.create'));
</script>

<style scoped>
.inventory-orders-access {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0 0 12px;
  padding: 10px 14px;
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
}

.inventory-orders-access__text {
  margin: 0;
  font-size: 0.82rem;
  color: var(--text-gray, #9e9e9e);
  max-width: 70ch;
}

.inventory-orders-access__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.inventory-orders-access__link {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  color: var(--text-main, #f5f5f5);
  text-decoration: none;
  font-size: 0.82rem;
  font-weight: 600;
}

.inventory-orders-access__link--primary {
  border-color: var(--primary, #2b8cee);
  background: var(--primary, #2b8cee);
  color: #fff;
}
</style>
