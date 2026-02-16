<template>
  <div class="designer-container">
    <header class="header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">← 返回</button>
        <input 
          v-model="workflowName" 
          class="workflow-name-input" 
          placeholder="输入工作流名称"
        />
      </div>
      <div class="header-right">
        <button class="export-btn" @click="exportToXML">导出 XML</button>
      </div>
    </header>

    <div class="main-content">
      <aside class="sidebar-left">
        <h3 class="sidebar-title">组件库</h3>
        <div class="node-list">
          <div
            v-for="node in nodeTypes"
            :key="node.type"
            class="node-item"
            :style="{ backgroundColor: node.color }"
            draggable="true"
            @dragstart="onDragStart($event, node)"
          >
            <span class="node-icon">{{ node.icon }}</span>
            <span class="node-label">{{ node.label }}</span>
          </div>
        </div>
      </aside>

      <main class="canvas-container">
        <VueFlow
          :nodes="nodes"
          :edges="edges"
          :default-zoom="1"
          :min-zoom="0.2"
          :max-zoom="4"
          :default-edge-options="{
            type: 'straight',
            style: {
              stroke: '#000000',
              strokeWidth: 1
            },
            markerEnd: {
              type: 'arrowclosed' as MarkerType,
              color: '#000000'
            }
          }"
          :connection-line-type="'straight' as ConnectionLineType"
          :connection-line-marker-end="{
            type: 'arrowclosed',
            color: '#000000'
          }"
          :disabled="showMask"
          @dragover="onDragOver"
          @drop="onDrop"
          @nodeClick="onNodeClick"
          @paneClick="onPaneClick"
          @connect="onConnect"
          @edgeClick="onEdgeClick"
          @edgeDoubleClick="onEdgeDoubleClick"
          @edgeContextMenu="onEdgeContextMenu"
        >
          <template #node-custom="props">
            <CustomNode
              :id="props.id"
              :label="props.data?.label"
              :color="getNodeColor(props.id)"
            />
          </template>
          <template #node-condition-gateway="props">
            <ConditionGatewayNode
              :id="props.id"
              :label="props.data?.label"
              :color="props.data?.color"
            />
          </template>
          <template #edge-label="props">
            <div class="edge-label">
              <span class="priority-badge">
                [P{{ props.data?.priority ?? 10 }}<span v-if="props.data?.conditionCount">,{{ props.data.conditionCount }}条件</span>]
              </span>
            </div>
          </template>
          <Background pattern-color="#cbd5e1" :gap="20" />
          <Controls />
          <MiniMap />
        </VueFlow>
        <div v-if="showMask" class="canvas-mask"></div>
      </main>

      <aside class="sidebar-right" v-if="showPropertiesPanel && selectedNode">
        <h3 class="sidebar-title">属性编辑</h3>
        <div class="property-form">
          <!-- 节点名称 -->
          <div class="form-group">
            <label>节点名称 <span class="required">*</span></label>
            <input 
              ref="nameInputRef"
              v-model="selectedNode.label" 
              class="form-input"
              :class="{ 'is-error': hasStartedTyping && !isLabelValid }"
              @input="handleInput"
            />
            <span v-if="hasStartedTyping && !isLabelValid" class="error-text">
              名称为1-32个非空白字符
            </span>
          </div>
          
          <!-- 子流程处理器 -->
          <div v-if="selectedNode.type === 'subprocess'" class="form-group">
            <label>子流程处理器 <span class="required">*</span></label>
            <input 
              v-model="selectedNode.processor"
              class="form-input"
              :class="{ 'is-error': hasStartedTypingProcessor && !isProcessorValid }"
              @input="handleProcessorInput"
            />
            <span v-if="hasStartedTypingProcessor && !isProcessorValid" class="error-text">
              处理器名称为1-32个非空白字符
            </span>
          </div>
          
          <!-- 接口名称 -->
          <div v-if="selectedNode.type === 'api' || selectedNode.type === 'api-loop'" class="form-group">
            <label>接口名称 <span class="required">*</span></label>
            <input 
              v-model="selectedNode.interfaceName"
              class="form-input"
              :class="{ 'is-error': hasStartedTypingInterface && !isInterfaceValid }"
              @input="handleInterfaceInput"
            />
            <span v-if="hasStartedTypingInterface && !isInterfaceValid" class="error-text">
              接口名称为1-32个非空白字符
            </span>
          </div>
          
          <!-- 循环处理的集合名称 -->
          <div v-if="selectedNode.type === 'api-loop'" class="form-group">
            <label>循环处理的集合名称 <span class="required">*</span></label>
            <input 
              v-model="selectedNode.collectionName"
              class="form-input"
              :class="{ 'is-error': hasStartedTypingCollection && !isCollectionValid }"
              @input="handleCollectionInput"
            />
            <span v-if="hasStartedTypingCollection && !isCollectionValid" class="error-text">
              集合名称为1-32个非空白字符
            </span>
          </div>
          
          <!-- 节点类型（不可修改） -->
          <div class="form-group">
            <label>节点类型</label>
            <input 
              :value="selectedNode.type" 
              class="form-input"
              disabled
            />
          </div>
        </div>
      </aside>

      <!-- 连线属性面板 -->
      <aside class="sidebar-right" v-if="selectedEdge && !selectedNode">
        <h3 class="sidebar-title">连线属性</h3>
        <div class="property-form">
          <!-- 源节点（不可修改） -->
          <div class="form-group">
            <label>源节点</label>
            <input 
              :value="selectedEdge.source" 
              class="form-input"
              disabled
            />
          </div>
          
          <!-- 目标节点（不可修改） -->
          <div class="form-group">
            <label>目标节点</label>
            <input 
              :value="selectedEdge.target" 
              class="form-input"
              disabled
            />
          </div>
          
          <!-- 优先级 -->
          <div class="form-group">
            <label>优先级 <span class="required">*</span></label>
            <input 
              v-model.number="selectedEdge.priority"
              type="number"
              min="0"
              max="10"
              class="form-input"
              :class="{ 'is-error': hasStartedTypingPriority && !isPriorityValid }"
              @input="handlePriorityInput"
            />
            <span v-if="hasStartedTypingPriority && !isPriorityValid" class="error-text">
              优先级必须在 0-10 之间
            </span>
            <span class="help-text">数字越小优先级越高（0-10）</span>
          </div>

          <!-- 添加条件网关按钮 -->
          <div class="form-group">
            <button
              class="convert-gateway-btn"
              @click="convertToConditionGateway"
              :disabled="!canCreateGateway"
            >
              添加条件网关
            </button>
            <span class="help-text">
              当前路径深度: {{ currentGatewayDepth }}/3
              <span v-if="!canCreateGateway" style="color: #ef4444; margin-left: 8px;">
                已达最大深度
              </span>
            </span>
          </div>

          <!-- 条件配置 -->
          <div class="form-group">
            <label>条件配置</label>
            
            <!-- statusCode 条件 -->
            <div class="condition-section">
              <div class="condition-title">statusCode 条件</div>
              <div class="form-group">
                <label>状态值</label>
                <input 
                  v-model="selectedEdge.statusCode"
                  class="form-input"
                  placeholder="输入数字或留空"
                  @input="handleConditionInput"
                />
                <span class="help-text">支持数字或留空</span>
              </div>
            </div>
            
            <!-- 参数条件 -->
            <div class="condition-section">
              <div class="condition-title">参数条件</div>
              <div class="form-group">
                <label>参数名</label>
                <input 
                  v-model="selectedEdge.paramName"
                  class="form-input"
                  :class="{ 'is-error': hasStartedTypingParam && !isParamValid }"
                  placeholder="例如: result"
                  @input="handleConditionInput"
                />
              </div>
              <div class="form-group">
                <label>关系</label>
                <select v-model="selectedEdge.paramOperator" class="form-input" @change="handleConditionInput">
                  <option value="eq">等于</option>
                  <option value="ne">不等于</option>
                  <option value="contains">包含</option>
                  <option value="regex">正则匹配</option>
                </select>
              </div>
              <div class="form-group">
                <label>参数值</label>
                <input 
                  v-model="selectedEdge.paramValue"
                  class="form-input"
                  :class="{ 'is-error': hasStartedTypingParam && !isParamValid }"
                  placeholder="例如: success"
                  @input="handleConditionInput"
                />
                <span v-if="hasStartedTypingParam && !isParamValid" class="error-text">
                  参数值不为空时，参数名也不能为空
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
      
      <!-- 右键菜单 -->
      <div
        v-if="contextMenu.visible"
        class="context-menu"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        v-click-outside="closeContextMenu"
      >
        <div
          class="context-menu-item"
          :class="{ 'disabled': !canCreateGatewayFromContextMenu }"
          @click="executeContextMenuAction"
          data-action="convertToGateway"
        >
          添加条件网关
          <span v-if="!canCreateGatewayFromContextMenu" class="depth-hint">
            (深度{{ contextMenuGatewayDepth }}/3)
          </span>
        </div>
        <div class="context-menu-divider"></div>
        <div
          class="context-menu-item"
          @click="closeContextMenu"
        >
          取消
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import CustomNode from '@/components/CustomNode.vue'
import ConditionGatewayNode from '@/components/ConditionGatewayNode.vue'
import { useWorkflowStore } from '@/stores/workflow'
import type { WorkflowData, EdgeConditionConfig, ConditionBranch, ConditionOperator } from '@/utils/xmlParser'
import { generateXML, getOperatorText } from '@/utils/xmlParser'
import type { Node, Edge, MarkerType, ConnectionLineType, Connection } from '@vue-flow/core'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'

// 扩展 Edge 类型的辅助类型
type CustomEdge = Edge & {
  priority?: number
  statusCode?: string
  paramName?: string
  paramOperator?: string
  paramValue?: string
  branches?: Array<{
    id: string
    targetNodeId: string
    conditions: {
      statusCode?: string
      paramName?: string
      paramOperator?: string
      paramValue?: string
    }
  }>
  isGatewayEdge?: boolean
  gatewayNodeId?: string
}

const router = useRouter()
const workflowStore = useWorkflowStore()
const { findNode, addEdges, addNodes, updateNodeInternals, removeNodes, removeEdges } = useVueFlow()
const nodes = ref<Node[]>([])
const edges = ref<CustomEdge[]>([])

const validateField = (value: string | undefined): boolean => {
  if (!value) return false
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= 32
}

const workflowName = ref('未命名工作流')
const selectedNodeId = ref<string | null>(null)
const showPropertiesPanel = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)
const isFirstCreation = ref(false)
const showMask = ref(false)
const hasStartedTyping = ref(false)
const hasStartedTypingProcessor = ref(false)
const hasStartedTypingInterface = ref(false)
const hasStartedTypingCollection = ref(false)
const isEditingProperties = ref(false)
const editingNodeId = ref<string | null>(null)

const contextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  type: 'edge' as 'edge' | 'gateway',
  edgeId: null as string | null
})

// 右键菜单中选中连线的路径深度
const contextMenuGatewayDepth = computed(() => {
  if (!contextMenu.value.edgeId) return 0
  return calculateTotalPathDepth(contextMenu.value.edgeId)
})

// 右键菜单中是否可以创建条件网关
const canCreateGatewayFromContextMenu = computed(() => {
  if (!contextMenu.value.edgeId) return false
  return calculateTotalPathDepth(contextMenu.value.edgeId) < 3
})

const isLabelValid = computed(() => {
  return validateField(selectedNode.value?.label)
})

const isProcessorValid = computed(() => {
  return validateField(selectedNode.value?.processor)
})

const isInterfaceValid = computed(() => {
  return validateField(selectedNode.value?.interfaceName)
})

const isCollectionValid = computed(() => {
  return validateField(selectedNode.value?.collectionName)
})

const areAllRequiredFieldsValid = computed(() => {
  if (!selectedNode.value) return false
  if (!isLabelValid.value) return false
  const nodeType = selectedNode.value.type
  if (nodeType === 'subprocess' && !isProcessorValid.value) return false
  if ((nodeType === 'api' || nodeType === 'api-loop') && !isInterfaceValid.value) return false
  if (nodeType === 'api-loop' && !isCollectionValid.value) return false
  return true
})

// 连线编辑相关状态
const selectedEdgeId = ref<string | null>(null)
const isEditingEdge = ref(false)
const editingEdgeId = ref<string | null>(null)
const hasStartedTypingPriority = ref(false)
const hasStartedTypingParam = ref(false)

const selectedEdge = computed(() => {
  if (!selectedEdgeId.value) return null
  const edge = edges.value.find((e: Edge) => e.id === selectedEdgeId.value)
  if (!edge) return null
  const customEdge = edge as CustomEdge
  return {
    id: customEdge.id,
    source: customEdge.source,
    target: customEdge.target,
    priority: customEdge.priority ?? 10,
    statusCode: customEdge.statusCode || '',
    paramName: customEdge.paramName || '',
    paramOperator: customEdge.paramOperator || 'eq',
    paramValue: customEdge.paramValue || ''
  }
})

const isPriorityValid = computed(() => {
  const priority = selectedEdge.value?.priority
  if (priority === undefined || priority === null) return false
  return priority >= 0 && priority <= 10 && Number.isInteger(priority)
})

const isParamValid = computed(() => {
  if (!selectedEdge.value) return true
  const paramName = selectedEdge.value.paramName?.trim()
  const paramValue = selectedEdge.value.paramValue?.trim()
  
  // 规则：参数值为空时，参数名可为空
  // 参数值不为空时，参数名也不能为空
  if (!paramValue) {
    return true
  }
  return !!paramName && paramName.length > 0
})

const isEdgeValid = computed(() => {
  if (!selectedEdge.value) return false
  return isPriorityValid.value && isParamValid.value
})

// 条件网关相关计算属性
// 计算从起始节点到当前边的路径深度（从根到当前边的边数）
const calculatePathDepth = (edgeId: string): number => {
  const visited = new Set<string>()

  const getDepth = (currentEdgeId: string): number => {
    if (visited.has(currentEdgeId)) return 0
    visited.add(currentEdgeId)

    const edge = edges.value.find(e => e.id === currentEdgeId)
    if (!edge) return 0

    // 找到指向源节点的所有边（父边）
    const parentEdges = edges.value.filter(e => e.target === edge.source)
    if (parentEdges.length === 0) return 1 // 没有父边，当前就是第1层

    // 递归取最大深度 + 1（当前这层）
    const maxParentDepth = Math.max(...parentEdges.map(e => getDepth(e.id)))
    return maxParentDepth + 1
  }

  return getDepth(edgeId)
}

// 计算从当前边到最深叶子的深度（从当前边到末端节点的边数）
const calculateDepthToLeaf = (edgeId: string): number => {
  const visited = new Set<string>()

  const getDepth = (currentEdgeId: string): number => {
    if (visited.has(currentEdgeId)) return 0
    visited.add(currentEdgeId)

    const edge = edges.value.find(e => e.id === currentEdgeId)
    if (!edge) return 0

    // 找到从目标节点出发的所有边（子边）
    const childEdges = edges.value.filter(e => e.source === edge.target)
    if (childEdges.length === 0) return 1 // 没有子边，当前就是最后一层

    // 递归取最大深度 + 1（当前这层）
    const maxChildDepth = Math.max(...childEdges.map(e => getDepth(e.id)))
    return maxChildDepth + 1
  }

  return getDepth(edgeId)
}

// 计算从根到最深叶子的总路径深度
const calculateTotalPathDepth = (edgeId: string): number => {
  const depthFromRoot = calculatePathDepth(edgeId)
  const depthToLeaf = calculateDepthToLeaf(edgeId)
  return depthFromRoot + depthToLeaf - 1 // 当前边被计算了两次，减1
}

// 是否可以创建条件网关（添加网关后总深度不超过3条边）
const canCreateGateway = computed(() => {
  if (!selectedEdgeId.value) return false
  // 添加网关会将一条边拆分成两条，总深度会+1
  const currentTotalDepth = calculateTotalPathDepth(selectedEdgeId.value)
  return currentTotalDepth < 3
})

// 当前路径的总深度（根到最深叶子）
const currentGatewayDepth = computed(() => {
  if (!selectedEdgeId.value) return 0
  return calculateTotalPathDepth(selectedEdgeId.value)
})

const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null
  const node = findNode(selectedNodeId.value)
  if (!node) return null
  return {
    id: node.id,
    type: node.data?.nodeType,
    label: node.data?.label,
    processor: node.data?.processor || '',
    interfaceName: node.data?.interfaceName || '',
    collectionName: node.data?.collectionName || ''
  }
})

const nodeTypes = [
  { type: 'subprocess', label: '子流程', icon: '⚙️', color: '#10b981' },
  { type: 'api', label: '接口调用', icon: '🔗', color: '#f59e0b' },
  { type: 'api-loop', label: '接口循环调用', icon: '🔄', color: '#3b82f6' },
]

const nodeTypeColors: Record<string, string> = {
  'subprocess': '#10b981',
  'api': '#f59e0b',
  'api-loop': '#3b82f6'
}

// 获取节点颜色
const getNodeColor = (nodeId: string): string => {
  const node = findNode(nodeId)
  if (node && node.data && node.data.color) {
    return node.data.color
  }
  // 从nodeTypeColors中查找
  const nodeType = node?.type || 'task'
  return nodeTypeColors[nodeType] || '#3b82f6'
}

// 记录每个连接点的连线ID列表 - 完整方案
const handleConnections = ref<Map<string, string[]>>(new Map())

// 加载导入的工作流数据
const loadImportedWorkflow = (data: WorkflowData) => {
  workflowName.value = data.name
  
  const importedNodes = data.nodes.map(node => {
    const isGateway = node.type === 'condition-gateway'
    return {
      id: node.id,
      type: isGateway ? 'condition-gateway' : 'custom',
      label: node.label,
      position: node.position,
      style: isGateway ? {
        background: '#8b5cf6',
        color: 'white',
        border: 'none',
        padding: '0',
        borderRadius: '50%',
        width: '28px',
        height: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      } : {
        background: nodeTypeColors[node.type] || '#3b82f6',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '8px'
      },
      data: {
        nodeType: node.type,
        label: node.label,
        color: isGateway ? '#8b5cf6' : (nodeTypeColors[node.type] || '#3b82f6'),
        processor: node.processor || '',
        interfaceName: node.interfaceName || '',
        collectionName: node.collectionName || '',
        isConditionGateway: isGateway,
        gatewayConditions: node.gatewayConditions
      }
    }
  })
  
  const importedEdges = data.edges.map(edge => {
    const priority = edge.priority ?? 10
    const parts: string[] = [`P${priority}`]
    
    // 支持嵌套的conditions和扁平的属性
    const conditions = edge.conditions
    const statusCode = conditions?.statusCode || (edge as { statusCode?: string }).statusCode
    const paramName = conditions?.paramName || (edge as { paramName?: string }).paramName
    const paramOperator = conditions?.paramOperator || (edge as { paramOperator?: string }).paramOperator || 'eq'
    const paramValue = conditions?.paramValue || (edge as { paramValue?: string }).paramValue
    
    // statusCode 条件
    if (statusCode) {
      parts.push(`statusCode=${statusCode}`)
    }
    
    // 参数条件
    if (paramName && paramValue) {
      parts.push(`param=${paramName}, value=${paramValue}, operator=${getOperatorText(paramOperator)}`)
    }
    
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      priority,
      // 扁平的属性供模板使用
      statusCode: statusCode || '',
      paramName: paramName || '',
      paramOperator: paramOperator,
      paramValue: paramValue || '',
      // 分支数据
      branches: edge.branches?.map(branch => ({
        id: branch.id,
        targetNodeId: branch.targetNodeId,
        conditions: {
          statusCode: branch.conditions.statusCode,
          paramName: branch.conditions.paramName,
          paramOperator: branch.conditions.paramOperator || 'eq',
          paramValue: branch.conditions.paramValue
        }
      })),
      label: `[${parts.join(', ')}]`,
      data: {
        priority,
        label: `[${parts.join(', ')}]`
      }
    }
  })
  
  nodes.value = importedNodes
  edges.value = importedEdges
}

// 组件挂载时检查是否有导入数据
onMounted(() => {
  if (workflowStore.hasImportedData && workflowStore.importedWorkflow) {
    loadImportedWorkflow(workflowStore.importedWorkflow)
    // 清空导入数据，防止刷新时重复加载
    workflowStore.clearImportedWorkflow()
  }
  // 新建时不初始化任何节点，保持空白画布
})

const handleGlobalClick = (event: MouseEvent) => {
  if (contextMenu.value.visible) {
    const target = event.target as HTMLElement
    if (!target.closest('.context-menu')) {
      closeContextMenu()
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
})

const onDragStart = (event: DragEvent, node: { type: string; label: string; icon: string; color: string }) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vueflow', JSON.stringify(node))
    event.dataTransfer.effectAllowed = 'move'
  }
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const onDrop = (event: DragEvent) => {
  // 遮罩状态下禁用所有操作
  if (showMask.value) return
  
  event.preventDefault()
  if (!event.dataTransfer) return
  const data = event.dataTransfer.getData('application/vueflow')
  if (!data) return
  const nodeType = JSON.parse(data)
  const rect = (event.target as HTMLElement).getBoundingClientRect()
  const position = { 
    x: event.clientX - rect.left, 
    y: event.clientY - rect.top 
  }
  const nodeId = `${Date.now()}`
  
  const newNode = {
    id: nodeId,
    type: 'custom',
    position,
    data: { 
      label: '',
      color: nodeType.color,
      nodeType: nodeType.type,
      processor: '',
      interfaceName: '',
      collectionName: ''
    }
  }
  addNodes([newNode])
  selectedNodeId.value = nodeId
  showPropertiesPanel.value = true
  isFirstCreation.value = true
  showMask.value = true
  isEditingProperties.value = true
  editingNodeId.value = nodeId
  hasStartedTyping.value = false
  hasStartedTypingProcessor.value = false
  hasStartedTypingInterface.value = false
  hasStartedTypingCollection.value = false
  focusNameInput()
}

const onNodeClick = (event: { node: { id: string } }) => {
  // 遮罩状态下禁用所有操作（除非是创建新节点时的遮罩）
  if (showMask.value && !isFirstCreation.value) return
  
  // 如果正在编辑连线且未完成验证，阻止切换到节点
  if (isEditingEdge.value && !isEdgeValid.value) {
    return
  }
  
  // 如果正在编辑连线且未完成验证，阻止切换到节点
  if (isEditingEdge.value && !isEdgeValid.value) {
    return
  }
  
  // 清除之前的编辑状态
  isEditingEdge.value = false
  editingEdgeId.value = null
  selectedEdgeId.value = null
  
  if (isEditingProperties.value && editingNodeId.value !== event.node.id) {
    if (!areAllRequiredFieldsValid.value) {
      return
    }
  }
  if (editingNodeId.value !== event.node.id) {
    isEditingProperties.value = true
    editingNodeId.value = event.node.id
    hasStartedTyping.value = false
    hasStartedTypingProcessor.value = false
    hasStartedTypingInterface.value = false
    hasStartedTypingCollection.value = false
    showMask.value = true
    isFirstCreation.value = false
  }
  selectedNodeId.value = event.node.id
  showPropertiesPanel.value = true
}

const onPaneClick = () => {
  // 如果是首次创建节点时点击画布
  if (showMask.value && isFirstCreation.value) {
    // 检查是否需要删除节点：
    // - 还没开始输入，或者
    // - 开始输入了但有必填字段不合法
    const shouldDeleteNode = !hasStartedTyping.value || !areAllRequiredFieldsValid.value
    
    if (shouldDeleteNode && editingNodeId.value) {
      // 删除正在创建的节点
      removeNodes([editingNodeId.value])
    }
    
    // 清除所有编辑状态
    clearAllEditingStates()
    isFirstCreation.value = false
    return
  }
  
  // 如果正在编辑连线且未完成验证，阻止关闭
  if (isEditingEdge.value && !isEdgeValid.value) {
    return
  }
  
  // 如果正在编辑节点且未完成验证，阻止关闭
  if (isEditingProperties.value && !areAllRequiredFieldsValid.value) {
    return
  }
  
  // 使用统一方法清除所有编辑状态和遮罩
  clearAllEditingStates()
}

const clearAllEditingStates = () => {
  isEditingProperties.value = false
  isEditingEdge.value = false
  selectedNodeId.value = null
  selectedEdgeId.value = null
  editingNodeId.value = null
  editingEdgeId.value = null
  showPropertiesPanel.value = false
  showMask.value = false
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

const executeContextMenuAction = (event: MouseEvent) => {
  // 遮罩状态下禁用所有操作
  if (showMask.value) return

  const action = (event.target as HTMLElement).getAttribute('data-action')

  if (action === 'convertToGateway' && contextMenu.value.edgeId) {
    // 检查是否可以创建条件网关
    if (!canCreateGatewayFromContextMenu.value) {
      alert(`当前路径深度为 ${contextMenuGatewayDepth.value}，已达到最大限制(3层)，无法继续添加条件网关`)
      closeContextMenu()
      return
    }
    selectedEdgeId.value = contextMenu.value.edgeId
    convertToConditionGateway()
  }

  closeContextMenu()
}

const convertToConditionGateway = () => {
  if (!selectedEdgeId.value) return

  // 检查路径深度限制
  if (!canCreateGateway.value) {
    alert(`当前路径深度为 ${currentGatewayDepth.value}，已达到最大限制(3层)，无法继续添加条件网关`)
    return
  }

  const edgeIndex = edges.value.findIndex(e => e.id === selectedEdgeId.value)
  if (edgeIndex === -1) return
  
  const edge = edges.value[edgeIndex]
  if (!edge) return
  
  const sourceNode = findNode(edge.source)
  const targetNode = findNode(edge.target)
  if (!sourceNode || !targetNode) return
  
  // 生成唯一ID
  const timestamp = Date.now()
  const gatewayNodeId = `gateway-${timestamp}`
  const inboundEdgeId = `edge-${timestamp}-in`
  const outboundEdgeId = `edge-${timestamp}-out`
  
  const gatewayX = (sourceNode.position.x + targetNode.position.x) / 2
  const gatewayY = (sourceNode.position.y + targetNode.position.y) / 2
  
  const gatewayNode: Node = {
    id: gatewayNodeId,
    type: 'condition-gateway',
    position: { x: gatewayX, y: gatewayY },
    style: {
      background: '#8b5cf6',
      color: 'white',
      border: 'none',
      padding: '0',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    data: {
      nodeType: 'condition-gateway',
      label: '条件网关',
      color: '#8b5cf6',
      isConditionGateway: true,
      parentEdgeId: edge.id
    }
  }
  
  // 删除原边 - 同时从 Vue Flow 内部状态和本地状态中删除
  removeEdges([edge])
  edges.value = edges.value.filter((_, index) => index !== edgeIndex)

  // 添加网关节点
  addNodes([gatewayNode])

  // 入边：继承原边所有条件
  const inboundEdge: CustomEdge = {
    id: inboundEdgeId,
    source: edge.source,
    sourceHandle: 'bottom',
    target: gatewayNodeId,
    targetHandle: 'top',
    label: edge.label || '[P10]',
    data: {
      priority: edge.priority || 10,
      label: edge.label || '[P10]'
    },
    priority: edge.priority || 10,
    statusCode: edge.statusCode,
    paramName: edge.paramName,
    paramOperator: edge.paramOperator || 'eq',
    paramValue: edge.paramValue,
    isGatewayEdge: true,
    gatewayNodeId
  }

  // 出边：默认条件（P10），不继承原边条件
  const outboundEdge: CustomEdge = {
    id: outboundEdgeId,
    source: gatewayNodeId,
    sourceHandle: 'bottom',
    target: edge.target,
    targetHandle: 'top',
    label: '[P10]',
    data: { priority: 10, label: '[P10]' },
    priority: 10,
    isGatewayEdge: true,
    gatewayNodeId
  }

  // 添加新边（同时调用 addEdges 更新 Vue Flow 内部状态，并同步 edges.value）
  addEdges([inboundEdge, outboundEdge])
  edges.value = [...edges.value, inboundEdge, outboundEdge]

  // 更新节点内部状态（不重置 nodes.value，避免与 addNodes 冲突）
  updateNodeInternals([gatewayNodeId])

  // 清除编辑状态和遮罩
  isEditingEdge.value = false
  editingEdgeId.value = null
  showMask.value = false
  selectedEdgeId.value = null
  showPropertiesPanel.value = false
}

const updateNodeLabel = () => {
  if (!selectedNodeId.value) return
  const node = findNode(selectedNodeId.value)
  if (node && selectedNode.value) {
    node.data.label = selectedNode.value.label
  }
}

const updateNodeProperties = () => {
  if (!selectedNodeId.value) return
  const node = findNode(selectedNodeId.value)
  if (node && selectedNode.value) {
    node.data.processor = selectedNode.value.processor
    node.data.interfaceName = selectedNode.value.interfaceName
    node.data.collectionName = selectedNode.value.collectionName
  }
}

const handleInput = () => {
  hasStartedTyping.value = true
  updateNodeLabel()
}

const handleProcessorInput = () => {
  hasStartedTypingProcessor.value = true
  updateNodeProperties()
}

const handleInterfaceInput = () => {
  hasStartedTypingInterface.value = true
  updateNodeProperties()
}

const handleCollectionInput = () => {
  hasStartedTypingCollection.value = true
  updateNodeProperties()
}

// 处理条件输入
const handleConditionInput = () => {
  hasStartedTypingParam.value = true
  updateEdgeProperties()
}

const handlePriorityInput = () => {
  hasStartedTypingPriority.value = true
  updateEdgeProperties()
}

// ==================== 条件网关相关方法 ====================

const updateEdgeLabel = (edge: CustomEdge) => {
  const priority = edge.priority ?? 10
  const parts: string[] = [`P${priority}`]
  
  // statusCode 条件
  if (edge.statusCode) {
    parts.push(`statusCode=${edge.statusCode}`)
  }
  
  // 参数条件
  if (edge.paramName && edge.paramValue) {
    parts.push(`param=${edge.paramName}, value=${edge.paramValue}, operator=${getOperatorText(edge.paramOperator)}`)
  }
  
  edge.label = `[${parts.join(', ')}]`
  
  // 更新 data 用于模板
  edge.data = {
    priority,
    label: edge.label
  }
}

const updateEdgeProperties = () => {
  if (!selectedEdgeId.value) return
  const edgeIndex = edges.value.findIndex((e: CustomEdge) => e.id === selectedEdgeId.value)
  if (edgeIndex !== -1 && selectedEdge.value) {
    const edge = edges.value[edgeIndex]
    if (edge) {
      edge.priority = selectedEdge.value.priority

      // 更新条件属性
      edge.statusCode = selectedEdge.value.statusCode || undefined

      const paramName = selectedEdge.value.paramName?.trim()
      const paramValue = selectedEdge.value.paramValue?.trim()

      if (paramName || paramValue) {
        edge.paramName = paramName || undefined
        edge.paramOperator = selectedEdge.value.paramOperator
        edge.paramValue = paramValue || undefined
      } else {
        // 都为空时不保存
        edge.paramName = undefined
        edge.paramOperator = undefined
        edge.paramValue = undefined
      }

      updateEdgeLabel(edge)

      // 触发响应式更新，强制 Vue Flow 重新渲染边
      edges.value = [...edges.value]
    }
  }
}

const focusNameInput = async () => {
  await nextTick()
  nameInputRef.value?.focus()
}

const onConnect = (connection: Connection) => {
  // 遮罩状态下禁用所有操作
  if (showMask.value) return
  
  // 从 edges 中获取所有现有连线
  const existingEdges = (edges.value || []).filter((el: Edge) => el.source && el.target)

  // 检查是否是网关节点的分支连接
  const sourceNode = findNode(connection.source)
  const isGatewaySource = sourceNode?.data?.isConditionGateway === true
  
  if (isGatewaySource && connection.sourceHandle?.startsWith('branch-')) {
    // 从网关节点创建分支连线
    const branchIndex = parseInt(connection.sourceHandle.replace('branch-', ''))
    const parentEdgeId = sourceNode?.data?.parentEdgeId
    
    if (parentEdgeId) {
      // 更新对应分支的目标节点
      const parentEdge = edges.value.find(e => e.id === parentEdgeId)
      if (parentEdge && parentEdge.branches && parentEdge.branches[branchIndex]) {
        parentEdge.branches[branchIndex].targetNodeId = connection.target
        
        // 创建可视化连线（分支线）
        const branchEdge: CustomEdge = {
          id: `branch-${parentEdgeId}-${branchIndex}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          label: '[分支]',
          data: { priority: 10, label: '[分支]', isBranch: true },
          priority: 10,
          isGatewayEdge: true,
          gatewayNodeId: connection.source
        }
        addEdges([branchEdge])
        edges.value = [...edges.value, branchEdge]
        updateNodeInternals([connection.source, connection.target])
        return
      }
    }
  }

  // 规则：检查目标连接点是否已有连线（保持一对一进入）
  const targetHasConnection = existingEdges.some(
    (edge: Edge) => edge.target === connection.target && edge.targetHandle === connection.targetHandle
  )
  if (targetHasConnection) {
    return // 该连接点已有连线，拒绝创建
  }

  // 规则：检查两个节点之间是否已存在任意方向的连线（防止双向连接）
  const connectionExists = existingEdges.some(
    (edge: Edge) =>
      (edge.source === connection.source && edge.target === connection.target) ||
      (edge.source === connection.target && edge.target === connection.source)
  )
  if (connectionExists) {
    return // 两个节点之间已存在连线，拒绝创建
  }

  const newEdge: CustomEdge = {
    id: `e${Date.now()}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    label: '[P10]',
    data: {
      priority: 10,
      label: '[P10]'
    },
    priority: 10,
    statusCode: undefined,
    paramName: undefined,
    paramOperator: 'eq',
    paramValue: undefined
  }
  addEdges([newEdge])
  
  // 同步更新本地 edges ref
  edges.value = [...edges.value, newEdge]
  
  // 强制更新节点内部状态，触发连接点显示
  updateNodeInternals([connection.source, connection.target])
  
  // 记录源连接点
  const sourceKey = `${connection.source}:${connection.sourceHandle}`
  if (!handleConnections.value.has(sourceKey)) {
    handleConnections.value.set(sourceKey, [])
  }
  handleConnections.value.get(sourceKey)!.push(newEdge.id)
  
  // 记录目标连接点
  const targetKey = `${connection.target}:${connection.targetHandle}`
  if (!handleConnections.value.has(targetKey)) {
    handleConnections.value.set(targetKey, [])
  }
  handleConnections.value.get(targetKey)!.push(newEdge.id)
}

const onEdgeClick = (event: { edge: { id: string } }) => {
  // 遮罩状态下禁用所有操作
  if (showMask.value) return
  
  // 如果正在编辑其他连线且未完成验证，阻止切换
  if (isEditingEdge.value && editingEdgeId.value !== event.edge.id) {
    if (!isEdgeValid.value) {
      return
    }
  }
  
  // 如果验证通过或没有正在编辑，允许切换
  if (editingEdgeId.value !== event.edge.id) {
    // 清除节点编辑状态
    isEditingProperties.value = false
    editingNodeId.value = null
    selectedNodeId.value = null
    showPropertiesPanel.value = false
    
    // 设置连线编辑状态
    isEditingEdge.value = true
    editingEdgeId.value = event.edge.id
    
    // 重置输入标记
    hasStartedTypingPriority.value = false
    
    // 显示遮罩
    showMask.value = true
  }
  
  selectedEdgeId.value = event.edge.id
}

const onEdgeDoubleClick = (event: { edge: { id: string } }) => {
  // 遮罩状态下禁用所有操作
  if (showMask.value) return
  
  // 如果正在编辑该连线，先检查验证
  if (editingEdgeId.value === event.edge.id && !isEdgeValid.value) {
    return
  }
  
  const edgeId = event.edge.id
  const allEdges = edges.value || []
  const edge = allEdges.find((el: Edge) => el.id === edgeId)
  
  if (edge) {
    // 移除源连接点的记录
    if (edge.source && edge.sourceHandle) {
      const sourceKey = `${edge.source}:${edge.sourceHandle}`
      if (handleConnections.value.has(sourceKey)) {
        const edgeIds = handleConnections.value.get(sourceKey)!
        const idx = edgeIds.indexOf(edgeId)
        if (idx !== -1) {
          edgeIds.splice(idx, 1)
          if (edgeIds.length === 0) {
            handleConnections.value.delete(sourceKey)
          }
        }
      }
    }
    
    // 移除目标连接点的记录
    if (edge.target && edge.targetHandle) {
      const targetKey = `${edge.target}:${edge.targetHandle}`
      if (handleConnections.value.has(targetKey)) {
        const edgeIds = handleConnections.value.get(targetKey)!
        const idx = edgeIds.indexOf(edgeId)
        if (idx !== -1) {
          edgeIds.splice(idx, 1)
          if (edgeIds.length === 0) {
            handleConnections.value.delete(targetKey)
          }
        }
      }
    }
    
    // 从画布删除边
    const edgeIndex = allEdges.findIndex((el: Edge) => el.id === edgeId)
    if (edgeIndex !== -1) {
      allEdges.splice(edgeIndex, 1)
      edges.value = [...allEdges]
    }
   }
}

const onEdgeContextMenu = (event: any) => {
  // 遮罩状态下禁用所有操作
  if (showMask.value) return

  event.originalEvent?.preventDefault()

  contextMenu.value = {
    visible: true,
    x: event.originalEvent?.clientX || 0,
    y: event.originalEvent?.clientY || 0,
    type: 'edge',
    edgeId: event.edge?.id || null
  }
}

const goBack = () => {
  router.push('/')
}

const exportToXML = () => {
  const xml = exportWorkflowToXML()
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${workflowName.value || 'workflow'}.xml`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const exportWorkflowToXML = () => {
  const workflowData: WorkflowData = {
    name: workflowName.value,
    nodes: nodes.value.map(node => ({
      id: node.id,
      type: node.data?.nodeType || 'api',
      label: node.data?.label || '',
      position: node.position,
      processor: node.data?.processor,
      interfaceName: node.data?.interfaceName,
      collectionName: node.data?.collectionName,
      isConditionGateway: node.data?.isConditionGateway,
      gatewayConditions: node.data?.gatewayConditions
    })),
    edges: edges.value.map((edge, index) => {
      const customEdge = edge as CustomEdge
      const conditions: EdgeConditionConfig | undefined = customEdge.statusCode || customEdge.paramName ? {
        statusCode: customEdge.statusCode || undefined,
        paramName: customEdge.paramName || undefined,
        paramOperator: customEdge.paramOperator as ConditionOperator,
        paramValue: customEdge.paramValue || undefined
      } : undefined
      
      const branches: ConditionBranch[] | undefined = customEdge.branches?.map(branch => ({
        id: branch.id,
        targetNodeId: branch.targetNodeId,
        conditions: {
          statusCode: branch.conditions.statusCode || undefined,
          paramName: branch.conditions.paramName || undefined,
          paramOperator: (branch.conditions.paramOperator as ConditionOperator) || 'eq',
          paramValue: branch.conditions.paramValue || undefined
        }
      }))
      
      return {
        id: `e${index}`,
        source: edge.source,
        target: edge.target,
        priority: customEdge.priority,
        conditions,
        branches
      }
    })
  }
  
  return generateXML(workflowData)
}
</script>

<style scoped>
.designer-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8fafc;
}

.header {
  height: 60px;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  padding: 0.5rem 1rem;
  background: #f1f5f9;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #e2e8f0;
}

.workflow-name-input {
  font-size: 1.125rem;
  font-weight: 600;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.25rem 0.5rem;
  outline: none;
  transition: border-color 0.2s;
}

.workflow-name-input:focus {
  border-bottom-color: #3b82f6;
}

.export-btn {
  padding: 0.5rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.export-btn:hover {
  background: #2563eb;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar-left {
  width: 240px;
  background: white;
  border-right: 1px solid #e2e8f0;
  padding: 1rem;
  overflow-y: auto;
}

.sidebar-right {
  width: 280px;
  background: white;
  border-left: 1px solid #e2e8f0;
  padding: 1rem;
  overflow-y: auto;
}

.sidebar-right.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  color: #94a3b8;
  text-align: center;
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.node-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: move;
  transition: all 0.2s;
  color: white;
  font-weight: 500;
}

.node-item:hover {
  border-color: #000;
  filter: brightness(1.1);
}

.node-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.node-label {
  font-weight: 500;
  color: inherit;
}

.canvas-container {
  flex: 1;
  position: relative;
}

.canvas-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 10;
  pointer-events: none;
}

.edge-label {
  background: white;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.priority-badge {
  color: #3b82f6;
  font-weight: 600;
}

.property-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #64748b;
}

.form-input {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #3b82f6;
}

.form-input:disabled {
  background: #f1f5f9;
  color: #94a3b8;
}

.form-input.is-error {
  border-color: #ef4444;
}

.required {
  color: #ef4444;
}

.help-text {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-top: 0.25rem;
}

.error-text {
  font-size: 0.75rem;
  color: #ef4444;
}

/* 条件区域样式 */
.condition-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
}

.condition-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 0.5rem;
}

/* 条件网关相关样式 */
.convert-gateway-btn {
  width: 100%;
  padding: 0.75rem;
  background: #8b5cf6;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
}

.convert-gateway-btn:hover:not(:disabled) {
  background: #7c3aed;
}

.convert-gateway-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.back-to-edge-btn {
  width: 100%;
  padding: 0.75rem;
  background: #64748b;
  color: white;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  margin-top: 1rem;
}

.back-to-edge-btn:hover {
  background: #475569;
}

.branch-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 0.75rem;
}

.branch-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: #f1f5f9;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.branch-item:hover {
  background: #e2e8f0;
}

.branch-label {
  font-weight: 500;
  color: #64748b;
  flex: 1;
}

.branch-target {
  font-size: 0.75rem;
  color: #94a3b8;
}

.branch-delete-btn {
  padding: 0.25rem 0.5rem;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.75rem;
}

.branch-delete-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.add-branch-btn {
  width: 100%;
  padding: 0.5rem;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
}

.add-branch-btn:hover:not(:disabled) {
  background: #059669;
}

.add-branch-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 160px;
  overflow: hidden;
}

.context-menu-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.875rem;
}

.context-menu-item:hover {
  background: #f1f5f9;
}

.context-menu-item.disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.context-menu-item.disabled:hover {
  background: transparent;
}

.depth-hint {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-left: 0.5rem;
}

.context-menu-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 0.25rem 0;
}
</style>