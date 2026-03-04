import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteMockServe } from 'vite-plugin-mock'

// https://vite.dev/config/
export default defineConfig({
  base: './', // 确保相对路径引用，适应 GitHub Pages 等非根目录部署
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === 'print-designer'
        }
      }
    }),
    viteMockServe({
      mockPath: 'mock',
      enable: true,
      localEnabled: true, // 开启本地开发环境 Mock
      prodEnabled: false, // 关闭插件自动注入，使用手动注入
      logger: true, // 开启日志
    })
  ]
})
