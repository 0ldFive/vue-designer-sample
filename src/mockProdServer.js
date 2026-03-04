import { createProdMockServer } from 'vite-plugin-mock/es/createProdMockServer'
import mockRoutes from '../mock/print.js'

export function setupProdMockServer() {
  createProdMockServer(mockRoutes)
}