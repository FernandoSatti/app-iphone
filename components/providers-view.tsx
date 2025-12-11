"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Trash2, Building2, Phone, Mail } from "lucide-react"
import { useProviders } from "@/components/provider-context"
import { formatDisplayDate } from "@/lib/date-helpers"

const ProvidersView = () => {
  const { providers, removeProvider, searchProviders } = useProviders()
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProviders = searchProviders(searchTerm)

  const handleDeleteProvider = (providerId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este proveedor?")) {
      removeProvider(providerId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proveedores</h1>
          <p className="text-gray-600 mt-2">Gestión de proveedores registrados</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-blue-600">{filteredProviders.length}</p>
          <p className="text-sm text-gray-500">Proveedores mostrados</p>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Buscar proveedores por nombre, teléfono o email..."
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
              <Building2 className="h-4 w-4" />
              Total Proveedores
            </CardTitle>
            <div className="text-2xl font-bold text-blue-900">{providers.length}</div>
          </CardHeader>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Con Email
            </CardTitle>
            <div className="text-2xl font-bold text-green-900">{providers.filter((p) => p.email).length}</div>
          </CardHeader>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contactos Activos
            </CardTitle>
            <div className="text-2xl font-bold text-purple-900">{providers.length}</div>
          </CardHeader>
        </Card>
      </div>

      {/* Tabla de proveedores */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProviders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? (
                <p>No se encontraron proveedores que coincidan con la búsqueda.</p>
              ) : (
                <>
                  <p>No hay proveedores registrados.</p>
                  <p className="text-sm mt-2">{'Ve a "Proveedores > Nuevo Proveedor" para agregar proveedores.'}</p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {filteredProviders.map((provider) => (
                  <div key={provider.id} className="border rounded-lg p-3 bg-white shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-500 flex-shrink-0" />
                          <p className="font-medium text-base truncate">{provider.name}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-700">{provider.phone}</span>
                        </div>
                        {provider.email && (
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <a href={`mailto:${provider.email}`} className="text-sm text-blue-600 truncate">
                              {provider.email}
                            </a>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">{formatDisplayDate(provider.dateAdded)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => handleDeleteProvider(provider.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-900">
                      <TableHead className="text-white font-semibold">Nombre</TableHead>
                      <TableHead className="text-white font-semibold">Teléfono</TableHead>
                      <TableHead className="text-white font-semibold">Email</TableHead>
                      <TableHead className="text-white font-semibold">Fecha Registro</TableHead>
                      <TableHead className="text-white font-semibold w-[5%]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProviders.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell className="font-medium text-base">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-500" />
                            {provider.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-base">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-500" />
                            {provider.phone}
                          </div>
                        </TableCell>
                        <TableCell className="text-base">
                          {provider.email ? (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <a href={`mailto:${provider.email}`} className="text-blue-600 hover:underline">
                                {provider.email}
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{formatDisplayDate(provider.dateAdded)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteProvider(provider.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProvidersView
