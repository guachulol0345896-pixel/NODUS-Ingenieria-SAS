/**
 * Datos de demostración de NODUS.
 * ---------------------------------------------------------------------------
 * Crea: taxonomías (LOV), reglas de SLA, usuarios de los 4 roles, empresas,
 * consultores y 6 casos distribuidos a lo largo del workflow, con
 * postulaciones, propuestas, actividades, documentos y bitácora.
 *
 *   npm run db:seed
 */

import 'dotenv/config'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import bcrypt from 'bcryptjs'
import * as s from './schema'
import { SLA_POR_DEFECTO } from '../lib/sla'

const sql = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false })
const db = drizzle(sql, { schema: s })

const PASSWORD = 'nodus123'

const norm = (n: string) =>
  n
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(s\.?a\.?s\.?|ltda\.?|sas)\b/g, '')
    .replace(/[^a-z0-9]/g, '')

const horasAtras = (h: number) => new Date(Date.now() - h * 3_600_000)

async function main() {
  console.log('🌱  Sembrando datos de demostración de NODUS...\n')

  // ---------------------------------------------------------------- limpieza
  await db.delete(s.bitacora)
  await db.delete(s.notificaciones)
  await db.delete(s.alertas)
  await db.delete(s.actividades)
  await db.delete(s.checklistContratacion)
  await db.delete(s.documentos)
  await db.delete(s.propuestas)
  await db.delete(s.postulaciones)
  await db.delete(s.transiciones)
  await db.delete(s.casos)
  await db.delete(s.consultorPerfiles)
  await db.delete(s.usuarios)
  await db.delete(s.empresas)
  await db.delete(s.slaReglas)
  await db.delete(s.lov)

  // ------------------------------------------------------- taxonomías (LOV)
  const lovs: (typeof s.lov.$inferInsert)[] = []
  const agregar = (grupo: string, items: [string, string][]) =>
    items.forEach(([codigo, etiqueta], i) =>
      lovs.push({ grupo, codigo, etiqueta, orden: i }),
    )

  agregar('AREA_NEGOCIO', [
    ['ESTRATEGIA', 'Estrategia'],
    ['TECNOLOGIA', 'Tecnología'],
    ['FINANZAS', 'Finanzas'],
    ['OPERACIONES', 'Operaciones'],
    ['LEGAL', 'Legal / Cumplimiento'],
    ['TALENTO', 'Talento humano'],
    ['MERCADEO', 'Mercadeo y ventas'],
    ['OTRO', 'Otro'],
  ])
  agregar('COMPLEJIDAD', [
    ['BAJA', 'Baja'],
    ['MEDIA', 'Media'],
    ['ALTA', 'Alta'],
    ['CRITICA', 'Crítica'],
  ])
  agregar('TIPO_INTERVENCION', [
    ['DIAGNOSTICO', 'Diagnóstico'],
    ['CONSULTORIA', 'Consultoría'],
    ['IMPLEMENTACION', 'Implementación'],
    ['ACOMPANAMIENTO', 'Acompañamiento'],
    ['CAPACITACION', 'Capacitación'],
  ])
  agregar('ESPECIALIDAD', [
    ['ESTRATEGIA', 'Estrategia'],
    ['TECNOLOGIA', 'Tecnología'],
    ['FINANZAS', 'Finanzas'],
    ['OPERACIONES', 'Operaciones'],
    ['LEGAL', 'Legal / Cumplimiento'],
    ['TALENTO', 'Talento humano'],
    ['MERCADEO', 'Mercadeo y ventas'],
  ])
  await db.insert(s.lov).values(lovs)
  console.log(`   ✔ ${lovs.length} valores de taxonomía (LOV)`)

  // ------------------------------------------------------------- SLA reglas
  const reglas = Object.entries(SLA_POR_DEFECTO).map(([estado, v]) => ({
    estado: estado as s.EstadoCaso,
    horas: v!.horas,
    nivelEscalamiento: v!.nivel,
    descripcion: `SLA operativo para el estado ${estado}`,
  }))
  await db.insert(s.slaReglas).values(reglas)
  console.log(`   ✔ ${reglas.length} reglas de SLA`)

  // -------------------------------------------------------------- empresas
  const hash = await bcrypt.hash(PASSWORD, 10)

  const [textilesAndinas, logisticaDelValle, panaderiaLaEspiga] = await db
    .insert(s.empresas)
    .values([
      {
        nombre: 'Textiles Andinas SAS',
        nombreNormalizado: norm('Textiles Andinas SAS'),
        nit: '900123456-1',
        dominioCorreo: 'textilesandinas.com',
        correoContacto: 'gerencia@textilesandinas.com',
        telefono: '+57 310 555 1122',
        pais: 'Colombia',
        ciudad: 'Medellín',
        sector: 'Manufactura',
      },
      {
        nombre: 'Logística del Valle Ltda',
        nombreNormalizado: norm('Logística del Valle Ltda'),
        nit: '901222333-4',
        dominioCorreo: 'logisticadelvalle.co',
        correoContacto: 'operaciones@logisticadelvalle.co',
        telefono: '+57 315 444 9090',
        pais: 'Colombia',
        ciudad: 'Cali',
        sector: 'Transporte',
      },
      {
        nombre: 'Panadería La Espiga',
        nombreNormalizado: norm('Panadería La Espiga'),
        nit: '9013344556',
        dominioCorreo: 'laespiga.com.co',
        correoContacto: 'contacto@laespiga.com.co',
        telefono: '+57 320 777 3311',
        pais: 'Colombia',
        ciudad: 'Bogotá',
        sector: 'Alimentos',
      },
    ])
    .returning()
  console.log('   ✔ 3 empresas')

  // -------------------------------------------------------------- usuarios
  const [admin, advisory, advisory2] = await db
    .insert(s.usuarios)
    .values([
      {
        nombre: 'Sandra Ríos',
        email: 'admin@nodus.co',
        passwordHash: hash,
        rol: 'SUPER_ADMIN',
        cargo: 'Administradora de plataforma',
      },
      {
        nombre: 'Carlos Mejía',
        email: 'advisory@nodus.co',
        passwordHash: hash,
        rol: 'ADVISORY',
        cargo: 'Líder Advisory / PMO',
      },
      {
        nombre: 'Paula Gómez',
        email: 'pmo@nodus.co',
        passwordHash: hash,
        rol: 'ADVISORY',
        cargo: 'Analista PMO',
      },
    ])
    .returning()

  const consultoresData = [
    {
      nombre: 'Andrés Salazar',
      email: 'consultor@nodus.co',
      especialidades: ['OPERACIONES', 'ESTRATEGIA'],
      nivel: 'SENIOR' as const,
      anos: 12,
      bio: 'Especialista en productividad industrial y rediseño de procesos en pymes manufactureras.',
      reputacion: 4.7,
      cerrados: 18,
    },
    {
      nombre: 'María Fernanda Ruiz',
      email: 'consultor2@nodus.co',
      especialidades: ['FINANZAS', 'ESTRATEGIA'],
      nivel: 'EXPERTO' as const,
      anos: 15,
      bio: 'Estructuración financiera, flujo de caja y acceso a crédito para Mipymes.',
      reputacion: 4.9,
      cerrados: 27,
    },
    {
      nombre: 'Julián Ospina',
      email: 'consultor3@nodus.co',
      especialidades: ['TECNOLOGIA', 'OPERACIONES'],
      nivel: 'SEMI_SENIOR' as const,
      anos: 6,
      bio: 'Transformación digital, ERP ligeros y automatización de procesos.',
      reputacion: 4.3,
      cerrados: 9,
    },
    {
      nombre: 'Diana Castro',
      email: 'consultor4@nodus.co',
      especialidades: ['TALENTO', 'LEGAL'],
      nivel: 'SENIOR' as const,
      anos: 10,
      bio: 'Estructura organizacional, cumplimiento laboral y cultura.',
      reputacion: 4.5,
      cerrados: 14,
    },
  ]

  const consultores = await db
    .insert(s.usuarios)
    .values(
      consultoresData.map((c) => ({
        nombre: c.nombre,
        email: c.email,
        passwordHash: hash,
        rol: 'CONSULTOR' as const,
        cargo: 'Consultor asociado',
      })),
    )
    .returning()

  await db.insert(s.consultorPerfiles).values(
    consultores.map((u, i) => ({
      usuarioId: u.id,
      especialidades: consultoresData[i].especialidades,
      nivel: consultoresData[i].nivel,
      disponibilidad: i === 3 ? ('PARCIAL' as const) : ('DISPONIBLE' as const),
      anosExperiencia: consultoresData[i].anos,
      bio: consultoresData[i].bio,
      reputacion: consultoresData[i].reputacion,
      casosCerrados: consultoresData[i].cerrados,
    })),
  )

  const [clienteTextiles, clienteLogistica, clientePanaderia] = await db
    .insert(s.usuarios)
    .values([
      {
        nombre: 'Laura Betancur',
        email: 'cliente@nodus.co',
        passwordHash: hash,
        rol: 'CLIENTE_MIPYME',
        cargo: 'Gerente general',
        telefono: '+57 310 555 1122',
        empresaId: textilesAndinas.id,
      },
      {
        nombre: 'Ricardo Peña',
        email: 'cliente2@nodus.co',
        passwordHash: hash,
        rol: 'CLIENTE_MIPYME',
        cargo: 'Director de operaciones',
        telefono: '+57 315 444 9090',
        empresaId: logisticaDelValle.id,
      },
      {
        nombre: 'Marta Quintero',
        email: 'cliente3@nodus.co',
        passwordHash: hash,
        rol: 'CLIENTE_MIPYME',
        cargo: 'Propietaria',
        telefono: '+57 320 777 3311',
        empresaId: panaderiaLaEspiga.id,
      },
    ])
    .returning()

  console.log(`   ✔ ${3 + consultores.length + 3} usuarios`)

  // ----------------------------------------------------------------- casos
  type DefCaso = {
    codigo: string
    titulo: string
    descripcion: string
    empresaId: string
    creadoPorId: string
    areaNegocio: string
    urgencia: 'ALTA' | 'MEDIA' | 'BAJA'
    impacto: 'ALTO' | 'MEDIO' | 'BAJO'
    estado: s.EstadoCaso
    complejidad?: string
    tipoIntervencion?: string
    consultorAsignadoId?: string
    horasEnEstado: number
  }

  const defs: DefCaso[] = [
    {
      codigo: 'NODUS-2026-0001',
      titulo: 'Reducción de desperdicio en la línea de corte',
      descripcion:
        'La planta presenta un desperdicio de tela del 14% en la línea de corte, muy por encima del 6% objetivo del sector. Necesitamos diagnosticar las causas y definir un plan de mejora medible en 90 días.',
      empresaId: textilesAndinas.id,
      creadoPorId: clienteTextiles.id,
      areaNegocio: 'OPERACIONES',
      urgencia: 'ALTA',
      impacto: 'ALTO',
      estado: 'EN_EJECUCION',
      complejidad: 'ALTA',
      tipoIntervencion: 'CONSULTORIA',
      consultorAsignadoId: consultores[0].id,
      horasEnEstado: 120,
    },
    {
      codigo: 'NODUS-2026-0002',
      titulo: 'Estructuración de flujo de caja y acceso a crédito',
      descripcion:
        'Requerimos ordenar la proyección de flujo de caja a 12 meses y preparar el expediente financiero para solicitar una línea de crédito de capital de trabajo con la banca.',
      empresaId: logisticaDelValle.id,
      creadoPorId: clienteLogistica.id,
      areaNegocio: 'FINANZAS',
      urgencia: 'ALTA',
      impacto: 'ALTO',
      estado: 'EN_DECISION_CLIENTE',
      complejidad: 'MEDIA',
      tipoIntervencion: 'CONSULTORIA',
      consultorAsignadoId: consultores[1].id,
      horasEnEstado: 20,
    },
    {
      codigo: 'NODUS-2026-0003',
      titulo: 'Digitalización del control de inventarios',
      descripcion:
        'Hoy el inventario se lleva en hojas de cálculo y hay diferencias permanentes entre el físico y el registrado. Buscamos implementar una solución digital sencilla y capacitar al equipo.',
      empresaId: panaderiaLaEspiga.id,
      creadoPorId: clientePanaderia.id,
      areaNegocio: 'TECNOLOGIA',
      urgencia: 'MEDIA',
      impacto: 'MEDIO',
      estado: 'PROPUESTA_EN_DISENO',
      complejidad: 'MEDIA',
      tipoIntervencion: 'IMPLEMENTACION',
      consultorAsignadoId: consultores[2].id,
      horasEnEstado: 40,
    },
    {
      codigo: 'NODUS-2026-0004',
      titulo: 'Rediseño de la estructura organizacional',
      descripcion:
        'La empresa creció de 12 a 45 empleados en dos años sin actualizar cargos ni responsabilidades. Necesitamos un organigrama funcional y descripciones de cargo alineadas a la operación real.',
      empresaId: textilesAndinas.id,
      creadoPorId: clienteTextiles.id,
      areaNegocio: 'TALENTO',
      urgencia: 'MEDIA',
      impacto: 'MEDIO',
      estado: 'EN_POSTULACION',
      complejidad: 'MEDIA',
      tipoIntervencion: 'DIAGNOSTICO',
      horasEnEstado: 60, // SLA de 48h -> quedará vencido, ideal para la demo
    },
    {
      codigo: 'NODUS-2026-0005',
      titulo: 'Plan de expansión a dos ciudades',
      descripcion:
        'Queremos evaluar la viabilidad de abrir operación en Barranquilla y Bucaramanga durante el próximo año, con análisis de mercado, costos y riesgos.',
      empresaId: logisticaDelValle.id,
      creadoPorId: clienteLogistica.id,
      areaNegocio: 'ESTRATEGIA',
      urgencia: 'BAJA',
      impacto: 'ALTO',
      estado: 'EN_REVISION',
      horasEnEstado: 6,
    },
    {
      codigo: 'NODUS-2026-0006',
      titulo: 'Cumplimiento de la política de tratamiento de datos',
      descripcion:
        'Necesitamos revisar y actualizar nuestra política de tratamiento de datos personales y los avisos de privacidad para cumplir con la normativa vigente.',
      empresaId: panaderiaLaEspiga.id,
      creadoPorId: clientePanaderia.id,
      areaNegocio: 'LEGAL',
      urgencia: 'MEDIA',
      impacto: 'BAJO',
      estado: 'CREADO',
      horasEnEstado: 2,
    },
  ]

  const casosCreados = []
  for (const d of defs) {
    const regla = SLA_POR_DEFECTO[d.estado]
    const entroAt = horasAtras(d.horasEnEstado)
    const [c] = await db
      .insert(s.casos)
      .values({
        codigo: d.codigo,
        titulo: d.titulo,
        descripcion: d.descripcion,
        estado: d.estado,
        areaNegocio: d.areaNegocio,
        urgencia: d.urgencia,
        impacto: d.impacto,
        complejidad: d.complejidad ?? null,
        tipoIntervencion: d.tipoIntervencion ?? null,
        etiquetas: d.complejidad ? ['prioritario'] : [],
        empresaId: d.empresaId,
        creadoPorId: d.creadoPorId,
        consultorAsignadoId: d.consultorAsignadoId ?? null,
        asignadoAt: d.consultorAsignadoId ? horasAtras(d.horasEnEstado + 24) : null,
        slaHoras: regla?.horas ?? null,
        slaVenceAt: regla ? new Date(entroAt.getTime() + regla.horas * 3_600_000) : null,
        slaIncumplido: regla
          ? entroAt.getTime() + regla.horas * 3_600_000 < Date.now()
          : false,
        createdAt: horasAtras(d.horasEnEstado + 72),
        updatedAt: entroAt,
      })
      .returning()
    casosCreados.push(c)

    // Historial de transiciones coherente con el estado alcanzado.
    const recorrido: s.EstadoCaso[] = [
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
    ]
    const hasta = recorrido.indexOf(d.estado)
    let previo: s.EstadoCaso | null = null
    for (let i = 0; i <= hasta; i++) {
      const est = recorrido[i]
      await db.insert(s.transiciones).values({
        casoId: c.id,
        estadoAnterior: previo,
        estadoNuevo: est,
        actorId: i === 0 ? d.creadoPorId : advisory.id,
        actorNombre: i === 0 ? 'Cliente Mipyme' : advisory.nombre,
        comentario: i === 0 ? 'Caso registrado desde el formulario de intake.' : null,
        createdAt: horasAtras(d.horasEnEstado + (hasta - i) * 8 + 1),
      })
      previo = est
    }
  }
  console.log(`   ✔ ${casosCreados.length} casos con su historial de workflow`)

  // --------------------------------------------------------- postulaciones
  const casoBolsa = casosCreados[3] // EN_POSTULACION
  await db.insert(s.postulaciones).values([
    {
      casoId: casoBolsa.id,
      consultorId: consultores[3].id,
      enfoque:
        'Levantamiento de cargos por entrevistas estructuradas, mapa de procesos y propuesta de organigrama funcional en 3 iteraciones con la gerencia.',
      experiencia:
        'He liderado 14 rediseños organizacionales en empresas de 30 a 120 empleados en el sector manufactura y servicios.',
      tiempoEstimado: 25,
    },
    {
      casoId: casoBolsa.id,
      consultorId: consultores[0].id,
      enfoque:
        'Diagnóstico de carga operativa por área y ajuste de estructura a partir de la capacidad real de la planta.',
      experiencia: 'Doce años en productividad industrial con foco en estructura y turnos.',
      tiempoEstimado: 30,
    },
  ])

  // Caso 1 y 2 ya tienen postulación aceptada
  await db.insert(s.postulaciones).values([
    {
      casoId: casosCreados[0].id,
      consultorId: consultores[0].id,
      enfoque: 'Mapeo de flujo de valor en la línea de corte y plan de mejora en 90 días.',
      experiencia: 'Proyectos de reducción de desperdicio en el sector textil.',
      tiempoEstimado: 45,
      estado: 'ACEPTADA',
    },
    {
      casoId: casosCreados[1].id,
      consultorId: consultores[1].id,
      enfoque: 'Modelo de flujo de caja a 12 meses y expediente para banca.',
      experiencia: 'Estructuración financiera para más de 25 Mipymes.',
      tiempoEstimado: 20,
      estado: 'ACEPTADA',
    },
  ])
  console.log('   ✔ 4 postulaciones (2 aceptadas)')

  // ------------------------------------------------------------- propuestas
  const qaOk = {
    alcanceClaro: true,
    metodologiaConsistente: true,
    entregablesMedibles: true,
    cronogramaViable: true,
    riesgosIdentificados: true,
    valorJustificado: true,
  }

  await db.insert(s.propuestas).values([
    {
      casoId: casosCreados[0].id,
      version: 1,
      titulo: 'Programa de reducción de desperdicio — Fase diagnóstico',
      resumen:
        'Diagnóstico de causas raíz del desperdicio en corte y hoja de ruta priorizada de mejoras.',
      alcance:
        'Cubre la línea de corte (3 mesas, 2 turnos). Excluye confección y acabados. Incluye toma de datos en planta durante 3 semanas.',
      metodologia:
        'Value Stream Mapping, análisis de Pareto de causas, estudio de tiempos y taller de causa raíz con el equipo de planta.',
      entregables:
        '1. Informe de diagnóstico. 2. Árbol de causas. 3. Hoja de ruta de 90 días. 4. Tablero de indicadores.',
      cronograma: 'Semana 1-3 toma de datos · Semana 4 análisis · Semana 5 taller · Semana 6 entrega.',
      supuestos: 'Acceso a la planta en ambos turnos y disponibilidad del jefe de producción.',
      valorEstimado: 18500000,
      duracionDias: 45,
      estado: 'ACEPTADA',
      qaChecklist: qaOk,
      qaAprobadaPor: advisory.nombre,
      enviadaAt: horasAtras(200),
      decisionAt: horasAtras(170),
      decisionComentario: 'Aprobada por la gerencia. Iniciamos el 2 de septiembre.',
      creadaPorId: consultores[0].id,
    },
    {
      casoId: casosCreados[1].id,
      version: 1,
      titulo: 'Estructuración financiera y expediente de crédito',
      resumen: 'Modelo de flujo de caja a 12 meses y preparación del expediente bancario.',
      alcance:
        'Construcción del modelo financiero, análisis de capital de trabajo y acompañamiento a dos entidades bancarias.',
      metodologia:
        'Levantamiento de información contable, modelado en hoja de cálculo parametrizada, sesiones de validación quincenales.',
      entregables:
        '1. Modelo de flujo de caja. 2. Análisis de capital de trabajo. 3. Expediente bancario. 4. Sesión de sustentación.',
      cronograma: 'Semana 1 levantamiento · Semana 2-3 modelado · Semana 4 expediente.',
      valorEstimado: 9800000,
      duracionDias: 20,
      estado: 'ENVIADA',
      qaChecklist: qaOk,
      qaAprobadaPor: advisory.nombre,
      enviadaAt: horasAtras(20),
      creadaPorId: consultores[1].id,
    },
    {
      casoId: casosCreados[2].id,
      version: 1,
      titulo: 'Implementación de control digital de inventarios',
      resumen: 'Selección e implementación de una solución ligera de inventarios con capacitación.',
      alcance: 'Un punto de venta y la bodega principal. No incluye integración contable.',
      metodologia: 'Levantamiento de requisitos, selección de herramienta, parametrización y capacitación.',
      entregables: '1. Matriz de selección. 2. Sistema parametrizado. 3. Manual. 4. Capacitación.',
      cronograma: 'Semana 1 requisitos · Semana 2 selección · Semana 3-4 implementación.',
      valorEstimado: 7200000,
      duracionDias: 30,
      estado: 'BORRADOR',
      creadaPorId: consultores[2].id,
    },
  ])
  console.log('   ✔ 3 propuestas (1 aceptada, 1 enviada, 1 en borrador)')

  // ------------------------------------------------- checklist contratación
  await db.insert(s.checklistContratacion).values({
    casoId: casosCreados[0].id,
    propuestaAceptada: true,
    contratoFirmado: true,
    alcanceConfirmado: true,
    cronogramaAcordado: true,
    condicionesEconomicas: true,
    datosTratamiento: true,
    observaciones: 'Contrato firmado directamente entre la Mipyme y el consultor.',
  })

  // ---------------------------------------------------------- actividades
  await db.insert(s.actividades).values([
    {
      casoId: casosCreados[0].id,
      titulo: 'Toma de datos en planta — turno 1',
      descripcion: 'Registro de merma por mesa durante 10 días hábiles.',
      estado: 'COMPLETADA',
      fechaPlan: horasAtras(96),
      fechaReal: horasAtras(90),
      responsableId: consultores[0].id,
    },
    {
      casoId: casosCreados[0].id,
      titulo: 'Taller de causa raíz con el equipo de corte',
      descripcion: 'Sesión de 4 horas con operarios y jefe de producción.',
      estado: 'EN_CURSO',
      fechaPlan: horasAtras(-48),
      responsableId: consultores[0].id,
    },
    {
      casoId: casosCreados[0].id,
      titulo: 'Entrega del informe de diagnóstico',
      estado: 'PLANIFICADA',
      fechaPlan: horasAtras(-240),
      responsableId: consultores[0].id,
    },
  ])
  console.log('   ✔ 3 actividades de seguimiento')

  // ---------------------------------------------------------- documentos
  const contenidoDemo = Buffer.from(
    'Documento de demostración generado por el seed de NODUS.\n' +
      'En un entorno real aquí estaría el archivo cargado por el usuario.\n',
    'utf8',
  )
  await db.insert(s.documentos).values([
    {
      nombre: 'Intake-inicial.txt',
      tipo: 'INTAKE',
      mimeType: 'text/plain',
      tamano: contenidoDemo.length,
      contenido: contenidoDemo,
      descripcion: 'Adjunto entregado por el cliente en el registro del caso.',
      casoId: casosCreados[0].id,
      subidoPorId: clienteTextiles.id,
    },
    {
      nombre: 'Acta-inicio.txt',
      tipo: 'CONTRACTUAL',
      mimeType: 'text/plain',
      tamano: contenidoDemo.length,
      contenido: contenidoDemo,
      descripcion: 'Acta de inicio firmada por las partes.',
      casoId: casosCreados[0].id,
      subidoPorId: advisory.id,
    },
  ])
  console.log('   ✔ 2 documentos')

  // ------------------------------------------------------------- alertas
  await db.insert(s.alertas).values({
    casoId: casoBolsa.id,
    tipo: 'SLA_VENCIDO',
    mensaje: 'SLA vencido en estado "En postulación" (48 h).',
    nivel: 2,
  })

  await db.insert(s.notificaciones).values([
    {
      usuarioId: advisory.id,
      titulo: 'NODUS-2026-0004 — SLA vencido',
      mensaje: 'El caso lleva más de 48 h en postulación sin asignación.',
      url: `/casos/${casoBolsa.id}`,
    },
    {
      usuarioId: clienteLogistica.id,
      titulo: 'NODUS-2026-0002 — Propuesta recibida',
      mensaje: 'Tiene una propuesta pendiente de decisión.',
      url: `/casos/${casosCreados[1].id}`,
    },
  ])

  // ------------------------------------------------------------- bitácora
  await db.insert(s.bitacora).values([
    {
      actorId: advisory.id,
      actorNombre: advisory.nombre,
      actorRol: 'ADVISORY',
      accion: 'SEED_INICIAL',
      entidad: 'sistema',
      detalle: { nota: 'Carga de datos de demostración' },
    },
    {
      actorId: clienteTextiles.id,
      actorNombre: clienteTextiles.nombre,
      actorRol: 'CLIENTE_MIPYME',
      accion: 'CASO_CREADO',
      entidad: 'caso',
      entidadId: casosCreados[0].id,
      estadoNuevo: 'CREADO',
      detalle: { codigo: casosCreados[0].codigo },
    },
  ])

  console.log('\n✅  Seed completado.\n')
  console.log('   Usuarios de prueba (contraseña: %s)', PASSWORD)
  console.log('   ─────────────────────────────────────────────')
  console.log('   admin@nodus.co       Super administrador')
  console.log('   advisory@nodus.co    Advisory / PMO')
  console.log('   consultor@nodus.co   Consultor (Andrés Salazar)')
  console.log('   cliente@nodus.co     Cliente Mipyme (Textiles Andinas)')
  console.log('')

  void admin
  void advisory2
  await sql.end()
}

main().catch(async (e) => {
  console.error('\n❌ Error en el seed:', e)
  await sql.end()
  process.exit(1)
})
