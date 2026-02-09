import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { WorkflowData } from '@/utils/xmlParser'

export const useWorkflowStore = defineStore('workflow', () => {
  // State
  const importedWorkflow = ref<WorkflowData | null>(null)
  
  // Getters
  const hasImportedData = computed(() => importedWorkflow.value !== null)
  
  // Actions
  const setImportedWorkflow = (data: WorkflowData) => {
    importedWorkflow.value = data
  }
  
  const clearImportedWorkflow = () => {
    importedWorkflow.value = null
  }
  
  return {
    importedWorkflow,
    hasImportedData,
    setImportedWorkflow,
    clearImportedWorkflow
  }
})