import { createRouter, createWebHashHistory } from 'vue-router';

import AppShell from '../layouts/AppShell.vue';
import { useAuthStore } from '../../shared/stores/auth';
import { isInventoryOrdersFeatureEnabled } from '../../features/inventory-orders/utils/flag';

// Route-level code splitting: each page lands in its own chunk and is
// fetched on first navigation, keeping the entry bundle small.
const LoginPage = () => import('../../features/auth/pages/LoginPage.vue');
const DashboardPage = () => import('../../features/dashboard/pages/DashboardPage.vue');
const InventoryPage = () => import('../../features/inventory/pages/InventoryPage.vue');
const FleetPage = () => import('../../features/fleet/pages/FleetPage.vue');
const WorkOrdersPage = () => import('../../features/work-orders/pages/WorkOrdersPage.vue');
const AuditWorkOrders = () => import('../../features/work-orders/pages/AuditWorkOrders.vue');
const EmployeesPage = () => import('../../features/employees/pages/EmployeesPage.vue');
const HistoryPage = () => import('../../features/history/pages/HistoryPage.vue');
const LoansPage = () => import('../../features/loans/pages/LoansPage.vue');
const FuelPage = () => import('../../features/fuel/pages/FuelPage.vue');
const FuelReportsPage = () => import('../../features/fuel/pages/FuelReportsPage.vue');
const PreoperacionalesPage = () => import('../../features/preoperacionales/pages/PreoperacionalesPage.vue');
const SchedulerPage = () => import('../../features/scheduler/pages/SchedulerPage.vue');
const NotificationsPage = () => import('../../features/notifications/pages/NotificationsPage.vue');
// U8: pedidos de inventario (feature flag + permiso exactos). Lazy por ruta.
const InventoryOrdersPage = () => import('../../features/inventory-orders/pages/PedidosPage.vue');
const InventoryOrdersNewPage = () => import('../../features/inventory-orders/pages/NuevoPedidoPage.vue');
const InventoryOrdersReceptionPage = () => import('../../features/inventory-orders/pages/RecepcionPage.vue');
const InventoryOrdersIssuesPage = () => import('../../features/inventory-orders/pages/NovedadesPage.vue');
const InventoryOrdersHistoryPage = () => import('../../features/inventory-orders/pages/HistorialPage.vue');
const InventoryOrdersAlertsPage = () => import('../../features/inventory-orders/pages/AlertasPage.vue');

const inventoryOrdersMeta = {
  requiresAuth: true,
  modulo: 'inventario',
  feature: 'inventoryOrders',
};

const shellChildren = [
  { path: '', name: 'dashboard', component: DashboardPage, meta: { title: 'Dashboard', requiresAuth: true, modulo: 'analitica' } },
  {
    path: 'inventory',
    name: 'inventory',
    component: InventoryPage,
    meta: { title: 'Inventario', requiresAuth: true, modulo: 'inventario' },
  },
  {
    path: 'fleet',
    name: 'fleet',
    component: FleetPage,
    meta: { title: 'Flota', requiresAuth: true, modulo: 'flota' },
  },
  {
    path: 'work-orders',
    name: 'work-orders',
    component: WorkOrdersPage,
    meta: { title: 'Ordenes de Trabajo', requiresAuth: true, modulo: 'taller' },
  },
  {
    path: 'work-orders/audit',
    name: 'work-orders-audit',
    component: AuditWorkOrders,
    meta: { title: 'Auditoría de OTs', requiresAuth: true, modulo: 'taller' },
  },
  {
    path: 'history',
    name: 'history',
    component: HistoryPage,
    meta: { title: 'Centro de Actividad', requiresAuth: true, modulo: 'analitica' },
  },
  {
    path: 'employees',
    name: 'employees',
    component: EmployeesPage,
    meta: { title: 'Empleados', requiresAuth: true, modulo: 'personal' },
  },
  {
    path: 'loans',
    name: 'loans',
    component: LoansPage,
    meta: { title: 'Prestamos', requiresAuth: true, modulo: 'prestamos' },
  },
  {
    path: 'preoperacionales',
    name: 'preoperacionales',
    component: PreoperacionalesPage,
    meta: { title: 'Inspecciones Preoperacionales', requiresAuth: true, modulo: 'checklists' },
  },
  {
    path: 'fuel',
    name: 'fuel',
    component: FuelPage,
    meta: { title: 'Combustible', requiresAuth: true, modulo: 'combustible' },
  },
  {
    path: 'fuel/reports',
    name: 'fuel-reports',
    component: FuelReportsPage,
    meta: { title: 'Reportes de Combustible', requiresAuth: true, modulo: 'combustible' },
  },
  {
    path: 'scheduler',
    name: 'scheduler',
    component: SchedulerPage,
    meta: { title: 'Programacion', requiresAuth: true, modulo: 'personal' },
  },
  {
    path: 'notifications',
    name: 'notifications',
    component: NotificationsPage,
    meta: { title: 'Centro de Notificaciones', requiresAuth: true },
  },
  {
    path: 'inventory-orders',
    name: 'inventory-orders',
    component: InventoryOrdersPage,
    meta: { ...inventoryOrdersMeta, title: 'Pedidos', permission: 'pedidos.read' },
  },
  {
    path: 'inventory-orders/nuevo',
    name: 'inventory-orders-new',
    component: InventoryOrdersNewPage,
    meta: { ...inventoryOrdersMeta, title: 'Nuevo pedido', permission: 'pedidos.create' },
  },
  {
    path: 'inventory-orders/alertas',
    name: 'inventory-orders-alerts',
    component: InventoryOrdersAlertsPage,
    meta: { ...inventoryOrdersMeta, title: 'Alertas de pedidos', permission: 'pedidos.read' },
  },
  {
    path: 'inventory-orders/:uuid/revisar',
    name: 'inventory-orders-review',
    component: InventoryOrdersNewPage,
    meta: { ...inventoryOrdersMeta, title: 'Revisar pedido', permission: 'pedidos.create' },
  },
  {
    path: 'inventory-orders/:uuid/recepcion',
    name: 'inventory-orders-recepcion',
    component: InventoryOrdersReceptionPage,
    meta: { ...inventoryOrdersMeta, title: 'Recepción de pedido', permission: 'pedidos.receive' },
  },
  {
    path: 'inventory-orders/:uuid/novedades',
    name: 'inventory-orders-novedades',
    component: InventoryOrdersIssuesPage,
    meta: { ...inventoryOrdersMeta, title: 'Novedades del pedido', permission: 'pedidos.read' },
  },
  {
    path: 'inventory-orders/:uuid/historial',
    name: 'inventory-orders-historial',
    component: InventoryOrdersHistoryPage,
    meta: { ...inventoryOrdersMeta, title: 'Historial del pedido', permission: 'pedidos.read' },
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { title: 'Iniciar Sesion' },
    },
    {
      path: '/',
      component: AppShell,
      children: shellChildren,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

function firstAvailablePath(auth) {
  for (const child of shellChildren) {
    if (child.path === '' || child.path === 'notifications') continue;
    // U8: las rutas con parámetro no son destino de aterrizaje; el flag y el
    // permiso exacto deben cumplirse para ofrecer una ruta de pedidos.
    if (child.path.includes(':')) continue;
    if (child.meta.feature === 'inventoryOrders' && !isInventoryOrdersFeatureEnabled()) continue;
    if (child.meta.permission && !auth.hasPermission(child.meta.permission)) continue;
    if (!child.meta.modulo || auth.canAccessModule(child.meta.modulo)) {
      return `/${child.path}`;
    }
  }
  return '/notifications';
}

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { path: '/login' };
  }

  if (to.path === '/login' && auth.isAuthenticated) {
    return { path: firstAvailablePath(auth) };
  }

  // Redirigir dashboard a primer módulo si no tiene permiso de analitica
  if (to.path === '/' && auth.isAuthenticated && !auth.canAccessModule('analitica')) {
    return { path: firstAvailablePath(auth) };
  }

  // Bloquear ruta de Actividad (/history) solo a admin
  if (to.path === '/history' && auth.isAuthenticated && !auth.isAdmin) {
    return { path: firstAvailablePath(auth) };
  }

  // Bloquear ruta de Auditoría de OTs (/work-orders/audit) solo a admin o jefe_taller
  if (to.path === '/work-orders/audit' && auth.isAuthenticated && !(auth.isAdmin || auth.isJefeDeTaller)) {
    return { path: firstAvailablePath(auth) };
  }

  // Bloquear rutas de módulos sin permiso
  if (to.meta.modulo && auth.isAuthenticated && !auth.canAccessModule(to.meta.modulo)) {
    return { path: firstAvailablePath(auth) };
  }

  // U8: el flag de pedidos debe estar encendido y el permiso exacto concedido.
  if (to.meta.feature === 'inventoryOrders' && auth.isAuthenticated && !isInventoryOrdersFeatureEnabled()) {
    return { path: firstAvailablePath(auth) };
  }

  if (to.meta.permission && auth.isAuthenticated && !auth.hasPermission(to.meta.permission)) {
    return { path: firstAvailablePath(auth) };
  }

  return true;
});

export default router;
