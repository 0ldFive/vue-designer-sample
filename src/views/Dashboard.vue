<script setup>
const recentActivities = [
  { time: '10:24', action: '采购入库 120 件（电子元件）', actor: '采购部' },
  { time: '09:18', action: '销售出库 36 件（成品A）', actor: '销售部' },
  { time: '昨日', action: '库存盘点完成（仓库A）', actor: '仓储部' },
  { time: '昨日', action: '供应商对账更新（华东供应链）', actor: '财务部' }
]
</script>

<template>
  <div class="page">
    <div class="page-header"></div>

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
