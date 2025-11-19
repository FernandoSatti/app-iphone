"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { PlusCircle, DollarSign, TrendingUp, TrendingDown, Trash2, Search, CalendarIcon } from 'lucide-react'
import { useCash, type CashTransaction } from "@/components/cash-context"
import type { DateRange } from "react-day-picker"
import { format } from "date-fns"

const paymentMethods = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "Tarjeta" },
  { value: "check", label: "Cheque" },
  { value: "other", label: "Otro" },
]

const categories = [
  "Ventas",
  "Compras",
  "Cobranzas",
  "Pagos",
  "Gastos Operativos",
  "Alquiler",
  "Servicios",
  "Impuestos",
  "Sueldos",
  "Marketing",
  "Mantenimiento",
  "Retiro",
  "Otros",
]

const CashView = () => {
  const { transactions, addTransaction, removeTransaction, getCashBalance } = useCash()
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [quickPeriod, setQuickPeriod] = useState<string>("all")

  const getCurrentLocalDate = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    type: "income" as "income" | "expense",
    amount: "",
    paymentMethod: "cash" as CashTransaction["paymentMethod"],
    category: "",
    description: "",
    date: getCurrentLocalDate(),
  })

  const getFilteredTransactions = () => {
    let filtered = transactions

    // Filtrar por período rápido
    if (quickPeriod === "current-month") {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      filtered = filtered.filter((transaction) => {
        const transactionDate = new Date(transaction.date)
        return transactionDate.getMonth() === currentMonth && transactionDate.getFullYear() === currentYear
      })
    } else if (quickPeriod === "last-month") {
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const year = lastMonth.getFullYear()
      const month = lastMonth.getMonth()
      filtered = filtered.filter((transaction) => {
        const transactionDate = new Date(transaction.date)
        return transactionDate.getMonth() === month && transactionDate.getFullYear() === year
      })
    } else if (quickPeriod === "current-year") {
      const currentYear = new Date().getFullYear()
      filtered = filtered.filter((transaction) => {
        const transactionDate = new Date(transaction.date)
        return transactionDate.getFullYear() === currentYear
      })
    } else if (quickPeriod === "custom" && (dateRange?.from || dateRange?.to)) {
      filtered = filtered.filter((transaction) => {
        const transactionDate = new Date(transaction.date)
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

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (transaction) =>
          transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          transaction.category.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filtrar por tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter((transaction) => transaction.type === typeFilter)
    }

    // Filtrar por categoría
    if (categoryFilter !== "all") {
      filtered = filtered.filter((transaction) => transaction.category === categoryFilter)
    }

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  const filteredTransactions = getFilteredTransactions()
  const cashBalance = getCashBalance()
  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.amount || !formData.category || !formData.description) {
      alert("Por favor, complete todos los campos obligatorios")
      return
    }

    let expenseType: "operational" | "withdrawal" | "stock_payment" | undefined = undefined

    if (formData.type === "expense") {
      if (formData.category === "Retiro") {
        expenseType = "withdrawal"
      } else if (
        ["Gastos Operativos", "Alquiler", "Servicios", "Impuestos", "Sueldos", "Marketing", "Mantenimiento"].includes(
          formData.category,
        )
      ) {
        expenseType = "operational"
      } else {
        expenseType = "operational" // Por defecto, otros egresos son operativos
      }
    }

    addTransaction({
      ...formData,
      amount: Number.parseFloat(formData.amount),
      expenseType, // Agregar el tipo de gasto
    })

    // Reset form
    setFormData({
      type: "income",
      amount: "",
      paymentMethod: "cash",
      category: "",
      description: "",
      date: getCurrentLocalDate(), // Usar fecha local en lugar de UTC
    })
    setShowAddForm(false)
  }

  const handleDeleteTransaction = (transactionId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta transacción?")) {
      removeTransaction(transactionId)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    // Parsear la fecha manualmente para evitar problemas de zona horaria
    const [year, month, day] = dateString.split("-")
    if (year && month && day) {
      return `${day}/${month}/${year}`
    }
    // Fallback para fechas en formato dd/MM/yyyy
    return dateString
  }

  const getPaymentMethodLabel = (method: string) => {
    return paymentMethods.find((pm) => pm.value === method)?.label || method
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Caja</h1>
          <p className="text-gray-600 mt-2">Control de ingresos y egresos de dinero</p>
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
        <div className="text-right">
          <p className={`text-2xl font-bold ${cashBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(cashBalance)}
          </p>
          <p className="text-sm text-gray-500">Saldo en caja</p>
        </div>
      </div>

      {/* Resumen general */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Ingresos
            </CardTitle>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(totalIncome)}</div>
          </CardHeader>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Total Egresos
            </CardTitle>
            <div className="text-2xl font-bold text-red-900">{formatCurrency(totalExpenses)}</div>
          </CardHeader>
        </Card>
        <Card className={`${cashBalance >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
          <CardHeader className="pb-2">
            <CardTitle
              className={`text-sm font-medium flex items-center gap-2 ${cashBalance >= 0 ? "text-blue-700" : "text-orange-700"}`}
            >
              <DollarSign className="h-4 w-4" />
              Saldo Actual
            </CardTitle>
            <div className={`text-2xl font-bold ${cashBalance >= 0 ? "text-blue-900" : "text-orange-900"}`}>
              {formatCurrency(cashBalance)}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Controles de búsqueda y filtros */}
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
            placeholder="Buscar por descripción o categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Ingresos</SelectItem>
              <SelectItem value="expense">Egresos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-green-600 hover:bg-green-700 text-slate-50">
            <PlusCircle className="h-4 w-4 mr-2" />
            Nuevo Movimiento
          </Button>
        </div>
      </div>

      {/* Formulario para agregar transacción */}
      {showAddForm && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-lg">Nuevo Movimiento de Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="type">Tipo *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "income" | "expense") => setFormData((prev) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Ingreso</SelectItem>
                      <SelectItem value="expense">Egreso</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Monto *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Medio de Pago *</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value: CashTransaction["paymentMethod"]) =>
                      setFormData((prev) => ({ ...prev, paymentMethod: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Fecha *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Categoría *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="description">Descripción *</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del movimiento..."
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-slate-50">
                  Agregar Movimiento
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de transacciones */}
      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Caja ({filteredTransactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || typeFilter !== "all" || categoryFilter !== "all" ? (
                <p>No se encontraron movimientos que coincidan con los filtros aplicados.</p>
              ) : (
                <>
                  <p>No hay movimientos de caja registrados.</p>
                  <p className="text-sm mt-2">Haz clic en "Nuevo Movimiento" para comenzar.</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-900">
                    <TableHead className="text-white font-semibold">Fecha</TableHead>
                    <TableHead className="text-white font-semibold">Tipo</TableHead>
                    <TableHead className="text-white font-semibold">Categoría</TableHead>
                    <TableHead className="text-white font-semibold">Descripción</TableHead>
                    <TableHead className="text-white font-semibold">Medio de Pago</TableHead>
                    <TableHead className="text-white font-semibold text-right">Monto</TableHead>
                    <TableHead className="text-white font-semibold w-[5%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            transaction.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }
                        >
                          {transaction.type === "income" ? "Ingreso" : "Egreso"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{transaction.category}</TableCell>
                      <TableCell className="text-sm">{transaction.description}</TableCell>
                      <TableCell className="text-sm">{getPaymentMethodLabel(transaction.paymentMethod)}</TableCell>
                      <TableCell
                        className={`text-right font-medium ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                      >
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CashView
