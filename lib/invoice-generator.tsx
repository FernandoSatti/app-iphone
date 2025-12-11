export function generateInvoiceHTML(data: {
  saleId: string
  date: string
  seller: string
  client: string
  paymentType: string
  products: Array<{ number: number; description: string; quantity: number; price: number; total: number }>
  canjeProducts?: Array<{ description: string; quantity: number; price: number; total: number }>
  subtotal: number
  discount: number
  total: number
}) {
  const { saleId, date, seller, client, paymentType, products, canjeProducts = [], subtotal, discount, total } = data

  const productsHTML = products
    .map(
      (product) => `
    <tr>
      <td style="padding: 12px; text-align: center; border-bottom: 1px solid #86efac;">${product.number}</td>
      <td style="padding: 12px; border-bottom: 1px solid #86efac;">${product.description}</td>
      <td style="padding: 12px; text-align: center; border-bottom: 1px solid #86efac;">${product.quantity}</td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #86efac;">$ ${product.price.toFixed(2)}</td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #86efac;">$ ${product.total.toFixed(2)}</td>
    </tr>
  `,
    )
    .join("")

  const canjeHTML =
    canjeProducts.length > 0
      ? canjeProducts
          .map(
            (product, index) => `
    <tr>
      <td style="padding: 12px; text-align: center; border-bottom: 1px solid #86efac;">${products.length + index + 1}</td>
      <td style="padding: 12px; border-bottom: 1px solid #86efac;">${product.description} (Plan Canje)</td>
      <td style="padding: 12px; text-align: center; border-bottom: 1px solid #86efac;">${product.quantity}</td>
      <td style="padding: 12px; text-align: right; color: #dc2626; border-bottom: 1px solid #86efac;">$ -${Math.abs(product.price).toFixed(2)}</td>
      <td style="padding: 12px; text-align: right; color: #dc2626; border-bottom: 1px solid #86efac;">$ -${Math.abs(product.total).toFixed(2)}</td>
    </tr>
  `,
          )
          .join("")
      : ""

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Orden de Venta ${saleId}</title>
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #000;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
        }
        .header-left h1 {
          margin: 0 0 5px 0;
          font-size: 24px;
          font-weight: bold;
        }
        .header-left h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: bold;
        }
        .header-left p {
          margin: 3px 0;
          font-size: 14px;
        }
        .header-right {
          text-align: right;
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 10px;
        }
        .social-info {
          font-size: 12px;
          color: #666;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background-color: #86efac;
          padding: 12px;
          text-align: left;
          font-weight: bold;
        }
        th:first-child, td:first-child {
          text-align: center;
        }
        th:nth-child(3), td:nth-child(3) {
          text-align: center;
        }
        th:nth-child(4), th:nth-child(5), td:nth-child(4), td:nth-child(5) {
          text-align: right;
        }
        .totals {
          margin-top: 40px;
          text-align: right;
        }
        .totals table {
          margin-left: auto;
          width: 300px;
        }
        .totals td {
          padding: 8px;
          border-bottom: none;
        }
        .totals .label {
          text-align: right;
          font-weight: bold;
        }
        .totals .total-row {
          background-color: #86efac;
          font-weight: bold;
          font-size: 16px;
        }
        .footer {
          margin-top: 50px;
          font-size: 11px;
          color: #666;
        }
        .print-button {
          margin: 20px 0;
          padding: 10px 20px;
          background-color: #3b82f6;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }
        .print-button:hover {
          background-color: #2563eb;
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">Imprimir / Guardar como PDF</button>
      
      <div class="header">
        <div class="header-left">
          <h1>Orden de venta</h1>
          <h2>${saleId}</h2>
          <p><strong>Fecha:</strong> ${date}</p>
          <p><strong>Cliente:</strong> ${client}</p>
          <p><strong>Vendedor:</strong> ${seller}</p>
          <p><strong>Tipo de Pago:</strong> ${paymentType}</p>
        </div>
        <div class="header-right">
          <img src="/images/ipro-logo.png" alt="iPro Logo" class="logo" />
          <div class="social-info">
            <p>📷 @iprovacba</p>
            <p>📱 3512453001</p>
            <p>👤 iprovacba</p>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>N°</th>
            <th>Descripción</th>
            <th>Cantidad</th>
            <th>Precio</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${productsHTML}
          ${canjeHTML}
        </tbody>
      </table>

      <div class="totals">
        <table>
          <tr>
            <td class="label">SubTotal</td>
            <td style="text-align: right;">$ ${subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td class="label">Descuento</td>
            <td style="text-align: right;">${discount}%</td>
          </tr>
          <tr class="total-row">
            <td class="label">Total a pagar</td>
            <td style="text-align: right;">$ ${total.toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <div class="footer">
        <p><strong>Valores $ expresados en USD (Dólar estadounidense)</strong></p>
        <p>Documento no válido como factura</p>
      </div>
    </body>
    </html>
  `
}
