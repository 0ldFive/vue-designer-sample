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

const lineItems = ref([
  { id: 1, name: '控制器主板', qty: 12, price: 280 },
  { id: 2, name: '传感器模组', qty: 20, price: 75 },
  { id: 3, name: '连接线束', qty: 30, price: 18 }
])

const lineItemsWithTotal = computed(() =>
  lineItems.value.map((item) => ({
    ...item,
    total: item.qty * item.price
  }))
)

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

const localPrinterOptions = computed(() =>
  localPrinters.value
    .map((item, index) => {
      const value = resolveOptionValue(item, ['printer', 'name', 'printerName', 'id'], `local-${index}`)
      const label = resolveOptionValue(item, ['name', 'printer', 'printerName', 'id'], value)
      return { value, label }
    })
    .filter((item) => item.value)
)

const remoteClientOptions = computed(() =>
  remoteClients.value
    .map((item, index) => {
      const value = resolveOptionValue(item, ['clientId', 'id', 'name'], `client-${index}`)
      const label = resolveOptionValue(item, ['name', 'clientName', 'clientId', 'id'], value)
      return { value, label }
    })
    .filter((item) => item.value)
)

const remotePrinterOptions = computed(() =>
  remotePrinters.value
    .map((item, index) => {
      const value = resolveOptionValue(item, ['printer', 'name', 'printerName', 'id'], `remote-${index}`)
      const label = resolveOptionValue(item, ['name', 'printer', 'printerName', 'id'], value)
      return { value, label }
    })
    .filter((item) => item.value)
)

const availablePrinterOptions = computed(() =>
  printDebugModel.value.mode === 'remote' ? remotePrinterOptions.value : localPrinterOptions.value
)

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

const applyPrintDefaults = () => {
  const el = designerRef.value
  if (!el?.setPrintDefaults) return
  el.setPrintDefaults({
    printMode: printDebugModel.value.mode || 'browser',
    silentPrint: !!printDebugModel.value.silentPrint
  })
}

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

const applyVariables = () => {
  const el = designerRef.value
  if (!el?.setVariables || !templateReady.value) return
  el.setVariables(printVariables.value, { merge: false })
}

const initTemplate = async () => {
  const el = designerRef.value
  if (!el?.loadTemplateData) return
  const res = await fetch('/api/print/templates')
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

const handleReady = async () => {
  setupBranding()
  if (!templateReady.value) {
    await initTemplate()
  }
}

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

const fetchRemoteClientsForDebug = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.fetchRemoteClients !== 'function') {
    return null
  }
  const data = await el.fetchRemoteClients()
  remoteClients.value = Array.isArray(data) ? data : []
  if (!remoteClientOptions.value.some((item) => item.value === selectedRemoteClientId.value)) {
    selectedRemoteClientId.value = remoteClientOptions.value[0]?.value || ''
  }
  return data
}

const fetchRemotePrintersForDebug = async () => {
  const el = await getDesignerInstance()
  if (typeof el?.fetchRemotePrinters !== 'function') {
    return null
  }
  const data = await el.fetchRemotePrinters(selectedRemoteClientId.value || undefined)
  remotePrinters.value = Array.isArray(data) ? data : []
  syncSelectedPrinter()
  return data
}

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
        <div class="business-form-actions">
          <div class="silent-print-inline">
            <span>{{ t('app.silentPrint') }}</span>
            <el-switch v-model="printDebugModel.silentPrint" />
          </div>
          <el-button type="primary" @click="handlePrint">{{ t('app.printNow') }}</el-button>
          <el-button @click="handleGetPrinterInfo">{{ t('app.getPrinterInfo') }}</el-button>
          <el-button @click="handleGetCloudClientInfo">{{ t('app.getCloudClientInfo') }}</el-button>
          <el-button @click="printDebugVisible = true">{{ t('app.printDebugTitle') }}</el-button>
          <el-button @click="handleExport">{{ t('app.exportPdf') }}</el-button>
          <el-button @click="handleExportImages">{{ t('app.exportImages') }}</el-button>
          <el-button @click="handleExportMergedImage">{{ t('app.exportMergedImage') }}</el-button>
          <el-button @click="handleGetPdfBlob">{{ t('app.getPdfBlob') }}</el-button>
          <el-button @click="handleGetImageBlob">{{ t('app.getImageBlob') }}</el-button>
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

      <el-table :data="lineItemsWithTotal" border class="business-form-table">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" :label="t('app.product')" />
        <el-table-column prop="qty" :label="t('app.qty')" width="120" />
        <el-table-column prop="price" :label="t('app.price')" width="120" />
        <el-table-column prop="total" :label="t('app.amount')" width="120" />
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
    width="50%"
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
            <el-select v-model="selectedRemoteClientId" clearable>
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
