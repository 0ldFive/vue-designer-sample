<script setup>
import { computed, ref, watch, provide, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { EditPen, Fold, HomeFilled, Expand, Grid, Moon, Sunny, Document } from '@element-plus/icons-vue'
import { ElConfigProvider } from 'element-plus'
// 导入语言包
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

// 全局状态
const isDark = ref(false)
const isCollapsed = ref(false)
// locale is managed by vue-i18n
const elementLocale = computed(() => (locale.value === 'zh-cn' ? zhCn : en))

// 获取初始配置
onMounted(async () => {
  try {
    const res = await fetch('/api/print/settings')
    const settings = await res.json()
    isDark.value = settings.theme === 'dark'
    locale.value = settings.locale
    isCollapsed.value = settings.isCollapsed || false
  } catch (err) {
    console.error('Failed to load settings from Mock API:', err)
  }
})

// 提供给子组件
provide('globalState', {
  isDark,
  locale
})

// 监听折叠状态变化
watch(isCollapsed, async (val) => {
  try {
    await fetch('/api/print/settings', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCollapsed: val })
    })
  } catch (err) {
    console.error('Failed to save collapsed state to Mock API:', err)
  }
})

// 监听主题变化
watch(isDark, async (val) => {
  const theme = val ? 'dark' : 'light'
  
  // 保存到 Mock API
  try {
    await fetch('/api/print/settings', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme })
    })
  } catch (err) {
    console.error('Failed to save theme to Mock API:', err)
  }

  if (val) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}, { immediate: true })

// 监听语言变化
watch(locale, async (val) => {
  // 保存到 Mock API
  try {
    await fetch('/api/print/settings', {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: val })
    })
  } catch (err) {
    console.error('Failed to save locale to Mock API:', err)
  }
})

// 切换语言
const handleCommand = (command) => {
  locale.value = command
}

const menuItems = [
  { path: '/dashboard', label: 'app.dashboard', icon: 'HomeFilled' },
  { path: '/designer', label: 'app.designer', icon: 'EditPen' },
  { path: '/business-form', label: 'app.businessForm', icon: 'Document' }
]

const tabs = ref([
  { path: '/dashboard', label: 'app.dashboard', icon: 'HomeFilled', closable: false }
])

const activeTab = computed({
  get: () => route.path,
  set: (value) => {
    if (value !== route.path) {
      router.push(value)
    }
  }
})

const ensureTab = (path) => {
  if (path === '/') return
  const exists = tabs.value.some((tab) => tab.path === path)
  if (exists) return
  const match = menuItems.find((item) => item.path === path)
  tabs.value.push({
    path,
    label: match?.label || route.meta?.title || path,
    icon: match?.icon,
    closable: path !== '/dashboard'
  })
}

const handleTabRemove = (path) => {
  if (path === '/dashboard') return
  const currentIndex = tabs.value.findIndex((tab) => tab.path === path)
  if (currentIndex === -1) return
  const nextTabs = tabs.value.filter((tab) => tab.path !== path)
  tabs.value = nextTabs
  if (route.path === path) {
    const fallback = nextTabs[currentIndex - 1] || nextTabs[currentIndex] || menuItems[0]
    if (fallback) {
      router.push(fallback.path)
    }
  }
}

watch(
  () => route.path,
  (path) => {
    ensureTab(path)
  },
  { immediate: true }
)
</script>

<template>
  <el-config-provider :locale="elementLocale">
    <el-container class="app-shell">
      <el-aside
        :width="isCollapsed ? '64px' : '220px'"
        class="aside"
        :class="{ collapsed: isCollapsed }"
      >
        <div class="brand">
          <el-icon v-if="isCollapsed" class="brand-icon"><Grid /></el-icon>
          <div v-else class="brand-title">{{ t('app.title') }}</div>
        </div>
        <el-menu
          :default-active="activeTab"
          :collapse="isCollapsed"
          :collapse-transition="false"
          router
          class="menu"
        >
          <el-menu-item index="/dashboard">
            <el-icon><HomeFilled /></el-icon>
            <span>{{ t('app.dashboard') }}</span>
          </el-menu-item>
          <el-menu-item index="/designer">
            <el-icon><EditPen /></el-icon>
            <span>{{ t('app.designer') }}</span>
          </el-menu-item>
          <el-menu-item index="/business-form">
            <el-icon><Document /></el-icon>
            <span>{{ t('app.businessForm') }}</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-container>
        <el-header class="header">
          <div class="header-left">
            <el-button text class="collapse-btn" @click="isCollapsed = !isCollapsed">
              <el-icon>
                <Fold v-if="!isCollapsed" />
                <Expand v-else />
              </el-icon>
            </el-button>
          </div>
          <div class="header-right">
            <el-switch
              v-model="isDark"
              inline-prompt
              :active-icon="Moon"
              :inactive-icon="Sunny"
              class="theme-switch"
            />
            <el-select v-model="locale" class="lang-select">
              <el-option :label="t('languages.zh')" value="zh-cn" />
              <el-option :label="t('languages.en')" value="en" />
            </el-select>
          </div>
        </el-header>
        <div class="tabs-bar">
          <el-tabs
            v-model="activeTab"
            type="card"
            closable
            class="route-tabs"
            @tab-remove="handleTabRemove"
          >
            <el-tab-pane
              v-for="tab in tabs"
              :key="tab.path"
              :name="tab.path"
              :closable="tab.closable"
            >
              <template #label>
                <el-icon v-if="tab.icon === 'HomeFilled'"><HomeFilled /></el-icon>
                <el-icon v-else-if="tab.icon === 'EditPen'"><EditPen /></el-icon>
                <el-icon v-else-if="tab.icon === 'Document'"><Document /></el-icon>
                <span>{{ t(tab.label) }}</span>
              </template>
            </el-tab-pane>
          </el-tabs>
        </div>
        <el-main class="main">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </el-config-provider>
</template>
