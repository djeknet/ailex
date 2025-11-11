import type { Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';
import ChatHeader from '@/ui/components/chat/ChatHeader';
import MessageList from '@/ui/components/chat/MessageList';
import MessageInput from '@/ui/components/chat/MessageInput';
import { useChatStore } from '@shared/stores/chatStore';
import { useSettingsStore } from '@shared/stores/settingsStore';
import '../ui/styles/globals.css';

// Wrapper component for the real chat UI
const RealChatComponent = () => {
  const chatStore = useChatStore();

  useEffect(() => {
    // Add mock messages
    const mockMessages = [
      {
        id: 'msg_1',
        createdAt: Date.now() - 3600000,
        chatId: 'chat_mock',
        isUser: true,
        text: 'Привет! Расскажи мне о React и TypeScript.',
        tokens: 50
      },
      {
        id: 'msg_2',
        createdAt: Date.now() - 3500000,
        chatId: 'chat_mock',
        isUser: false,
        operator: 'anthropic' as any,
        model: 'claude-sonnet-4-5-20250929',
        text: `# React и TypeScript

**React** — это JavaScript библиотека для создания пользовательских интерфейсов, разработанная Facebook.

**TypeScript** — это типизированный надмножество JavaScript, которое компилируется в обычный JavaScript.

## Преимущества использования вместе:

1. **Статическая типизация** — помогает выявлять ошибки на этапе разработки
2. **Автодополнение** — улучшенная поддержка в IDE
3. **Рефакторинг** — безопасное переименование и изменение кода
4. **Документация** — типы служат документацией для компонентов

### Пример компонента:

\`\`\`typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, onClick, disabled }) => {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
};
\`\`\`

Это делает код более надёжным и поддерживаемым! 🚀`,
        tokens: 250,
        suggestedQuestions: [
          'Как настроить TypeScript для React проекта?',
          'Какие типы React хуков существуют?',
          'Как типизировать пропсы компонента?'
        ]
      },
      {
        id: 'msg_3',
        createdAt: Date.now() - 3400000,
        chatId: 'chat_mock',
        isUser: true,
        text: 'А можешь показать пример с хуками?',
        tokens: 30
      },
      {
        id: 'msg_4',
        createdAt: Date.now() - 3300000,
        chatId: 'chat_mock',
        isUser: false,
        operator: 'anthropic' as any,
        model: 'claude-sonnet-4-5-20250929',
        text: `Конечно! Вот пример компонента с хуками:

\`\`\`typescript
import { useState, useEffect } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/user');
        const data: User = await response.json();
        setUser(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>No user found</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
};
\`\`\`

**Основные хуки с типами:**

- \`useState<T>\` — для состояния
- \`useEffect\` — для побочных эффектов
- \`useRef<T>\` — для ссылок на DOM элементы
- \`useCallback<T>\` — для мемоизации функций
- \`useMemo<T>\` — для мемоизации значений`,
        tokens: 350
      }
    ];

    // Add messages to store
    mockMessages.forEach(msg => {
      chatStore.addMessage(msg);
    });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <ChatHeader />
      <MessageList />
      <MessageInput />
    </div>
  );
};

const meta = {
  title: 'Real Components/Chat',
  component: RealChatComponent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Настоящий UI чата из расширения с реальными компонентами и stores (с моками для Storybook)'
      }
    }
  },
  tags: ['autodocs']
} satisfies Meta<typeof RealChatComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default view with real components
export const Default: Story = {};

// Empty chat with real components
export const EmptyChat: Story = {
  render: () => {
    return (
      <div className="flex flex-col h-screen bg-background">
        <ChatHeader />
        <MessageList />
        <MessageInput />
      </div>
    );
  }
};

// Chat with web search
export const WithWebSearch: Story = {
  render: () => {
    const chatStore = useChatStore();

    useEffect(() => {
      const mockMessages = [
        {
          id: 'msg_search_1',
          createdAt: Date.now() - 60000,
          chatId: 'chat_mock',
          isUser: true,
          text: 'Какие последние новости о TypeScript?',
          tokens: 30,
          webSearch: true
        },
        {
          id: 'msg_search_2',
          createdAt: Date.now() - 50000,
          chatId: 'chat_mock',
          isUser: false,
          operator: 'openai' as any,
          model: 'gpt-4o-mini-search-preview',
          text: `На основе последних новостей:

**TypeScript 5.7** был недавно выпущен с несколькими важными улучшениями:

1. **Path Rewriting для Decorators** - новые возможности для декораторов
2. **Улучшенная поддержка Node.js ESM** - лучшая интеграция с модулями ES
3. **Performance Improvements** - ускорение компиляции на 10-15%`,
          tokens: 200,
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
      ];

      mockMessages.forEach(msg => {
        chatStore.addMessage(msg);
      });
    }, []);

    return (
      <div className="flex flex-col h-screen bg-background">
        <ChatHeader />
        <MessageList />
        <MessageInput />
      </div>
    );
  }
};

