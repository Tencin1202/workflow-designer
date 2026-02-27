// ==================== 条件配置接口 ====================

// 操作符类型
export type ConditionOperator = 'eq' | 'ne' | 'contains' | 'regex'

// taskLog 配置
export interface TaskLogConfig {
  i18nKey: string                      // 国际化 key（必填，1-64字符）
  placeholders: Record<string, string>  // 占位符 key-value（可选）
}

// 全局参数操作
export interface GlobalParamAction {
  type: 'add' | 'remove'
  key: string
  value?: string
}

// 条件配置
export interface EdgeConditionConfig {
  statusCode?: string  // statusCode 条件值
  paramName?: string   // 参数名
  paramOperator?: ConditionOperator  // 关系
  paramValue?: string  // 参数值
  taskLog?: TaskLogConfig  // 任务日志配置
  globalParams?: GlobalParamAction[]  // 全局参数操作列表
}

// ==================== 节点数据接口 ====================

export interface HandlerConfig {
  class: string
  method: string
}

export interface NodeData {
  id: string
  type: string
  label: string
  position: { x: number; y: number }
  processor?: string
  interfaceName?: string
  collectionName?: string
  requestHandler?: HandlerConfig
  responseHandler?: HandlerConfig
  // 条件网关专用
  isConditionGateway?: boolean
  gatewayConditions?: EdgeConditionConfig
}

// ==================== 边数据接口 ====================

// 分支配置（从条件网关出发的边）
export interface ConditionBranch {
  id: string
  targetNodeId: string
  conditions: EdgeConditionConfig
  priority?: number
  branches?: ConditionBranch[]
}

// 主边数据（支持嵌套条件）
export interface EdgeData {
  id: string
  source: string
  target: string
  priority?: number
  // 条件配置
  conditions?: EdgeConditionConfig
  // 分支（从条件网关出发的边）
  branches?: ConditionBranch[]
}

// ==================== 工作流数据接口 ====================

export interface WorkflowData {
  name: string
  nodes: NodeData[]
  edges: EdgeData[]
}

// ==================== 辅助函数 ====================

// 获取操作符显示文本
export function getOperatorText(operator?: string): string {
  const map: Record<string, string> = {
    'eq': 'equals',
    'ne': 'notEqual',
    'contains': 'contains',
    'regex': 'matches'
  }
  return map[operator || 'eq'] || 'equals'
}

// 获取条件显示文本
export function getConditionDisplayText(conditions?: EdgeConditionConfig): string {
  if (!conditions) return '无条件'
  
  const parts: string[] = []
  
  if (conditions.statusCode) {
    parts.push(`statusCode=${conditions.statusCode}`)
  }
  
  if (conditions.paramName && conditions.paramValue) {
    const opText = getOperatorText(conditions.paramOperator)
    parts.push(`${conditions.paramName}${opText}${conditions.paramValue}`)
  }
  
  return parts.length > 0 ? parts.join(', ') : '无条件'
}

// ==================== 递归解析嵌套边 ====================

interface ParsedBranch {
  id: string
  targetNodeId: string
  conditions: EdgeConditionConfig
  branches?: ParsedBranch[]
  level: number
}

function parseNestedEdges(edgeElement: Element, level: number = 0, parentId?: string): ParsedBranch[] {
  const branches: ParsedBranch[] = []
  
  if (level > 3) {
    console.warn('超过最大嵌套层数限制(3层)，将忽略深层嵌套')
    return branches
  }
  
  const childEdgeElements = edgeElement.querySelectorAll(':scope > edge')
  
  childEdgeElements.forEach((childEdge, index) => {
    const targetNodeId = childEdge.getAttribute('target')
    if (!targetNodeId) return
    
    const statusCode = childEdge.getAttribute('statusCode') || undefined
    const paramName = childEdge.getAttribute('paramName') || undefined
    const paramOperator = (childEdge.getAttribute('paramOperator') as ConditionOperator) || undefined
    const paramValue = childEdge.getAttribute('paramValue') || undefined
    
    const conditions: EdgeConditionConfig = {}
    if (statusCode || paramName || paramValue) {
      conditions.statusCode = statusCode
      conditions.paramName = paramName
      conditions.paramOperator = paramOperator
      conditions.paramValue = paramValue
    }
    
    const branchId = parentId 
      ? `${parentId}-branch-${level}-${index}`
      : `branch-${level}-${index}`
    
    const branch: ParsedBranch = {
      id: branchId,
      targetNodeId,
      conditions,
      level
    }
    
    const nestedBranches = parseNestedEdges(childEdge, level + 1, branchId)
    if (nestedBranches.length > 0) {
      branch.branches = nestedBranches
    }
    
    branches.push(branch)
  })
  
  return branches
}

export const parseXML = (xmlString: string): WorkflowData => {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')
  
  // 检查XML解析错误
  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error('XML格式无效，无法解析')
  }
  
  // 检查根元素
  const workflowElement = doc.querySelector('workflow')
  if (!workflowElement) {
    throw new Error('XML缺少<workflow>根元素')
  }
  
  // 提取工作流名称
  const workflowName = workflowElement.getAttribute('name') || '导入的工作流'
  
  // 检查nodes节点
  const nodesElement = workflowElement.querySelector('nodes')
  if (!nodesElement) {
    throw new Error('XML缺少<nodes>节点')
  }
  
  // 解析所有node元素
  const nodes: NodeData[] = []
  const nodeElements = nodesElement.querySelectorAll('node')
  
  nodeElements.forEach((nodeEl, index) => {
    const id = nodeEl.getAttribute('id')
    const type = nodeEl.getAttribute('type')
    const label = nodeEl.getAttribute('label')
    
    if (!id || !type || !label) {
      throw new Error(`第${index + 1}个节点缺少必要属性(id/type/label)`)
    }
    
    const positionEl = nodeEl.querySelector('position')
    if (!positionEl) {
      throw new Error(`节点${id}缺少<position>元素`)
    }
    
    const x = parseInt(positionEl.getAttribute('x') || '0')
    const y = parseInt(positionEl.getAttribute('y') || '0')
    
    if (isNaN(x) || isNaN(y)) {
      throw new Error(`节点${id}的位置坐标无效`)
    }
    
    // 解析条件网关属性
    const isGateway = type === 'condition-gateway'
    let gatewayConditions: EdgeConditionConfig | undefined
    
    if (isGateway) {
      const statusCode = nodeEl.getAttribute('statusCode') || undefined
      const paramName = nodeEl.getAttribute('paramName') || undefined
      const paramOperator = (nodeEl.getAttribute('paramOperator') as ConditionOperator) || undefined
      const paramValue = nodeEl.getAttribute('paramValue') || undefined
      
      if (statusCode || paramName || paramValue) {
        gatewayConditions = {
          statusCode,
          paramName,
          paramOperator,
          paramValue
        }
      }
    }
    
    const processorEl = nodeEl.querySelector('processor')
    const interfaceNameEl = nodeEl.querySelector('interfaceName')
    const collectionNameEl = nodeEl.querySelector('collectionName')
    
    const requestHandlerEl = nodeEl.querySelector('requestHandler')
    const responseHandlerEl = nodeEl.querySelector('responseHandler')
    
    let requestHandler: HandlerConfig | undefined
    let responseHandler: HandlerConfig | undefined
    
    if (requestHandlerEl) {
      const rhClass = requestHandlerEl.getAttribute('class')
      const rhMethod = requestHandlerEl.getAttribute('method')
      if (rhClass && rhMethod) {
        requestHandler = { class: rhClass, method: rhMethod }
      }
    }
    
    if (responseHandlerEl) {
      const rhClass = responseHandlerEl.getAttribute('class')
      const rhMethod = responseHandlerEl.getAttribute('method')
      if (rhClass && rhMethod) {
        responseHandler = { class: rhClass, method: rhMethod }
      }
    }
    
    nodes.push({
      id,
      type,
      label,
      position: { x, y },
      processor: processorEl?.textContent?.trim() || undefined,
      interfaceName: interfaceNameEl?.textContent?.trim() || undefined,
      collectionName: collectionNameEl?.textContent?.trim() || undefined,
      requestHandler,
      responseHandler,
      isConditionGateway: isGateway,
      gatewayConditions
    })
  })
  
  // 解析所有edge元素
  const edges: EdgeData[] = []
  const edgesElement = workflowElement.querySelector('edges')
  
  if (edgesElement) {
    const edgeElements = edgesElement.querySelectorAll('edge')
    
    edgeElements.forEach((edgeEl, index) => {
      const source = edgeEl.getAttribute('source')
      const target = edgeEl.getAttribute('target')
      const priorityAttr = edgeEl.getAttribute('priority')
      let priority = 10
      if (priorityAttr) {
        const parsed = parseInt(priorityAttr, 10)
        if (!isNaN(parsed)) {
          priority = Math.max(0, Math.min(10, parsed))
        }
      }
      
      if (!source || !target) {
        throw new Error(`第${index + 1}条连线缺少source或target属性`)
      }
      
      const statusCode = edgeEl.getAttribute('statusCode') || undefined
      const paramName = edgeEl.getAttribute('paramName') || undefined
      const paramOperator = (edgeEl.getAttribute('paramOperator') as ConditionOperator) || undefined
      const paramValue = edgeEl.getAttribute('paramValue') || undefined

      // 解析 taskLog
      let taskLog: TaskLogConfig | undefined
      const taskLogI18nKey = edgeEl.getAttribute('taskLog.i18nKey')
      if (taskLogI18nKey) {
        taskLog = {
          i18nKey: taskLogI18nKey,
          placeholders: {}
        }
        const placeholdersAttr = edgeEl.getAttribute('taskLog.placeholders')
        if (placeholdersAttr) {
          try {
            const decoded = placeholdersAttr.replace(/&quot;/g, '"')
            taskLog.placeholders = JSON.parse(decoded)
          } catch {
            // 忽略解析错误
          }
        }
      }

      // 解析全局参数
      const globalParams: GlobalParamAction[] = []
      const globalParamsElements = edgeEl.querySelectorAll('param')
      globalParamsElements.forEach(paramEl => {
        const addToGlobal = paramEl.getAttribute('addToGlobal')
        const removeFromGlobal = paramEl.getAttribute('removeFromGlobal')
        
        if (addToGlobal) {
          globalParams.push({
            type: 'add',
            key: addToGlobal,
            value: paramEl.getAttribute('value') || ''
          })
        } else if (removeFromGlobal) {
          globalParams.push({
            type: 'remove',
            key: removeFromGlobal
          })
        }
      })

      const conditions: EdgeConditionConfig | undefined = (
        statusCode || paramName || paramValue || taskLog || globalParams.length > 0
      ) ? { statusCode, paramName, paramOperator, paramValue, taskLog, globalParams: globalParams.length > 0 ? globalParams : undefined } : undefined
      
      const edgeId = `e${Date.now()}-${index}`
      
      const mainEdge: EdgeData = {
        id: edgeId,
        source,
        target,
        priority,
        conditions
      }
      
      const nestedBranches = parseNestedEdges(edgeEl, 0, edgeId)
      
      if (nestedBranches.length > 0) {
        mainEdge.branches = nestedBranches.map((branch, branchIndex) => ({
          id: `${edgeId}-b${branchIndex}`,
          targetNodeId: branch.targetNodeId,
          conditions: branch.conditions,
          priority: undefined
        }))
      }
      
      edges.push(mainEdge)
    })
  }
  
  return {
    name: workflowName,
    nodes,
    edges
  }
}

// ==================== XML 验证器 ====================

export const validateXML = (xmlString: string): string | null => {
  try {
    parseXML(xmlString)
    return null
  } catch (error: unknown) {
    return error instanceof Error ? error.message : '未知错误'
  }
}

// ==================== XML 生成器 ====================

function generateConditionsXML(conditions?: EdgeConditionConfig): string {
  if (!conditions) return ''
  
  let xml = ''
  if (conditions.statusCode) {
    xml += ` statusCode="${conditions.statusCode}"`
  }
  if (conditions.paramName) {
    xml += ` paramName="${conditions.paramName}"`
    xml += ` paramOperator="${conditions.paramOperator || 'eq'}"`
    xml += ` paramValue="${conditions.paramValue || ''}"`
  }
  
  // 生成 taskLog XML
  if (conditions.taskLog) {
    const { i18nKey, placeholders } = conditions.taskLog
    xml += ` taskLog.i18nKey="${i18nKey}"`
    // 过滤掉空key或临时key
    const validPlaceholders: Record<string, string> = {}
    if (placeholders) {
      Object.entries(placeholders).forEach(([key, value]) => {
        if (key && key.trim() && !key.startsWith('__temp_')) {
          validPlaceholders[key] = value
        }
      })
    }
    if (Object.keys(validPlaceholders).length > 0) {
      const placeholdersJson = JSON.stringify(validPlaceholders).replace(/"/g, '&quot;')
      xml += ` taskLog.placeholders="${placeholdersJson}"`
    }
  }
  
  // 生成全局参数 XML
  if (conditions.globalParams && conditions.globalParams.length > 0) {
    conditions.globalParams.forEach(param => {
      if (param.type === 'add' && param.key.trim()) {
        xml += `\n        <param addToGlobal="${param.key}" value="${param.value || ''}"/>`
      } else if (param.type === 'remove' && param.key.trim()) {
        xml += `\n        <param removeFromGlobal="${param.key}"/>`
      }
    })
    if (conditions.globalParams.some(p => p.type === 'add' || p.type === 'remove')) {
      xml += '\n      '
    }
  }
  
  return xml
}

function generateBranchesXML(
  branches?: ConditionBranch[],
  indent: string = '      '
): string {
  if (!branches || branches.length === 0) return ''
  
  let xml = ''
  branches.forEach((branch, _index) => {
    xml += `\n${indent}<edge`
    xml += ` target="${branch.targetNodeId}"`
    xml += generateConditionsXML(branch.conditions)
    xml += `>`
    
    if (branch.branches && branch.branches.length > 0) {
      xml += generateBranchesXML(branch.branches, indent + '  ')
    }
    
    xml += `\n${indent}</edge>`
  })
  
  return xml
}

export const generateXML = (data: WorkflowData): string => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += `<workflow name="${data.name}">\n`
  xml += '  <nodes>\n'
  
  data.nodes.forEach(node => {
    xml += `    <node id="${node.id}" type="${node.type}" label="${node.label}">\n`
    xml += `      <position x="${node.position.x}" y="${node.position.y}"/>\n`
    
    if (node.processor) {
      xml += `      <processor>${node.processor}</processor>\n`
    }
    if (node.interfaceName) {
      xml += `      <interfaceName>${node.interfaceName}</interfaceName>\n`
    }
    if (node.collectionName) {
      xml += `      <collectionName>${node.collectionName}</collectionName>\n`
    }
    
    if (node.requestHandler) {
      xml += `      <requestHandler class="${node.requestHandler.class}" method="${node.requestHandler.method}"/>\n`
    }
    if (node.responseHandler) {
      xml += `      <responseHandler class="${node.responseHandler.class}" method="${node.responseHandler.method}"/>\n`
    }
    
    if (node.isConditionGateway && node.gatewayConditions) {
      xml += generateConditionsXML(node.gatewayConditions).replace(/^/, '      ')
    }
    
    xml += '    </node>\n'
  })
  
  xml += '  </nodes>\n'
  xml += '  <edges>\n'
  
  data.edges.forEach((edge, index) => {
    xml += `    <edge id="e${index}" source="${edge.source}" target="${edge.target}"`
    
    if (edge.priority !== undefined && edge.priority !== 10) {
      xml += ` priority="${edge.priority}"`
    }
    
    xml += generateConditionsXML(edge.conditions)
    
    if (edge.branches && edge.branches.length > 0) {
      xml += generateBranchesXML(edge.branches)
      xml += '\n    '
    }
    
    xml += '/>\n'
  })
  
  xml += '  </edges>\n'
  xml += '</workflow>'
  
  return xml
}
