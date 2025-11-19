"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createBrowserClient } from "@/lib/supabase/client"
import { getCurrentISODate } from "@/lib/date-helpers"

export type AccountTransaction = {
  id: string
  type: "sale" | "payment" | "purchase" | "payment_to_provider" | "manual_debt"
  date: string
  description: string
  amount: number // Positivo para ventas/compras, negativo para pagos
  saleId?: string
  dueDate?: string // Fecha de vencimiento
}

export type ClientAccount = {
  clientId: string
  clientName: string
  transactions: AccountTransaction[]
  balance: number // Saldo pendiente (positivo = nos deben)
}

export type ProviderAccount = {
  providerId: string
  providerName: string
  transactions: AccountTransaction[]
  balance: number // Saldo pendiente (positivo = les debemos)
}

type AccountContextType = {
  clientAccounts: ClientAccount[]
  providerAccounts: ProviderAccount[]
  isLoading: boolean
  addSaleToAccount: (
    clientId: string,
    clientName: string,
    saleId: string,
    amount: number,
    description: string,
    dueDate?: string,
  ) => void
  addPaymentFromClient: (clientId: string, amount: number, description?: string) => void
  addPurchaseToProvider: (
    providerId: string,
    providerName: string,
    amount: number,
    description: string,
    dueDate?: string,
  ) => void
  addPaymentToProvider: (providerId: string, amount: number, description?: string) => void
  addDebtToProvider: (
    providerId: string,
    providerName: string,
    amount: number,
    description: string,
    dueDate?: string,
  ) => void
  removeTransaction: (entityId: string, transactionId: string) => void
  getClientAccount: (clientId: string) => ClientAccount | undefined
  getProviderAccount: (providerId: string) => ProviderAccount | undefined
  getAccountsWithBalance: () => ClientAccount[]
  getClientsWithBalance: () => ClientAccount[]
  getProvidersWithBalance: () => ProviderAccount[]
  updateSaleStatus: (saleId: string, newStatus: "Acreditado" | "Pendiente" | "Entregado") => void
  getAllClientAccounts: () => ClientAccount[]
  getAllProviderAccounts: () => ProviderAccount[]
  registerSaleStatusCallback: (callback: (saleId: string, newStatus: "Acreditado" | "Pendiente") => void) => void
}

const AccountContext = createContext<AccountContextType | undefined>(undefined)

let saleStatusCallback: ((saleId: string, newStatus: "Acreditado" | "Pendiente") => void) | null = null

export function AccountProvider({ children }: { children: ReactNode }) {
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([])
  const [providerAccounts, setProviderAccounts] = useState<ProviderAccount[]>([])
  const [isLoading, setIsLoading] = useState(true) // Added loading state
  const supabase = createBrowserClient()

  useEffect(() => {
    loadAccountTransactions()
  }, [])

  const loadAccountTransactions = async () => {
    setIsLoading(true) // Set loading to true when starting to load
    try {
      const { data: transactions, error } = await supabase
        .from("account_transactions")
        .select("*")
        .order("date", { ascending: false })

      if (error) throw error

      if (transactions) {
        const clientAccountsMap = new Map<string, ClientAccount>()
        const providerAccountsMap = new Map<string, ProviderAccount>()

        transactions.forEach((tx) => {
          if (tx.account_type === "client") {
            if (!clientAccountsMap.has(tx.account_name)) {
              clientAccountsMap.set(tx.account_name, {
                clientId: tx.account_name,
                clientName: tx.account_name,
                transactions: [],
                balance: 0,
              })
            }
            const account = clientAccountsMap.get(tx.account_name)!
            account.transactions.push({
              id: tx.id,
              type: tx.type as any,
              date: tx.date,
              description: tx.description,
              amount: tx.amount,
              saleId: tx.sale_id || undefined,
            })
            account.balance += tx.amount
          } else if (tx.account_type === "provider") {
            if (!providerAccountsMap.has(tx.account_name)) {
              providerAccountsMap.set(tx.account_name, {
                providerId: tx.account_name,
                providerName: tx.account_name,
                transactions: [],
                balance: 0,
              })
            }
            const account = providerAccountsMap.get(tx.account_name)!
            account.transactions.push({
              id: tx.id,
              type: tx.type as any,
              date: tx.date,
              description: tx.description,
              amount: tx.amount,
            })
            account.balance += tx.amount
          }
        })

        setClientAccounts(Array.from(clientAccountsMap.values()))
        setProviderAccounts(Array.from(providerAccountsMap.values()))
      }
    } catch (error) {
      console.error("[v0] Error loading account transactions:", error)
    } finally {
      setIsLoading(false) // Set loading to false when done loading
    }
  }

  const addSaleToAccount = async (
    clientId: string,
    clientName: string,
    saleId: string,
    amount: number,
    description: string,
    dueDate?: string,
  ) => {
    const transaction: AccountTransaction = {
      id: `trans_${Date.now()}`,
      type: "sale",
      date: getCurrentISODate(),
      description,
      amount,
      saleId,
      dueDate,
    }

    try {
      const { error } = await supabase.from("account_transactions").insert({
        id: transaction.id,
        account_type: "client",
        account_name: clientName,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
        sale_id: saleId,
      })

      if (error) throw error
    } catch (error) {
      console.error("[v0] Error saving sale to account:", error)
      return
    }

    setClientAccounts((prev) => {
      const existingAccountIndex = prev.findIndex((acc) => acc.clientId === clientId)

      if (existingAccountIndex >= 0) {
        const updatedAccounts = [...prev]
        updatedAccounts[existingAccountIndex] = {
          ...updatedAccounts[existingAccountIndex],
          transactions: [...updatedAccounts[existingAccountIndex].transactions, transaction],
          balance: updatedAccounts[existingAccountIndex].balance + amount,
        }
        return updatedAccounts
      } else {
        const newAccount: ClientAccount = {
          clientId,
          clientName,
          transactions: [transaction],
          balance: amount,
        }
        return [...prev, newAccount]
      }
    })
  }

  const addPaymentFromClient = async (clientId: string, amount: number, description = "Pago recibido") => {
    const transaction: AccountTransaction = {
      id: `trans_${Date.now()}`,
      type: "payment",
      date: getCurrentISODate(),
      description,
      amount: -amount,
    }

    const account = clientAccounts.find((acc) => acc.clientId === clientId)
    if (!account) return

    try {
      const { error } = await supabase.from("account_transactions").insert({
        id: transaction.id,
        account_type: "client",
        account_name: account.clientName,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
      })

      if (error) throw error
    } catch (error) {
      console.error("[v0] Error saving payment:", error)
      return
    }

    setClientAccounts((prev) => {
      return prev.map((account) => {
        if (account.clientId === clientId) {
          const newBalance = account.balance - amount
          const updatedAccount = {
            ...account,
            transactions: [...account.transactions, transaction],
            balance: newBalance,
          }

          if (newBalance <= 0 && account.balance > 0) {
            const saleTransactions = account.transactions.filter((t) => t.type === "sale" && t.saleId)
            saleTransactions.forEach((saleTx) => {
              if (saleTx.saleId && saleStatusCallback) {
                console.log("[v0] Client fully paid, updating sale status:", saleTx.saleId)
                saleStatusCallback(saleTx.saleId, "Acreditado")
              }
            })
          }

          return updatedAccount
        }
        return account
      })
    })
  }

  const addPurchaseToProvider = async (
    providerId: string,
    providerName: string,
    amount: number,
    description: string,
    dueDate?: string,
  ) => {
    const transaction: AccountTransaction = {
      id: `trans_${Date.now()}`,
      type: "purchase",
      date: getCurrentISODate(),
      description,
      amount,
      dueDate,
    }

    try {
      const { error } = await supabase.from("account_transactions").insert({
        id: transaction.id,
        account_type: "provider",
        account_name: providerName,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
      })

      if (error) throw error
    } catch (error) {
      console.error("[v0] Error saving purchase:", error)
      return
    }

    setProviderAccounts((prev) => {
      const existingAccountIndex = prev.findIndex((acc) => acc.providerId === providerId)

      if (existingAccountIndex >= 0) {
        const updatedAccounts = [...prev]
        updatedAccounts[existingAccountIndex] = {
          ...updatedAccounts[existingAccountIndex],
          transactions: [...updatedAccounts[existingAccountIndex].transactions, transaction],
          balance: updatedAccounts[existingAccountIndex].balance + amount,
        }
        return updatedAccounts
      } else {
        const newAccount: ProviderAccount = {
          providerId,
          providerName,
          transactions: [transaction],
          balance: amount,
        }
        return [...prev, newAccount]
      }
    })
  }

  const addPaymentToProvider = async (providerId: string, amount: number, description = "Pago realizado") => {
    const transaction: AccountTransaction = {
      id: `trans_${Date.now()}`,
      type: "payment_to_provider",
      date: getCurrentISODate(),
      description,
      amount: -amount,
    }

    const account = providerAccounts.find((acc) => acc.providerId === providerId)
    if (!account) return

    try {
      const { error } = await supabase.from("account_transactions").insert({
        id: transaction.id,
        account_type: "provider",
        account_name: account.providerName,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
      })

      if (error) throw error
    } catch (error) {
      console.error("[v0] Error saving payment to provider:", error)
      return
    }

    setProviderAccounts((prev) => {
      return prev.map((account) => {
        if (account.providerId === providerId) {
          return {
            ...account,
            transactions: [...account.transactions, transaction],
            balance: account.balance - amount,
          }
        }
        return account
      })
    })
  }

  const addDebtToProvider = async (
    providerId: string,
    providerName: string,
    amount: number,
    description: string,
    dueDate?: string,
  ) => {
    const transaction: AccountTransaction = {
      id: `trans_${Date.now()}`,
      type: "manual_debt",
      date: getCurrentISODate(),
      description,
      amount,
      dueDate,
    }

    try {
      const { error } = await supabase.from("account_transactions").insert({
        id: transaction.id,
        account_type: "provider",
        account_name: providerName,
        type: transaction.type,
        date: transaction.date,
        description: transaction.description,
        amount: transaction.amount,
      })

      if (error) throw error
    } catch (error) {
      console.error("[v0] Error saving debt to provider:", error)
      return
    }

    setProviderAccounts((prev) => {
      const existingAccountIndex = prev.findIndex((acc) => acc.providerId === providerId)

      if (existingAccountIndex >= 0) {
        const updatedAccounts = [...prev]
        updatedAccounts[existingAccountIndex] = {
          ...updatedAccounts[existingAccountIndex],
          transactions: [...updatedAccounts[existingAccountIndex].transactions, transaction],
          balance: updatedAccounts[existingAccountIndex].balance + amount,
        }
        return updatedAccounts
      } else {
        const newAccount: ProviderAccount = {
          providerId,
          providerName,
          transactions: [transaction],
          balance: amount,
        }
        return [...prev, newAccount]
      }
    })
  }

  const removeTransaction = async (entityId: string, transactionId: string) => {
    try {
      const { error } = await supabase.from("account_transactions").delete().eq("id", transactionId)

      if (error) throw error
    } catch (error) {
      console.error("[v0] Error deleting transaction:", error)
      return
    }

    setClientAccounts((prev) => {
      return prev.map((account) => {
        if (account.clientId === entityId) {
          const transactionToRemove = account.transactions.find((t) => t.id === transactionId)
          if (transactionToRemove) {
            const updatedTransactions = account.transactions.filter((t) => t.id !== transactionId)
            const newBalance = account.balance - transactionToRemove.amount
            return {
              ...account,
              transactions: updatedTransactions,
              balance: newBalance,
            }
          }
        }
        return account
      })
    })

    setProviderAccounts((prev) => {
      return prev.map((account) => {
        if (account.providerId === entityId) {
          const transactionToRemove = account.transactions.find((t) => t.id === transactionId)
          if (transactionToRemove) {
            const updatedTransactions = account.transactions.filter((t) => t.id !== transactionId)
            const newBalance = account.balance - transactionToRemove.amount
            return {
              ...account,
              transactions: updatedTransactions,
              balance: newBalance,
            }
          }
        }
        return account
      })
    })
  }

  const getClientAccount = (clientId: string) => {
    return clientAccounts.find((acc) => acc.clientId === clientId)
  }

  const getProviderAccount = (providerId: string) => {
    return providerAccounts.find((acc) => acc.providerId === providerId)
  }

  const getAccountsWithBalance = () => {
    return clientAccounts.filter((acc) => acc.balance > 0)
  }

  const getClientsWithBalance = () => {
    return clientAccounts.filter((acc) => acc.balance > 0)
  }

  const getProvidersWithBalance = () => {
    return providerAccounts.filter((acc) => acc.balance > 0)
  }

  const getAllClientAccounts = () => {
    return clientAccounts
  }

  const getAllProviderAccounts = () => {
    return providerAccounts
  }

  const updateSaleStatus = (saleId: string, newStatus: "Acreditado" | "Pendiente" | "Entregado") => {
    console.log(`[v0] Sale status update requested: ${saleId} -> ${newStatus}`)
  }

  const registerSaleStatusCallback = (callback: (saleId: string, newStatus: "Acreditado" | "Pendiente") => void) => {
    saleStatusCallback = callback
    console.log("[v0] Sale status callback registered")
  }

  return (
    <AccountContext.Provider
      value={{
        clientAccounts,
        providerAccounts,
        isLoading,
        addSaleToAccount,
        addPaymentFromClient,
        addPurchaseToProvider,
        addPaymentToProvider,
        addDebtToProvider,
        removeTransaction,
        getClientAccount,
        getProviderAccount,
        getAccountsWithBalance: getClientsWithBalance,
        getClientsWithBalance,
        getProvidersWithBalance,
        updateSaleStatus,
        getAllClientAccounts,
        getAllProviderAccounts,
        registerSaleStatusCallback,
      }}
    >
      {children}
    </AccountContext.Provider>
  )
}

export function useAccounts() {
  const context = useContext(AccountContext)
  if (context === undefined) {
    throw new Error("useAccounts must be used within an AccountProvider")
  }
  return context
}
