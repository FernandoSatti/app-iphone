"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, PlusCircle, Search } from 'lucide-react';
import { useProviders } from "@/components/provider-context";

interface ProvidersModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function ProvidersModal({ isOpen, onOpenChange }: ProvidersModalProps) {
  const { providers, addProvider, removeProvider, searchProviders } = useProviders();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: ""
  });

  const filteredProviders = searchProviders(searchTerm);

  const handleAddProvider = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      alert("Por favor, complete al menos el nombre y teléfono");
      return;
    }

    addProvider(formData);
    setFormData({ name: "", phone: "", email: "" });
    setShowAddForm(false);
  };

  const handleDeleteProvider = (providerId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este proveedor?")) {
      removeProvider(providerId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[80vw] max-h-[90vh] p-0 flex flex-col bg-slate-50">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold">Nuevo Proveedor</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Formulario para agregar proveedor */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">Agregar Nuevo Proveedor</h3>
              <form onSubmit={handleAddProvider} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre del proveedor"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+54 11 1234-5678"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="contacto@proveedor.com"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="bg-green-600 hover:bg-green-700 text-slate-50">
                    Agregar Proveedor
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setFormData({ name: "", phone: "", email: "" })}>
                    Limpiar
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 border-t flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
