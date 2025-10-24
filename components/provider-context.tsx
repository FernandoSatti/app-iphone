"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

const getCurrentLocalDate = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export type Provider = {
  id: string
  name: string
  phone: string
  email?: string
  dateAdded: string
}

type ProviderContextType = {
  providers: Provider[]
  addProvider: (provider: Omit<Provider, "id" | "dateAdded">) => Promise<void>
  removeProvider: (id: string) => Promise<void>
  searchProviders: (term: string) => Provider[]
  isLoading: boolean
}

const ProviderContext = createContext<ProviderContextType | undefined>(undefined)

export function ProviderProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadProviders()
  }, [])

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase.from("providers").select("*").order("created_at", { ascending: false })

      if (error) throw error

      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phone: item.phone || "",
        email: item.email || "",
        dateAdded: item.date_added || item.created_at,
      }))

      setProviders(mappedData)
    } catch (error) {
      console.error("[v0] Error loading providers:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addProvider = async (provider: Omit<Provider, "id" | "dateAdded">) => {
    try {
      const uniqueId = `provider_${Date.now()}`
      const dateAdded = getCurrentLocalDate()

      const { error } = await supabase.from("providers").insert({
        id: uniqueId,
        name: provider.name,
        phone: provider.phone,
        email: provider.email || null,
        date_added: dateAdded,
      })

      if (error) throw error

      const newProvider: Provider = {
        ...provider,
        id: uniqueId,
        dateAdded,
      }
      setProviders((prev) => [newProvider, ...prev])
    } catch (error) {
      console.error("[v0] Error adding provider:", error)
      throw error
    }
  }

  const removeProvider = async (id: string) => {
    try {
      const { error } = await supabase.from("providers").delete().eq("id", id)

      if (error) throw error

      setProviders((prev) => prev.filter((provider) => provider.id !== id))
    } catch (error) {
      console.error("[v0] Error removing provider:", error)
      throw error
    }
  }

  const searchProviders = (term: string) => {
    if (!term) return providers
    return providers.filter(
      (provider) =>
        provider.name.toLowerCase().includes(term.toLowerCase()) ||
        provider.phone.includes(term) ||
        (provider.email && provider.email.toLowerCase().includes(term.toLowerCase())),
    )
  }

  return (
    <ProviderContext.Provider
      value={{
        providers,
        addProvider,
        removeProvider,
        searchProviders,
        isLoading,
      }}
    >
      {children}
    </ProviderContext.Provider>
  )
}

export function useProviders() {
  const context = useContext(ProviderContext)
  if (context === undefined) {
    throw new Error("useProviders must be used within a ProviderProvider")
  }
  return context
}
