<template>
  <section class="document-uploader" :aria-label="title">
    <header class="document-uploader__header">
      <h3 class="document-uploader__title">{{ title }}</h3>
      <p class="document-uploader__hint">{{ hint }}</p>
    </header>

    <label class="document-uploader__picker" :class="{ 'is-disabled': disabled || uploading }">
      <span class="material-icons-round" aria-hidden="true">upload_file</span>
      <span>{{ uploading ? 'Subiendo…' : 'Seleccionar imágenes' }}</span>
      <input
        ref="inputRef"
        type="file"
        class="document-uploader__input"
        accept="image/jpeg,image/png"
        multiple
        :disabled="disabled || uploading"
        @change="onChange"
      >
    </label>

    <p class="document-uploader__formats">JPEG o PNG. La evidencia se guarda en almacenamiento privado autorizado.</p>

    <ul v-if="uploads.length > 0" class="document-uploader__list" aria-live="polite">
      <li v-for="item in uploads" :key="item.id" class="document-uploader__item">
        <div class="document-uploader__item-info">
          <span class="document-uploader__name">{{ item.name }}</span>
          <span class="document-uploader__state" :data-state="item.state">
            {{ estadoTexto(item) }}
          </span>
        </div>
        <progress
          v-if="item.state === 'uploading'"
          class="document-uploader__progress"
          :value="item.progress"
          max="100"
          :aria-label="`Progreso de ${item.name}`"
        >{{ item.progress }}%</progress>
        <p v-if="item.state === 'error'" class="document-uploader__error" role="alert">
          {{ item.error?.displayMessage || 'No fue posible subir el archivo.' }}
        </p>
        <button
          v-if="item.state === 'done' && item.documento"
          type="button"
          class="document-uploader__link"
          @click="emit('preview', item.documento)"
        >
          Ver evidencia
        </button>
      </li>
    </ul>

    <div v-if="vigentes.length > 0" class="document-uploader__vigentes">
      <h4 class="document-uploader__subtitle">Vigentes</h4>
      <ul class="document-uploader__list">
        <li v-for="documento in vigentes" :key="documento.id" class="document-uploader__item">
          <span>Revisión {{ documento.revision }}</span>
          <button type="button" class="document-uploader__link" @click="emit('preview', documento)">
            Ver evidencia
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  rol: { type: String, required: true },
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  uploads: { type: Array, default: () => [] },
  documentos: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['upload', 'preview', 'retry']);

const inputRef = ref(null);

const uploading = computed(() => props.uploads.some((item) => item.state === 'uploading'));
const vigentes = computed(() => props.documentos.filter((documento) => documento.rol === props.rol));

function onChange(event) {
  const files = Array.from(event.target.files ?? []);

  for (const file of files) {
    emit('upload', { rol: props.rol, file });
  }

  if (inputRef.value) inputRef.value.value = '';
}

function estadoTexto(item) {
  switch (item.state) {
    case 'uploading':
      return `Subiendo ${item.progress}%`;
    case 'done':
      return item.documento?.rol === 'pantallazo_siigo' ? 'Subido · OCR en cola' : 'Subido';
    case 'error':
      return 'Error de carga';
    default:
      return 'En espera';
  }
}
</script>

<style scoped>
.document-uploader {
  border: 1px solid var(--border, #3a3a3a);
  border-radius: 10px;
  background: var(--surface, #1e1e1e);
  padding: 14px;
}

.document-uploader__title {
  margin: 0 0 4px;
  font-size: 0.95rem;
}

.document-uploader__hint {
  margin: 0 0 10px;
  font-size: 0.8rem;
  color: var(--text-gray, #9e9e9e);
}

.document-uploader__picker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px dashed var(--primary, #2b8cee);
  background: rgba(43, 140, 238, 0.08);
  color: var(--text-main, #f5f5f5);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
}

.document-uploader__picker.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.document-uploader__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.document-uploader__picker:focus-within {
  outline: 2px solid var(--primary, #2b8cee);
  outline-offset: 2px;
}

.document-uploader__formats {
  margin: 8px 0 0;
  font-size: 0.75rem;
  color: var(--text-muted, #757575);
}

.document-uploader__list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.document-uploader__item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: space-between;
  padding: 6px 8px;
  border-radius: 8px;
  background: var(--surface-2, #2c2c2c);
  font-size: 0.8rem;
}

.document-uploader__item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.document-uploader__name {
  overflow-wrap: anywhere;
}

.document-uploader__state[data-state='done'] {
  color: #9ae6a0;
}

.document-uploader__state[data-state='error'] {
  color: #ff9a94;
}

.document-uploader__progress {
  width: 100%;
  height: 6px;
}

.document-uploader__error {
  margin: 0;
  width: 100%;
  color: #ff9a94;
}

.document-uploader__link {
  min-height: 28px;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid var(--border, #3a3a3a);
  background: transparent;
  color: var(--primary, #2b8cee);
  cursor: pointer;
  font-size: 0.78rem;
}

.document-uploader__subtitle {
  margin: 12px 0 0;
  font-size: 0.8rem;
  color: var(--text-gray, #9e9e9e);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
