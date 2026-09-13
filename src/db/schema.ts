/**
 * NODUS — Modelo de datos (Drizzle ORM / PostgreSQL)
 * ---------------------------------------------------------------------------
 * Cada tabla está trazada contra la matriz de requerimientos (REQ-001..REQ-020).
 */

import {
  pgTable,
  pgEnum,
  text,
  varchar,
  timestamp,
  integer,
  boolean,
  doublePrecision,
  jsonb,
  customType,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'
import { createId } from '@/lib/id'

/** bytea para almacenar archivos dentro de la BD (MVP sin dependencia de S3). */
const bytea = customType<{ data: Buffer; notNull: false; default: false }>({
  dataType: () => 'bytea',
})

// ============================ ENUMS ========================================

export const rolEnum = pgEnum('rol', [
  'SUPER_ADMIN',
  'ADVISORY',
  'CONSULTOR',
  'CLIENTE_MIPYME',
])

export const estadoCasoEnum = pgEnum('estado_caso', [
  'CREADO',
  'EN_REVISION',
  'CLASIFICADO',
  'EN_POSTULACION',
  'ASIGNADO',
  'PROPUESTA_EN_DISENO',
  'PROPUESTA_LISTA_QA',
  'PROPUESTA_ENVIADA',
  'EN_DECISION_CLIENTE',
  'PENDIENTE_CONTRATACION',
  'AUTORIZADO_EJECUCION',
  'EN_EJECUCION',
  'LISTO_CIERRE',
  'CERRADO',
])

export const urgenciaEnum = pgEnum('urgencia', ['ALTA', 'MEDIA', 'BAJA'])
export const impactoEnum = pgEnum('impacto', ['ALTO', 'MEDIO', 'BAJO'])

export const nivelConsultorEnum = pgEnum('nivel_consultor', [
  'JUNIOR',
  'SEMI_SENIOR',
  'SENIOR',
  'EXPERTO',
])

export const disponibilidadEnum = pgEnum('disponibilidad', [
  'DISPONIBLE',
  'PARCIAL',
  'NO_DISPONIBLE',
])

export const estadoPostulacionEnum = pgEnum('estado_postulacion', [
  'POSTULADA',
  'ACEPTADA',
  'RECHAZADA',
  'RETIRADA',
])

export const estadoPropuestaEnum = pgEnum('estado_propuesta', [
  'BORRADOR',
  'EN_QA',
  'LISTA',
  'ENVIADA',
  'ACEPTADA',
  'AJUSTES_SOLICITADOS',
  'RECHAZADA',
])

export const tipoDocumentoEnum = pgEnum('tipo_documento', [
  'INTAKE',
  'PROPUESTA',
  'CONTRACTUAL',
  'EVIDENCIA',
  'ACTA_CIERRE',
  'OTRO',
])

export const tipoAlertaEnum = pgEnum('tipo_alerta', [
  'SLA_PROXIMO',
  'SLA_VENCIDO',
  'ESCALAMIENTO',
  'INFORMATIVA',
])

export const estadoActividadEnum = pgEnum('estado_actividad', [
  'PLANIFICADA',
  'EN_CURSO',
  'COMPLETADA',
  'BLOQUEADA',
])

// ============================ EMPRESAS =====================================
// REQ-001 / REQ-002: onboarding ágil + principio "Empresa Única – Casos Múltiples".

export const empresas = pgTable(
  'empresas',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    nombre: text('nombre').notNull(),
    /** nombre en minúsculas y sin espacios: clave de deduplicación */
    nombreNormalizado: text('nombre_normalizado').notNull(),
    nit: text('nit'),
    dominioCorreo: text('dominio_correo'),
    correoContacto: text('correo_contacto').notNull(),
    telefono: text('telefono'),
    pais: text('pais').notNull(),
    ciudad: text('ciudad').notNull(),
    sector: text('sector'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('empresas_nombre_norm_uq').on(t.nombreNormalizado),
    index('empresas_dominio_idx').on(t.dominioCorreo),
  ],
)

// ============================ USUARIOS =====================================

export const usuarios = pgTable(
  'usuarios',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    nombre: text('nombre').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    rol: rolEnum('rol').notNull().default('CLIENTE_MIPYME'),
    cargo: text('cargo'),
    telefono: text('telefono'),
    activo: boolean('activo').notNull().default(true),
    empresaId: text('empresa_id').references(() => empresas.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('usuarios_email_uq').on(t.email), index('usuarios_rol_idx').on(t.rol)],
)

/** REQ-006: filtros de elegibilidad por especialidad, nivel y disponibilidad. */
export const consultorPerfiles = pgTable(
  'consultor_perfiles',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    especialidades: text('especialidades')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    nivel: nivelConsultorEnum('nivel').notNull().default('SEMI_SENIOR'),
    disponibilidad: disponibilidadEnum('disponibilidad').notNull().default('DISPONIBLE'),
    anosExperiencia: integer('anos_experiencia').notNull().default(0),
    bio: text('bio'),
    reputacion: doublePrecision('reputacion').notNull().default(0),
    casosCerrados: integer('casos_cerrados').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('consultor_perfil_usuario_uq').on(t.usuarioId)],
)

// ============================ CASOS ========================================

export const casos = pgTable(
  'casos',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    /** REQ-003: identificador único y legible del caso. */
    codigo: text('codigo').notNull(),
    titulo: text('titulo').notNull(),
    descripcion: text('descripcion').notNull(),
    estado: estadoCasoEnum('estado').notNull().default('CREADO'),

    areaNegocio: text('area_negocio').notNull(),
    urgencia: urgenciaEnum('urgencia').notNull(),
    impacto: impactoEnum('impacto').notNull(),

    // REQ-004: clasificación gobernada (se completa en debida diligencia)
    complejidad: text('complejidad'),
    tipoIntervencion: text('tipo_intervencion'),
    etiquetas: text('etiquetas')
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    notasClasificacion: text('notas_clasificacion'),

    empresaId: text('empresa_id')
      .notNull()
      .references(() => empresas.id),
    creadoPorId: text('creado_por_id')
      .notNull()
      .references(() => usuarios.id),

    // REQ-008: un único consultor responsable principal
    consultorAsignadoId: text('consultor_asignado_id').references(() => usuarios.id),
    asignadoAt: timestamp('asignado_at', { withTimezone: true }),

    // REQ-009 / REQ-017: SLA por estado
    slaVenceAt: timestamp('sla_vence_at', { withTimezone: true }),
    slaHoras: integer('sla_horas'),
    slaIncumplido: boolean('sla_incumplido').notNull().default(false),

    valorCerrado: doublePrecision('valor_cerrado'),
    cerradoAt: timestamp('cerrado_at', { withTimezone: true }),
    actaCierre: text('acta_cierre'),
    evaluacionFinal: integer('evaluacion_final'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('casos_codigo_uq').on(t.codigo),
    index('casos_estado_idx').on(t.estado),
    index('casos_empresa_idx').on(t.empresaId),
    index('casos_consultor_idx').on(t.consultorAsignadoId),
  ],
)

/** Historial fino de cambios de estado del workflow. */
export const transiciones = pgTable(
  'transiciones',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    casoId: text('caso_id')
      .notNull()
      .references(() => casos.id, { onDelete: 'cascade' }),
    estadoAnterior: estadoCasoEnum('estado_anterior'),
    estadoNuevo: estadoCasoEnum('estado_nuevo').notNull(),
    actorId: text('actor_id'),
    actorNombre: text('actor_nombre').notNull(),
    comentario: text('comentario'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('transiciones_caso_idx').on(t.casoId)],
)

// ============================ BOLSA INTERNA ================================
// REQ-007: postulaciones estructuradas mediante plantilla T3C.

export const postulaciones = pgTable(
  'postulaciones',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    casoId: text('caso_id')
      .notNull()
      .references(() => casos.id, { onDelete: 'cascade' }),
    consultorId: text('consultor_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    enfoque: text('enfoque').notNull(),
    experiencia: text('experiencia').notNull(),
    tiempoEstimado: integer('tiempo_estimado').notNull(),
    estado: estadoPostulacionEnum('estado').notNull().default('POSTULADA'),
    observacion: text('observacion'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('postulacion_caso_consultor_uq').on(t.casoId, t.consultorId),
    index('postulaciones_caso_idx').on(t.casoId),
  ],
)

// ============================ PROPUESTAS ===================================
// REQ-009: plantillas TP4A–TP4H con versionamiento documental.

export const propuestas = pgTable(
  'propuestas',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    casoId: text('caso_id')
      .notNull()
      .references(() => casos.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    titulo: text('titulo').notNull(),
    resumen: text('resumen').notNull(),
    alcance: text('alcance').notNull(),
    metodologia: text('metodologia').notNull(),
    entregables: text('entregables').notNull(),
    cronograma: text('cronograma').notNull(),
    supuestos: text('supuestos'),
    valorEstimado: doublePrecision('valor_estimado'),
    duracionDias: integer('duracion_dias'),

    estado: estadoPropuestaEnum('estado').notNull().default('BORRADOR'),
    // REQ-010: checklist QA metodológico
    qaChecklist: jsonb('qa_checklist').$type<Record<string, boolean>>(),
    qaObservaciones: text('qa_observaciones'),
    qaAprobadaPor: text('qa_aprobada_por'),

    enviadaAt: timestamp('enviada_at', { withTimezone: true }),
    decisionAt: timestamp('decision_at', { withTimezone: true }),
    decisionComentario: text('decision_comentario'),

    creadaPorId: text('creada_por_id')
      .notNull()
      .references(() => usuarios.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('propuesta_caso_version_uq').on(t.casoId, t.version),
    index('propuestas_caso_idx').on(t.casoId),
  ],
)

// ============================ GESTIÓN DOCUMENTAL ===========================

export const documentos = pgTable(
  'documentos',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    nombre: text('nombre').notNull(),
    tipo: tipoDocumentoEnum('tipo').notNull().default('OTRO'),
    mimeType: varchar('mime_type', { length: 160 }).notNull(),
    tamano: integer('tamano').notNull(),
    contenido: bytea('contenido').notNull(),
    version: integer('version').notNull().default(1),
    descripcion: text('descripcion'),
    casoId: text('caso_id').references(() => casos.id, { onDelete: 'cascade' }),
    propuestaId: text('propuesta_id').references(() => propuestas.id, { onDelete: 'cascade' }),
    subidoPorId: text('subido_por_id')
      .notNull()
      .references(() => usuarios.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('documentos_caso_idx').on(t.casoId)],
)

// ============================ CONTRATACIÓN =================================
// REQ-015 / REQ-016: NODUS no es parte contractual, pero bloquea la ejecución
// hasta que el checklist documental esté completo.

export const checklistContratacion = pgTable(
  'checklist_contratacion',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    casoId: text('caso_id')
      .notNull()
      .references(() => casos.id, { onDelete: 'cascade' }),
    propuestaAceptada: boolean('propuesta_aceptada').notNull().default(false),
    contratoFirmado: boolean('contrato_firmado').notNull().default(false),
    alcanceConfirmado: boolean('alcance_confirmado').notNull().default(false),
    cronogramaAcordado: boolean('cronograma_acordado').notNull().default(false),
    condicionesEconomicas: boolean('condiciones_economicas').notNull().default(false),
    datosTratamiento: boolean('datos_tratamiento').notNull().default(false),
    observaciones: text('observaciones'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('checklist_caso_uq').on(t.casoId)],
)

// ============================ EJECUCIÓN ====================================
// REQ-017: seguimiento de hitos y actividades.

export const actividades = pgTable(
  'actividades',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    casoId: text('caso_id')
      .notNull()
      .references(() => casos.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    descripcion: text('descripcion'),
    estado: estadoActividadEnum('estado').notNull().default('PLANIFICADA'),
    fechaPlan: timestamp('fecha_plan', { withTimezone: true }),
    fechaReal: timestamp('fecha_real', { withTimezone: true }),
    responsableId: text('responsable_id').references(() => usuarios.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('actividades_caso_idx').on(t.casoId)],
)

// ============================ SLA & ALERTAS ================================

export const slaReglas = pgTable(
  'sla_reglas',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    estado: estadoCasoEnum('estado').notNull(),
    horas: integer('horas').notNull(),
    nivelEscalamiento: integer('nivel_escalamiento').notNull().default(1),
    descripcion: text('descripcion'),
  },
  (t) => [uniqueIndex('sla_regla_estado_uq').on(t.estado)],
)

export const alertas = pgTable(
  'alertas',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    casoId: text('caso_id')
      .notNull()
      .references(() => casos.id, { onDelete: 'cascade' }),
    tipo: tipoAlertaEnum('tipo').notNull(),
    mensaje: text('mensaje').notNull(),
    nivel: integer('nivel').notNull().default(1),
    atendida: boolean('atendida').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('alertas_caso_idx').on(t.casoId)],
)

/** REQ-019: comunicación estructurada (notificaciones in-app). */
export const notificaciones = pgTable(
  'notificaciones',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    usuarioId: text('usuario_id')
      .notNull()
      .references(() => usuarios.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull(),
    mensaje: text('mensaje').notNull(),
    url: text('url'),
    leida: boolean('leida').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notificaciones_usuario_idx').on(t.usuarioId, t.leida)],
)

// ============================ BITÁCORA / AUDITORÍA =========================
// REQ-005: registro inmutable de actor, fecha, acción y cambios de estado.

export const bitacora = pgTable(
  'bitacora',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    actorId: text('actor_id'),
    actorNombre: text('actor_nombre').notNull(),
    actorRol: text('actor_rol').notNull(),
    accion: text('accion').notNull(),
    entidad: text('entidad').notNull(),
    entidadId: text('entidad_id'),
    estadoAnterior: text('estado_anterior'),
    estadoNuevo: text('estado_nuevo'),
    detalle: jsonb('detalle'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('bitacora_entidad_idx').on(t.entidad, t.entidadId),
    index('bitacora_created_idx').on(t.createdAt),
  ],
)

// ============================ TAXONOMÍAS (LOV) =============================
// REQ-004: listas de valores parametrizadas y gobernadas.

export const lov = pgTable(
  'lov',
  {
    id: text('id').primaryKey().$defaultFn(createId),
    grupo: text('grupo').notNull(),
    codigo: text('codigo').notNull(),
    etiqueta: text('etiqueta').notNull(),
    orden: integer('orden').notNull().default(0),
    activo: boolean('activo').notNull().default(true),
  },
  (t) => [uniqueIndex('lov_grupo_codigo_uq').on(t.grupo, t.codigo), index('lov_grupo_idx').on(t.grupo)],
)

// ============================ RELACIONES ===================================

export const empresasRel = relations(empresas, ({ many }) => ({
  usuarios: many(usuarios),
  casos: many(casos),
}))

export const usuariosRel = relations(usuarios, ({ one, many }) => ({
  empresa: one(empresas, { fields: [usuarios.empresaId], references: [empresas.id] }),
  perfil: one(consultorPerfiles, {
    fields: [usuarios.id],
    references: [consultorPerfiles.usuarioId],
  }),
  postulaciones: many(postulaciones),
}))

export const consultorPerfilesRel = relations(consultorPerfiles, ({ one }) => ({
  usuario: one(usuarios, { fields: [consultorPerfiles.usuarioId], references: [usuarios.id] }),
}))

export const casosRel = relations(casos, ({ one, many }) => ({
  empresa: one(empresas, { fields: [casos.empresaId], references: [empresas.id] }),
  creadoPor: one(usuarios, { fields: [casos.creadoPorId], references: [usuarios.id] }),
  consultorAsignado: one(usuarios, {
    fields: [casos.consultorAsignadoId],
    references: [usuarios.id],
  }),
  postulaciones: many(postulaciones),
  propuestas: many(propuestas),
  documentos: many(documentos),
  transiciones: many(transiciones),
  alertas: many(alertas),
  actividades: many(actividades),
  checklist: one(checklistContratacion, {
    fields: [casos.id],
    references: [checklistContratacion.casoId],
  }),
}))

export const postulacionesRel = relations(postulaciones, ({ one }) => ({
  caso: one(casos, { fields: [postulaciones.casoId], references: [casos.id] }),
  consultor: one(usuarios, { fields: [postulaciones.consultorId], references: [usuarios.id] }),
}))

export const propuestasRel = relations(propuestas, ({ one, many }) => ({
  caso: one(casos, { fields: [propuestas.casoId], references: [casos.id] }),
  creadaPor: one(usuarios, { fields: [propuestas.creadaPorId], references: [usuarios.id] }),
  documentos: many(documentos),
}))

export const documentosRel = relations(documentos, ({ one }) => ({
  caso: one(casos, { fields: [documentos.casoId], references: [casos.id] }),
  propuesta: one(propuestas, { fields: [documentos.propuestaId], references: [propuestas.id] }),
  subidoPor: one(usuarios, { fields: [documentos.subidoPorId], references: [usuarios.id] }),
}))

export const transicionesRel = relations(transiciones, ({ one }) => ({
  caso: one(casos, { fields: [transiciones.casoId], references: [casos.id] }),
}))

export const alertasRel = relations(alertas, ({ one }) => ({
  caso: one(casos, { fields: [alertas.casoId], references: [casos.id] }),
}))

export const actividadesRel = relations(actividades, ({ one }) => ({
  caso: one(casos, { fields: [actividades.casoId], references: [casos.id] }),
  responsable: one(usuarios, { fields: [actividades.responsableId], references: [usuarios.id] }),
}))

export const checklistRel = relations(checklistContratacion, ({ one }) => ({
  caso: one(casos, { fields: [checklistContratacion.casoId], references: [casos.id] }),
}))

// ============================ TIPOS ========================================

export type Rol = (typeof rolEnum.enumValues)[number]
export type TipoDocumento = (typeof tipoDocumentoEnum.enumValues)[number]
export type EstadoCaso = (typeof estadoCasoEnum.enumValues)[number]
export type Usuario = typeof usuarios.$inferSelect
export type Empresa = typeof empresas.$inferSelect
export type Caso = typeof casos.$inferSelect
export type Propuesta = typeof propuestas.$inferSelect
export type Postulacion = typeof postulaciones.$inferSelect
export type Documento = typeof documentos.$inferSelect
export type Alerta = typeof alertas.$inferSelect
export type Actividad = typeof actividades.$inferSelect
