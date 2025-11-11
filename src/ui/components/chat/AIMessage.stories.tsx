import type { Meta, StoryObj } from '@storybook/react';
import AIMessage from './AIMessage';
import { ChatMessage } from '@shared/types/database';
import { AIOperator } from '@shared/types/ai';

const meta: Meta<typeof AIMessage> = {
  title: 'Chat/AIMessage',
  component: AIMessage,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  // Provide default values for all callback props to prevent errors
  args: {
    branches: [],
    hasBranches: false,
    activeBranchIndex: 0,
    isCopied: false,
    isComparing: false,
    onCopy: () => console.log('Copy clicked'),
    onRewrite: () => console.log('Rewrite clicked'),
    onCompare: () => console.log('Compare clicked'),
    onBranchChange: () => console.log('Branch changed'),
    onQuestionClick: () => console.log('Question clicked'),
    operators: [],
    isLoading: false,
    generatingQuestionsForMessage: null,
  },
};

export default meta;
type Story = StoryObj<typeof AIMessage>;

// Базовое сообщение без цитат
export const Basic: Story = {
  args: {
    message: {
      id: 'msg_1',
      chatId: 'chat_1',
      role: 'assistant',
      text: 'Это обычный ответ без цитат. Искусственный интеллект может помочь вам с различными задачами.',
      createdAt: Date.now(),
      operator: 'anthropic' as AIOperator,
      model: 'claude-sonnet-4-5',
    } as ChatMessage,
  },
};

// Сообщение с несколькими цитатами
export const WithCitations: Story = {
  args: {
    message: {
      id: 'msg_2',
      chatId: 'chat_1',
      role: 'assistant',
      text: 'Вот 5 главных новостей на сегодня:\n\n1. **Массированная атака на Украину**: Россия нанесла одну из самых масштабных атак с начала СВО\n2. **Отключения электроэнергии**: В Харькове после ракетного удара город временно остался без света\n3. **Атака дронов на территорию России**: Средства ПВО уничтожили 79 украинских дронов\n4. **Ситуация на фронте**: С начала прошедших суток произошло 181 боевое столкновение\n5. **Политика**: США исключили из санкционного списка президента переходного периода Сирии',
      createdAt: Date.now(),
      operator: 'anthropic' as AIOperator,
      model: 'claude-sonnet-4-5-20250929',
      citations: [
        {
          url: 'https://lenta.ru/news/2025/11/08/attack/',
          title: 'Массированная атака на Украину - Lenta.ru',
          cited_text: 'Россия нанесла одну из самых масштабных атак с начала СВО, целями стали электрическая генерация, газовые месторождения.',
        },
        {
          url: 'https://ria.ru/20251108/ukraine-12345.html',
          title: 'РИА Новости - Отключения электроэнергии на Украине',
          cited_text: 'В Харькове и области после ракетного удара город временно остался без света, приостановлена работа лифтового хозяйства.',
        },
        {
          url: 'https://tass.ru/politika/2025-11-08',
          title: 'ТАСС: Атака дронов на территорию России',
          cited_text: 'Средства ПВО уничтожили 79 украинских дронов, больше всего беспилотников уничтожено в небе над Ростовской областью.',
        },
        {
          url: 'https://interfax.ru/russia/front-situation',
          title: 'Интерфакс: Ситуация на фронте',
          cited_text: 'С начала прошедших суток произошло 181 боевое столкновение на фронте, российские захватчики нанесли один ракетный удар.',
        },
        {
          url: 'https://rbc.ru/politics/syria-sanctions',
          title: 'РБК: США сняли санкции с лидера Сирии',
          cited_text: 'США исключили из санкционного списка президента переходного периода Сирии Ахмеда аш-Шараа в преддверии его встречи с Дональдом Трампом.',
        },
      ],
    } as ChatMessage,
  },
};

// Сообщение с множеством цитат (20+)
export const WithManyCitations: Story = {
  args: {
    message: {
      id: 'msg_3',
      chatId: 'chat_1',
      role: 'assistant',
      text: 'Вот подробный анализ текущей ситуации на основе множества источников из различных новостных агентств и аналитических платформ. Информация собрана из 20 различных источников для максимальной объективности.',
      createdAt: Date.now(),
      operator: 'anthropic' as AIOperator,
      model: 'claude-sonnet-4-5',
      citations: Array.from({ length: 20 }, (_, i) => ({
        url: `https://example${i + 1}.com/article/${Date.now()}`,
        title: `Источник ${i + 1}: ${['Lenta.ru', 'РИА Новости', 'ТАСС', 'Интерфакс', 'РБК', 'Коммерсантъ', 'Ведомости', 'Известия', 'Forbes', 'BBC'][i % 10]}`,
        cited_text: `Это детальная цитата из источника номер ${i + 1}, содержащая важную информацию о текущих событиях и их анализе.`,
      })),
    } as ChatMessage,
  },
};

// Сообщение с длинным markdown ответом
export const WithMarkdown: Story = {
  args: {
    message: {
      id: 'msg_4',
      chatId: 'chat_1',
      role: 'assistant',
      text: `# Подробный ответ с форматированием

Вот пример ответа с различным markdown форматированием:

## Списки

### Нумерованный список:
1. Первый пункт
2. Второй пункт
3. Третий пункт

### Маркированный список:
- Пункт A
- Пункт B
- Пункт C

## Код

Inline код: \`console.log("Hello")\`

Блок кода:
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

## Цитаты

> Это цитата из важного источника

## Таблица

| Колонка 1 | Колонка 2 | Колонка 3 |
|-----------|-----------|-----------|
| Данные 1  | Данные 2  | Данные 3  |
| Данные 4  | Данные 5  | Данные 6  |

**Жирный текст** и *курсив*`,
      createdAt: Date.now(),
      operator: 'anthropic' as AIOperator,
      model: 'claude-sonnet-4-5',
      citations: [
        {
          url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
          title: 'MDN Web Docs: JavaScript',
          cited_text: 'JavaScript is a programming language that is one of the core technologies of the World Wide Web.',
        },
      ],
    } as ChatMessage,
  },
};

// Сообщение с branches (альтернативными ответами)
export const WithBranches: Story = {
  args: {
    message: {
      id: 'msg_5',
      chatId: 'chat_1',
      role: 'assistant',
      text: 'Основной ответ от Claude Sonnet. Это первая версия ответа на ваш вопрос.',
      createdAt: Date.now(),
      operator: 'anthropic' as AIOperator,
      model: 'claude-sonnet-4-5',
      branches: [
        {
          id: 'branch_1',
          text: 'Альтернативный ответ от GPT-4. Это вторая версия ответа, сгенерированная другой моделью с немного другим подходом.',
          operator: 'openai' as AIOperator,
          model: 'gpt-4',
          citations: [
            {
              url: 'https://openai.com/research',
              title: 'OpenAI Research',
              cited_text: 'Исследование от OpenAI о возможностях больших языковых моделей.',
            },
          ],
        },
        {
          id: 'branch_2',
          text: 'Третий вариант ответа от Gemini Pro. Каждая модель имеет свой уникальный стиль и подход к ответу.',
          operator: 'gemini' as AIOperator,
          model: 'gemini-pro',
        },
      ],
    } as ChatMessage,
  },
};

// Сообщение с suggested questions
export const WithSuggestedQuestions: Story = {
  args: {
    message: {
      id: 'msg_6',
      chatId: 'chat_1',
      role: 'assistant',
      text: 'Искусственный интеллект - это область компьютерных наук, занимающаяся созданием интеллектуальных машин, способных выполнять задачи, которые обычно требуют человеческого интеллекта.',
      createdAt: Date.now(),
      operator: 'anthropic' as AIOperator,
      model: 'claude-sonnet-4-5',
      suggestedQuestions: [
        'Какие основные типы искусственного интеллекта существуют?',
        'Как машинное обучение связано с ИИ?',
        'Какие практические применения ИИ наиболее распространены сегодня?',
      ],
    } as ChatMessage,
  },
};

// Комбинация: citations + branches + suggested questions
export const ComplexMessage: Story = {
  args: {
    message: {
      id: 'msg_7',
      chatId: 'chat_1',
      role: 'assistant',
      text: '# Комплексный ответ\n\nЭто сложный пример сообщения, который включает в себя:\n- Цитаты из веб-поиска\n- Альтернативные ответы от разных моделей\n- Предложенные вопросы\n\n## Детали\n\nВсе эти элементы работают вместе для создания богатого пользовательского опыта.',
      createdAt: Date.now(),
      operator: 'anthropic' as AIOperator,
      model: 'claude-sonnet-4-5',
      citations: [
        { url: 'https://source1.com', title: 'Source 1', cited_text: 'Citation 1' },
        { url: 'https://source2.com', title: 'Source 2', cited_text: 'Citation 2' },
      ],
      branches: [
        {
          id: 'branch_1',
          text: 'Альтернативный ответ',
          operator: 'openai' as AIOperator,
          model: 'gpt-4',
        },
      ],
      suggestedQuestions: [
        'Расскажи подробнее о первом пункте',
        'Какие есть альтернативы?',
      ],
    } as ChatMessage,
  },
};

// Branches с citations (тест для веб-поиска)
export const BranchesWithCitations: Story = {
  args: {
    message: {
      id: 'msg_8',
      chatId: 'chat_1',
      role: 'assistant',
      text: 'Вот топ-5 новостей за сегодня, согласно Claude:\n\n1. Важное событие в политике\n2. Технологический прорыв\n3. Экономические новости\n4. Спортивное достижение\n5. Культурное событие',
      createdAt: Date.now(),
      operator: 'anthropic' as AIOperator,
      model: 'claude-sonnet-4-5',
      citations: [
        {
          url: 'https://www.reuters.com/world/politics/breaking-news-2025',
          title: 'Reuters: Breaking Political News',
          cited_text: 'Important political development that impacts global affairs.',
        },
        {
          url: 'https://techcrunch.com/ai-breakthrough-2025',
          title: 'TechCrunch: AI Breakthrough',
          cited_text: 'Revolutionary AI technology announced by major tech company.',
        },
        {
          url: 'https://bloomberg.com/markets/economy-update',
          title: 'Bloomberg: Economy Update',
          cited_text: 'Global markets respond to recent economic indicators.',
        },
      ],
      branches: [
        {
          id: 'branch_gpt',
          text: 'Вот топ-5 новостей за сегодня, согласно GPT-4:\n\n1. Прорыв в медицинских исследованиях\n2. Климатические инициативы\n3. Космические достижения\n4. Образовательные реформы\n5. Культурный фестиваль',
          operator: 'openai' as AIOperator,
          model: 'gpt-4o',
          citations: [
            {
              url: 'https://www.nature.com/medical-breakthrough',
              title: 'Nature: Medical Breakthrough',
              cited_text: 'Scientists discover new treatment method for chronic disease.',
            },
            {
              url: 'https://www.theguardian.com/environment/climate-action',
              title: 'The Guardian: Climate Action',
              cited_text: 'New international agreement on carbon emissions reduction.',
            },
            {
              url: 'https://www.nasa.gov/mission-success',
              title: 'NASA: Mission Success',
              cited_text: 'Space mission achieves historic milestone in exploration.',
            },
          ],
        },
        {
          id: 'branch_gemini',
          text: 'Вот топ-5 новостей за сегодня, согласно Gemini:\n\n1. Инновации в энергетике\n2. Международные отношения\n3. Технологическая безопасность\n4. Социальные инициативы\n5. Научные открытия',
          operator: 'gemini' as AIOperator,
          model: 'gemini-2.5',
          citations: [
            {
              url: 'https://www.scientificamerican.com/energy-innovation',
              title: 'Scientific American: Energy Innovation',
              cited_text: 'New renewable energy technology promises cleaner future.',
            },
            {
              url: 'https://www.bbc.com/news/world',
              title: 'BBC News: World Affairs',
              cited_text: 'Major diplomatic breakthrough in international relations.',
            },
          ],
        },
      ],
    } as ChatMessage,
    hasBranches: true,
    branches: [
      {
        id: 'branch_gpt',
        text: 'Вот топ-5 новостей за сегодня, согласно GPT-4:\n\n1. Прорыв в медицинских исследованиях\n2. Климатические инициативы\n3. Космические достижения\n4. Образовательные реформы\n5. Культурный фестиваль',
        operator: 'openai' as AIOperator,
        model: 'gpt-4o',
        citations: [
          {
            url: 'https://www.nature.com/medical-breakthrough',
            title: 'Nature: Medical Breakthrough',
            cited_text: 'Scientists discover new treatment method for chronic disease.',
          },
          {
            url: 'https://www.theguardian.com/environment/climate-action',
            title: 'The Guardian: Climate Action',
            cited_text: 'New international agreement on carbon emissions reduction.',
          },
          {
            url: 'https://www.nasa.gov/mission-success',
            title: 'NASA: Mission Success',
            cited_text: 'Space mission achieves historic milestone in exploration.',
          },
        ],
      },
      {
        id: 'branch_gemini',
        text: 'Вот топ-5 новостей за сегодня, согласно Gemini:\n\n1. Инновации в энергетике\n2. Международные отношения\n3. Технологическая безопасность\n4. Социальные инициативы\n5. Научные открытия',
        operator: 'gemini' as AIOperator,
        model: 'gemini-2.5',
        citations: [
          {
            url: 'https://www.scientificamerican.com/energy-innovation',
            title: 'Scientific American: Energy Innovation',
            cited_text: 'New renewable energy technology promises cleaner future.',
          },
          {
            url: 'https://www.bbc.com/news/world',
            title: 'BBC News: World Affairs',
            cited_text: 'Major diplomatic breakthrough in international relations.',
          },
        ],
      },
    ],
  },
};

