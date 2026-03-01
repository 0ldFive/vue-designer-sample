
import initialTemplates from './templates.json'
import initialElements from './elements.json'

// 使用深拷贝初始化，避免引用污染
let templates = JSON.parse(JSON.stringify(initialTemplates))
let customElements = JSON.parse(JSON.stringify(initialElements))
let userSettings = {
  theme: 'light',
  locale: 'zh-cn',
  isCollapsed: false
}

const withLogger = (route) => {
  return {
    ...route,
    response: (req) => {
      // req 包含 { url, body, query, headers }，但不一定包含 method
      // method 和 url 可以从 route 配置中直接获取
      const { query, body } = req
      const method = route.method.toUpperCase()
      const url = route.url
      
      console.log(`[Mock] ${method} ${url}`, { query, body })
      
      // 如果原来的 response 是函数，调用它
      if (typeof route.response === 'function') {
        return route.response(req)
      }
      // 如果是静态数据，直接返回
      return route.response
    }
  }
}

const routes = [
  // --- Settings ---
  {
    url: '/api/print/settings',
    method: 'get',
    response: () => {
      return userSettings
    },
  },
  {
    url: '/api/print/settings',
    method: 'post',
    response: ({ body }) => {
      userSettings = { ...userSettings, ...body }
      return { code: 200, message: 'success', data: userSettings }
    },
  },
  // --- Templates ---
  {
    url: '/api/print/templates',
    method: 'get',
    response: () => {
      return templates
    },
  },
  {
    url: '/api/print/templates/:id',
    method: 'get',
    response: ({ query }) => {
      const id = query.id
      return templates.find((t) => t.id === id) || null
    },
  },
  {
    url: '/api/print/templates',
    method: 'post',
    response: ({ body }) => {
      const index = templates.findIndex((t) => t.id === body.id)
      if (index > -1) {
        console.log('[Mock] Updating existing template at index:', index, 'Old ID:', templates[index].id)
        templates[index] = body
      } else {
        console.log('[Mock] Creating new template')
        templates.push(body)
      }
      return { code: 200, message: 'success', data: body }
    },
  },
  {
    url: '/api/print/templates/:id',
    method: 'delete',
    response: ({ query }) => {
      const id = query.id
      const index = templates.findIndex((t) => t.id === id)
      if (index > -1) {
        templates.splice(index, 1)
      }
      return { code: 200, message: 'success' }
    },
  },

  // --- Custom Elements ---
  {
    url: '/api/print/custom-elements',
    method: 'get',
    response: () => {
      return customElements
    },
  },
  {
    url: '/api/print/custom-elements/:id',
    method: 'get',
    response: ({ query }) => {
      const id = query.id
      return customElements.find((e) => e.id === id) || null
    },
  },
  {
    url: '/api/print/custom-elements',
    method: 'post',
    response: ({ body }) => {
      const index = customElements.findIndex((e) => e.id === body.id)
      if (index > -1) {
        customElements[index] = body
      } else {
        customElements.push(body)
      }
      return { code: 200, message: 'success', data: body }
    },
  },
  {
    url: '/api/print/custom-elements/:id',
    method: 'delete',
    response: ({ query }) => {
      const id = query.id
      const index = customElements.findIndex((e) => e.id === id)
      if (index > -1) {
        customElements.splice(index, 1)
      }
      return { code: 200, message: 'success' }
    },
  },
]

export default routes.map(withLogger)
