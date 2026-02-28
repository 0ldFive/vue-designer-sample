<script setup>
import { onBeforeUnmount, onMounted, ref, inject, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const designerRef = ref(null)
const designerReady = ref(false)
const globalState = inject('globalState')
const { t } = useI18n()

const handlePrint = async () => {
  const el = designerRef.value
  if (!el?.print) return
  await el.print({ mode: 'browser' })
}

const handleExport = async () => {
  const el = designerRef.value
  if (!el?.export) return
  await el.export({ type: 'pdf', filename: 'template.pdf' })
}

const handleReady = () => {
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
    const el = designerRef.value
    if (el?.setTheme) el.setTheme(val ? 'dark' : 'light')
  })

  watch(globalState.locale, (val) => {
    const el = designerRef.value
    if (el?.setLanguage) {
      el.setLanguage(val === 'zh-cn' ? 'zh' : 'en')
    }
    el.setBranding?.({ title: t('app.designer'), showLogo: true })
  })
}

onMounted(() => {
  const el = designerRef.value
  if (!el?.addEventListener) return
  el.addEventListener('ready', handleReady)
})

onBeforeUnmount(() => {
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
