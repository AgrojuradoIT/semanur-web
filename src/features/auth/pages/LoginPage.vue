<template>
  <main class="login-shell">
    <section
      v-if="!isCompactViewport"
      class="login-visual"
      aria-label="Galería de la flota Semanur"
      aria-roledescription="carrusel"
      @mouseenter="setPointerPaused(true)"
      @mouseleave="setPointerPaused(false)"
      @focusin="handleFocusIn"
      @focusout="handleFocusOut"
    >
      <div class="login-visual__media" aria-hidden="true">
        <Transition name="login-fleet">
          <img
            :key="activeSlide.src"
            :src="activeSlide.src"
            alt=""
            class="login-visual__image"
            :style="{ '--image-position': activeSlide.position }"
            :width="activeSlide.width"
            :height="activeSlide.height"
            :loading="currentIndex === 0 ? 'eager' : 'lazy'"
            :fetchpriority="currentIndex === 0 ? 'high' : 'low'"
            decoding="async"
            draggable="false"
          />
        </Transition>
      </div>

      <div class="login-visual__veil" aria-hidden="true"></div>
      <div class="login-visual__grid" aria-hidden="true"></div>

      <div class="login-visual__story">
        <span class="login-visual__eyebrow">
          <span class="login-visual__signal" aria-hidden="true"></span>
          Operación Semanur
        </span>
        <h2>
          El trabajo de campo,
          <span>conectado en un solo lugar.</span>
        </h2>
        <p>Taller, flota e inventario con información lista para decidir.</p>
      </div>

      <div class="login-carousel__footer">
        <div class="login-carousel__caption">
          <span>{{ activeSlide.category }}</span>
          <strong>{{ activeSlide.label }}</strong>
        </div>

        <div class="login-carousel__controls" aria-label="Controles de la galería">
          <button
            v-if="!prefersReducedMotion"
            type="button"
            class="login-carousel__toggle"
            :aria-label="isUserPaused ? 'Reanudar galería' : 'Pausar galería'"
            :title="isUserPaused ? 'Reanudar galería' : 'Pausar galería'"
            @click="toggleAutoplay"
          >
            <span class="material-icons-round" aria-hidden="true">
              {{ isUserPaused ? 'play_arrow' : 'pause' }}
            </span>
          </button>

          <div class="login-carousel__indicators">
            <button
              v-for="(slide, index) in slides"
              :key="`indicator-${slide.src}`"
              type="button"
              class="login-carousel__indicator"
              :class="{ 'login-carousel__indicator--active': index === currentIndex }"
              :aria-label="`Mostrar ${slide.label}`"
              :aria-pressed="index === currentIndex"
              @click="goToSlide(index)"
            >
              <span aria-hidden="true"></span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="login-panel" aria-labelledby="login-title">
      <header class="login-panel__top">
        <div class="login-wordmark" aria-label="Semanur Hub">
          <img src="/logo.png" alt="" width="42" height="42" />
          <span>SEMANUR <strong>HUB</strong></span>
        </div>

        <button
          type="button"
          class="login-theme-toggle"
          :aria-label="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          :title="isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
          @click="toggleTheme"
        >
          <span class="material-icons-round" aria-hidden="true">
            {{ isDark ? 'light_mode' : 'dark_mode' }}
          </span>
        </button>
      </header>

      <div class="login-panel__scroll">
        <div class="login-card">
          <div class="login-card__intro">
            <span class="login-card__eyebrow">Acceso corporativo</span>
            <h1 id="login-title">Tu operación, bajo control.</h1>
            <p>Ingresa a Semanur Hub para coordinar taller, flota e inventario desde un mismo lugar.</p>
          </div>

          <form class="login-form" :aria-busy="auth.loading" @submit.prevent="onSubmit">
            <div class="login-form__field">
              <label for="login-email">Correo corporativo</label>
              <div class="login-control">
                <span class="material-icons-round login-control__icon" aria-hidden="true">
                  alternate_email
                </span>
                <input
                  id="login-email"
                  v-model.trim="email"
                  class="login-control__input"
                  name="email"
                  type="email"
                  inputmode="email"
                  autocomplete="username"
                  enterkeyhint="next"
                  placeholder="nombre@semanur.com"
                  required
                  :aria-invalid="auth.error ? 'true' : undefined"
                  :aria-describedby="auth.error ? 'login-error' : undefined"
                />
              </div>
            </div>

            <div class="login-form__field">
              <label for="login-password">Contraseña</label>
              <div class="login-control">
                <span class="material-icons-round login-control__icon" aria-hidden="true">
                  lock
                </span>
                <input
                  id="login-password"
                  v-model="password"
                  class="login-control__input"
                  name="password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  enterkeyhint="go"
                  placeholder="Tu contraseña"
                  required
                  :aria-invalid="auth.error ? 'true' : undefined"
                  :aria-describedby="auth.error ? 'login-error' : undefined"
                />
                <button
                  type="button"
                  class="login-control__reveal"
                  :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  :title="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                  @click="showPassword = !showPassword"
                >
                  <span class="material-icons-round" aria-hidden="true">
                    {{ showPassword ? 'visibility_off' : 'visibility' }}
                  </span>
                </button>
              </div>
            </div>

            <Transition name="login-error">
              <p v-if="auth.error" id="login-error" class="login-form__error" role="alert">
                <span class="material-icons-round" aria-hidden="true">error_outline</span>
                <span>{{ auth.error }}</span>
              </p>
            </Transition>

            <button class="login-form__submit" type="submit" :disabled="auth.loading">
              <span v-if="auth.loading" class="login-form__spinner" aria-hidden="true"></span>
              <span>{{ auth.loading ? 'Validando acceso…' : 'Ingresar a Semanur Hub' }}</span>
              <span v-if="!auth.loading" class="material-icons-round" aria-hidden="true">
                arrow_forward
              </span>
            </button>
          </form>

          <p class="login-card__security">
            <span class="material-icons-round" aria-hidden="true">verified_user</span>
            Acceso protegido y uso exclusivo del personal autorizado.
          </p>
        </div>
      </div>

      <footer class="login-panel__footer">
        <span>© 2026 Agropecuaria Juradó S.A.S.</span>
        <span class="login-panel__version">Semanur Hub</span>
      </footer>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../../shared/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isDark = ref(!document.documentElement.classList.contains('light-mode'));

const slides = [
  {
    src: '/fleet/camioneta_kja.jpeg',
    label: 'Camioneta operativa',
    category: 'Movilidad de campo',
    width: 1200,
    height: 1600,
    position: '50% 54%',
  },
  {
    src: '/fleet/camion_frr.jpeg',
    label: 'Camión de soporte',
    category: 'Logística',
    width: 1200,
    height: 1600,
    position: '50% 48%',
  },
  {
    src: '/fleet/maquinaria_komatsu.jpeg',
    label: 'Maquinaria en operación',
    category: 'Equipo pesado',
    width: 1600,
    height: 1204,
    position: '50% 50%',
  },
  {
    src: '/fleet/volqueta_tmz.jpeg',
    label: 'Volqueta operativa',
    category: 'Transporte',
    width: 1200,
    height: 1600,
    position: '50% 43%',
  },
  {
    src: '/fleet/tractor_kubota.jpeg',
    label: 'Tractor Kubota',
    category: 'Trabajo de campo',
    width: 1200,
    height: 1600,
    position: '50% 52%',
  },
];

const currentIndex = ref(0);
const activeSlide = computed(() => slides[currentIndex.value]);
const isUserPaused = ref(false);
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const compactQuery = window.matchMedia('(max-width: 900px)');
const prefersReducedMotion = ref(motionQuery.matches);
const isCompactViewport = ref(compactQuery.matches);

let timer = null;
let preloadTimer = null;
let pointerPaused = false;
let focusPaused = false;
const preloaders = new Map();

function clearAutoplay() {
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
}

function canAutoplay() {
  return !isUserPaused.value
    && !prefersReducedMotion.value
    && !isCompactViewport.value
    && !pointerPaused
    && !focusPaused
    && !document.hidden;
}

function preloadSlide(index) {
  const slide = slides[index];
  if (!slide || preloaders.has(slide.src)) return;

  const image = new Image();
  image.decoding = 'async';
  image.fetchPriority = 'low';
  image.onload = image.onerror = () => preloaders.delete(slide.src);
  preloaders.set(slide.src, image);
  image.src = slide.src;
}

function scheduleNextPreload() {
  if (preloadTimer) window.clearTimeout(preloadTimer);
  if (isCompactViewport.value || prefersReducedMotion.value) return;

  preloadTimer = window.setTimeout(() => {
    preloadSlide((currentIndex.value + 1) % slides.length);
    preloadTimer = null;
  }, 1200);
}

function activateSlide(index) {
  currentIndex.value = index;
  scheduleNextPreload();
}

function syncAutoplay() {
  clearAutoplay();
  if (canAutoplay()) {
    timer = window.setInterval(() => {
      activateSlide((currentIndex.value + 1) % slides.length);
    }, 6500);
  }
}

function setPointerPaused(value) {
  pointerPaused = value;
  syncAutoplay();
}

function handleFocusIn() {
  focusPaused = true;
  syncAutoplay();
}

function handleFocusOut(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    focusPaused = false;
    syncAutoplay();
  }
}

function toggleAutoplay() {
  isUserPaused.value = !isUserPaused.value;
  syncAutoplay();
}

function goToSlide(index) {
  preloadSlide(index);
  activateSlide(index);
  syncAutoplay();
}

function handleMotionPreference(event) {
  prefersReducedMotion.value = event.matches;
  scheduleNextPreload();
  syncAutoplay();
}

function handleCompactViewport(event) {
  isCompactViewport.value = event.matches;
  if (event.matches) {
    pointerPaused = false;
    focusPaused = false;
  }
  scheduleNextPreload();
  syncAutoplay();
}

function handleVisibilityChange() {
  syncAutoplay();
}

onMounted(() => {
  motionQuery.addEventListener('change', handleMotionPreference);
  compactQuery.addEventListener('change', handleCompactViewport);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  scheduleNextPreload();
  syncAutoplay();
});

onUnmounted(() => {
  clearAutoplay();
  if (preloadTimer) window.clearTimeout(preloadTimer);
  preloaders.forEach((image) => {
    image.onload = null;
    image.onerror = null;
  });
  preloaders.clear();
  motionQuery.removeEventListener('change', handleMotionPreference);
  compactQuery.removeEventListener('change', handleCompactViewport);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});

async function onSubmit() {
  const success = await auth.login({ email: email.value, password: password.value });
  if (success) {
    router.replace('/');
  }
}

function applyTheme(darkMode) {
  isDark.value = darkMode;
  document.documentElement.classList.toggle('light-mode', !darkMode);
  localStorage.setItem('theme', darkMode ? 'dark' : 'light');
}

function toggleTheme(event) {
  const nextDarkMode = !isDark.value;

  if (prefersReducedMotion.value || !document.startViewTransition) {
    applyTheme(nextDarkMode);
    return;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  const transition = document.startViewTransition(() => applyTheme(nextDarkMode));
  transition.ready
    .then(() => document.documentElement.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      {
        duration: 520,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        pseudoElement: '::view-transition-new(root)',
      },
    ))
    .catch(() => {});
}
</script>

<style scoped>
.login-shell {
  --login-muted: #b7b7b7;
  --login-subtle: #989898;
  --login-error: #ff8a80;
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  height: 100vh;
  height: 100dvh;
  flex: 1 1 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(430px, 34vw);
  overflow: hidden;
  background: var(--bg-dark);
  color: var(--text-main);
}

:global(:root.light-mode) .login-shell {
  --login-muted: #4a5568;
  --login-subtle: #596579;
  --login-error: #b42318;
}

.login-visual {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  isolation: isolate;
  color: #fff;
  background: #121212;
}

.login-visual__media,
.login-visual__veil,
.login-visual__grid {
  position: absolute;
  inset: 0;
}

.login-visual__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: cover;
  object-position: var(--image-position, 50% 50%);
  opacity: 1;
  transform: scale(1);
}

.login-fleet-enter-active {
  z-index: 1;
  transition:
    opacity 900ms cubic-bezier(0.4, 0, 0.2, 1),
    transform 7s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.login-fleet-leave-active {
  z-index: 0;
  transition: opacity 900ms cubic-bezier(0.4, 0, 0.2, 1);
}

.login-fleet-enter-from,
.login-fleet-leave-to {
  opacity: 0;
}

.login-fleet-enter-from {
  transform: scale(1.045);
}

.login-fleet-enter-to {
  transform: scale(1);
}

.login-visual__veil {
  z-index: 1;
  background:
    linear-gradient(90deg, rgba(8, 10, 12, 0.74) 0%, rgba(8, 10, 12, 0.2) 56%, rgba(8, 10, 12, 0.48) 100%),
    linear-gradient(0deg, rgba(8, 10, 12, 0.82) 0%, transparent 56%);
}

.login-visual__grid {
  z-index: 2;
  opacity: 0.12;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: linear-gradient(to bottom, transparent 12%, #000 55%, transparent 100%);
  pointer-events: none;
}

.login-visual__story {
  position: absolute;
  z-index: 3;
  inset-inline-start: clamp(36px, 6vw, 96px);
  inset-block-start: 50%;
  width: min(650px, calc(100% - 96px));
  transform: translateY(-55%);
  animation: login-story-enter 700ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.login-visual__eyebrow,
.login-card__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-block-end: 20px;
  color: var(--primary);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.login-visual__signal {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 0 0 5px rgba(255, 214, 0, 0.14);
}

.login-visual__story h2 {
  max-width: 720px;
  margin: 0;
  font-family: 'Oswald', sans-serif;
  font-size: clamp(3.25rem, 5.6vw, 6.5rem);
  font-weight: 500;
  line-height: 0.96;
  letter-spacing: -0.025em;
  text-wrap: balance;
  text-shadow: 0 4px 32px rgba(0, 0, 0, 0.36);
}

.login-visual__story h2 span {
  display: block;
  color: var(--primary);
}

.login-visual__story p {
  max-width: 520px;
  margin-block-start: 24px;
  color: rgba(255, 255, 255, 0.76);
  font-size: clamp(0.95rem, 1.2vw, 1.08rem);
  line-height: 1.7;
}

.login-carousel__footer {
  position: absolute;
  z-index: 4;
  inset-inline: clamp(24px, 4vw, 64px);
  inset-block-end: clamp(24px, 4vh, 44px);
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.login-carousel__caption {
  display: grid;
  gap: 4px;
  padding-inline-start: 14px;
  border-inline-start: 3px solid var(--primary);
}

.login-carousel__caption span {
  color: rgba(255, 255, 255, 0.64);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
}

.login-carousel__caption strong {
  font-family: 'Oswald', sans-serif;
  font-size: 1.15rem;
  font-weight: 500;
  letter-spacing: 0.04em;
}

.login-carousel__controls,
.login-carousel__indicators {
  display: flex;
  align-items: center;
}

.login-carousel__controls {
  gap: 4px;
}

.login-carousel__toggle,
.login-carousel__indicator,
.login-theme-toggle,
.login-control__reveal {
  display: inline-grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid transparent;
  font: inherit;
  cursor: pointer;
}

.login-carousel__toggle {
  border-color: rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  background: rgba(10, 12, 14, 0.42);
  color: #fff;
  backdrop-filter: blur(10px);
  transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.login-carousel__toggle:hover {
  border-color: var(--primary);
  background: rgba(10, 12, 14, 0.72);
  transform: translateY(-1px);
}

.login-carousel__indicators {
  gap: 0;
}

.login-carousel__indicator {
  border-radius: 12px;
  background: transparent;
}

.login-carousel__indicator > span {
  width: 10px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  transition: width 220ms ease, background-color 220ms ease;
}

.login-carousel__indicator:hover > span {
  background: rgba(255, 255, 255, 0.8);
}

.login-carousel__indicator--active > span {
  width: 28px;
  background: var(--primary);
}

.login-carousel__toggle:focus-visible,
.login-carousel__indicator:focus-visible,
.login-theme-toggle:focus-visible,
.login-control__reveal:focus-visible,
.login-form__submit:focus-visible {
  outline: 3px solid var(--primary);
  outline-offset: 3px;
}

.login-panel {
  position: relative;
  z-index: 5;
  min-width: 0;
  min-height: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  overflow: hidden;
  isolation: isolate;
  border-inline-start: 1px solid var(--surface-2);
  background:
    radial-gradient(circle at 92% 8%, rgba(255, 214, 0, 0.09), transparent 30%),
    var(--surface);
  box-shadow: -24px 0 64px rgba(0, 0, 0, 0.24);
}

.login-panel::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  opacity: 0.08;
  background-image: linear-gradient(135deg, var(--text-main) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: linear-gradient(to bottom, #000, transparent 42%);
  pointer-events: none;
}

.login-panel__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: clamp(22px, 3vw, 36px) clamp(22px, 3.4vw, 48px) 12px;
  animation: login-panel-enter 560ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.login-wordmark {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  color: var(--text-main);
  font-family: 'Oswald', sans-serif;
  font-size: 1.02rem;
  font-weight: 600;
  letter-spacing: 0.12em;
}

.login-wordmark img {
  width: 42px;
  height: 42px;
  border: 1px solid var(--surface-2);
  border-radius: 12px;
  object-fit: contain;
  box-shadow: var(--shadow-sm);
}

.login-wordmark strong {
  color: var(--primary);
}

.login-theme-toggle {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  border-color: var(--surface-2);
  border-radius: 50%;
  background: color-mix(in srgb, var(--surface-2) 56%, transparent);
  color: var(--text-secondary);
  transition: border-color 180ms ease, color 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.login-theme-toggle:hover {
  border-color: var(--primary);
  background: var(--primary-10);
  color: var(--primary);
  transform: translateY(-1px);
}

.login-panel__scroll {
  min-height: 0;
  min-width: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px clamp(22px, 3.4vw, 48px);
  scrollbar-width: thin;
  scrollbar-color: var(--surface-3) transparent;
}

.login-card {
  width: 100%;
  max-width: 430px;
  min-width: 0;
  animation: login-card-enter 640ms 80ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.login-card__intro {
  margin-block-end: 34px;
}

.login-card__eyebrow {
  margin-block-end: 14px;
}

.login-card h1 {
  margin: 0;
  color: var(--text-main);
  font-family: 'Oswald', sans-serif;
  font-size: clamp(2.45rem, 3.8vw, 3.55rem);
  font-weight: 500;
  line-height: 1.02;
  letter-spacing: -0.025em;
  text-wrap: balance;
}

.login-card__intro p {
  margin-block-start: 16px;
  color: var(--text-secondary);
  font-size: 0.98rem;
  line-height: 1.65;
}

.login-form {
  min-width: 0;
  display: grid;
  gap: 20px;
}

.login-form__field {
  display: grid;
  gap: 9px;
}

.login-form__field label {
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.login-control {
  min-width: 0;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--surface-3);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-dark) 48%, var(--surface));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.025);
  transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

.login-control:focus-within {
  border-color: var(--primary);
  background: var(--surface);
  box-shadow: 0 0 0 4px var(--primary-10);
}

.login-control:has(.login-control__input:focus-visible) {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.login-control__icon {
  margin-inline-start: 16px;
  color: var(--text-gray);
  font-size: 20px;
  transition: color 180ms ease;
}

.login-control:focus-within .login-control__icon {
  color: var(--primary);
}

.login-control__input {
  min-width: 0;
  flex: 1;
  align-self: stretch;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  font-size: 1rem;
}

.login-control__input::placeholder {
  color: var(--login-muted);
  opacity: 1;
}

.login-control__input:-webkit-autofill,
.login-control__input:-webkit-autofill:hover,
.login-control__input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--text-main);
  transition: background-color 9999s ease-out;
  caret-color: var(--text-main);
}

.login-control__reveal {
  width: 48px;
  min-width: 48px;
  min-height: 48px;
  margin-inline-end: 3px;
  border-radius: 10px;
  background: transparent;
  color: var(--text-gray);
  transition: color 180ms ease, background-color 180ms ease;
}

.login-control__reveal:hover {
  background: var(--primary-10);
  color: var(--primary);
}

.login-form__error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--login-error) 48%, transparent);
  border-radius: 10px;
  background: var(--danger-10);
  color: var(--login-error);
  font-size: 0.86rem;
  line-height: 1.45;
}

.login-form__error .material-icons-round {
  margin-block-start: 1px;
  font-size: 19px;
}

.login-error-enter-active,
.login-error-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.login-error-enter-from,
.login-error-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.login-form__submit {
  min-height: 54px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-block-start: 4px;
  padding: 0 22px;
  border: 1px solid var(--primary);
  border-radius: 12px;
  background: var(--primary);
  color: #151515;
  box-shadow: 0 12px 26px rgba(255, 214, 0, 0.16);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.015em;
  cursor: pointer;
  transition: background-color 180ms ease, border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.login-form__submit:hover:not(:disabled) {
  border-color: var(--primary-hover);
  background: var(--primary-hover);
  box-shadow: 0 15px 34px rgba(255, 214, 0, 0.22);
  transform: translateY(-2px);
}

.login-form__submit:active:not(:disabled) {
  transform: translateY(0);
}

.login-form__submit:disabled {
  cursor: wait;
  opacity: 0.72;
}

.login-form__spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(21, 21, 21, 0.3);
  border-top-color: #151515;
  border-radius: 50%;
  animation: login-spin 700ms linear infinite;
}

.login-card__security {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-block-start: 28px;
  color: var(--login-muted);
  font-size: 0.76rem;
  line-height: 1.5;
}

.login-card__security .material-icons-round {
  flex: 0 0 auto;
  color: var(--text-gray);
  font-size: 17px;
}

.login-panel__footer {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  padding: 12px clamp(22px, 3.4vw, 48px) clamp(20px, 2.6vw, 32px);
  color: var(--login-subtle);
  font-size: 0.7rem;
  animation: login-panel-enter 560ms 140ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.login-panel__version {
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

@keyframes login-story-enter {
  from {
    opacity: 0;
    transform: translate3d(0, calc(-55% + 22px), 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, -55%, 0);
  }
}

@keyframes login-panel-enter {
  from {
    opacity: 0;
    transform: translate3d(0, -10px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes login-card-enter {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
  }
}

@keyframes login-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .login-shell {
    grid-template-columns: minmax(0, 1fr) minmax(420px, 42vw);
  }

  .login-visual__story h2 {
    font-size: clamp(3rem, 5vw, 5rem);
  }
}

@media (max-width: 900px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-visual {
    display: none;
  }

  .login-panel {
    border-inline-start: 0;
    box-shadow: none;
  }

  .login-panel::after {
    content: '';
    position: absolute;
    z-index: -1;
    width: min(88vw, 520px);
    aspect-ratio: 1;
    inset-inline-start: 50%;
    inset-block-end: -42%;
    border: 1px solid var(--primary-10);
    border-radius: 50%;
    transform: translateX(-50%);
    box-shadow: 0 0 0 70px rgba(255, 214, 0, 0.025), 0 0 0 140px rgba(255, 214, 0, 0.018);
    pointer-events: none;
  }

  .login-panel__top,
  .login-panel__footer {
    width: min(100%, 620px);
    margin-inline: auto;
  }

  .login-panel__scroll {
    padding-block: 24px;
  }
}

@media (max-width: 480px) {
  .login-panel__top {
    padding: 18px 18px 8px;
  }

  .login-wordmark {
    font-size: 0.92rem;
  }

  .login-wordmark img {
    width: 38px;
    height: 38px;
  }

  .login-panel__scroll {
    place-items: start center;
    padding: 26px 18px;
  }

  .login-card__intro {
    margin-block-end: 28px;
  }

  .login-card h1 {
    font-size: clamp(2.25rem, 12vw, 2.85rem);
  }

  .login-control__input {
    font-size: 16px;
  }

  .login-panel__footer {
    padding: 8px 18px 18px;
  }

  .login-panel__version {
    display: none;
  }
}

@media (max-height: 650px) {
  .login-panel__top {
    padding-block-start: 16px;
  }

  .login-panel__scroll {
    place-items: start center;
    padding-block: 18px;
  }

  .login-card__intro {
    margin-block-end: 24px;
  }

  .login-panel__footer {
    display: none;
  }

  .login-card__security {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-visual__image,
  .login-visual__story,
  .login-panel__top,
  .login-card,
  .login-panel__footer,
  .login-form__spinner {
    animation: none;
  }

  .login-visual__image,
  .login-fleet-enter-active,
  .login-fleet-leave-active,
  .login-carousel__toggle,
  .login-carousel__indicator > span,
  .login-theme-toggle,
  .login-control,
  .login-control__icon,
  .login-control__reveal,
  .login-form__submit,
  .login-error-enter-active,
  .login-error-leave-active {
    transition: none;
  }

  .login-visual__image {
    transform: none;
  }

  .login-form__submit:hover:not(:disabled),
  .login-theme-toggle:hover,
  .login-carousel__toggle:hover {
    transform: none;
  }
}

@media (forced-colors: active) {
  .login-panel,
  .login-control,
  .login-form__error,
  .login-form__submit,
  .login-theme-toggle,
  .login-carousel__toggle {
    border: 1px solid CanvasText;
  }

  .login-control:focus-within,
  .login-carousel__toggle:focus-visible,
  .login-carousel__indicator:focus-visible,
  .login-theme-toggle:focus-visible,
  .login-control__reveal:focus-visible,
  .login-form__submit:focus-visible {
    outline: 3px solid Highlight;
    outline-offset: 3px;
  }

  .login-form__submit {
    color: ButtonText;
  }
}

@media (hover: none) {
  .login-form__submit:hover:not(:disabled),
  .login-theme-toggle:hover,
  .login-carousel__toggle:hover {
    transform: none;
  }
}
</style>
