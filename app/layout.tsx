import type React from "react"
import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"
import { InventoryProvider } from "@/components/inventory-context"
import { ClientProvider } from "@/components/client-context"
import { AccountProvider } from "@/components/account-context"
import { ProviderProvider } from "@/components/provider-context"
import { CashProvider } from "@/components/cash-context"
import { PendingOrdersProvider } from "@/components/pending-orders-context"
import { AuthProvider } from "@/components/auth-context"
import { ProductCategoriesProvider } from "@/components/product-categories-context"
import { ProductAttributesProvider } from "@/components/product-attributes-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "iPhone Sales Dashboard",
  description: "Gestión de ventas de iPhones",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ProductCategoriesProvider>
          <ProductAttributesProvider>
            <AuthProvider>
              <InventoryProvider>
                <ClientProvider>
                  <ProviderProvider>
                    <AccountProvider>
                      <CashProvider>
                        <PendingOrdersProvider>{children}</PendingOrdersProvider>
                      </CashProvider>
                    </AccountProvider>
                  </ProviderProvider>
                </ClientProvider>
              </InventoryProvider>
            </AuthProvider>
          </ProductAttributesProvider>
        </ProductCategoriesProvider>
      </body>
    </html>
  )
}
