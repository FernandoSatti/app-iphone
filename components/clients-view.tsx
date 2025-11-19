"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Trash2, User, Phone, Calendar } from "lucide-react"
import { useClients } from "@/components/client-context"
import { formatDisplayDate } from "@/lib/date-helpers"

const ClientsView = () => {
  const { clients, removeClient, searchClients } = useClients()
  const [searchTerm, setSearchTerm] = useState("")

  const filteredClients = searchClients(searchTerm)

  const handleDeleteClient = (clientId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
      removeClient(clientId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-gray-600 mt-2">Gestión de clientes registrados</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">{filteredClients.length}</p>
          <p className="text-sm text-gray-500">Clientes mostrados</p>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar clientes por nombre o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <User className="h-4 w-4" />
              Total Clientes
            </CardTitle>
            <div className="text-2xl font-bold text-blue-900">{clients.length}</div>
          </CardHeader>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contactos Activos
            </CardTitle>
            <div className="text-2xl font-bold text-green-900">{clients.length}</div>
          </CardHeader>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Registros Este Mes
            </CardTitle>
            <div className="text-2xl font-bold text-purple-900">
              {
                clients.filter((c) => {
                  const clientDate = new Date(c.dateAdded)
                  const now = new Date()
                  return clientDate.getMonth() === now.getMonth() && clientDate.getFullYear() === now.getFullYear()
                }).length
              }
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Tabla de clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? (
                <p>No se encontraron clientes que coincidan con la búsqueda.</p>
              ) : (
                <>
                  <p>No hay clientes registrados.</p>
                  <p className="text-sm mt-2">{'Ve a "Clientes > Nuevo Cliente" para agregar clientes.'}</p>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-900">
                    <TableHead className="text-white font-semibold">Nombre</TableHead>
                    <TableHead className="text-white font-semibold">Teléfono</TableHead>
                    <TableHead className="text-white font-semibold">Fecha Registro</TableHead>
                    <TableHead className="text-white font-semibold w-[5%]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium text-base">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          {client.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-base">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                            {client.phone}
                          </a>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{formatDisplayDate(client.dateAdded)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteClient(client.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ClientsView
