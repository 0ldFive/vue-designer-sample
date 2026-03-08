<script setup>
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'

import { configurePrintDesigner } from '../utils/print-settings'

const { t } = useI18n()
const globalState = inject('globalState')
const designerRef = ref(null)
const templateReady = ref(false)
const pdfBlobUrl = ref('')
const imageBlobUrl = ref('')
const blobPreviewVisible = ref(false)
const blobPreviewType = ref('pdf')
const printDebugVisible = ref(false)
const printDebugModel = ref({
  mode: 'browser',
  silentPrint: false,
  options: {
    printer: '',
    jobName: '',
    copies: 1,
    pageRange: '',
    orientation: '',
    colorMode: '',
    sidesMode: '',
    paperSize: ''
  }
})
const printDebugLog = ref([])
const localPrinters = ref([])
const remoteClients = ref([])
const remotePrinters = ref([])
const selectedRemoteClientId = ref('')

const formModel = ref({
  orderNo: 'SO-20260304-001',
  customer: '星辰电子有限公司',
  contact: '王敏 13800000000',
  orderTime: '2026-03-04',
  remarks: '请在本周内完成发货。'
})

const lineItems = ref(
  Array.from({ length: 30 }, (_, index) => {
    const id = index + 1
    const qty = (index % 5) + 1
    const price = 100 + index * 10
    return {
      id,
      name: `商品 ${id}`,
      qty,
      price,
      total: qty * price
    }
  })
)

const lineItemsWithTotal = computed(() =>
  lineItems.value.map((item) => ({
    ...item,
    total: (Number(item.qty) || 0) * (Number(item.price) || 0)
  }))
)

const updateProductField = (row, key, value) => {
  if (!row) return
  if (key === 'name') {
    row.name = String(value ?? '')
  } else {
    const numeric = Number(value)
    row[key] = Number.isFinite(numeric) ? numeric : 0
  }
  row.total = (Number(row.qty) || 0) * (Number(row.price) || 0)
}

const addProduct = () => {
  const maxId = lineItems.value.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0)
  const id = maxId + 1
  lineItems.value.push({
    id,
    name: `商品 ${id}`,
    qty: 1,
    price: 100,
    total: 100
  })
}

const removeProduct = (id) => {
  lineItems.value = lineItems.value.filter((item) => item.id !== id)
}

const printVariables = computed(() => {
  const totalQty = lineItemsWithTotal.value.reduce((sum, item) => sum + item.qty, 0)
  const totalAmount = lineItemsWithTotal.value.reduce((sum, item) => sum + item.total, 0)
  return {
    orderNo: formModel.value.orderNo,
    '@orderNo': formModel.value.orderNo,
    customer: formModel.value.customer,
    '@customer': formModel.value.customer,
    contact: formModel.value.contact,
    '@contact': formModel.value.contact,
    orderTime: formModel.value.orderTime,
    '@orderTime': formModel.value.orderTime,
    remarks: formModel.value.remarks,
    '@remarks': formModel.value.remarks,
    products: lineItemsWithTotal.value,
    '@products': lineItemsWithTotal.value,
    tableData: lineItemsWithTotal.value,
    totalQty,
    totalAmount
  }
})

const printDebugLogText = computed(() => printDebugLog.value.join('\n\n'))

const appendPrintDebugLog = (title, payload) => {
  const time = new Date().toLocaleTimeString()
  const content = typeof payload === 'string' ? payload : JSON.stringify(payload)
  printDebugLog.value.unshift(`[${time}] ${title} ${content}`)
  if (printDebugLog.value.length > 20) {
    printDebugLog.value.length = 20
  }
}

const clearPrintDebugLog = () => {
  printDebugLog.value = []
}

/**
 * 解析选项值
 * 从对象中查找指定的键作为值，如果未找到则使用回退值
 */
const resolveOptionValue = (item, keys, fallback) => {
  if (typeof item === 'string' || typeof item === 'number') {
    return String(item)
  }
  if (item && typeof item === 'object') {
    for (const key of keys) {
      const value = item[key]
      if (value !== undefined && value !== null && value !== '') {
        return String(value)
      }
    }
  }
  return fallback
}

const readOptionPathValue = (item, path) => {
  if (!item || typeof item !== 'object') return ''
  const segments = String(path).split('.')
  let current = item
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      return ''
    }
    current = current[segment]
  }
  if (typeof current === 'string' || typeof current === 'number') {
    return String(current).trim()
  }
  return ''
}

const resolveOptionCandidates = (item, keys) => {
  if (typeof item === 'string' || typeof item === 'number') {
    return [String(item)]
  }
  if (!item || typeof item !== 'object') {
    return []
  }
  const values = keys
    .map((key) => readOptionPathValue(item, key))
    .filter((value) => value !== '')
  return Array.from(new Set(values))
}

const isLikelyClientId = (value) => /^client-\d+$/i.test(value) || /^[0-9a-f]{16,}$/i.test(value)

const pickRemoteClientLabel = (candidates, fallback) => {
  const preferred = candidates.find((value) => !isLikelyClientId(value))
  return preferred || candidates[0] || fallback || ''
}

const localPrinterOptions = computed(() =>
  localPrinters.value
    .map((item, index) => {
      const value = resolveOptionValue(item, ['printer', 'name', 'printerName', 'id'], `local-${index}`)
      const label = resolveOptionValue(item, ['name', 'printer', 'printerName', 'id'], value)
      return { value, label: label || value }
    })
    .filter((item) => item.value)
)

const remoteClientOptions = computed(() =>
  remoteClients.value
    .map((item) => {
      const valueCandidates = resolveOptionCandidates(item, [
        'client_id',
        'clientId',
        'id',
        'value',
        'key',
        'uuid',
        'uid',
        'client',
        'client.id',
        'client.clientId',
        'client.value'
      ])
      const labelCandidates = resolveOptionCandidates(item, [
        'client_name',
        'name',
        'clientName',
        'displayName',
        'alias',
        'hostName',
        'hostname',
        'machineName',
        'title',
        'label',
        'client.name',
        'client.clientName',
        'client.displayName',
        'client.hostName',
        'client.hostname',
        'client.machineName',
        'client'
      ])
      const value = valueCandidates[0] || labelCandidates[0] || ''
      const label = pickRemoteClientLabel(labelCandidates, value)
      const candidates = Array.from(new Set([value, ...valueCandidates, ...labelCandidates].filter(Boolean)))
      return { value, label, candidates }
    })
    .filter((item) => item.value)
)

const remotePrinterOptions = computed(() =>
  remotePrinters.value
    .map((item, index) => {
      const value = resolveOptionValue(item, ['printer_name', 'printer', 'name', 'printerName', 'id'], `remote-${index}`)
      const label = resolveOptionValue(item, ['printer_name', 'name', 'printer', 'printerName', 'id'], value)
      return { value, label }
    })
    .filter((item) => item.value)
)

const availablePrinterOptions = computed(() =>
  printDebugModel.value.mode === 'remote' ? remotePrinterOptions.value : localPrinterOptions.value
)

/**
 * 构建打印请求对象
 * 根据调试面板的配置生成打印参数，包括打印机、任务名、页码范围等
 */
const buildPrintRequest = () => {
  const mode = printDebugModel.value.mode || 'browser'
  const options = {
    printer: printDebugModel.value.options.printer.trim(),
    jobName: printDebugModel.value.options.jobName.trim(),
    pageRange: printDebugModel.value.options.pageRange.trim(),
    orientation: printDebugModel.value.options.orientation,
    colorMode: printDebugModel.value.options.colorMode,
    sidesMode: printDebugModel.value.options.sidesMode,
    paperSize: printDebugModel.value.options.paperSize.trim()
  }
  const copies = Number(printDebugModel.value.options.copies)
  if (Number.isFinite(copies) && copies > 0) {
    options.copies = Math.floor(copies)
  }
  const sanitizedOptions = Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  )
  const request = { mode }
  if (Object.keys(sanitizedOptions).length > 0) {
    request.options = sanitizedOptions
  }
  return request
}

const printRequestPreview = computed(() => JSON.stringify(buildPrintRequest()))

/**
 * 应用打印默认配置
 * 调用 setPrintDefaults 方法设置打印模式和静默打印选项
 */
const applyPrintDefaults = () => {
  const el = designerRef.value
  if (!el?.setPrintDefaults) return
  el.setPrintDefaults({
    printMode: printDebugModel.value.mode || 'browser',
    silentPrint: !!printDebugModel.value.silentPrint
  })
}

/**
 * 应用打印运行时选项
 * 根据当前打印模式（本地/远程），设置对应的打印参数（如打印机、纸张、份数等）
 */
const applyPrintRuntimeOptions = (request) => {
  const el = designerRef.value
  if (!el?.setPrintDefaults) return
  const rawOptions = {
    printer: printDebugModel.value.options.printer.trim(),
    jobName: printDebugModel.value.options.jobName.trim(),
    pageRange: printDebugModel.value.options.pageRange.trim(),
    orientation: printDebugModel.value.options.orientation,
    colorMode: printDebugModel.value.options.colorMode,
    sidesMode: printDebugModel.value.options.sidesMode,
    paperSize: printDebugModel.value.options.paperSize.trim()
  }
  const copies = Number(printDebugModel.value.options.copies)
  if (Number.isFinite(copies) && copies > 0) {
    rawOptions.copies = Math.floor(copies)
  }
  if (request?.mode === 'local') {
    el.setPrintDefaults({ localPrintOptions: rawOptions })
    return
  }
  if (request?.mode === 'remote') {
    el.setPrintDefaults({ remotePrintOptions: rawOptions })
    if (el?.printSettings?.remoteSelectedClientId) {
      el.printSettings.remoteSelectedClientId.value = selectedRemoteClientId.value || ''
    }
  }
}

const handleClearSelectedPrinter = () => {
  printDebugModel.value.options.printer = ''
}

/**
 * 设置品牌信息和外观
 * 配置设计器的标题、Logo、主题（深色/浅色）和语言（中文/英文）
 */
const setupBranding = () => {
  const el = designerRef.value
  if (!el) return
  el.setBranding?.({ title: t('app.businessForm'), showLogo: true })
  if (globalState) {
    el.setTheme?.(globalState.isDark.value ? 'dark' : 'light')
    el.setLanguage?.(globalState.locale.value === 'zh-cn' ? 'zh' : 'en')
  }
  applyPrintDefaults()
}

/**
 * 标准化模板数据
 * 规范化模板中的变量引用，确保 @ 前缀的正确处理
 */
const normalizeTemplateData = (templateData) => {
  const safeData = JSON.parse(JSON.stringify(templateData))
  const pages = Array.isArray(safeData?.pages) ? safeData.pages : []
  pages.forEach((page) => {
    if (!Array.isArray(page?.elements)) return
    page.elements.forEach((element) => {
      if (element?.type !== 'text') return
      const variable = typeof element.variable === 'string' ? element.variable.trim() : ''
      const content = typeof element.content === 'string' ? element.content.trim() : ''
      if (variable.startsWith('@')) {
        element.variable = variable.slice(1)
      }
      if (!variable && /^@[a-zA-Z_][\w-]*$/.test(content)) {
        element.variable = content.slice(1)
        element.content = ''
      }
    })
  })
  return safeData
}

/**
 * 应用打印变量
 * 将当前表单数据和商品列表数据注入到打印模板中
 */
const applyVariables = () => {
  const el = designerRef.value
  if (!el?.setVariables || !templateReady.value) return
  el.setVariables(printVariables.value, { merge: false })
}

/**
 * 初始化模板
 * 从后端 API 获取模板列表，并加载第一个模板的数据到设计器中
 */
const initTemplate = async () => {
  const el = designerRef.value
  if (!el?.loadTemplateData) return
  const res = await fetch(`${import.meta.env.BASE_URL}api/print/templates`)
  const templates = await res.json()
  if (!Array.isArray(templates) || templates.length === 0) {
    ElMessage.error(t('app.templateEmpty'))
    return
  }
  const templateData = templates[0]?.data
  if (!templateData) {
    ElMessage.error(t('app.templateInvalid'))
    return
  }
  el.loadTemplateData(normalizeTemplateData(templateData))
  templateReady.value = true
  applyVariables()
}

/**
 * 处理设计器就绪事件
 * 当设计器组件加载完成时调用，进行初始化配置和模板加载
 */
const handleReady = async () => {
  setupBranding()
  if (!templateReady.value) {
    await initTemplate()
  }
}

/**
 * 执行打印
 * 构建打印请求，应用运行时选项，并调用 design.print 方法发起打印
 */
const handlePrint = async () => {
  const el = designerRef.value
  if (!el?.print || !templateReady.value) return
  applyVariables()
  const request = buildPrintRequest()
  applyPrintRuntimeOptions(request)
  appendPrintDebugLog(t('app.printRequestLog'), request)
  try {
    await el.print(request)
    appendPrintDebugLog(t('app.printSuccessLog'), request)
    ElMessage.success(t('app.printDebugSuccess'))
  } catch (error) {
    appendPrintDebugLog(t('app.printErrorLog'), { request, message: error?.message || String(error) })
    ElMessage.error(t('app.printDebugFailed'))
  }
}

/**
 * 获取设计器实例
 * 等待 print-designer 自定义元素定义完成，确保可以安全调用其方法
 */
const getDesignerInstance = async () => {
  await customElements.whenDefined('print-designer')
  return designerRef.value
}

const syncSelectedPrinter = () => {
  const options = availablePrinterOptions.value
  const selected = printDebugModel.value.options.printer
  if (selected === '' || selected === null || selected === undefined) {
    return
  }
  if (options.length === 0) {
    return
  }
  if (!options.some((item) => item.value === selected)) {
    printDebugModel.value.options.printer = options[0].value
  }
}

/**
 * 获取本地打印机列表（调试用）
 * 调用 fetchLocalPrinters 获取本机安装的打印机
 */
const fetchLocalPrintersForDebug = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.fetchLocalPrinters !== 'function') {
    return null
  }
  const data = await el.fetchLocalPrinters()
  localPrinters.value = Array.isArray(data) ? data : []
  syncSelectedPrinter()
  return data
}

/**
 * 获取远程客户端列表（调试用）
 * 调用 fetchRemoteClients 获取在线的云打印客户端
 */
const fetchRemoteClientsForDebug = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.fetchRemoteClients !== 'function') {
    return null
  }
  const data = await el.fetchRemoteClients()
  const clients = Array.isArray(data) ? data : Array.isArray(data?.clients) ? data.clients : []
  remoteClients.value = clients
  if (!remoteClientOptions.value.some((item) => item.value === selectedRemoteClientId.value)) {
    selectedRemoteClientId.value = remoteClientOptions.value[0]?.value || ''
  }
  return clients
}

/**
 * 获取远程打印机列表（调试用）
 * 调用 fetchRemotePrinters 获取指定云客户端的打印机
 */
const fetchRemotePrintersForDebug = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.fetchRemotePrinters !== 'function') {
    return null
  }
  const selectedOption = remoteClientOptions.value.find((item) => item.value === selectedRemoteClientId.value)
  const clientCandidates = Array.from(
    new Set([selectedRemoteClientId.value, ...(selectedOption?.candidates || [])].filter(Boolean))
  )
  let printers = []
  if (clientCandidates.length === 0) {
    const data = await el.fetchRemotePrinters()
    printers = Array.isArray(data) ? data : Array.isArray(data?.printers) ? data.printers : []
  } else {
    for (const clientId of clientCandidates) {
      const data = await el.fetchRemotePrinters(clientId)
      const list = Array.isArray(data) ? data : Array.isArray(data?.printers) ? data.printers : []
      printers = list
      if (list.length > 0) {
        break
      }
    }
  }
  remotePrinters.value = printers
  syncSelectedPrinter()
  return printers
}

const handleRemoteClientSelection = async () => {
  if (!printDebugVisible.value || printDebugModel.value.mode !== 'remote') return
  try {
    await fetchRemotePrintersForDebug()
  } catch (error) {
    appendPrintDebugLog(`${t('app.getCloudClientInfo')}-error`, { message: error?.message || String(error) })
  }
}

/**
 * 获取本地打印机信息
 * 调用 fetchLocalPrinters 获取打印机列表，并获取选中打印机的能力信息
 */
const handleGetPrinterInfo = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.fetchLocalPrinters !== 'function') {
    appendPrintDebugLog(`${t('app.getPrinterInfo')}-error`, {
      method: 'fetchLocalPrinters',
      message: t('app.methodUnavailable')
    })
    ElMessage.warning(t('app.methodUnavailable'))
    return
  }
  appendPrintDebugLog(`${t('app.getPrinterInfo')}-request`, { method: 'fetchLocalPrinters' })
  try {
    const printers = await fetchLocalPrintersForDebug()
    const selectedPrinter = printDebugModel.value.options.printer.trim()
    if (selectedPrinter && el?.fetchLocalPrinterCaps) {
      const caps = await el.fetchLocalPrinterCaps(selectedPrinter)
      appendPrintDebugLog(`${t('app.getPrinterInfo')}-success`, { printers, caps })
      return
    }
    appendPrintDebugLog(`${t('app.getPrinterInfo')}-success`, printers ?? null)
  } catch (error) {
    appendPrintDebugLog(`${t('app.getPrinterInfo')}-error`, { message: error?.message || String(error) })
  }
}

/**
 * 获取本地打印机能力
 * 调用 fetchLocalPrinterCaps 获取指定打印机的详细能力（如支持的纸张、颜色模式等）
 */
const handleGetPrinterCaps = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.fetchLocalPrinterCaps !== 'function') {
    appendPrintDebugLog(`${t('app.getPrinterCaps')}-error`, {
      method: 'fetchLocalPrinterCaps',
      message: t('app.methodUnavailable')
    })
    ElMessage.warning(t('app.methodUnavailable'))
    return
  }
  const input = window.prompt(t('app.enterPrinterName'), printDebugModel.value.options.printer || '')
  if (input === null) {
    return
  }
  const printer = input.trim()
  if (!printer) {
    appendPrintDebugLog(`${t('app.getPrinterCaps')}-error`, {
      message: t('app.printerNameRequired')
    })
    ElMessage.warning(t('app.printerNameRequired'))
    return
  }
  const request = buildPrintRequest()
  appendPrintDebugLog(`${t('app.getPrinterCaps')}-request`, {
    method: 'fetchLocalPrinterCaps',
    printer,
    request
  })
  try {
    const caps = await el.fetchLocalPrinterCaps(printer)
    appendPrintDebugLog(`${t('app.getPrinterCaps')}-success`, {
      printer,
      mode: request.mode,
      options: request.options || {},
      caps
    })
  } catch (error) {
    appendPrintDebugLog(`${t('app.getPrinterCaps')}-error`, {
      printer,
      request,
      message: error?.message || String(error)
    })
  }
}

/**
 * 获取云打印客户端信息
 * 调用 fetchRemoteClients 获取在线的云打印客户端列表
 */
const handleGetCloudClientInfo = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.fetchRemoteClients !== 'function') {
    appendPrintDebugLog(`${t('app.getCloudClientInfo')}-error`, {
      method: 'fetchRemoteClients',
      message: t('app.methodUnavailable')
    })
    ElMessage.warning(t('app.methodUnavailable'))
    return
  }
  appendPrintDebugLog(`${t('app.getCloudClientInfo')}-request`, { method: 'fetchRemoteClients' })
  try {
    const clients = await fetchRemoteClientsForDebug()
    if (typeof el?.fetchRemotePrinters === 'function') {
      await fetchRemotePrintersForDebug()
    }
    appendPrintDebugLog(`${t('app.getCloudClientInfo')}-success`, clients ?? null)
  } catch (error) {
    appendPrintDebugLog(`${t('app.getCloudClientInfo')}-error`, { message: error?.message || String(error) })
  }
}

/**
 * 获取云打印机列表
 * 调用 fetchRemotePrinters 获取指定云客户端的打印机列表
 */
const handleGetCloudPrinterList = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.fetchRemotePrinters !== 'function') {
    appendPrintDebugLog(`${t('app.getCloudPrinterList')}-error`, {
      method: 'fetchRemotePrinters',
      message: t('app.methodUnavailable')
    })
    ElMessage.warning(t('app.methodUnavailable'))
    return
  }
  const request = buildPrintRequest()
  const input = window.prompt(t('app.enterCloudClientId'), selectedRemoteClientId.value || '')
  if (input === null) {
    return
  }
  const clientId = input.trim()
  if (!clientId) {
    appendPrintDebugLog(`${t('app.getCloudPrinterList')}-error`, {
      request,
      message: t('app.cloudClientIdRequired')
    })
    ElMessage.warning(t('app.cloudClientIdRequired'))
    return
  }
  appendPrintDebugLog(`${t('app.getCloudPrinterList')}-request`, {
    method: 'fetchRemotePrinters',
    clientId,
    request
  })
  try {
    const printers = await el.fetchRemotePrinters(clientId)
    remotePrinters.value = Array.isArray(printers) ? printers : []
    syncSelectedPrinter()
    appendPrintDebugLog(`${t('app.getCloudPrinterList')}-success`, {
      clientId,
      mode: request.mode,
      options: request.options || {},
      printers: remotePrinters.value
    })
  } catch (error) {
    appendPrintDebugLog(`${t('app.getCloudPrinterList')}-error`, {
      clientId,
      request,
      message: error?.message || String(error)
    })
  }
}

/**
 * 获取模板列表
 * 调用 getTemplates 方法获取所有可用的打印模板
 */
const handleGetTemplateList = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.getTemplates !== 'function') {
    appendPrintDebugLog(`${t('app.getTemplateList')}-error`, {
      method: 'getTemplates',
      message: t('app.methodUnavailable')
    })
    ElMessage.warning(t('app.methodUnavailable'))
    return
  }
  appendPrintDebugLog(`${t('app.getTemplateList')}-request`, {
    method: 'getTemplates',
    includeData: false
  })
  try {
    const templates = await el.getTemplates({ includeData: false })
    appendPrintDebugLog(`${t('app.getTemplateList')}-success`, templates ?? null)
  } catch (error) {
    appendPrintDebugLog(`${t('app.getTemplateList')}-error`, {
      message: error?.message || String(error)
    })
  }
}

/**
 * 获取模板详情
 * 调用 getTemplate 方法获取指定模板的详细数据
 */
const handleGetTemplateDetail = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.getTemplate !== 'function') {
    appendPrintDebugLog(`${t('app.getTemplateDetail')}-error`, {
      method: 'getTemplate',
      message: t('app.methodUnavailable')
    })
    ElMessage.warning(t('app.methodUnavailable'))
    return
  }
  const input = window.prompt(t('app.enterTemplateId'), '')
  if (input === null) {
    return
  }
  const templateId = input.trim()
  if (!templateId) {
    appendPrintDebugLog(`${t('app.getTemplateDetail')}-error`, {
      message: t('app.templateIdRequired')
    })
    ElMessage.warning(t('app.templateIdRequired'))
    return
  }
  appendPrintDebugLog(`${t('app.getTemplateDetail')}-request`, {
    method: 'getTemplate',
    templateId
  })
  try {
    const template = await el.getTemplate(templateId)
    appendPrintDebugLog(`${t('app.getTemplateDetail')}-success`, template ?? null)
  } catch (error) {
    appendPrintDebugLog(`${t('app.getTemplateDetail')}-error`, {
      templateId,
      message: error?.message || String(error)
    })
  }
}

/**
 * 获取自定义元素列表
 * 调用 getCustomElements 方法获取所有的自定义元素
 */
const handleGetCustomElementList = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.getCustomElements !== 'function') {
    appendPrintDebugLog(`${t('app.getCustomElementList')}-error`, {
      method: 'getCustomElements',
      message: t('app.methodUnavailable')
    })
    ElMessage.warning(t('app.methodUnavailable'))
    return
  }
  appendPrintDebugLog(`${t('app.getCustomElementList')}-request`, {
    method: 'getCustomElements',
    includeElement: false
  })
  try {
    const elements = await el.getCustomElements({ includeElement: false })
    appendPrintDebugLog(`${t('app.getCustomElementList')}-success`, elements ?? null)
  } catch (error) {
    appendPrintDebugLog(`${t('app.getCustomElementList')}-error`, {
      message: error?.message || String(error)
    })
  }
}

/**
 * 获取自定义元素详情
 * 调用 getCustomElement 方法获取指定自定义元素的详细数据
 */
const handleGetCustomElementDetail = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.getCustomElement !== 'function') {
    appendPrintDebugLog(`${t('app.getCustomElementDetail')}-error`, {
      method: 'getCustomElement',
      message: t('app.methodUnavailable')
    })
    ElMessage.warning(t('app.methodUnavailable'))
    return
  }
  const input = window.prompt(t('app.enterCustomElementId'), '')
  if (input === null) {
    return
  }
  const elementId = input.trim()
  if (!elementId) {
    appendPrintDebugLog(`${t('app.getCustomElementDetail')}-error`, {
      message: t('app.customElementIdRequired')
    })
    ElMessage.warning(t('app.customElementIdRequired'))
    return
  }
  appendPrintDebugLog(`${t('app.getCustomElementDetail')}-request`, {
    method: 'getCustomElement',
    elementId
  })
  try {
    const element = await el.getCustomElement(elementId)
    appendPrintDebugLog(`${t('app.getCustomElementDetail')}-success`, element ?? null)
  } catch (error) {
    appendPrintDebugLog(`${t('app.getCustomElementDetail')}-error`, {
      elementId,
      message: error?.message || String(error)
    })
  }
}


/**
 * 导出 PDF
 * 调用 export 方法将当前模板导出为 PDF 文件
 */
const handleExport = async () => {
  const el = designerRef.value
  if (!el?.export || !templateReady.value) return
  applyVariables()
  const request = { type: 'pdf', filename: `${formModel.value.orderNo}.pdf` }
  appendPrintDebugLog(`${t('app.exportPdf')}-request`, request)
  try {
    await el.export(request)
    appendPrintDebugLog(`${t('app.exportPdf')}-success`, request)
  } catch (error) {
    appendPrintDebugLog(`${t('app.exportPdf')}-error`, { request, message: error?.message || String(error) })
    throw error
  }
}

/**
 * 导出图片
 * 调用 export 方法将当前模板导出为图片（每页一张）
 */
const handleExportImages = async () => {
  const el = designerRef.value
  if (!el?.export || !templateReady.value) return
  applyVariables()
  const request = { type: 'images', filenamePrefix: `${formModel.value.orderNo}-images`, merged: false }
  appendPrintDebugLog(`${t('app.exportImages')}-request`, request)
  try {
    await el.export(request)
    appendPrintDebugLog(`${t('app.exportImages')}-success`, request)
    ElMessage.success(t('app.imagesExported'))
  } catch (error) {
    appendPrintDebugLog(`${t('app.exportImages')}-error`, { request, message: error?.message || String(error) })
    throw error
  }
}

/**
 * 导出合并图片
 * 调用 export 方法将当前模板导出为一张长图
 */
const handleExportMergedImage = async () => {
  const el = designerRef.value
  if (!el?.export || !templateReady.value) return
  applyVariables()
  const request = { type: 'images', filenamePrefix: `${formModel.value.orderNo}-merged`, merged: true }
  appendPrintDebugLog(`${t('app.exportMergedImage')}-request`, request)
  try {
    await el.export(request)
    appendPrintDebugLog(`${t('app.exportMergedImage')}-success`, request)
    ElMessage.success(t('app.mergedImageExported'))
  } catch (error) {
    appendPrintDebugLog(`${t('app.exportMergedImage')}-error`, { request, message: error?.message || String(error) })
    throw error
  }
}

const updateBlobUrl = (targetRef, blob) => {
  if (targetRef.value) {
    URL.revokeObjectURL(targetRef.value)
  }
  targetRef.value = URL.createObjectURL(blob)
}

/**
 * 获取 PDF Blob
 * 调用 export 方法生成 PDF 的 Blob 对象，用于预览或下载
 */
const handleGetPdfBlob = async () => {
  const el = designerRef.value
  if (!el?.export || !templateReady.value) return
  applyVariables()
  const request = { type: 'pdfBlob' }
  appendPrintDebugLog(`${t('app.getPdfBlob')}-request`, request)
  try {
    const result = await el.export(request)
    if (!(result instanceof Blob)) return
    updateBlobUrl(pdfBlobUrl, result)
    blobPreviewType.value = 'pdf'
    blobPreviewVisible.value = true
    appendPrintDebugLog(`${t('app.getPdfBlob')}-success`, { size: result.size, type: result.type })
    ElMessage.success(t('app.pdfBlobReady'))
  } catch (error) {
    appendPrintDebugLog(`${t('app.getPdfBlob')}-error`, { request, message: error?.message || String(error) })
    throw error
  }
}

/**
 * 获取图片 Blob
 * 调用 export 方法生成图片的 Blob 对象
 */
const handleGetImageBlob = async () => {
  const el = designerRef.value
  if (!el?.export || !templateReady.value) return
  applyVariables()
  const request = { type: 'imageBlob' }
  appendPrintDebugLog(`${t('app.getImageBlob')}-request`, request)
  try {
    const result = await el.export(request)
    if (!(result instanceof Blob)) return
    updateBlobUrl(imageBlobUrl, result)
    blobPreviewType.value = 'image'
    blobPreviewVisible.value = true
    appendPrintDebugLog(`${t('app.getImageBlob')}-success`, { size: result.size, type: result.type })
    ElMessage.success(t('app.imageBlobReady'))
  } catch (error) {
    appendPrintDebugLog(`${t('app.getImageBlob')}-error`, { request, message: error?.message || String(error) })
    throw error
  }
}

if (globalState) {
  watch(globalState.isDark, (val) => {
    designerRef.value?.setTheme?.(val ? 'dark' : 'light')
  })
  watch(globalState.locale, () => {
    setupBranding()
  })
}

watch(printVariables, () => {
  applyVariables()
})

watch(
  () => [printDebugModel.value.mode, printDebugModel.value.silentPrint],
  () => {
    applyPrintDefaults()
  }
)

watch(
  () => printDebugVisible.value,
  async (visible) => {
    if (!visible) return
    try {
      if (printDebugModel.value.mode === 'remote') {
        await fetchRemoteClientsForDebug()
        await fetchRemotePrintersForDebug()
        return
      }
      await fetchLocalPrintersForDebug()
    } catch (error) {
      appendPrintDebugLog(`${t('app.printDebugTitle')}-error`, { message: error?.message || String(error) })
    }
  }
)

watch(
  () => printDebugModel.value.mode,
  async (mode) => {
    try {
      if (!printDebugVisible.value) return
      if (mode === 'remote') {
        await fetchRemoteClientsForDebug()
        await fetchRemotePrintersForDebug()
        return
      }
      await fetchLocalPrintersForDebug()
    } catch (error) {
      appendPrintDebugLog(`${t('app.printDebugTitle')}-error`, { message: error?.message || String(error) })
    }
  }
)

watch(
  () => selectedRemoteClientId.value,
  async () => {
    if (!printDebugVisible.value || printDebugModel.value.mode !== 'remote') return
    try {
      await fetchRemotePrintersForDebug()
    } catch (error) {
      appendPrintDebugLog(`${t('app.getCloudClientInfo')}-error`, { message: error?.message || String(error) })
    }
  }
)

onMounted(() => {
  const el = designerRef.value
  if (!el?.addEventListener) return
  el.addEventListener('ready', handleReady)
  customElements.whenDefined('print-designer').then(async () => {
    const instance = designerRef.value
    if (!instance) return
    configurePrintDesigner(instance)
    setupBranding()
    if (!templateReady.value) {
      await initTemplate()
    }
  })
})

onBeforeUnmount(() => {
  designerRef.value?.removeEventListener?.('ready', handleReady)
  if (pdfBlobUrl.value) {
    URL.revokeObjectURL(pdfBlobUrl.value)
  }
  if (imageBlobUrl.value) {
    URL.revokeObjectURL(imageBlobUrl.value)
  }
})
</script>

<template>
  <div class="page business-form-page">
    <el-card shadow="never" class="business-form-card">
      <div class="page-header">
        <div>
          <h2 class="page-title">{{ t('app.businessForm') }}</h2>
          <p class="page-desc">{{ t('app.businessFormDesc') }}</p>
        </div>
      </div>
      <div class="business-form-actions">
        <div class="business-form-actions-left">
          <el-button @click="handleGetPrinterInfo">{{ t('app.getPrinterInfo') }}</el-button>
          <el-button @click="handleGetPrinterCaps">{{ t('app.getPrinterCaps') }}</el-button>
          <el-button @click="handleGetCloudClientInfo">{{ t('app.getCloudClientInfo') }}</el-button>
          <el-button @click="handleGetCloudPrinterList">{{ t('app.getCloudPrinterList') }}</el-button>
          <el-button @click="handleGetTemplateList">{{ t('app.getTemplateList') }}</el-button>
          <el-button @click="handleGetTemplateDetail">{{ t('app.getTemplateDetail') }}</el-button>
          <el-button @click="handleGetCustomElementList">{{ t('app.getCustomElementList') }}</el-button>
          <el-button @click="handleGetCustomElementDetail">{{ t('app.getCustomElementDetail') }}</el-button>
          <el-button @click="handleExport">{{ t('app.exportPdf') }}</el-button>
          <el-button @click="handleExportImages">{{ t('app.exportImages') }}</el-button>
          <el-button @click="handleExportMergedImage">{{ t('app.exportMergedImage') }}</el-button>
          <el-button @click="handleGetPdfBlob">{{ t('app.getPdfBlob') }}</el-button>
          <el-button @click="handleGetImageBlob">{{ t('app.getImageBlob') }}</el-button>
        </div>
        <div class="business-form-actions-right">
          <div class="silent-print-inline">
            <span>{{ t('app.silentPrint') }}</span>
            <el-switch v-model="printDebugModel.silentPrint" />
          </div>
          <el-button type="primary" @click="handlePrint">{{ t('app.printNow') }}</el-button>
          <el-button class="print-params-btn" @click="printDebugVisible = true">{{ t('app.printParams') }}</el-button>
        </div>
      </div>

      <el-form :model="formModel" label-width="100px" class="business-form">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="t('app.orderNo')">
              <el-input v-model="formModel.orderNo" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('app.customer')">
              <el-input v-model="formModel.customer" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('app.contact')">
              <el-input v-model="formModel.contact" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('app.bizDate')">
              <el-input v-model="formModel.orderTime" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item :label="t('app.remark')">
              <el-input v-model="formModel.remarks" type="textarea" :rows="2" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div class="business-table-actions">
        <el-button type="primary" plain @click="addProduct">{{ t('app.addProduct') }}</el-button>
      </div>

      <el-table :data="lineItems" border class="business-form-table" height="240">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column :label="t('app.product')">
          <template #default="{ row }">
            <el-input :model-value="row.name" @input="(value) => updateProductField(row, 'name', value)" />
          </template>
        </el-table-column>
        <el-table-column :label="t('app.qty')" width="150">
          <template #default="{ row }">
            <el-input-number
              :model-value="row.qty"
              :min="0"
              :precision="0"
              :step="1"
              @change="(value) => updateProductField(row, 'qty', value)"
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('app.price')" width="170">
          <template #default="{ row }">
            <el-input-number
              :model-value="row.price"
              :min="0"
              :precision="2"
              :step="1"
              @change="(value) => updateProductField(row, 'price', value)"
            />
          </template>
        </el-table-column>
        <el-table-column :label="t('app.amount')" width="140">
          <template #default="{ row }">
            {{ ((Number(row.qty) || 0) * (Number(row.price) || 0)).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column :label="t('app.action')" width="100">
          <template #default="{ row }">
            <el-button text type="danger" @click="removeProduct(row.id)">{{ t('app.delete') }}</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="business-print-host">
        <print-designer ref="designerRef" class="business-hidden-designer" :lang="globalState?.locale.value" />
      </div>
    </el-card>

    <el-card shadow="never" class="business-debug-log-card">
      <div class="business-debug-log-header">
        <h2 class="print-debug-block-title">{{ t('app.printDebugLog') }}</h2>
        <el-button text @click="clearPrintDebugLog">{{ t('app.clearDebugLog') }}</el-button>
      </div>
      <el-input :model-value="printDebugLogText" type="textarea" :rows="28" readonly />
    </el-card>
  </div>

  <el-dialog
    v-model="printDebugVisible"
    :title="t('app.printDebugTitle')"
    width="30%"
    destroy-on-close
  >
    <el-form label-width="110px" class="print-debug-form">
      <el-row :gutter="12">
        <el-col :span="12">
          <el-form-item :label="t('app.printMode')">
            <el-select v-model="printDebugModel.mode">
              <el-option label="browser" value="browser" />
              <el-option label="local" value="local" />
              <el-option label="remote" value="remote" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('app.copies')">
            <el-input-number v-model="printDebugModel.options.copies" :min="1" :step="1" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col v-if="printDebugModel.mode === 'remote'" :span="12">
          <el-form-item :label="t('app.cloudClient')">
            <el-select v-model="selectedRemoteClientId" clearable @change="handleRemoteClientSelection">
              <el-option
                v-for="item in remoteClientOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('app.printer')">
            <el-select
              v-model="printDebugModel.options.printer"
              filterable
              allow-create
              clearable
              default-first-option
              @clear="handleClearSelectedPrinter"
            >
              <el-option
                v-for="item in availablePrinterOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('app.jobName')">
            <el-input v-model="printDebugModel.options.jobName" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('app.pageRange')">
            <el-input v-model="printDebugModel.options.pageRange" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('app.orientation')">
            <el-select v-model="printDebugModel.options.orientation">
              <el-option :label="t('app.defaultOption')" value="" />
              <el-option label="portrait" value="portrait" />
              <el-option label="landscape" value="landscape" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('app.colorMode')">
            <el-select v-model="printDebugModel.options.colorMode">
              <el-option :label="t('app.defaultOption')" value="" />
              <el-option label="color" value="color" />
              <el-option label="monochrome" value="monochrome" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('app.sidesMode')">
            <el-select v-model="printDebugModel.options.sidesMode">
              <el-option :label="t('app.defaultOption')" value="" />
              <el-option label="simplex" value="simplex" />
              <el-option label="duplex" value="duplex" />
              <el-option label="duplexshort" value="duplexshort" />
              <el-option label="duplexlong" value="duplexlong" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="t('app.paperSize')">
            <el-input v-model="printDebugModel.options.paperSize" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <el-input :model-value="printRequestPreview" type="textarea" :rows="9" readonly />
  </el-dialog>

  <el-dialog
    v-model="blobPreviewVisible"
    :title="blobPreviewType === 'pdf' ? t('app.pdfBlobPreview') : t('app.imageBlobPreview')"
    width="70%"
    destroy-on-close
  >
    <iframe
      v-if="blobPreviewType === 'pdf' && pdfBlobUrl"
      :src="pdfBlobUrl"
      style="width: 100%; height: 70vh; border: 0"
    />
    <img
      v-else-if="blobPreviewType === 'image' && imageBlobUrl"
      :src="imageBlobUrl"
      style="max-width: 100%; max-height: 70vh; display: block; margin: 0 auto"
    />
    <template #footer>
      <el-link
        v-if="blobPreviewType === 'pdf' && pdfBlobUrl"
        :href="pdfBlobUrl"
        target="_blank"
        type="primary"
      >
        {{ t('app.openPdfBlob') }}
      </el-link>
      <el-link
        v-if="blobPreviewType === 'image' && imageBlobUrl"
        :href="imageBlobUrl"
        target="_blank"
        type="primary"
      >
        {{ t('app.openImageBlob') }}
      </el-link>
    </template>
  </el-dialog>
</template>
