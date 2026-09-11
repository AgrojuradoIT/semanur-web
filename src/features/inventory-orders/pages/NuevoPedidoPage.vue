<template>
  <div class="nuevo-pedido-page">
    <header class="page-header">
      <div>
        <h1 class="page-title">{{ esRevision ? `Revisar pedido ${order?.numero ?? ''}` : 'Nuevo pedido' }}</h1>
        <p class="page-subtitle">
          Los documentos y el OCR no mueven stock: la recepción física de bodega es la única puerta de ingreso.
        </p>
      </div>
      <LineaEstadoBadge v-if="order" :estado="order.estado" tipo="pedido" />
    </header>

    <p v-if="error" class="page-alert page-alert--error" role="alert">
      {{ error.displayMessage || error.message || 'Ocurrió un error en el borrador.' }}
    </p>
    <p v-if="successMessage" class="page-alert page-alert--ok" role="status" aria-live="polite">
      {{ successMessage }}
    </p>

    <form v-if="!order" class="borrador-form" @submit.prevent="crearBorrador">
      <section class="borrador-form__section" aria-labelledby="datos-pedido">
        <h2 id="datos-pedido" class="borrador-form__title">1. Datos del pedido</h2>
        <div class="borrador-form__grid">
          <div class="form-field">
            <label for="bodega-destino">Bodega destino (selección explícita)</label>
            <select id="bodega-destino" v-model="form.bodegaId" required>
              <option value="" disabled>Seleccionar bodega…</option>
              <option v-for="bodega in bodegas" :key="bodega.bodega_id" :value="bodega.bodega_id">
                {{ bodega.nombre }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label for="proveedor-confirmado">Proveedor confirmado</label>
            <input id="proveedor-confirmado" v-model="form.proveedorConfirmado" type="text" autocomplete="off" maxlength="255">
          </div>
          <div class="form-field">
            <label for="referencia-factura">Referencia de factura (opcional)</label>
            <input id="referencia-factura" v-model="form.referenciaFactura" type="text" autocomplete="off" maxlength="120">
          </div>
          <div class="form-field">
            <label for="proveedor-clave">Clave de proveedor (opcional, ayuda a detectar duplicados)</label>
            <input id="proveedor-clave" v-model="form.proveedorClave" type="text" autocomplete="off" maxlength="120">
          </div>
        </div>
      </section>

      <section class="borrador-form__section" aria-labelledby="lineas-pedido">
        <h2 id="lineas-pedido" class="borrador-form__title">2. Líneas esperadas</h2>
        <p class="borrador-form__hint">
          Puedes crearlas manualmente ahora y reemplazarlas con los candidatos del OCR después.
          Nunca se ingresa stock desde esta pantalla.
        </p>
        <p v-if="form.lineas.length === 0" class="borrador-form__empty">
          Agrega al menos una línea o espera los candidatos del OCR.
        </p>
        <ul v-else class="lineas-editor" aria-label="Líneas del borrador">
          <li v-for="(linea, index) in form.lineas" :key="linea.key" class="lineas-editor__item">
            <span class="lineas-editor__orden">{{ index + 1 }}</span>
            <div class="form-field">
              <label :for="`linea-sku-${index}`">SKU</label>
              <input :id="`linea-sku-${index}`" v-model="linea.sku_confirmado" type="text" autocomplete="off" spellcheck="false" @input="marcarDirty">
            </div>
            <div class="form-field">
              <label :for="`linea-desc-${index}`">Descripción</label>
              <input :id="`linea-desc-${index}`" v-model="linea.descripcion_confirmada" type="text" autocomplete="off" @input="marcarDirty">
            </div>
            <div class="form-field form-field--short">
              <label :for="`linea-cant-${index}`">Cantidad esperada</label>
              <input :id="`linea-cant-${index}`" v-model="linea.cantidad_esperada" type="text" inputmode="decimal" autocomplete="off" @input="marcarDirty">
            </div>
            <div class="form-field form-field--short">
              <label :for="`linea-unidad-${index}`">Unidad</label>
              <input :id="`linea-unidad-${index}`" v-model="linea.unidad" type="text" autocomplete="off" @input="marcarDirty">
            </div>
            <button type="button" class="icon-btn" :aria-label="`Quitar línea ${index + 1}`" @click="quitarLinea(index)">
              <span class="material-icons-round" aria-hidden="true">delete</span>
            </button>
          </li>
        </ul>
        <button type="button" class="ghost-btn" @click="agregarLinea">
          <span class="material-icons-round" aria-hidden="true">add</span> Agregar línea manual
        </button>
      </section>

      <footer class="borrador-form__footer">
        <button type="submit" class="primary-btn" :disabled="saving">
          {{ saving ? 'Creando…' : 'Crear borrador' }}
        </button>
      </footer>
    </form>

    <template v-else>
      <section class="borrador-form__section" aria-labelledby="documentos-pedido">
        <h2 id="documentos-pedido" class="borrador-form__title">3. Documentos</h2>
        <div class="documentos-grid">
          <DocumentUploader
            rol="pantallazo_siigo"
            title="Pantallazos de Siigo"
            hint="Fuente del OCR. Se conservan como evidencia privada."
            :uploads="uploads.pantallazo_siigo"
            :documentos="documentosVigentes"
            :disabled="!esBorrador"
            @upload="subirDocumento"
            @preview="abrirPreview"
          />
          <DocumentUploader
            rol="factura"
            title="Facturas del proveedor"
            hint="Obligatoria para publicar; se compara manualmente."
            :uploads="uploads.factura"
            :documentos="documentosVigentes"
            :disabled="!esBorrador"
            @upload="subirDocumento"
            @preview="abrirPreview"
          />
        </div>
      </section>

      <section class="borrador-form__section" aria-labelledby="ocr-pedido">
        <h2 id="ocr-pedido" class="borrador-form__title">4. Revisión de candidatos</h2>
        <OcrReviewPanel
          :order-uuid="pedidoUuid"
          :ocr="ocr"
          :documentos="documentosVigentes"
          :reprocessing="reprocesando"
          @apply="aplicarCandidato"
          @reprocess="reprocesar"
        />
      </section>

      <section class="borrador-form__section" aria-labelledby="lineas-revision">
        <h2 id="lineas-revision" class="borrador-form__title">5. Líneas del pedido (revisión contable)</h2>
        <ul v-if="form.lineas.length > 0" class="lineas-editor" aria-label="Líneas revisadas">
          <li v-for="(linea, index) in form.lineas" :key="linea.key" class="lineas-editor__item">
            <span class="lineas-editor__orden">{{ index + 1 }}</span>
            <div class="form-field">
              <label :for="`rev-sku-${index}`">SKU confirmado</label>
              <input :id="`rev-sku-${index}`" v-model="linea.sku_confirmado" type="text" autocomplete="off" spellcheck="false" @input="marcarDirty">
              <p v-if="linea.sku_raw" class="form-field__raw">OCR: {{ linea.sku_raw }}</p>
            </div>
            <div class="form-field">
              <label :for="`rev-desc-${index}`">Descripción confirmada</label>
              <input :id="`rev-desc-${index}`" v-model="linea.descripcion_confirmada" type="text" autocomplete="off" @input="marcarDirty">
            </div>
            <div class="form-field form-field--short">
              <label :for="`rev-cant-${index}`">Cantidad esperada</label>
              <input :id="`rev-cant-${index}`" v-model="linea.cantidad_esperada" type="text" inputmode="decimal" autocomplete="off" @input="marcarDirty">
            </div>
            <div class="form-field form-field--short">
              <label :for="`rev-unidad-${index}`">Unidad</label>
              <input :id="`rev-unidad-${index}`" v-model="linea.unidad" type="text" autocomplete="off" @input="marcarDirty">
            </div>
            <button type="button" class="icon-btn" :aria-label="`Quitar línea ${index + 1}`" @click="quitarLinea(index)">
              <span class="material-icons-round" aria-hidden="true">delete</span>
            </button>
          </li>
        </ul>
        <p v-else class="borrador-form__empty">Sin líneas todavía. Usa los candidatos del OCR o agrega una manual.</p>
        <button type="button" class="ghost-btn" @click="agregarLinea">
          <span class="material-icons-round" aria-hidden="true">add</span> Agregar línea manual
        </button>
      </section>

      <footer class="borrador-form__footer">
        <button type="button" class="ghost-btn" :disabled="saving || !esBorrador" @click="guardarCambios">
          <span class="material-icons-round" aria-hidden="true">save</span>
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </button>
        <button type="button" class="primary-btn" :disabled="publishing || !puedePublicar" @click="publicar">
          <span class="material-icons-round" aria-hidden="true">send</span>
          {{ publishing ? 'Publicando…' : 'Publicar pedido' }}
        </button>
      </footer>

      <p v-if="!puedePublicar" class="borrador-form__hint" role="note">
        Para publicar se exige proveedor confirmado, al menos una línea válida, pantallazo y factura
        vigentes, bodega y un receptor habilitado en el servidor.
      </p>
    </template>

    <UiModal
      :model-value="conflictosPublicacion.length > 0"
      title="Posible compra duplicada"
      size="md"
      @update:model-value="cerrarConflicto"
    >
      <p>
        El servidor detectó documentos o datos compatibles con pedidos existentes. Si esta compra es
        realmente distinta, deja el motivo auditado (mínimo 10 caracteres).
      </p>
      <ul class="conflicto-lista">
        <li v-for="candidato in conflictosPublicacion" :key="candidato.pedido_uuid">
          {{ candidato.numero || candidato.pedido_uuid }} · {{ candidato.estado }}
          <span v-if="candidato.motivos?.length"> · {{ candidato.motivos.join(', ') }}</span>
        </li>
      </ul>
      <div class="form-field">
        <label for="motivo-compra-distinta">Motivo de compra distinta</label>
        <textarea id="motivo-compra-distinta" v-model="motivoCompraDistinta" rows="3" minlength="10"></textarea>
      </div>
      <template #footer>
        <button type="button" class="ghost-btn" @click="cerrarConflicto">Cancelar</button>
        <button type="button" class="primary-btn" :disabled="motivoCompraDistinta.trim().length < 10" @click="publicarCompraDistinta">
          Publicar como compra distinta
        </button>
      </template>
    </UiModal>

    <UiModal
      :model-value="Boolean(previewDocumento)"
      :title="previewDocumento ? `Evidencia · ${previewDocumento.rol === 'factura' ? 'Factura' : 'Pantallazo'}` : 'Evidencia'"
      size="lg"
      @update:model-value="previewDocumento = null"
    >
      <EvidenciaViewer
        v-if="previewDocumento"
        :order-uuid="pedidoUuid"
        :documentos="[previewDocumento]"
        tabs-label="Evidencia seleccionada"
      />
    </UiModal>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';

import DocumentUploader from '../components/DocumentUploader.vue';
import EvidenciaViewer from '../components/EvidenciaViewer.vue';
import LineaEstadoBadge from '../components/LineaEstadoBadge.vue';
import OcrReviewPanel from '../components/OcrReviewPanel.vue';
import { UiModal } from '../../../shared/components/ui';
import { useOrderDraft } from '../composables/useOrderDraft';
import { esPedidoEditable } from '../utils/orders';

const route = useRoute();
const router = useRouter();
const draft = useOrderDraft();

const {
  loading,
  saving,
  publishing,
  order,
  pedidoUuid,
  bodegas,
  form,
  esBorrador,
  documentosVigentes,
  uploads,
  ocr,
  error,
  successMessage,
  conflictosPublicacion,
  dirty,
  puedePublicar,
  marcarDirty,
  cargarCatalogos,
  cargarPedido,
  crearBorrador,
  guardarCambios,
  subirDocumento,
  reintentarOcr,
  agregarLinea,
  agregarLineaDesdeCandidato,
  quitarLinea,
  publicar,
} = draft;

const reprocesando = ref(false);
const previewDocumento = ref(null);
const motivoCompraDistinta = ref('');

const esRevision = computed(() => Boolean(route.params.uuid));
const ordenOriginal = computed(() => route.params.uuid ?? null);

async function cargar() {
  await cargarCatalogos();

  if (route.params.uuid) {
    await cargarPedido(route.params.uuid).catch(() => {});
  }
}

function aplicarCandidato({ candidato, overrides }) {
  agregarLineaDesdeCandidato(candidato, overrides);
}

async function reprocesar(documentoId) {
  reprocesando.value = true;

  try {
    await reintentarOcr(documentoId);
  } finally {
    reprocesando.value = false;
  }
}

function abrirPreview(documento) {
  previewDocumento.value = documento;
}

function cerrarConflicto() {
  conflictosPublicacion.splice(0, conflictosPublicacion.length);
}

async function publicarCompraDistinta() {
  await publicar({ motivoCompraDistinta: motivoCompraDistinta.value.trim() });
  motivoCompraDistinta.value = '';
}

function antesDeSalir(event) {
  if (!dirty.value) return;
  event.preventDefault();
  event.returnValue = 'Hay cambios sin guardar en el borrador.';
}

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true;

  return window.confirm('Hay cambios sin guardar en el borrador. ¿Salir de todos modos?');
});

onMounted(() => {
  window.addEventListener('beforeunload', antesDeSalir);
  cargar();
});

onBeforeUnmount(() => window.removeEventListener('beforeunload', antesDeSalir));

watch(() => route.params.uuid, (uuid) => {
  if (uuid && uuid !== pedidoUuid.value) {
    cargarPedido(uuid).catch(() => {});
  }

  if (!uuid && !esPedidoEditable(order.value?.estado ?? 'borrador')) {
    router.replace({ name: 'inventory-orders' });
  }
});
</script>

<style scoped>
.nuevo-pedido-page {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 1.35rem;
}

.page-subtitle {
  margin: 4px 0 0;
  font-size: 0.85rem;
  color: var(--text-gray, #9e9e9e);
}

.page-alert {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
}

.page-alert--error {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.4);
  color: #ff9a94;
}

.page-alert--ok {
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.4);
  color: #9ae6a0;
}

.borrador-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.borrador-form__section {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 14px;
}

.borrador-form__title {
  margin: 0 0 10px;
  font-size: 1rem;
}

.borrador-form__hint {
  margin: 0 0 10px;
  font-size: 0.8rem;
  color: var(--text-gray, #9e9e9e);
}

.borrador-form__empty {
  margin: 0 0 10px;
  font-size: 0.85rem;
  color: var(--text-gray, #9e9e9e);
}

.borrador-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.form-field label {
  font-size: 0.78rem;
  color: var(--text-gray, #9e9e9e);
}

.form-field input,
.form-field select,
.form-field textarea {
  min-height: 40px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: var(--surface-2, #2c2c2c);
  color: var(--text-main, #f5f5f5);
  font-size: 0.85rem;
}

.form-field--short {
  max-width: 180px;
}

.form-field__raw {
  margin: 0;
  font-size: 0.72rem;
  color: var(--text-muted, #757575);
}

.lineas-editor {
  list-style: none;
  margin: 0 0 10px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.lineas-editor__item {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  background: var(--surface-2, #2c2c2c);
}

.lineas-editor__orden {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--surface, #1e1e1e);
  font-size: 0.8rem;
  font-weight: 700;
}

.lineas-editor__item .form-field {
  flex: 1 1 160px;
}

.documentos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
}

.borrador-form__footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  position: sticky;
  bottom: 0;
  padding: 10px 0;
  background: linear-gradient(180deg, transparent, var(--background, #121212) 40%);
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 42px;
  padding: 8px 18px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.86rem;
  cursor: pointer;
}

.primary-btn {
  background: var(--primary, #2b8cee);
  border: 1px solid var(--primary, #2b8cee);
  color: #fff;
}

.ghost-btn {
  background: transparent;
  border: 1px solid var(--border, #3a3a3a);
  color: var(--text-main, #f5f5f5);
}

.primary-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border, #3a3a3a);
  background: transparent;
  color: #ff9a94;
  cursor: pointer;
}

.conflicto-lista {
  margin: 8px 0;
  padding-left: 18px;
  font-size: 0.85rem;
}
</style>
