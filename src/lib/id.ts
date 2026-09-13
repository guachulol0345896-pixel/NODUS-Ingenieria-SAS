import { randomBytes } from 'crypto'

/** Identificador corto, ordenable por tiempo y sin dependencias externas. */
export function createId(): string {
  return Date.now().toString(36) + randomBytes(8).toString('hex')
}
