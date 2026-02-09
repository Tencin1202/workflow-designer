<template>
  <div class="condition-gateway-node" :style="nodeStyle" :title="label">
    <span class="gateway-icon">◇</span>
    
    <!-- 左侧连接点（入边） -->
    <Handle
      type="target"
      :position="('left' as Position)"
      id="left"
      class="node-handle"
      :class="{ 'connected': isLeftConnected }"
    />
    
    <!-- 右侧连接点（出边/主边） -->
    <Handle
      type="source"
      :position="('right' as Position)"
      id="right"
      class="node-handle"
      :class="{ 'connected': isRightConnected }"
    />
    
    <!-- 分支连接点（上下两侧，最多5个） -->
    <template v-for="index in 5" :key="index">
      <Handle
        type="source"
        :position="(index % 2 === 1 ? 'top' : 'bottom') as Position"
        :id="`branch-${index - 1}`"
        class="branch-handle"
        :class="{ 'top': index % 2 === 1, 'bottom': index % 2 === 0 }"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Handle, useHandleConnections } from '@vue-flow/core'
import type { Position } from '@vue-flow/core'

const props = defineProps<{
  id: string
  label: string
  color?: string
  conditions?: {
    statusValue?: string
    paramName?: string
    paramOperator?: string
    paramValue?: string
  }
  branches?: Array<{
    id: string
    targetNodeId: string
    conditions?: {
      statusValue?: string
      paramName?: string
      paramOperator?: string
      paramValue?: string
    }
  }>
}>()

const targetConnections = useHandleConnections({
  type: 'target',
  id: 'left'
})

const sourceConnections = useHandleConnections({
  type: 'source',
  id: 'right'
})

const label = computed(() => props.label || '条件网关')
const nodeColor = computed(() => props.color || '#8b5cf6')

const nodeStyle = computed(() => ({
  background: nodeColor.value,
  color: 'white',
  border: '1.5px solid rgba(255,255,255,0.6)',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  textAlign: 'center' as const,
  position: 'relative' as const,
  fontWeight: 500 as const,
  fontSize: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
}))

const isLeftConnected = computed(() => {
  return targetConnections.value.length > 0
})

const isRightConnected = computed(() => {
  return sourceConnections.value.length > 0
})

const displayedBranches = computed(() => {
  return props.branches || []
})
</script>

<style scoped>
.condition-gateway-node {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.condition-gateway-node:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
}

.gateway-icon {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1;
}

.node-handle {
  opacity: 0;
  transition: opacity 0.2s ease;
  width: 6px !important;
  height: 6px !important;
  background: #8b5cf6 !important;
  border: 1px solid white !important;
}

.node-handle.connected {
  opacity: 1;
}

.branch-handle {
  opacity: 0;
  transition: opacity 0.2s ease;
  width: 5px !important;
  height: 5px !important;
  background: #a78bfa !important;
  border: 1px solid white !important;
}

.branch-handle.top {
  top: -3px !important;
}

.branch-handle.bottom {
  bottom: -3px !important;
}

.condition-gateway-node:hover .branch-handle {
  opacity: 0.5;
}

.branch-handle:hover {
  opacity: 1 !important;
  transform: scale(1.5);
}
</style>
