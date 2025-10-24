"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-context"
import { CircleUser, Edit2, Save, X } from "lucide-react"
import Image from "next/image"

export default function ProfileView() {
  const { user, logout } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState(user?.name || "")

  const handleSave = () => {
    // In a real app, this would update the user profile
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedName(user?.name || "")
    setIsEditing(false)
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Mi Perfil</h1>
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          Activo
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                <CircleUser className="w-12 h-12 text-gray-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">{user.name}</CardTitle>
            <CardDescription>Vendedor - iPro</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" value={user.username} disabled className="bg-gray-50" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={isEditing ? editedName : user.name}
                  onChange={(e) => setEditedName(e.target.value)}
                  disabled={!isEditing}
                  className={isEditing ? "" : "bg-gray-50"}
                />
                {!isEditing ? (
                  <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleSave}
                      className="text-green-600 hover:text-green-700 bg-transparent"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCancel}
                      className="text-red-600 hover:text-red-700 bg-transparent"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Input value="Vendedor" disabled className="bg-gray-50" />
            </div>
          </CardContent>
        </Card>

        {/* Company Information Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Image src="/images/ipro-logo.png" alt="iPro Logo" width={100} height={50} className="object-contain" />
            </div>
            <CardTitle>Información de la Empresa</CardTitle>
            <CardDescription>iPro - Venta de iPhones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-xs text-gray-500">EMPRESA</Label>
                <p className="font-medium">iPro</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">SECTOR</Label>
                <p className="font-medium">Tecnología</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">ESPECIALIDAD</Label>
                <p className="font-medium">Venta de iPhones</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">UBICACIÓN</Label>
                <p className="font-medium">Argentina</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session Information Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información de Sesión</CardTitle>
            <CardDescription>Detalles de tu sesión actual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <Label className="text-xs text-gray-500">USUARIO ACTIVO</Label>
                <p className="font-medium">{user.name}</p>
              </div>
              <div>
                <Label className="text-xs text-gray-500">ESTADO</Label>
                <Badge className="bg-green-100 text-green-800">Conectado</Badge>
              </div>
              <div>
                <Label className="text-xs text-gray-500">PERMISOS</Label>
                <p className="font-medium">Vendedor Autorizado</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <Button variant="destructive" onClick={logout} className="w-full md:w-auto">
                Cerrar Sesión
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
