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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory, type InventoryItem } from "@/components/inventory-context";
import { useProviders } from "@/components/provider-context";

interface InventoryModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const storageOptions = ["64GB", "128GB", "256GB", "512GB", "1TB"];
const colors = ["Negro", "Blanco", "Azul", "Rosa", "Morado", "Rojo", "Verde", "Amarillo", "Natural Titanium", "Blue Titanium", "White Titanium", "Black Titanium"];
const conditions = ["Nuevo", "Usado", "Refurbished"] as const;

export function InventoryModal({ isOpen, onOpenChange }: InventoryModalProps) {
  const { addInventoryItem } = useInventory();
  const { providers } = useProviders();
  const [formData, setFormData] = useState({
    model: "",
    storage: "",
    color: "",
    battery: "",
    imei: "",
    costPrice: "",
    salePrice: "",
    condition: "" as InventoryItem['condition'] | "",
    provider: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.model || !formData.storage || !formData.color || !formData.battery || 
        !formData.imei || !formData.costPrice || !formData.salePrice || !formData.condition || !formData.provider) {
      alert("Por favor, complete todos los campos");
      return;
    }

    addInventoryItem({
      model: formData.model,
      storage: formData.storage,
      color: formData.color,
      battery: parseInt(formData.battery),
      imei: formData.imei,
      costPrice: parseFloat(formData.costPrice),
      salePrice: parseFloat(formData.salePrice),
      condition: formData.condition as InventoryItem['condition'],
      provider: formData.provider,
      status: 'Disponible'
    });

    // Reset form
    setFormData({
      model: "",
      storage: "",
      color: "",
      battery: "",
      imei: "",
      costPrice: "",
      salePrice: "",
      condition: "",
      provider: ""
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo Producto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="iPhone 15 Pro Max"
              />
            </div>
            <div>
              <Label htmlFor="storage">Almacenamiento</Label>
              <Select value={formData.storage} onValueChange={(value) => setFormData(prev => ({ ...prev, storage: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar almacenamiento" />
                </SelectTrigger>
                <SelectContent>
                  {storageOptions.map((storage) => (
                    <SelectItem key={storage} value={storage}>{storage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="color">Color</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar color" />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color} value={color}>{color}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="condition">Estado</Label>
              <Select value={formData.condition} onValueChange={(value) => setFormData(prev => ({ ...prev, condition: value as InventoryItem['condition'] }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((condition) => (
                    <SelectItem key={condition} value={condition}>{condition}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="battery">Batería (%)</Label>
              <Input
                id="battery"
                type="number"
                min="1"
                max="100"
                value={formData.battery}
                onChange={(e) => setFormData(prev => ({ ...prev, battery: e.target.value }))}
                placeholder="85"
              />
            </div>
            <div>
              <Label htmlFor="imei">IMEI</Label>
              <Input
                id="imei"
                value={formData.imei}
                onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                placeholder="123456789012345"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="provider">Proveedor</Label>
            <Select value={formData.provider} onValueChange={(value) => setFormData(prev => ({ ...prev, provider: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar proveedor" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.name}>{provider.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="costPrice">Precio de Costo ($)</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                value={formData.costPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, costPrice: e.target.value }))}
                placeholder="500"
              />
            </div>
            <div>
              <Label htmlFor="salePrice">Precio de Venta ($)</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                value={formData.salePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, salePrice: e.target.value }))}
                placeholder="700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Agregar Producto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
