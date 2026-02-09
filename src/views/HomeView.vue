<template>
  <div class="home-container">
    <div class="home-content">
      <h1 class="title">工作流编排系统</h1>
      <p class="subtitle">可视化设计您的工作流程</p>
      
      <div class="action-cards">
        <!-- 新建工作流卡片 -->
        <div class="action-card" @click="createWorkflow">
          <div class="card-icon">✨</div>
          <h3 class="card-title">新建工作流</h3>
          <p class="card-desc">创建全新的工作流设计</p>
        </div>
        
        <!-- 导入工作流卡片 -->
        <div class="action-card" @click="triggerFileInput">
          <div class="card-icon">📥</div>
          <h3 class="card-title">导入工作流</h3>
          <p class="card-desc">从XML文件导入现有设计</p>
        </div>
      </div>
      
      <!-- 隐藏的文件输入 -->
      <input 
        ref="fileInput"
        type="file" 
        accept=".xml" 
        style="display: none"
        @change="handleFileSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkflowStore } from '@/stores/workflow'
import { parseXML } from '@/utils/xmlParser'

const router = useRouter()
const workflowStore = useWorkflowStore()
const fileInput = ref<HTMLInputElement | null>(null)

const createWorkflow = () => {
  // 清空任何之前的导入数据
  workflowStore.clearImportedWorkflow()
  router.push('/designer')
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  // 检查文件类型
  if (!file.name.endsWith('.xml')) {
    alert('请选择XML文件')
    target.value = ''
    return
  }
  
  try {
    const content = await file.text()
    const workflowData = parseXML(content)
    
    // 验证是否有节点
    if (workflowData.nodes.length === 0) {
      alert('导入失败：工作流中没有节点')
      target.value = ''
      return
    }
    
    // 存储到Pinia Store
    workflowStore.setImportedWorkflow(workflowData)
    
    // 跳转到设计器
    router.push('/designer')
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    alert(`导入失败: ${errorMessage}`)
  }
  
  // 清空input，允许重复选择同一文件
  target.value = ''
}
</script>

<style scoped>
.home-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.home-content {
  text-align: center;
  color: white;
}

.title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.subtitle {
  font-size: 1.25rem;
  margin-bottom: 2.5rem;
  opacity: 0.9;
}

.action-cards {
  display: flex;
  gap: 2rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-card {
  width: 240px;
  min-height: 220px;
  padding: 2rem 1.5rem;
  background: white;
  border-radius: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
}

.card-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
}

.card-desc {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
  white-space: nowrap;
}

@media (max-width: 600px) {
  .action-cards {
    flex-direction: column;
    align-items: center;
  }
  
  .action-card {
    width: 100%;
    max-width: 280px;
  }
}
</style>