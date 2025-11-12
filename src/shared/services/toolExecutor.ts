import { Tool, ToolCall, ToolResult, ToolExecution } from '@shared/types/tools';
import { getToolById } from './toolsService';
import * as domFunctions from '@/content/domFunctions';

/**
 * Выполнить инструмент по ToolCall
 */
export async function executeToolCall(
  toolCall: ToolCall,
  tabId: number,
  signal?: AbortSignal,
  onProgress?: (execution: ToolExecution) => void
): Promise<ToolResult> {
  const execution: ToolExecution = {
    id: toolCall.id,
    toolName: toolCall.function.name,
    state: 'input-available',
    startTime: Date.now()
  };
  
  // Уведомляем о начале выполнения
  onProgress?.(execution);
  
  // Запускаем визуальный эффект
  await startPageEffect(tabId);
  
  try {
    // Проверяем AbortSignal
    if (signal?.aborted) {
      throw new Error('Tool execution aborted');
    }
    
    // Получаем инструмент
    const tool = await getToolById(toolCall.function.name);
    
    if (!tool) {
      throw new Error(`Tool ${toolCall.function.name} not found`);
    }
    
    // Парсим аргументы
    let args: any = {};
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Failed to parse tool arguments:', toolCall.function.arguments);
    }
    
    // Добавляем tabId в параметры
    args.tabId = tabId;
    
    // Для fill-form инструмента получаем personalInfo из sync storage
    if (tool.requiresPersonalInfo) {
      const syncData = await chrome.storage.sync.get(['personalInfo']);
      args.personalInfo = syncData.personalInfo;
      console.log('[toolExecutor] Loaded personalInfo for tool:', tool.id, !!args.personalInfo);
    }
    
    // Обновляем состояние - входные данные получены
    execution.input = args;
    execution.state = 'input-available';
    onProgress?.(execution);
    
    // Выполняем инструмент
    const result = await tool.execute(args);
    
    // Обновляем состояние - результат получен
    execution.output = result;
    execution.state = 'output-available';
    execution.endTime = Date.now();
    onProgress?.(execution);
    
    return {
      tool_call_id: toolCall.id,
      output: result
    };
    
  } catch (error) {
    // Обработка ошибок
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    execution.error = errorMessage;
    execution.state = 'output-error';
    execution.endTime = Date.now();
    onProgress?.(execution);
    
    return {
      tool_call_id: toolCall.id,
      output: null,
      error: errorMessage
    };
  } finally {
    // Всегда останавливаем визуальный эффект
    await stopPageEffect(tabId);
  }
}

/**
 * Выполнить несколько инструментов параллельно
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  tabId: number,
  signal?: AbortSignal,
  onProgress?: (execution: ToolExecution) => void
): Promise<ToolResult[]> {
  const results = await Promise.all(
    toolCalls.map(toolCall => 
      executeToolCall(toolCall, tabId, signal, onProgress)
    )
  );
  
  return results;
}

/**
 * Выполнить DOM функцию на странице
 */
export async function executeDOMFunction(
  functionName: string,
  params: any,
  tabId: number
): Promise<any> {
  try {
    // Проверяем, что tab существует и доступен
    const tab = await chrome.tabs.get(tabId);
    if (!tab || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('edge://')) {
      throw new Error('Cannot access system pages');
    }

    // Отправляем сообщение в content script
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'EXECUTE_DOM_FUNCTION',
      data: {
        functionName,
        params
      }
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to execute DOM function');
    }
    
    return response.result;
  } catch (error) {
    console.error(`Error executing DOM function ${functionName}:`, error);
    
    // Более понятное сообщение об ошибке
    if (error instanceof Error && error.message.includes('Receiving end does not exist')) {
      throw new Error('Content script не загружен на этой странице. Попробуйте перезагрузить страницу.');
    }
    
    throw error;
  }
}

/**
 * Запустить визуальный эффект на странице
 */
export async function startPageEffect(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'START_VISUAL_EFFECT'
    });
  } catch (error) {
    console.error('Error starting visual effect:', error);
  }
}

/**
 * Остановить визуальный эффект на странице
 */
export async function stopPageEffect(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'STOP_VISUAL_EFFECT'
    });
  } catch (error) {
    console.error('Error stopping visual effect:', error);
  }
}

