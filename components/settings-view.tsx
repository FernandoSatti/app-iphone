"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { createBrowserClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/auth-context"
import { Download, Upload, Trash2 } from "lucide-react"
import { exportBackup, importBackup } from "@/lib/backup-restore"

export default function SettingsView() {
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isConfirmingPassword, setIsConfirmingPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [backupMessage, setBackupMessage] = useState("")
  const { user } = useAuth()
  const supabase = createBrowserClient()

  const validUsers: { [key: string]: { password: string; name: string } } = {
    vale: { password: "ipro1234", name: "Vale" },
    riki: { password: "ipro1234", name: "Riki" },
  }

  const handleResetClick = () => {
    setIsResetDialogOpen(true)
    setIsConfirmingPassword(false)
    setUsername("")
    setPassword("")
    setError("")
  }

  const handleVerifyCredentials = () => {
    if (!username || !password) {
      setError("Ingresa usuario y contraseña")
      return
    }

    const userData = validUsers[username.toLowerCase()]
    if (!userData || userData.password !== password) {
      setError("Usuario o contraseña incorrectos")
      return
    }

    setIsConfirmingPassword(true)
    setError("")
  }

  const handleConfirmReset = async () => {
    setIsResetting(true)
    try {
      const tables = [
        "sales",
        "inventory",
        "clients",
        "providers",
        "account_transactions",
        "cash_transactions",
        "pending_orders",
      ]

      for (const table of tables) {
        const { error } = await supabase.from(table).delete().neq("id", "")

        if (error) {
          console.error(`[v0] Error deleting from ${table}:`, error)
          throw error
        }
      }

      setIsResetDialogOpen(false)
      setUsername("")
      setPassword("")
      setError("")

      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (err) {
      console.error("[v0] Error resetting system:", err)
      setError("Error al restablecer el sistema. Intenta de nuevo.")
      setIsResetting(false)
    }
  }

  const handleExportBackup = async () => {
    setIsExporting(true)
    setBackupMessage("")
    try {
      await exportBackup()
      setBackupMessage("✅ Backup exportado correctamente")
      setTimeout(() => setBackupMessage(""), 3000)
    } catch (error) {
      console.error("[v0] Export error:", error)
      setBackupMessage("⚠️ Error al exportar backup")
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setBackupMessage("")
    try {
      await importBackup(file)
      setBackupMessage("✅ Backup restaurado correctamente")
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (error) {
      console.error("[v0] Import error:", error)
      setBackupMessage("⚠️ Error al importar backup")
    } finally {
      setIsImporting(false)
    }
  }

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="grid gap-6">
      {/* Backup/restore section */}
      <Card>
        <CardHeader>
          <CardTitle>Respaldar y Restaurar</CardTitle>
          <CardDescription>Exporta e importa backups completos de la base de datos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-b pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium">Exportar Backup</h3>
                <p className="text-sm text-gray-500">Descarga todas las tablas en formato Excel (.xlsx)</p>
              </div>
              <Button onClick={handleExportBackup} disabled={isExporting} className="bg-blue-600 hover:bg-blue-700">
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? "Exportando..." : "Exportar"}
              </Button>
            </div>
          </div>

          <div className="border-b pb-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium">Importar Backup</h3>
                <p className="text-sm text-gray-500">Restaura la base de datos desde un archivo Excel</p>
              </div>
              <div className="relative">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleImportBackup}
                  disabled={isImporting}
                  className="hidden"
                />
                <Button
                  onClick={handleImportClick}
                  disabled={isImporting}
                  className="bg-green-600 hover:bg-green-700 cursor-pointer"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? "Importando..." : "Importar"}
                </Button>
              </div>
            </div>
          </div>

          {backupMessage && (
            <div
              className={`p-3 rounded text-sm ${backupMessage.includes("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
            >
              {backupMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System settings section */}
      <Card>
        <CardHeader>
          <CardTitle>Ajustes del Sistema</CardTitle>
          <CardDescription>Opciones de configuración y mantenimiento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-red-600">Restablecer datos</h3>
                <p className="text-sm text-gray-500">
                  Elimina todos los registros del sistema y lo reinicia a su estado inicial
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={handleResetClick}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Restablecer datos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset confirmation dialog */}
      <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <AlertDialogContent>
          {!isConfirmingPassword ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Verificar identidad</AlertDialogTitle>
                <AlertDialogDescription>
                  Ingresa tu usuario y contraseña para confirmar que deseas restablecer el sistema.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="username-reset">Usuario</Label>
                  <Input
                    id="username-reset"
                    type="text"
                    placeholder="Ej: vale"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value)
                      setError("")
                    }}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="password-reset">Contraseña</Label>
                  <Input
                    id="password-reset"
                    type="password"
                    placeholder="Ingresa tu contraseña"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError("")
                    }}
                    className="mt-1"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <Button onClick={handleVerifyCredentials} className="bg-blue-600 hover:bg-blue-700">
                  Verificar
                </Button>
              </div>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-red-600">⚠️ ¿Seguro que querés restablecer todo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará definitivamente los datos del sistema y no se puede deshacer. Se borrarán todas
                  las ventas, clientes, proveedores, stock, movimientos de caja y gastos.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                <strong>Aviso:</strong> Esta es una acción irreversible. Asegúrate de tener un respaldo de tus datos
                antes de continuar.
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <AlertDialogCancel disabled={isResetting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirmReset}
                  disabled={isResetting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isResetting ? "Restableciendo..." : "Restablecer definitivamente"}
                </AlertDialogAction>
              </div>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
