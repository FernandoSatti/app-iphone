"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

export interface PendingOrder {
  id: string
  providerId: string
  providerName: string
  products: {
    model: string
    quantity: number
    unitCost: number
    totalCost: number
  }[]
  totalAmount: number
  orderDate: string
  expectedDate?: string
  status: "pending" | "received"
  notes?: string
}

interface PendingOrdersContextType {
  orders: PendingOrder[]
  addOrder: (order: Omit<PendingOrder, "id" | "orderDate" | "status">) => Promise<void>
  markAsReceived: (orderId: string) => Promise<void>
  deleteOrder: (orderId: string) => Promise<void>
  isLoading: boolean
}

const PendingOrdersContext = createContext<PendingOrdersContextType | undefined>(undefined)

const getCurrentLocalDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function PendingOrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<PendingOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("pending_orders")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        providerId: item.provider,
        providerName: item.provider,
        products: item.products || [],
        totalAmount: Number(item.total_cost),
        orderDate: item.order_date,
        status: item.status,
      }))

      setOrders(mappedData)
    } catch (error) {
      console.error("[v0] Error loading pending orders:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addOrder = async (orderData: Omit<PendingOrder, "id" | "orderDate" | "status">) => {
    try {
      const uniqueId = `order_${Date.now()}`
      const orderDate = getCurrentLocalDate()

      const { error } = await supabase.from("pending_orders").insert({
        id: uniqueId,
        provider: orderData.providerId,
        products: orderData.products,
        total_cost: orderData.totalAmount,
        order_date: orderDate,
        status: "pending",
      })

      if (error) throw error

      // Update local state
      const newOrder: PendingOrder = {
        ...orderData,
        id: uniqueId,
        orderDate,
        status: "pending",
      }
      setOrders((prev) => [newOrder, ...prev])
    } catch (error) {
      console.error("[v0] Error adding pending order:", error)
      throw error
    }
  }

  const markAsReceived = async (orderId: string) => {
    try {
      const receivedDate = getCurrentLocalDate()

      const { error } = await supabase
        .from("pending_orders")
        .update({ status: "received", received_date: receivedDate })
        .eq("id", orderId)

      if (error) throw error

      // Update local state
      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? { ...order, status: "received" as const } : order)),
      )
    } catch (error) {
      console.error("[v0] Error marking order as received:", error)
      throw error
    }
  }

  const deleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from("pending_orders").delete().eq("id", orderId)

      if (error) throw error

      // Update local state
      setOrders((prev) => prev.filter((order) => order.id !== orderId))
    } catch (error) {
      console.error("[v0] Error deleting pending order:", error)
      throw error
    }
  }

  return (
    <PendingOrdersContext.Provider value={{ orders, addOrder, markAsReceived, deleteOrder, isLoading }}>
      {children}
    </PendingOrdersContext.Provider>
  )
}

export function usePendingOrders() {
  const context = useContext(PendingOrdersContext)
  if (context === undefined) {
    throw new Error("usePendingOrders must be used within a PendingOrdersProvider")
  }
  return context
}
