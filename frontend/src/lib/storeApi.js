export async function api(path, options) {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  })
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await response.json() : {}
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`)
  if (!isJson) throw new Error('The server returned an unexpected response.')
  return data
}

export function fetchStoreData() {
  return Promise.all([
    api('summary/'),
    api('orders/'),
    api('products/'),
  ])
}
