import { ApiLogEntry } from '@shared/types/database';
import { v4 as uuidv4 } from 'uuid';

// Флаг для проверки, включен ли режим разработчика
let developerModeEnabled = false;

// Инициализация состояния режима разработчика
chrome.storage.sync.get(['developerMode'], (result) => {
  developerModeEnabled = result.developerMode || false;
});

// Слушаем изменения настроек
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes.developerMode) {
    developerModeEnabled = changes.developerMode.newValue || false;
  }
});

// Функция для отправки лога в IndexedDB через background service
async function sendLogToBackground(log: ApiLogEntry): Promise<void> {
  try {
    await chrome.runtime.sendMessage({
      type: 'ADD_API_LOG',
      data: log
    });
  } catch (error) {
    console.error('[apiLogger] Failed to send log to background:', error);
  }
}

// Функция для удаления чувствительных данных из headers
function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized = { ...headers };
  
  // Удаляем или маскируем чувствительные заголовки
  const sensitiveHeaders = ['authorization', 'x-api-key', 'api-key', 'apikey'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveHeaders.includes(key.toLowerCase())) {
      sanitized[key] = '***HIDDEN***';
    }
  }
  
  return sanitized;
}

// Обертка для fetch с логированием
export async function loggedFetch(
  url: string | URL,
  options?: RequestInit
): Promise<Response> {
  // Если режим разработчика выключен, просто выполняем обычный fetch
  if (!developerModeEnabled) {
    return fetch(url, options);
  }

  const requestId = uuidv4();
  const startTime = Date.now();
  const urlString = url.toString();
  const method = options?.method || 'GET';

  // Извлекаем headers
  const headersObj: Record<string, string> = {};
  if (options?.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headersObj[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headersObj[key] = value;
      });
    } else {
      Object.assign(headersObj, options.headers);
    }
  }

  // Логируем request
  const requestLog: ApiLogEntry = {
    id: requestId + '-req',
    timestamp: Date.now(),
    type: 'request',
    url: urlString,
    method,
    headers: sanitizeHeaders(headersObj),
    requestBody: options?.body ? options.body.toString() : undefined,
  };

  // Отправляем лог асинхронно (не блокируем запрос)
  sendLogToBackground(requestLog).catch(console.error);

  try {
    // Выполняем запрос
    const response = await fetch(url, options);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Клонируем response чтобы прочитать body
    const clonedResponse = response.clone();
    let responseBody: string | undefined;

    try {
      // Пытаемся прочитать как JSON
      responseBody = await clonedResponse.text();
      // Ограничиваем размер логируемого body до 10KB
      if (responseBody && responseBody.length > 10240) {
        responseBody = responseBody.substring(0, 10240) + '... (truncated)';
      }
    } catch (error) {
      responseBody = '[Failed to read response body]';
    }

    // Логируем response
    const responseLog: ApiLogEntry = {
      id: requestId + '-res',
      timestamp: Date.now(),
      type: 'response',
      url: urlString,
      method,
      status: response.status,
      responseBody,
      duration,
    };

    // Отправляем лог асинхронно
    sendLogToBackground(responseLog).catch(console.error);

    return response;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Логируем ошибку
    const errorLog: ApiLogEntry = {
      id: requestId + '-err',
      timestamp: Date.now(),
      type: 'response',
      url: urlString,
      method,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    };

    // Отправляем лог асинхронно
    sendLogToBackground(errorLog).catch(console.error);

    throw error;
  }
}

