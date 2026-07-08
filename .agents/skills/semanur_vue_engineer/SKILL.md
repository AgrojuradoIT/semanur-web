---
name: semanur_vue_engineer
description: Ingeniero experto Vue 3 Semanur Web. Composition API, Pinia, Axios, AppShell, NotificationsCenter, Dashboard KPIs operativos. Cero búsquedas innecesarias.
---

# Skill: Semanur Vue Engineer
# Fuente: ARQUITECTURA_TECNICA.md — Semanur App (Panel Administrativo Web)

**Rol**: Responsable del panel web Vue 3 de Semanur, orientado a supervisión y administración operativa (inventario, flota, taller, combustible, programación). La interfaz consume la API REST Laravel 11 (Sanctum Bearer Token).

## 📂 MAPA ESTRUCTURAL (NO buscar archivos, usar esto)

| Componente       | Ruta Exacta                        | Responsabilidad Principal                              |
|------------------|------------------------------------|--------------------------------------------------------|
| **Layouts**      | `src/app/layouts/`                 | `AppShell.vue` (sidebar + header + notif-panel)        |
| **Pages/Views**  | `src/features/*/pages/`            | Una page por dominio (Notifications, Dashboard, OT...) |
| **Stores Pinia** | `src/shared/stores/`               | `auth.js`, `notifications.js`, `dashboard.js`          |
| **Composables**  | `src/shared/composables/`          | `useNotifications`, `useAsyncState`, `useFilters`      |
| **API/HTTP**     | `src/shared/api/http.js`           | Axios + interceptor `semanur_token` + refresh 401      |
| **Componentes**  | `src/shared/components/`           | Tabla, Filtro, Badge, Modal, FormInput reutilizables   |
| **Router**       | `src/app/router/index.js`          | Guards auth, rutas protegidas, lazy loading por módulo |

## 🏗️ ESTÁNDARES DE CODIFICACIÓN OBLIGATORIOS

### 1. Composition API
```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotificationsStore } from '@/shared/stores/notifications'

const store = useNotificationsStore()
const loading = ref(false)

onMounted(() => store.fetchUnreads())
</script>
```

### 2. Pinia Stores (Patrón obligatorio)
```javascript
// src/shared/stores/notifications.js
export const useNotificationsStore = defineStore('notifications', () => {
  const list = ref([])
  const unreadCount = computed(() => list.value.filter(n => !n.read).length)

  async function fetchUnreads() { /* GET /notifications?unread=1 */ }
  async function markRead(id) { /* optimistic update + POST /notifications/{id}/read */ }
  async function markAllRead() { /* POST /notifications/read-all */ }

  return { list, unreadCount, fetchUnreads, markRead, markAllRead }
})
```

### 3. Axios (interceptors Sanctum)
```javascript
// src/shared/api/http.js
axios.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${localStorage.getItem('semanur_token')}`
  return config
})
axios.interceptors.response.use(null, async error => {
  if (error.response?.status === 401) { /* logout o refresh */ }
})
```

### 4. Manejo asíncrono con useAsyncState
```javascript
// SIEMPRE: estados loading/error/data consistentes
const { state, isLoading, error } = useAsyncState(fetchData(), [])
```

## 🖥️ MÓDULOS Y RESPONSABILIDADES (ARQUITECTURA_TECNICA.md)

### AppShell (Layout base)
- ✅ **Sidebar**: links por módulo (Dashboard/Inventario/Flota/Taller/Combustible/Programación)
- ✅ **Header**: avatar usuario, badge contador notifs, menú opciones
- ✅ **Notif-panel dropdown**: lista rápida unread → link NotificationsPage
- ✅ **Router-view**: contenido principal lazy
- ✅ **Modo oscuro default** + soporte claro (CSS variables)

### NotificationsPage (Centro de Notificaciones)
- ✅ **Lista completa**: título, cuerpo, tipo, prioridad, fecha, estado leído
- ✅ **Filtros**: tipo (stock_bajo/vencimiento/mantenimiento) | prioridad | estado (leída/no leída)
- ✅ **Búsqueda**: texto libre en tiempo real
- ✅ **Acciones**: mark-read individual + masivo + marcar todas
- ✅ **Navegación contextual**: link directo al recurso (OT/vehículo/producto)
- ✅ **Pinia**: actualización optimista (sin esperar backend)

### Dashboard KPIs
- **Endpoints backend**: `GET /dashboard/kpis`, `GET /dashboard/analytics`
- ✅ **Cards resumen**: costos combustible/mantenimiento, OT abiertas, stock críticos
- ✅ **Gráfica series**: consumo mensual combustible (Chart.js)
- ✅ **Tabla**: top costos mantenimiento por vehículo
- ✅ **Alertas stock**: productos bajo mínimo

### Inventario
- ✅ **Catálogo paginado**: búsqueda + filtro categoría + paginación
- ✅ **Detalle producto**: stock global + stock por bodega
- ✅ **Transacciones ledger**: historial movimientos (ingreso/salida/transferencia)
- ✅ **Importar**: carga masiva `PhpSpreadsheet` (mostrar progreso/errores)
- ✅ **Multi-bodega**: selector bodega en formularios

### Flota
- ✅ **Listado vehículos**: placa, estado, km/horómetro, alertas vencimiento
- ✅ **Detalle vehículo**: documentos SOAT/tecnomecánica (badge vencimiento próximo)
- ✅ **Checklists preoperacionales**: historial paginado, estado aprobado/rechazado
- ✅ **Horómetro**: registro lecturas

### Taller (OT)
- ✅ **Lista OT**: estado ciclo vida (creada/activa/cerrada), vehículo, mecánico
- ✅ **Detalle OT**: sesiones trabajo, repuestos consumidos, evidencias
- ✅ **Crear OT**: formulario vehículo + `empleado_id` (NOT `user_id`)
- ✅ **Integración inventario**: salidas repuestos visibles

### Programación
- ✅ **Vista semanal**: empleado/vehículo/labor por fecha
- ✅ **Novedades**: incidentes con posibilidad crear OT derivada

## 🎨 SISTEMA DE DISEÑO
```css
/* Variables obligatorias (src/style.css) */
--primary: color acción principal
--surface: fondo tarjetas/paneles
--text-main: texto primario
--text-muted: texto secundario
--danger: alertas/errors
--success: ok/confirmados

/* Modo oscuro: default. Modo claro: clase .light-mode en <html> */
/* Iconografía: Material Icons Round */
/* Tablas: .table-container > .table-scroll > table */
/* Formularios: espaciado sistema global */
```

## 🔌 ENDPOINTS API (Contratos Backend Laravel)

| Módulo | GET | POST | PUT |
|--------|-----|------|-----|
| **Auth** | `/user` | `/login`, `/logout` | `/refresh` |
| **Notif** | `/notifications?unread=1` | `/notifications/{id}/read`, `/notifications/read-all` | - |
| **Inventario** | `/products?search=&per_page=` | `/transactions`, `/import` | `/products/{id}` |
| **Flota** | `/vehicles`, `/vehicles/{id}/documents` | `/vehicles`, `/horometro` | `/vehicles/{id}` |
| **Taller** | `/work-orders`, `/sessions/active` | `/work-orders`, `/sessions/start` | `/work-orders/{id}` |
| **Combustible** | `/combustible/summary` | `/combustible/register` | - |
| **Dashboard** | `/dashboard/kpis`, `/dashboard/analytics` | - | - |

## 🔋 OPTIMIZACIÓN TOKENS AGENTE
1. **AppShell** → `src/app/layouts/` (NO buscar)
2. **Stores** → `src/shared/stores/` (`auth` + `notifications`)
3. **Composables** antes de crear fetch nuevo
4. **`empleado_id`** en asignaciones (NUNCA `user_id`)
5. **Optimistic update** notificaciones (`markRead` sin esperar)
6. **Paginación**: `min(per_page, 100)`

## 🚀 COMANDOS ESENCIALES
```bash
npm run dev           # Desarrollo
npm run build         # Producción
npx playwright test   # E2E tests
npm run lint          # Estilo código
```

## 💾 EJEMPLO: NotificationsPage.vue (Patrón Completo)
```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useNotificationsStore } from '@/shared/stores/notifications'

const store = useNotificationsStore()
const filterType = ref('all')
const search = ref('')

const filtered = computed(() =>
  store.list
    .filter(n => filterType.value === 'all' || n.tipo === filterType.value)
    .filter(n => n.titulo.toLowerCase().includes(search.value.toLowerCase()))
)

onMounted(() => store.fetchUnreads())
</script>

<template>
  <div class="notifications-page">
    <div class="filters">
      <input v-model="search" placeholder="Buscar notificaciones..." />
      <select v-model="filterType">
        <option value="all">Todas</option>
        <option value="stock_bajo">Stock Bajo</option>
        <option value="vencimiento">Vencimiento</option>
        <option value="mantenimiento">Mantenimiento</option>
      </select>
      <button @click="store.markAllRead()">Marcar todas leídas</button>
    </div>

    <ul class="table-container">
      <li v-for="notif in filtered" :key="notif.id" :class="{ unread: !notif.leida }">
        <span class="material-icons-round">{{ notif.icon }}</span>
        <div>
          <strong>{{ notif.titulo }}</strong>
          <p>{{ notif.cuerpo }}</p>
        </div>
        <button @click="store.markRead(notif.id)">
          <span class="material-icons-round">check_circle</span>
        </button>
      </li>
    </ul>
  </div>
</template>
```

## 🎯 CUÁNDO USAR ESTA SKILL
- Crear páginas por módulo (Inventario/Flota/OT/Programación)
- Refactor `AppShell` sidebar/header/notif-panel
- Implementar KPIs dashboard con gráficas
- Nuevo store Pinia o composable reutilizable
- Debug Axios 401 / guards router
- Componentes tabla paginada con filtros/búsqueda
