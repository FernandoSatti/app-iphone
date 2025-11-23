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
import { Search, Edit, Save, X, Trash2, Download } from "lucide-react"
import { useInventory, type InventoryItem } from "@/components/inventory-context"
import * as XLSX from "xlsx"
import { useProductCategories } from "@/components/product-categories-context"

const CatalogView = () => {
  const { inventory, removeInventoryItem, updateInventoryItem } = useInventory()
  const { categories } = useProductCategories()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [productTypeFilter, setProductTypeFilter] = useState("all")
  const [editingProduct, setEditingProduct] = useState<InventoryItem | null>(null)
  const [showExport, setShowExport] = useState(false)

  const filteredProducts = inventory.filter((product) => {
    const matchesSearch =
      product.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.storage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.imei.includes(searchTerm) ||
      product.provider.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || product.status === statusFilter

    const matchesProductType = productTypeFilter === "all" || product.productType === productTypeFilter

    return matchesSearch && matchesStatus && matchesProductType
  })

  const handleExportToExcel = () => {
    const exportData = filteredProducts.map((product) => {
      const row: any = {
        Modelo: product.model,
        Almacenamiento: product.storage,
        Color: product.color,
        Estado: product.status,
        Condición: product.condition,
        Batería: `${product.battery}%`,
        Proveedor: product.provider,
        IMEI: product.imei,
      }

      row["Precio Costo"] = product.costPrice
      row["Precio Venta"] = product.salePrice
      row["Fecha"] = product.dateAdded

      return row
    })

    const worksheet = XLSX.utils.json_to_sheet(exportData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock")

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    const blob = new Blob([wbout], { type: "application/octet-stream" })

    const today = new Date()
    const day = String(today.getDate()).padStart(2, "0")
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const year = today.getFullYear()
    const filename = `stock-${day}-${month}-${year}.xlsx`

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleEditProduct = (product: InventoryItem) => {
    setEditingProduct({ ...product })
    setShowExport(true)
  }

  const handleSaveEdit = async () => {
    if (editingProduct) {
      try {
        await updateInventoryItem(editingProduct.id, editingProduct)
        setShowExport(false)
        setEditingProduct(null)
      } catch (error) {
        console.error("[v0] Error updating product:", error)
        alert("Error al actualizar el producto")
      }
    }
  }

  const handleDeleteProduct = async (product: InventoryItem) => {
    if (confirm(`¿Estás seguro de que quieres eliminar ${product.model} ${product.storage}?`)) {
      try {
        await removeInventoryItem(product.id)
      } catch (error) {
        console.error("[v0] Error deleting product:", error)
        alert("Error al eliminar el producto")
      }
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

          <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.name} value={cat.name}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Productos</CardTitle>
            <Button
              onClick={handleExportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={filteredProducts.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || statusFilter !== "all" || productTypeFilter !== "all" ? (
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
                    <TableHead className="text-white font-semibold">Tipo</TableHead>
                    <TableHead className="text-white font-semibold">Modelo</TableHead>
                    <TableHead className="text-white font-semibold">Almacenamiento</TableHead>
                    <TableHead className="text-white font-semibold">Color</TableHead>
                    <TableHead className="text-white font-semibold">Estado</TableHead>
                    <TableHead className="text-white font-semibold">Condición</TableHead>
                    <TableHead className="text-white font-semibold">Batería</TableHead>
                    <TableHead className="text-white font-semibold">Proveedor</TableHead>
                    <TableHead className="text-white font-semibold">IMEI</TableHead>
                    <TableHead className="text-white font-semibold text-right">Precio Costo</TableHead>
                    <TableHead className="text-white font-semibold text-right">Precio Venta</TableHead>
                    <TableHead className="text-white font-semibold">Fecha</TableHead>
                    <TableHead className="text-white font-semibold w-[5%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const category = categories.find((cat) => cat.name === product.productType) || { fields: {} }
                    const fields = category.fields

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="text-sm">{product.productType || "Celular"}</TableCell>
                        <TableCell className="font-medium">{product.model}</TableCell>
                        <TableCell>{fields.storage ? product.storage : "--"}</TableCell>
                        <TableCell>{fields.color ? product.color : "--"}</TableCell>
                        <TableCell>{getStatusBadge(product.status)}</TableCell>
                        <TableCell>
                          {fields.condition ? (
                            getConditionBadge(product.condition)
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {fields.battery ? (
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
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{product.provider}</TableCell>
                        <TableCell className="font-mono text-xs">{fields.imei ? product.imei : "--"}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${product.costPrice?.toFixed(0) || "0"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          ${product.salePrice?.toFixed(0) || "0"}
                        </TableCell>
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
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showExport && editingProduct && (
        <Dialog open={showExport} onOpenChange={setShowExport}>
          <DialogContent className="max-w-2xl bg-white">
            <DialogHeader>
              <DialogTitle>Editar Producto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modelo</Label>
                  <Input value={editingProduct.model} disabled className="bg-gray-100" />
                </div>
                <div>
                  <Label>IMEI</Label>
                  <Input
                    value={editingProduct.imei}
                    onChange={(e) => setEditingProduct({ ...editingProduct, imei: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Precio de Costo ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProduct.costPrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
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
                    value={editingProduct.salePrice}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
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
                    value={editingProduct.status}
                    onValueChange={(value: InventoryItem["status"]) =>
                      setEditingProduct({ ...editingProduct, status: value })
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
                    value={editingProduct.condition}
                    onValueChange={(value: InventoryItem["condition"]) =>
                      setEditingProduct({ ...editingProduct, condition: value })
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
                    value={editingProduct.battery}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        battery: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowExport(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} className="bg-green-600 hover:bg-green-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default CatalogView
