"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, DollarSign, Calendar, Search, ChevronDown, ChevronRight, Filter, Users, Building2 } from 'lucide-react'
import { useAccounts } from "@/components/account-context"
import { useClients } from "@/components/client-context"
import { useProviders } from "@/components/provider-context"
import { useCash } from "@/components/cash-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { DateRange } from "react-day-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AccountsViewProps {
  dateRange?: DateRange
}

const AccountsView = ({ dateRange }: AccountsViewProps) => {
  const {
    clientAccounts,
    providerAccounts,
    addPaymentFromClient,
    addPaymentToProvider,
    getClientsWithBalance,
    getProvidersWithBalance,
  } = useAccounts()
  const { clients } = useClients()
  const { providers } = useProviders()
  const { addTransaction } = useCash()
  const [selectedAccountId, setSelectedAccountId] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentDescription, setPaymentDescription] = useState("")
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showOnlyWithDebt, setShowOnlyWithDebt] = useState(false)
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"clients" | "providers">("clients")

  const accountsWithBalance = getClientsWithBalance()
  const providersWithBalance = getProvidersWithBalance()

  const getFilteredAccounts = (type: "clients" | "providers") => {
    const accounts = type === "clients" ? clientAccounts : providerAccounts
    let filtered = accounts

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter((account) =>
        (type === "clients" ? account.clientName : account.providerName)
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      )
    }

    // Filtrar solo con deuda
    if (showOnlyWithDebt) {
      filtered = filtered.filter((account) => account.balance > 0)
    }

    // Filtrar por fecha si se proporciona
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered
        .map((account) => ({
          ...account,
          transactions: account.transactions.filter((transaction) => {
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
          }),
        }))
        .filter((account) => account.transactions.length > 0 || !dateRange?.from)
    }

    return filtered
  }

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAccountId || !paymentAmount || Number.parseFloat(paymentAmount) <= 0) {
      alert("Por favor, seleccione una cuenta y ingrese un monto válido")
      return
    }

    const amount = Number.parseFloat(paymentAmount)
    const description = paymentDescription || `Pago registrado - ${new Date().toLocaleDateString()}`

    if (activeTab === "clients") {
      addPaymentFromClient(selectedAccountId, amount, description)

      // Encontrar el nombre del cliente para la descripción
      const clientAccount = accountsWithBalance.find((acc) => acc.clientId === selectedAccountId)
      const clientName = clientAccount?.clientName || "Cliente"

      // Agregar transacción de ingreso a la caja
      addTransaction({
        type: "income",
        date: new Date().toISOString().split("T")[0],
        amount: amount,
        paymentMethod: "cash", // Puedes ajustar esto según necesites
        category: "Cobros",
        description: `Cobro de ${clientName}: ${description}`,
        relatedTo: "sale",
        relatedId: selectedAccountId,
      })
    } else {
      addPaymentToProvider(selectedAccountId, amount, description)

      // Encontrar el nombre del proveedor para la descripción
      const providerAccount = providersWithBalance.find((acc) => acc.providerId === selectedAccountId)
      const providerName = providerAccount?.providerName || "Proveedor"

      // Agregar transacción de egreso a la caja
      addTransaction({
        type: "expense",
        date: new Date().toISOString().split("T")[0],
        amount: amount,
        paymentMethod: "cash", // Puedes ajustar esto según necesites
        category: "Pagos a Proveedores",
        description: `Pago a ${providerName}: ${description}`,
        relatedTo: "purchase",
        relatedId: selectedAccountId,
      })
    }

    // Reset form
    setSelectedAccountId("")
    setPaymentAmount("")
    setPaymentDescription("")
    setShowPaymentForm(false)
  }

  const toggleAccountExpansion = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts)
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)
    }
    setExpandedAccounts(newExpanded)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR")
  }

  const getAccountBalance = (account: any) => {
    return account.transactions.reduce((sum: number, t: any) => sum + t.amount, 0)
  }

  const renderAccountsTab = (type: "clients" | "providers") => {
    const filteredAccounts = getFilteredAccounts(type)
    const balanceData = type === "clients" ? accountsWithBalance : providersWithBalance
    const totalBalance = balanceData.reduce((sum, acc) => sum + acc.balance, 0)
    const accountsWithDebt = balanceData.filter((acc) => acc.balance > 0).length
    const isClients = type === "clients"

    return (
      <div className="space-y-6">
        {/* Resumen específico por tipo */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className={isClients ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}>
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-sm font-medium ${isClients ? "text-red-700" : "text-orange-700"} flex items-center gap-2`}
              >
                <DollarSign className="h-4 w-4" />
                {isClients ? "Total por Cobrar" : "Total por Pagar"}
              </CardTitle>
              <div className={`text-2xl font-bold ${isClients ? "text-red-900" : "text-orange-900"}`}>
                {formatCurrency(totalBalance)}
              </div>
            </CardHeader>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                {isClients ? <Users className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                {isClients ? "Clientes con Deuda" : "Proveedores con Deuda"}
              </CardTitle>
              <div className="text-2xl font-bold text-blue-900">{accountsWithDebt}</div>
            </CardHeader>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Cuentas Activas
              </CardTitle>
              <div className="text-2xl font-bold text-green-900">{filteredAccounts.length}</div>
            </CardHeader>
          </Card>
        </div>

        {/* Controles de búsqueda y filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={`Buscar ${isClients ? "cliente" : "proveedor"} por nombre...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={showOnlyWithDebt ? "default" : "outline"}
              onClick={() => setShowOnlyWithDebt(!showOnlyWithDebt)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Solo con deuda
            </Button>
            <Button
              onClick={() => {
                setActiveTab(type)
                setShowPaymentForm(!showPaymentForm)
              }}
              className={isClients ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              {isClients ? "Registrar Cobro" : "Registrar Pago"}
            </Button>
          </div>
        </div>

        {/* Formulario para registrar pago/cobro */}
        {showPaymentForm && activeTab === type && (
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-lg">
                {isClients ? "Registrar Cobro de Cliente" : "Registrar Pago a Proveedor"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="account">{isClients ? "Cliente" : "Proveedor"} *</Label>
                    <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Seleccionar ${isClients ? "cliente" : "proveedor"}...`} />
                      </SelectTrigger>
                      <SelectContent>
                        {balanceData.map((account) => (
                          <SelectItem
                            key={isClients ? account.clientId : account.providerId}
                            value={isClients ? account.clientId : account.providerId}
                          >
                            {account.name} - {isClients ? "Debe" : "Se le debe"}: {formatCurrency(account.balance)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="amount">Monto *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Descripción</Label>
                    <Input
                      id="description"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                      placeholder={
                        isClients ? "Pago recibido, transferencia, etc." : "Pago realizado, transferencia, etc."
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className={isClients ? "bg-green-600 hover:bg-green-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                  >
                    {isClients ? "Registrar Cobro" : "Registrar Pago"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de cuentas */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              {isClients ? "Cuentas por Cobrar" : "Cuentas por Pagar"} ({filteredAccounts.length})
            </h3>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>
                {searchTerm || showOnlyWithDebt
                  ? "No se encontraron cuentas que coincidan con los filtros."
                  : `No hay ${isClients ? "cuentas por cobrar" : "cuentas por pagar"} registradas.`}
              </p>
              <p className="text-sm mt-2">
                {!searchTerm &&
                  !showOnlyWithDebt &&
                  `Las cuentas se crean automáticamente cuando se realizan ${isClients ? "ventas a crédito" : "compras a crédito"}.`}
              </p>
            </div>
          ) : (
            filteredAccounts.map((account) => {
              const accountBalance = getAccountBalance(account)
              const accountId = isClients ? account.clientId : account.providerId
              const accountName = isClients ? account.clientName : account.providerName
              const isExpanded = expandedAccounts.has(accountId)

              return (
                <Card
                  key={accountId}
                  className={
                    accountBalance > 0 ? (isClients ? "border-red-200" : "border-orange-200") : "border-gray-200"
                  }
                >
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <CardHeader
                        className="pb-3 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleAccountExpansion(accountId)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <div className="flex items-center gap-2">
                              {isClients ? <Users className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                              <CardTitle className="text-lg">{accountName}</CardTitle>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm text-gray-500">{account.transactions.length} transacciones</div>
                              <Badge
                                className={
                                  accountBalance > 0
                                    ? isClients
                                      ? "bg-red-100 text-red-800"
                                      : "bg-orange-100 text-orange-800"
                                    : "bg-green-100 text-green-800"
                                }
                              >
                                Saldo: {formatCurrency(accountBalance)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-100">
                                <TableHead className="font-semibold">Fecha</TableHead>
                                <TableHead className="font-semibold">Tipo</TableHead>
                                <TableHead className="font-semibold">Descripción</TableHead>
                                <TableHead className="font-semibold text-right">Debe</TableHead>
                                <TableHead className="font-semibold text-right">Haber</TableHead>
                                <TableHead className="font-semibold text-right">Saldo</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {account.transactions.map((transaction, index) => {
                                const runningBalance = account.transactions
                                  .slice(0, index + 1)
                                  .reduce((sum, t) => sum + t.amount, 0)

                                return (
                                  <TableRow key={transaction.id}>
                                    <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
                                    <TableCell>
                                      <Badge variant={transaction.type === "sale" ? "destructive" : "default"}>
                                        {transaction.type === "sale" ? (isClients ? "Venta" : "Compra") : "Pago"}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">{transaction.description}</TableCell>
                                    <TableCell className="text-right font-medium">
                                      {transaction.amount > 0 ? formatCurrency(transaction.amount) : "--"}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {transaction.amount < 0 ? formatCurrency(Math.abs(transaction.amount)) : "--"}
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                      <span
                                        className={
                                          runningBalance > 0
                                            ? isClients
                                              ? "text-red-600"
                                              : "text-orange-600"
                                            : "text-green-600"
                                        }
                                      >
                                        {formatCurrency(runningBalance)}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estados de Cuenta</h1>
          <p className="text-gray-600 mt-2">Monitoreo de cuentas corrientes por cobrar y por pagar</p>
          {dateRange?.from && (
            <p className="text-sm text-blue-600 mt-1">
              Filtrado: {formatDate(dateRange.from.toISOString())}
              {dateRange.to && ` - ${formatDate(dateRange.to.toISOString())}`}
            </p>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as "clients" | "providers")
          setSearchTerm("")
          setShowOnlyWithDebt(false)
          setShowPaymentForm(false)
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Cuentas por Cobrar
          </TabsTrigger>
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Cuentas por Pagar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-6">
          {renderAccountsTab("clients")}
        </TabsContent>

        <TabsContent value="providers" className="mt-6">
          {renderAccountsTab("providers")}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AccountsView
