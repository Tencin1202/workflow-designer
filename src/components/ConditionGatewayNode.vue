<template>
  <div class="condition-gateway-node" :style="nodeStyle" :title="label">
    
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
    statusCode?: string
    paramName?: string
    paramOperator?: string
    paramValue?: string
  }
  branches?: Array<{
    id: string
    targetNodeId: string
    conditions?: {
      statusCode?: string
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
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  textAlign: 'center' as const,
  position: 'relative' as const,
  fontWeight: 500 as const,
  fontSize: '0.75rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
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
  align-items: center;
  justify-content: center;
}
</style>
