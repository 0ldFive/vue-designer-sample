import { createProdMockServer } from 'vite-plugin-mock/es/createProdMockServer'
import mockRoutes from '../mock/print.js'

export function setupProdMockServer() {
  // Use vite-plugin-mock for XHR interception (if any)
  createProdMockServer(mockRoutes)

  // Patch window.fetch to support mock routes
  // This is required because vite-plugin-mock's prod mode relies on mockjs which only patches XHR
  const originalFetch = window.fetch
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url
    const method = (init && init.method ? init.method : 'GET').toUpperCase()
    
    try {
      const urlObj = new URL(url.toString(), window.location.origin)
      const pathname = urlObj.pathname

      // Find matching route
      const route = mockRoutes.find(r => {
        if (r.method.toUpperCase() !== method) return false
        
        // Convert route URL to regex
        // Escape special chars except :param
        const pattern = r.url
          .replace(/\//g, '\\/')
          .replace(/:([a-zA-Z0-9_]+)/g, '([^/]+)')
        
        const regex = new RegExp(`^${pattern}$`)
        return regex.test(pathname)
      })

      if (route) {
        console.log(`[Mock Fetch] Intercepting ${method} ${pathname}`)
        
        // Extract params
        const pattern = route.url
          .replace(/\//g, '\\/')
          .replace(/:([a-zA-Z0-9_]+)/g, '([^/]+)')
        const regex = new RegExp(`^${pattern}$`)
        const match = pathname.match(regex)
        
        const params = {}
        const paramKeys = []
        // Extract param names
        route.url.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
          paramKeys.push(key)
          return ''
        })
        
        // Map values
        if (match) {
          paramKeys.forEach((key, index) => {
            params[key] = match[index + 1]
          })
        }
        
        // Parse query string
        const query = Object.fromEntries(urlObj.searchParams.entries())
        
        // Merge params into query (MockJS convention often puts params in query for simple mocks)
        Object.assign(query, params)
        
        // Parse body
        let body = null
        if (init && init.body) {
          try {
            body = JSON.parse(init.body)
          } catch (e) {
            body = init.body
          }
        }
        
        const req = {
          query,
          body,
          headers: (init && init.headers) || {}
        }
        
        // Execute response function
        let response = route.response
        if (typeof response === 'function') {
          response = response(req)
        }
        
        // Handle async response
        const data = await Promise.resolve(response)
        
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    } catch (e) {
      console.error('[Mock Fetch] Error checking route:', e)
    }
    
    return originalFetch(input, init)
  }
}
