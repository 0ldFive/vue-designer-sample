import { createProdMockServer } from 'vite-plugin-mock/client'
import mockRoutes from '../mock/print.js'

export function setupProdMockServer() {
  const basePath = window.location.pathname && window.location.pathname !== '/' ? window.location.pathname.replace(/\/$/, '') : ''
  const effectiveRoutes = basePath ? mockRoutes.map((route) => ({ ...route, url: `${basePath}${route.url}` })) : mockRoutes

  createProdMockServer(effectiveRoutes)

  // Patch window.fetch to support mock routes
  // This is required because vite-plugin-mock's prod mode relies on mockjs which only patches XHR
  const originalFetch = window.fetch
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url
    const method = (init && init.method ? init.method : 'GET').toUpperCase()
    
    try {
      const urlObj = new URL(url.toString(), window.location.origin)
      const pathname = urlObj.pathname
      const strippedPathname = basePath && pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname

      // Find matching route
      const findRoute = (routes, path) =>
        routes.find((r) => {
          if (r.method.toUpperCase() !== method) return false
          const pattern = r.url.replace(/\//g, '\\/').replace(/:([a-zA-Z0-9_]+)/g, '([^/]+)')
          const regex = new RegExp(`^${pattern}$`)
          return regex.test(path)
        })

      const matchedRoute =
        findRoute(effectiveRoutes, pathname) || findRoute(mockRoutes, strippedPathname)

      if (matchedRoute) {
        const matchPath = matchedRoute.url.startsWith(basePath) ? pathname : strippedPathname
        console.log(`[Mock Fetch] Intercepting ${method} ${pathname}`)
        
        // Extract params
        const pattern = matchedRoute.url
          .replace(/\//g, '\\/')
          .replace(/:([a-zA-Z0-9_]+)/g, '([^/]+)')
        const regex = new RegExp(`^${pattern}$`)
        const match = matchPath.match(regex)
        
        const params = {}
        const paramKeys = []
        // Extract param names
        matchedRoute.url.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
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
        let response = matchedRoute.response
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
