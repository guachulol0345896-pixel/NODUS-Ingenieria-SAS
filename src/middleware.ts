/**
 * Middleware de seguridad.
 * ---------------------------------------------------------------------------
 * Protege todas las rutas privadas antes de que se renderice nada:
 * si no hay una cookie de sesión válida, redirige a /login.
 * La autorización fina por rol se resuelve en cada API/página.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NAME, verificarToken } from '@/lib/auth'

const RUTAS_PUBLICAS = ['/', '/login', '/intake', '/api/auth/login', '/api/auth/intake']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const esPublica =
    RUTAS_PUBLICAS.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')

  if (esPublica) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value
  const sesion = token ? await verificarToken(token) : null

  if (!sesion) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
    }
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
