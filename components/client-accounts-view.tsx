"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Search, Users, DollarSign, ChevronDown, ChevronRight, Trash2, CalendarIcon, CheckCircle } from "lucide-react"
import { useAccounts } from "./account-context"
import { useCash } from "./cash-context"
import type { DateRange } from "react-day-picker"
import { format } from "date-fns"
import { parseLocalDate, formatDisplayDate } from "@/lib/date-helpers"

export default function ClientAccountsView() {
  const { getAllClientAccounts, addPaymentFromClient, removeTransaction } = useAccounts() // Use getAllClientAccounts instead of getClientsWithBalance
  const { addTransaction } = useCash()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())

  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending")

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [quickPeriod, setQuickPeriod] = useState<string>("all")

  const allClientAccounts = getAllClientAccounts() // Get all client accounts including those with zero balance

  const getFilteredClients = () => {
    let baseClients = allClientAccounts // Use all client accounts as base

    // Apply search filter
    baseClients = baseClients.filter((client) => client.clientName.toLowerCase().includes(searchTerm.toLowerCase()))

    if (quickPeriod === "all" && !dateRange?.from && !dateRange?.to) {
      if (activeTab === "pending") {
        return baseClients.filter((client) => client.balance > 0)
      } else {
        return baseClients.filter(
          (client) => client.transactions.some((t) => t.type === "payment") && client.transactions.length > 0,
        )
      }
    }

    return baseClients
      .map((client) => {
        let filteredTransactions = client.transactions

        // Apply date filtering
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

        // Calculate balance for filtered transactions
        const balance = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)

        return {
          ...client,
          transactions: filteredTransactions,
          balance,
        }
      })
      .filter((client) => {
        if (activeTab === "pending") {
          return client.balance > 0 && client.transactions.length > 0
        } else {
          return (
            client.transactions.length > 0 &&
            (client.balance <= 0 || client.transactions.some((t) => t.type === "payment"))
          )
        }
      })
  }

  const filteredClients = getFilteredClients()
  const totalOwed =
    activeTab === "pending" ? filteredClients.reduce((sum, client) => sum + Math.max(0, client.balance), 0) : 0
  const totalPaid =
    activeTab === "history"
      ? filteredClients.reduce((sum, client) => {
          return (
            sum +
            client.transactions
              .filter((t) => t.type === "payment")
              .reduce((paySum, t) => paySum + Math.abs(t.amount), 0)
          )
        }, 0)
      : 0

  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients)
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId)
    } else {
      newExpanded.add(clientId)
    }
    setExpandedClients(newExpanded)
  }

  const handleAddPayment = () => {
    if (!selectedClient || !paymentAmount || Number.parseFloat(paymentAmount) <= 0) return

    const amount = Number.parseFloat(paymentAmount)
    const clientName = allClientAccounts.find((c) => c.clientId === selectedClient)?.clientName || "Cliente"

    addPaymentFromClient(selectedClient, amount, `Cobro de cliente: ${clientName}`)

    addTransaction({
      type: "income",
      amount,
      category: "Cobranzas", // Categoría específica para cobranzas
      description: `Cobro de cliente: ${clientName}`,
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "cash", // Valor por defecto
    })

    setSelectedClient(null)
    setPaymentAmount("")
  }

  const handleDeleteTransaction = (clientId: string, transactionId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta transacción?")) {
      removeTransaction(clientId, transactionId)
    }
  }

  const handleDeleteClient = (clientId: string, clientName: string) => {
    console.log("[v0] Attempting to delete client:", clientId, clientName)

    if (confirm(`¿Estás seguro de que quieres eliminar todo el historial de ${clientName}?`)) {
      const client = allClientAccounts.find((c) => c.clientId === clientId)
      console.log("[v0] Found client:", client)

      if (client && client.transactions.length > 0) {
        console.log("[v0] Removing", client.transactions.length, "transactions")

        // Remove all transactions for this client
        client.transactions.forEach((transaction) => {
          console.log("[v0] Removing transaction:", transaction.id)
          removeTransaction(clientId, transaction.id)
        })

        console.log("[v0] Client deletion completed")
      } else {
        console.log("[v0] No client found or no transactions to remove")
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Saldo de Clientes</h2>
          <p className="text-gray-600">
            {activeTab === "pending"
              ? "Monitorea las cuentas por cobrar de tus clientes"
              : "Historial de pagos realizados por clientes"}
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
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "pending" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
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

      <Card className={activeTab === "pending" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className={`text-sm font-medium ${activeTab === "pending" ? "text-red-800" : "text-green-800"}`}>
            {activeTab === "pending" ? "Total por Cobrar" : "Total Cobrado"}
          </CardTitle>
          {activeTab === "pending" ? (
            <Users className="h-4 w-4 text-red-600" />
          ) : (
            <CheckCircle className="h-4 w-4 text-green-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${activeTab === "pending" ? "text-red-700" : "text-green-700"}`}>
            ${activeTab === "pending" ? totalOwed.toFixed(2) : totalPaid.toFixed(2)}
          </div>
          <p className={`text-xs ${activeTab === "pending" ? "text-red-600" : "text-green-600"}`}>
            {filteredClients.length} cliente{filteredClients.length !== 1 ? "s" : ""}
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
                        {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yy")
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
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white border-gray-300 text-gray-900"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="space-y-4">
        {filteredClients.map((client) => (
          <Card key={client.clientId} className="bg-white border-gray-200">
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleClientExpansion(client.clientId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {expandedClients.has(client.clientId) ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <CardTitle className="text-gray-900">{client.clientName}</CardTitle>
                </div>
                <div className="flex items-center gap-3">
                  {activeTab === "pending" && (
                    <span className="text-lg font-bold text-red-600">${client.balance.toFixed(2)}</span>
                  )}
                  {activeTab === "pending" ? (
                    <Badge variant={client.balance > 0 ? "destructive" : "secondary"}>Pendiente</Badge>
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
                        e.stopPropagation() // Prevent card expansion
                        handleDeleteClient(client.clientId, client.clientName)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            {expandedClients.has(client.clientId) && (
              <CardContent>
                <div className="space-y-4">
                  {activeTab === "pending" && (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`payment-${client.clientId}`} className="text-gray-700">
                          Registrar Cobro
                        </Label>
                        <Input
                          id={`payment-${client.clientId}`}
                          type="number"
                          placeholder="Monto"
                          value={selectedClient === client.clientId ? paymentAmount : ""}
                          onChange={(e) => {
                            setSelectedClient(client.clientId)
                            setPaymentAmount(e.target.value)
                          }}
                          className="bg-white border-gray-300 text-gray-900"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={handleAddPayment}
                          disabled={
                            selectedClient !== client.clientId ||
                            !paymentAmount ||
                            Number.parseFloat(paymentAmount) <= 0
                          }
                          className="bg-green-600 hover:bg-green-700 text-slate-50"
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Cobrar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Transaction History */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Historial de Transacciones</h4>
                    {client.transactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center text-sm">
                        <div className="flex-1">
                          <span className="text-gray-600">
                            {formatDisplayDate(parseLocalDate(transaction.date))} - {transaction.description}
                          </span>
                          {transaction.dueDate && (
                            <span className="text-xs text-yellow-600 block">
                              Vence: {formatDisplayDate(parseLocalDate(transaction.dueDate))}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`${transaction.amount > 0 ? "text-red-600" : "text-green-600"}`}>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </span>
                          <Badge
                            variant={transaction.type === "payment" ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {transaction.type === "payment" ? "Pago" : "Venta"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteTransaction(client.clientId, transaction.id)}
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

      {filteredClients.length === 0 && (
        <Card className="bg-white border-gray-200">
          <CardContent className="text-center py-8">
            {activeTab === "pending" ? (
              <>
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay clientes con saldo pendiente</p>
              </>
            ) : (
              <>
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay historial de pagos de clientes</p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
