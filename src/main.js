import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'vue-print-designer'
import 'vue-print-designer/style.css'
import './style.css'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

createApp(App).use(router).use(ElementPlus).use(i18n).mount('#app')
