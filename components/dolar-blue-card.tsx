"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CircleDollarSign, AlertTriangle } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type DolarData = {
  compra: number
  venta: number
  fechaActualizacion: string
  error?: boolean
  message?: string
}

export function DolarBlueCard() {
  const [dolarData, setDolarData] = useState<DolarData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDolarData = async () => {
      try {
        const res = await fetch("/api/dolar")
        const data = await res.json()
        setDolarData(data)
      } catch (err) {
        console.error("Error fetching dollar data:", err)
        // Set fallback data if fetch fails completely
        setDolarData({
          compra: 1150,
          venta: 1200,
          fechaActualizacion: new Date().toISOString(),
          error: true,
          message: "Datos no disponibles - usando valores de ejemplo",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDolarData()
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value)
  }

  const getFormattedDate = () => {
    if (!dolarData?.fechaActualizacion) return "cargando..."
    try {
      return `Actualizado ${format(new Date(dolarData.fechaActualizacion), "dd/MM/yyyy, HH:mm'hs'", { locale: es })}`
    } catch {
      return "Fecha inválida"
    }
  }

  const getDescription = () => {
    if (isLoading) return "Cargando datos..."
    if (dolarData?.error) return dolarData.message || "Error al cargar datos"
    return getFormattedDate()
  }

  return (
    <Card className={`${dolarData?.error ? "bg-yellow-50 border-yellow-200" : "bg-cyan-50 border-cyan-200"}`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${dolarData?.error ? "text-yellow-800" : "text-cyan-800"}`}>
          {dolarData?.error ? <AlertTriangle className="h-6 w-6" /> : <CircleDollarSign className="h-6 w-6" />}
          Dólar Blue
        </CardTitle>
        <CardDescription className={dolarData?.error ? "text-yellow-700" : "text-cyan-700"}>
          {getDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-around text-center">
          <div>
            <p className={`text-sm ${dolarData?.error ? "text-yellow-600" : "text-cyan-600"}`}>Compra</p>
            <p className={`text-2xl font-bold ${dolarData?.error ? "text-yellow-900" : "text-cyan-900"}`}>
              {dolarData ? formatCurrency(dolarData.compra) : "..."}
            </p>
          </div>
          <div>
            <p className={`text-sm ${dolarData?.error ? "text-yellow-600" : "text-cyan-600"}`}>Venta</p>
            <p className={`text-2xl font-bold ${dolarData?.error ? "text-yellow-900" : "text-cyan-900"}`}>
              {dolarData ? formatCurrency(dolarData.venta) : "..."}
            </p>
          </div>
        </div>
        {!dolarData?.error && (
          <a
            href="https://dolarhoy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-600 hover:underline mt-2 block text-center"
          >
            Fuente: dolarapi.com
          </a>
        )}
        {dolarData?.error && (
          <p className="text-xs text-yellow-600 mt-2 text-center">
            Los datos se actualizarán cuando la API esté disponible
          </p>
        )}
      </CardContent>
    </Card>
  )
}
