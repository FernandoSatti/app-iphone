"use client"

import { useState, useCallback, useEffect } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronRight,
  CircleUser,
  Home,
  LogOut,
  Package,
  PlusCircle,
  Trash2,
  Users,
  Wallet,
  CalendarIcon,
  BookOpen,
  DollarSign,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import type { DateRange } from "react-day-picker"
import { NewSaleModal } from "@/components/new-sale-modal"
import { DolarBlueCard } from "@/components/dolar-blue-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InventoryModal } from "@/components/inventory-modal"
import { ClientsModal } from "@/components/clients-modal"
import { ProvidersModal } from "@/components/providers-modal"
import CatalogView from "@/components/catalog-view"
import AccountsView from "@/components/accounts-view"
import ClientsView from "@/components/clients-view"
import ProvidersView from "@/components/providers-view"
import { useAccounts } from "@/components/account-context"
import CashView from "@/components/cash-view"
import { useCash } from "@/components/cash-context"
import ClientAccountsView from "@/components/client-accounts-view"
import ProviderAccountsView from "@/components/provider-accounts-view"
import PendingOrdersView from "@/components/pending-orders-view"
import { useAuth } from "@/components/auth-context"
import { LoginScreen } from "@/components/login-screen"
import ProfileView from "@/components/profile-view"
import { createBrowserClient } from "@/lib/supabase/client"

export type Sale = {
  id: string
  status: "Acreditado" | "Pendiente" | "Entregado"
  date: string
  time: string
  client: string
  salesperson: string
  tradeIn?: string
  order: string
  grossProfit: number
  total: number
  discount: number
  totalCost: number
}

const initialSalesData: Sale[] = []

const statuses: Sale["status"][] = ["Acreditado", "Pendiente", "Entregado"]

const getStartOfYear = () => {
  const now = new Date()
  return new Date(now.getFullYear(), 0, 1)
}

const monthOptions = [
  { value: "all", label: "Todo el año" },
  { value: "0", label: "Enero" },
  { value: "1", label: "Febrero" },
  { value: "2", label: "Marzo" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Mayo" },
  { value: "5", label: "Junio" },
  { value: "6", label: "Julio" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Septiembre" },
  { value: "9", label: "Octubre" },
  { value: "10", label: "Noviembre" },
  { value: "11", label: "Diciembre" },
]

const getYearOptions = () => {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push({ value: i.toString(), label: i.toString() })
  }
  return years
}

const quickPeriodOptions = [
  { value: "current-month", label: "Este mes" },
  { value: "last-month", label: "Mes anterior" },
  { value: "current-year", label: "Este año" },
  { value: "last-year", label: "Año anterior" },
  { value: "custom", label: "Personalizado" },
]

const getCurrentLocalDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export default function DashboardPage() {
  const [sales, setSales] = useState<Sale[]>(initialSalesData)
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false)
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false)
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false)
  const [isProvidersModalOpen, setIsProvidersModalOpen] = useState(false)
  const [isInventoryExpanded, setIsInventoryExpanded] = useState(false)
  const [isClientsExpanded, setIsClientsExpanded] = useState(false)
  const [isProvidersExpanded, setIsProvidersExpanded] = useState(false)
  const [currentView, setCurrentView] = useState<
    | "dashboard"
    | "catalog"
    | "accounts"
    | "clients"
    | "providers"
    | "cash"
    | "client-accounts"
    | "provider-accounts"
    | "pending-orders"
    | "profile"
  >("dashboard")

  const [date, setDate] = useState<DateRange | undefined>({
    from: getStartOfYear(),
    to: new Date(),
  })

  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [quickPeriod, setQuickPeriod] = useState<string>("current-year")
  const [isLoading, setIsLoading] = useState(true)

  const { getAccountsWithBalance, registerSaleStatusCallback } = useAccounts()
  const { getCashBalance, transactions } = useCash()
  const { isAuthenticated, logout } = useAuth()

  const supabase = createBrowserClient()

  useEffect(() => {
    loadSales()
  }, [])

  const loadSales = async () => {
    setIsLoading(true)
    try {
      const { data: salesData, error } = await supabase
        .from("sales")
        .select("*")
        .order("date", { ascending: false })
        .order("time", { ascending: false })

      if (error) throw error

      if (salesData) {
        const formattedSales: Sale[] = salesData.map((sale) => ({
          id: sale.id,
          status: sale.status as Sale["status"],
          date: sale.date,
          time: sale.time,
          client: sale.client,
          salesperson: sale.salesperson,
          tradeIn: sale.trade_in || undefined,
          order: sale.order,
          grossProfit: sale.gross_profit,
          total: sale.total,
          discount: sale.discount,
          totalCost: sale.total_cost,
        }))
        setSales(formattedSales)
      }
    } catch (error) {
      console.error("[v0] Error loading sales:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaleStatusUpdate = useCallback(
    async (saleId: string, newStatus: "Acreditado" | "Pendiente" | "Entregado") => {
      console.log("[v0] Updating sale status:", saleId, "to", newStatus)

      try {
        const { error } = await supabase.from("sales").update({ status: newStatus }).eq("id", saleId)

        if (error) throw error

        setSales((currentSales) =>
          currentSales.map((sale) => (sale.id === saleId ? { ...sale, status: newStatus } : sale)),
        )
      } catch (error) {
        console.error("[v0] Error updating sale status:", error)
      }
    },
    [supabase],
  )

  useEffect(() => {
    console.log("[v0] Registering sale status callback")
    registerSaleStatusCallback((saleId: string, newStatus: "Acreditado" | "Pendiente") => {
      handleSaleStatusUpdate(saleId, newStatus)
    })
  }, [registerSaleStatusCallback, handleSaleStatusUpdate])

  const getFilteredSales = () => {
    let filtered = sales

    if (quickPeriod === "current-month") {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      filtered = filtered.filter((sale) => {
        const saleDate = sale.date.includes("/")
          ? new Date(sale.date.split("/").reverse().join("-"))
          : new Date(sale.date)
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear
      })
    } else if (quickPeriod === "last-month") {
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const year = lastMonth.getFullYear()
      const month = lastMonth.getMonth()
      filtered = filtered.filter((sale) => {
        const saleDate = sale.date.includes("/")
          ? new Date(sale.date.split("/").reverse().join("-"))
          : new Date(sale.date)
        return saleDate.getMonth() === month && saleDate.getFullYear() === year
      })
    } else if (quickPeriod === "current-year") {
      const currentYear = new Date().getFullYear()
      filtered = filtered.filter((sale) => {
        const saleDate = sale.date.includes("/")
          ? new Date(sale.date.split("/").reverse().join("-"))
          : new Date(sale.date)
        return saleDate.getFullYear() === currentYear
      })
    } else if (quickPeriod === "last-year") {
      const lastYear = new Date().getFullYear() - 1
      filtered = filtered.filter((sale) => {
        const saleDate = sale.date.includes("/")
          ? new Date(sale.date.split("/").reverse().join("-"))
          : new Date(sale.date)
        return saleDate.getFullYear() === lastYear
      })
    } else if (selectedMonth !== "all") {
      const monthIndex = Number.parseInt(selectedMonth)
      const year = Number.parseInt(selectedYear)
      filtered = filtered.filter((sale) => {
        const saleDate = sale.date.includes("/")
          ? new Date(sale.date.split("/").reverse().join("-"))
          : new Date(sale.date)
        return saleDate.getMonth() === monthIndex && saleDate.getFullYear() === year
      })
    } else if (date?.from || date?.to) {
      filtered = filtered.filter((sale) => {
        const saleDate = sale.date.includes("/")
          ? new Date(sale.date.split("/").reverse().join("-"))
          : new Date(sale.date)
        const fromDate = date.from ? new Date(date.from) : null
        const toDate = date.to ? new Date(date.to) : null

        if (fromDate && toDate) {
          return saleDate >= fromDate && saleDate <= toDate
        } else if (fromDate) {
          return saleDate >= fromDate
        } else if (toDate) {
          return saleDate <= toDate
        }
        return true
      })
    }

    return filtered
  }

  const filteredSales = getFilteredSales()

  const handleDeleteSale = async (saleId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta venta?")) {
      try {
        const { error } = await supabase.from("sales").delete().eq("id", saleId)

        if (error) throw error

        setSales((currentSales) => currentSales.filter((sale) => sale.id !== saleId))
      } catch (error) {
        console.error("[v0] Error deleting sale:", error)
      }
    }
  }

  const handleAddNewSale = async (newSaleData: Omit<Sale, "id" | "date" | "time">) => {
    const now = new Date()
    const newSale: Sale = {
      ...newSaleData,
      id: `sale_${Date.now()}`,
      date: getCurrentLocalDate(),
      time: format(now, "HH:mm"),
    }

    try {
      const { error } = await supabase.from("sales").insert({
        id: newSale.id,
        status: newSale.status,
        date: newSale.date,
        time: newSale.time,
        client: newSale.client,
        salesperson: newSale.salesperson,
        trade_in: newSale.tradeIn,
        order: newSale.order,
        gross_profit: newSale.grossProfit,
        total: newSale.total,
        discount: newSale.discount,
        total_cost: newSale.totalCost,
      })

      if (error) throw error

      setSales([newSale, ...sales])
      setIsNewSaleModalOpen(false)
    } catch (error) {
      console.error("[v0] Error saving sale:", error)
    }
  }

  const getStatusBadge = (status: Sale["status"], saleId: string) => {
    return (
      <Select value={status} onValueChange={(newStatus: Sale["status"]) => handleSaleStatusUpdate(saleId, newStatus)}>
        <SelectTrigger className="w-[120px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Acreditado">
            <Badge className="bg-green-100 text-green-800">Acreditado</Badge>
          </SelectItem>
          <SelectItem value="Pendiente">
            <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
          </SelectItem>
          <SelectItem value="Entregado">
            <Badge className="bg-blue-100 text-blue-800">Entregado</Badge>
          </SelectItem>
        </SelectContent>
      </Select>
    )
  }

  const getDateRangeForView = (): DateRange | undefined => {
    if (quickPeriod === "current-month") {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: startOfMonth, to: endOfMonth }
    } else if (quickPeriod === "last-month") {
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: lastMonth, to: endOfLastMonth }
    } else if (quickPeriod === "current-year") {
      const now = new Date()
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      const endOfYear = new Date(now.getFullYear(), 11, 31)
      return { from: startOfYear, to: endOfYear }
    } else if (quickPeriod === "last-year") {
      const lastYear = new Date().getFullYear() - 1
      const startOfLastYear = new Date(lastYear, 0, 1)
      const endOfLastYear = new Date(lastYear, 11, 31)
      return { from: startOfLastYear, to: endOfLastYear }
    } else if (selectedMonth !== "all") {
      const year = Number.parseInt(selectedYear)
      const monthIndex = Number.parseInt(selectedMonth)
      const startOfMonth = new Date(year, monthIndex, 1)
      const endOfMonth = new Date(year, monthIndex + 1, 0)
      return { from: startOfMonth, to: endOfMonth }
    }
    return date
  }

  const totalGrossProfit = filteredSales.reduce((sum, sale) => sum + sale.grossProfit, 0)
  const dateRange = getDateRangeForView()

  const filteredTransactions = transactions.filter((transaction) => {
    if (!dateRange?.from && !dateRange?.to) return true

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

  const businessExpenses = filteredTransactions
    .filter((transaction) => transaction.type === "expense" && transaction.expenseType === "operational")
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  const netProfit = totalGrossProfit - businessExpenses

  const totalRevenue = filteredSales
    .filter((sale) => sale.status === "Acreditado")
    .reduce((sum, sale) => sum + sale.total, 0)

  const totalCosts = filteredSales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0)

  const accountsWithBalance = getAccountsWithBalance()
  const totalPendingBalance = accountsWithBalance.reduce((sum, acc) => sum + acc.balance, 0)

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <NewSaleModal isOpen={isNewSaleModalOpen} onOpenChange={setIsNewSaleModalOpen} onSaleAdd={handleAddNewSale} />
      <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
        <div className="hidden border-r bg-gray-800 text-white lg:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-[60px] items-center border-b border-gray-700 px-6">
              <Link href="#" className="flex items-center gap-2 font-semibold text-lg">
                <Wallet className="h-6 w-6" />
                <span>Ipro</span>
              </Link>
            </div>
            <div className="flex-1 overflow-auto py-2">
              <nav className="grid items-start px-4 text-sm font-medium">
                <button
                  onClick={() => setCurrentView("dashboard")}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                    currentView === "dashboard" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Home className="h-4 w-4" />
                  Vista general
                </button>

                <button
                  onClick={() => setCurrentView("cash")}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                    currentView === "cash" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Wallet className="h-4 w-4" />
                  Caja
                </button>

                <div>
                  <button
                    onClick={() => setIsInventoryExpanded(!isInventoryExpanded)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left"
                  >
                    <Package className="h-4 w-4" />
                    Inventario
                    {isInventoryExpanded ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </button>

                  {isInventoryExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      <button
                        onClick={() => setIsInventoryModalOpen(true)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left text-sm"
                      >
                        <PlusCircle className="h-3 w-3" />
                        Nuevo Producto
                      </button>
                      <button
                        onClick={() => setCurrentView("catalog")}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                          currentView === "catalog" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <BookOpen className="h-3 w-3" />
                        Stock
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => setIsClientsExpanded(!isClientsExpanded)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left"
                  >
                    <Users className="h-4 w-4" />
                    Clientes
                    {isClientsExpanded ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </button>

                  {isClientsExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      <button
                        onClick={() => setIsClientsModalOpen(true)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left text-sm"
                      >
                        <PlusCircle className="h-3 w-3" />
                        Nuevo Cliente
                      </button>
                      <button
                        onClick={() => setCurrentView("clients")}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                          currentView === "clients" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Users className="h-3 w-3" />
                        Clientes
                      </button>
                      <button
                        onClick={() => setCurrentView("client-accounts")}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                          currentView === "client-accounts"
                            ? "bg-gray-700 text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <DollarSign className="h-3 w-3" />
                        Saldo de clientes
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <button
                    onClick={() => setIsProvidersExpanded(!isProvidersExpanded)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left"
                  >
                    <Building2 className="h-4 w-4" />
                    Proveedores
                    {isProvidersExpanded ? (
                      <ChevronDown className="ml-auto h-4 w-4" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </button>

                  {isProvidersExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      <button
                        onClick={() => setIsProvidersModalOpen(true)}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left text-sm"
                      >
                        <PlusCircle className="h-3 w-3" />
                        Nuevo Proveedor
                      </button>
                      <button
                        onClick={() => setCurrentView("providers")}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                          currentView === "providers" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Building2 className="h-3 w-3" />
                        Proveedores
                      </button>
                      <button
                        onClick={() => setCurrentView("pending-orders")}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                          currentView === "pending-orders" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Package className="h-3 w-3" />
                        Pedidos Pendientes
                      </button>
                      <button
                        onClick={() => setCurrentView("provider-accounts")}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                          currentView === "provider-accounts"
                            ? "bg-gray-700 text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <DollarSign className="h-3 w-3" />
                        Saldo de proveedores
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setCurrentView("profile")}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                    currentView === "profile" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  <CircleUser className="h-4 w-4" />
                  Mi perfil
                </button>
              </nav>
            </div>
            <div className="mt-auto p-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-gray-400 hover:bg-gray-700 hover:text-white"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col bg-gray-50/50">
          <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b bg-white px-6">
            <div className="flex-1">
              {currentView === "dashboard" && (
                <div className="flex items-center gap-4">
                  {quickPeriod === "current-month" && (
                    <p className="text-sm text-blue-600">
                      Mostrando datos de este mes (
                      {new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })})
                    </p>
                  )}
                  {quickPeriod === "last-month" && (
                    <p className="text-sm text-blue-600">
                      Mostrando datos del mes anterior (
                      {new Date(new Date().getFullYear(), new Date().getMonth() - 1).toLocaleDateString("es-AR", {
                        month: "long",
                        year: "numeric",
                      })}
                      )
                    </p>
                  )}
                  {quickPeriod === "current-year" && (
                    <p className="text-sm text-blue-600">Mostrando datos de este año ({new Date().getFullYear()})</p>
                  )}
                  {quickPeriod === "last-year" && (
                    <p className="text-sm text-blue-600">
                      Mostrando datos del año anterior ({new Date().getFullYear() - 1})
                    </p>
                  )}
                  {quickPeriod === "custom" && selectedMonth !== "all" && (
                    <p className="text-sm text-blue-600">
                      Mostrando datos de {monthOptions.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                    </p>
                  )}
                  {quickPeriod === "custom" && selectedMonth === "all" && date?.from && (
                    <p className="text-sm text-blue-600">
                      Mostrando datos del {format(date.from, "dd/MM/yyyy")}
                      {date.to && ` al ${format(date.to, "dd/MM/yyyy")}`}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={quickPeriod}
                onValueChange={(value) => {
                  setQuickPeriod(value)
                  if (value !== "custom") {
                    setSelectedMonth("all")
                  }
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quickPeriodOptions.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {quickPeriod === "custom" && (
                <>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getYearOptions().map((year) => (
                        <SelectItem key={year.value} value={year.value}>
                          {year.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button id="date" variant={"outline"} className="w-[260px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedMonth === "all" && date?.from ? (
                          date.to ? (
                            <>
                              {format(date.from, "dd/MM/yy")} - {format(date.to, "dd/MM/yy")}
                            </>
                          ) : (
                            format(date.from, "dd/MM/yy")
                          )
                        ) : (
                          <span>Rango personalizado</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(newDate) => {
                          setDate(newDate)
                          setSelectedMonth("all")
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">
            {currentView === "dashboard" && (
              <div className="grid gap-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <DolarBlueCard />
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
                  <Card className="bg-green-50 border-green-200 col-span-1">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-green-700">Ingresos</CardDescription>
                      <CardTitle className="text-4xl font-bold text-green-900">
                        US${totalRevenue.toLocaleString()}
                      </CardTitle>
                      <CardDescription className="text-xs text-green-600">Solo ventas acreditadas</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="bg-red-50 border-red-200 col-span-1">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-red-700">Costos</CardDescription>
                      <CardTitle className="text-4xl font-bold text-red-900">${totalCosts.toLocaleString()}</CardTitle>
                      <CardDescription className="text-xs text-red-600">Costo del stock vendido</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card className="bg-sky-50 border-sky-200 col-span-1">
                    <CardHeader className="pb-2">
                      <CardDescription className="text-sky-700">Unidades vendidas</CardDescription>
                      <CardTitle className="text-4xl font-bold text-sky-900">{filteredSales.length}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card className="bg-fuchsia-50 border-fuchsia-200 col-span-1">
                    <CardHeader>
                      <CardTitle>Ganancia neta</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-4xl font-bold ${getCashBalance() >= 0 ? "text-indigo-900" : "text-red-900"}`}
                        >
                          ${getCashBalance().toLocaleString()}
                        </span>
                        <span className="text-xs text-indigo-600">Efectivo disponible</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-rose-50 border-rose-200 col-span-1">
                    <CardHeader>
                      <CardTitle>Ganancia bruta</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-4xl font-bold text-rose-900">${netProfit.toLocaleString()}</span>
                        <span className="text-xs text-rose-600">Ganancia bruta - Gastos operativos</span>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-indigo-50 border-indigo-200 col-span-1">
                    <CardHeader>
                      <CardTitle>Saldo en Caja</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-4xl font-bold ${getCashBalance() >= 0 ? "text-indigo-900" : "text-red-900"}`}
                        >
                          ${getCashBalance().toLocaleString()}
                        </span>
                        <span className="text-xs text-indigo-600">Efectivo disponible</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex items-center gap-4">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setIsNewSaleModalOpen(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva venta
                  </Button>
                  <Button variant="outline" className="bg-white" onClick={() => setCurrentView("catalog")}>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Ver stock
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Ventas en el período ({filteredSales.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {filteredSales.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        {sales.length === 0 ? (
                          <>
                            <p>No hay ventas registradas aún.</p>
                            <p className="text-sm">Haz clic en "Nueva venta" para comenzar.</p>
                          </>
                        ) : (
                          <>
                            <p>No hay ventas en el período seleccionado.</p>
                            <p className="text-sm">Ajusta el rango de fechas para ver más resultados.</p>
                          </>
                        )}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Vendedor</TableHead>
                            <TableHead>Canje</TableHead>
                            <TableHead>Pedido</TableHead>
                            <TableHead className="text-right">Ganancia bruta</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Descuento</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSales.map((sale) => (
                            <TableRow key={sale.id}>
                              <TableCell>{getStatusBadge(sale.status, sale.id)}</TableCell>
                              <TableCell>
                                {sale.date.includes("/") ? sale.date : format(new Date(sale.date), "dd/MM/yyyy")}
                                <br />
                                <span className="text-xs text-gray-500">{sale.time}</span>
                              </TableCell>
                              <TableCell className="font-medium">{sale.client}</TableCell>
                              <TableCell>{sale.salesperson}</TableCell>
                              <TableCell className="text-xs whitespace-pre-wrap">{sale.tradeIn || "--"}</TableCell>
                              <TableCell className="text-xs">{sale.order}</TableCell>
                              <TableCell className="text-right font-medium">${sale.grossProfit}</TableCell>
                              <TableCell className="text-right font-medium">${sale.total}</TableCell>
                              <TableCell className="text-right text-red-600">${sale.discount}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8"
                                  onClick={() => handleDeleteSale(sale.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
            {currentView === "accounts" && <AccountsView />}
            {currentView === "client-accounts" && <ClientAccountsView />}
            {currentView === "provider-accounts" && <ProviderAccountsView />}
            {currentView === "pending-orders" && <PendingOrdersView />}
            {currentView === "cash" && <CashView />}
            {currentView === "catalog" && <CatalogView />}
            {currentView === "clients" && <ClientsView />}
            {currentView === "providers" && <ProvidersView />}
            {currentView === "profile" && <ProfileView />}
          </main>
        </div>
      </div>

      <InventoryModal isOpen={isInventoryModalOpen} onOpenChange={setIsInventoryModalOpen} />
      <ClientsModal isOpen={isClientsModalOpen} onOpenChange={setIsClientsModalOpen} />
      <ProvidersModal isOpen={isProvidersModalOpen} onOpenChange={setIsProvidersModalOpen} />
    </>
  )
}
