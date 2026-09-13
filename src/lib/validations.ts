/**
 * Validación de entradas con Zod.
 * Toda la información que llega desde el navegador se valida aquí antes de
 * tocar la base de datos.
 */

import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

/** Plantilla T1 — Registro de caso + identificación básica de la empresa. */
export const intakeSchema = z.object({
  // Bloque 1 — empresa y contacto
  empresaNombre: z.string().min(2, 'Nombre de la empresa requerido'),
  nit: z.string().optional().or(z.literal('')),
  contactoNombre: z.string().min(2, 'Nombre del contacto requerido'),
  cargo: z.string().min(2, 'Cargo requerido'),
  email: z.string().email('Correo inválido'),
  telefono: z.string().min(6, 'Teléfono requerido'),
  pais: z.string().min(2, 'País requerido'),
  ciudad: z.string().min(2, 'Ciudad requerida'),
  aceptaTerminos: z.literal(true, { message: 'Debe aceptar los términos' }),

  // Bloque 2 — necesidad empresarial
  titulo: z.string().min(5, 'Título del caso requerido'),
  descripcion: z.string().min(20, 'Describa la necesidad (mínimo 20 caracteres)'),
  areaNegocio: z.string().min(2, 'Seleccione el área'),
  urgencia: z.enum(['ALTA', 'MEDIA', 'BAJA']),
  impacto: z.enum(['ALTO', 'MEDIO', 'BAJO']),
  password: z.string().min(6, 'La contraseña debe tener mínimo 6 caracteres'),
})

/** Caso creado desde dentro de la plataforma (empresa ya existente). */
export const casoSchema = z.object({
  empresaId: z.string().min(1),
  titulo: z.string().min(5),
  descripcion: z.string().min(20),
  areaNegocio: z.string().min(2),
  urgencia: z.enum(['ALTA', 'MEDIA', 'BAJA']),
  impacto: z.enum(['ALTO', 'MEDIO', 'BAJO']),
})

/** REQ-004 — clasificación gobernada en debida diligencia. */
export const clasificacionSchema = z.object({
  complejidad: z.string().min(1, 'Seleccione la complejidad'),
  tipoIntervencion: z.string().min(1, 'Seleccione el tipo de intervención'),
  etiquetas: z.array(z.string()).default([]),
  notasClasificacion: z.string().optional().or(z.literal('')),
})

export const transicionSchema = z.object({
  destino: z.string().min(1),
  comentario: z.string().optional().or(z.literal('')),
})

/** REQ-007 — plantilla T3C de postulación. */
export const postulacionSchema = z.object({
  casoId: z.string().min(1),
  enfoque: z.string().min(20, 'Describa su enfoque (mínimo 20 caracteres)'),
  experiencia: z.string().min(20, 'Describa su experiencia relevante'),
  tiempoEstimado: z.coerce.number().int().min(1, 'Indique los días estimados'),
})

/** REQ-009 — plantillas TP4A–TP4H. */
export const propuestaSchema = z.object({
  casoId: z.string().min(1),
  titulo: z.string().min(5),
  resumen: z.string().min(20),
  alcance: z.string().min(20),
  metodologia: z.string().min(20),
  entregables: z.string().min(10),
  cronograma: z.string().min(10),
  supuestos: z.string().optional().or(z.literal('')),
  valorEstimado: z.coerce.number().min(0).optional(),
  duracionDias: z.coerce.number().int().min(1).optional(),
})

export const ITEMS_QA = [
  'alcanceClaro',
  'metodologiaConsistente',
  'entregablesMedibles',
  'cronogramaViable',
  'riesgosIdentificados',
  'valorJustificado',
] as const

export const qaSchema = z.object({
  checklist: z.record(z.enum(ITEMS_QA), z.boolean()),
  observaciones: z.string().optional().or(z.literal('')),
})

/** REQ-013 — decisión estructurada del cliente (TP6A–TP6E). */
export const decisionSchema = z.object({
  decision: z.enum(['ACEPTADA', 'AJUSTES_SOLICITADOS', 'RECHAZADA']),
  comentario: z.string().min(5, 'Registre el motivo de su decisión'),
})

export const checklistSchema = z.object({
  propuestaAceptada: z.boolean(),
  contratoFirmado: z.boolean(),
  alcanceConfirmado: z.boolean(),
  cronogramaAcordado: z.boolean(),
  condicionesEconomicas: z.boolean(),
  datosTratamiento: z.boolean(),
  observaciones: z.string().optional().or(z.literal('')),
})

export const actividadSchema = z.object({
  casoId: z.string().min(1),
  titulo: z.string().min(3),
  descripcion: z.string().optional().or(z.literal('')),
  fechaPlan: z.string().optional().or(z.literal('')),
})

export const cierreSchema = z.object({
  actaCierre: z.string().min(20, 'Redacte el acta de cierre'),
  evaluacionFinal: z.coerce.number().int().min(1).max(5),
  valorCerrado: z.coerce.number().min(0).optional(),
})

export const consultorSchema = z.object({
  nombre: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  especialidades: z.array(z.string()).min(1, 'Seleccione al menos una especialidad'),
  nivel: z.enum(['JUNIOR', 'SEMI_SENIOR', 'SENIOR', 'EXPERTO']),
  anosExperiencia: z.coerce.number().int().min(0),
  bio: z.string().optional().or(z.literal('')),
})

export type IntakeInput = z.infer<typeof intakeSchema>
export type PropuestaInput = z.infer<typeof propuestaSchema>
