import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'Falta la variable de entorno DATABASE_URL. Copia .env.example a .env y configúrala.',
  )
}

/**
 * En desarrollo Next.js recarga los módulos en caliente; guardamos el cliente
 * en globalThis para no abrir una conexión nueva en cada recarga.
 */
const globalForDb = globalThis as unknown as { __nodusSql?: ReturnType<typeof postgres> }

const client =
  globalForDb.__nodusSql ??
  postgres(connectionString, {
    max: 5,
    // `prepare: false` es necesario para poolers tipo PgBouncer/Neon/Supabase.
    prepare: false,
  })

if (process.env.NODE_ENV !== 'production') globalForDb.__nodusSql = client

export const db = drizzle(client, { schema })
export { schema }
