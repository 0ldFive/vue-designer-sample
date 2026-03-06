<script setup>
import { onBeforeUnmount, onMounted, ref, inject, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { configurePrintDesigner } from '../utils/print-settings'

const designerRef = ref(null)
const designerReady = ref(false)
const globalState = inject('globalState')
const { t } = useI18n()

console.log('[PrintDesigner] setup')

/**
 * 执行打印
 * 调用 design.print 方法，使用浏览器默认打印模式
 */
const handlePrint = async () => {
  const el = designerRef.value
  if (!el?.print) return
  await el.print({ mode: 'browser' })
}

/**
 * 导出 PDF
 * 调用 design.export 方法导出 PDF 文件
 */
const handleExport = async () => {
  const el = designerRef.value
  if (!el?.export) return
  await el.export({ type: 'pdf', filename: 'template.pdf' })
}

/**
 * 设计器就绪处理
 * 初始化品牌信息、主题和语言设置
 */
const handleReady = () => {
  console.log('[PrintDesigner] handleReady triggered')
  const el = designerRef.value
  if (!el) return
  designerReady.value = true
  el.setBranding?.({ title: t('app.designer'), showLogo: true })
  // 初始化主题
  if (globalState) {
    el.setTheme?.(globalState.isDark.value ? 'dark' : 'light')
    const lang = globalState.locale.value === 'zh-cn' ? 'zh' : 'en'
    if (el.setLanguage) el.setLanguage(lang)
  }
}

// 监听全局状态变化
if (globalState) {
  watch(globalState.isDark, (val) => {
    console.log('[PrintDesigner] watch(isDark)', val)
    const el = designerRef.value
    if (el?.setTheme) el.setTheme(val ? 'dark' : 'light')
  })

  watch(globalState.locale, (val) => {
    console.log('[PrintDesigner] watch(locale)', val)
    const el = designerRef.value
    if (el?.setLanguage) {
      el.setLanguage(val === 'zh-cn' ? 'zh' : 'en')
    }
    el.setBranding?.({ title: t('app.designer'), showLogo: true })
  })
}

onMounted(() => {
  console.log('[PrintDesigner] onMounted')
  const el = designerRef.value
  if (!el?.addEventListener) return
  el.addEventListener('ready', handleReady)

  // 确保元素定义后再配置 Mock 接口和远程模式
  customElements.whenDefined('print-designer').then(() => {
    console.log('[PrintDesigner] customElements.whenDefined resolved')
    const el = designerRef.value
    console.log('[PrintDesigner] element methods:', {
      setCrudEndpoints: typeof el?.setCrudEndpoints,
      setCrudMode: typeof el?.setCrudMode,
      setBranding: typeof el?.setBranding
    })

    if (el?.setCrudEndpoints) {
      configurePrintDesigner(el)
    } else {
      console.warn('[PrintDesigner] setCrudEndpoints method missing on element')
    }

    // 如果 ready 事件没有触发，尝试手动初始化
    if (!designerReady.value) {
      console.log('[PrintDesigner] Manual init triggered via whenDefined')
      handleReady()
    }
    
    // Test Mock API
    fetch('api/print/templates')
      .then(res => res.json())
      .then(data => console.log('[PrintDesigner] Mock API Test Result:', data))
      .catch(err => console.error('[PrintDesigner] Mock API Test Failed:', err))
  })
})

onBeforeUnmount(() => {
  console.log('[PrintDesigner] onBeforeUnmount')
  const el = designerRef.value
  if (!el?.removeEventListener) return
  el.removeEventListener('ready', handleReady)
})
</script>

<template>
  <div class="page designer-page">
    <div class="page-header"></div>

    <el-card class="designer-card" shadow="never">
      <print-designer 
        id="designer" 
        ref="designerRef" 
        class="designer-element" 
        :lang="globalState?.locale.value"
      />
    </el-card>
  </div>
</template>
