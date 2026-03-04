
/**
 * 配置打印设计器实例
 * @param {HTMLElement} el 打印设计器元素实例
 */
export function configurePrintDesigner(el) {
  if (!el) return

  console.log('[PrintSettings] Configuring designer instance...')

  const basePath = typeof window !== 'undefined' ? window.location.pathname : '/'
  const normalizedBasePath =
    basePath && basePath !== '/' ? basePath.replace(/\/$/, '') : ''
  const baseUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${normalizedBasePath}`
      : ''

  if (el.setCrudEndpoints) {
    el.setCrudEndpoints({
      templates: {
        list: '/api/print/templates',
        get: '/api/print/templates/{id}',
        upsert: '/api/print/templates',
        delete: '/api/print/templates/{id}'
      },
      customElements: {
        list: '/api/print/custom-elements',
        get: '/api/print/custom-elements/{id}',
        upsert: '/api/print/custom-elements',
        delete: '/api/print/custom-elements/{id}'
      }
    }, { baseUrl })
    console.log('[PrintSettings] setCrudEndpoints called')
  }

  // 启用远程模式
  if (el.setCrudMode) {
    el.setCrudMode('remote')
    console.log('[PrintSettings] setCrudMode("remote") called')
  }
}
