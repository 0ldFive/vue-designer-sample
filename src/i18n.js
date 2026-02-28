import { createI18n } from 'vue-i18n'

const messages = {
  'zh-cn': {
    app: {
      title: 'XXX SaaS平台',
      dashboard: '控制台',
      designer: '打印设计器',
      language: '中文',
      theme: '主题'
    },
    languages: {
      zh: '中文',
      en: 'English'
    }
  },
  en: {
    app: {
      title: 'XXX SaaS Platform',
      dashboard: 'Dashboard',
      designer: 'Print Designer',
      language: 'English',
      theme: 'Theme'
    },
    languages: {
      zh: 'Chinese',
      en: 'English'
    }
  }
}

const i18n = createI18n({
  legacy: false, // use Composition API
  locale: localStorage.getItem('locale') || 'zh-cn',
  fallbackLocale: 'zh-cn',
  messages
})

export default i18n
