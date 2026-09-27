import { useEffect, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowDownUp,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Plus,
  Search,
  ShoppingBag,
  Tag,
} from 'lucide-react'
import './App.css'
import EntryModal from './components/EntryModal.jsx'
import StoreSidebar from './components/StoreSidebar.jsx'
import { ProductIcon, ProductsTable, SalesTable } from './components/StoreTables.jsx'
import { formatDate, currency, fullCurrency } from './lib/format.js'
import { api, fetchStoreData } from './lib/storeApi.js'

const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()

function App() {
  const [section, setSection] = useState('overview')
  const [summary, setSummary] = useState(null)
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [apiError, setApiError] = useState('')
  const [query, setQuery] = useState('')
  const [orderStatus, setOrderStatus] = useState('all')
  const [modal, setModal] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  function applyStoreData([summaryData, orderData, productData]) {
    setSummary(summaryData)
    setOrders(orderData.results)
    setProducts(productData.results)
    setApiError('')
  }

  async function loadData() {
    try {
      applyStoreData(await fetchStoreData())
    } catch {
      setApiError('Store data is unavailable. Check the API or try again.')
    }
  }

  useEffect(() => {
    let active = true
    let attempts = 0
    let retryTimer
    const connect = () => {
      fetchStoreData().then(
        (data) => { if (active) applyStoreData(data) },
        () => {
          if (!active) return
          if (attempts < 4) {
            attempts += 1
            retryTimer = window.setTimeout(connect, attempts * 400)
          } else {
            setApiError('Store data is unavailable. Check the API or try again.')
          }
        },
      )
    }
    connect()
    return () => {
      active = false
      window.clearTimeout(retryTimer)
    }
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timer = window.setTimeout(() => setNotice(''), 3200)
    return () => window.clearTimeout(timer)
  }, [notice])

  const title = section === 'overview' ? 'Overview' : section === 'sales' ? 'Sales' : 'Products'
  const subtitle = section === 'overview'
    ? 'A quick look at your sales and products.'
    : section === 'sales'
      ? 'Sales you have recorded, newest first.'
      : 'Your products and the stock available to sell.'
  const chartCeiling = Math.max(100, Math.ceil(Math.max(...(summary?.weekly.map((day) => day.revenue) || [0])) / 100) * 100)
  const visibleOrders = orders.filter((order) => {
    const matchesQuery = `${order.reference} ${order.customer}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (orderStatus === 'all' || order.status === orderStatus)
  })
  const visibleProducts = products.filter((product) =>
    `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(query.toLowerCase()),
  )

  async function submitForm(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    const form = new FormData(event.currentTarget)
    const isSale = modal === 'sale'
    const payload = isSale
      ? {
          customer: form.get('customer'),
          email: form.get('email'),
          productId: Number(form.get('productId')),
          quantity: Number(form.get('quantity')),
        }
      : {
          name: form.get('name'),
          sku: form.get('sku'),
          category: form.get('category'),
          price: form.get('price'),
          stock: Number(form.get('stock')),
        }
    try {
      await api(isSale ? 'orders/' : 'products/', { method: 'POST', body: JSON.stringify(payload) })
      setModal('')
      setNotice(isSale ? 'Sale recorded and stock updated.' : 'Product added.')
      await loadData()
    } catch (error) {
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  function exportOrders() {
    const rows = [['Sale #', 'Customer', 'Date', 'Status', 'Items', 'Total'], ...orders.map((order) => [
      order.reference,
      order.customer,
      formatDate(order.createdAt),
      order.status,
      order.itemCount,
      order.total.toFixed(2),
    ])]
    const content = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }))
    link.download = 'northstar-sales.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="app-shell">
      <StoreSidebar
        activeSection={section}
        onNavigate={(nextSection) => { setSection(nextSection); setQuery('') }}
        salesCount={orders.length}
      />

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Northstar Goods</span><span className="crumb-slash">/</span><strong>{title}</strong></div>
          <div className="topbar-actions">
            <button className="button button-dark top-create" onClick={() => { setModal('sale'); setFormError('') }}><Plus size={16} /> Record sale</button>
          </div>
        </header>

        <div className="page-content">
          {apiError && <div className="api-alert" role="alert"><CircleHelp size={18} /><span>{apiError}</span><button onClick={loadData}>Retry</button></div>}
          <div className="page-heading">
            <div><p className="eyebrow">{todayLabel}</p><h1>{title}</h1><p className="heading-subtitle">{subtitle}</p></div>
            {section === 'overview' && <button className="button button-outline" onClick={exportOrders}><ArrowDownToLine size={16} /> Export</button>}
          </div>

          {!summary && !apiError ? <div className="loading-state"><span className="spinner" /> Connecting to your store...</div> : null}

          {section === 'overview' && summary && <>
            <section className="metrics-grid" aria-label="Store metrics">
              <article className="metric-card metric-revenue"><div className="metric-top"><span>Sales (7 days)</span><span className="metric-icon green"><ArrowDownUp size={16} /></span></div><strong>{currency.format(summary.weekly.reduce((sum, day) => sum + day.revenue, 0))}</strong><div className="metric-foot"><span className={summary.revenueChange >= 0 ? 'change positive' : 'change negative'}>{summary.revenueChange >= 0 ? '+' : ''}{summary.revenueChange}%</span><span>vs. previous 7 days</span></div><div className="metric-sparkline" aria-hidden="true"><span /><span /><span /><span /><span /><span /><span /></div></article>
              <article className="metric-card"><div className="metric-top"><span>Sales recorded</span><span className="metric-icon orange"><ShoppingBag size={16} /></span></div><strong>{summary.saleCount.toLocaleString()}</strong><div className="metric-foot"><span>All time, cancelled sales excluded</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Average sale</span><span className="metric-icon blue"><Tag size={16} /></span></div><strong>{fullCurrency.format(summary.averageOrder)}</strong><div className="metric-foot"><span>Not including cancelled sales</span></div></article>
              <article className="metric-card"><div className="metric-top"><span>Products</span><span className="metric-icon rose"><Box size={16} /></span></div><strong>{summary.productCount}</strong><div className="metric-foot"><span className={summary.lowStockCount ? 'change warning' : 'change positive'}>{summary.lowStockCount} to restock</span></div></article>
            </section>

            <section className="dashboard-grid">
              <article className="panel sales-panel">
                <div className="panel-heading"><div><h2>Sales over time</h2><p>Daily totals for the last 7 days</p></div><span className="period-select">Last 7 days <ChevronDown size={14} /></span></div>
                <div className="chart-total"><strong>{fullCurrency.format(summary.weekly.reduce((sum, day) => sum + day.revenue, 0))}</strong><span>in the last 7 days</span></div>
                <div className="bar-chart" role="img" aria-label="Sales chart for the last seven days">
                  <div className="chart-y-axis">{Array.from({ length: 5 }, (_, index) => Math.round(chartCeiling * (4 - index) / 4)).map((value) => <span key={value}>{value === 0 ? '$0' : `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 0 }).format(value)}`}</span>)}</div>
                  <div className="chart-bars">{summary.weekly.map((day, index) => {
                    return <div className="chart-column" key={`${day.label}-${index}`}><div className="bar-track"><span className={index === summary.weekly.length - 1 ? 'bar today' : 'bar'} style={{ height: `${Math.max(day.revenue / chartCeiling * 88, day.revenue ? 8 : 2)}%` }} title={`${day.label}: ${fullCurrency.format(day.revenue)}`} /></div><small>{day.label}</small></div>
                  })}</div>
                </div>
              </article>

              <article className="panel stock-panel">
                <div className="panel-heading"><div><h2>Products to restock</h2><p>Items with 8 or fewer left</p></div><button className="text-link" onClick={() => setSection('products')}>View products <ArrowUpRight size={14} /></button></div>
                {products.filter((product) => product.stock <= 8).slice(0, 4).map((product) => {
                  return <div className="stock-row" key={product.id}><div className={`product-thumb ${product.category.toLowerCase()}`}><ProductIcon category={product.category} /></div><div className="stock-copy"><strong>{product.name}</strong><small>{product.sku}</small></div><span className={product.stock === 0 ? 'stock-qty out' : 'stock-qty low'}>{product.stock} left</span></div>
                })}
                {!products.some((product) => product.stock <= 8) && <div className="empty-inline"><Check size={16} /> All products are stocked</div>}
              </article>
            </section>

            <section className="panel orders-panel">
              <div className="panel-heading orders-heading"><div><h2>Recent sales</h2><p>Your latest recorded sales</p></div><button className="text-link" onClick={() => setSection('sales')}>View all sales <ArrowUpRight size={14} /></button></div>
              <SalesTable items={orders.slice(0, 5)} />
            </section>
          </>}

          {section === 'sales' && summary && <section className="panel full-panel">
            <div className="list-toolbar"><div className="search-box"><Search size={16} /><input aria-label="Search sales" placeholder="Search by customer or sale number" value={query} onChange={(event) => setQuery(event.target.value)} /></div><select className="filter-select" aria-label="Filter sales by status" value={orderStatus} onChange={(event) => setOrderStatus(event.target.value)}><option value="all">All statuses</option><option value="processing">In progress</option><option value="shipped">On the way</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select><button className="button button-outline" onClick={exportOrders}><ArrowDownToLine size={16} /> Export CSV</button></div>
            <SalesTable items={visibleOrders} />
            <div className="table-footer">Showing {visibleOrders.length} of {orders.length} sales</div>
          </section>}

          {section === 'products' && summary && <section className="panel full-panel">
            <div className="list-toolbar"><div className="search-box"><Search size={16} /><input aria-label="Search products" placeholder="Search by product name or code" value={query} onChange={(event) => setQuery(event.target.value)} /></div><span className="inventory-count">{products.length} products</span><button className="button button-dark" onClick={() => { setModal('product'); setFormError('') }}><Plus size={16} /> Add product</button></div>
            <ProductsTable items={visibleProducts} />
            <div className="table-footer">Showing {visibleProducts.length} of {products.length} products</div>
          </section>}
        </div>
      </main>

      {notice && <div className="toast"><Check size={17} />{notice}</div>}
      {modal && <EntryModal mode={modal} products={products} saving={saving} error={formError} onClose={() => setModal('')} onSubmit={submitForm} />}
    </div>
  )
}

export default App
