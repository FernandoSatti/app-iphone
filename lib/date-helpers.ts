// 📌 lib/date-helpers.ts

/**
 * Parsea una fecha string (YYYY-MM-DD o ISO) a objeto Date
 * Manejo correcto del formato del input type="date"
 */
export function parseArgentinaDate(dateString: string): Date | null {
  if (!dateString) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  // Caso: ISO o cualquier otra fecha
  const d = new Date(dateString);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formatea una fecha en formato argentino DD/MM/YYYY
 * Totalmente independiente del locale del entorno
 */
export function formatArgentinaDate(date: Date | string | null | undefined): string {
  if (!date) return "--/--/----";

  const d = typeof date === "string" ? parseArgentinaDate(date) : date;
  if (!d || isNaN(d.getTime())) return "--/--/----";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Devuelve la fecha actual del usuario en formato ISO (yyyy-MM-dd),
 * ideal para guardar en columnas tipo `date` en Supabase.
 */
export const getCurrentISODate = (): string => {
  return toISODate(new Date())
}

/**
 * Convierte un objeto Date en "yyyy-MM-dd" (para guardar en Supabase)
 */
export const toISODate = (d: Date): string => {
  if (isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const parseLocalDate = parseArgentinaDate;
export const formatDisplayDate = formatArgentinaDate;
