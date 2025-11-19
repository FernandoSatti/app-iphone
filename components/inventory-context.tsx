"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

export type InventoryItem = {
  id: string
  model: string
  storage: string
  color: string
  battery: number
  imei: string
  costPrice: number
  salePrice: number
  condition: "Nuevo" | "Usado" | "Refurbished"
  status: "Disponible" | "Vendido" | "Reservado"
  provider: string
  dateAdded: string
  productType: string
}

type InventoryContextType = {
  inventory: InventoryItem[]
  addInventoryItem: (item: Omit<InventoryItem, "id" | "dateAdded">) => Promise<void>
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>
  removeInventoryItem: (id: string) => Promise<void>
  getAvailableItems: () => InventoryItem[]
  markItemAsSold: (id: string) => Promise<void>
  markItemsAsSold: (ids: string[]) => Promise<void>
  getItemById: (id: string) => InventoryItem | undefined
  refreshInventory: () => Promise<void>
  isLoading: boolean
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

const getCurrentLocalDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadInventory()
  }, [])

  const loadInventory = async () => {
    try {
      console.log("[v0] Starting inventory load...")
      const { data, error } = await supabase.from("inventory").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Supabase error response:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        })
        throw error
      }

      console.log("[v0] Inventory loaded successfully:", data?.length || 0, "items")

      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        model: item.model,
        storage: item.storage,
        color: item.color || "",
        battery: item.battery || 0,
        imei: item.imei || "",
        costPrice: item.cost_price,
        salePrice: item.sale_price,
        condition: item.condition,
        status: item.status,
        provider: item.provider || "",
        dateAdded: item.created_at?.split("T")[0] || getCurrentLocalDate(),
        productType: item.product_type || "Celular",
      }))

      setInventory(mappedData)
    } catch (error: any) {
      console.error("[v0] Error loading inventory:", error)
      if (error?.message) console.error("[v0] Error message:", error.message)
      if (error?.status) console.error("[v0] HTTP status:", error.status)
    } finally {
      setIsLoading(false)
    }
  }

  const addInventoryItem = async (item: Omit<InventoryItem, "id" | "dateAdded">) => {
    try {
      const uniqueId = `inv${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const dateAdded = getCurrentLocalDate()

      const { error } = await supabase.from("inventory").insert({
        id: uniqueId,
        model: item.model,
        storage: item.storage,
        color: item.color,
        battery: item.battery,
        imei: item.imei,
        cost_price: item.costPrice,
        sale_price: item.salePrice,
        condition: item.condition,
        status: item.status,
        provider: item.provider,
        product_type: item.productType,
      })

      if (error) throw error

      // Update local state
      const newItem: InventoryItem = {
        ...item,
        id: uniqueId,
        dateAdded,
      }
      setInventory((prev) => [newItem, ...prev])
    } catch (error) {
      console.error("[v0] Error adding inventory item:", error)
      throw error
    }
  }

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      // Map frontend fields to database fields
      const dbUpdates: any = {}
      if (updates.model !== undefined) dbUpdates.model = updates.model
      if (updates.storage !== undefined) dbUpdates.storage = updates.storage
      if (updates.color !== undefined) dbUpdates.color = updates.color
      if (updates.battery !== undefined) dbUpdates.battery = updates.battery
      if (updates.imei !== undefined) dbUpdates.imei = updates.imei
      if (updates.costPrice !== undefined) dbUpdates.cost_price = updates.costPrice
      if (updates.salePrice !== undefined) dbUpdates.sale_price = updates.salePrice
      if (updates.condition !== undefined) dbUpdates.condition = updates.condition
      if (updates.status !== undefined) dbUpdates.status = updates.status
      if (updates.provider !== undefined) dbUpdates.provider = updates.provider
      if (updates.productType !== undefined) dbUpdates.product_type = updates.productType

      const { error } = await supabase.from("inventory").update(dbUpdates).eq("id", id)

      if (error) throw error

      // Update local state
      setInventory((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)))
    } catch (error) {
      console.error("[v0] Error updating inventory item:", error)
      throw error
    }
  }

  const removeInventoryItem = async (id: string) => {
    try {
      const { error } = await supabase.from("inventory").delete().eq("id", id)

      if (error) throw error

      // Update local state
      setInventory((prev) => prev.filter((item) => item.id !== id))
    } catch (error) {
      console.error("[v0] Error removing inventory item:", error)
      throw error
    }
  }

  const getAvailableItems = () => {
    return inventory.filter((item) => item.status === "Disponible")
  }

  const markItemAsSold = async (id: string) => {
    await updateInventoryItem(id, { status: "Vendido" })
  }

  const markItemsAsSold = async (ids: string[]) => {
    try {
      const { error } = await supabase.from("inventory").update({ status: "Vendido" }).in("id", ids)

      if (error) throw error

      // Update local state
      setInventory((prev) =>
        prev.map((item) => (ids.includes(item.id) ? { ...item, status: "Vendido" as const } : item)),
      )
    } catch (error) {
      console.error("[v0] Error marking items as sold:", error)
      throw error
    }
  }

  const getItemById = (id: string) => {
    return inventory.find((item) => item.id === id)
  }

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        addInventoryItem,
        updateInventoryItem,
        removeInventoryItem,
        getAvailableItems,
        markItemAsSold,
        markItemsAsSold,
        getItemById,
        refreshInventory: loadInventory,
        isLoading,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const context = useContext(InventoryContext)
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider")
  }
  return context
}
