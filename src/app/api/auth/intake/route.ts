/**
 * Onboarding público — Punto 1 del modelo operativo (REQ-001, REQ-002, REQ-003).
 * ---------------------------------------------------------------------------
 * Un único envío crea (si hace falta) la empresa, el usuario de contacto y el
 * caso, en una sola transacción. Implementa el principio
 * "Empresa Única – Casos Múltiples": si la empresa ya existe, el caso se
 * asocia al registro existente en vez de duplicarlo.
 */

import { db } from '@/db'
import { casos, empresas, transiciones, usuarios } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { intakeSchema } from '@/lib/validations'
import { fail, handler, ok } from '@/lib/api'
import { crearSesion, hashPassword } from '@/lib/auth'
import { buscarEmpresaExistente, dominioDe, normalizarNombre, siguienteCodigo } from '@/lib/casos'
import { calcularVencimiento } from '@/lib/sla'
import { ipDeRequest, registrar } from '@/lib/audit'

export const POST = handler(async (req) => {
  const d = intakeSchema.parse(await req.json())
  const email = d.email.toLowerCase().trim()

  // 1. ¿El correo ya tiene usuario?
  const [usuarioExistente] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1)

  if (usuarioExistente) {
    return fail(
      'Ya existe un usuario con este correo. Inicie sesión para registrar un nuevo caso.',
      409,
    )
  }

  // 2. Verificación de identidad empresarial (deduplicación).
  const existente = await buscarEmpresaExistente({
    nombre: d.empresaNombre,
    correo: email,
    nit: d.nit || null,
  })

  const resultado = await db.transaction(async (tx) => {
    let empresaId: string
    let empresaReutilizada = false

    if (existente) {
      empresaId = existente.id
      empresaReutilizada = true
    } else {
      const [nueva] = await tx
        .insert(empresas)
        .values({
          nombre: d.empresaNombre.trim(),
          nombreNormalizado: normalizarNombre(d.empresaNombre),
          nit: d.nit || null,
          dominioCorreo: dominioDe(email),
          correoContacto: email,
          telefono: d.telefono,
          pais: d.pais,
          ciudad: d.ciudad,
        })
        .returning()
      empresaId = nueva.id
    }

    const [usuario] = await tx
      .insert(usuarios)
      .values({
        nombre: d.contactoNombre.trim(),
        email,
        passwordHash: await hashPassword(d.password),
        rol: 'CLIENTE_MIPYME',
        cargo: d.cargo,
        telefono: d.telefono,
        empresaId,
      })
      .returning()

    const codigo = await siguienteCodigo()
    const { slaVenceAt, slaHoras } = await calcularVencimiento('CREADO')

    const [caso] = await tx
      .insert(casos)
      .values({
        codigo,
        titulo: d.titulo.trim(),
        descripcion: d.descripcion.trim(),
        areaNegocio: d.areaNegocio,
        urgencia: d.urgencia,
        impacto: d.impacto,
        empresaId,
        creadoPorId: usuario.id,
        slaVenceAt,
        slaHoras,
      })
      .returning()

    await tx.insert(transiciones).values({
      casoId: caso.id,
      estadoAnterior: null,
      estadoNuevo: 'CREADO',
      actorId: usuario.id,
      actorNombre: usuario.nombre,
      comentario: 'Caso registrado desde el formulario público de intake.',
    })

    return { empresaId, empresaReutilizada, usuario, caso }
  })

  const sesion = {
    sub: resultado.usuario.id,
    email: resultado.usuario.email,
    nombre: resultado.usuario.nombre,
    rol: resultado.usuario.rol,
    empresaId: resultado.empresaId,
  }
  await crearSesion(sesion)

  await registrar({
    actor: sesion,
    accion: 'CASO_CREADO_INTAKE',
    entidad: 'caso',
    entidadId: resultado.caso.id,
    estadoNuevo: 'CREADO',
    detalle: {
      codigo: resultado.caso.codigo,
      empresaReutilizada: resultado.empresaReutilizada,
    },
    ip: ipDeRequest(req),
  })

  return ok(
    {
      casoId: resultado.caso.id,
      codigo: resultado.caso.codigo,
      empresaReutilizada: resultado.empresaReutilizada,
    },
    201,
  )
})
