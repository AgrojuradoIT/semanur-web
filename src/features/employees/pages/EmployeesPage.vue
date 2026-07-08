<template>
  <div class="table-container">
    <!-- Header -->
    <div class="table-header">
      <h3 class="table-title">GESTIÓN DE EMPLEADOS</h3>
      <div class="table-actions">
        <!-- Filtro estado -->
        <div class="emp-filter-pills">
          <button
            v-for="f in estadoFilters"
            :key="f.value"
            class="emp-pill"
            :class="{ 'emp-pill--active': filterEstado === f.value }"
            @click="filterEstado = f.value; loadEmployees()"
          >
            {{ f.label }}
          </button>
        </div>

        <div class="table-search">
          <span class="material-icons-round">search</span>
          <input v-model="search" type="text" placeholder="Buscar por nombre, documento o cargo..." />
        </div>
        <button v-if="authStore.hasPermission('personal.write')" class="btn btn-primary btn-sm" @click="openCreateModal">
          <span class="material-icons-round" style="font-size: 18px">person_add</span>
          NUEVO EMPLEADO
        </button>
      </div>
    </div>

    <!-- Employee Cards Grid -->
    <div v-if="!loading && !error && filteredEmployees.length > 0" class="emp-grid-scroll">
      <div class="emp-grid">
        <div
          v-for="emp in filteredEmployees"
          :key="emp.id"
          class="emp-card"
          :class="{
            'emp-card--inactive': (emp.estado || '').toLowerCase() !== 'activo',
            'emp-card--retirado': (emp.estado || '').toLowerCase() === 'retirado'
          }"
          @click="openDetailModal(emp)"
        >
          <div class="emp-avatar-wrap">
            <div class="emp-avatar">
              <img v-if="emp.foto_url" :src="getAvatarUrl(emp.foto_url)" alt="Avatar" class="avatar-img" />
              <span v-else class="material-icons-round" style="font-size: 36px; color: var(--text-gray)">person</span>
            </div>
            <span
              class="emp-status-dot"
              :class="{
                'emp-status-dot--active': (emp.estado || '').toLowerCase() === 'activo',
                'emp-status-dot--inactive': (emp.estado || '').toLowerCase() === 'inactivo',
                'emp-status-dot--retirado': (emp.estado || '').toLowerCase() === 'retirado'
              }"
            ></span>
          </div>

          <div class="emp-card-info">
            <h4 class="emp-card-name">{{ employeeFullName(emp) }}</h4>
            <span class="emp-card-cargo">{{ emp.cargo || 'Sin cargo' }}</span>
            <div class="emp-card-meta">
              <span v-if="(emp.estado || '').toLowerCase() === 'retirado'" class="emp-chip emp-chip--red">RETIRADO</span>
              <span v-if="emp.licencia_conduccion || emp.categoria_licencia" class="emp-chip emp-chip--yellow">
                <span class="material-icons-round" style="font-size: 12px">badge</span>
                {{ emp.licencia_conduccion || emp.categoria_licencia }}
              </span>
            </div>
          </div>

          <span class="material-icons-round emp-card-arrow">chevron_right</span>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="page-loading">
      <span class="spinner"></span>
      Cargando empleados...
    </div>
    <div v-else-if="error" class="empty-state">
      <span class="material-icons-round">cloud_off</span>
      <p>{{ error }}</p>
    </div>
    <div v-else class="empty-state">
      <span class="material-icons-round">people</span>
      <p>No se encontraron empleados</p>
    </div>

    <div class="table-footer">
      Mostrando {{ filteredEmployees.length }} empleado{{ filteredEmployees.length === 1 ? '' : 's' }}
    </div>
  </div>

  <!-- ─── MODAL DETALLE DE EMPLEADO ─────────────────────── -->
  <div v-if="showDetail && selectedEmployee" class="modal-overlay" @click.self="closeDetail">
    <div class="emp-detail-modal">
      <button class="emp-detail-close" @click="closeDetail">
        <span class="material-icons-round">close</span>
      </button>

      <!-- Header -->
      <div class="emp-detail-header">
        <div class="emp-detail-avatar-wrap">
          <div class="emp-detail-avatar">
            <img v-if="selectedEmployee.foto_url" :src="getAvatarUrl(selectedEmployee.foto_url)" alt="Avatar" class="avatar-img-lg" />
            <span v-else class="material-icons-round" style="font-size: 56px; color: var(--text-gray)">person</span>
          </div>
          <span
            class="emp-status-dot emp-status-dot--lg"
            :class="{
              'emp-status-dot--active': (selectedEmployee.estado || '').toLowerCase() === 'activo',
              'emp-status-dot--inactive': (selectedEmployee.estado || '').toLowerCase() === 'inactivo',
              'emp-status-dot--retirado': (selectedEmployee.estado || '').toLowerCase() === 'retirado'
            }"
          ></span>
        </div>
        <div>
          <h1 class="emp-detail-name">{{ employeeFullName(selectedEmployee).toUpperCase() }}</h1>
          <div class="emp-detail-badges">
            <span class="emp-detail-badge-primary">{{ selectedEmployee.cargo || 'Sin cargo' }}</span>
            <span v-if="(selectedEmployee.estado || '').toLowerCase() === 'retirado'" class="emp-detail-badge-danger">RETIRADO</span>
            <span class="emp-detail-id">DOC: {{ selectedEmployee.documento || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="emp-detail-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="emp-detail-tab"
          :class="{ 'emp-detail-tab--active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <!-- Body -->
      <div class="emp-detail-body">
        <!-- Loading del detalle -->
        <div v-if="loadingDetail" style="display: flex; align-items: center; justify-content: center; padding: 2rem">
          <span class="spinner"></span>
          <span style="margin-left: 0.5rem; color: var(--text-gray)">Cargando detalle...</span>
        </div>

        <!-- Tab: General -->
        <template v-else-if="activeTab === 'general'">
          <div class="emp-detail-columns">
            <!-- Col principal -->
            <div class="emp-detail-col-main">
              <section>
                <h3 class="emp-section-title">Información Personal</h3>
                <div class="emp-info-grid">
                  <div class="emp-info-field">
                    <span class="emp-info-label">Teléfono</span>
                    <span class="emp-info-value">{{ selectedEmployee.telefono || '—' }}</span>
                  </div>
                  <div class="emp-info-field">
                    <span class="emp-info-label">Documento</span>
                    <span class="emp-info-value">{{ selectedEmployee.documento || '—' }}</span>
                  </div>
                  <div class="emp-info-field">
                    <span class="emp-info-label">Dirección</span>
                    <span class="emp-info-value">{{ selectedEmployee.direccion || '—' }}</span>
                  </div>
                  <div class="emp-info-field">
                    <span class="emp-info-label">Estado</span>
                    <span class="badge" :class="statusBadgeClass(selectedEmployee.estado)">
                      {{ selectedEmployee.estado || '—' }}
                    </span>
                  </div>
                  <div v-if="selectedEmployee.user?.email" class="emp-info-field">
                    <span class="emp-info-label">Email del Sistema</span>
                    <span class="emp-info-value">{{ selectedEmployee.user.email }}</span>
                  </div>
                </div>
              </section>

              <!-- Info de retiro -->
              <section v-if="(selectedEmployee.estado || '').toLowerCase() === 'retirado'" style="margin-top: 1.5rem">
                <h3 class="emp-section-title" style="color: var(--danger)">Información de Retiro</h3>
                <div class="emp-info-grid" style="border: 1px solid rgba(239,68,68,0.2)">
                  <div class="emp-info-field">
                    <span class="emp-info-label">Fecha de Retiro</span>
                    <span class="emp-info-value">{{ selectedEmployee.fecha_retiro || '—' }}</span>
                  </div>
                  <div class="emp-info-field">
                    <span class="emp-info-label">Motivo</span>
                    <span class="emp-info-value">{{ selectedEmployee.motivo_retiro || '—' }}</span>
                  </div>
                </div>
              </section>

              <!-- Resumen Profesional -->
              <section v-if="selectedEmployee.resumen_profesional" style="margin-top: 1.5rem">
                <h3 class="emp-section-title">Resumen Profesional</h3>
                <div class="emp-cv-bio" v-html="formatBio(selectedEmployee.resumen_profesional)"></div>
              </section>

              <!-- Stats -->
              <section style="margin-top: 1.5rem">
                <h3 class="emp-section-title">Actividad en el Sistema</h3>
                <div class="emp-stats-row">
                  <div class="emp-stat-card">
                    <span class="emp-stat-label">OT Asignadas</span>
                    <span class="emp-stat-value">{{ empStats.ot_asignadas }}</span>
                  </div>
                  <div class="emp-stat-card">
                    <span class="emp-stat-label">Préstamos</span>
                    <span class="emp-stat-value">{{ empStats.prestamos }}</span>
                  </div>
                  <div class="emp-stat-card">
                    <span class="emp-stat-label">Tanqueos</span>
                    <span class="emp-stat-value">{{ empStats.tanqueos }}</span>
                  </div>
                  <div class="emp-stat-card">
                    <span class="emp-stat-label">Sesiones</span>
                    <span class="emp-stat-value">{{ empStats.sesiones }}</span>
                  </div>
                </div>
              </section>
            </div>

            <!-- Col lateral -->
            <div class="emp-detail-col-side">
              <section>
                <h3 class="emp-section-title">Acciones Rápidas</h3>
                <div class="emp-quick-actions">
                  <button v-if="authStore.hasPermission('personal.write')" class="emp-action-btn emp-action-btn--dark" @click="editFromDetail">
                    <span class="material-icons-round">edit</span>
                    Editar Perfil
                  </button>
                  <button
                    v-if="authStore.hasPermission('personal.write') && (selectedEmployee.estado || '').toLowerCase() === 'activo'"
                    class="emp-action-btn emp-action-btn--danger"
                    @click="openRetiroModal"
                  >
                    <span class="material-icons-round">person_off</span>
                    Retirar
                  </button>
                  <button
                    v-if="authStore.hasPermission('personal.write') && (selectedEmployee.estado || '').toLowerCase() !== 'activo'"
                    class="emp-action-btn emp-action-btn--success"
                    @click="reactivarEmpleado"
                    :disabled="savingEstado"
                  >
                    <span class="material-icons-round">person</span>
                    Reactivar
                  </button>
                </div>
              </section>

              <section v-if="selectedEmployee.user" style="margin-top: 1.5rem">
                <h3 class="emp-section-title">Usuario del Sistema</h3>
                <div class="emp-user-card">
                  <span class="material-icons-round" style="color: var(--primary); font-size: 20px">manage_accounts</span>
                  <div>
                    <div style="font-size: 0.8rem; font-weight: 600">{{ selectedEmployee.user.name || selectedEmployee.user.email }}</div>
                    <div style="font-size: 0.7rem; color: var(--text-gray)">{{ selectedEmployee.user.role || 'Sin rol' }}</div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </template>


        <!-- Tab: Licencia de Conducción -->
        <template v-else-if="activeTab === 'licencia'">
          <div class="emp-license-container">
            <div class="license-card-glow" :class="`license-card-glow--${getLicenseStatus(selectedEmployee.vencimiento_licencia).color}`">
              <div class="license-card-header">
                <span class="material-icons-round" style="font-size: 24px">badge</span>
                <span class="license-card-title">LICENCIA DE CONDUCCIÓN</span>
              </div>
              
              <div class="license-card-body">
                <div class="license-info-row">
                  <span class="license-label">Número de Licencia</span>
                  <span class="license-value">{{ selectedEmployee.licencia_conduccion || '—' }}</span>
                </div>
                
                <div class="license-info-row">
                  <span class="license-label">Categoría</span>
                  <span class="license-value license-category-badge">{{ selectedEmployee.categoria_licencia || '—' }}</span>
                </div>
                
                <div class="license-info-row">
                  <span class="license-label">Fecha de Vencimiento</span>
                  <span class="license-value">{{ selectedEmployee.vencimiento_licencia ? formatDate(selectedEmployee.vencimiento_licencia) : '—' }}</span>
                </div>
              </div>
              
              <div class="license-card-footer" :class="`license-status--${getLicenseStatus(selectedEmployee.vencimiento_licencia).color}`">
                <span class="material-icons-round">{{ getLicenseStatus(selectedEmployee.vencimiento_licencia).icon }}</span>
                <span>{{ getLicenseStatus(selectedEmployee.vencimiento_licencia).label }}</span>
              </div>
            </div>
          </div>
        </template>

        <!-- Tab: Programación -->
        <template v-else-if="activeTab === 'programacion'">
          <div class="emp-table-wrapper">
            <h3 class="emp-section-title">Programación de Labores</h3>
            <table v-if="selectedEmployee.programaciones && selectedEmployee.programaciones.length > 0" class="emp-detail-table-data">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Labor</th>
                  <th>Ubicación</th>
                  <th>Vehículo</th>
                  <th>Novedad</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="prog in selectedEmployee.programaciones" :key="prog.id">
                  <td class="font-bold">{{ formatDate(prog.fecha) }}</td>
                  <td>{{ prog.labor || '—' }}</td>
                  <td>{{ prog.ubicacion || '—' }}</td>
                  <td>
                    <span v-if="prog.vehiculo" class="emp-vehicle-tag">
                      <span class="material-icons-round" style="font-size: 14px">local_shipping</span>
                      {{ prog.vehiculo.placa || prog.vehiculo.numero_interno }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td>
                    <span v-if="prog.es_novedad" class="badge badge-danger">Sí</span>
                    <span v-else class="badge badge-success">No</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="emp-detail-empty">
              <span class="material-icons-round" style="font-size: 40px; color: var(--text-gray)">event_busy</span>
              <p>No hay programaciones registradas para este empleado.</p>
            </div>
          </div>
        </template>

        <!-- Tab: Órdenes de Trabajo -->
        <template v-else-if="activeTab === 'ordenes'">
          <div class="emp-table-wrapper">
            <h3 class="emp-section-title">Órdenes de Trabajo Asignadas</h3>
            <table v-if="selectedEmployee.ordenes_trabajo_asignadas && selectedEmployee.ordenes_trabajo_asignadas.length > 0" class="emp-detail-table-data">
              <thead>
                <tr>
                  <th>OT ID</th>
                  <th>Descripción</th>
                  <th>Vehículo</th>
                  <th>Prioridad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ot in selectedEmployee.ordenes_trabajo_asignadas" :key="ot.orden_trabajo_id">
                  <td class="font-bold">#{{ ot.orden_trabajo_id }}</td>
                  <td class="emp-table-desc" :title="ot.descripcion">{{ ot.descripcion || '—' }}</td>
                  <td>
                    <span v-if="ot.vehiculo" class="emp-vehicle-tag">
                      <span class="material-icons-round" style="font-size: 14px">local_shipping</span>
                      {{ ot.vehiculo.placa || ot.vehiculo.numero_interno }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td>
                    <span class="badge" :class="priorityBadgeClass(ot.prioridad)">
                      {{ ot.prioridad }}
                    </span>
                  </td>
                  <td>
                    <span class="badge" :class="otStatusBadgeClass(ot.estado)">
                      {{ ot.estado }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="emp-detail-empty">
              <span class="material-icons-round" style="font-size: 40px; color: var(--text-gray)">build_circle</span>
              <p>No hay órdenes de trabajo asignadas a este empleado.</p>
            </div>
          </div>
        </template>

        <!-- Tab: Combustible -->
        <template v-else-if="activeTab === 'combustible'">
          <div class="emp-table-wrapper">
            <h3 class="emp-section-title">Registros de Combustible (Tanqueos)</h3>
            <table v-if="selectedEmployee.registros_combustible && selectedEmployee.registros_combustible.length > 0" class="emp-detail-table-data">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Vehículo</th>
                  <th>Tipo Combustible</th>
                  <th>Cantidad</th>
                  <th>Estación</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="reg in selectedEmployee.registros_combustible" :key="reg.registro_id">
                  <td class="font-bold">{{ formatDate(reg.fecha) }}</td>
                  <td>
                    <span v-if="reg.vehiculo" class="emp-vehicle-tag">
                      <span class="material-icons-round" style="font-size: 14px">local_shipping</span>
                      {{ reg.vehiculo.placa || reg.vehiculo.numero_interno }}
                    </span>
                    <span v-else-if="reg.placa_manual" class="emp-vehicle-tag">{{ reg.placa_manual }}</span>
                    <span v-else>—</span>
                  </td>
                  <td>{{ reg.tipo_combustible || '—' }}</td>
                  <td>{{ reg.cantidad_galones }} Gal</td>
                  <td>{{ reg.estacion_servicio || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="emp-detail-empty">
              <span class="material-icons-round" style="font-size: 40px; color: var(--text-gray)">local_gas_station</span>
              <p>No hay registros de combustible asignados a este empleado.</p>
            </div>
          </div>
        </template>

        <!-- Tab: Préstamos de Herramientas -->
        <template v-else-if="activeTab === 'prestamos'">
          <div class="emp-table-wrapper">
            <h3 class="emp-section-title">Préstamos de Herramientas</h3>
            <table v-if="selectedEmployee.prestamos_herramientas && selectedEmployee.prestamos_herramientas.length > 0" class="emp-detail-table-data">
              <thead>
                <tr>
                  <th>Fecha Préstamo</th>
                  <th>Fecha Devolución</th>
                  <th>Herramienta / Producto</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="prest in selectedEmployee.prestamos_herramientas" :key="prest.prestamo_id">
                  <td class="font-bold">{{ formatDate(prest.fecha_prestamo) }}</td>
                  <td>{{ prest.fecha_devolucion ? formatDate(prest.fecha_devolucion) : 'Pendiente' }}</td>
                  <td>{{ prest.producto ? prest.producto.nombre : `ID: ${prest.producto_id}` }}</td>
                  <td>{{ prest.prestamo_cantidad }}</td>
                  <td>
                    <span class="badge" :class="prestamoStatusBadgeClass(prest.estado)">
                      {{ prest.estado }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-else class="emp-detail-empty">
              <span class="material-icons-round" style="font-size: 40px; color: var(--text-gray)">handyman</span>
              <p>No hay préstamos de herramientas registrados para este empleado.</p>
            </div>
          </div>
        </template>

        <!-- Tab: Checklists Preoperacionales -->
        <template v-else-if="activeTab === 'checklists'">
          <div class="emp-table-wrapper">
            <h3 class="emp-section-title">Checklists Preoperacionales de Flota</h3>
            <table v-if="selectedEmployee.checklists && selectedEmployee.checklists.length > 0" class="emp-detail-table-data">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Vehículo</th>
                  <th>Horómetro</th>
                  <th>Estado</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="chk in selectedEmployee.checklists" :key="chk.id">
                  <td class="font-bold">{{ formatDate(chk.fecha) }}</td>
                  <td>
                    <span v-if="chk.vehiculo" class="emp-vehicle-tag">
                      <span class="material-icons-round" style="font-size: 14px">local_shipping</span>
                      {{ chk.vehiculo.placa || chk.vehiculo.numero_interno }}
                    </span>
                    <span v-else>—</span>
                  </td>
                  <td>{{ chk.horometro_actual || '—' }}</td>
                  <td>
                    <span class="badge" :class="checklistStatusBadgeClass(chk.estado)">
                      {{ chk.estado }}
                    </span>
                  </td>
                  <td class="emp-table-desc" :title="chk.observaciones">{{ chk.observaciones || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="emp-detail-empty">
              <span class="material-icons-round" style="font-size: 40px; color: var(--text-gray)">fact_check</span>
              <p>No hay checklists preoperacionales registrados para este empleado.</p>
            </div>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="emp-detail-footer">
        <div class="emp-detail-footer-left">
          <span class="material-icons-round" style="font-size: 14px; color: var(--text-gray)">badge</span>
          <span style="font-size: 0.7rem; color: var(--text-gray)">ID: {{ selectedEmployee.id }}</span>
        </div>
        <div style="display: flex; gap: 0.5rem">
          <button class="btn btn-secondary btn-sm" @click="closeDetail">Cerrar</button>
          <button v-if="authStore.hasPermission('personal.write')" class="btn btn-primary btn-sm" @click="editFromDetail">
            <span class="material-icons-round" style="font-size: 16px">edit</span>
            Editar
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── MODAL RETIRAR EMPLEADO ────────────────────────── -->
  <div v-if="showRetiro" class="modal-overlay" @click.self="showRetiro = false">
    <div class="modal" style="max-width: 480px">
      <div class="modal-header" style="background: rgba(239,68,68,0.08)">
        <h3 style="color: var(--danger)">
          <span class="material-icons-round" style="font-size: 20px; vertical-align: middle; margin-right: 6px">person_off</span>
          RETIRAR EMPLEADO
        </h3>
        <button class="modal-close" @click="showRetiro = false">
          <span class="material-icons-round" style="font-size: 18px">close</span>
        </button>
      </div>
      <div class="modal-body">
        <p style="font-size: 0.85rem; color: var(--text-gray); margin-bottom: 1rem">
          Estás a punto de retirar a <strong style="color: var(--text-main)">{{ employeeFullName(selectedEmployee) }}</strong>.
          El empleado será marcado como retirado y no aparecerá en listados activos.
        </p>
        <div class="input-group">
          <label>Fecha de Retiro</label>
          <input v-model="retiroForm.fecha_retiro" class="input" type="date" required />
        </div>
        <div class="input-group" style="margin-top: 0.75rem">
          <label>Motivo del Retiro</label>
          <textarea v-model="retiroForm.motivo_retiro" class="input" rows="3" placeholder="Ej: Renuncia voluntaria, Fin de contrato, Despido..."></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="showRetiro = false">Cancelar</button>
        <button
          class="btn"
          style="background: var(--danger); color: white"
          :disabled="savingEstado || !retiroForm.fecha_retiro"
          @click="confirmarRetiro"
        >
          <span v-if="savingEstado" class="spinner" style="width: 16px; height: 16px; border-width: 2px"></span>
          <span v-else class="material-icons-round" style="font-size: 16px">person_off</span>
          {{ savingEstado ? 'PROCESANDO...' : 'CONFIRMAR RETIRO' }}
        </button>
      </div>
    </div>
  </div>

  <!-- ─── MODAL CREAR / EDITAR ──────────────────────────── -->
  <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
    <div class="modal modal-wide">
      <div class="modal-header">
        <h3>{{ isEditing ? 'EDITAR EMPLEADO' : 'NUEVO EMPLEADO' }}</h3>
        <button class="modal-close" @click="closeForm">
          <span class="material-icons-round" style="font-size: 18px">close</span>
        </button>
      </div>

      <div class="modal-body">
        <form class="form-grid-cv" @submit.prevent="submitForm">
          
          <!-- Seccion 1: Foto y Datos Personales -->
          <div class="form-card-section full-width">
            <h4 class="form-section-title">Foto y Datos de Contacto</h4>
            
            <div class="form-row-with-avatar">
              <!-- Upload Avatar Section -->
              <div class="form-avatar-upload">
                <div class="form-avatar-preview">
                  <img v-if="photoPreview" :src="photoPreview" alt="Preview" class="avatar-preview-img" />
                  <img v-else-if="form.foto_url_existing" :src="getAvatarUrl(form.foto_url_existing)" alt="Actual" class="avatar-preview-img" />
                  <span v-else class="material-icons-round" style="font-size: 48px; color: var(--text-gray)">person</span>
                </div>
                <div class="form-avatar-upload-actions">
                  <label class="btn btn-secondary btn-sm file-input-label">
                    <span class="material-icons-round" style="font-size: 16px">add_a_photo</span>
                    SELECCIONAR FOTO
                    <input type="file" ref="fileInput" accept="image/*" @change="onFileSelected" style="display: none" />
                  </label>
                  <button v-if="photoPreview || form.foto_url_existing" type="button" class="btn btn-danger-text btn-sm" @click="clearPhoto">
                    Eliminar foto
                  </button>
                  <div class="form-upload-tip">JPG, PNG. Máx 5MB</div>
                </div>
              </div>
              
              <!-- Basic Fields -->
              <div class="form-fields-grid-compact">
                <div class="input-group">
                  <label>Nombres</label>
                  <input v-model="form.nombres" class="input" required />
                </div>
                <div class="input-group">
                  <label>Apellidos</label>
                  <input v-model="form.apellidos" class="input" />
                </div>
                <div class="input-group">
                  <label>Documento de Identidad</label>
                  <input v-model="form.documento" class="input" />
                </div>
                <div class="input-group">
                  <label>Teléfono</label>
                  <input v-model="form.telefono" class="input" />
                </div>
              </div>
            </div>
            
            <div class="input-group" style="margin-top: 1rem">
              <label>Dirección de Residencia</label>
              <input v-model="form.direccion" class="input" placeholder="Ej: Calle 12 # 34 - 56" />
            </div>
          </div>
          
          <!-- Seccion 2: Cargo e Información Laboral -->
          <div class="form-card-section">
            <h4 class="form-section-title">Información Laboral</h4>
            <div class="form-fields-grid">
              <div class="input-group">
                <label>Cargo</label>
                <select v-model="form.cargo" class="input">
                  <option value="">Seleccionar...</option>
                  <option v-for="cargo in cargosList" :key="cargo" :value="cargo">{{ cargo }}</option>
                </select>
              </div>
              <div class="input-group">
                <label>Estado</label>
                <select v-model="form.estado" class="input">
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="retirado">Retirado</option>
                </select>
              </div>
            </div>
          </div>
          
          <!-- Seccion 3: Licencia de Conducción -->
          <div class="form-card-section">
            <h4 class="form-section-title">Licencia de Conducción</h4>
            <div class="form-fields-grid">
              <div class="input-group">
                <label>Número de Licencia</label>
                <input v-model="form.licencia_conduccion" class="input" placeholder="Opcional" />
              </div>
              <div class="input-group">
                <label>Categoría</label>
                <input v-model="form.categoria_licencia" class="input" placeholder="Ej: C2, B1..." />
              </div>
              <div class="input-group full-width">
                <label>Fecha de Vencimiento</label>
                <input v-model="form.vencimiento_licencia" class="input" type="date" />
              </div>
            </div>
          </div>
          
          <!-- Seccion 4: Resumen Profesional (Hoja de Vida) -->
          <div class="form-card-section full-width">
            <h4 class="form-section-title">Resumen Profesional (Hoja de Vida)</h4>
            <div class="input-group">
              <label>Biografía / Perfil Profesional</label>
              <textarea v-model="form.resumen_profesional" class="input" rows="4" placeholder="Describe la experiencia y habilidades..."></textarea>
            </div>
          </div>
          
          <!-- Seccion 5: Crear Usuario (si es creación) -->
          <template v-if="!isEditing">
            <div class="form-card-section full-width">
              <h4 class="form-section-title">Usuario del Sistema</h4>
              <div class="input-group">
                <label>Crear Cuenta de Usuario</label>
                <select v-model="form.crear_usuario" class="input">
                  <option :value="false">No crear usuario</option>
                  <option :value="true">Sí, crear cuenta en el sistema</option>
                </select>
              </div>
              
              <div v-if="form.crear_usuario" class="form-fields-grid-three" style="margin-top: 1rem">
                <div class="input-group">
                  <label>Email de Acceso</label>
                  <input v-model="form.email" class="input" type="email" required />
                </div>
                <div class="input-group">
                  <label>Contraseña</label>
                  <input v-model="form.password" class="input" type="password" required />
                </div>
                <div class="input-group">
                  <label>Rol de Usuario</label>
                  <select v-model="form.role" class="input">
                    <option value="admin">Administrador</option>
                    <option value="mecanico">Mecánico</option>
                    <option value="operador">Operador</option>
                    <option value="almacenista">Almacenista</option>
                  </select>
                </div>
              </div>
            </div>
          </template>
          
        </form>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeForm">Cancelar</button>
        <button class="btn btn-primary" :disabled="saving" @click="submitForm">
          <span v-if="saving" class="spinner" style="width: 16px; height: 16px; border-width: 2px"></span>
          <span v-else class="material-icons-round" style="font-size: 18px">save</span>
          {{ saving ? 'GUARDANDO...' : isEditing ? 'ACTUALIZAR' : 'GUARDAR' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAsyncState } from '../../../shared/composables/useAsyncState';
import { useRefresh } from '../../../shared/composables/useRefresh';
import { createEmployee, fetchEmployees, fetchEmployeeDetail, updateEmployee } from '../api/employeesService';
import http from '../../../shared/api/http';
import { useAuthStore } from '../../../shared/stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const { loading, error, run, clearError } = useAsyncState('');
const { onRefresh } = useRefresh();
const search = ref('');
const employees = ref([]);
const cargosList = ref([]);

// Filters
const filterEstado = ref('activo');
const estadoFilters = [
  { value: 'activo', label: 'Activos' },
  { value: 'retirado', label: 'Retirados' },
  { value: 'todos', label: 'Todos' },
];

// Form
const showForm = ref(false);
const saving = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const form = ref(defaultForm());

// File Upload Form Refs
const fileInput = ref(null);
const fileSelected = ref(null);
const photoPreview = ref(null);

// Detail
const showDetail = ref(false);
const selectedEmployee = ref(null);
const loadingDetail = ref(false);
const activeTab = ref('general');
const empStats = ref({ ot_asignadas: 0, prestamos: 0, tanqueos: 0, sesiones: 0 });

// Retiro
const showRetiro = ref(false);
const savingEstado = ref(false);
const retiroForm = ref({ fecha_retiro: '', motivo_retiro: '' });

const tabs = [
  { key: 'general', label: 'General' },
  { key: 'licencia', label: 'Licencia' },
  { key: 'programacion', label: 'Programación' },
  { key: 'ordenes', label: 'Órdenes de Trabajo' },
  { key: 'combustible', label: 'Combustible' },
  { key: 'prestamos', label: 'Préstamos' },
  { key: 'checklists', label: 'Checklists' },
];

// Helpers
function getAvatarUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
  const baseUrl = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('storage/') ? path : `storage/${path}`;
  return `${baseUrl}/${cleanPath}`;
}

function formatBio(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br />');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  const userTimezoneOffset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() + userTimezoneOffset);
  
  const day = String(localDate.getDate()).padStart(2, '0');
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const year = localDate.getFullYear();
  return `${day}/${month}/${year}`;
}

function getLicenseStatus(dateStr) {
  if (!dateStr) return { label: 'Sin vencimiento registrado', color: 'neutral', icon: 'help_outline' };
  const expiry = new Date(dateStr);
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { label: `VENCIDA hace ${Math.abs(diffDays)} días`, color: 'danger', icon: 'error_outline' };
  } else if (diffDays <= 30) {
    return { label: `Próxima a vencer (${diffDays} días restantes)`, color: 'warning', icon: 'warning_amber' };
  } else {
    return { label: `Vigente (${diffDays} días restantes)`, color: 'success', icon: 'check_circle_outline' };
  }
}

function priorityBadgeClass(priority) {
  const p = (priority || '').toLowerCase();
  if (p === 'alta') return 'badge-danger';
  if (p === 'media') return 'badge-warning';
  return 'badge-success';
}

function otStatusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'completado' || s === 'finalizado') return 'badge-success';
  if (s === 'en_proceso' || s === 'en proceso') return 'badge-primary';
  if (s === 'pendiente') return 'badge-warning';
  return 'badge-neutral';
}

function formatCurrency(val) {
  if (val === undefined || val === null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
}

function prestamoStatusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'devuelto') return 'badge-success';
  if (s === 'prestado') return 'badge-warning';
  return 'badge-neutral';
}

function checklistStatusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'aprobado' || s === 'ok') return 'badge-success';
  if (s === 'con_observaciones' || s === 'pendiente') return 'badge-warning';
  if (s === 'rechazado' || s === 'falla') return 'badge-danger';
  return 'badge-neutral';
}

function onFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  fileSelected.value = file;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    photoPreview.value = e.target.result;
  };
  reader.readAsDataURL(file);
}

function clearPhoto() {
  fileSelected.value = null;
  photoPreview.value = null;
  if (form.value.foto_url_existing) {
    form.value.foto_url_existing = null;
  }
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

onMounted(async () => {
  if (route.query.id) {
    filterEstado.value = 'todos';
  }
  await loadEmployees();
  await loadCargos();
  
  if (route.query.id) {
    const empId = Number(route.query.id);
    const emp = employees.value.find((e) => Number(e.id) === empId);
    if (emp) {
      openDetailModal(emp);
    }
  }
});

async function loadCargos() {
  try {
    const res = await http.get('/cargos');
    cargosList.value = res.data.cargos || [];
  } catch {
    // Fallback to empty lists if endpoint fails
  }
}

onRefresh(() => { loadEmployees(); });

const filteredEmployees = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return employees.value;
  return employees.value.filter((emp) => {
    const fullName = employeeFullName(emp).toLowerCase();
    const doc = (emp.documento || '').toLowerCase();
    const cargo = (emp.cargo || '').toLowerCase();
    return fullName.includes(q) || doc.includes(q) || cargo.includes(q);
  });
});

function defaultForm() {
  return {
    nombres: '', apellidos: '', documento: '', telefono: '', direccion: '',
    cargo: '', licencia_conduccion: '', categoria_licencia: '', vencimiento_licencia: '',
    resumen_profesional: '', estado: 'activo',
    crear_usuario: false, email: '', password: '', role: 'operador',
    foto_url_existing: null,
  };
}

async function loadEmployees() {
  try {
    await run(async () => {
      const params = {};
      if (filterEstado.value !== 'todos') params.estado = filterEstado.value;
      employees.value = await fetchEmployees(params);
    }, 'Error al cargar empleados');
  } catch { /* handled */ }
}

function employeeFullName(emp) {
  return `${emp.nombres || ''} ${emp.apellidos || ''}`.trim() || '—';
}

function statusBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s === 'activo') return 'badge-success';
  if (s === 'retirado') return 'badge-danger';
  if (s === 'inactivo') return 'badge-warning';
  return 'badge-neutral';
}

// ─── Detail Modal ──────────────────────────────────────
async function openDetailModal(emp) {
  selectedEmployee.value = emp;
  activeTab.value = 'general';
  showDetail.value = true;
  loadingDetail.value = true;
  empStats.value = { ot_asignadas: 0, prestamos: 0, tanqueos: 0, sesiones: 0 };

  try {
    const detail = await fetchEmployeeDetail(emp.id);
    selectedEmployee.value = { ...emp, ...detail };
    if (detail.stats) empStats.value = detail.stats;
  } catch { /* fall back to basic data */ }
  finally { loadingDetail.value = false; }
}

function closeDetail() {
  showDetail.value = false;
  selectedEmployee.value = null;
}

function editFromDetail() {
  const emp = selectedEmployee.value;
  closeDetail();
  if (emp) openEditModal(emp);
}

// ─── Retiro ────────────────────────────────────────────
function openRetiroModal() {
  const today = new Date().toISOString().split('T')[0];
  retiroForm.value = { fecha_retiro: today, motivo_retiro: '' };
  showRetiro.value = true;
}

async function confirmarRetiro() {
  if (!selectedEmployee.value || savingEstado.value) return;
  savingEstado.value = true;
  try {
    await updateEmployee(selectedEmployee.value.id, {
      estado: 'retirado',
      fecha_retiro: retiroForm.value.fecha_retiro,
      motivo_retiro: retiroForm.value.motivo_retiro || null,
    });
    selectedEmployee.value = { ...selectedEmployee.value, estado: 'retirado', fecha_retiro: retiroForm.value.fecha_retiro, motivo_retiro: retiroForm.value.motivo_retiro };
    showRetiro.value = false;
    await loadEmployees();
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Error al retirar empleado';
  } finally { savingEstado.value = false; }
}

async function reactivarEmpleado() {
  if (!selectedEmployee.value || savingEstado.value) return;
  savingEstado.value = true;
  try {
    await updateEmployee(selectedEmployee.value.id, {
      estado: 'activo',
      fecha_retiro: null,
      motivo_retiro: null,
    });
    selectedEmployee.value = { ...selectedEmployee.value, estado: 'activo', fecha_retiro: null, motivo_retiro: null };
    await loadEmployees();
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Error al reactivar empleado';
  } finally { savingEstado.value = false; }
}

// ─── Create / Edit ─────────────────────────────────────
function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  photoPreview.value = null;
  fileSelected.value = null;
  form.value = defaultForm();
  showForm.value = true;
}

function openEditModal(emp) {
  if (!emp) return;
  isEditing.value = true;
  editingId.value = emp.id;
  photoPreview.value = null;
  fileSelected.value = null;
  form.value = {
    nombres: emp.nombres || '',
    apellidos: emp.apellidos || '',
    documento: emp.documento || '',
    telefono: emp.telefono || '',
    direccion: emp.direccion || '',
    cargo: emp.cargo || '',
    licencia_conduccion: emp.licencia_conduccion || '',
    categoria_licencia: emp.categoria_licencia || '',
    vencimiento_licencia: emp.vencimiento_licencia ? emp.vencimiento_licencia.split('T')[0] : '',
    resumen_profesional: emp.resumen_profesional || '',
    estado: emp.estado || 'activo',
    crear_usuario: false, email: '', password: '', role: 'operador',
    foto_url_existing: emp.foto_url || null,
  };
  showForm.value = true;
}

function closeForm() {
  showForm.value = false;
  saving.value = false;
  photoPreview.value = null;
  fileSelected.value = null;
  form.value = defaultForm();
  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

async function submitForm() {
  if (saving.value) return;
  if (!form.value.nombres?.trim()) return;
  saving.value = true;
  clearError();

  let payload;
  if (fileSelected.value) {
    payload = new FormData();
    payload.append('nombres', form.value.nombres?.trim());
    if (form.value.apellidos) payload.append('apellidos', form.value.apellidos.trim());
    if (form.value.documento) payload.append('documento', form.value.documento.trim());
    if (form.value.telefono) payload.append('telefono', form.value.telefono.trim());
    if (form.value.direccion) payload.append('direccion', form.value.direccion.trim());
    if (form.value.cargo) payload.append('cargo', form.value.cargo.trim());
    if (form.value.licencia_conduccion) payload.append('licencia_conduccion', form.value.licencia_conduccion.trim());
    if (form.value.categoria_licencia) payload.append('categoria_licencia', form.value.categoria_licencia.trim());
    if (form.value.vencimiento_licencia) payload.append('vencimiento_licencia', form.value.vencimiento_licencia);
    if (form.value.resumen_profesional) payload.append('resumen_profesional', form.value.resumen_profesional.trim());
    payload.append('estado', form.value.estado || 'activo');
    payload.append('foto_url', fileSelected.value);

    if (!isEditing.value && form.value.crear_usuario) {
      payload.append('crear_usuario', '1');
      payload.append('email', form.value.email?.trim());
      payload.append('password', form.value.password);
      payload.append('role', form.value.role || 'operador');
    }
  } else {
    payload = {
      nombres: form.value.nombres?.trim(),
      apellidos: form.value.apellidos?.trim() || null,
      documento: form.value.documento?.trim() || null,
      telefono: form.value.telefono?.trim() || null,
      direccion: form.value.direccion?.trim() || null,
      cargo: form.value.cargo?.trim() || null,
      licencia_conduccion: form.value.licencia_conduccion?.trim() || null,
      categoria_licencia: form.value.categoria_licencia?.trim() || null,
      vencimiento_licencia: form.value.vencimiento_licencia || null,
      resumen_profesional: form.value.resumen_profesional?.trim() || null,
      estado: form.value.estado || 'activo',
    };

    if (isEditing.value && !form.value.foto_url_existing) {
      payload.foto_url = null;
    }

    if (!isEditing.value && form.value.crear_usuario) {
      payload.crear_usuario = true;
      payload.email = form.value.email?.trim() || null;
      payload.password = form.value.password || null;
      payload.role = form.value.role || 'operador';
    }
  }

  try {
    if (isEditing.value && editingId.value) {
      await updateEmployee(editingId.value, payload);
    } else {
      await createEmployee(payload);
    }
    closeForm();
    await loadEmployees();
  } catch (e) {
    error.value = e?.response?.data?.message || e?.displayMessage || e?.message || 'Error al guardar empleado';
  } finally { saving.value = false; }
}
</script>

<style scoped>
/* ── Filtro pills ──────────────────────────────────────── */
.emp-filter-pills {
  display: flex;
  gap: 4px;
  background: var(--bg-dark);
  border: 1px solid var(--surface-2);
  border-radius: 8px;
  padding: 3px;
}
.emp-pill {
  padding: 5px 14px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-gray);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.emp-pill:hover { color: var(--text-main); }
.emp-pill--active {
  background: var(--primary);
  color: #000;
}

/* ── Grid con scroll ───────────────────────────────────── */
.emp-grid-scroll {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  max-height: calc(100vh - 260px);
  padding: 0 1rem 1rem;
}
.emp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.emp-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 12px;
  cursor: pointer;
  transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s, background 0.2s;
}
.emp-card:hover {
  border-color: var(--primary);
  background: var(--primary-10);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.emp-card--inactive { opacity: 0.55; }
.emp-card--retirado {
  opacity: 0.5;
  border-color: var(--danger-10);
}
.emp-card--retirado:hover { border-color: var(--danger); }

.emp-avatar-wrap { position: relative; flex-shrink: 0; }
.emp-avatar {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--bg-dark);
  border: 2px solid var(--surface-2);
  display: flex; align-items: center; justify-content: center;
}
.emp-status-dot {
  position: absolute; bottom: 2px; right: 2px;
  width: 11px; height: 11px; border-radius: 50%;
  border: 2px solid var(--surface);
}
.emp-status-dot--lg { width: 16px; height: 16px; bottom: 4px; right: 4px; }
.emp-status-dot--active   { background: #22c55e; }
.emp-status-dot--inactive { background: #f59e0b; }
.emp-status-dot--retirado { background: #ef4444; }

.emp-card-info { flex: 1; min-width: 0; }
.emp-card-name {
  font-size: 0.92rem; font-weight: 700; color: var(--text-main);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 0 0.15rem;
}
.emp-card-cargo { font-size: 0.78rem; color: var(--text-gray); display: block; margin-bottom: 0.4rem; }
.emp-card-meta { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.emp-chip {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 0.68rem; padding: 2px 8px; border-radius: 100px;
  background: var(--surface-2); color: var(--text-gray); white-space: nowrap;
}
.emp-chip--yellow { background: var(--primary-10); color: var(--primary); }
.emp-chip--red { background: var(--danger-10); color: var(--danger); font-weight: 700; }
.emp-card-arrow { color: var(--text-gray); flex-shrink: 0; transition: color 0.2s; }
.emp-card:hover .emp-card-arrow { color: var(--primary); }

/* ── Modal de Detalle ──────────────────────────────────── */
.emp-detail-modal {
  position: relative; width: 100%; max-width: 860px; max-height: 90vh;
  overflow-y: auto; background: var(--surface);
  border: 1px solid var(--surface-2); border-radius: 20px;
  box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; animation: slideUp 0.25s ease;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
.emp-detail-close {
  position: absolute; top: 1.25rem; right: 1.25rem;
  width: 36px; height: 36px; border-radius: 50%;
  background: transparent; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-gray); transition: background 0.2s, color 0.2s; z-index: 10;
}
.emp-detail-close:hover { background: var(--primary-10); color: var(--primary); }

.emp-detail-header { display: flex; align-items: center; gap: 1.5rem; padding: 2rem 2rem 1rem; }
.emp-detail-avatar-wrap { position: relative; flex-shrink: 0; }
.emp-detail-avatar {
  width: 90px; height: 90px; border-radius: 50%;
  background: var(--bg-dark);
  border: 4px solid var(--primary);
  display: flex; align-items: center; justify-content: center;
}
.emp-detail-name {
  font-family: 'Oswald', sans-serif; font-size: 2rem; font-weight: 700;
  color: var(--text-main); letter-spacing: -0.5px; margin: 0 0 0.4rem;
}
.emp-detail-badges { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.emp-detail-badge-primary {
  background: var(--primary); color: #000;
  font-size: 0.7rem; font-weight: 700; padding: 3px 12px;
  border-radius: 100px; text-transform: uppercase; letter-spacing: 0.05em;
}
.emp-detail-badge-danger {
  background: var(--danger-10); color: var(--danger);
  font-size: 0.7rem; font-weight: 700; padding: 3px 12px;
  border-radius: 100px; text-transform: uppercase;
}
.emp-detail-id { font-size: 0.78rem; color: var(--text-gray); font-weight: 500; }

/* Tabs */
.emp-detail-tabs {
  display: flex; gap: 2rem; padding: 0 2rem;
  border-bottom: 1px solid var(--surface-2);
}
.emp-detail-tab {
  background: none; border: none;
  border-bottom: 2px solid transparent; padding: 0.85rem 0;
  font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-gray);
  cursor: pointer; transition: color 0.2s, border-color 0.2s;
}
.emp-detail-tab--active { color: var(--primary); border-bottom-color: var(--primary); }
.emp-detail-tab:hover { color: var(--primary); }

/* Body / columns */
.emp-detail-body { padding: 1.5rem 2rem; flex: 1; }
.emp-detail-columns { display: grid; grid-template-columns: 1fr 260px; gap: 2rem; }
@media (max-width: 640px) { .emp-detail-columns { grid-template-columns: 1fr; } }

.emp-section-title {
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.2em; color: var(--primary); margin: 0 0 1rem;
}
.emp-info-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;
  background: var(--bg-dark); border: 1px solid var(--surface-2);
  border-radius: 10px; padding: 1.25rem;
}
.emp-info-field { display: flex; flex-direction: column; gap: 0.2rem; }
.emp-info-label {
  font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--text-gray);
}
.emp-info-value { font-size: 0.88rem; font-weight: 500; color: var(--text-main); }

/* Stats */
.emp-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; }
.emp-stat-card {
  background: var(--bg-dark); border: 1px solid var(--surface-2);
  border-left: 3px solid var(--primary);
  border-radius: 8px; padding: 0.75rem 1rem;
  display: flex; flex-direction: column; gap: 0.2rem;
}
.emp-stat-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; color: var(--text-gray); }
.emp-stat-value { font-family: 'Oswald', sans-serif; font-size: 1.6rem; color: var(--text-main); }

/* Side actions */
.emp-quick-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.emp-action-btn {
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
  padding: 0.75rem 0.5rem; border-radius: 8px; border: none; cursor: pointer;
  font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; transition: opacity 0.2s, transform 0.15s;
}
.emp-action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
.emp-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.emp-action-btn--dark { background: var(--surface-2); color: var(--text-main); }
.emp-action-btn--danger { background: var(--danger-10); color: var(--danger); }
.emp-action-btn--success { background: var(--success-10); color: var(--success); }

/* User card */
.emp-user-card {
  display: flex; align-items: center; gap: 0.75rem;
  background: var(--bg-dark); border: 1px solid var(--surface-2);
  border-radius: 8px; padding: 0.75rem 1rem;
}

/* Empty */
.emp-detail-empty {
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
  padding: 3rem 1rem; color: var(--text-gray); text-align: center; font-size: 0.85rem;
}

/* Footer */
.emp-detail-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 2rem; background: var(--bg-dark);
  border-top: 1px solid var(--surface-2); border-radius: 0 0 20px 20px;
}
.emp-detail-footer-left { display: flex; align-items: center; gap: 0.4rem; }

/* ── Avatar images ─────────────────────────────────────── */
.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.avatar-img-lg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

/* ── Hoja de Vida (CV) Tab ─────────────────────────────── */
.emp-cv-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--bg-dark);
  border: 1px solid var(--surface-2);
  border-radius: 12px;
  padding: 1.5rem;
}
.emp-cv-header {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  border-bottom: 1px solid var(--surface-2);
  padding-bottom: 1.5rem;
}
@media (max-width: 640px) {
  .emp-cv-header {
    flex-direction: column;
    text-align: center;
  }
}
.emp-cv-photo-large {
  width: 120px;
  height: 120px;
  border-radius: 12px;
  border: 3px solid var(--primary);
  background: var(--surface);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
}
.cv-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cv-photo-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.emp-cv-basic-info {
  flex: 1;
}
.emp-cv-basic-info h2 {
  font-family: 'Oswald', sans-serif;
  font-size: 1.5rem;
  margin: 0 0 0.25rem;
  color: var(--text-main);
}
.emp-cv-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 1rem;
}
.emp-cv-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}
.emp-cv-meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-gray);
}
.emp-cv-meta-item span.material-icons-round {
  font-size: 16px;
  color: var(--primary);
}
.emp-cv-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.emp-cv-bio {
  font-size: 0.88rem;
  line-height: 1.6;
  color: var(--text-main);
  background: var(--surface);
  border: 1px solid var(--surface-2);
  border-radius: 8px;
  padding: 1.25rem;
  white-space: pre-line;
}

/* ── Licencia de Conducción Tab ────────────────────────── */
.emp-license-container {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}
.license-card-glow {
  width: 100%;
  max-width: 420px;
  background: var(--bg-dark);
  border: 1px solid var(--surface-2);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: box-shadow 0.3s;
}
.license-card-glow--success {
  border-left: 4px solid #22c55e;
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.05);
}
.license-card-glow--warning {
  border-left: 4px solid #f59e0b;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.05);
}
.license-card-glow--danger {
  border-left: 4px solid #ef4444;
  box-shadow: 0 4px 20px rgba(239, 68, 68, 0.05);
}
.license-card-glow--neutral {
  border-left: 4px solid var(--text-gray);
}

.license-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--surface-2);
}
.license-card-header .material-icons-round {
  color: var(--primary);
}
.license-card-title {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--text-main);
}

.license-card-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.license-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px dashed var(--surface-2);
  padding-bottom: 0.75rem;
}
.license-info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.license-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-gray);
  text-transform: uppercase;
}
.license-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
}
.license-category-badge {
  background: var(--primary);
  color: #000;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 800;
}

.license-card-footer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
}
.license-status--success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.license-status--warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.license-status--danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.license-status--neutral { background: rgba(156, 163, 175, 0.1); color: var(--text-gray); }

/* ── Tablas de Programacion y OT ───────────────────────── */
.emp-table-wrapper {
  background: var(--bg-dark);
  border: 1px solid var(--surface-2);
  border-radius: 12px;
  padding: 1.5rem;
}
.emp-detail-table-data {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.75rem;
}
.emp-detail-table-data th {
  text-align: left;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-gray);
  padding: 0.75rem 1rem;
  border-bottom: 2px solid var(--surface-2);
}
.emp-detail-table-data td {
  padding: 0.75rem 1rem;
  font-size: 0.82rem;
  border-bottom: 1px solid var(--surface-2);
  color: var(--text-main);
}
.emp-detail-table-data tr:hover td {
  background: rgba(255, 255, 255, 0.01);
}
.emp-vehicle-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--surface-2);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid var(--surface-2);
}
.emp-table-desc {
  max-width: 250px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Formulario Edit/Create ────────────────────────────── */
.form-grid-cv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}
@media (max-width: 640px) {
  .form-grid-cv {
    grid-template-columns: 1fr;
  }
}
.form-card-section {
  background: var(--bg-dark);
  border: 1px solid var(--surface-2);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-section-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--primary);
  margin: 0 0 0.5rem;
  border-bottom: 1px solid var(--surface-2);
  padding-bottom: 0.5rem;
}
.form-row-with-avatar {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}
@media (max-width: 500px) {
  .form-row-with-avatar {
    flex-direction: column;
  }
}
.form-avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}
.form-avatar-preview {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  border: 2px dashed var(--surface-2);
  background: var(--surface);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.avatar-preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.form-avatar-upload-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}
.file-input-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 0.68rem;
  font-weight: 700;
}
.btn-danger-text {
  background: none;
  border: none;
  color: var(--danger);
  font-size: 0.65rem;
  font-weight: 700;
  cursor: pointer;
  padding: 2px 8px;
}
.btn-danger-text:hover {
  text-decoration: underline;
}
.form-upload-tip {
  font-size: 0.6rem;
  color: var(--text-gray);
}
.form-fields-grid-compact {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  width: 100%;
}
.form-fields-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.form-fields-grid-three {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 640px) {
  .form-fields-grid-three {
    grid-template-columns: 1fr;
  }
}
</style>
