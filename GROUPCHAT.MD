# Групповой чат - Реализация завершена ✅

## Архитектурный обзор

Система группового чата полностью интегрирована в существующую архитектуру:

- ✅ Система branch для отображения ответов разных моделей
- ✅ Механизм последовательного streaming ответов
- ✅ Выбор до 3 моделей одновременно
- ✅ Изолированная история для каждой модели

## Реализованные компоненты

### 1. Константы (`src/shared/constants/index.ts`)
```typescript
export const MAX_GROUP_CHAT_MODELS = 3;
```

### 2. Store (`src/shared/stores/chatStore.ts`)

**Состояние:**
- `groupChatMode: boolean` - режим группового чата
- `groupChatModels: Array<{operator, modelId}>` - выбранные модели

**Методы:**
- `setGroupChatMode(enabled)` - включение/выключение режима
- `toggleGroupChatModel(operator, modelId)` - добавление/удаление модели
- `clearGroupChatModels()` - очистка списка
- `sendParallelMessages()` - **последовательный streaming для всех моделей**

### 3. UI (`src/ui/components/chat/ModelSelect.tsx`)

**Переключатель режима:**
- Switch "Групповой чат" в dropdown под поиском
- Автоматическое добавление текущей модели при включении

**Список моделей:**
- Radio → Checkbox при активации группового режима
- Сортировка: выбранные модели сверху
- Disabled для невыбранных при лимите (3)
- Styled Checkbox с поддержкой темной/светлой темы

**Индикация:**
- Иконка Sparkles 🟢 вместо иконки оператора
- Badge с количеством выбранных моделей
- Tooltip: "Выбрано N моделей: список через запятую"

### 4. Локализация
- 🇬🇧 EN: "Group Chat", "Selected {{count}} models"
- 🇷🇺 RU: "Групповой чат", "Выбрано {{count}} моделей"  
- 🇪🇸 ES: "Chat grupal", "Seleccionados {{count}} modelos"

## Логика работы

### Последовательный Streaming

**Преимущества:**
- ✅ Потоковый вывод для каждой модели
- ✅ Пользователь видит ответы по мере готовности
- ✅ Не нужно ждать самую медленную модель
- ✅ Простая реализация без сложной синхронизации

**Алгоритм:**
```typescript
for (каждая модель в groupChatModels) {
  1. Фильтровать историю (только сообщения пользователя + ответы этой модели)
  2. Запустить streaming запрос
  3. Отображать ответ в реальном времени
  4. Сохранить как branch (index 0 = контейнер, остальные = branches)
  5. Перейти к следующей модели
}
```

**Порядок отображения:**
1. Первая модель стримится сразу → сохраняется как основное сообщение
2. Вторая модель стримится → сохраняется как branch #1
3. Третья модель стримится → сохраняется как branch #2

### Фильтрация истории

Каждая модель получает изолированную историю:
```typescript
const filteredMessages = messages.filter(m => 
  m.isUser ||  // ВСЕ сообщения пользователя
  (m.operator === model.operator && m.model === model.id) // ТОЛЬКО свои ответы
);
```

**Пример:**
```
История для OpenAI GPT-4:
  User: "Привет"
  GPT-4: "Здравствуйте!"
  User: "Как дела?"
  GPT-4: "Отлично, спасибо!"

История для Claude:
  User: "Привет"
  Claude: "Приветствую!"
  User: "Как дела?"
  Claude: "Прекрасно!"
```

### Структура сообщений

```
User Message
    └─> AI Message 1 (Модель 1) [контейнер, branchId=undefined]
        ├─> AI Message 2 (Модель 2) [branchId=Message1.id]
        └─> AI Message 3 (Модель 3) [branchId=Message1.id]
```

### UI отображение

Используется существующий Branch компонент:
- **Page 0:** Ответ первой модели (основной)
- **Page 1:** Ответ второй модели (branch)
- **Page 2:** Ответ третьей модели (branch)
- Навигация через кнопки ← → внизу
- Подпись модели для каждого ответа

## Состояние сохранения

**localStorage:**
- `groupChatMode` - сохраняется
- `groupChatModels` - сохраняется
- `selectedOperator` - сохраняется отдельно для одиночного режима

**При переключении режимов:**
- Групповой → Одиночный: восстанавливается `selectedOperator`
- Одиночный → Групповой: `selectedOperator` добавляется в `groupChatModels[0]`

## Преимущества реализации

✅ **Без блокировки UI** - последовательный streaming показывает прогресс  
✅ **Изолированная история** - каждая модель работает в своем контексте  
✅ **Переиспользование кода** - использует существующий Branch UI  
✅ **Простота** - понятная последовательная логика  
✅ **Масштабируемость** - легко добавить больше моделей  
✅ **Интеграция с консулом** - автоматическое переключение на одиночный режим при создании сводного ответа

## Ограничения

⚠️ **Последовательность, не параллельность** - модели обрабатываются по очереди  
⚠️ **Время ожидания** - если первая модель медленная, вторая ждет  

*Примечание: Для полного параллелизма требуется более сложная архитектура с управлением множественными streaming состояниями.*

## Интеграция с функцией консула

Когда пользователь нажимает кнопку консула (Scale icon) для создания сводного ответа по всем ответам от разных моделей:

1. **Автоматическое переключение:** `setGroupChatMode(false)` вызывается в начале `handleConsulSummary`
2. **Выбор модели:** Модель-консул автоматически выбирается через `setSelectedOperator`
3. **Отправка запроса:** Консул получает все ответы и создает итоговый взвешенный ответ в одиночном режиме
4. **Контекст страницы:** `pageContext` передается в `consulPrompt`, но `pageUrl` **не сохраняется** в user message, так как консул вызывается с системных страниц

**Файлы:** 
- `src/ui/components/chat/MessageList.tsx`, функция `handleConsulSummary` (строка ~845)
- `src/shared/stores/chatStore.ts`, логика сохранения `pageUrl` только когда контекст действительно использован (строка ~364)

## Исправленные проблемы

### 1. Сортировка моделей в групповом режиме
**Проблема:** Выбранные модели не отображались первыми в списке.  
**Решение:** Добавлена сортировка в `useMemo` для `favoriteModels` и обычных групп моделей в `ModelSelect.tsx`.

### 2. Переключение между режимами
**Проблема:** При переключении режимов выбранная модель иногда отключалась.  
**Решение:** Атомарное обновление состояния в `setGroupChatMode` - режим и модели устанавливаются одновременно.

### 3. Badge контекста на системных страницах
**Проблема:** При вызове консула создавался badge с URL системной страницы (chrome://...).  
**Решение:** `pageUrl` теперь сохраняется только когда `pageContext` действительно использован и `effectivePageContextEnabled === true`.

**Код в `chatStore.ts`:**
```typescript
// ВАЖНО: pageUrl сохраняем только если контекст был действительно использован
// Это предотвращает badge на системных страницах и когда контекст отключен
pageUrl: (pageContext && effectivePageContextEnabled) ? currentUrl : undefined,
```

## Основные изменения

### 1. Расширение Store для мультимодельного режима

**Файл:** `src/shared/stores/chatStore.ts`

Добавить в интерфейс `ChatStore`:

- `multiModelMode: boolean` - переключатель режима
- `selectedModels: Array<{operator: AIOperator, modelId: string}>` - массив до 5 выбранных моделей
- `setMultiModelMode: (enabled: boolean) => void`
- `addSelectedModel: (operator: AIOperatorConfig, modelId: string) => void`
- `removeSelectedModel: (operator: AIOperator, modelId: string) => void`
- `clearSelectedModels: () => void`

### 2. Компонент выбора нескольких моделей

**Файл:** `src/ui/components/chat/MultiModelSelect.tsx` (новый)

Создать на основе `ModelSelect.tsx`:

- Выпадающий список с чекбоксами вместо радиокнопок
- Визуальное отображение выбранных моделей (badge с иконками операторов)
- Ограничение до 5 моделей
- Логика добавления/удаления моделей из массива

### 3. Переключатель режима чата

**Файл:** `src/ui/components/chat/MessageInput.tsx`

В компонент `MessageInput` (строка 73):

- Добавить Toggle/Switch для переключения между режимами (одна/несколько моделей)
- При включении мультирежима показывать `MultiModelSelect` вместо `ModelSelect`
- При выключении возвращаться к стандартному `ModelSelect`

**Расположение:** В `PromptInputFooter` (строка 868), рядом с ModelSelect

### 4. Визуальная индикация в поле чата

**Файл:** `src/ui/components/chat/MessageInput.tsx`

Добавить индикатор над полем ввода:

- Горизонтальный список badge с иконками выбранных моделей
- Анимация при стриминге (пульсация/мерцание)
- Отображать количество выбранных моделей (например: "3 models active")

**Расположение:** В `PromptInputBody` (строка 822), над `PromptInputTextarea`

### 5. Модификация логики отправки сообщений

**Файл:** `src/shared/stores/chatStore.ts`, метод `sendUserMessage` (строка 125)

Изменения:

```
IF multiModelMode === true:
  1. Сохранить одно пользовательское сообщение
  2. Создать пустое AI сообщение-контейнер
  3. Параллельно отправить запросы ко всем selectedModels
  4. Для каждого ответа:
     - Первый ответ записывается в основное сообщение
     - Остальные создаются как branch (branchId = messageId первого ответа)
  5. Обновлять стрим в реальном времени для всех branch
ELSE:
  Использовать стандартную логику с selectedOperator
```

### 6. Параллельная обработка запросов

**Файл:** `src/shared/stores/chatStore.ts`, новый метод

Создать `sendParallelMessages`:

- Использовать `Promise.all()` для параллельных запросов
- Каждый запрос вызывает `sendAIMessage` со своим operator/model
- Накапливать стриминг контент для каждой модели отдельно
- Сохранять в `messageBranches` по мере получения ответов

**Архитектура потока:**

```
User Message
    ├─> Model 1 (основной ответ, index 0)
    ├─> Model 2 (branch, index 1)
    ├─> Model 3 (branch, index 2)
    └─> Model N (branch, index N-1)
```

### 7. UI для отображения параллельных ответов

**Файл:** `src/ui/components/chat/AIMessage.tsx`

Текущий branch механизм уже поддерживает множественные ответы (строки 467-479):

- Добавить визуальное различие для "сгенерированных одновременно" branch
- Показывать все модели сразу при получении (автоматическая навигация или split-view)
- Индикатор загрузки для каждого стримящегося branch

### 8. Состояние стриминга для нескольких моделей

**Файл:** `src/ui/components/chat/MessageList.tsx`

Расширить состояние загрузки:

- Отслеживать активные стримы для каждой модели отдельно
- Показывать индикаторы загрузки для каждого branch
- Обновлять `messageBranches` в реальном времени (как в `handleCompareResponse`, строка 447-487)

### 9. Локализация

**Файл:** `src/_locales/en/messages.json` и другие языковые файлы

Добавить переводы:

- `multiModelMode`: "Multi-model mode"
- `selectModels`: "Select models"
- `modelsActive`: "models active"
- `maxModelsReached`: "Maximum 5 models"
- `parallelResponsesInfo`: "Responses from all selected models"

### 10. Persist состояния

**Файл:** `src/shared/stores/chatStore.ts`

Добавить в persist middleware:

- Сохранять `multiModelMode`
- Сохранять `selectedModels`
- Восстанавливать состояние при перезагрузке

## Последовательность реализации

### Шаг 1: Константы
**Файл:** `src/shared/constants/index.ts`

Добавить константу:
```typescript
export const MAX_GROUP_CHAT_MODELS = 3;
```

### Шаг 2: Расширение ChatStore
**Файл:** `src/shared/stores/chatStore.ts`

Добавить в интерфейс `ChatStore`:
- `groupChatMode: boolean` - переключатель режима группового чата
- `groupChatModels: Array<{operator: AIOperator, modelId: string}>` - массив до 3 выбранных моделей для группового режима
- `setGroupChatMode: (enabled: boolean) => void` - переключение режима
- `toggleGroupChatModel: (operator: AIOperator, modelId: string) => void` - добавление/удаление модели из группового чата
- `clearGroupChatModels: () => void` - очистка выбранных моделей

**Логика раздельного хранения:**
- `selectedOperator` - хранит выбранную модель для **одиночного режима**
- `groupChatModels` - хранит массив выбранных моделей для **группового режима**
- При переключении между режимами каждый режим сохраняет свое состояние независимо
- При включении `groupChatMode`: изначально выбранная модель из `selectedOperator` автоматически добавляется в `groupChatModels[0]`
- При выключении `groupChatMode`: восстанавливается последняя выбранная модель из `selectedOperator`

**Persist middleware:**
Добавить сохранение в localStorage:
- `groupChatMode`
- `groupChatModels`

### Шаг 3: Модификация ModelSelect.tsx
**Файл:** `src/ui/components/chat/ModelSelect.tsx`

#### 3.1. Импорты
Добавить:
```typescript
import { Sparkles } from 'lucide-react';
import { Switch } from '@/ui/components/ui/switch';
import { MAX_GROUP_CHAT_MODELS } from '@shared/constants';
import { Badge } from '@/ui/components/ui/badge';
```

#### 3.2. Состояние и данные из store
```typescript
const { selectedOperator, setSelectedOperator, groupChatMode, groupChatModels, setGroupChatMode, toggleGroupChatModel } = useChatStore();
```

#### 3.3. UI в PopoverContent
**После `CommandInput` (строка 220-242):**

Добавить блок переключателя группового режима:
```typescript
<div className="px-3 py-2 border-b">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium">{t('groupChat')}</span>
    <Switch 
      checked={groupChatMode}
      onCheckedChange={(checked) => {
        setGroupChatMode(checked);
        if (checked && selectedOperator) {
          // При включении добавляем текущую модель в группу
          toggleGroupChatModel(selectedOperator.operator, selectedOperator.selectedModel);
        }
      }}
    />
  </div>
</div>
```

#### 3.4. Логика отображения моделей в CommandList
Изменить `CommandItem` (строки 318-362):

**Сортировка моделей:**
Перед маппингом `filteredModels`:
```typescript
const sortedModels = filteredModels.sort((a, b) => {
  if (!groupChatMode) return 0;
  
  const aSelected = groupChatModels.some(m => m.operator === config.operator && m.modelId === a.id);
  const bSelected = groupChatModels.some(m => m.operator === config.operator && m.modelId === b.id);
  
  if (aSelected && !bSelected) return -1;
  if (!aSelected && bSelected) return 1;
  return 0;
});
```

**Для каждой модели:**
```typescript
const isSelected = groupChatMode 
  ? groupChatModels.some(m => m.operator === config.operator && m.modelId === model.id)
  : currentValue === value;

const isDisabled = groupChatMode && 
  !isSelected && 
  groupChatModels.length >= MAX_GROUP_CHAT_MODELS;

// В CommandItem добавить:
disabled={isDisabled}
className={cn(isDisabled && "opacity-50 cursor-not-allowed")}

onSelect={() => {
  if (groupChatMode) {
    toggleGroupChatModel(config.operator, model.id);
  } else {
    setSelectedOperator({
      ...config,
      selectedModel: model.id
    });
    setOpen(false);
  }
}}
```

**Изменить иконку Check на Checkbox в групповом режиме:**
```typescript
{groupChatMode ? (
  <input 
    type="checkbox"
    checked={isSelected}
    readOnly
    className="h-4 w-4"
  />
) : (
  <Check
    className={cn(
      "h-4 w-4 text-primary",
      isSelected ? "opacity-100" : "opacity-0"
    )}
  />
)}
```

#### 3.5. Изменение иконки в кнопке
**Изменить кнопку (строки 134-149):**

```typescript
<Button
  variant="ghost"
  size="icon"
  type="button"
  role="combobox"
  aria-expanded={open}
  className="relative"
>
  {groupChatMode ? (
    <>
      <Sparkles className="w-5 h-5 text-green-500" />
      {groupChatModels.length > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
          variant="default"
        >
          {groupChatModels.length}
        </Badge>
      )}
    </>
  ) : (
    selectedOperator && (
      <img 
        src={getOperatorIcon(selectedOperator.operator)}
        alt={selectedOperator.operator}
        className="w-5 h-5"
      />
    )
  )}
</Button>
```

#### 3.6. Tooltip для группового режима
**Изменить TooltipContent (строки 152-216):**

```typescript
<TooltipContent className="max-w-xs" side="top">
  {groupChatMode ? (
    <div className="space-y-1 text-xs">
      <div className="font-semibold">
        {t('groupChatModelsSelected', { count: groupChatModels.length })}
      </div>
      <div className="text-muted-foreground">
        {groupChatModels.map((m, idx) => {
          const op = operators.find(o => o.operator === m.operator);
          const model = op?.models?.find(mod => mod.id === m.modelId);
          return model?.name;
        }).join(', ')}
      </div>
    </div>
  ) : (
    // Существующий код для одиночного режима
  )}
</TooltipContent>
```

### Шаг 4: Модификация логики отправки сообщений
**Файл:** `src/shared/stores/chatStore.ts`, метод `sendUserMessage`

#### 4.1. Проверка режима
В начале метода добавить:
```typescript
if (get().groupChatMode && get().groupChatModels.length > 0) {
  return sendParallelMessages(content, pageContext, attachments, ...);
}
```

#### 4.2. Новый метод sendParallelMessages
```typescript
sendParallelMessages: async (
  content: string,
  pageContext?: string,
  attachments?: MessageAttachment[],
  // ... остальные параметры
) => {
  const { groupChatModels, currentChat, messages } = get();
  
  if (!currentChat || groupChatModels.length === 0) return;
  
  // 1. Сохранить пользовательское сообщение
  const userMessage = await addMessage({...});
  
  // 2. Создать контейнер для AI ответов
  const aiMessageContainer = await addMessage({
    chatId: currentChat.id,
    content: '',
    isUser: false,
    model: 'group-chat',
    // ...
  });
  
  // 3. Для каждой модели отфильтровать историю и запустить запрос
  const requests = groupChatModels.map(async (selectedModel, index) => {
    // ВАЖНО: Фильтруем историю - берем только сообщения пользователя и ответы этой модели
    const filteredHistory = messages.filter(msg => {
      if (msg.isUser) return true;
      
      // Для AI сообщений берем только от текущей модели
      return msg.model === selectedModel.modelId && 
             msg.operator === selectedModel.operator;
    });
    
    const operatorConfig = operators.find(op => op.operator === selectedModel.operator);
    
    if (index === 0) {
      // Первый ответ - основной (index 0)
      return sendAIMessage(/* с filteredHistory */);
    } else {
      // Остальные - в branches
      return sendAIMessage(/* с filteredHistory, branchId = aiMessageContainer.id */);
    }
  });
  
  // 4. Запустить параллельно
  await Promise.all(requests);
}
```

### Шаг 5: UI для параллельного стриминга
**Файл:** `src/ui/components/chat/MessageList.tsx`

- Использовать существующий механизм branch для отображения
- Добавить индикаторы загрузки для каждого branch
- Обновлять `messageBranches` в реальном времени

### Шаг 6: Локализация
**Файлы:** `src/_locales/*/messages.json`

Добавить переводы:
- `groupChat`: "Групповой чат"
- `groupChatModelsSelected`: "Выбрано {count} моделей"
- `maxGroupChatModels`: "Максимум 3 модели"

### Шаг 7: Тестирование
- Переключение между режимами сохраняет выбранные модели
- Фильтрация истории работает корректно для каждой модели
- UI отображает выбранные модели сверху
- Disabled состояние при достижении лимита
- Иконка и badge корректно отображаются
- Tooltip показывает список выбранных моделей

## Технические детали

**Стриминг:** Использовать существующий механизм из `handleCompareResponse` (строка 447) - создавать временные branch сообщения и обновлять их в реальном времени

**Отмена запросов:** Каждый параллельный запрос должен иметь свой `AbortController` для возможности отмены

**Обработка ошибок:** Если одна модель падает, остальные продолжают работать. Показывать ошибку в соответствующем branch

**Токены и стоимость:** Суммировать токены и стоимость от всех моделей в одном сообщении