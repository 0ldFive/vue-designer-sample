<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EditPen, Fold, HomeFilled, Expand, Grid } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { path: '/dashboard', label: '控制台', icon: 'HomeFilled' },
  { path: '/designer', label: '打印设计器', icon: 'EditPen' }
]

const tabs = ref([
  { path: '/dashboard', label: '控制台', icon: 'HomeFilled', closable: false }
])
const isCollapsed = ref(false)

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
  <el-container class="app-shell">
    <el-aside
      :width="isCollapsed ? '64px' : '220px'"
      class="aside"
      :class="{ collapsed: isCollapsed }"
    >
      <div class="brand">
        <el-icon v-if="isCollapsed" class="brand-icon"><Grid /></el-icon>
        <div v-else class="brand-title">XXX SaaS平台</div>
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
          <span>控制台</span>
        </el-menu-item>
        <el-menu-item index="/designer">
          <el-icon><EditPen /></el-icon>
          <span>打印设计器</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <el-button text class="collapse-btn" @click="isCollapsed = !isCollapsed">
          <el-icon>
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </el-button>
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
              <span>{{ tab.label }}</span>
            </template>
          </el-tab-pane>
        </el-tabs>
      </div>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
