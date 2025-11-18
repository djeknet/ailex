import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '@/ui/components/ui/card';

// Chat Loader Component
const ChatLoader = () => {
  return (
    <div className="p-4">
      <div className="flex gap-1">
        <div 
          className="w-2 h-2 bg-primary rounded-full animate-bounce" 
          style={{ animationDelay: '0ms' }}
        />
        <div 
          className="w-2 h-2 bg-primary rounded-full animate-bounce" 
          style={{ animationDelay: '150ms' }}
        />
        <div 
          className="w-2 h-2 bg-primary rounded-full animate-bounce" 
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
};

// Chat Message Component for demo
const ChatMessage = ({ text, isUser }: { text: string; isUser: boolean }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        }`}
      >
        {text}
      </div>
    </div>
  );
};

// Chat Container Component
const ChatDemo = ({ showLoader = false }: { showLoader?: boolean }) => {
  return (
    <Card className="w-full max-w-2xl mx-auto p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">Chat Demo</h3>
        
        {/* Sample messages */}
        <ChatMessage 
          text="Привет! Можешь помочь мне с этой задачей?" 
          isUser={true} 
        />
        
        <ChatMessage 
          text="Конечно, помогу! Что именно вас интересует?" 
          isUser={false} 
        />
        
        <ChatMessage 
          text="Нужно собрать контакты со страницы" 
          isUser={true} 
        />
        
        {/* Loader */}
        {showLoader && (
          <div className="flex justify-start">
            <ChatLoader />
          </div>
        )}
      </div>
    </Card>
  );
};

// Storybook Meta
const meta: Meta<typeof ChatDemo> = {
  title: 'Chat/Loader',
  component: ChatDemo,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Loading indicator that appears in chat while AI is processing the request. Shows three bouncing dots with staggered animation.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ChatDemo>;

// Stories

export const Loading: Story = {
  args: {
    showLoader: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chat with active loading state - AI is processing the message.',
      },
    },
  },
};

export const NoLoading: Story = {
  args: {
    showLoader: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Chat without loading state - normal conversation flow.',
      },
    },
  },
};

export const LoaderOnly: Story = {
  render: () => (
    <div className="w-full max-w-md mx-auto p-8">
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">
          Loader Component
        </h3>
        <ChatLoader />
        
        <div className="mt-8 space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>Animation Details:</strong>
          </p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>3 dots with bounce animation</li>
            <li>Staggered delays: 0ms, 150ms, 300ms</li>
            <li>Size: 8px × 8px (w-2 h-2)</li>
            <li>Color: primary theme color</li>
            <li>No background - transparent</li>
          </ul>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Isolated loader component showing the animation details.',
      },
    },
  },
};

export const WithToolExecution: Story = {
  render: () => (
    <Card className="w-full max-w-2xl mx-auto p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">Chat with Tool Execution</h3>
        
        <ChatMessage 
          text="/contacts - собери контакты" 
          isUser={true} 
        />
        
        {/* Tool execution display mock */}
        <div className="bg-accent/50 border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">🔧 Выполняется: collect-contacts</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Извлекаю контакты со страницы...
          </div>
        </div>
        
        {/* Loader below tool execution */}
        <div className="flex justify-start">
          <ChatLoader />
        </div>
      </div>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Chat showing loader along with tool execution display - typical workflow when AI uses tools.',
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    showLoader: true,
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
    docs: {
      description: {
        story: 'Loader appearance in dark mode.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="dark">
        <Story />
      </div>
    ),
  ],
};

