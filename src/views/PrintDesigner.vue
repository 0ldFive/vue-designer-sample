<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const designerRef = ref(null)
const designerReady = ref(false)

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
  el.setBranding?.({ title: '业务打印设计器', showLogo: true })
  el.setTheme?.('light')
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
      <print-designer id="designer" ref="designerRef" class="designer-element" />
    </el-card>
  </div>
</template>
