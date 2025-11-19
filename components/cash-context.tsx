"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

export type CashTransaction = {
  id: string
  type: "income" | "expense"
  date: string
  amount: number
  paymentMethod: "cash" | "transfer" | "card" | "check" | "other"
  category:
    | "Cobranzas"
    | "Capital"
    | "Ajuste"
    | "Alquiler"
    | "Comida"
    | "Transporte"
    | "Servicios"
    | "Impuestos"
    | "Salarios"
    | "Retiro del dueño"
    | "Pago stock"
    | "Otros"
  description: string
  relatedTo?: "sale" | "purchase" | "expense" | "other"
  relatedId?: string
  expenseType?: "operational" | "withdrawal" | "stock_payment" | "other"
}

type CashContextType = {
  transactions: CashTransaction[]
  addTransaction: (transaction: Omit<CashTransaction, "id">) => Promise<void>
  removeTransaction: (id: string) => Promise<void>
  getCashBalance: () => number
  getTransactionsByDateRange: (from: Date, to: Date) => CashTransaction[]
  getTransactionsByCategory: (category: string) => CashTransaction[]
  getOperationalExpenses: (from?: Date, to?: Date) => number
  isLoading: boolean
}

const CashContext = createContext<CashContextType | undefined>(undefined)

export function CashProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<CashTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from("cash_transactions")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        type: item.type,
        date: item.date,
        amount: Number(item.amount),
        paymentMethod: item.payment_method,
        category: item.category,
        description: item.description,
        expenseType: item.expense_type,
      }))

      setTransactions(mappedData)
    } catch (error) {
      console.error("[v0] Error loading cash transactions:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addTransaction = async (transaction: Omit<CashTransaction, "id">) => {
    try {
      const uniqueId = `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const { error } = await supabase.from("cash_transactions").insert({
        id: uniqueId,
        type: transaction.type,
        date: transaction.date,
        amount: transaction.amount,
        payment_method: transaction.paymentMethod,
        category: transaction.category,
        description: transaction.description,
        expense_type: transaction.expenseType,
      })

      if (error) throw error

      // Update local state
      const newTransaction: CashTransaction = {
        ...transaction,
        id: uniqueId,
      }
      setTransactions((prev) => [newTransaction, ...prev])
    } catch (error) {
      console.error("[v0] Error adding cash transaction:", error)
      throw error
    }
  }

  const removeTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from("cash_transactions").delete().eq("id", id)

      if (error) throw error

      // Update local state
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } catch (error) {
      console.error("[v0] Error removing cash transaction:", error)
      throw error
    }
  }

  const getCashBalance = () => {
    return transactions.reduce((balance, transaction) => {
      return transaction.type === "income" ? balance + transaction.amount : balance - transaction.amount
    }, 0)
  }

  const getTransactionsByDateRange = (from: Date, to: Date) => {
    return transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.date)
      return transactionDate >= from && transactionDate <= to
    })
  }

  const getTransactionsByCategory = (category: string) => {
    return transactions.filter((transaction) => transaction.category === category)
  }

  const getOperationalExpenses = (from?: Date, to?: Date) => {
    let filteredTransactions = transactions.filter(
      (transaction) => transaction.type === "expense" && transaction.expenseType === "operational",
    )

    if (from && to) {
      filteredTransactions = filteredTransactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date)
        return transactionDate >= from && transactionDate <= to
      })
    }

    return filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  }

  return (
    <CashContext.Provider
      value={{
        transactions,
        addTransaction,
        removeTransaction,
        getCashBalance,
        getTransactionsByDateRange,
        getTransactionsByCategory,
        getOperationalExpenses,
        isLoading,
      }}
    >
      {children}
    </CashContext.Provider>
  )
}

export function useCash() {
  const context = useContext(CashContext)
  if (context === undefined) {
    throw new Error("useCash must be used within a CashProvider")
  }
  return context
}
