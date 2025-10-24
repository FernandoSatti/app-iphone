"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Eye, EyeOff, Edit, Save, X, Trash2 } from "lucide-react"
import { useInventory, type InventoryItem } from "@/components/inventory-context"

const CatalogView = () => {
  const { inventory, updateInventoryItem, removeInventoryItem } = useInventory() // Added removeInventoryItem function
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showCostPrice, setShowCostPrice] = useState(true)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const filteredProducts = inventory.filter((product) => {
    const matchesSearch =
      product.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.storage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.imei.includes(searchTerm) ||
      product.provider.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || product.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleEditProduct = (product: InventoryItem) => {
    setEditingItem({ ...product })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = () => {
    if (editingItem) {
      updateInventoryItem(editingItem.id, {
        salePrice: editingItem.salePrice,
        costPrice: editingItem.costPrice,
        status: editingItem.status,
        condition: editingItem.condition,
        battery: editingItem.battery,
      })
      setIsEditModalOpen(false)
      setEditingItem(null)
    }
  }

  const handleDeleteProduct = (product: InventoryItem) => {
    // Added function to handle product deletion
    if (confirm(`¿Estás seguro de que quieres eliminar ${product.model} ${product.storage}?`)) {
      removeInventoryItem(product.id)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Disponible":
        return <Badge className="bg-green-100 text-green-800">Disponible</Badge>
      case "Vendido":
        return <Badge className="bg-red-100 text-red-800">Vendido</Badge>
      case "Reservado":
        return <Badge className="bg-yellow-100 text-yellow-800">Reservado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getConditionBadge = (condition: string) => {
    switch (condition) {
      case "Nuevo":
        return <Badge className="bg-blue-100 text-blue-800">Nuevo</Badge>
      case "Usado":
        return <Badge className="bg-orange-100 text-orange-800">Usado</Badge>
      case "Refurbished":
        return <Badge className="bg-purple-100 text-purple-800">Refurbished</Badge>
      default:
        return <Badge variant="secondary">{condition}</Badge>
    }
  }

  const availableCount = inventory.filter((p) => p.status === "Disponible").length
  const soldCount = inventory.filter((p) => p.status === "Vendido").length
  const reservedCount = inventory.filter((p) => p.status === "Reservado").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stock</h1>
          <p className="text-gray-600 mt-2">Todos los productos en inventario</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">{filteredProducts.length}</p>
          <p className="text-sm text-gray-500">Productos mostrados</p>
        </div>
      </div>

      {/* Controles de búsqueda y filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar por modelo, almacenamiento, color, IMEI o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="Disponible">Solo disponibles</SelectItem>
              <SelectItem value="Vendido">Solo vendidos</SelectItem>
              <SelectItem value="Reservado">Solo reservados</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showCostPrice ? "default" : "outline"}
            onClick={() => setShowCostPrice(!showCostPrice)}
            className="flex items-center gap-2"
          >
            {showCostPrice ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showCostPrice ? "Ocultar costos" : "Mostrar costos"}
          </Button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Disponibles</CardTitle>
            <div className="text-2xl font-bold text-green-900">{availableCount}</div>
          </CardHeader>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Vendidos</CardTitle>
            <div className="text-2xl font-bold text-red-900">{soldCount}</div>
          </CardHeader>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700">Reservados</CardTitle>
            <div className="text-2xl font-bold text-yellow-900">{reservedCount}</div>
          </CardHeader>
        </Card>
      </div>

      {/* Información para capturas */}
      {statusFilter === "Disponible" && !showCostPrice && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-4">
            <p className="text-blue-800 text-sm">
              📸 <strong>Modo captura:</strong> Mostrando solo productos disponibles sin precios de costo. Ideal para
              compartir con clientes.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tabla de productos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || statusFilter !== "all" ? (
                <p>No se encontraron productos que coincidan con los filtros aplicados.</p>
              ) : (
                <>
                  <p>No hay productos en el inventario.</p>
                  <p className="text-sm mt-2">{'Ve a "Inventario > Nuevo Producto" para agregar productos.'}</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-900">
                    <TableHead className="text-white font-semibold">Modelo</TableHead>
                    <TableHead className="text-white font-semibold">Almacenamiento</TableHead>
                    <TableHead className="text-white font-semibold">Color</TableHead>
                    <TableHead className="text-white font-semibold">Estado</TableHead>
                    <TableHead className="text-white font-semibold">Condición</TableHead>
                    <TableHead className="text-white font-semibold">Batería</TableHead>
                    <TableHead className="text-white font-semibold">Proveedor</TableHead>
                    <TableHead className="text-white font-semibold">IMEI</TableHead>
                    {showCostPrice && (
                      <TableHead className="text-white font-semibold text-right">Precio Costo</TableHead>
                    )}
                    <TableHead className="text-white font-semibold text-right">Precio Venta</TableHead>
                    <TableHead className="text-white font-semibold">Fecha</TableHead>
                    <TableHead className="text-white font-semibold w-[5%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.model}</TableCell>
                      <TableCell>{product.storage}</TableCell>
                      <TableCell>{product.color}</TableCell>
                      <TableCell>{getStatusBadge(product.status)}</TableCell>
                      <TableCell>{getConditionBadge(product.condition)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${
                              product.battery >= 80
                                ? "bg-green-500"
                                : product.battery >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                          ></div>
                          {product.battery}%
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{product.provider}</TableCell>
                      <TableCell className="font-mono text-xs">{product.imei}</TableCell>
                      {showCostPrice && <TableCell className="text-right font-medium">${product.costPrice}</TableCell>}
                      <TableCell className="text-right font-medium text-green-600">${product.salePrice}</TableCell>
                      <TableCell className="text-sm text-gray-500">{product.dateAdded}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditProduct(product)}
                          >
                            <Edit className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modelo</Label>
                  <Input value={editingItem.model} disabled className="bg-gray-100" />
                </div>
                <div>
                  <Label>IMEI</Label>
                  <Input value={editingItem.imei} disabled className="bg-gray-100" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Precio de Costo ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingItem.costPrice}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        costPrice: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Precio de Venta ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingItem.salePrice}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        salePrice: Number.parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={editingItem.status}
                    onValueChange={(value: InventoryItem["status"]) =>
                      setEditingItem({ ...editingItem, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Disponible">Disponible</SelectItem>
                      <SelectItem value="Vendido">Vendido</SelectItem>
                      <SelectItem value="Reservado">Reservado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Condición</Label>
                  <Select
                    value={editingItem.condition}
                    onValueChange={(value: InventoryItem["condition"]) =>
                      setEditingItem({ ...editingItem, condition: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Nuevo">Nuevo</SelectItem>
                      <SelectItem value="Usado">Usado</SelectItem>
                      <SelectItem value="Refurbished">Refurbished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Batería (%)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={editingItem.battery}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        battery: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CatalogView
