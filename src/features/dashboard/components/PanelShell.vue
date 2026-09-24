<template>
  <article class="panel-shell">
    <header class="panel-shell__header">
      <div class="panel-shell__title-group">
        <span class="panel-shell__icon material-icons-round" aria-hidden="true">{{ icon }}</span>
        <h2>{{ title }}</h2>
      </div>
      <div class="panel-shell__actions">
        <span v-if="badge !== undefined && badge !== null" class="panel-shell__badge">{{ badge }}</span>
        <RouterLink :to="{ name: to }" class="panel-shell__link">
          Ver módulo <span class="material-icons-round" aria-hidden="true">arrow_forward</span>
        </RouterLink>
      </div>
    </header>
    <div class="panel-shell__content">
      <slot />
    </div>
  </article>
</template>

<script setup>
defineProps({
  title: { type: String, required: true },
  icon: { type: String, required: true },
  badge: { type: [String, Number], default: null },
  to: { type: String, required: true },
});
</script>

<style scoped>
.panel-shell {
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 480px;
  min-height: 480px;
  max-height: 480px;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.panel-shell:hover {
  border-color: var(--surface-3);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.panel-shell__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--surface-2);
  background: var(--bg-dark);
  flex-shrink: 0;
  min-height: 52px;
  box-sizing: border-box;
}

.panel-shell__title-group,
.panel-shell__actions,
.panel-shell__link {
  display: flex;
  align-items: center;
  gap: 8px;
  min-inline-size: 0;
}

.panel-shell__title-group h2 {
  margin: 0;
  font-family: 'Oswald', sans-serif;
  font-size: 0.92rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.panel-shell__icon {
  color: var(--primary);
  font-size: 20px;
  flex-shrink: 0;
}

.panel-shell__badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--info-10);
  color: #60a5fa;
  font-size: 0.68rem;
  font-weight: 800;
  flex-shrink: 0;
}

.panel-shell__link {
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.panel-shell__link:hover {
  text-decoration: underline;
}

.panel-shell__link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 3px;
  border-radius: 3px;
}

.panel-shell__link .material-icons-round {
  font-size: 15px;
}

.panel-shell__content {
  min-inline-size: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
</style>
