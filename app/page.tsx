"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
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
  Menu,
  Settings,
  ChevronsLeft,
  ChevronsRight,
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
import SettingsView from "@/components/settings-view"
import { createBrowserClient } from "@/lib/supabase/client"
import { getCurrentISODate, formatDisplayDate, parseLocalDate } from "@/lib/date-helpers"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

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

export default function Dashboard() {
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
    | "settings"
  >("dashboard")

  const [date, setDate] = useState<DateRange | undefined>({
    from: getStartOfYear(),
    to: new Date(),
  })

  const [selectedMonth, setSelectedMonth] = useState<string>("all")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [quickPeriod, setQuickPeriod] = useState<string>("current-year")
  const [isLoading, setIsLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [initialCategory, setInitialCategory] = useState<string | undefined>(undefined)
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>("all")
  const [salesClientSearch, setSalesClientSearch] = useState("")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

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
        const saleDate = parseLocalDate(sale.date)
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear
      })
    } else if (quickPeriod === "last-month") {
      const now = new Date()
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const year = lastMonth.getFullYear()
      const month = lastMonth.getMonth()
      filtered = filtered.filter((sale) => {
        const saleDate = parseLocalDate(sale.date)
        return saleDate.getMonth() === month && saleDate.getFullYear() === year
      })
    } else if (quickPeriod === "current-year") {
      const currentYear = new Date().getFullYear()
      filtered = filtered.filter((sale) => {
        const saleDate = parseLocalDate(sale.date)
        return saleDate.getFullYear() === currentYear
      })
    } else if (quickPeriod === "last-year") {
      const lastYear = new Date().getFullYear() - 1
      filtered = filtered.filter((sale) => {
        const saleDate = parseLocalDate(sale.date)
        return saleDate.getFullYear() === lastYear
      })
    } else if (selectedMonth !== "all") {
      const monthIndex = Number.parseInt(selectedMonth)
      const year = Number.parseInt(selectedYear)
      filtered = filtered.filter((sale) => {
        const saleDate = parseLocalDate(sale.date)
        return saleDate.getMonth() === monthIndex && saleDate.getFullYear() === year
      })
    } else if (date?.from || date?.to) {
      filtered = filtered.filter((sale) => {
        const saleDate = parseLocalDate(sale.date)
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

  const periodStart = date?.from ? new Date(date.from) : getStartOfYear()
  const periodEnd = date?.to ? new Date(date.to) : new Date()

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const saleDate = parseLocalDate(sale.date)
      const isInDateRange = saleDate >= periodStart && saleDate <= periodEnd

      // Status filter
      const matchesStatus = salesStatusFilter === "all" || sale.status === salesStatusFilter

      // Client search filter
      const matchesClient = sale.client.toLowerCase().includes(salesClientSearch.toLowerCase())

      return isInDateRange && matchesStatus && matchesClient
    })
  }, [sales, periodStart, periodEnd, salesStatusFilter, salesClientSearch])

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
      date: getCurrentISODate(),
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

  const salesWithPayments = new Set(
    filteredTransactions
      .filter((t) => t.type === "income" && t.category === "Cobranzas")
      .map((t) => {
        return null // Por ahora no podemos identificar qué ventas tienen pagos
      })
      .filter(Boolean),
  )

  const businessExpenses = filteredTransactions
    .filter((transaction) => transaction.type === "expense" && transaction.expenseType === "operational")
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  const totalIncome = filteredTransactions
    .filter((transaction) => transaction.type === "income" && transaction.category === "Cobranzas")
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  const totalCashReceived = filteredSales
    .filter((sale) => sale.status === "Acreditado")
    .reduce((sum, sale) => {
      const tradeInValue = sale.tradeIn ? Number.parseFloat(sale.tradeIn.match(/\$([0-9.]+)/)?.[1] || "0") : 0
      const cashOnly = sale.total - tradeInValue
      return sum + Math.max(0, cashOnly)
    }, 0)

  const totalCosts = filteredSales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0)

  const netProfit = totalGrossProfit - businessExpenses

  const accountsWithBalance = getAccountsWithBalance()
  const totalPendingBalance = accountsWithBalance.reduce((sum, acc) => sum + acc.balance, 0)

  const cashBalance = filteredTransactions.reduce((balance, transaction) => {
    return transaction.type === "income" ? balance + transaction.amount : balance - transaction.amount
  }, 0)

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

  // Update NavigationMenu to accept isCollapsed prop
  const NavigationMenu = ({ onItemClick, isCollapsed }: { onItemClick?: () => void; isCollapsed?: boolean }) => (
    <nav className="grid items-start px-4 text-sm font-medium">
      <button
        onClick={() => {
          setCurrentView("dashboard")
          onItemClick?.()
        }}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
          currentView === "dashboard" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
        } ${isCollapsed ? "justify-center" : ""}`}
        title={isCollapsed ? "Vista general" : ""}
      >
        <Home className="h-4 w-4" />
        {!isCollapsed && "Vista general"}
      </button>

      <button
        onClick={() => {
          setCurrentView("cash")
          onItemClick?.()
        }}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
          currentView === "cash" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
        } ${isCollapsed ? "justify-center" : ""}`}
        title={isCollapsed ? "Caja" : ""}
      >
        <Wallet className="h-4 w-4" />
        {!isCollapsed && "Caja"}
      </button>

      {!isCollapsed && (
        <div>
          <button
            onClick={() => setIsInventoryExpanded(!isInventoryExpanded)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white hover:bg-gray-700 w-full text-left"
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
                onClick={() => {
                  setIsInventoryModalOpen(true)
                  onItemClick?.()
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left text-sm"
              >
                <PlusCircle className="h-3 w-3" />
                Nuevo Producto
              </button>
              <button
                onClick={() => {
                  setIsInventoryModalOpen(true)
                  setInitialCategory("Accesorio")
                  onItemClick?.()
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left text-sm"
              >
                <PlusCircle className="h-3 w-3" />
                Nuevo Accesorio
              </button>
              <button
                onClick={() => {
                  setCurrentView("catalog")
                  onItemClick?.()
                }}
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
      )}

      {isCollapsed && (
        <button
          onClick={() => {
            setCurrentView("catalog")
            onItemClick?.()
          }}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all justify-center ${
            currentView === "catalog" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
          }`}
          title="Inventario"
        >
          <Package className="h-4 w-4" />
        </button>
      )}

      {!isCollapsed && (
        <div>
          <button
            onClick={() => setIsClientsExpanded(!isClientsExpanded)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white hover:bg-gray-700 w-full text-left"
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
                onClick={() => {
                  setIsClientsModalOpen(true)
                  onItemClick?.()
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left text-sm"
              >
                <PlusCircle className="h-3 w-3" />
                Nuevo Cliente
              </button>
              <button
                onClick={() => {
                  setCurrentView("clients")
                  onItemClick?.()
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                  currentView === "clients" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <Users className="h-3 w-3" />
                Clientes
              </button>
              <button
                onClick={() => {
                  setCurrentView("client-accounts")
                  onItemClick?.()
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                  currentView === "client-accounts" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <DollarSign className="h-3 w-3" />
                Saldo de clientes
              </button>
            </div>
          )}
        </div>
      )}

      {isCollapsed && (
        <button
          onClick={() => {
            setCurrentView("clients")
            onItemClick?.()
          }}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all justify-center ${
            currentView === "clients" || currentView === "client-accounts"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          title="Clientes"
        >
          <Users className="h-4 w-4" />
        </button>
      )}

      {!isCollapsed && (
        <div>
          <button
            onClick={() => setIsProvidersExpanded(!isProvidersExpanded)}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white hover:bg-gray-700 w-full text-left"
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
                onClick={() => {
                  setIsProvidersModalOpen(true)
                  onItemClick?.()
                }}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-400 transition-all hover:text-white w-full text-left text-sm"
              >
                <PlusCircle className="h-3 w-3" />
                Nuevo Proveedor
              </button>
              <button
                onClick={() => {
                  setCurrentView("providers")
                  onItemClick?.()
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                  currentView === "providers" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <Building2 className="h-3 w-3" />
                Proveedores
              </button>
              <button
                onClick={() => {
                  setCurrentView("pending-orders")
                  onItemClick?.()
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                  currentView === "pending-orders" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <Package className="h-3 w-3" />
                Pedidos Pendientes
              </button>
              <button
                onClick={() => {
                  setCurrentView("provider-accounts")
                  onItemClick?.()
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all w-full text-left text-sm ${
                  currentView === "provider-accounts" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
                }`}
              >
                <DollarSign className="h-3 w-3" />
                Saldo de proveedores
              </button>
            </div>
          )}
        </div>
      )}

      {isCollapsed && (
        <button
          onClick={() => {
            setCurrentView("providers")
            onItemClick?.()
          }}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all justify-center ${
            currentView === "providers" || currentView === "pending-orders" || currentView === "provider-accounts"
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:text-white"
          }`}
          title="Proveedores"
        >
          <Building2 className="h-4 w-4" />
        </button>
      )}

      <button
        onClick={() => {
          setCurrentView("profile")
          onItemClick?.()
        }}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
          currentView === "profile" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
        } ${isCollapsed ? "justify-center" : ""}`}
        title={isCollapsed ? "Mi perfil" : ""}
      >
        <CircleUser className="h-4 w-4" />
        {!isCollapsed && "Mi perfil"}
      </button>

      <button
        onClick={() => {
          setCurrentView("settings")
          onItemClick?.()
        }}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
          currentView === "settings" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"
        } ${isCollapsed ? "justify-center" : ""}`}
        title={isCollapsed ? "Ajustes" : ""}
      >
        <Settings className="h-4 w-4" />
        {!isCollapsed && "Ajustes"}
      </button>
    </nav>
  )

  return (
    <>
      <NewSaleModal isOpen={isNewSaleModalOpen} onOpenChange={setIsNewSaleModalOpen} onSaleAdd={handleAddNewSale} />
      <div
        className={`grid min-h-screen w-full transition-all duration-300 ${isSidebarCollapsed ? "lg:grid-cols-[80px_1fr]" : "lg:grid-cols-[280px_1fr]"}`}
      >
        <div className="hidden border-r bg-gray-800 text-white lg:block">
          <div className="flex h-full max-h-screen flex-col gap-2">
            <div className="flex h-[60px] items-center justify-between border-b border-gray-700 px-6">
              <Link
                href="#"
                className={`flex items-center gap-2 font-semibold text-lg transition-opacity ${isSidebarCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"}`}
              >
                <Wallet className="h-6 w-6" />
                <span>Ipro</span>
              </Link>
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="flex items-center justify-center h-8 w-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
              >
                {isSidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex-1 overflow-auto py-2">
              <NavigationMenu isCollapsed={isSidebarCollapsed} />
            </div>
            <div className="border-t border-gray-700 p-4">
              <Button
                variant="ghost"
                className={`w-full text-gray-400 hover:bg-gray-700 hover:text-white ${isSidebarCollapsed ? "justify-center px-2" : "justify-start"}`}
                onClick={() => logout()}
                title="Cerrar sesión"
              >
                <LogOut className={`h-4 w-4 ${isSidebarCollapsed ? "" : "mr-2"}`} />
                {!isSidebarCollapsed && "Cerrar sesión"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-gray-50/50">
          <header className="flex flex-col lg:flex-row lg:h-[60px] items-start lg:items-center gap-2 lg:gap-4 border-b bg-white px-4 py-3 lg:py-0 lg:px-6">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden flex-shrink-0">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Abrir menú</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] p-0 bg-gray-800 text-white border-gray-700">
                  <div className="flex h-full max-h-screen flex-col gap-2">
                    <div className="flex h-[60px] items-center border-b border-gray-700 px-6">
                      <Link href="#" className="flex items-center gap-2 font-semibold text-lg">
                        <Wallet className="h-6 w-6" />
                        <span>Ipro</span>
                      </Link>
                    </div>
                    <div className="flex-1 overflow-auto py-2">
                      <NavigationMenu onItemClick={() => setIsMobileMenuOpen(false)} />
                    </div>
                    <div className="border-t border-gray-700 p-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-gray-400 hover:bg-gray-700 hover:text-white"
                        onClick={() => {
                          logout()
                          setIsMobileMenuOpen(false)
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar sesión
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex-1 lg:flex-initial">
                {currentView === "dashboard" && (
                  <>
                    {quickPeriod === "current-month" && (
                      <p className="text-sm lg:text-base text-blue-600 font-medium">
                        Mostrando datos de este mes ({format(new Date(), "MMMM yyyy")})
                      </p>
                    )}
                    {quickPeriod === "last-month" && (
                      <p className="text-sm lg:text-base text-blue-600 font-medium">
                        Mostrando datos del mes anterior (
                        {format(new Date(new Date().getFullYear(), new Date().getMonth() - 1), "MMMM yyyy")})
                      </p>
                    )}
                    {quickPeriod === "current-year" && (
                      <p className="text-sm lg:text-base text-blue-600 font-medium">
                        Mostrando datos de este año ({new Date().getFullYear()})
                      </p>
                    )}
                    {quickPeriod === "last-year" && (
                      <p className="text-sm lg:text-base text-blue-600 font-medium">
                        Mostrando datos del año anterior ({new Date().getFullYear() - 1})
                      </p>
                    )}
                    {quickPeriod === "custom" && selectedMonth !== "all" && (
                      <p className="text-sm lg:text-base text-blue-600 font-medium">
                        Mostrando datos de {monthOptions.find((m) => m.value === selectedMonth)?.label} {selectedYear}
                      </p>
                    )}
                    {quickPeriod === "custom" && selectedMonth === "all" && date?.from && (
                      <p className="text-sm lg:text-base text-blue-600 font-medium">
                        Mostrando datos del {formatDisplayDate(date.from)}
                        {date.to && ` al ${formatDisplayDate(date.to)}`}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full lg:w-auto lg:ml-auto">
              <Select
                value={quickPeriod}
                onValueChange={(value) => {
                  setQuickPeriod(value)
                  if (value !== "custom") {
                    setSelectedMonth("all")
                  }
                }}
              >
                <SelectTrigger className="w-full lg:w-[140px]">
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
                    <SelectTrigger className="w-[80px] lg:w-[100px]">
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
                    <SelectTrigger className="w-[120px] lg:w-[140px]">
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
                      <Button
                        id="date"
                        variant={"outline"}
                        className="w-[200px] lg:w-[260px] justify-start text-left font-normal"
                      >
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
                          <>
                            <span className="hidden lg:inline">Rango personalizado</span>
                            <span className="lg:hidden">Rango</span>
                          </>
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
          <main className="flex-1 p-4 lg:p-6">
            {currentView === "dashboard" && (
              <div className="grid gap-4 lg:gap-6">
                <div className="grid gap-4 lg:gap-6 max-w-sm">
                  <DolarBlueCard />
                </div>

                <div className="grid gap-4 lg:gap-6 lg:grid-cols-5">
                  <Card className="bg-green-50 border-green-200 max-w-sm">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-green-700 text-sm font-medium">Ingresos</CardDescription>
                      <CardTitle className="text-3xl lg:text-4xl font-bold text-green-900">
                        US${totalIncome.toLocaleString()}
                      </CardTitle>
                      <CardDescription className="text-xs text-green-600 mt-1">
                        Ingresos operativos (ventas y cobranzas)
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="bg-red-50 border-red-200 max-w-sm">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-red-700 text-sm font-medium">Costos</CardDescription>
                      <CardTitle className="text-3xl lg:text-4xl font-bold text-red-900">
                        ${totalCosts.toLocaleString()}
                      </CardTitle>
                      <CardDescription className="text-xs text-red-600 mt-1">Costo del stock vendido</CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="bg-sky-50 border-sky-200 max-w-sm">
                    <CardHeader className="pb-3">
                      <CardDescription className="text-sky-700 text-sm font-medium">Unidades vendidas</CardDescription>
                      <CardTitle className="text-3xl lg:text-4xl font-bold text-sky-900">
                        {filteredSales.length}
                      </CardTitle>
                    </CardHeader>
                  </Card>

                  <Card className="bg-fuchsia-50 border-fuchsia-200 max-w-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Ganancia neta</CardTitle>
                      <div className="mt-2">
                        <span
                          className={`text-3xl lg:text-4xl font-bold ${netProfit >= 0 ? "text-fuchsia-900" : "text-red-900"}`}
                        >
                          ${netProfit.toLocaleString()}
                        </span>
                      </div>
                      <CardDescription className="text-xs text-fuchsia-600 mt-1">
                        Ganancia bruta - Gastos operativos
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="bg-rose-50 border-rose-200 max-w-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Ganancia bruta</CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl lg:text-4xl font-bold text-rose-900">
                          ${totalGrossProfit.toLocaleString()}
                        </span>
                      </div>
                      <CardDescription className="text-xs text-rose-600 mt-1">
                        Ventas totales - Costos del producto vendido
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="bg-indigo-50 border-indigo-200 max-w-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Saldo en Caja</CardTitle>
                      <div className="mt-2">
                        <span
                          className={`text-3xl lg:text-4xl font-bold ${cashBalance >= 0 ? "text-indigo-900" : "text-red-900"}`}
                        >
                          ${cashBalance.toLocaleString()}
                        </span>
                      </div>
                      <CardDescription className="text-xs text-indigo-600 mt-1">
                        Total ingresos - Total egresos (incluye capital)
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>

                <div className="flex flex-row items-start sm:items-center gap-3">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white w-auto"
                    onClick={() => setIsNewSaleModalOpen(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nueva venta
                  </Button>

                  <Button
                    variant="outline"
                    className="bg-white hover:bg-gray-100 transition-colors w-auto"
                    onClick={() => setCurrentView("catalog")}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    Ver stock
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Ventas en el período ({filteredSales.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Buscar por cliente..."
                          value={salesClientSearch}
                          onChange={(e) => setSalesClientSearch(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <Select value={salesStatusFilter} onValueChange={setSalesStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="Acreditado">Acreditado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[120px]">Estado</TableHead>
                              <TableHead className="min-w-[100px]">Fecha</TableHead>
                              <TableHead className="min-w-[120px]">Cliente</TableHead>
                              <TableHead className="min-w-[100px]">Vendedor</TableHead>
                              <TableHead className="min-w-[100px]">Canje</TableHead>
                              <TableHead className="min-w-[150px]">Pedido</TableHead>
                              <TableHead className="text-right min-w-[100px]">Ganancia bruta</TableHead>
                              <TableHead className="text-right min-w-[100px]">Total</TableHead>
                              <TableHead className="text-right min-w-[100px]">Descuento</TableHead>
                              <TableHead className="w-[40px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredSales.map((sale) => (
                              <TableRow key={sale.id}>
                                <TableCell>{getStatusBadge(sale.status, sale.id)}</TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {formatDisplayDate(sale.date)}
                                  <br />
                                  <span className="text-xs text-gray-500">{sale.time}</span>
                                </TableCell>
                                <TableCell className="font-medium">{sale.client}</TableCell>
                                <TableCell>{sale.salesperson}</TableCell>
                                <TableCell className="text-xs whitespace-pre-wrap">{sale.tradeIn || "--"}</TableCell>
                                <TableCell className="text-xs">{sale.order}</TableCell>
                                <TableCell className="text-right font-medium whitespace-nowrap">
                                  ${sale.grossProfit}
                                </TableCell>
                                <TableCell className="text-right font-medium whitespace-nowrap">
                                  ${sale.total}
                                </TableCell>
                                <TableCell className="text-right text-red-600 whitespace-nowrap">
                                  ${sale.discount}
                                </TableCell>
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
                      </div>
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
            {currentView === "settings" && <SettingsView />}
          </main>
        </div>
      </div>

      <InventoryModal
        isOpen={isInventoryModalOpen}
        onOpenChange={(open) => {
          setIsInventoryModalOpen(open)
          if (!open) setInitialCategory(undefined)
        }}
        initialCategory={initialCategory}
      />
      <ClientsModal isOpen={isClientsModalOpen} onOpenChange={setIsClientsModalOpen} />
      <ProvidersModal isOpen={isProvidersModalOpen} onOpenChange={setIsProvidersModalOpen} />
    </>
  )
}
