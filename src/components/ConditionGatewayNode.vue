<template>
  <div class="condition-gateway-node" :style="nodeStyle" :title="label">
    <span class="gateway-icon">◇</span>
    
    <!-- 上方连接点（入边，接收源节点的连线） -->
    <Handle
      type="target"
      :position="('top' as Position)"
      id="top"
      class="node-handle"
      :class="{ 'connected': isTopConnected }"
    />
    
    <!-- 下方连接点（出边，连接目标节点） -->
    <Handle
      type="source"
      :position="('bottom' as Position)"
      id="bottom"
      class="node-handle"
      :class="{ 'connected': isBottomConnected }"
    />
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
  id: 'top'
})

const sourceConnections = useHandleConnections({
  type: 'source',
  id: 'bottom'
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

const isTopConnected = computed(() => {
  return targetConnections.value.length > 0
})

const isBottomConnected = computed(() => {
  return sourceConnections.value.length > 0
})
</script>

<style scoped>
.condition-gateway-node {
  position: relative;
  display: flex;
  alignItems: center;
  justifyContent: center;
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
  width: 8px !important;
  height: 8px !important;
  background: #8b5cf6 !important;
  border: 2px solid white !important;
}

.node-handle.top {
  top: -5px !important;
}

.node-handle.bottom {
  bottom: -5px !important;
}

.node-handle.connected {
  opacity: 1;
}

.condition-gateway-node:hover .node-handle {
  opacity: 0.5;
}

.node-handle:hover {
  opacity: 1 !important;
  transform: scale(1.3);
}
</style>
