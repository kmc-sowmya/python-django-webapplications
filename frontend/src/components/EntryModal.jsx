import { Plus, X } from 'lucide-react'
import { fullCurrency } from '../lib/format'

export default function EntryModal({ mode, products, saving, error, onClose, onSubmit }) {
  const isSale = mode === 'sale'
  const availableProducts = products.filter((product) => product.stock > 0)
  const hasProducts = availableProducts.length > 0

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            <p className="eyebrow">NORTHSTAR GOODS</p>
            <h2 id="modal-title">{isSale ? 'Record a sale' : 'Add a product'}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit}>
          {isSale ? (
            <>
              <label>Customer name<input name="customer" required maxLength="140" placeholder="e.g. Jamie Lee" /></label>
              <label>Email address (optional)<input name="email" type="email" placeholder="jamie@example.com" /></label>
              <div className="form-row">
                <label className="form-grow">Product
                  <select name="productId" required defaultValue="">
                    <option value="" disabled>Choose a product</option>
                    {availableProducts.map((product) => <option value={product.id} key={product.id}>{product.name} · {fullCurrency.format(product.price)}</option>)}
                  </select>
                </label>
                <label className="quantity-field">Quantity<input name="quantity" type="number" min="1" defaultValue="1" required /></label>
              </div>
              {!hasProducts && <p className="form-error">There are no products in stock. Add stock before recording a sale.</p>}
            </>
          ) : (
            <>
              <label>Product name<input name="name" required maxLength="140" placeholder="e.g. Everyday carry pouch" /></label>
              <div className="form-row">
                <label className="form-grow">Product code<input name="sku" required maxLength="32" placeholder="NS-ACC-042" /></label>
                <label className="form-grow">Category
                  <select name="category" defaultValue="Accessories"><option>Accessories</option><option>Audio</option><option>Apparel</option><option>Home</option></select>
                </label>
              </div>
              <div className="form-row">
                <label className="form-grow">Price (USD)<input name="price" type="number" min="0.01" step="0.01" required placeholder="48.00" /></label>
                <label className="form-grow">Starting stock<input name="stock" type="number" min="0" required placeholder="24" /></label>
              </div>
            </>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="button button-dark" disabled={saving || (isSale && !hasProducts)}>
              {saving ? 'Saving...' : <><Plus size={16} />{isSale ? 'Save sale' : 'Add product'}</>}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
