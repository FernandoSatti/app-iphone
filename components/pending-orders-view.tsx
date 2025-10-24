"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, Package, Plus, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react"
import { usePendingOrders } from "./pending-orders-context"
import { useProviders } from "./provider-context"
import { useInventory } from "./inventory-context"
import { useAccounts } from "./account-context"

const storageOptions = ["64GB", "128GB", "256GB", "512GB", "1TB"]
const colors = [
  "Negro",
  "Blanco",
  "Azul",
  "Rosa",
  "Morado",
  "Rojo",
  "Verde",
  "Amarillo",
  "Natural Titanium",
  "Blue Titanium",
  "White Titanium",
  "Black Titanium",
]
const conditions = ["Nuevo", "Usado", "Refurbished"] as const

export default function PendingOrdersView() {
  const { orders, addOrder, markAsReceived, deleteOrder } = usePendingOrders()
  const { providers } = useProviders()
  const { addInventoryItem } = useInventory() // Fixed function name from addProduct to addInventoryItem
  const { addDebtToProvider } = useAccounts()
  const [searchTerm, setSearchTerm] = useState("")
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set()) // Added state for collapsible orders

  const [orderForm, setOrderForm] = useState({
    providerId: "",
    products: [
      {
        model: "",
        storage: "",
        color: "",
        condition: "" as (typeof conditions)[number] | "",
        battery: "",
        imei: "",
        quantity: 1,
        costPrice: 0,
        salePrice: 0,
      },
    ],
    expectedDate: "",
    notes: "",
  })

  const filteredOrders = orders.filter(
    (order) =>
      order.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.products.some((p) => p.model.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  const pendingOrders = filteredOrders.filter((order) => order.status === "pending")
  const totalPendingValue = pendingOrders.reduce((sum, order) => sum + order.totalAmount, 0)

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const addProductToOrder = () => {
    setOrderForm({
      ...orderForm,
      products: [
        ...orderForm.products,
        {
          model: "",
          storage: "",
          color: "",
          condition: "",
          battery: "",
          imei: "",
          quantity: 1,
          costPrice: 0,
          salePrice: 0,
        },
      ],
    })
  }

  const removeProductFromOrder = (index: number) => {
    setOrderForm({
      ...orderForm,
      products: orderForm.products.filter((_, i) => i !== index),
    })
  }

  const updateProduct = (index: number, field: string, value: string | number) => {
    const updatedProducts = orderForm.products.map((product, i) =>
      i === index ? { ...product, [field]: value } : product,
    )
    setOrderForm({ ...orderForm, products: updatedProducts })
  }

  const calculateTotal = () => {
    return orderForm.products.reduce((sum, product) => sum + product.quantity * product.costPrice, 0)
  }

  const handleAddOrder = () => {
    if (
      !orderForm.providerId ||
      orderForm.products.some(
        (p) =>
          !p.model ||
          !p.storage ||
          !p.color ||
          !p.condition ||
          !p.battery ||
          !p.imei ||
          p.costPrice <= 0 ||
          p.salePrice <= 0,
      )
    ) {
      alert("Por favor, complete todos los campos de los productos")
      return
    }

    const selectedProvider = providers.find((p) => p.id === orderForm.providerId)
    if (!selectedProvider) return

    const productsWithTotal = orderForm.products.map((product) => ({
      ...product,
      totalCost: product.quantity * product.costPrice,
    }))

    const totalAmount = calculateTotal()

    addOrder({
      providerId: orderForm.providerId,
      providerName: selectedProvider.name,
      products: productsWithTotal,
      totalAmount,
      expectedDate: orderForm.expectedDate,
      notes: orderForm.notes,
    })

    addDebtToProvider(
      orderForm.providerId,
      selectedProvider.name,
      totalAmount,
      `Pedido realizado - Pago adelantado`,
      orderForm.expectedDate || undefined,
    )

    setOrderForm({
      providerId: "",
      products: [
        {
          model: "",
          storage: "",
          color: "",
          condition: "",
          battery: "",
          imei: "",
          quantity: 1,
          costPrice: 0,
          salePrice: 0,
        },
      ],
      expectedDate: "",
      notes: "",
    })
    setIsOrderModalOpen(false)
  }

  const handleMarkAsReceived = (order: any) => {
    // Solo marcar como recibido
    markAsReceived(order.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Pedidos Pendientes</h2>
          <p className="text-gray-600">Gestiona los pedidos realizados a proveedores</p>
        </div>
        <Dialog open={isOrderModalOpen} onOpenChange={setIsOrderModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Registrar Nuevo Pedido</DialogTitle>
              <DialogDescription className="text-gray-600">
                Registra un pedido realizado a un proveedor con todos los detalles de los productos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="provider" className="text-gray-700">
                  Proveedor
                </Label>
                <Select
                  value={orderForm.providerId}
                  onValueChange={(value) => setOrderForm({ ...orderForm, providerId: value })}
                >
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Seleccionar proveedor" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id} className="text-gray-900">
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-700">Productos</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addProductToOrder}>
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar Producto
                  </Button>
                </div>
                <div className="space-y-4">
                  {orderForm.products.map((product, index) => (
                    <Card key={index} className="p-4 bg-gray-50">
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm text-gray-700">Modelo</Label>
                            <Input
                              placeholder="iPhone 15 Pro Max"
                              value={product.model}
                              onChange={(e) => updateProduct(index, "model", e.target.value)}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-gray-700">Almacenamiento</Label>
                            <Select
                              value={product.storage}
                              onValueChange={(value) => updateProduct(index, "storage", value)}
                            >
                              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {storageOptions.map((storage) => (
                                  <SelectItem key={storage} value={storage}>
                                    {storage}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm text-gray-700">Color</Label>
                            <Select
                              value={product.color}
                              onValueChange={(value) => updateProduct(index, "color", value)}
                            >
                              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {colors.map((color) => (
                                  <SelectItem key={color} value={color}>
                                    {color}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm text-gray-700">Estado</Label>
                            <Select
                              value={product.condition}
                              onValueChange={(value) => updateProduct(index, "condition", value)}
                            >
                              <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                <SelectValue placeholder="Seleccionar" />
                              </SelectTrigger>
                              <SelectContent>
                                {conditions.map((condition) => (
                                  <SelectItem key={condition} value={condition}>
                                    {condition}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label className="text-sm text-gray-700">Batería (%)</Label>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              placeholder="85"
                              value={product.battery}
                              onChange={(e) => updateProduct(index, "battery", e.target.value)}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-gray-700">IMEI</Label>
                            <Input
                              placeholder="123456789012345"
                              value={product.imei}
                              onChange={(e) => updateProduct(index, "imei", e.target.value)}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-gray-700">Cantidad</Label>
                            <Input
                              type="number"
                              min="1"
                              value={product.quantity}
                              onChange={(e) => updateProduct(index, "quantity", Number.parseInt(e.target.value) || 1)}
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm text-gray-700">Precio de Costo ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="500"
                              value={product.costPrice}
                              onChange={(e) =>
                                updateProduct(index, "costPrice", Number.parseFloat(e.target.value) || 0)
                              }
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </div>
                          <div>
                            <Label className="text-sm text-gray-700">Precio de Venta ($)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="700"
                              value={product.salePrice}
                              onChange={(e) =>
                                updateProduct(index, "salePrice", Number.parseFloat(e.target.value) || 0)
                              }
                              className="bg-white border-gray-300 text-gray-900"
                            />
                          </div>
                        </div>

                        {orderForm.products.length > 1 && (
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeProductFromOrder(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar Producto
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
                <div className="text-right mt-2">
                  <span className="text-lg font-medium text-gray-700">Total: ${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div>
                <Label htmlFor="expectedDate" className="text-gray-700">
                  Fecha Esperada de Llegada (Opcional)
                </Label>
                <Input
                  id="expectedDate"
                  type="date"
                  value={orderForm.expectedDate}
                  onChange={(e) => setOrderForm({ ...orderForm, expectedDate: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <div>
                <Label htmlFor="notes" className="text-gray-700">
                  Notas (Opcional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionales sobre el pedido..."
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>

              <Button
                onClick={handleAddOrder}
                disabled={
                  !orderForm.providerId ||
                  orderForm.products.some(
                    (p) =>
                      !p.model ||
                      !p.storage ||
                      !p.color ||
                      !p.condition ||
                      !p.battery ||
                      !p.imei ||
                      p.costPrice <= 0 ||
                      p.salePrice <= 0,
                  ) ||
                  calculateTotal() <= 0
                }
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Registrar Pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">Valor Total Pendiente</CardTitle>
          <Package className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700">${totalPendingValue.toFixed(2)}</div>
          <p className="text-xs text-blue-600">
            {pendingOrders.length} pedido{pendingOrders.length !== 1 ? "s" : ""} pendiente
            {pendingOrders.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar pedidos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white border-gray-300 text-gray-900"
        />
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <Card key={order.id} className="bg-white border-gray-200">
            <CardHeader>
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleOrderExpansion(order.id)}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-gray-900">{order.providerName}</CardTitle>
                    <p className="text-sm text-gray-600">
                      Pedido: {order.id} • {new Date(order.orderDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {order.products.length} producto{order.products.length !== 1 ? "s" : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={order.status === "pending" ? "default" : "secondary"}>
                    {order.status === "pending" ? "Pendiente" : "Recibido"}
                  </Badge>
                  <span className="text-lg font-bold text-gray-900">${order.totalAmount.toFixed(2)}</span>
                  {expandedOrders.has(order.id) ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            </CardHeader>

            {expandedOrders.has(order.id) && (
              <CardContent>
                <div className="space-y-4">
                  {/* Products */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Productos</h4>
                    <div className="space-y-2">
                      {order.products.map((product, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <div className="font-medium text-gray-900">
                                {product.model} {product.storage} - {product.color}
                              </div>
                              <div className="text-sm text-gray-600">
                                Estado: {product.condition} • Batería: {product.battery}% • IMEI: {product.imei}
                              </div>
                              <div className="text-sm text-gray-600">
                                Cantidad: {product.quantity} • Costo: ${product.costPrice} • Venta: ${product.salePrice}
                              </div>
                            </div>
                            <span className="text-gray-900 font-medium">${product.totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expected Date */}
                  {order.expectedDate && (
                    <div>
                      <span className="text-sm text-gray-600">
                        Fecha esperada: {new Date(order.expectedDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  {order.notes && (
                    <div>
                      <span className="text-sm text-gray-600">Notas: {order.notes}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {order.status === "pending" ? (
                      <>
                        <Button
                          onClick={() => handleMarkAsReceived(order)}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Marcar como Recibido
                        </Button>
                        <Button
                          onClick={() => deleteOrder(order.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => deleteOrder(order.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar Pedido Recibido
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && (
        <Card className="bg-white border-gray-200">
          <CardContent className="text-center py-8">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay pedidos registrados</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
