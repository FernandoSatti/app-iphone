"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useClients } from "@/components/client-context"

interface ClientsModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export function ClientsModal({ isOpen, onOpenChange }: ClientsModalProps) {
  const { addClient } = useClients()
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  })

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.phone) {
      alert("Por favor, complete todos los campos (Nombre y Teléfono)")
      return
    }

    addClient(formData)
    setFormData({ name: "", phone: "" })
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Nuevo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleAddClient} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nombre completo"
              required
            />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono *</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+54 11 1234-5678"
              required
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-slate-50">
              Agregar Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { ClientsModal as AddClientModal }
