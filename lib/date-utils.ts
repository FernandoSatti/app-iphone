/**
 * Utilidades para manejar fechas en la zona horaria de Argentina (Buenos Aires)
 * Formato: DD/MM/YYYY
 */

const ARGENTINA_TIMEZONE = "America/Argentina/Buenos_Aires"

/**
 * Obtiene la fecha actual en la zona horaria de Argentina
 */
export function getArgentinaDate(): Date {
  const now = new Date()
  // Convertir a zona horaria de Argentina
  const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: ARGENTINA_TIMEZONE }))
  return argentinaTime
}

/**
 * Formatea una fecha en formato DD/MM/YYYY
 */
export function formatArgentinaDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return dateObj.toLocaleDateString("es-AR", {
    timeZone: ARGENTINA_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Obtiene la fecha actual como string en formato YYYY-MM-DD para la base de datos
 * Usa la zona horaria de Argentina para evitar desfases de días
 */
export function getArgentinaDateString(): string {
  const argDate = getArgentinaDate()
  const year = argDate.getFullYear()
  const month = String(argDate.getMonth() + 1).padStart(2, "0")
  const day = String(argDate.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Obtiene la fecha y hora actual como ISO string en zona horaria de Argentina
 */
export function getArgentinaISOString(): string {
  const argDate = getArgentinaDate()
  return argDate.toISOString()
}

/**
 * Parsea una fecha string (YYYY-MM-DD o ISO) a objeto Date
 */
export function parseArgentinaDate(dateString: string): Date {
  return new Date(dateString)
}

/**
 * Obtiene el año actual en Argentina
 */
export function getArgentinaYear(): number {
  return getArgentinaDate().getFullYear()
}

/**
 * Obtiene el mes actual en Argentina (0-11)
 */
export function getArgentinaMonth(): number {
  return getArgentinaDate().getMonth()
}

/**
 * Formatea una fecha para mostrar mes y año
 */
export function formatArgentinaMonthYear(date?: Date): string {
  const dateObj = date || getArgentinaDate()
  return dateObj.toLocaleDateString("es-AR", {
    timeZone: ARGENTINA_TIMEZONE,
    month: "long",
    year: "numeric",
  })
}
