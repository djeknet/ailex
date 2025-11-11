import type { Meta, StoryObj } from '@storybook/react';
import ApiLogsPanel from './ApiLogsPanel';

const meta: Meta<typeof ApiLogsPanel> = {
  title: 'Developer/ApiLogsPanel',
  component: ApiLogsPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Панель логирования API запросов для режима разработчика. Отображает все HTTP запросы к AI провайдерам с возможностью просмотра деталей и копирования данных.'
      }
    }
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: '#0a0a0a'
      }}>
        <div style={{ 
          flex: 1, 
          padding: '20px',
          color: 'white'
        }}>
          <h1 style={{ marginBottom: '20px' }}>Chat Interface</h1>
          <div style={{ 
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <p>Это основной интерфейс чата. Панель логов API находится внизу.</p>
            <p style={{ marginTop: '10px', color: '#888' }}>
              Откройте панель логов, нажав на заголовок внизу экрана.
            </p>
          </div>
        </div>
        <Story />
      </div>
    )
  ]
};

export default meta;
type Story = StoryObj<typeof ApiLogsPanel>;

/**
 * Панель с несколькими логами запросов к разным AI провайдерам.
 * Mock данные включают успешные и неуспешные запросы к OpenAI, Anthropic и Grok.
 */
export const WithLogs: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Панель с логами успешных и неуспешных запросов к OpenAI, Anthropic и Grok. Раскройте панель, чтобы увидеть логи.'
      }
    }
  }
};

/**
 * Панель без логов (пустое состояние).
 * Отображается когда еще не было сделано ни одного API запроса.
 */
export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Пустое состояние панели, когда еще не было сделано ни одного API запроса.'
      }
    }
  },
  beforeEach: () => {
    // Override mock to return empty array for this story
    const originalSendMessage = (window as any).chrome.runtime.sendMessage;
    (window as any).chrome.runtime.sendMessage = async (message: any, callback?: any) => {
      if (message.type === 'GET_API_LOGS') {
        if (callback) callback([]);
        return Promise.resolve([]);
      }
      return originalSendMessage(message, callback);
    };
  }
};


