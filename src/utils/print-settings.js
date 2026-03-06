
/**
 * 配置打印设计器实例
 * 调用 setCrudEndpoints 配置增删改查接口，调用 setCrudMode 启用远程模式
 * @param {HTMLElement} el 打印设计器元素实例
 */
export function configurePrintDesigner(el) {
  if (!el) return

  console.log('[PrintSettings] Configuring designer instance...')

  const basePath = typeof window !== 'undefined' ? window.location.pathname : '/'
  const normalizedBasePath =
    basePath && basePath !== '/' ? basePath.replace(/\/$/, '') : ''
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const withBasePath = (path) =>
    normalizedBasePath ? `${normalizedBasePath}${path}` : path

  if (el.setCrudEndpoints) {
    el.setCrudEndpoints({
      templates: {
        list: withBasePath('/api/print/templates'),
        get: withBasePath('/api/print/templates/{id}'),
        upsert: withBasePath('/api/print/templates'),
        delete: withBasePath('/api/print/templates/{id}')
      },
      customElements: {
        list: withBasePath('/api/print/custom-elements'),
        get: withBasePath('/api/print/custom-elements/{id}'),
        upsert: withBasePath('/api/print/custom-elements'),
        delete: withBasePath('/api/print/custom-elements/{id}')
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
