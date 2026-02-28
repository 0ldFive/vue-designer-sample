
let templates = [
  { id: 'default', title: 'Mock 默认模板', content: '{}', type: 'template' }
]
let customElements = []

export default [
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
        templates[index] = body
      } else {
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
