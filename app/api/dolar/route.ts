import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Fetch data from the external API
    const response = await fetch("https://dolarapi.com/v1/dolares/blue", {
      next: {
        revalidate: 3600, // Revalidate every hour
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NextJS-App/1.0)",
      },
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Validate that we have the expected data structure
    if (!data.compra || !data.venta) {
      throw new Error("Invalid data structure from API")
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching dollar data:", error)

    // Return fallback data instead of error
    const fallbackData = {
      compra: 1150,
      venta: 1200,
      fechaActualizacion: new Date().toISOString(),
      error: true,
      message: "Usando datos de ejemplo - API no disponible",
    }

    return NextResponse.json(fallbackData)
  }
}
