import type { Meta, StoryObj } from '@storybook/react';
import React, { useEffect } from 'react';
import History from '../ui/pages/History';
import '../ui/styles/globals.css';
import { useChatStore } from '@shared/stores/chatStore';
import { useSettingsStore } from '@shared/stores/settingsStore';
import { Chat, ChatMessage, Statistics } from '@shared/types/database';
import { AIOperator } from '@shared/types/ai';
import { i18nService } from '@shared/i18n/i18nService';

// Импортируем переводы напрямую для Storybook
import enMessages from '../_locales/en/messages.json';
import ruMessages from '../_locales/ru/messages.json';

// Инициализация переводов для Storybook
const initMockTranslations = () => {
  // Напрямую загружаем переводы в i18nService
  (i18nService as any).translations = {
    en: enMessages,
    ru: ruMessages,
  };
  (i18nService as any).currentLang = 'en';
  (i18nService as any).loadedLanguages = new Set(['en', 'ru']);
  (i18nService as any).isInitialized = true;
  console.log('📚 Mock translations initialized');
};

// Mock функции для заполнения хранилищ тестовыми данными
const setupMockChats = () => {
  // Текущая дата: 11.11.2025
  const now = new Date('2025-11-11T12:00:00').getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Создаем тестовые чаты
  const mockChats: Chat[] = [
    {
      id: 'chat_1',
      title: 'Обсуждение React и TypeScript. Обсуждение React и TypeScript. Обсуждение React и TypeScript. Обсуждение React и TypeScript',
      site: 'stackoverflow.com',
      createdAt: now - oneDay * 0.5, // Сегодня
      updatedAt: now - oneDay * 0.5,
    },
    {
      id: 'chat_2',
      title: 'Вопросы по Next.js и SSR',
      site: 'nextjs.org',
      createdAt: now - oneDay, // Вчера
      updatedAt: now - oneDay,
    },
    {
      id: 'chat_3',
      title: 'Изучение Tailwind CSS',
      site: 'tailwindcss.com',
      createdAt: now - oneDay, // Вчера
      updatedAt: now - oneDay,
    },
    {
      id: 'chat_4',
      title: 'Настройка ESLint и Prettier',
      site: 'eslint.org',
      createdAt: now - oneDay * 3, // 3 дня назад
      updatedAt: now - oneDay * 3,
    },
    {
      id: 'chat_5',
      title: 'Работа с API и Fetch',
      site: 'developer.mozilla.org',
      createdAt: now - oneDay * 5, // 5 дней назад
      updatedAt: now - oneDay * 5,
    },
    {
      id: 'chat_6',
      title: 'Управление состоянием с Zustand',
      site: 'github.com',
      createdAt: now - oneDay * 7, // 7 дней назад
      updatedAt: now - oneDay * 7,
    },
    {
      id: 'chat_7',
      title: 'Тестирование с Jest и React Testing Library',
      site: 'jestjs.io',
      createdAt: now - oneDay * 10, // 10 дней назад
      updatedAt: now - oneDay * 10,
    },
    {
      id: 'chat_8',
      title: 'Оптимизация производительности React',
      site: 'react.dev',
      createdAt: now - oneDay * 15, // 15 дней назад
      updatedAt: now - oneDay * 15,
    },
  ];

  // Создаем тестовые сообщения для каждого чата
  const mockMessages: Record<string, ChatMessage[]> = {};
  
  mockChats.forEach((chat, index) => {
    const operators: AIOperator[] = ['anthropic', 'openai', 'gemini', 'grok'];
    const usedOperator = operators[index % operators.length];
    
    mockMessages[chat.id] = [
      {
        id: `${chat.id}_msg_1`,
        chatId: chat.id,
        isUser: true,
        text: `Привет! Вопрос по теме "${chat.title}"`,
        createdAt: chat.createdAt,
        tokens: 0,
      },
      {
        id: `${chat.id}_msg_2`,
        chatId: chat.id,
        isUser: false,
        text: `Конечно, помогу разобраться с "${chat.title}". Вот подробный ответ...`,
        createdAt: chat.createdAt + 1000,
        operator: usedOperator,
        model: usedOperator === 'anthropic' ? 'claude-sonnet-4-5' : 
               usedOperator === 'openai' ? 'gpt-4o' :
               usedOperator === 'gemini' ? 'gemini-2.0-flash-exp' : 'grok-2',
        tokens: 600 + index * 150,
      },
      {
        id: `${chat.id}_msg_3`,
        chatId: chat.id,
        isUser: true,
        text: 'Спасибо! Можешь показать пример кода?',
        createdAt: chat.createdAt + 30000,
        tokens: 0,
      },
      {
        id: `${chat.id}_msg_4`,
        chatId: chat.id,
        isUser: false,
        text: '```typescript\n// Вот пример кода\nconst example = () => {\n  console.log("Hello!");\n};\n```',
        createdAt: chat.createdAt + 31000,
        operator: usedOperator,
        model: usedOperator === 'anthropic' ? 'claude-sonnet-4-5' : 
               usedOperator === 'openai' ? 'gpt-4o' :
               usedOperator === 'gemini' ? 'gemini-2.0-flash-exp' : 'grok-2',
        tokens: 500 + index * 110,
      },
    ];
  });

  return { chats: mockChats, messages: mockMessages };
};

const setupMockStatistics = () => {
  // Используем текущую реальную дату для Storybook, чтобы данные отображались корректно
  const now = new Date();
  const stats: Statistics[] = [];
  
  const operators: AIOperator[] = ['anthropic', 'openai', 'gemini', 'grok', 'openrouter', 'lmstudio'];
  const models: Record<AIOperator, string[]> = {
    anthropic: ['claude-sonnet-4-5', 'claude-opus-4', 'claude-3-5-sonnet-20241022'],
    openai: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'],
    gemini: ['gemini-2.0-flash-exp', 'gemini-1.5-pro-002', 'gemini-1.5-flash-002'],
    grok: ['grok-2', 'grok-2-vision'],
    openrouter: ['deepseek/deepseek-chat', 'meta-llama/llama-3.1-405b'],
    lmstudio: ['local-model'],
  };

  // Генерируем статистику за последние 30 дней
  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Для каждого дня генерируем статистику по операторам
    operators.forEach((operator) => {
      const operatorModels = models[operator];
      operatorModels.forEach((model, modelIndex) => {
        // Не все модели используются каждый день (30% вероятность пропуска для вариативности)
        if (modelIndex > 0 && Math.random() > 0.7) return;

        // Генерируем большие значения токенов для достижения > 1 млн
        // Последние 7 дней - более активное использование
        let baseTokens;
        if (i < 7) {
          baseTokens = 15000 + Math.random() * 35000; // 15k-50k токенов
        } else if (i < 14) {
          baseTokens = 10000 + Math.random() * 20000; // 10k-30k токенов
        } else {
          baseTokens = 5000 + Math.random() * 15000;  // 5k-20k токенов
        }

        const messageCount = Math.floor(10 + Math.random() * 40);
        const totalTokens = Math.floor(baseTokens);

        stats.push({
          id: `${dateStr}-${operator}-${model}`,
          date: dateStr,
          operator,
          model,
          totalTokens,
          inputTokens: Math.floor(totalTokens * 0.35),
          outputTokens: Math.floor(totalTokens * 0.65),
          messageCount,
          spent: undefined,
        });
      });
    });
  }

  // Выводим общую статистику для отладки
  const totalTokens = stats.reduce((sum, stat) => sum + stat.totalTokens, 0);
  const totalMessages = stats.reduce((sum, stat) => sum + stat.messageCount, 0);
  console.log('📊 Mock Statistics Generated:', {
    totalRecords: stats.length,
    totalTokens: totalTokens.toLocaleString(),
    totalMessages: totalMessages.toLocaleString(),
    dateRange: `${stats[stats.length - 1]?.date} - ${stats[0]?.date}`,
  });

  return stats;
};

const setupMockOperators = () => {
  useSettingsStore.setState({
    operators: [
      {
        operator: 'anthropic',
        apiKey: 'sk-ant-test-key',
        selectedModel: 'claude-sonnet-4-5',
      },
      {
        operator: 'openai',
        apiKey: 'sk-test-key',
        selectedModel: 'gpt-4o',
      },
      {
        operator: 'gemini',
        apiKey: 'test-gemini-key',
        selectedModel: 'gemini-2.0-flash-exp',
      },
      {
        operator: 'grok',
        apiKey: 'xai-test-key',
        selectedModel: 'grok-2',
      },
      {
        operator: 'openrouter',
        apiKey: 'sk-or-test-key',
        selectedModel: 'deepseek/deepseek-chat',
      },
    ],
  });
};

// Wrapper компонент для инициализации данных
const HistoryWithData = () => {
  // Инициализируем чаты ДО первого рендера
  const [isInitialized, setIsInitialized] = React.useState(false);
  
  useEffect(() => {
    if (isInitialized) return;
    
    // Инициализируем переводы
    initMockTranslations();
    
    // Настраиваем операторов
    setupMockOperators();

    // Настраиваем чаты и сообщения
    const { chats, messages } = setupMockChats();
    
    // Инициализируем пустой массив чатов сначала
    useChatStore.setState({ chats: [] });
    
    // Mock функция для загрузки чатов
    useChatStore.setState({
      loadAllChats: async () => {
        useChatStore.setState({ chats });
      },
    });

    // Mock функция для загрузки сообщений
    useChatStore.setState({
      loadMessages: async (chatId: string) => {
        const chatMessages = messages[chatId] || [];
        useChatStore.setState({ messages: chatMessages });
      },
    });

    // Mock функция для получения статистики
    // Это будет работать через chrome.runtime.sendMessage, но в Storybook мы можем использовать mock
    if (typeof window !== 'undefined') {
      (window as any).chrome = {
        runtime: {
          sendMessage: (message: any, callback: (response: any) => void) => {
            console.log('[Mock Chrome] sendMessage:', message);
            if (message.type === 'GET_STATISTICS') {
              const stats = setupMockStatistics();
              const { startDate, endDate, operator } = message.data;
              
              console.log('[Mock Chrome] Filtering stats:', {
                totalStats: stats.length,
                startDate,
                endDate,
                operator,
              });
              
              // Фильтруем статистику
              const filtered = stats.filter(stat => {
                const dateMatch = stat.date >= startDate && stat.date <= endDate;
                const operatorMatch = !operator || operator === 'all' || stat.operator === operator;
                return dateMatch && operatorMatch;
              });
              
              console.log('[Mock Chrome] Returning filtered stats:', filtered.length);
              
              // Вызываем callback с отфильтрованными данными
              setTimeout(() => callback(filtered), 0);
            } else {
              setTimeout(() => callback(null), 0);
            }
          },
          getURL: (path: string) => {
            // Mock для chrome.runtime.getURL - возвращаем путь к файлам локализации
            return `/${path}`;
          },
        },
        storage: {
          onChanged: {
            addListener: () => {},
            removeListener: () => {},
          },
          sync: {
            get: (_keys: any, callback: (items: any) => void) => {
              callback({ language: 'en' });
            },
          },
          local: {
            get: (_keys: any, callback: (items: any) => void) => {
              callback({});
            },
            set: (_items: any, callback?: () => void) => {
              if (callback) callback();
            },
            remove: (_keys: any, callback?: () => void) => {
              if (callback) callback();
            },
          },
        },
        tabs: {
          query: async () => [{ id: 1, url: 'https://example.com' }],
          update: async () => ({}),
        },
      };
    }

    // Загружаем чаты при монтировании
    useChatStore.getState().loadAllChats();
    
    setIsInitialized(true);
  }, [isInitialized]);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return <History />;
};

const meta: Meta<typeof History> = {
  title: 'Pages/History',
  component: HistoryWithData,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Страница истории с вкладками "Чаты" и "Статистика". Отображает историю диалогов и аналитику использования AI операторов.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Основная история с тестовыми данными
export const Default: Story = {
  render: () => <HistoryWithData />,
};

// История с пустыми данными
export const EmptyHistory: Story = {
  render: () => {
    const EmptyHistoryComponent = () => {
      const [isInitialized, setIsInitialized] = React.useState(false);
      
      useEffect(() => {
        if (isInitialized) return;
        
        initMockTranslations();
        setupMockOperators();
        
        // Пустые чаты - инициализируем массив
        useChatStore.setState({ chats: [] });
        
        useChatStore.setState({
          loadAllChats: async () => {
            useChatStore.setState({ chats: [] });
          },
        });

      // Mock для пустой статистики
      if (typeof window !== 'undefined') {
        (window as any).chrome = {
          runtime: {
            sendMessage: (message: any, callback: (response: any) => void) => {
              console.log('[Mock Chrome EmptyHistory] sendMessage:', message);
              if (message.type === 'GET_STATISTICS') {
                setTimeout(() => callback([]), 0);
              } else {
                setTimeout(() => callback(null), 0);
              }
            },
            getURL: (path: string) => `/${path}`,
          },
          storage: {
            onChanged: {
              addListener: () => {},
              removeListener: () => {},
            },
            sync: {
              get: (_keys: any, callback: (items: any) => void) => {
                callback({ language: 'en' });
              },
            },
            local: {
              get: (_keys: any, callback: (items: any) => void) => {
                callback({});
              },
              set: (_items: any, callback?: () => void) => {
                if (callback) callback();
              },
              remove: (_keys: any, callback?: () => void) => {
                if (callback) callback();
              },
            },
          },
        };
      }

      useChatStore.getState().loadAllChats();
      
      setIsInitialized(true);
    }, [isInitialized]);

    if (!isInitialized) {
      return <div>Loading...</div>;
    }

    return <History />;
  };

  return <EmptyHistoryComponent />;
  },
};

// История только с чатами (без статистики)
export const OnlyChats: Story = {
  render: () => {
    const OnlyChatsComponent = () => {
      const [isInitialized, setIsInitialized] = React.useState(false);
      
      useEffect(() => {
        if (isInitialized) return;
        
        initMockTranslations();
        setupMockOperators();
        
        const { chats, messages } = setupMockChats();
        
        // Инициализируем пустой массив сначала
        useChatStore.setState({ chats: [] });
        
        useChatStore.setState({
          loadAllChats: async () => {
            useChatStore.setState({ chats });
          },
          loadMessages: async (chatId: string) => {
            const chatMessages = messages[chatId] || [];
            useChatStore.setState({ messages: chatMessages });
          },
        });

      // Пустая статистика
      if (typeof window !== 'undefined') {
        (window as any).chrome = {
          runtime: {
            sendMessage: (message: any, callback: (response: any) => void) => {
              console.log('[Mock Chrome OnlyChats] sendMessage:', message);
              if (message.type === 'GET_STATISTICS') {
                setTimeout(() => callback([]), 0);
              } else {
                setTimeout(() => callback(null), 0);
              }
            },
            getURL: (path: string) => `/${path}`,
          },
          storage: {
            onChanged: {
              addListener: () => {},
              removeListener: () => {},
            },
            sync: {
              get: (_keys: any, callback: (items: any) => void) => {
                callback({ language: 'en' });
              },
            },
            local: {
              get: (_keys: any, callback: (items: any) => void) => {
                callback({});
              },
              set: (_items: any, callback?: () => void) => {
                if (callback) callback();
              },
              remove: (_keys: any, callback?: () => void) => {
                if (callback) callback();
              },
            },
          },
          tabs: {
            query: async () => [{ id: 1, url: 'https://example.com' }],
            update: async () => ({}),
          },
        };
      }

      useChatStore.getState().loadAllChats();
      
      setIsInitialized(true);
    }, [isInitialized]);

    if (!isInitialized) {
      return <div>Loading...</div>;
    }

    return <History />;
  };

  return <OnlyChatsComponent />;
  },
};

// История с большим количеством чатов
export const ManyChats: Story = {
  render: () => {
    const ManyChatsComponent = () => {
      const [isInitialized, setIsInitialized] = React.useState(false);
      
      useEffect(() => {
        if (isInitialized) return;
        
        initMockTranslations();
        setupMockOperators();
        
        // Текущая дата: 11.11.2025
        const now = new Date('2025-11-11T12:00:00').getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        
        // Генерируем 50 чатов
        const manyChats: Chat[] = Array.from({ length: 50 }, (_, i) => ({
          id: `chat_${i}`,
          title: `Тестовый чат ${i + 1}: ${['React', 'TypeScript', 'Next.js', 'Tailwind', 'Node.js'][i % 5]}`,
          site: ['stackoverflow.com', 'github.com', 'medium.com', 'dev.to', 'reddit.com'][i % 5],
          createdAt: now - oneDay * Math.floor(i / 2),
          updatedAt: now - oneDay * Math.floor(i / 2),
        }));

        const manyMessages: Record<string, ChatMessage[]> = {};
        manyChats.forEach((chat, index) => {
          const operators: AIOperator[] = ['anthropic', 'openai', 'gemini', 'grok'];
          const usedOperator = operators[index % operators.length];
          
          manyMessages[chat.id] = [
            {
              id: `${chat.id}_msg_1`,
              chatId: chat.id,
              isUser: true,
              text: `Вопрос ${index + 1}`,
              createdAt: chat.createdAt,
              tokens: 0,
            },
            {
              id: `${chat.id}_msg_2`,
              chatId: chat.id,
              isUser: false,
              text: `Ответ ${index + 1}`,
              createdAt: chat.createdAt + 1000,
              operator: usedOperator,
              model: 'test-model',
              tokens: 300,
            },
          ];
        });

        // Инициализируем пустой массив сначала
        useChatStore.setState({ chats: [] });

        useChatStore.setState({
          loadAllChats: async () => {
            useChatStore.setState({ chats: manyChats });
          },
          loadMessages: async (chatId: string) => {
            const chatMessages = manyMessages[chatId] || [];
            useChatStore.setState({ messages: chatMessages });
          },
        });

      if (typeof window !== 'undefined') {
        (window as any).chrome = {
          runtime: {
            sendMessage: (message: any, callback: (response: any) => void) => {
              console.log('[Mock Chrome ManyChats] sendMessage:', message);
              if (message.type === 'GET_STATISTICS') {
                const stats = setupMockStatistics();
                setTimeout(() => callback(stats), 0);
              } else {
                setTimeout(() => callback(null), 0);
              }
            },
            getURL: (path: string) => `/${path}`,
          },
          storage: {
            onChanged: {
              addListener: () => {},
              removeListener: () => {},
            },
            sync: {
              get: (_keys: any, callback: (items: any) => void) => {
                callback({ language: 'en' });
              },
            },
            local: {
              get: (_keys: any, callback: (items: any) => void) => {
                callback({});
              },
              set: (_items: any, callback?: () => void) => {
                if (callback) callback();
              },
              remove: (_keys: any, callback?: () => void) => {
                if (callback) callback();
              },
            },
          },
          tabs: {
            query: async () => [{ id: 1, url: 'https://example.com' }],
            update: async () => ({}),
          },
        };
      }

      useChatStore.getState().loadAllChats();
      
      setIsInitialized(true);
    }, [isInitialized]);

    if (!isInitialized) {
      return <div>Loading...</div>;
    }

    return <History />;
  };

  return <ManyChatsComponent />;
  },
};

