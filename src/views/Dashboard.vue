<script setup>
import { ref } from 'vue'
import { ElImageViewer } from 'element-plus'
import { ArrowRight, TopRight } from '@element-plus/icons-vue'
import logoImg from '../assets/logo.png'
import client1Img from '../assets/client1.png'
import client2Img from '../assets/client2.png'
import qqGroupImg from '../assets/qq_group.jpg'

const recentActivities = [
  { time: '10:24', action: '采购入库 120 件（电子元件）', actor: '采购部' },
  { time: '09:18', action: '销售出库 36 件（成品A）', actor: '销售部' },
  { time: '昨日', action: '库存盘点完成（仓库A）', actor: '仓储部' },
  { time: '昨日', action: '供应商对账更新（华东供应链）', actor: '财务部' }
]

const showImageViewer = ref(false)
const imageViewerList = ref([])
const imageViewerIndex = ref(0)

const openImageViewer = (list, index = 0) => {
  imageViewerList.value = list
  imageViewerIndex.value = index
  showImageViewer.value = true
}

const closeImageViewer = () => {
  showImageViewer.value = false
}
</script>

<template>
  <div class="page">
    <!-- Project Badges -->
    <div class="project-badges">
      <a href="https://gitee.com/theGreatOldFive/vue-print-designer" target="_blank" class="badge-link">
        <img src="https://gitee.com/theGreatOldFive/vue-print-designer/badge/star.svg?theme=white" alt="Gitee Stars" />
      </a>
      <a href="https://github.com/0ldFive/Vue-Print-Designer" target="_blank" class="badge-link">
        <img src="https://img.shields.io/github/stars/0ldFive/Vue-Print-Designer?style=social" alt="GitHub Stars" />
      </a>
      <a href="https://www.npmjs.com/package/vue-print-designer" target="_blank" class="badge-link">
        <img src="https://img.shields.io/npm/v/vue-print-designer?style=flat-square&color=CB3837" alt="NPM Version" />
      </a>
      <a href="https://www.npmjs.com/package/vue-print-designer" target="_blank" class="badge-link">
        <img src="https://img.shields.io/npm/dm/vue-print-designer?style=flat-square&color=CB3837" alt="NPM Downloads" />
      </a>
    </div>

    <div class="page-header">
      <img :src="logoImg" class="dashboard-logo" alt="PrintDot Logo" />
    </div>

    <el-card shadow="hover" class="guide-container">
      <div class="guide-content">
        <!-- Item 1: Download Client -->
        <div class="guide-item">
          <div class="guide-header">
            <span class="step-num">1.</span>
            <span class="step-title">下载客户端</span>
          </div>
          <div class="guide-body client-row">
            <div class="client-images">
              <img 
                :src="client1Img" 
                class="client-img" 
                alt="客户端 1" 
                @click="openImageViewer([client1Img, client2Img], 0)"
              />
              <img 
                :src="client2Img" 
                class="client-img" 
                alt="客户端 2" 
                @click="openImageViewer([client1Img, client2Img], 1)"
              />
            </div>
            <div class="link-hint">
              <el-link type="primary" href="https://github.com/0ldFive/PrintDot-Client/releases" target="_blank">
                前往 GitHub Release 下载 <el-icon><TopRight /></el-icon>
              </el-link>
            </div>
          </div>
        </div>

        <!-- Item 2: Join QQ Group -->
        <div class="guide-item">
          <div class="guide-header">
            <span class="step-num">2.</span>
            <span class="step-title">问题反馈 QQ 群</span>
          </div>
          <div class="guide-body qq-row">
            <img 
              :src="qqGroupImg" 
              class="qq-img" 
              alt="QQ 群" 
              @click="openImageViewer([qqGroupImg], 0)"
            />
            <div class="qq-number">QQ群：1038069636</div>
          </div>
        </div>

        <!-- Item 3: Visit Website -->
        <div class="guide-item">
          <div class="guide-header">
            <span class="step-num">3.</span>
            <span class="step-title">官网地址</span>
          </div>
          <div class="guide-body web-row">
            <el-link type="primary" href="https://printdot.cc" target="_blank" class="web-link">
              https://printdot.cc <el-icon><TopRight /></el-icon>
            </el-link>
          </div>
        </div>

        <!-- Item 4: Cloud Print -->
        <div class="guide-item">
          <div class="guide-header">
            <span class="step-num">4.</span>
            <span class="step-title">云打印</span>
          </div>
          <div class="guide-body web-row">
            <el-link type="primary" href="https://printdot.cc/cloud-print" target="_blank" class="web-link">
              https://printdot.cc/cloud-print <el-icon><TopRight /></el-icon>
            </el-link>
          </div>
        </div>
      </div>
    </el-card>

    <el-image-viewer
      v-if="showImageViewer"
      :url-list="imageViewerList"
      :initial-index="imageViewerIndex"
      @close="closeImageViewer"
    />

    <el-row :gutter="16" class="card-grid">
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover">
          <div class="metric">
            <div class="metric-label">库存 SKU</div>
            <div class="metric-value">1,284</div>
            <div class="metric-trend">本周 +18</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover">
          <div class="metric">
            <div class="metric-label">库存预警</div>
            <div class="metric-value">27</div>
            <div class="metric-trend">需补货</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover">
          <div class="metric">
            <div class="metric-label">今日销售额</div>
            <div class="metric-value">¥218,600</div>
            <div class="metric-trend">订单 42</div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :lg="6">
        <el-card shadow="hover">
          <div class="metric">
            <div class="metric-label">采购待收货</div>
            <div class="metric-value">9</div>
            <div class="metric-trend">在途</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="section-card" shadow="never">
      <el-table :data="recentActivities" height="260">
        <el-table-column prop="time" label="时间" width="100" />
        <el-table-column prop="action" label="业务动态" />
        <el-table-column prop="actor" label="部门" width="120" />
      </el-table>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  padding: 16px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.dashboard-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.project-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.badge-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  transition: opacity 0.2s;
}

.badge-link:hover {
  opacity: 0.8;
}

.badge-link img {
  height: 20px;
  display: block;
}

.guide-container {
  margin-bottom: 20px;
}

.guide-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 10px;
}

.guide-item {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.guide-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2329;
}

.step-num {
  font-family: 'Segoe UI', sans-serif;
  color: #409eff;
}

.guide-body {
  padding-left: 28px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

/* Item 1: Client Images */
.client-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.client-images {
  display: flex;
  gap: 16px;
}

.client-img {
  height: 100px;
  width: auto;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  cursor: pointer;
  border: 1px solid #e5e7eb;
}

.client-img:hover {
  transform: scale(1.05);
}

.link-hint {
  margin-left: 8px;
  font-size: 14px;
}

/* Item 2: QQ Group */
.qq-row {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.qq-img {
  width: 160px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  cursor: pointer;
  border: 1px solid #e5e7eb;
}

.qq-img:hover {
  transform: scale(1.05);
}

.qq-number {
  font-size: 15px;
  font-weight: 500;
  color: #4b5563;
}

/* Item 3 & 4: Website & Cloud Print */
.web-row {
  gap: 4px;
}

.web-link {
  font-size: 15px;
}
</style>
