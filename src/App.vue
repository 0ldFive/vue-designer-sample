<script setup>
import { computed, ref, watch, provide, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { EditPen, Fold, HomeFilled, Expand, Grid, Moon, Sunny, Document, User, Lock, Key, Message, Loading } from '@element-plus/icons-vue'
import { ElConfigProvider, ElMessage } from 'element-plus'
// 导入语言包
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()

const isDark = ref(false)
const isCollapsed = ref(false)
const elementLocale = computed(() => (locale.value === 'zh-cn' ? zhCn : en))
const starAccessGranted = ref(false)
const starAccessLoading = ref(false)
const authTokenKey = 'printdot_auth_token'
const authApiBase = (import.meta.env.VITE_AUTH_API_BASE || 'https://printdot.cc/api/auth').replace(/\/$/, '')
const isAccessReady = computed(() => starAccessGranted.value)
const loginForm = ref({
  account: '',
  password: '',
  captcha: ''
})

const updateUrlAfterAuth = () => {
  const current = new URL(window.location.href)
  current.searchParams.delete('token')
  current.searchParams.delete('access_token')
  current.searchParams.delete('reason')
  current.searchParams.delete('message')
  window.history.replaceState({}, '', `${current.pathname}${current.search}${current.hash}`)
}

const verifyStarAccess = async () => {
  starAccessLoading.value = true
  try {
    const token = localStorage.getItem(authTokenKey)
    if (!token) {
      starAccessGranted.value = false
      ElMessage.warning('请先登录 Gitee 后再访问')
      return
    }
    const res = await fetch(`${authApiBase}/star-access`, {
      method: 'get',
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (res.ok && data?.granted) {
      starAccessGranted.value = true
      return
    }
    starAccessGranted.value = false
    if (res.status === 401) {
      localStorage.removeItem(authTokenKey)
    }
    ElMessage.error('当前账号访问校验未通过，请稍后重试')
  } catch (err) {
    starAccessGranted.value = false
    ElMessage.error(err?.message || '校验失败，请稍后重试')
  } finally {
    starAccessLoading.value = false
  }
}

const handleGiteeLogin = () => {
  const loginUrl = new URL(`${authApiBase}/gitee/login`)
  loginUrl.searchParams.set('redirect', window.location.href)
  window.location.href = loginUrl.toString()
}

onMounted(async () => {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}api/print/settings`)
    const settings = await res.json()
    isDark.value = settings.theme === 'dark'
    locale.value = settings.locale
    isCollapsed.value = settings.isCollapsed || false
  } catch (err) {
    console.error('Failed to load settings from Mock API:', err)
  }
  const query = new URLSearchParams(window.location.search)
  const token = query.get('token') || query.get('access_token')
  const reason = query.get('reason')
  const message = query.get('message')
  if (token) {
    localStorage.setItem(authTokenKey, token)
    updateUrlAfterAuth()
  }
  if (reason) {
    starAccessGranted.value = false
    ElMessage.error(message || '登录失败，请重试')
    localStorage.removeItem(authTokenKey)
    updateUrlAfterAuth()
    return
  }
  await verifyStarAccess()
})

provide('globalState', {
  isDark,
  locale
})

watch(isCollapsed, async (val) => {
  try {
    await fetch(`${import.meta.env.BASE_URL}api/print/settings`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCollapsed: val })
    })
  } catch (err) {
    console.error('Failed to save collapsed state to Mock API:', err)
  }
})

watch(isDark, async (val) => {
  const theme = val ? 'dark' : 'light'

  try {
    await fetch(`${import.meta.env.BASE_URL}api/print/settings`, {
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

watch(locale, async (val) => {
  try {
    await fetch(`${import.meta.env.BASE_URL}api/print/settings`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: val })
    })
  } catch (err) {
    console.error('Failed to save locale to Mock API:', err)
  }
})

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
    <div v-if="!isAccessReady" class="star-gate-wrap">
      <el-card class="star-gate-card" shadow="never">
        <div class="star-gate-logo">
          <div class="star-gate-logo-mark"><Grid /></div>
          <div class="star-gate-logo-texts">
            <h2 class="star-gate-title">{{ t('app.title') }}</h2>
            <p class="star-gate-subtitle">vue-print-designer 插件集成示例 SaaS 控制台</p>
          </div>
        </div>
        <p class="star-gate-desc">欢迎登录控制台，账号登录入口为演示骨架，当前仅支持 Gitee 三方登录。</p>
        <el-form :model="loginForm" class="star-gate-form">
          <el-form-item>
            <el-input v-model="loginForm.account" :prefix-icon="User" placeholder="请输入账号" disabled />
          </el-form-item>
          <el-form-item>
            <el-input v-model="loginForm.password" :prefix-icon="Lock" type="password" placeholder="请输入密码" show-password disabled />
          </el-form-item>
          <el-form-item>
            <div class="star-gate-captcha-row">
              <el-input v-model="loginForm.captcha" :prefix-icon="Key" placeholder="请输入验证码" disabled />
              <el-button disabled>
                <el-icon><Message /></el-icon>
                获取验证码
              </el-button>
            </div>
          </el-form-item>
          <el-button class="star-gate-primary-btn" type="primary" size="large" disabled>
            <el-icon><Lock /></el-icon>
            账号登录（即将支持）
          </el-button>
        </el-form>
        <div class="star-gate-divider">
          <span>三方登录</span>
        </div>
        <div class="star-gate-actions">
          <el-button class="star-gitee-circle-btn" type="primary" :disabled="starAccessLoading" circle @click="handleGiteeLogin">
            <el-icon v-if="starAccessLoading" class="is-loading star-gitee-loading"><Loading /></el-icon>
            <img v-else class="star-gitee-icon" src="https://cdn.simpleicons.org/gitee/ffffff" alt="Gitee" />
          </el-button>
          <el-link href="https://gitee.com/theGreatOldFive/vue-print-designer" target="_blank" type="primary" class="star-gate-link">🙏 如果喜欢这个项目，欢迎点个 Star 支持一下 ✨</el-link>
        </div>
      </el-card>
    </div>
    <el-container v-else class="app-shell">
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
