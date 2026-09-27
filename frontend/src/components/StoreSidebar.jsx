import { Box, LayoutDashboard, ReceiptText, Sparkles } from 'lucide-react'

const navigation = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales', icon: ReceiptText },
  { id: 'products', label: 'Products', icon: Box },
]

export default function StoreSidebar({ activeSection, onNavigate, salesCount }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="#overview" onClick={() => onNavigate('overview')}>
        <span className="brand-mark"><Sparkles size={19} strokeWidth={2.4} /></span>
        <span className="brand-word">north<span>star</span></span>
        <span className="brand-caption">COMMERCE</span>
      </a>
      <nav className="primary-nav" aria-label="Store sections">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            aria-label={label}
            aria-current={activeSection === id ? 'page' : undefined}
            title={label}
            className={activeSection === id ? 'nav-item active' : 'nav-item'}
            onClick={() => onNavigate(id)}
          >
            <Icon size={17} />
            <span>{label}</span>
            {id === 'sales' && <span className="nav-count">{salesCount}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}
