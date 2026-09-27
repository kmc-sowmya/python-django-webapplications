import { Box, Headphones, ShoppingBag, Tag, Watch } from 'lucide-react'
import { formatDate, fullCurrency, initials } from '../lib/format'

const categoryIcons = { Accessories: Watch, Audio: Headphones, Apparel: Tag, Home: Box }
const statusLabels = {
  processing: 'In progress',
  shipped: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function ProductIcon({ category, size = 18 }) {
  const Icon = categoryIcons[category] || Box
  return <Icon size={size} />
}

export function SalesTable({ items }) {
  if (!items.length) {
    return <div className="empty-state"><ShoppingBag size={22} /><strong>No sales recorded</strong><span>Sales you record will appear here.</span></div>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Sale #</th><th>Customer</th><th>Date</th><th>Status</th><th>Items</th><th className="align-right">Total</th></tr></thead>
        <tbody>{items.map((order) => (
          <tr key={order.id}>
            <td className="order-reference">{order.reference}</td>
            <td>
              <div className="customer-cell">
                <span className="customer-avatar">{initials(order.customer)}</span>
                <span><strong>{order.customer}</strong><small>{order.email || 'No email saved'}</small></span>
              </div>
            </td>
            <td>{formatDate(order.createdAt)}</td>
            <td><span className={`status-pill ${order.status}`}><i />{statusLabels[order.status] || order.status}</span></td>
            <td>{order.itemCount}</td>
            <td className="align-right amount-cell">{fullCurrency.format(order.total)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export function ProductsTable({ items }) {
  if (!items.length) {
    return <div className="empty-state"><Box size={22} /><strong>No products added</strong><span>Add a product to start tracking stock.</span></div>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Product</th><th>Product code</th><th>Category</th><th>Price</th><th>In stock</th><th>Status</th></tr></thead>
        <tbody>{items.map((product) => {
          const statusClass = product.stockStatus === 'In stock' ? 'available' : product.stockStatus === 'Low stock' ? 'attention' : 'unavailable'
          const statusLabel = product.stockStatus === 'Out of stock' ? 'Out of stock' : product.stockStatus
          return (
            <tr key={product.id}>
              <td><div className="product-cell"><span className={`product-thumb ${product.category.toLowerCase()}`}><ProductIcon category={product.category} /></span><strong>{product.name}</strong></div></td>
              <td className="sku-cell">{product.sku}</td>
              <td>{product.category}</td>
              <td className="amount-cell">{fullCurrency.format(product.price)}</td>
              <td>{product.stock}</td>
              <td><span className={`stock-status ${statusClass}`}><i />{statusLabel}</span></td>
            </tr>
          )
        })}</tbody>
      </table>
    </div>
  )
}
