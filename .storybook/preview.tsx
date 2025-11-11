import type { Preview, Decorator } from '@storybook/react'
import React, { useEffect } from 'react'
import '../src/ui/styles/globals.css'

// Mock Chrome API globally before any component loads
(window as any).chrome = {
  storage: {
    sync: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
    onChanged: {
      addListener: () => {},
      removeListener: () => {},
    },
  },
  runtime: {
    getURL: (path: string) => `/src/${path}`,
    sendMessage: (message: any, callback?: any) => {
      console.log('[Mock Chrome] sendMessage:', message);
      
      // Handle API Logs requests
      if (message.type === 'GET_API_LOGS') {
        const mockLogs = [
          {
            id: 'log-1-req',
            timestamp: Date.now() - 5000,
            type: 'request',
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': '***HIDDEN***'
            },
            requestBody: JSON.stringify({
              model: 'gpt-4o',
              messages: [
                { role: 'system', content: 'Ты полезный AI ассистент, который помогает пользователям с различными задачами. Отвечай подробно и структурированно.' },
                { role: 'user', content: 'Что такое искусственный интеллект?' },
                { role: 'assistant', content: 'Искусственный интеллект - это область компьютерных наук...' },
                { role: 'user', content: 'Расскажи подробнее о нейронных сетях и их применении в современном мире' },
                { role: 'assistant', content: 'Нейронные сети - это математические модели, вдохновленные работой человеческого мозга...' },
                { role: 'user', content: 'Какие существуют типы нейронных сетей и в чем их различия?' }
              ],
              stream: true,
              temperature: 0.7,
              max_tokens: 2000,
              top_p: 1,
              frequency_penalty: 0,
              presence_penalty: 0,
              user: 'user-12345',
              metadata: {
                session_id: 'sess_abc123def456',
                user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                timestamp: new Date().toISOString(),
                features: ['streaming', 'context-aware', 'multi-turn'],
                config: {
                  retry_attempts: 3,
                  timeout: 30000,
                  fallback_model: 'gpt-3.5-turbo'
                }
              }
            }, null, 2),
          },
          {
            id: 'log-1-res',
            timestamp: Date.now() - 4500,
            type: 'response',
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            status: 200,
            responseBody: JSON.stringify({
              id: 'chatcmpl-123',
              object: 'chat.completion',
              model: 'gpt-4o',
              created: 1677652288,
              choices: [{
                index: 0,
                message: {
                  role: 'assistant',
                  content: 'Существует несколько основных типов нейронных сетей:\n\n1. **Feedforward Neural Networks (Прямого распространения)**\n   - Самый простой тип\n   - Информация движется только в одном направлении\n   - Используется для классификации и регрессии\n\n2. **Convolutional Neural Networks (CNN, Сверточные)**\n   - Специализированы для обработки изображений\n   - Используют операции свертки для извлечения признаков\n   - Применение: распознавание лиц, медицинская диагностика\n\n3. **Recurrent Neural Networks (RNN, Рекуррентные)**\n   - Имеют память о предыдущих входах\n   - Используются для последовательных данных\n   - Применение: обработка текста, временные ряды\n\n4. **Long Short-Term Memory (LSTM)**\n   - Улучшенная версия RNN\n   - Решает проблему затухания градиента\n   - Лучше работает с длинными последовательностями\n\n5. **Transformer Networks**\n   - Современная архитектура для NLP\n   - Использует механизм внимания (attention)\n   - Основа для GPT, BERT и других больших моделей'
                },
                finish_reason: 'stop'
              }],
              usage: {
                prompt_tokens: 145,
                completion_tokens: 280,
                total_tokens: 425
              }
            }, null, 2),
            duration: 1245
          },
          {
            id: 'log-2-req',
            timestamp: Date.now() - 3000,
            type: 'request',
            url: 'https://api.anthropic.com/v1/messages',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': '***HIDDEN***'
            },
            requestBody: JSON.stringify({
              model: 'claude-sonnet-4-5',
              messages: [{ role: 'user', content: 'Объясни машинное обучение' }]
            }),
          },
          {
            id: 'log-2-res',
            timestamp: Date.now() - 2200,
            type: 'response',
            url: 'https://api.anthropic.com/v1/messages',
            method: 'POST',
            status: 200,
            responseBody: JSON.stringify({
              content: [{ text: 'Машинное обучение - это когда компьютер учится на примерах.' }],
              model: 'claude-sonnet-4-5'
            }),
            duration: 800
          },
          {
            id: 'log-3-err',
            timestamp: Date.now() - 500,
            type: 'response',
            url: 'https://api.x.ai/v1/chat/completions',
            method: 'POST',
            status: 429,
            error: 'Rate limit exceeded. Please try again later.',
            duration: 150
          },
        ];
        
        if (callback) callback(mockLogs);
        return Promise.resolve(mockLogs);
      }
      
      if (message.type === 'CLEAR_API_LOGS') {
        if (callback) callback({ success: true });
        return Promise.resolve({ success: true });
      }
      
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    },
    onMessage: {
      addListener: () => {},
      removeListener: () => {}
    }
  },
  tabs: {
    query: (queryInfo: any) => Promise.resolve([{
      id: 1,
      url: 'https://github.com',
      title: 'GitHub - Where the world builds software',
      favIconUrl: 'https://github.githubassets.com/favicons/favicon.svg',
      status: 'complete'
    }]),
    sendMessage: (tabId: number, message: any, callback?: any) => {
      console.log('[Mock Chrome] tabs.sendMessage:', message);
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    },
    onActivated: {
      addListener: () => {},
      removeListener: () => {}
    },
    onUpdated: {
      addListener: () => {},
      removeListener: () => {}
    },
    get: () => Promise.resolve({
      url: 'https://github.com',
      title: 'GitHub - Where the world builds software',
      favIconUrl: 'https://github.githubassets.com/favicons/favicon.svg',
      status: 'complete'
    })
  },
  windows: {
    create: () => Promise.resolve({})
  }
};

// Decorator to wrap stories with necessary providers and theme support
const withProviders: Decorator = (Story, context) => {
  // Get theme from Storybook backgrounds parameter
  const backgroundColor = context.globals.backgrounds?.value;
  const isDark = backgroundColor === '#0a0a0a' || !backgroundColor;
  
  useEffect(() => {
    // Apply theme to document root
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className={isDark ? 'dark' : ''}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#0a0a0a',
        },
        {
          name: 'light',
          value: '#ffffff',
        },
      ],
    },
    a11y: {
      test: 'todo'
    }
  },
};

export default preview;
