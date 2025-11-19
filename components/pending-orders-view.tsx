"use client"

import { useState, useEffect } from "react"
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
import { Search, Package, Plus, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { usePendingOrders } from "./pending-orders-context"
import { useProviders } from "./provider-context"
import { useInventory } from "./inventory-context"
import { useAccounts } from "./account-context"
import { useProductCategories } from "./product-categories-context"
import { useProductAttributes } from "./product-attributes-context"
import { parseLocalDate, formatDisplayDate } from "@/lib/date-helpers"

export default function PendingOrdersView() {
  const { orders, addOrder, markAsReceived, deleteOrder } = usePendingOrders()
  const { providers } = useProviders()
  const { addInventoryItem } = useInventory()
  const { addDebtToProvider } = useAccounts()
  const { categories, getCategoryByName } = useProductCategories()
  const { getAttributesByType } = useProductAttributes()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set())
  const [initialCategory, setInitialCategory] = useState<string | undefined>(undefined)

  const storageOptions = getAttributesByType('storage').map(attr => attr.value)
  const colorOptions = getAttributesByType('color').map(attr => attr.value)
  const conditionOptions = getAttributesByType('condition').map(attr => attr.value)

  const defaultCelularCategory = categories.find(cat => cat.name.toLowerCase() === 'celular')

  const [orderForm, setOrderForm] = useState({
    providerId: "",
    products: [
      {
        productCategory: "", // Will be set by useEffect once categories load
        showCategorySelector: false,
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

  useEffect(() => {
    if (categories.length > 0 && orderForm.products.length > 0) {
      const celularCategory = categories.find(cat => cat.name.toLowerCase() === 'celular')
      if (celularCategory && orderForm.products[0].productCategory === "") {
        setOrderForm(prev => ({
          ...prev,
          products: prev.products.map((p, idx) => 
            idx === 0 && p.productCategory === "" ? { ...p, productCategory: celularCategory.name } : p
          )
        }))
      }
    }
  }, [categories])

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
    const celularCategory = categories.find(cat => cat.name.toLowerCase() === 'celular')
    if (!celularCategory) {
      console.error("[v0] Celular category not found")
      return
    }
    
    setOrderForm({
      ...orderForm,
      products: [
        ...orderForm.products,
        {
          productCategory: celularCategory.name, // Ensure category is set immediately
          showCategorySelector: false,
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

  const addAccessoryToOrder = () => {
    console.log("[v0] Available categories:", categories.map(c => c.name))
    
    const nonCelularCategories = categories.filter(cat => 
      cat.name.toLowerCase() !== 'celular'
    )
    
    const defaultCategory = nonCelularCategories.length > 0 
      ? nonCelularCategories[0].name 
      : categories[0]?.name || "Celular"
    
    setOrderForm({
      ...orderForm,
      products: [
        ...orderForm.products,
        {
          productCategory: defaultCategory,
          showCategorySelector: true, // Always show selector for accessories
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

  const handleDateInput = (value: string) => {
    // Remove all non-digit and non-slash characters
    const cleaned = value.replace(/[^\d/]/g, '')
    
    // Auto-add slashes after day and month
    let formatted = cleaned
    
    if (cleaned.length >= 2 && !cleaned.includes('/')) {
      // After typing 2 digits, add first slash (DD/)
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2)
    } else if (cleaned.length >= 5 && cleaned.split('/').length === 2) {
      // After typing DD/MM, add second slash (DD/MM/)
      const parts = cleaned.split('/')
      formatted = parts[0] + '/' + parts[1].slice(0, 2) + '/' + parts[1].slice(2)
    }
    
    // Limit to DD/MM/YYYY format (10 characters)
    if (formatted.length <= 10) {
      setOrderForm({ ...orderForm, expectedDate: formatted })
    }
  }

  const convertToISODate = (ddmmyyyy: string): string => {
    if (!ddmmyyyy || ddmmyyyy.length !== 10) return ''
    const [day, month, year] = ddmmyyyy.split('/')
    if (!day || !month || !year) return ''
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const handleAddOrder = () => {
    console.log("[v0] Attempting to add order, form data:", orderForm)
    
    if (!orderForm.providerId) {
      console.log("[v0] Validation failed: No provider selected")
      alert("Por favor, seleccione un proveedor")
      return
    }

    if (categories.length === 0) {
      console.log("[v0] Validation failed: Categories not loaded yet")
      alert("Cargando categorías, por favor espere un momento")
      return
    }

    const invalidProducts = orderForm.products.filter(p => {
      if (!p.productCategory) {
        return true
      }

      const category = getCategoryByName(p.productCategory)
      
      if (!category) {
        console.log("[v0] Category not found for:", p.productCategory)
        return true
      }

      const fields = category.fields || {
        model: true,
        storage: true,
        color: true,
        condition: true,
        battery: true,
        imei: true,
      }

      const isInvalid = (
        (fields.model && !p.model.trim()) ||
        (fields.storage && !p.storage) ||
        (fields.color && !p.color) ||
        (fields.condition && !p.condition) ||
        (fields.battery && !p.battery.trim()) ||
        (fields.imei && !p.imei.trim()) ||
        p.costPrice <= 0 ||
        p.salePrice <= 0
      )

      if (isInvalid) {
        console.log("[v0] Invalid product:", p, "Fields required:", fields)
      }

      return isInvalid
    })

    if (invalidProducts.length > 0) {
      console.log("[v0] Validation failed: Invalid products found:", invalidProducts)
      alert("Por favor, complete todos los campos requeridos de los productos")
      return
    }

    const selectedProvider = providers.find((p) => p.id === orderForm.providerId)
    if (!selectedProvider) return

    const productsWithTotal = orderForm.products.map((product) => ({
      ...product,
      totalCost: product.quantity * product.costPrice,
    }))

    const totalAmount = calculateTotal()

    const isoDate = orderForm.expectedDate ? convertToISODate(orderForm.expectedDate) : ''

    addOrder({
      providerId: orderForm.providerId,
      providerName: selectedProvider.name,
      products: productsWithTotal,
      totalAmount,
      expectedDate: isoDate,
      notes: orderForm.notes,
    })

    addDebtToProvider(
      orderForm.providerId,
      selectedProvider.name,
      totalAmount,
      `Pedido realizado - Pago adelantado`,
      isoDate || undefined,
    )

    setOrderForm({
      providerId: "",
      products: [
        {
          productCategory: "", // Reset to empty, will be set by useEffect
          showCategorySelector: false,
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
    setInitialCategory(undefined)
    setIsOrderModalOpen(false)
    console.log("[v0] Order added successfully and form reset")
  }

  const handleMarkAsReceived = async (order: any) => {
    try {
      await markAsReceived(order)
      alert(
        `Pedido recibido. Se agregaron ${order.products.reduce((sum: number, p: any) => sum + p.quantity, 0)} unidades al stock.`,
      )
    } catch (error) {
      console.error("[v0] Error marking order as received:", error)
      alert("Error al marcar el pedido como recibido. Por favor, intente nuevamente.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Pedidos Pendientes</h2>
          <p className="text-gray-600">Gestiona los pedidos realizados a proveedores</p>
        </div>
        <Dialog open={isOrderModalOpen} onOpenChange={(open) => {
          setIsOrderModalOpen(open)
          if (!open) setInitialCategory(undefined)
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setInitialCategory(undefined)}>
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
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={addProductToOrder}>
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar Producto
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={addAccessoryToOrder}>
                      <Plus className="h-3 w-3 mr-1" />
                      Agregar Accesorio
                    </Button>
                  </div>
                </div>
                <div className="space-y-4">
                  {orderForm.products.map((product, index) => {
                    const category = getCategoryByName(product.productCategory)
                    const fields = category?.fields || {
                      model: true,
                      storage: true,
                      color: true,
                      condition: true,
                      battery: true,
                      imei: true,
                    }

                    return (
                      <Card key={index} className="p-4 bg-gray-50">
                        <div className="space-y-3">
                          {product.showCategorySelector && (
                            <div>
                              <Label className="text-sm text-gray-700">Categoría de Producto</Label>
                              <Select
                                value={product.productCategory}
                                onValueChange={(value) => updateProduct(index, "productCategory", value)}
                              >
                                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                  <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.name}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {fields.model && (
                              <div>
                                <Label className="text-sm text-gray-700">Modelo</Label>
                                <Input
                                  placeholder="iPhone 15 Pro Max"
                                  value={product.model}
                                  onChange={(e) => updateProduct(index, "model", e.target.value)}
                                  className="bg-white border-gray-300 text-gray-900"
                                />
                              </div>
                            )}
                            {fields.storage && (
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
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {fields.color && (
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
                                    {colorOptions.map((color) => (
                                      <SelectItem key={color} value={color}>
                                        {color}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {fields.condition && (
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
                                    {conditionOptions.map((condition) => (
                                      <SelectItem key={condition} value={condition}>
                                        {condition}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            {fields.battery && (
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
                            )}
                            {fields.imei && (
                              <div>
                                <Label className="text-sm text-gray-700">IMEI</Label>
                                <Input
                                  placeholder="123456789012345"
                                  value={product.imei}
                                  onChange={(e) => updateProduct(index, "imei", e.target.value)}
                                  className="bg-white border-gray-300 text-gray-900"
                                />
                              </div>
                            )}
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
                    )
                  })}
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
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={orderForm.expectedDate}
                  onChange={(e) => handleDateInput(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                  maxLength={10}
                  inputMode="numeric"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formato: DD/MM/YYYY (ejemplo: 25/12/2025)
                </p>
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
                  categories.length === 0 || // Disable if categories not loaded
                  orderForm.products.some(
                    (p) => {
                      if (!p.productCategory) {
                        return true
                      }

                      const category = getCategoryByName(p.productCategory)
                      
                      if (!category) {
                        return true
                      }

                      const fields = category.fields || {
                        model: true,
                        storage: true,
                        color: true,
                        condition: true,
                        battery: true,
                        imei: true,
                      }

                      // Check if required fields are filled based on category configuration
                      const missingRequired = (
                        (fields.model && !p.model.trim()) ||
                        (fields.storage && !p.storage) ||
                        (fields.color && !p.color) ||
                        (fields.condition && !p.condition) ||
                        (fields.battery && !p.battery.trim()) ||
                        (fields.imei && !p.imei.trim())
                      )

                      // Check if prices are valid
                      const invalidPrices = p.costPrice <= 0 || p.salePrice <= 0

                      return missingRequired || invalidPrices
                    }
                  ) ||
                  calculateTotal() <= 0
                }
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Registrar Pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-blue-800">Valor Total Pendiente</CardTitle>
          <Package className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700">${orders.reduce((sum, order) => sum + order.totalAmount, 0).toFixed(2)}</div>
          <p className="text-xs text-blue-600">
            {orders.filter(order => order.status === "pending").length} pedido{orders.filter(order => order.status === "pending").length !== 1 ? "s" : ""} pendiente
            {orders.filter(order => order.status === "pending").length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar pedidos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white border-gray-300 text-gray-900"
        />
      </div>

      <div className="space-y-4">
        {orders.filter(
          (order) =>
            order.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.products.some((p) => p.model.toLowerCase().includes(searchTerm.toLowerCase())),
        ).map((order) => (
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
                      Pedido: {order.id} • {formatDisplayDate(parseLocalDate(order.orderDate))}
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

                  {order.expectedDate && (
                    <div>
                      <span className="text-sm text-gray-600">
                        Fecha esperada: {formatDisplayDate(parseLocalDate(order.expectedDate))}
                      </span>
                    </div>
                  )}

                  {order.notes && (
                    <div>
                      <span className="text-sm text-gray-600">Notas: {order.notes}</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    {order.status === "pending" ? (
                      <>
                        <Button
                          onClick={() => handleMarkAsReceived(order)}
                          className="bg-green-600 hover:bg-green-700 text-white"
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

      {orders.filter(
        (order) =>
          order.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.products.some((p) => p.model.toLowerCase().includes(searchTerm.toLowerCase())),
      ).length === 0 && (
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
