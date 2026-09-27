export const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export const fullCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatDate(value) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

export function initials(name) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()
}
