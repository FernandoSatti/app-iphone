"use client"

import React from "react"
import { GripVertical } from "lucide-react"

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
import { Download, Upload, Trash2, Plus, Edit, ChevronRight } from "lucide-react"
import { exportBackup, importBackup } from "@/lib/backup-restore"
import { useProductCategories, type ProductCategoryFields } from "@/components/product-categories-context"
import { useProductAttributes, type AttributeType } from "@/components/product-attributes-context"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

const validUsers: { [key: string]: { password: string; name: string } } = {
  vale: { password: "ipro1234", name: "Vale" },
  riki: { password: "ipro1234", name: "Riki" },
}

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

  const { categories, addCategory, updateCategory, deleteCategory } = useProductCategories()
  const { attributes, getAttributesByType, addAttribute, deleteAttribute, reorderAttributes } = useProductAttributes()

  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false)
  const [isSubcategoriesExpanded, setIsSubcategoriesExpanded] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<{
    id: string
    name: string
    fields: ProductCategoryFields
  } | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [categoryFields, setCategoryFields] = useState<ProductCategoryFields>({
    model: true,
    storage: true,
    color: true,
    condition: true,
    battery: true,
    imei: true,
  })
  const [selectedAttributeType, setSelectedAttributeType] = useState<AttributeType>("color")
  const [newAttributeValue, setNewAttributeValue] = useState("")
  const [draggedItem, setDraggedItem] = useState<{ type: AttributeType; index: number } | null>(null)

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

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setCategoryName("")
    setCategoryFields({
      model: true,
      storage: false,
      color: true,
      condition: true,
      battery: false,
      imei: false,
    })
    setIsCategoryModalOpen(true)
  }

  const handleEditCategory = (category: (typeof categories)[0]) => {
    setEditingCategory(category)
    setCategoryName(category.name)
    setCategoryFields(category.fields)
    setIsCategoryModalOpen(true)
  }

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryName, categoryFields)
      } else {
        await addCategory(categoryName, categoryFields)
      }
      setIsCategoryModalOpen(false)
    } catch (error) {
      alert("Error al guardar categoría")
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta categoría?")) {
      try {
        await deleteCategory(id)
      } catch (error) {
        alert("Error al eliminar categoría")
      }
    }
  }

  const handleAddAttribute = (type: AttributeType) => {
    setSelectedAttributeType(type)
    setNewAttributeValue("")
    setIsAttributeModalOpen(true)
  }

  const handleSaveAttribute = async () => {
    if (!newAttributeValue.trim()) {
      alert("Por favor ingresa un valor")
      return
    }
    try {
      await addAttribute(selectedAttributeType, newAttributeValue.trim())
      setIsAttributeModalOpen(false)
    } catch (error) {
      alert("Error al agregar atributo. Puede que ya exista.")
    }
  }

  const handleDeleteAttribute = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este atributo?")) {
      try {
        await deleteAttribute(id)
      } catch (error) {
        alert("Error al eliminar atributo")
      }
    }
  }

  const handleDragStart = (type: AttributeType, index: number) => {
    setDraggedItem({ type, index })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (type: AttributeType, dropIndex: number) => {
    if (!draggedItem || draggedItem.type !== type) return

    const items = getAttributesByType(type)
    const dragIndex = draggedItem.index

    if (dragIndex === dropIndex) {
      setDraggedItem(null)
      return
    }

    // Reorder the items
    const reorderedItems = [...items]
    const [removed] = reorderedItems.splice(dragIndex, 1)
    reorderedItems.splice(dropIndex, 0, removed)

    // Update the order in the database
    const reorderedIds = reorderedItems.map((item) => item.id)
    await reorderAttributes(type, reorderedIds)

    setDraggedItem(null)
  }

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6">
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
              <Button
                onClick={handleExportBackup}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
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
                  className="bg-green-600 hover:bg-green-700 cursor-pointer text-white"
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
          {/* Categories section */}
          <div className="border-b pb-4">
            <button
              onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChevronRight className={`h-5 w-5 transition-transform ${isCategoriesExpanded ? "rotate-90" : ""}`} />
                <div className="text-left">
                  <h3 className="font-medium">Categorías de Productos</h3>
                  <p className="text-sm text-gray-500">Gestiona los tipos de productos y sus campos configurables</p>
                </div>
              </div>
            </button>

            {isCategoriesExpanded && (
              <div className="mt-4 space-y-3 pl-8">
                <Button
                  onClick={handleAddCategory}
                  className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Categoría
                </Button>
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                      <div className="flex-1">
                        <h4 className="font-medium">{category.name}</h4>
                        <p className="text-sm text-gray-500">
                          Campos activos:{" "}
                          {Object.entries(category.fields)
                            .filter(([_, active]) => active)
                            .map(([field]) => field)
                            .join(", ")}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subcategories section */}
          <div className="border-b pb-4">
            <button
              onClick={() => setIsSubcategoriesExpanded(!isSubcategoriesExpanded)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChevronRight
                  className={`h-5 w-5 transition-transform ${isSubcategoriesExpanded ? "rotate-90" : ""}`}
                />
                <div className="text-left">
                  <h3 className="font-medium">Subcategorías de Productos</h3>
                  <p className="text-sm text-gray-500">Gestiona colores, almacenamientos y estados disponibles</p>
                </div>
              </div>
            </button>

            {isSubcategoriesExpanded && (
              <div className="mt-4 space-y-4 pl-8">
                {/* Colors */}
                <div className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Colores</h4>
                    <Button
                      size="sm"
                      onClick={() => handleAddAttribute("color")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getAttributesByType("color").map((attr, index) => (
                      <div
                        key={attr.id}
                        draggable
                        onDragStart={() => handleDragStart("color", index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop("color", index)}
                        className="flex items-center gap-1 bg-blue-50 border border-blue-200 rounded px-3 py-1 text-sm cursor-move hover:bg-blue-100 transition-colors"
                      >
                        <GripVertical className="h-3 w-3 text-gray-400" />
                        <span>{attr.value}</span>
                        <button
                          onClick={() => handleDeleteAttribute(attr.id)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Storage */}
                <div className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Almacenamientos</h4>
                    <Button
                      size="sm"
                      onClick={() => handleAddAttribute("storage")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getAttributesByType("storage").map((attr, index) => (
                      <div
                        key={attr.id}
                        draggable
                        onDragStart={() => handleDragStart("storage", index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop("storage", index)}
                        className="flex items-center gap-1 bg-purple-50 border border-purple-200 rounded px-3 py-1 text-sm cursor-move hover:bg-purple-100 transition-colors"
                      >
                        <GripVertical className="h-3 w-3 text-gray-400" />
                        <span>{attr.value}</span>
                        <button
                          onClick={() => handleDeleteAttribute(attr.id)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div className="border rounded-lg p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Estados</h4>
                    <Button
                      size="sm"
                      onClick={() => handleAddAttribute("condition")}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getAttributesByType("condition").map((attr, index) => (
                      <div
                        key={attr.id}
                        draggable
                        onDragStart={() => handleDragStart("condition", index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop("condition", index)}
                        className="flex items-center gap-1 bg-green-50 border border-green-200 rounded px-3 py-1 text-sm cursor-move hover:bg-green-100 transition-colors"
                      >
                        <GripVertical className="h-3 w-3 text-gray-400" />
                        <span>{attr.value}</span>
                        <button
                          onClick={() => handleDeleteAttribute(attr.id)}
                          className="ml-1 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Reset section */}
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
        <AlertDialogContent className="bg- text-slate-50white bg-slate-50">
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
                <Button onClick={handleVerifyCredentials} className="bg-blue-600 hover:bg-blue-700 text-white">
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

      {/* Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md bg-slate-50">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Editar Categoría" : "Nueva Categoría"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="categoryName">Nombre de la Categoría</Label>
              <Input
                id="categoryName"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ej: Accesorio, Cargador, Notebook"
              />
            </div>

            <div>
              <Label>Campos disponibles</Label>
              <div className="space-y-2 mt-2">
                {Object.entries(categoryFields).map(([field, active]) => (
                  <div key={field} className="flex items-center space-x-2">
                    <Checkbox
                      id={field}
                      checked={active}
                      onCheckedChange={(checked) => setCategoryFields({ ...categoryFields, [field]: !!checked })}
                    />
                    <label htmlFor={field} className="text-sm capitalize cursor-pointer">
                      {field === "model"
                        ? "Modelo"
                        : field === "storage"
                          ? "Almacenamiento"
                          : field === "color"
                            ? "Color"
                            : field === "condition"
                              ? "Estado/Condición"
                              : field === "battery"
                                ? "Batería"
                                : field === "imei"
                                  ? "IMEI"
                                  : field}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCategory} className="bg-green-600 hover:bg-green-700 text-white">
              {editingCategory ? "Guardar Cambios" : "Crear Categoría"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attribute Modal */}
      <Dialog open={isAttributeModalOpen} onOpenChange={setIsAttributeModalOpen}>
        <DialogContent className="max-w-md bg-slate-50">
          <DialogHeader>
            <DialogTitle>
              Agregar{" "}
              {selectedAttributeType === "color"
                ? "Color"
                : selectedAttributeType === "storage"
                  ? "Almacenamiento"
                  : "Estado"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="attributeValue">Valor</Label>
              <Input
                id="attributeValue"
                value={newAttributeValue}
                onChange={(e) => setNewAttributeValue(e.target.value)}
                placeholder={
                  selectedAttributeType === "color"
                    ? "Ej: Naranja"
                    : selectedAttributeType === "storage"
                      ? "Ej: 2TB"
                      : "Ej: Como Nuevo"
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttributeModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAttribute} className="bg-green-600 hover:bg-green-700 text-white">
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
