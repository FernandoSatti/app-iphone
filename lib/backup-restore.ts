import * as XLSX from "xlsx"
import { createBrowserClient } from "@/lib/supabase/client"

export interface BackupData {
  [tableName: string]: any[]
}

const TABLES = [
  "sales",
  "inventory",
  "clients",
  "providers",
  "account_transactions",
  "cash_transactions",
  "pending_orders",
]

export async function exportBackup(): Promise<void> {
  try {
    console.log("[v0] Starting backup export...")
    const supabase = createBrowserClient()
    const workbook = XLSX.utils.book_new()

    for (const table of TABLES) {
      try {
        const { data, error } = await supabase.from(table).select("*")

        if (error) {
          console.error(`[v0] Error reading ${table}:`, error)
          continue // Skip this table but continue with others
        }

        if (data && data.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(data)
          XLSX.utils.book_append_sheet(workbook, worksheet, table)
          console.log(`[v0] Exported ${data.length} records from ${table}`)
        } else {
          // Create empty sheet with table structure if no data
          const worksheet = XLSX.utils.aoa_to_sheet([[]])
          XLSX.utils.book_append_sheet(workbook, worksheet, table)
          console.log(`[v0] Exported empty table: ${table}`)
        }
      } catch (tableError) {
        console.error(`[v0] Error processing table ${table}:`, tableError)
        continue // Skip this table but continue with others
      }
    }

    const now = new Date()
    const dateStr = now.toISOString().split("T")[0]
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-")
    const filename = `backup-${dateStr}-${timeStr}.xlsx`

    const wbout = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
      sheet: TABLES[0], // Set first sheet as default
    })
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    })

    // Create download link and trigger download
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    console.log("[v0] Backup exported and downloaded successfully:", filename)

    // Optionally save to Supabase Storage (non-blocking)
    saveBackupToStorage(blob, filename).catch((err) => console.warn("[v0] Could not save backup to storage:", err))
  } catch (error) {
    console.error("[v0] Error exporting backup:", error)
    throw error
  }
}

export async function importBackup(file: File): Promise<void> {
  try {
    console.log("[v0] Starting backup import...")
    const supabase = createBrowserClient()
    const arrayBuffer = await file.arrayBuffer()

    const workbook = XLSX.read(arrayBuffer, {
      type: "array",
      codepage: 65001, // UTF-8
    })

    for (const sheetName of workbook.SheetNames) {
      if (!TABLES.includes(sheetName)) {
        console.warn(`[v0] Skipping unknown table: ${sheetName}`)
        continue
      }

      try {
        const worksheet = workbook.Sheets[sheetName]
        let data = XLSX.utils.sheet_to_json(worksheet)

        if (data.length === 0) {
          console.log(`[v0] Skipping empty table: ${sheetName}`)
          continue
        }

        if (sheetName === "pending_orders") {
          data = data.map((row: any) => ({
            ...row,
            // Ensure products is a valid JSON array, not null or empty string
            products:
              row.products && typeof row.products === "string"
                ? row.products.startsWith("[")
                  ? JSON.parse(row.products)
                  : []
                : row.products || [],
          }))
        }

        // Delete existing records
        const { error: deleteError } = await supabase.from(sheetName).delete().neq("id", "")

        if (deleteError) {
          console.error(`[v0] Error deleting from ${sheetName}:`, deleteError)
          throw deleteError
        }

        const { error: insertError } = await supabase.from(sheetName).insert(data as any[])

        if (insertError) {
          console.error(`[v0] Error inserting into ${sheetName}:`, insertError)
          throw insertError
        }

        console.log(`[v0] Imported ${data.length} records into ${sheetName}`)
      } catch (tableError) {
        console.error(`[v0] Error processing import for ${sheetName}:`, tableError)
        throw tableError
      }
    }

    console.log("[v0] Backup imported successfully")
  } catch (error) {
    console.error("[v0] Error importing backup:", error)
    throw error
  }
}

async function saveBackupToStorage(blob: Blob, filename: string): Promise<void> {
  try {
    const supabase = createBrowserClient()

    const { error } = await supabase.storage.from("backups").upload(`backups/${filename}`, blob, { upsert: true })

    if (error) {
      console.warn("[v0] Could not save backup to storage:", error)
    } else {
      console.log("[v0] Backup saved to Supabase Storage:", filename)
    }
  } catch (error) {
    console.warn("[v0] Error saving backup to storage:", error)
  }
}
