import type { Meta, StoryObj } from '@storybook/react';
import SuggestedQuestions from './SuggestedQuestions';

const meta: Meta<typeof SuggestedQuestions> = {
  title: 'Chat/SuggestedQuestions',
  component: SuggestedQuestions,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SuggestedQuestions>;

// Базовые вопросы
export const Default: Story = {
  args: {
    questions: [
      'Какие основные типы искусственного интеллекта существуют?',
      'Как машинное обучение связано с ИИ?',
      'Какие практические применения ИИ наиболее распространены сегодня?',
    ],
    onQuestionClick: (question) => console.log('Clicked:', question),
    isLoading: false,
  },
};

// Состояние загрузки
export const Loading: Story = {
  args: {
    questions: [
      'Какие основные типы искусственного интеллекта существуют?',
      'Как машинное обучение связано с ИИ?',
    ],
    onQuestionClick: (question) => console.log('Clicked:', question),
    isLoading: true,
  },
};

// Генерация вопросов
export const Generating: Story = {
  args: {
    questions: [],
    onQuestionClick: (question) => console.log('Clicked:', question),
    isLoading: false,
    isGenerating: true,
  },
};

// Пустой список (нет вопросов)
export const Empty: Story = {
  args: {
    questions: [],
    onQuestionClick: (question) => console.log('Clicked:', question),
    isLoading: false,
  },
};

// Длинные вопросы
export const LongQuestions: Story = {
  args: {
    questions: [
      'Можете ли вы объяснить, как работают нейронные сети и какие основные архитектуры используются в современных системах глубокого обучения?',
      'Какие этические проблемы возникают при разработке и применении искусственного интеллекта в различных областях человеческой деятельности?',
      'Расскажите подробнее о различиях между supervised, unsupervised и reinforcement learning подходами в машинном обучении',
    ],
    onQuestionClick: (question) => console.log('Clicked:', question),
    isLoading: false,
  },
};

// Много вопросов
export const ManyQuestions: Story = {
  args: {
    questions: [
      'Что такое искусственный интеллект?',
      'Как работает машинное обучение?',
      'Что такое нейронные сети?',
      'Какие есть типы ИИ?',
      'Что такое GPT?',
      'Как работает ChatGPT?',
    ],
    onQuestionClick: (question) => console.log('Clicked:', question),
    isLoading: false,
  },
};





