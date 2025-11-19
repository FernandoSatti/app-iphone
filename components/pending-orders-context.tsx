"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { useInventory } from "./inventory-context"

export interface PendingOrder {
  id: string
  providerId: string
  providerName: string
  products: {
    model: string
    quantity: number
    unitCost: number
    totalCost: number
    storage?: string
    color?: string
    battery?: number
    imei?: string
    costPrice?: number
    salePrice?: number
    condition?: string
    productCategory?: string
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
  markAsReceived: (order: PendingOrder) => Promise<void>
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
  const { refreshInventory } = useInventory()

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

  const markAsReceived = async (order: PendingOrder) => {
    try {
      console.log("[v0] Marking order as received:", order.id)
      const receivedDate = getCurrentLocalDate()
      const supabase = createClient()

      // First, add all products to inventory as individual items
      let itemsAdded = 0
      for (const product of order.products) {
        console.log(`[v0] Processing product: ${product.model}, quantity: ${product.quantity}`)
        console.log(`[v0] Product category: ${product.productCategory}`)
        
        // Create individual inventory items based on quantity
        for (let i = 0; i < product.quantity; i++) {
          const uniqueId = `inv${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

          const inventoryData: any = {
            id: uniqueId,
            cost_price: product.unitCost || product.costPrice || 0,
            sale_price: product.salePrice || 0,
            status: "Disponible",
            provider: order.providerName,
            // Required fields with defaults
            model: product.model || "N/A",
            storage: product.storage || "N/A",
            color: product.color || "N/A",
            battery: product.battery ? String(product.battery) : "N/A",
            imei: product.imei || "N/A",
            condition: product.condition || "N/A",
            product_type: product.productCategory || "Celular",
          }

          console.log(`[v0] Inserting to inventory with product_type: ${inventoryData.product_type}`)

          const { error: inventoryError } = await supabase.from("inventory").insert(inventoryData)

          if (inventoryError) {
            console.error("[v0] Error adding inventory item:", inventoryError.message)
            throw inventoryError
          }

          itemsAdded++
          console.log(`[v0] Added inventory item ${i + 1}/${product.quantity}: ${uniqueId}`)

          // Small delay to ensure unique timestamps
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }

      // Then mark the order as received
      const { error } = await supabase
        .from("pending_orders")
        .update({ status: "received", received_date: receivedDate })
        .eq("id", order.id)

      if (error) throw error

      // Update local state
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "received" as const } : o)))

      console.log(`[v0] Order ${order.id} marked as received. Total items added to inventory: ${itemsAdded}`)

      console.log("[v0] Refreshing inventory context...")
      await refreshInventory()
      console.log("[v0] Inventory refreshed successfully")
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
