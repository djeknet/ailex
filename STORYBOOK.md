# Storybook для тестирования UI компонентов

## Быстрый старт

```bash
# Запуск Storybook
npm run storybook
```

Storybook откроется в браузере по адресу: **http://localhost:6006**

## Что это даёт?

✅ **Тестирование UI без реальных API запросов** - все данные моковые  
✅ **Быстрая разработка** - видите изменения в реальном времени  
✅ **Разные состояния** - легко переключаться между вариантами компонента  
✅ **Документация** - автоматическая документация компонентов  
✅ **Accessibility тесты** - встроенная проверка доступности

## Созданные Stories

### AIMessage Component (`src/ui/components/chat/AIMessage.stories.tsx`)

Доступные варианты для тестирования:

1. **Basic** - обычное сообщение без цитат
2. **WithCitations** - сообщение с 5 цитатами (как в реальном Web Search)
3. **WithManyCitations** - сообщение с 20 цитатами (тест множества источников)
4. **WithMarkdown** - сообщение с полным markdown форматированием
5. **WithBranches** - сообщение с альтернативными ответами от разных моделей
6. **WithSuggestedQuestions** - сообщение с предложенными вопросами
7. **ComplexMessage** - комбинация всех возможностей

## Как использовать

### 1. Просмотр компонентов
- Открываем Storybook
- В левой панели выбираем **Chat → AIMessage**
- Переключаемся между разными stories

### 2. Интерактивное редактирование
- Во вкладке **Controls** можно менять props компонента
- Меняем текст, добавляем/удаляем цитаты
- Изменения применяются мгновенно

### 3. Тестирование цитат
Для теста Web Search функционала используйте:
- **WithCitations** - стандартный случай (5 источников)
- **WithManyCitations** - стресс-тест (20 источников)

### 4. Проверка Accessibility
- Открываем вкладку **Accessibility**
- Смотрим результаты автоматических проверок
- Исправляем найденные проблемы

## Создание новых Stories

```typescript
// src/ui/components/YourComponent.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import YourComponent from './YourComponent';

const meta: Meta<typeof YourComponent> = {
  title: 'Category/YourComponent',
  component: YourComponent,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof YourComponent>;

export const Default: Story = {
  args: {
    // ваши props
  },
};

export const Loading: Story = {
  args: {
    isLoading: true,
  },
};
```

## Горячие клавиши

- `S` - показать/скрыть боковую панель
- `A` - показать/скрыть панель аддонов
- `F` - полноэкранный режим
- `D` - переключить темную тему
- `/` - поиск stories

## Полезные аддоны (уже установлены)

- **@storybook/addon-docs** - автодокументация
- **@storybook/addon-a11y** - проверка доступности
- **@storybook/addon-vitest** - интеграция с Vitest для тестов
- **@chromatic-com/storybook** - визуальное регрессионное тестирование

## Сборка для продакшена

```bash
# Создать статическую сборку Storybook
npm run build-storybook
```

Результат будет в папке `storybook-static/` - можно разместить на любом хостинге.

## Настройка

### Конфигурация
- `.storybook/main.ts` - основная конфигурация
- `.storybook/preview.ts` - глобальные декораторы и параметры

### Моки
- `.storybook/mocks/i18n.tsx` - mock для переводов
- `.storybook/mocks/zustand.ts` - mock для stores

## Troubleshooting

### Проблема с импортами
Если компонент не находит модули, проверьте alias в `.storybook/main.ts`

### Проблема со стилями
Убедитесь, что `globals.css` импортирован в `.storybook/preview.ts`

### Компонент падает с ошибкой
Скорее всего нужно добавить mock для используемого хука/сервиса в `.storybook/preview.ts`

## Дополнительные ресурсы

- [Документация Storybook](https://storybook.js.org/docs)
- [Best practices](https://storybook.js.org/docs/writing-stories/best-practices)
- [Addon каталог](https://storybook.js.org/addons)





