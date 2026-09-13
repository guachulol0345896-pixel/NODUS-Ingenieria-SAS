/**
 * Autenticación y sesión.
 * ---------------------------------------------------------------------------
 * Estrategia: JWT firmado (HS256) guardado en una cookie httpOnly.
 *  - httpOnly  -> el token no es accesible desde JavaScript (mitiga XSS).
 *  - sameSite  -> mitiga CSRF.
 *  - secure    -> sólo HTTPS en producción.
 * Se usa `jose` porque funciona tanto en Node como en el runtime Edge
 * (necesario para validar la sesión dentro de `middleware.ts`).
 */

import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { Rol } from '@/db/schema'

export const COOKIE_NAME = 'nodus_session'
const DURACION_SESION = '8h'

export type Sesion = {
  sub: string
  email: string
  nombre: string
  rol: Rol
  empresaId: string | null
}

function secret(): Uint8Array {
  const s = process.env.JWT_SECRET
  if (!s || s.length < 16) {
    throw new Error('JWT_SECRET no está configurado (mínimo 16 caracteres).')
  }
  return new TextEncoder().encode(s)
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function firmarToken(payload: Sesion): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer('nodus')
    .setExpirationTime(DURACION_SESION)
    .sign(secret())
}

export async function verificarToken(token: string): Promise<Sesion | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { issuer: 'nodus' })
    return {
      sub: String(payload.sub),
      email: String(payload.email),
      nombre: String(payload.nombre),
      rol: payload.rol as Rol,
      empresaId: (payload.empresaId as string | null) ?? null,
    }
  } catch {
    return null
  }
}

/** Crea la cookie de sesión (se llama desde un Route Handler). */
export async function crearSesion(sesion: Sesion) {
  const token = await firmarToken(sesion)
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
}

export async function cerrarSesion() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** Devuelve la sesión actual o null. Úsalo en Server Components y API routes. */
export async function getSesion(): Promise<Sesion | null> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null
  return verificarToken(token)
}

/** Igual que getSesion pero lanza si no hay sesión. */
export async function requireSesion(): Promise<Sesion> {
  const s = await getSesion()
  if (!s) throw new ErrorAutorizacion('No autenticado', 401)
  return s
}

/** Exige que la sesión tenga alguno de los roles indicados. */
export async function requireRol(...roles: Rol[]): Promise<Sesion> {
  const s = await requireSesion()
  if (!roles.includes(s.rol)) {
    throw new ErrorAutorizacion(`Se requiere rol: ${roles.join(' o ')}`, 403)
  }
  return s
}

export class ErrorAutorizacion extends Error {
  status: number
  constructor(mensaje: string, status = 403) {
    super(mensaje)
    this.status = status
  }
}

/** Autentica credenciales contra la base de datos. */
export async function autenticar(email: string, password: string) {
  const [u] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, email.toLowerCase().trim()))
    .limit(1)

  if (!u || !u.activo) return null
  const ok = await verifyPassword(password, u.passwordHash)
  if (!ok) return null
  return u
}
