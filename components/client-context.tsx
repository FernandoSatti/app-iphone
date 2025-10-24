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

export type Client = {
  id: string
  name: string
  phone: string
  dateAdded: string
}

type ClientContextType = {
  clients: Client[]
  addClient: (client: Omit<Client, "id" | "dateAdded">) => Promise<void>
  removeClient: (id: string) => Promise<void>
  searchClients: (term: string) => Client[]
  isLoading: boolean
}

const ClientContext = createContext<ClientContextType | undefined>(undefined)

export function ClientProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false })

      if (error) throw error

      const mappedData = (data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        phone: item.phone || "",
        dateAdded: item.date_added || item.created_at,
      }))

      setClients(mappedData)
    } catch (error) {
      console.error("[v0] Error loading clients:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const addClient = async (client: Omit<Client, "id" | "dateAdded">) => {
    try {
      const uniqueId = `client_${Date.now()}`
      const dateAdded = getCurrentLocalDate()

      const { error } = await supabase.from("clients").insert({
        id: uniqueId,
        name: client.name,
        phone: client.phone,
        date_added: dateAdded,
      })

      if (error) throw error

      const newClient: Client = {
        ...client,
        id: uniqueId,
        dateAdded,
      }
      setClients((prev) => [newClient, ...prev])
    } catch (error) {
      console.error("[v0] Error adding client:", error)
      throw error
    }
  }

  const removeClient = async (id: string) => {
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id)

      if (error) throw error

      setClients((prev) => prev.filter((client) => client.id !== id))
    } catch (error) {
      console.error("[v0] Error removing client:", error)
      throw error
    }
  }

  const searchClients = (term: string) => {
    if (!term) return clients
    return clients.filter(
      (client) => client.name.toLowerCase().includes(term.toLowerCase()) || client.phone.includes(term),
    )
  }

  return (
    <ClientContext.Provider
      value={{
        clients,
        addClient,
        removeClient,
        searchClients,
        isLoading,
      }}
    >
      {children}
    </ClientContext.Provider>
  )
}

export function useClients() {
  const context = useContext(ClientContext)
  if (context === undefined) {
    throw new Error("useClients must be used within a ClientProvider")
  }
  return context
}
