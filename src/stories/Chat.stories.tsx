import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import '../ui/styles/globals.css';

type AIOperator = 'anthropic' | 'openai' | 'grok' | 'gemini' | 'openrouter' | 'lmstudio';

// Mock Chat Components (simplified versions)
const ChatHeader = () => {
  return (
    <div className="border-b p-4 bg-card flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-500"></div>
        <span className="font-medium">Chat Demo</span>
      </div>
      <div className="flex items-center gap-2">
        <select className="px-3 py-1.5 rounded-md border bg-background text-sm">
          <option>Claude Sonnet 4.5</option>
          <option>GPT-4o</option>
          <option>Gemini Pro 1.5</option>
        </select>
      </div>
    </div>
  );
};

interface Message {
  id: string;
  isUser: boolean;
  text: string;
  operator?: AIOperator;
  model?: string;
  citations?: Array<{ title: string; url: string; snippet: string }>;
  suggestedQuestions?: string[];
}

const MessageList = ({ messages }: { messages: Message[] }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <p className="text-lg">Начните новый диалог</p>
          <p className="text-sm">Введите сообщение ниже</p>
        </div>
      )}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-4 ${
              msg.isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            <div className="whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none">
              {msg.text}
            </div>
            
            {msg.citations && msg.citations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs font-medium mb-2 opacity-70">Источники:</p>
                <div className="flex flex-wrap gap-2">
                  {msg.citations.map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-background/50 hover:bg-background text-xs"
                    >
                      <span>{idx + 1}</span>
                      <span className="max-w-[200px] truncate">{citation.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="text-xs font-medium mb-2 opacity-70">Похожие вопросы:</p>
                <div className="space-y-1">
                  {msg.suggestedQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      className="block w-full text-left px-3 py-2 rounded-md bg-background/50 hover:bg-background text-xs"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const MessageInput = ({ onSend }: { onSend: (text: string) => void }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  return (
    <div className="border-t p-4 bg-card">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Введите сообщение..."
          className="flex-1 px-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="px-6 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Отправить
        </button>
      </form>
    </div>
  );
};

// Main Chat Component
const ChatComponent = ({ initialMessages = [] }: { initialMessages?: Message[] }) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const handleSend = (text: string) => {
    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      isUser: true,
      text
    };
    setMessages([...messages, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: `msg_${Date.now()}_ai`,
        isUser: false,
        text: `Это демонстрационный ответ на ваше сообщение: "${text}"`,
        operator: 'anthropic' as AIOperator,
        model: 'claude-sonnet-4-5'
      };
      setMessages((prev) => [...prev, aiMessage]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      <MessageList messages={messages} />
      <MessageInput onSend={handleSend} />
    </div>
  );
};

const meta = {
  title: 'Components/Chat',
  component: ChatComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Полноценный компонент чата с поддержкой сообщений, веб-поиска, контекста страницы и различных AI провайдеров.'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof ChatComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default chat view
export const Default: Story = {
  args: {
    initialMessages: [
      {
        id: 'msg_1',
        isUser: true,
        text: 'Привет! Расскажи мне о React и TypeScript.'
      },
      {
        id: 'msg_2',
        isUser: false,
        operator: 'anthropic' as AIOperator,
        model: 'claude-sonnet-4-5',
        text: `# React и TypeScript

**React** — это JavaScript библиотека для создания пользовательских интерфейсов, разработанная Facebook.

**TypeScript** — это типизированный надмножество JavaScript, которое компилируется в обычный JavaScript.

## Преимущества использования вместе:

1. **Статическая типизация** — помогает выявлять ошибки на этапе разработки
2. **Автодополнение** — улучшенная поддержка в IDE
3. **Рефакторинг** — безопасное переименование и изменение кода
4. **Документация** — типы служат документацией для компонентов`,
        suggestedQuestions: [
          'Как настроить TypeScript для React проекта?',
          'Какие типы React хуков существуют?',
          'Как типизировать пропсы компонента?'
        ]
      }
    ]
  }
};

// Empty chat
export const EmptyChat: Story = {
  args: {
    initialMessages: []
  }
};

// Chat with web search results
export const WithWebSearch: Story = {
  args: {
    initialMessages: [
      {
        id: 'msg_search_1',
        isUser: true,
        text: 'Какие последние новости о TypeScript?'
      },
      {
        id: 'msg_search_2',
        isUser: false,
        operator: 'openai' as AIOperator,
        model: 'gpt-4o-mini-search-preview',
        text: `На основе последних новостей:

**TypeScript 5.7** был недавно выпущен с несколькими важными улучшениями:

1. **Path Rewriting для Decorators** - новые возможности для декораторов
2. **Улучшенная поддержка Node.js ESM** - лучшая интеграция с модулями ES
3. **Performance Improvements** - ускорение компиляции на 10-15%

Также Microsoft анонсировала улучшенную интеграцию с VS Code и новые возможности для типизации.`,
        citations: [
          {
            title: 'TypeScript 5.7 Release Notes',
            url: 'https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/',
            snippet: 'TypeScript 5.7 brings several new features...'
          },
          {
            title: 'What\'s New in TypeScript',
            url: 'https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html',
            snippet: 'The latest release includes performance improvements...'
          }
        ]
      }
    ]
  }
};

// Chat with long conversation
export const LongConversation: Story = {
  args: {
    initialMessages: [
      {
        id: 'msg_1',
        isUser: true,
        text: 'Что такое React hooks?'
      },
      {
        id: 'msg_2',
        isUser: false,
        text: 'React Hooks — это функции, которые позволяют использовать состояние и другие возможности React без написания классов.'
      },
      {
        id: 'msg_3',
        isUser: true,
        text: 'Какие основные хуки существуют?'
      },
      {
        id: 'msg_4',
        isUser: false,
        text: 'Основные хуки: useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef.'
      },
      {
        id: 'msg_5',
        isUser: true,
        text: 'Расскажи подробнее про useState'
      },
      {
        id: 'msg_6',
        isUser: false,
        text: 'useState — это хук для добавления состояния в функциональные компоненты. Он возвращает массив из двух элементов: текущее значение состояния и функцию для его обновления.'
      }
    ]
  }
};


