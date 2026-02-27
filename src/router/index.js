import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import PrintDesigner from '../views/PrintDesigner.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { title: '控制台' } },
  { path: '/designer', name: 'PrintDesigner', component: PrintDesigner, meta: { title: '打印设计器' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
