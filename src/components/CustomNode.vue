<template>
  <div class="custom-node" :style="nodeStyle">
    <span v-if="label">{{ label }}</span>
    
    <!-- 上方连接点（目标点） -->
    <Handle
      type="target"
      :position="('top' as Position)"
      id="top"
      class="node-handle"
      :class="{ 'connected': isTopConnected }"
    />
    
    <!-- 下方连接点（源点） -->
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
}>()

const targetConnections = useHandleConnections({
  type: 'target',
  id: 'top'
})

const sourceConnections = useHandleConnections({
  type: 'source',
  id: 'bottom'
})

const label = computed(() => props.label)
const nodeColor = computed(() => props.color || '#3b82f6')

const nodeStyle = computed(() => ({
  background: nodeColor.value,
  color: 'white',
  border: 'none',
  padding: '10px 20px',
  borderRadius: '8px',
  minWidth: '120px',
  minHeight: '50px',
  textAlign: 'center' as const,
  position: 'relative' as const,
  fontWeight: 500 as const
}))

const isTopConnected = computed(() => {
  return targetConnections.value.length > 0
})

const isBottomConnected = computed(() => {
  return sourceConnections.value.length > 0
})
</script>

<style scoped>
.custom-node {
  position: relative;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-handle {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.node-handle.connected {
  opacity: 1;
}
</style>