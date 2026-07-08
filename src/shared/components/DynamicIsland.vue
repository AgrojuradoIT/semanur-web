<template>
  <Teleport to="body">
    <Transition name="island-anim">
      <div 
        v-if="visible" 
        class="dynamic-island" 
        :class="[`island--${type}`, { 'island--expanded': expanded }]" 
        @click="toggleExpand"
      >
        <div class="island-container">
          <!-- Encabezado principal: siempre visible -->
          <div class="island-header">
            <div class="island-icon-container">
              <span class="island-icon material-icons-round">{{ icon }}</span>
            </div>
            <div class="island-title-container">
              <span class="island-title">{{ title || defaultTitle }}</span>
            </div>
            <div class="island-close-container">
              <button class="island-close" @click.stop="dismiss" aria-label="Cerrar">
                <span class="material-icons-round">close</span>
              </button>
            </div>
          </div>
          
          <!-- Cuerpo expandible: contiene mensaje y acción -->
          <div class="island-body" :class="{ 'island-body--visible': expanded && message }">
            <div class="island-divider"></div>
            <div class="island-body-content">
              <p class="island-message">{{ message }}</p>
              <div v-if="actionLabel" class="island-actions">
                <button class="island-action" @click.stop="handleAction">
                  {{ actionLabel }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  type: { type: String, default: 'info' }, // success | error | warning | info
  title: { type: String, default: '' },
  message: { type: String, default: '' },
  duration: { type: Number, default: 0 }, // 0 = sin auto-descarte
  actionLabel: { type: String, default: '' },
});

const emit = defineEmits(['update:modelValue', 'action', 'dismiss']);

const visible = ref(false);
const expanded = ref(false);
let expandTimer = null;
let dismissTimer = null;

const icon = computed(() => ({
  success: 'check_circle',
  error: 'error',
  warning: 'warning',
  info: 'notifications',
}[props.type] || 'notifications'));

const defaultTitle = computed(() => ({
  success: 'Éxito',
  error: 'Error',
  warning: 'Atención',
  info: 'Notificación',
}[props.type] || 'Notificación'));

watch(() => props.modelValue, (v) => {
  if (v) {
    visible.value = true;
    expanded.value = true;
    
    // Colapsar a modo compacto automáticamente tras 3.5 segundos
    if (expandTimer) clearTimeout(expandTimer);
    expandTimer = setTimeout(() => { 
      expanded.value = false; 
    }, 3500);
  } else {
    visible.value = false;
    expanded.value = false;
  }
});

watch(() => props.message, (newMsg) => {
  if (newMsg && props.modelValue) {
    expanded.value = true;
    if (expandTimer) clearTimeout(expandTimer);
    expandTimer = setTimeout(() => { 
      expanded.value = false; 
    }, 3500);
  }
});

function toggleExpand() {
  if (!props.message) return; // No expandir si no hay mensaje detallado
  expanded.value = !expanded.value;
  // Si el usuario lo expande manualmente, cancelamos el timer de auto-colapso
  if (expanded.value && expandTimer) {
    clearTimeout(expandTimer);
  }
}

function dismiss() {
  if (expandTimer) clearTimeout(expandTimer);
  visible.value = false;
  expanded.value = false;
  emit('update:modelValue', false);
  emit('dismiss');
}

function handleAction() {
  emit('action');
  dismiss();
}

onBeforeUnmount(() => {
  if (expandTimer) clearTimeout(expandTimer);
  if (dismissTimer) clearTimeout(dismissTimer);
});
</script>

<style scoped>
.dynamic-island {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  
  /* Estética Premium iOS: Negro profundo y glassmorphism */
  background: rgba(10, 10, 12, 0.88);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  
  color: #ffffff;
  width: 280px;
  max-width: calc(100vw - 32px);
  border-radius: 30px;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
  box-sizing: border-box;

  /* Sombra flotante e iluminación interna sutil */
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.08);

  /* Transición ultra fluida con curva de resorte (spring-like) */
  transition: 
    width 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.1),
    max-height 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.15),
    border-radius 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.1),
    padding 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.1),
    box-shadow 0.3s ease;
  
  max-height: 48px; /* Compact height */
}

/* Efecto hover suave */
.dynamic-island:hover {
  box-shadow: 
    0 12px 45px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(255, 255, 255, 0.15),
    0 0 12px rgba(255, 255, 255, 0.05);
}

/* Estado Expandido */
.dynamic-island.island--expanded {
  width: 440px;
  max-height: 320px; /* Suficiente para albergar mensaje y botón */
  border-radius: 22px;
  padding: 16px 20px;
}

.island-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* Encabezado */
.island-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 28px;
}

.island-icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.island-icon {
  font-size: 20px;
  transition: transform 0.3s ease;
}

.dynamic-island:hover .island-icon {
  transform: scale(1.1);
}

.island-title-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  min-width: 0;
}

.island-title {
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
  width: 100%;
}

.island-close-container {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.island-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s ease;
}

.island-close:hover {
  background: rgba(255, 255, 255, 0.25);
  color: #ffffff;
  transform: scale(1.05);
}

.island-close .material-icons-round {
  font-size: 14px;
}

/* Cuerpo Expandible */
.island-body {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: 
    max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.3s ease;
}

.island-body--visible {
  max-height: 250px;
  opacity: 1;
}

.island-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 12px 0 10px;
  width: 100%;
}

.island-body-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.island-message {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.45;
  margin: 0;
  word-break: break-word;
}

.island-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.island-action {
  padding: 6px 14px;
  border: none;
  border-radius: 14px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.island-action:hover {
  background: rgba(255, 255, 255, 0.22);
  transform: translateY(-1px);
}

.island-action:active {
  transform: translateY(0);
}

/* Indicadores de tipo premium a través de resplandores en la caja y el color del icono */
.island--success .island-icon { color: #10b981; }
.island--success {
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(16, 185, 129, 0.2);
}
.island--success:hover {
  box-shadow: 
    0 12px 45px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(16, 185, 129, 0.35),
    0 0 12px rgba(16, 185, 129, 0.1);
}
.island--success .island-action {
  background: rgba(16, 185, 129, 0.2);
}
.island--success .island-action:hover {
  background: rgba(16, 185, 129, 0.3);
}

.island--error .island-icon { color: #ef4444; }
.island--error {
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(239, 68, 68, 0.2);
}
.island--error:hover {
  box-shadow: 
    0 12px 45px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(239, 68, 68, 0.35),
    0 0 12px rgba(239, 68, 68, 0.1);
}
.island--error .island-action {
  background: rgba(239, 68, 68, 0.2);
}
.island--error .island-action:hover {
  background: rgba(239, 68, 68, 0.3);
}

.island--warning .island-icon { color: #f59e0b; }
.island--warning {
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(245, 158, 11, 0.2);
}
.island--warning:hover {
  box-shadow: 
    0 12px 45px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(245, 158, 11, 0.35),
    0 0 12px rgba(245, 158, 11, 0.1);
}
.island--warning .island-action {
  background: rgba(245, 158, 11, 0.2);
}
.island--warning .island-action:hover {
  background: rgba(245, 158, 11, 0.3);
}

.island--info .island-icon { color: #3b82f6; }
.island--info {
  box-shadow: 
    0 10px 40px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(59, 130, 246, 0.2);
}
.island--info:hover {
  box-shadow: 
    0 12px 45px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(59, 130, 246, 0.35),
    0 0 12px rgba(59, 130, 246, 0.1);
}
.island--info .island-action {
  background: rgba(59, 130, 246, 0.2);
}
.island--info .island-action:hover {
  background: rgba(59, 130, 246, 0.3);
}

/* Animaciones de Entrada y Salida (Simula emerger del notch) */
.island-anim-enter-active {
  animation: islandEntrance 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.island-anim-leave-active {
  animation: islandExit 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes islandEntrance {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-35px) scale(0.4);
    border-radius: 40px;
    width: 100px;
    filter: blur(4px);
  }
  60% {
    opacity: 1;
    transform: translateX(-50%) translateY(3px) scale(1.03);
    filter: blur(0);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes islandExit {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
    filter: blur(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-35px) scale(0.4);
    border-radius: 40px;
    width: 100px;
    filter: blur(4px);
  }
}
</style>
