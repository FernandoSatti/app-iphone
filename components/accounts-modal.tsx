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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, DollarSign, Calendar, User } from 'lucide-react';
import { useAccounts } from "@/components/account-context";
import { useClients } from "@/components/client-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AccountsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AccountsModal({ isOpen, onOpenChange }: AccountsModalProps) {
  const { accounts, addPayment, getAccountsWithBalance } = useAccounts();
  const { clients } = useClients();
  const [selectedClientId, setSelectedClientId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const accountsWithBalance = getAccountsWithBalance();
  const totalPendingBalance = accountsWithBalance.reduce((sum, acc) => sum + acc.balance, 0);

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClientId || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert("Por favor, seleccione un cliente y ingrese un monto válido");
      return;
    }

    const amount = parseFloat(paymentAmount);
    const description = paymentDescription || `Pago recibido - ${new Date().toLocaleDateString()}`;
    
    addPayment(selectedClientId, amount, description);
    
    // Reset form
    setSelectedClientId("");
    setPaymentAmount("");
    setPaymentDescription("");
    setShowPaymentForm(false);
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || "Cliente no encontrado";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Estados de Cuenta
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            
            {/* Resumen general */}
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-red-50 border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Total Pendiente
                  </CardTitle>
                  <div className="text-2xl font-bold text-red-900">
                    {formatCurrency(totalPendingBalance)}
                  </div>
                </CardHeader>
              </Card>
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Clientes con Deuda
                  </CardTitle>
                  <div className="text-2xl font-bold text-blue-900">
                    {accountsWithBalance.length}
                  </div>
                </CardHeader>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Cuentas Activas
                  </CardTitle>
                  <div className="text-2xl font-bold text-green-900">
                    {accounts.length}
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Botón para registrar pago */}
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Cuentas Corrientes</h3>
              <Button 
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                className="bg-green-600 hover:bg-green-700"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            </div>

            {/* Formulario para registrar pago */}
            {showPaymentForm && (
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-lg">Registrar Nuevo Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddPayment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="client">Cliente *</Label>
                        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar cliente..." />
                          </SelectTrigger>
                          <SelectContent>
                            {accountsWithBalance.map((account) => (
                              <SelectItem key={account.clientId} value={account.clientId}>
                                {account.clientName} - Debe: {formatCurrency(account.balance)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="amount">Monto del Pago *</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Descripción</Label>
                        <Input
                          id="description"
                          value={paymentDescription}
                          onChange={(e) => setPaymentDescription(e.target.value)}
                          placeholder="Pago en efectivo, transferencia, etc."
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="bg-green-600 hover:bg-green-700">
                        Registrar Pago
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowPaymentForm(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Lista de cuentas */}
            <div className="space-y-4">
              {accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay cuentas corrientes registradas.</p>
                  <p className="text-sm mt-2">Las cuentas se crean automáticamente cuando se realizan ventas a crédito.</p>
                </div>
              ) : (
                accounts.map((account) => (
                  <Card key={account.clientId} className={account.balance > 0 ? "border-red-200" : "border-gray-200"}>
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="h-5 w-5" />
                          {account.clientName}
                        </CardTitle>
                        <div className="text-right">
                          <Badge className={account.balance > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                            Saldo: {formatCurrency(account.balance)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-100">
                              <TableHead className="font-semibold">Fecha</TableHead>
                              <TableHead className="font-semibold">Tipo</TableHead>
                              <TableHead className="font-semibold">Descripción</TableHead>
                              <TableHead className="font-semibold text-right">Debe</TableHead>
                              <TableHead className="font-semibold text-right">Haber</TableHead>
                              <TableHead className="font-semibold text-right">Saldo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {account.transactions.map((transaction, index) => {
                              // Calcular saldo acumulado hasta esta transacción
                              const runningBalance = account.transactions
                                .slice(0, index + 1)
                                .reduce((sum, t) => sum + t.amount, 0);
                              
                              return (
                                <TableRow key={transaction.id}>
                                  <TableCell className="text-sm">{formatDate(transaction.date)}</TableCell>
                                  <TableCell>
                                    <Badge variant={transaction.type === 'sale' ? 'destructive' : 'default'}>
                                      {transaction.type === 'sale' ? 'Venta' : 'Pago'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-sm">{transaction.description}</TableCell>
                                  <TableCell className="text-right font-medium">
                                    {transaction.amount > 0 ? formatCurrency(transaction.amount) : '--'}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    {transaction.amount < 0 ? formatCurrency(Math.abs(transaction.amount)) : '--'}
                                  </TableCell>
                                  <TableCell className="text-right font-bold">
                                    <span className={runningBalance > 0 ? 'text-red-600' : 'text-green-600'}>
                                      {formatCurrency(runningBalance)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
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
