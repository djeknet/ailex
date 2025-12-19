import type { Meta, StoryObj } from '@storybook/react';
import WebSearchSettingsDialog from './WebSearchSettingsDialog';
import { AIOperator } from '@shared/types/ai';

const meta: Meta<typeof WebSearchSettingsDialog> = {
  title: 'Chat/WebSearchSettingsDialog',
  component: WebSearchSettingsDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WebSearchSettingsDialog>;

// Claude (Anthropic) настройки
export const ClaudeSettings: Story = {
  args: {
    open: true,
    operator: 'anthropic' as AIOperator,
    onOpenChange: () => {},
  },
};

// OpenAI настройки (Coming Soon)
export const OpenAISettings: Story = {
  args: {
    open: true,
    operator: 'openai' as AIOperator,
    onOpenChange: () => {},
  },
};

// Gemini настройки (Coming Soon)
export const GeminiSettings: Story = {
  args: {
    open: true,
    operator: 'gemini' as AIOperator,
    onOpenChange: () => {},
  },
};

// Grok настройки (Coming Soon)
export const GrokSettings: Story = {
  args: {
    open: true,
    operator: 'grok' as AIOperator,
    onOpenChange: () => {},
  },
};








