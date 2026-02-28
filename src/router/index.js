import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import PrintDesigner from '../views/PrintDesigner.vue'

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard, meta: { title: 'app.dashboard' } },
  { path: '/designer', name: 'PrintDesigner', component: PrintDesigner, meta: { title: 'app.designer' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
