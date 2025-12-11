"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Search, Check, Plus, Smartphone, Package, FileText } from "lucide-react"
import type { Sale } from "@/app/page"
import { useInventory } from "@/components/inventory-context"
import { useClients } from "@/components/client-context"
import { useAccounts } from "@/components/account-context"
import { useCash } from "@/components/cash-context"
import { useAuth } from "@/components/auth-context"
import { AddClientModal } from "@/components/clients-modal"
import { useProductCategories } from "@/components/product-categories-context"
import { toast } from "@/components/ui/use-toast"

const sellers = ["Riki", "Vale"]

type SelectedProduct = {
  id: string
  name: string
  price: number
  cost: number
  imei: string
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
  onSaleAdd: (sale: Omit<Sale, "id" | "date" | "time">) => Promise<{ sale: Sale } | null>
}

export function NewSaleModal({ isOpen, onOpenChange, onSaleAdd }: NewSaleModalProps) {
  const { getAvailableItems, markItemsAsSold, addInventoryItem } = useInventory()
  const { searchClients } = useClients()
  const { addSaleToAccount } = useAccounts()
  const { addTransaction } = useCash()
  const { user } = useAuth()
  const { categories } = useProductCategories()

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
  const [mobileTab, setMobileTab] = useState<"products" | "details">("products")
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all")

  useEffect(() => {
    if (isOpen && user) {
      setSeller(user.name)
    }
  }, [isOpen, user])

  const toggleProductSelection = (product: { id: string; name: string; price: number; cost: number; imei: string }) => {
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

  const handleAddSale = async () => {
    if (!seller || !customer || selectedProducts.length === 0) {
      toast({
        title: "Error",
        description: "Por favor, complete todos los campos: Vendedor, Cliente y al menos un producto seleccionado.",
        variant: "destructive",
      })
      return
    }

    const totalSalePrice = selectedProducts.reduce((sum, item) => sum + item.price, 0)
    const tradeInValue = tradeInDetails?.takenValue || 0
    const cashReceived = totalSalePrice - tradeInValue
    const totalProductCost = selectedProducts.reduce((sum, item) => sum + item.cost, 0)
    const grossProfit = totalSalePrice - totalProductCost

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
      total: totalSalePrice,
      discount: 0,
      totalCost: totalProductCost,
      paymentType: paymentType === "cash" ? "Contado" : "A Crédito",
      soldItems: selectedProducts.map((product) => ({
        name: product.name,
        price: product.price,
        cost: product.cost,
        imei: product.imei,
        id: product.id,
      })),
    }

    try {
      // Guardar venta
      const result = await onSaleAdd(newSale)

      if (!result?.sale) {
        throw new Error("Failed to get sale ID")
      }

      const savedSaleId = result.sale.id

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Registrar en caja (solo contado)
      if (paymentType === "cash") {
        addTransaction({
          type: "income",
          date: getCurrentLocalDate(),
          amount: cashReceived,
          paymentMethod: "cash",
          category: "Cobranzas",
          description: `Venta - ${customer}: ${selectedProducts[0]?.name}${
            selectedProducts.length > 1 ? ` y ${selectedProducts.length - 1} más` : ""
          }${tradeInDetails ? ` (con canje -$${tradeInValue})` : ""}`,
          relatedTo: "sale",
          relatedId: savedSaleId,
        })
      }

      // Registrar crédito
      if (paymentType === "credit") {
        const clientData = searchClients(customer).find((c) => c.name === customer)
        const clientId = clientData?.id || `temp_${Date.now()}`

        await addSaleToAccount(
          clientId,
          customer,
          savedSaleId,
          cashReceived,
          `Venta: ${orderDescription.split("\n")[0]}...`,
        )
      }

      // Marcar productos como vendidos
      markItemsAsSold(selectedProducts.map((item) => item.id))

      // Ingresar canje al inventario
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
          productType: "Celular",
        })
      }

      // --- Cerrar modal ---
      resetModal()
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error saving sale:", error)
      toast({
        title: "Error",
        description: "Error al guardar la venta. Por favor, intente nuevamente.",
        variant: "destructive",
      })
      return
    }
  }

  const handleGenerateInvoice = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "Error",
        description: "No hay productos seleccionados",
        variant: "destructive",
      })
      return
    }

    const saleId = `order_${Date.now()}`
    const currentDate = new Date().toLocaleDateString("es-AR")

    const invoiceData = {
      saleId,
      date: currentDate,
      client: customer || "Cliente",
      vendor: seller,
      paymentType: paymentType === "cash" ? "Contado" : "A Crédito",
      products: selectedProducts.map((product, index) => ({
        number: index + 1,
        description: product.name,
        quantity: 1,
        price: product.price,
        total: product.price,
      })),
      canjeProducts: tradeInDetails
        ? [
            {
              description: `${tradeInDetails.model} - ${tradeInDetails.gb}GB - ${tradeInDetails.color}`,
              quantity: 1,
              price: -tradeInDetails.takenValue,
              total: -tradeInDetails.takenValue,
            },
          ]
        : [],
      subtotal: selectedProducts.reduce((sum, item) => sum + item.price, 0),
      discount: 0,
      total: selectedProducts.reduce((sum, item) => sum + item.price, 0) - (tradeInDetails?.takenValue || 0),
    }

 const htmlContent = generateInvoiceHTML(invoiceData)

// Abrimos una ventana nueva REAL (no blob)
const printWindow = window.open("", "_blank")

if (!printWindow) {
  alert("No se pudo abrir la ventana de impresión")
  return
}

// Escribimos la factura directamente en la ventana
printWindow.document.open()
printWindow.document.write(htmlContent)
printWindow.document.close()

// Esperar a que cargue el contenido (incluye el logo)
printWindow.onload = () => {
  printWindow.focus()
  printWindow.print()
}
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
    setProductSearchTerm("")
    setSelectedCategoryFilter("all")
  }

  const totalCart = selectedProducts.reduce((sum, item) => sum + item.price, 0)
  const finalTotal = totalCart - (tradeInDetails?.takenValue || 0)

  const filteredClients = searchClients(clientSearchTerm)

  const filteredInventory = availableInventory.filter((product) => {
    const searchLower = productSearchTerm.toLowerCase()
    const matchesSearch =
      product.model.toLowerCase().includes(searchLower) ||
      product.storage.toLowerCase().includes(searchLower) ||
      product.color.toLowerCase().includes(searchLower) ||
      product.imei.toLowerCase().includes(searchLower)

    // Filter by category
    if (selectedCategoryFilter === "all") {
      return matchesSearch
    }

    return matchesSearch && product.productType === selectedCategoryFilter
  })

  const categoryCounts = availableInventory.reduce(
    (acc, product) => {
      const type = product.productType || "Celular"
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )

  const uniqueProductTypes = Array.from(new Set(availableInventory.map((p) => p.productType || "Celular"))).sort(
    (a, b) => {
      // Sort to put "Celular" first
      if (a === "Celular") return -1
      if (b === "Celular") return 1
      return a.localeCompare(b)
    },
  )

  const getCategoryStyle = (productType: string) => {
    if (productType === "Celular") {
      return {
        color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        icon: Smartphone,
      }
    }
    // Accessories get different colors
    return {
      color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      icon: Package,
    }
  }

  const isProductSelected = (productId: string) => {
    return selectedProducts.some((p) => p.id === productId)
  }

  const generateInvoiceHTML = (data: any) => {
    // Logo en base64 (iPro logo)
    const logoBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAJYAAACWCAYAAAA8AXHiAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAEsmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSfvu78nIGlkPSdXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQnPz4KPHg6eG1wbWV0YSB4bWxuczp4PSdhZG9iZTpuczptZXRhLyc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczpBdHRyaWI9J2h0dHA6Ly9ucy5hdHRyaWJ1dGlvbi5jb20vYWRzLzEuMC8nPgogIDxBdHRyaWI6QWRzPgogICA8cmRmOlNlcT4KICAgIDxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPgogICAgIDxBdHRyaWI6Q3JlYXRlZD4yMDI1LTA4LTE0PC9BdHRyaWI6Q3JlYXRlZD4KICAgICA8QXR0cmliOkV4dElkPmNkZDNkNjcyLTliMjItNDE2OS1hNzdiLTBhZjE0ZDI0OTZiYjwvQXR0cmliOkV4dElkPgogICAgIDxBdHRyaWI6RmJJZD41MjUyNjU5MTQxNzk1ODA8L0F0dHJpYjpGYklkPgogICAgIDxBdHRyaWI6VG91Y2hUeXBlPjI8L0F0dHJpYjpUb3VjaFR5cGU+CiAgICA8L3JkZjpsaT4KICAgPC9yZGY6U2VxPgogIDwvQXR0cmliOkFkcz4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6ZGM9J2h0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvJz4KICA8ZGM6dGl0bGU+CiAgIDxyZGY6QWx0PgogICAgPHJkZjpsaSB4bWw6bGFuZz0neC1kZWZhdWx0Jz5pcHJvdm0gbG9nbyAtIDE8L3JkZjpsaT4KICAgPC9yZGY6QWx0PgogIDwvZGM6dGl0bGU+CiA8L3JkZjpEZXNjcmlwdGlvbj4KCiA8cmRmOkRlc2NyaXB0aW9uIHJk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"
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Orden de venta - ${data.saleId}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              background: white;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 30px;
            }
            .header-left h1 {
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .header-left .order-id {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 20px;
            }
            .header-left .info {
              font-size: 14px;
              line-height: 1.8;
            }
            .header-right {
              text-align: right;
            }
            .logo {
              width: 150px;
              height: auto;
              margin-bottom: 15px;
            }
            .social-info {
              font-size: 12px;
              line-height: 1.8;
              display: flex;
              flex-direction: column;
              gap: 5px;
            }
            .social-item {
              display: flex;
              align-items: center;
              gap: 8px;
              justify-content: flex-end;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            thead {
              background-color: #90EE90;
            }
            th {
              padding: 12px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #ddd;
            }
            td {
              padding: 10px 12px;
              border: 1px solid #ddd;
            }
            tbody tr:hover {
              background-color: #f5f5f5;
            }
            .summary {
              margin-top: 30px;
              padding: 20px 0;
              border-top: 2px solid #333;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
              font-size: 14px;
            }
            .summary-row.total {
              background-color: #90EE90;
              padding: 10px;
              font-weight: bold;
              font-size: 16px;
              margin-top: 10px;
            }
            .footer {
              margin-top: 30px;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-left">
              <h1>Orden de venta</h1>
              <div class="order-id">${data.saleId}</div>
              <div class="info">
                <div><strong>Fecha:</strong> ${data.date}</div>
                <div><strong>Cliente:</strong> ${data.client}</div>
                <div><strong>Tel:</strong></div>
              </div>
            </div>
            <div class="header-right">
              <!-- Using base64 encoded logo to ensure it displays in about:blank window -->
              <img src="${logoBase64}" alt="iPro" class="logo" />
              <div class="social-info">
                <div class="social-item">
                  <span>📞</span>
                  <span>2657-543062</span>
                </div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>N°</th>
                <th>Descripción</th>
                <th>Cantidad</th>
                <th>Precio</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${data.products
                .map(
                  (product: any) => `
                <tr>
                  <td>${product.number}</td>
                  <td>${product.description}</td>
                  <td>${product.quantity}</td>
                  <td>$ ${product.price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>$ ${product.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `,
                )
                .join("")}
              ${data.canjeProducts
                .map(
                  (product: any) => `
                <tr>
                  <td>-</td>
                  <td>${product.description} (Canje)</td>
                  <td>${product.quantity}</td>
                  <td>$ ${product.price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>$ ${product.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="summary">
            <div class="summary-row">
              <span>Total cant. ${data.products.length + data.canjeProducts.length}</span>
              <span></span>
            </div>
            <div class="summary-row">
              <span>SubTotal</span>
              <span>$ ${data.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
              <span>Descuento</span>
              <span>${data.discount}%</span>
            </div>
            <div class="summary-row total">
              <span>Total a pagar</span>
              <span>$ ${data.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-row">
              <span>Abona ${data.paymentType}</span>
              <span>$ ${data.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            ${
              data.paymentType === "A Crédito"
                ? `
            <div class="summary-row">
              <span>Abona contra entrega</span>
              <span>$ ${data.total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            `
                : ""
            }
          </div>

          <div class="footer">
            <p><strong>iPro</strong> - Tel: 2657-543062</p>
          </div>
          
        </body>
      </html>
    `
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 font-extralight leading-3 text-sm mx-0 w-full md:h-min md:max-h-[90vh] h-screen md:rounded-lg rounded-none">
        <div className="flex flex-col h-full md:max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b bg-white flex-row shrink-0">
            <DialogTitle className="text-xl md:text-2xl font-semibold">Nueva venta</DialogTitle>
          </div>

          <div className="md:hidden flex border-b bg-gray-100 shrink-0">
            <button
              onClick={() => setMobileTab("products")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mobileTab === "products"
                  ? "bg-white text-gray-900 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Productos
            </button>
            <button
              onClick={() => setMobileTab("details")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mobileTab === "details"
                  ? "bg-white text-gray-900 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Detalles de Venta
            </button>
          </div>

          {/* Main Content */}
          <div className="flex flex-1 min-h-0 md:overflow-hidden md:flex-row flex-col overflow-hidden">
            {/* Left Column: Product List */}
            <div
              className={`md:w-[350px] w-full bg-gray-800 text-white flex flex-col md:max-h-full md:flex-1 flex-1 overflow-hidden ${mobileTab === "details" ? "hidden md:flex" : "flex"}`}
            >
              <div className="p-3 md:p-4 border-b border-gray-700 shrink-0">
                <Input
                  placeholder="Buscar producto..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 h-10"
                />
              </div>

              <div className="border-b border-gray-700 shrink-0 p-2">
                <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos ({availableInventory.length})</SelectItem>
                    {uniqueProductTypes.map((type) => {
                      const count = availableInventory.filter((p) => p.productType === type).length
                      const style = getCategoryStyle(type)
                      const Icon = style.icon
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {type} ({count})
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div
                className="flex-1 min-h-0 overflow-y-auto px-0 leading-4 my-0"
                style={{ maxHeight: "calc(100vh - 140px)" }}
              >
                {filteredInventory.length === 0 ? (
                  <div className="text-center py-12 md:py-20 text-gray-400 px-4">
                    <p className="text-base md:text-lg">
                      {productSearchTerm || selectedCategoryFilter !== "all"
                        ? "No se encontraron productos"
                        : "No hay productos disponibles."}
                    </p>
                    <p className="text-sm mt-2">
                      {productSearchTerm || selectedCategoryFilter !== "all"
                        ? "Intenta con otra búsqueda o filtro"
                        : 'Ve a "Inventario" para agregar productos.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1 pb-4">
                    {filteredInventory.map((product) => {
                      const selected = isProductSelected(product.id)
                      const details: string[] = []
                      const productType = product.productType || "Celular"
                      const style = getCategoryStyle(productType)
                      const Icon = style.icon

                      // Add productType if it's not "Celular" (to differentiate accessories)
                      if (
                        product.productType &&
                        product.productType !== "Celular" &&
                        product.productType !== "N/A" &&
                        product.productType !== "--"
                      ) {
                        details.push(product.productType)
                      }

                      // Add storage if available and not N/A
                      if (product.storage && product.storage !== "N/A" && product.storage !== "--") {
                        details.push(product.storage)
                      }

                      // Add color if available and not N/A
                      if (product.color && product.color !== "N/A" && product.color !== "--") {
                        details.push(product.color)
                      }

                      // Add battery if available and not N/A
                      if (product.battery && String(product.battery) !== "N/A" && String(product.battery) !== "--") {
                        details.push(`${product.battery}%`)
                      }

                      const detailsText = details.length > 0 ? details.join(" • ") : null

                      return (
                        <div
                          key={product.id}
                          onClick={() =>
                            toggleProductSelection({
                              id: product.id,
                              name: `${product.model} ${product.storage}`,
                              price: product.salePrice,
                              cost: product.costPrice,
                              imei: product.imei,
                            })
                          }
                          className={`flex justify-between items-center p-3 md:p-3 cursor-pointer transition-colors border-b border-gray-700 ${
                            selected ? "bg-green-700 hover:bg-green-600" : "hover:bg-gray-700"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-medium truncate flex items-center gap-2">
                              {selected && <Check className="h-4 w-4 text-green-300" />}
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${style.color}`}
                              >
                                <Icon className="h-3 w-3" />
                                {productType}
                              </span>
                              {product.model}
                            </div>
                            {detailsText && <div className="text-xs text-gray-400 mt-1">{detailsText}</div>}
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
            <div
              className={`flex-1 bg-white p-3 md:p-6 flex flex-col overflow-y-auto ${mobileTab === "products" ? "hidden md:flex" : "flex"}`}
            >
              {/* Seller and Customer */}
              <div className="space-y-4 md:space-y-6 mb-4 md:mb-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center">
                    <span className="mr-2">👤</span> Vendedor
                  </Label>
                  <Select onValueChange={setSeller} value={seller}>
                    <SelectTrigger className="h-10 md:h-10 w-full leading-5">
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

                  {/* Client Search */}
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
              <div className="flex-1 mb-4 md:mb-6">
                <h4 className="font-semibold mb-3 text-base md:text-lg flex items-center">
                  <span className="mr-2">🛒</span> Productos Seleccionados ({selectedProducts.length})
                </h4>
                <div className="border rounded-lg text-left md:h-[200px] h-[180px] overflow-hidden">
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10">
                        <TableRow className="bg-gray-900 hover:bg-gray-900">
                          <TableHead className="text-white font-semibold h-10 w-[40%] text-xs md:text-sm">
                            Producto
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center h-10 w-[15%] text-xs md:text-sm">
                            Precio
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center h-10 w-[15%] text-xs md:text-sm">
                            Costo
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center h-10 w-[20%] text-xs md:text-sm">
                            Ganancia
                          </TableHead>
                          <TableHead className="text-white font-semibold text-center h-10 w-[10%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProducts.length > 0 ? (
                          selectedProducts.map((item) => (
                            <TableRow key={item.id} className="h-12">
                              <TableCell className="font-medium py-2 w-[40%] text-xs md:text-sm">{item.name}</TableCell>
                              <TableCell className="text-center py-2 w-[15%] text-xs md:text-sm">
                                ${item.price}
                              </TableCell>
                              <TableCell className="text-center py-2 text-red-600 w-[15%] text-xs md:text-sm">
                                ${item.cost}
                              </TableCell>
                              <TableCell className="text-center font-medium py-2 text-green-600 w-[20%] text-xs md:text-sm">
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
                            <TableCell colSpan={5} className="text-center text-gray-500 py-12 md:py-16">
                              No hay productos seleccionados
                              <br />
                              <span className="text-xs">
                                Haz clic en los productos {window.innerWidth < 768 ? "arriba" : "de la izquierda"} para
                                seleccionarlos
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
                  className="w-full h-10 bg-transparent text-sm"
                  onClick={() => setShowTradeIn(!showTradeIn)}
                >
                  🔄 Plan Canje
                </Button>

                {tradeInDetails && (
                  <div className="mt-3 p-3 border rounded-md bg-blue-50 text-xs md:text-sm">
                    <p>
                      <strong>Canje:</strong> {tradeInDetails.model} {tradeInDetails.gb}GB - Tomado a $
                      {tradeInDetails.takenValue}
                    </p>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="mb-4 md:mb-6">
                <div className="flex items-center gap-3">
                  <div className="text-xl md:text-2xl font-bold">Total a recibir: ${finalTotal}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateInvoice}
                    disabled={selectedProducts.length === 0}
                    title="Generar factura"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
                {selectedProducts.length > 0 && (
                  <div className="text-xs md:text-sm text-gray-600 mt-1">
                    Precio venta: ${totalCart} {tradeInDetails && `- Canje (capital): $${tradeInDetails.takenValue}`}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 px-0 md:mx-4">
                <Button
                  className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm"
                  onClick={handleAddSale}
                  disabled={selectedProducts.length === 0}
                >
                  ✓ AGREGAR VENTA
                </Button>
                <Button
                  variant="secondary"
                  className="w-full h-10 bg-red-500 hover:bg-red-600 text-white text-sm"
                  onClick={() => {
                    resetModal()
                    onOpenChange(false)
                  }}
                >
                  ✕ CANCELAR VENTA
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Trade-In Form Modal */}
        {showTradeIn && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 md:p-8 z-50">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg md:text-xl font-semibold mb-4">Plan Canje</h3>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Modelo</Label>
                    <Input name="model" placeholder="iPhone 13" required className="h-10" />
                  </div>
                  <div>
                    <Label>GB</Label>
                    <Input name="gb" placeholder="128" required className="h-10" />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <Input name="color" placeholder="Negro" required className="h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Batería (%)</Label>
                    <Input name="battery" placeholder="85" type="number" required className="h-10" />
                  </div>
                  <div>
                    <Label>IMEI</Label>
                    <Input name="imei" placeholder="123456789012345" required className="h-10" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Valor tomado</Label>
                    <Input name="takenValue" placeholder="300" type="number" required className="h-10" />
                  </div>
                  <div>
                    <Label>Valor reventa</Label>
                    <Input name="resaleValue" placeholder="450" type="number" required className="h-10" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 bg-transparent h-10"
                    onClick={() => setShowTradeIn(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white h-10">
                    Agregar Canje
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DialogContent>

      <AddClientModal isOpen={showAddClientModal} onOpenChange={setShowAddClientModal} />
    </Dialog>
  )
}
