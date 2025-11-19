"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, X, Search, Check, Plus } from 'lucide-react'
import type { Sale } from "@/app/page"
import { useInventory } from "@/components/inventory-context"
import { useClients } from "@/components/client-context"
import { useAccounts } from "@/components/account-context"
import { useCash } from "@/components/cash-context"
import { useAuth } from "@/components/auth-context"
import { ClientsModal } from "@/components/clients-modal"

const sellers = ["Riki", "Vale"]

type SelectedProduct = {
  id: string
  name: string
  price: number
  cost: number
}

type TradeIn = {
  model: string
  gb: string
  color: string
  battery: string
  imei: string
  takenValue: number
  resaleValue: number
}

interface NewSaleModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSaleAdd: (sale: Omit<Sale, "id" | "date" | "time">) => void
}

export function NewSaleModal({ isOpen, onOpenChange, onSaleAdd }: NewSaleModalProps) {
  const { getAvailableItems, markItemsAsSold, addInventoryItem } = useInventory()
  const { searchClients } = useClients()
  const { addSaleToAccount } = useAccounts()
  const { addTransaction } = useCash()
  const { user } = useAuth()
  const availableInventory = getAvailableItems()
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [seller, setSeller] = useState<string>("")
  const [customer, setCustomer] = useState<string>("")
  const [showClientSearch, setShowClientSearch] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState("")
  const [showTradeIn, setShowTradeIn] = useState(false)
  const [tradeInDetails, setTradeInDetails] = useState<TradeIn | null>(null)
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash")
  const [showAddClientModal, setShowAddClientModal] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      setSeller(user.name)
    }
  }, [isOpen, user])

  const toggleProductSelection = (product: { id: string; name: string; price: number; cost: number }) => {
    setSelectedProducts((current) => {
      const isSelected = current.some((p) => p.id === product.id)
      if (isSelected) {
        // Remover producto si ya está seleccionado
        return current.filter((p) => p.id !== product.id)
      } else {
        // Agregar producto si no está seleccionado
        return [...current, product]
      }
    })
  }

  const removeFromCart = (productId: string) => {
    setSelectedProducts((current) => current.filter((item) => item.id !== productId))
  }

  const handleSelectClient = (clientName: string) => {
    setCustomer(clientName)
    setShowClientSearch(false)
    setClientSearchTerm("")
  }

  const getCurrentLocalDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const handleAddSale = () => {
    if (!seller || !customer || selectedProducts.length === 0) {
      alert("Por favor, complete todos los campos: Vendedor, Cliente y al menos un producto seleccionado.")
      return
    }

    const totalSalePrice = selectedProducts.reduce((sum, item) => sum + item.price, 0)
    const tradeInValue = tradeInDetails?.takenValue || 0

    const cashReceived = totalSalePrice - tradeInValue

    // Ingreso total (para calcular ganancia bruta) = precio de venta
    const totalIncome = totalSalePrice

    const totalProductCost = selectedProducts.reduce((sum, item) => sum + item.cost, 0)
    const grossProfit = totalIncome - totalProductCost

    const orderDescription = selectedProducts
      .map((item) => `${item.name} (Precio: $${item.price}, Costo: $${item.cost})`)
      .join("\n")

    const tradeInDescription = tradeInDetails
      ? `${tradeInDetails.model} ${tradeInDetails.gb}GB ${tradeInDetails.color}\nBTR: ${tradeInDetails.battery}% IMEI: ${tradeInDetails.imei}\nTomado: $${tradeInDetails.takenValue} Reventa: $${tradeInDetails.resaleValue}`
      : undefined

    const newSale: Omit<Sale, "id" | "date" | "time"> = {
      status: paymentType === "credit" ? "Pendiente" : "Acreditado",
      client: customer,
      salesperson: seller,
      order: orderDescription,
      tradeIn: tradeInDescription,
      grossProfit,
      total: totalIncome,
      discount: 0,
      totalCost: totalProductCost,
    }

    if (paymentType === "cash") {
      addTransaction({
        type: "income",
        date: getCurrentLocalDate(),
        amount: cashReceived,
        paymentMethod: "cash",
        category: "Ventas",
        description: `Venta al contado - ${customer}: ${selectedProducts[0]?.name}${selectedProducts.length > 1 ? ` y ${selectedProducts.length - 1} más` : ""}${tradeInDetails ? ` (Canje recibido: $${tradeInValue} - Capital)` : ""}`,
        relatedTo: "sale",
        relatedId: `sale_${Date.now()}`,
      })
    }

    if (paymentType === "credit") {
      const clientData = searchClients(customer).find((c) => c.name === customer)
      const clientId = clientData?.id || `temp_${Date.now()}`

      addSaleToAccount(
        clientId,
        customer,
        `sale_${Date.now()}`,
        cashReceived,
        `Venta: ${orderDescription.split("\n")[0]}...${tradeInDetails ? ` (Canje recibido: $${tradeInValue} - Capital)` : ""}`,
        undefined,
      )
    }

    // Mark products as sold
    const soldItemIds = selectedProducts.map((item) => item.id)
    markItemsAsSold(soldItemIds)

    if (tradeInDetails) {
      addInventoryItem({
        model: tradeInDetails.model,
        storage: tradeInDetails.gb + "GB",
        color: tradeInDetails.color,
        battery: Number.parseInt(tradeInDetails.battery),
        imei: tradeInDetails.imei,
        costPrice: tradeInDetails.takenValue,
        salePrice: tradeInDetails.resaleValue,
        condition: "Usado",
        provider: "Plan Canje",
        status: "Disponible",
      })
    }

    onSaleAdd(newSale)
    resetModal()
  }

  const resetModal = () => {
    setSelectedProducts([])
    setSeller(user?.name || "")
    setCustomer("")
    setPaymentType("cash")
    setShowTradeIn(false)
    setTradeInDetails(null)
    setShowClientSearch(false)
    setClientSearchTerm("")
    setShowAddClientModal(false)
  }

  const totalCart = selectedProducts.reduce((sum, item) => sum + item.price, 0)
  const finalTotal = totalCart - (tradeInDetails?.takenValue || 0)

  const filteredClients = searchClients(clientSearchTerm)

  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl p-0 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-extralight leading-3 text-sm mx-0 w-full h-min"
        hideClose
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-white flex-row">
            <DialogTitle className="text-2xl font-semibold">Nueva venta</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex flex-1">
            {/* Left Column: Product List */}
            <div className="w-[350px] bg-gray-800 text-white flex flex-col">
              <div className="p-4 border-b border-gray-700">
                <Input
                  placeholder="Buscar producto..."
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
              <div className="flex-1 overflow-y-auto px-0 leading-4 my-0">
                {availableInventory.length === 0 ? (
                  <div className="text-center py-20 text-gray-400">
                    <p className="text-lg">No hay productos disponibles.</p>
                    <p className="text-sm mt-2">Ve a "Inventario" para agregar productos.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {availableInventory.map((product) => {
                      const selected = isProductSelected(product.id)
                      return (
                        <div
                          key={product.id}
                          onClick={() =>
                            toggleProductSelection({
                              id: product.id,
                              name: `${product.model} ${product.storage}`,
                              price: product.salePrice,
                              cost: product.costPrice,
                            })
                          }
                          className={`flex justify-between items-center p-3 cursor-pointer transition-colors border-b border-gray-700 ${
                            selected ? "bg-green-700 hover:bg-green-600" : "hover:bg-gray-700"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-white text-sm flex items-center gap-2">
                              {selected && <Check className="h-4 w-4 text-green-300" />}
                              {product.model.replace("iPhone ", "")} {product.storage}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {product.color} • {product.battery}%
                            </div>
                          </div>
                          <span className="font-bold text-white text-base">${product.salePrice}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Sale Details */}
            <div className="flex-1 bg-white p-6 flex px-1.5 py-1.5 flex-col items-stretch justify-center font-normal">
              {/* Seller and Customer - Campo libre para cliente con lupita */}
              <div className="space-y-6 mb-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <span className="mr-2">👤</span> Vendedor
                  </Label>
                  <Select onValueChange={setSeller} value={seller}>
                    <SelectTrigger className="h-10 w-full leading-5">
                      <SelectValue placeholder="Seleccionar vendedor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sellers.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center justify-between">
                    <span className="flex items-center">
                      <span className="mr-2">👥</span> Cliente
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-green-100"
                      onClick={() => setShowAddClientModal(true)}
                    >
                      <Plus className="h-4 w-4 text-green-600" />
                    </Button>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nombre del cliente..."
                      value={customer}
                      onChange={(e) => setCustomer(e.target.value)}
                      className="h-10 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 bg-transparent"
                      onClick={() => setShowClientSearch(!showClientSearch)}
                    >
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Buscador de clientes */}
                  {showClientSearch && (
                    <div className="border rounded-lg p-3 bg-gray-50 mt-2">
                      <Input
                        placeholder="Buscar cliente..."
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {filteredClients.length > 0 ? (
                          filteredClients.map((client) => (
                            <div
                              key={client.id}
                              onClick={() => handleSelectClient(client.name)}
                              className="p-2 hover:bg-gray-200 cursor-pointer rounded text-sm"
                            >
                              <div className="font-medium">{client.name}</div>
                              <div className="text-xs text-gray-500">{client.phone}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-sm text-gray-500 p-2">
                            {clientSearchTerm ? "No se encontraron clientes" : "No hay clientes en la base de datos"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <span className="mr-2">💳</span> Tipo de Pago
                  </Label>
                  <Select onValueChange={(value: "cash" | "credit") => setPaymentType(value)} value={paymentType}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue placeholder="Seleccionar tipo de pago..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">💵 Contado</SelectItem>
                      <SelectItem value="credit">📋 A Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected Products */}
              <div className="flex-1 mb-6">
                <h4 className="font-semibold mb-3 text-lg flex items-center">
                  <span className="mr-2">🛒</span> Productos Seleccionados ({selectedProducts.length})
                </h4>
                <div className="border rounded-lg text-left h-[200px] overflow-hidden">
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10">
                        <TableRow className="bg-gray-900 hover:bg-gray-900">
                          <TableHead className="text-white font-semibold h-10 w-[40%]">Producto</TableHead>
                          <TableHead className="text-white font-semibold text-center h-10 w-[15%]">Precio</TableHead>
                          <TableHead className="text-white font-semibold text-center h-10 w-[15%]">Costo</TableHead>
                          <TableHead className="text-white font-semibold text-center h-10 w-[20%]">Ganancia</TableHead>
                          <TableHead className="text-white font-semibold text-center h-10 w-[10%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProducts.length > 0 ? (
                          selectedProducts.map((item) => (
                            <TableRow key={item.id} className="h-12">
                              <TableCell className="font-medium py-2 w-[40%]">{item.name}</TableCell>
                              <TableCell className="text-center py-2 w-[15%]">${item.price}</TableCell>
                              <TableCell className="text-center py-2 text-red-600 w-[15%]">${item.cost}</TableCell>
                              <TableCell className="text-center font-medium py-2 text-green-600 w-[20%]">
                                ${item.price - item.cost}
                              </TableCell>
                              <TableCell className="text-center py-2 w-[10%]">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => removeFromCart(item.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-16">
                              No hay productos seleccionados
                              <br />
                              <span className="text-xs">
                                Haz clic en los productos de la izquierda para seleccionarlos
                              </span>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

              {/* Trade-In Button */}
              <div className="mb-4">
                <Button
                  variant="outline"
                  className="w-full h-10 bg-transparent"
                  onClick={() => setShowTradeIn(!showTradeIn)}
                >
                  🔄 Plan Canje
                </Button>

                {tradeInDetails && (
                  <div className="mt-3 p-3 border rounded-md bg-blue-50 text-sm">
                    <p>
                      <strong>Canje:</strong> {tradeInDetails.model} {tradeInDetails.gb}GB - Tomado a $
                      {tradeInDetails.takenValue}
                    </p>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="mb-6">
                <div className="text-2xl font-bold">Total a recibir: ${finalTotal}</div>
                {selectedProducts.length > 0 && (
                  <div className="text-sm text-gray-600 mt-1">
                    Precio venta: ${totalCart} {tradeInDetails && `- Canje (capital): $${tradeInDetails.takenValue}`}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 px-0 mx-4">
                <Button
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
                  onClick={handleAddSale}
                  disabled={selectedProducts.length === 0}
                >
                  ✓ AGREGAR VENTA
                </Button>
                <Button variant="secondary" className="w-full h-10 bg-gray-500 hover:bg-gray-600 text-white">
                  💰 APLICAR DESCUENTO
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Trade-In Form Modal */}
        {showTradeIn && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-8 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-xl font-semibold mb-4">Plan Canje</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const data = Object.fromEntries(formData.entries()) as Omit<TradeIn, "takenValue" | "resaleValue"> & {
                    takenValue: string
                    resaleValue: string
                  }
                  setTradeInDetails({
                    ...data,
                    takenValue: Number.parseFloat(data.takenValue),
                    resaleValue: Number.parseFloat(data.resaleValue),
                  })
                  setShowTradeIn(false)
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Modelo</Label>
                    <Input name="model" placeholder="iPhone 13" required />
                  </div>
                  <div>
                    <Label>GB</Label>
                    <Input name="gb" placeholder="128" required />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input name="color" placeholder="Negro" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Batería (%)</Label>
                    <Input name="battery" placeholder="85" type="number" required />
                  </div>
                  <div>
                    <Label>IMEI</Label>
                    <Input name="imei" placeholder="123456789012345" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor tomado</Label>
                    <Input name="takenValue" placeholder="300" type="number" required />
                  </div>
                  <div>
                    <Label>Valor reventa</Label>
                    <Input name="resaleValue" placeholder="450" type="number" required />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setShowTradeIn(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Agregar Canje
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DialogContent>

      <ClientsModal 
        isOpen={showAddClientModal} 
        onOpenChange={setShowAddClientModal}
      />
    </Dialog>
  )
}
