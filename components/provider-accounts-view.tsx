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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Textarea } from "@/components/ui/textarea"
import {
  Search,
  Building2,
  Plus,
  CreditCard,
  ChevronDown,
  ChevronRight,
  Trash2,
  CalendarIcon,
  CheckCircle,
} from "lucide-react"
import { useAccounts } from "./account-context"
import { useProviders } from "./provider-context"
import { useCash } from "./cash-context"
import type { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { parseLocalDate, formatDisplayDate } from "@/lib/date-helpers"

export default function ProviderAccountsView() {
  const {
    getProvidersWithBalance,
    getAllProviderAccounts,
    addPaymentToProvider,
    addDebtToProvider,
    removeTransaction,
  } = useAccounts()
  const { providers } = useProviders()
  const { addTransaction } = useCash()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false)
  const [debtForm, setDebtForm] = useState({
    providerId: "",
    amount: "",
    description: "",
    dueDate: "",
  })

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [quickPeriod, setQuickPeriod] = useState<string>("all")

  const allProviderAccounts = getAllProviderAccounts()

  const getFilteredProviders = () => {
    let baseProviders = allProviderAccounts

    baseProviders = baseProviders.filter((provider) =>
      provider.providerName.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    if (quickPeriod === "all" && !dateRange?.from && !dateRange?.to) {
      if (activeTab === "pending") {
        return baseProviders.filter((provider) => provider.balance > 0)
      } else {
        return baseProviders.filter(
          (provider) =>
            provider.transactions.some((t) => t.type === "payment_to_provider") && provider.transactions.length > 0,
        )
      }
    }

    return baseProviders
      .map((provider) => {
        let filteredTransactions = provider.transactions

        if (quickPeriod === "current-month") {
          const now = new Date()
          const currentYear = now.getFullYear()
          const currentMonth = now.getMonth()
          filteredTransactions = filteredTransactions.filter((transaction) => {
            const transactionDate = parseLocalDate(transaction.date)
            return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
          })
        } else if (quickPeriod === "last-month") {
          const now = new Date()
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          const year = lastMonth.getFullYear()
          const month = lastMonth.getMonth()
          filteredTransactions = filteredTransactions.filter((transaction) => {
            const transactionDate = parseLocalDate(transaction.date)
            return transactionDate.getMonth() === month && transactionDate.getFullYear() === year
          })
        } else if (quickPeriod === "current-year") {
          const currentYear = new Date().getFullYear()
          filteredTransactions = filteredTransactions.filter((transaction) => {
            const transactionDate = parseLocalDate(transaction.date)
            return transactionDate.getFullYear() === currentYear
          })
        } else if (quickPeriod === "custom" && (dateRange?.from || dateRange?.to)) {
          filteredTransactions = filteredTransactions.filter((transaction) => {
            const transactionDate = parseLocalDate(transaction.date)
            const fromDate = dateRange.from ? new Date(dateRange.from) : null
            const toDate = dateRange.to ? new Date(dateRange.to) : null

            if (fromDate && toDate) {
              return transactionDate >= fromDate && transactionDate <= toDate
            } else if (fromDate) {
              return transactionDate >= fromDate
            } else if (toDate) {
              return transactionDate <= toDate
            }
            return true
          })
        }

        const balance = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)

        return {
          ...provider,
          transactions: filteredTransactions,
          balance,
        }
      })
      .filter((provider) => {
        if (activeTab === "pending") {
          return provider.balance > 0 && provider.transactions.length > 0
        } else {
          return (
            provider.transactions.length > 0 &&
            (provider.balance <= 0 || provider.transactions.some((t) => t.type === "payment_to_provider"))
          )
        }
      })
  }

  const filteredProviders = getFilteredProviders()
  const totalOwed =
    activeTab === "pending" ? filteredProviders.reduce((sum, provider) => sum + Math.max(0, provider.balance), 0) : 0
  const totalPaid =
    activeTab === "history"
      ? filteredProviders.reduce((sum, provider) => {
          return (
            sum +
            provider.transactions
              .filter((t) => t.type === "payment_to_provider")
              .reduce((paySum, t) => paySum + Math.abs(t.amount), 0)
          )
        }, 0)
      : 0

  const toggleProviderExpansion = (providerId: string) => {
    const newExpanded = new Set(expandedProviders)
    if (newExpanded.has(providerId)) {
      newExpanded.delete(providerId)
    } else {
      newExpanded.add(providerId)
    }
    setExpandedProviders(newExpanded)
  }

  const handleAddPayment = () => {
    if (!selectedProvider || !paymentAmount || Number.parseFloat(paymentAmount) <= 0) return

    const amount = Number.parseFloat(paymentAmount)
    const providerName = allProviderAccounts.find((p) => p.providerId === selectedProvider)?.providerName || "Proveedor"

    addPaymentToProvider(selectedProvider, amount, `Pago a proveedor: ${providerName}`)

    addTransaction({
      type: "expense",
      amount,
      category: "Pagos",
      description: `Pago a proveedor: ${providerName}`,
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
      expenseType: "stock_payment",
    })

    setSelectedProvider(null)
    setPaymentAmount("")
  }

  const handleDateInput = (value: string) => {
    const cleaned = value.replace(/[^\d/]/g, "")

    let formatted = cleaned
    if (cleaned.length === 2 && !cleaned.includes("/")) {
      formatted = cleaned + "/"
    } else if (cleaned.length === 5 && cleaned.split("/").length === 2) {
      formatted = cleaned + "/"
    }

    if (formatted.length <= 10) {
      setDebtForm({ ...debtForm, dueDate: formatted })
    }
  }

  const convertToISODate = (ddmmyyyy: string): string => {
    if (!ddmmyyyy || ddmmyyyy.length !== 10) return ""
    const [day, month, year] = ddmmyyyy.split("/")
    if (!day || !month || !year) return ""
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  const handleAddDebt = () => {
    if (!debtForm.providerId || !debtForm.amount || !debtForm.description) return

    const amount = Number.parseFloat(debtForm.amount)
    const selectedProvider = providers.find((p) => p.id === debtForm.providerId)
    const providerName = selectedProvider?.name || "Proveedor Desconocido"

    const isoDate = debtForm.dueDate ? convertToISODate(debtForm.dueDate) : ""

    addDebtToProvider(debtForm.providerId, providerName, amount, debtForm.description, isoDate || undefined)

    setDebtForm({
      providerId: "",
      amount: "",
      description: "",
      dueDate: "",
    })
    setIsDebtModalOpen(false)
  }

  const handleDeleteTransaction = (providerId: string, transactionId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta transacción?")) {
      removeTransaction(providerId, transactionId)
    }
  }

  const handleDeleteProvider = (providerId: string, providerName: string) => {
    console.log("[v0] Attempting to delete provider:", providerId, providerName)

    if (confirm(`¿Estás seguro de que quieres eliminar todo el historial de ${providerName}?`)) {
      const provider = allProviderAccounts.find((p) => p.providerId === providerId)
      console.log("[v0] Found provider:", provider)

      if (provider && provider.transactions.length > 0) {
        console.log("[v0] Removing", provider.transactions.length, "transactions")

        provider.transactions.forEach((transaction) => {
          console.log("[v0] Removing transaction:", transaction.id)
          removeTransaction(providerId, transaction.id)
        })

        console.log("[v0] Provider deletion completed")
      } else {
        console.log("[v0] No provider found or no transactions to remove")
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Saldo de Proveedores</h2>
          <p className="text-gray-600">
            {activeTab === "pending"
              ? "Monitorea y gestiona las cuentas por pagar a proveedores"
              : "Historial de pagos realizados a proveedores"}
          </p>
          {quickPeriod === "current-month" && (
            <p className="text-sm text-blue-600 mt-1">
              Mostrando: Este mes ({new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })})
            </p>
          )}
          {quickPeriod === "last-month" && (
            <p className="text-sm text-blue-600 mt-1">
              Mostrando: Mes anterior (
              {new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleDateString("es-AR", {
                month: "long",
                year: "numeric",
              })}
              )
            </p>
          )}
          {quickPeriod === "current-year" && (
            <p className="text-sm text-blue-600 mt-1">Mostrando: Este año ({new Date().getFullYear()})</p>
          )}
          {quickPeriod === "custom" && dateRange?.from && (
            <p className="text-sm text-blue-600 mt-1">
              Mostrando: {format(dateRange.from, "dd/MM/yyyy")}
              {dateRange.to && ` - ${format(dateRange.to, "dd/MM/yyyy")}`}
            </p>
          )}
        </div>
        <Dialog open={isDebtModalOpen} onOpenChange={setIsDebtModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Deuda
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Agregar Deuda Manual</DialogTitle>
              <DialogDescription className="text-gray-600">
                Registra una deuda pendiente con un proveedor
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="provider" className="text-gray-700">
                  Proveedor
                </Label>
                <Select
                  value={debtForm.providerId}
                  onValueChange={(value) => setDebtForm({ ...debtForm, providerId: value })}
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
                <Label htmlFor="amount" className="text-gray-700">
                  Monto
                </Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={debtForm.amount}
                  onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-gray-700">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe el motivo de la deuda..."
                  value={debtForm.description}
                  onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
                  className="bg-white border-gray-300 text-gray-900"
                />
              </div>
              <div>
                <Label htmlFor="dueDate" className="text-gray-700">
                  Fecha de Vencimiento (Opcional)
                </Label>
                <Input
                  id="dueDate"
                  type="text"
                  placeholder="DD/MM/YYYY"
                  value={debtForm.dueDate}
                  onChange={(e) => handleDateInput(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">Formato: DD/MM/YYYY (ejemplo: 25/12/2025)</p>
              </div>
              <Button
                onClick={handleAddDebt}
                disabled={!debtForm.providerId || !debtForm.amount || !debtForm.description}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              >
                Registrar Deuda
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "pending" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Building2 className="h-4 w-4 inline mr-2" />
          Cuentas Pendientes
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "history" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <CheckCircle className="h-4 w-4 inline mr-2" />
          Historial de Pagos
        </button>
      </div>

      <Card className={activeTab === "pending" ? "bg-orange-50 border-orange-200" : "bg-green-50 border-green-200"}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle
            className={`text-sm font-medium ${activeTab === "pending" ? "text-orange-800" : "text-green-800"}`}
          >
            {activeTab === "pending" ? "Total por Pagar" : "Total Pagado"}
          </CardTitle>
          {activeTab === "pending" ? (
            <Building2 className="h-4 w-4 text-orange-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${activeTab === "pending" ? "text-orange-700" : "text-green-700"}`}>
            ${activeTab === "pending" ? totalOwed.toFixed(2) : totalPaid.toFixed(2)}
          </div>
          <p className={`text-xs ${activeTab === "pending" ? "text-orange-600" : "text-green-600"}`}>
            {filteredProviders.length} proveedor{filteredProviders.length !== 1 ? "es" : ""}
            {activeTab === "pending" ? " con saldo pendiente" : " con historial de pagos"}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2">
          <Select value={quickPeriod} onValueChange={setQuickPeriod}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo</SelectItem>
              <SelectItem value="current-month">Este mes</SelectItem>
              <SelectItem value="last-month">Mes anterior</SelectItem>
              <SelectItem value="current-year">Este año</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {quickPeriod === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal bg-transparent">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    <span>Seleccionar fechas</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar proveedores..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-300 text-gray-900"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredProviders.map((provider) => (
          <Card key={provider.providerId} className="bg-white border-gray-200">
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleProviderExpansion(provider.providerId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expandedProviders.has(provider.providerId) ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <CardTitle className="text-gray-900">{provider.providerName}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  {activeTab === "pending" && (
                    <span className="text-lg font-bold text-orange-600">${provider.balance.toFixed(2)}</span>
                  )}
                  {activeTab === "pending" ? (
                    <Badge variant={provider.balance > 0 ? "destructive" : "secondary"}>Pendiente</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Pagado
                    </Badge>
                  )}
                  {activeTab === "history" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-red-500 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProvider(provider.providerId, provider.providerName)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {expandedProviders.has(provider.providerId) && (
              <CardContent>
                <div className="space-y-4">
                  {activeTab === "pending" && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`payment-${provider.providerId}`} className="text-gray-700">
                          Registrar Pago
                        </Label>
                        <Input
                          id={`payment-${provider.providerId}`}
                          type="number"
                          placeholder="Monto"
                          value={selectedProvider === provider.providerId ? paymentAmount : ""}
                          onChange={(e) => {
                            setSelectedProvider(provider.providerId)
                            setPaymentAmount(e.target.value)
                          }}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={handleAddPayment}
                          disabled={
                            selectedProvider !== provider.providerId ||
                            !paymentAmount ||
                            Number.parseFloat(paymentAmount) <= 0
                          }
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Historial de Transacciones</h4>
                    {provider.transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center text-sm">
                        <div className="flex-1">
                          <span className="text-gray-600">
                            {formatDisplayDate(parseLocalDate(transaction.date))} - {transaction.description}
                          </span>
                          {transaction.dueDate && (
                            <span className="text-xs text-orange-600 block">
                              Vence: {formatDisplayDate(parseLocalDate(transaction.dueDate))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`${transaction.amount > 0 ? "text-orange-600" : "text-green-600"}`}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                          <Badge
                            variant={transaction.type === "payment_to_provider" ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {transaction.type === "payment_to_provider"
                              ? "Pago"
                              : transaction.type === "manual_debt"
                                ? "Deuda"
                                : "Compra"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteTransaction(provider.providerId, transaction.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filteredProviders.length === 0 && (
        <Card className="bg-white border-gray-200">
          <CardContent className="text-center py-8">
            {activeTab === "pending" ? (
              <>
                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay proveedores con saldo pendiente</p>
              </>
            ) : (
              <>
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay historial de pagos a proveedores</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
