"use client";

import { useState, useEffect } from "react";
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
import { useProductCategories } from "@/components/product-categories-context";
import { useProductAttributes } from "@/components/product-attributes-context";
import { Plus } from 'lucide-react';
import { ProvidersModal } from "@/components/providers-modal";

interface InventoryModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialCategory?: string;
}

export function InventoryModal({ isOpen, onOpenChange, initialCategory }: InventoryModalProps) {
  const { addInventoryItem } = useInventory();
  const { providers } = useProviders();
  const { categories, getCategoryByName } = useProductCategories();
  const { getAttributesByType } = useProductAttributes();
  const [isProvidersModalOpen, setIsProvidersModalOpen] = useState(false);

  const storageOptions = getAttributesByType('storage').map(attr => attr.value);
  const colors = getAttributesByType('color').map(attr => attr.value);
  const conditions = getAttributesByType('condition').map(attr => attr.value);

  const [formData, setFormData] = useState({
    productType: initialCategory || "Celular",
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

  useEffect(() => {
    if (isOpen) {
      setFormData({
        productType: initialCategory || "Celular",
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
    }
  }, [isOpen, initialCategory]);

  const selectedCategory = getCategoryByName(formData.productType);
  const activeFields = selectedCategory?.fields || {
    model: true,
    storage: true,
    color: true,
    condition: true,
    battery: true,
    imei: true,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const requiredFieldsValid = 
      formData.model &&
      formData.costPrice &&
      formData.salePrice &&
      formData.condition &&
      formData.provider &&
      (!activeFields.storage || formData.storage) &&
      (!activeFields.color || formData.color) &&
      (!activeFields.battery || formData.battery) &&
      (!activeFields.imei || formData.imei);

    if (!requiredFieldsValid) {
      alert("Por favor, complete todos los campos requeridos");
      return;
    }

    addInventoryItem({
      productType: formData.productType,
      model: formData.model,
      storage: formData.storage || "N/A",
      color: formData.color || "N/A",
      battery: formData.battery ? parseInt(formData.battery) : 0,
      imei: formData.imei || "N/A",
      costPrice: parseFloat(formData.costPrice),
      salePrice: parseFloat(formData.salePrice),
      condition: formData.condition as InventoryItem['condition'],
      provider: formData.provider,
      status: 'Disponible'
    });

    onOpenChange(false);
  };

  const showCategorySelector = !!initialCategory;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-50">
        <DialogHeader>
          <DialogTitle>{initialCategory ? `Nuevo ${initialCategory}` : "Nuevo Producto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {showCategorySelector && (
            <div>
              <Label htmlFor="productType">Tipo de Producto</Label>
              <Select value={formData.productType} onValueChange={(value) => setFormData(prev => ({ ...prev, productType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            
            {activeFields.storage && (
              <div>
                <Label htmlFor="storage">Almacenamiento</Label>
                <Select value={formData.storage} onValueChange={(value) => setFormData(prev => ({ ...prev, storage: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageOptions.map((storage) => (
                      <SelectItem key={storage} value={storage}>{storage}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {activeFields.color && (
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
            )}
            
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
            {activeFields.battery && (
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
            )}
            
            {activeFields.imei && (
              <div>
                <Label htmlFor="imei">IMEI</Label>
                <Input
                  id="imei"
                  value={formData.imei}
                  onChange={(e) => setFormData(prev => ({ ...prev, imei: e.target.value }))}
                  placeholder="123456789012345"
                />
              </div>
            )}
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

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="provider">Proveedor</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsProvidersModalOpen(true)}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-slate-50">
              Agregar Producto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      
      <ProvidersModal 
        isOpen={isProvidersModalOpen}
        onOpenChange={setIsProvidersModalOpen}
      />
    </Dialog>
  );
}
