<template>
  <section class="resumen-conteo" aria-label="Resumen del conteo">
    <p class="resumen-conteo__progress" role="status" aria-live="polite">
      <strong>{{ contadas }} de {{ total }}</strong> líneas contadas
      <span v-if="total - contadas > 0">· faltan {{ total - contadas }} por contar</span>
      <span v-else>· todas contadas</span>
    </p>

    <div class="resumen-conteo__preview" aria-live="polite">
      <h4 class="resumen-conteo__title">Efecto previsto en stock al confirmar</h4>
      <ul class="resumen-conteo__list">
        <li>
          <span class="material-icons-round" aria-hidden="true">add_box</span>
          Se ingresarán <strong>{{ resumen.unidadesIngresables }}</strong> unidades en
          <strong>{{ resumen.conformes }}</strong> {{ resumen.conformes === 1 ? 'línea conforme' : 'líneas conformes' }}.
        </li>
        <li>
          <span class="material-icons-round" aria-hidden="true">report</span>
          <strong>{{ resumen.conNovedad }}</strong>
          {{ resumen.conNovedad === 1 ? 'línea quedará en novedad' : 'líneas quedarán en novedad' }}
          y no ingresará stock hasta resolverse.
        </li>
        <li v-if="resumen.sinContar > 0">
          <span class="material-icons-round" aria-hidden="true">hourglass_empty</span>
          <strong>{{ resumen.sinContar }}</strong> sin contar; la primera confirmación exige contar todas.
        </li>
      </ul>
      <p class="resumen-conteo__note">
        Es una previsualización del cliente; el servidor decide y registra las cantidades exactas.
      </p>
    </div>
  </section>
</template>

<script setup>
defineProps({
  total: { type: Number, default: 0 },
  contadas: { type: Number, default: 0 },
  resumen: {
    type: Object,
    default: () => ({ conformes: 0, conNovedad: 0, sinContar: 0, unidadesIngresables: '0.00' }),
  },
});
</script>

<style scoped>
.resumen-conteo {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resumen-conteo__progress {
  margin: 0;
  font-size: 0.9rem;
}

.resumen-conteo__title {
  margin: 0 0 6px;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-gray, #9e9e9e);
}

.resumen-conteo__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.84rem;
}

.resumen-conteo__list li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.resumen-conteo__list .material-icons-round {
  font-size: 17px;
  color: var(--text-gray, #9e9e9e);
}

.resumen-conteo__note {
  margin: 0;
  font-size: 0.74rem;
  color: var(--text-muted, #757575);
}
</style>
