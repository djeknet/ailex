import { Tool, ToolCall, ToolResult, ToolExecution } from '@shared/types/tools';
import { getToolById } from './toolsService';
import * as domFunctions from '@/content/domFunctions';

/**
 * Выполнить API запрос
 */
async function executeAPICall(
  url: string,
  method: 'GET' | 'POST',
  headers: Record<string, string> = {},
  params: any = {}
): Promise<any> {
  try {
    // Заменяем плейсхолдеры {param} в URL
    let finalUrl = url;
    Object.keys(params).forEach(key => {
      const placeholder = `{${key}}`;
      if (finalUrl.includes(placeholder)) {
        finalUrl = finalUrl.replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(params[key]));
      }
    });
    
    // Подготавливаем опции запроса
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    // Добавляем body для POST запросов
    if (method === 'POST') {
      options.body = JSON.stringify(params);
    }
    
    console.log('[executeAPICall] Calling API:', finalUrl, method);
    
    // Выполняем запрос
    const response = await fetch(finalUrl, options);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    // Парсим JSON ответ
    const data = await response.json();
    console.log('[executeAPICall] API response:', data);
    
    return data;
  } catch (error) {
    console.error('[executeAPICall] API error:', error);
    throw error;
  }
}

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
  
  // Проверяем, является ли это инструментом парсинга
  const isParsingTool = toolCall.function.name === 'parse-pages';
  
  // Получаем sessionId и action из аргументов для инструмента парсинга
  let parsingSessionId: string | undefined;
  let parsingAction: string | undefined;
  try {
    const args = JSON.parse(toolCall.function.arguments);
    if (isParsingTool) {
      parsingSessionId = args.sessionId;
      parsingAction = args.action;
    }
  } catch (e) {
    console.error('Failed to parse tool arguments:', toolCall.function.arguments);
  }
  
  // Запускаем визуальный эффект для парсинга при каждом вызове (логика в visualEffects проверит, нужно ли создавать новый)
  if (isParsingTool && parsingSessionId) {
    console.log('[toolExecutor] Ensuring parsing visual effect for session:', parsingSessionId, 'action:', parsingAction);
    await startPageEffect(tabId, 'parsing', parsingSessionId);
  } else if (!isParsingTool) {
    // Для обычных инструментов запускаем каждый раз
    await startPageEffect(tabId, 'tool');
  }
  
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
    
    // Обновляем название инструмента на человекочитаемое
    execution.toolName = tool.name;
    onProgress?.(execution);
    
    // Парсим аргументы
    let args: any = {};
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      const parseError = `Failed to parse tool arguments: ${toolCall.function.arguments}`;
      console.error('[toolExecutor]', parseError, e);
      
      // Попытка найти место ошибки в JSON
      let errorDetails = '';
      if (e instanceof SyntaxError) {
        errorDetails = e.message;
        // Ищем отсутствующие запятые между свойствами
        const missingCommaMatch = toolCall.function.arguments.match(/"([^"]+)"([^,}\s])/);
        if (missingCommaMatch) {
          errorDetails += ` - Possible missing comma after "${missingCommaMatch[1]}"`;
        }
      }
      
      throw new Error(`Failed to parse tool arguments: ${errorDetails}. JSON: ${toolCall.function.arguments.substring(0, 200)}`);
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
    
    // Если у инструмента есть API, вызываем его перед выполнением
    let apiResult: any = null;
    if (tool.apiUrl) {
      console.log('[toolExecutor] Tool has API URL, calling API first:', tool.apiUrl);
      try {
        apiResult = await executeAPICall(
          tool.apiUrl,
          tool.apiMethod || 'POST',
          tool.apiHeaders || {},
          args
        );
        console.log('[toolExecutor] API call successful, adding result to args');
        // Добавляем результат API в args для дальнейшей обработки
        args.apiResult = apiResult;
      } catch (apiError) {
        console.error('[toolExecutor] API call failed:', apiError);
        throw new Error(`API call failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
      }
    }
    
    // Выполняем инструмент
    const result = await tool.execute(args);
    
    // Для parse-pages обновляем прогресс-бар
    if (isParsingTool && result && typeof result === 'object') {
      const { currentPage, maxPages, status } = result as any;
      if (currentPage !== undefined && maxPages !== undefined) {
        try {
          await chrome.tabs.sendMessage(tabId, {
            type: 'UPDATE_PARSING_PROGRESS',
            data: {
              current: currentPage,
              total: maxPages,
              status: status || '',
              sessionId: parsingSessionId
            }
          });
        } catch (error) {
          console.error('Error updating parsing progress:', error);
        }
      }
      
      // Останавливаем визуальный эффект только при завершении парсинга
      if (parsingAction === 'finish') {
        console.log('[toolExecutor] Stopping parsing visual effect for session:', parsingSessionId);
        await stopPageEffect(tabId);
      }
    }
    
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
    
    // При ошибке парсинга останавливаем визуальный эффект
    if (isParsingTool && parsingSessionId) {
      console.log('[toolExecutor] Stopping parsing visual effect due to error:', parsingSessionId);
      await stopPageEffect(tabId);
    }
    
    return {
      tool_call_id: toolCall.id,
      output: null,
      error: errorMessage
    };
  } finally {
    // Останавливаем визуальный эффект только для обычных инструментов (не для парсинга)
    if (!isParsingTool) {
      await stopPageEffect(tabId);
    }
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
export async function startPageEffect(tabId: number, type: 'tool' | 'parsing' = 'tool', sessionId?: string): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'START_VISUAL_EFFECT',
      data: { type, sessionId }
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

