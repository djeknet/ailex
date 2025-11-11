# Web Search Settings Components

Компоненты для настройки веб-поиска для разных AI операторов.

## Структура

```
search-settings/
├── index.ts                      # Re-exports всех компонентов
├── ClaudeSearchSettings.tsx      # 209 строк - настройки для Anthropic Claude
├── OpenAISearchSettings.tsx      # 175 строк - настройки для OpenAI
└── GrokSearchSettings.tsx        # 193 строк - настройки для Grok (xAI)
```

Основной файл: `WebSearchSettingsDialog.tsx` (143 строки) - orchestrator компонент.

**До рефакторинга:** 1 файл, 676 строк  
**После рефакторинга:** 5 файлов, 143 + 209 + 175 + 193 = 720 строк (с разделением логики)

## Компоненты

### ClaudeSearchSettings
Настройки для Anthropic Claude:
- Max search queries (1-10)
- Allowed/Blocked domains (взаимоисключающие)
- Location (city, region, country, timezone)

### OpenAISearchSettings
Настройки для OpenAI:
- Allowed domains (max 20)
- Live internet access (external_web_access)
- Location (city, region, country ISO, timezone IANA)

### GrokSearchSettings
Настройки для Grok (xAI):
- **Web Search (всегда активен):**
  - Allowed/Excluded domains (max 5, взаимоисключающие)
  - Image understanding
- **X (Twitter) Search (опционально):**
  - Toggle для включения X Search
  - Allowed/Excluded X handles (max 10, взаимоисключающие)
  - Date range (from/to)
  - Image understanding
  - Video understanding

## Использование

```tsx
import WebSearchSettingsDialog from './WebSearchSettingsDialog';

<WebSearchSettingsDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  operator="grok" // 'anthropic' | 'openai' | 'grok'
/>
```

## Принципы

- **Разделение по операторам**: каждый оператор в отдельном файле
- **Единая точка входа**: WebSearchSettingsDialog координирует компоненты
- **Auto-save**: изменения сохраняются автоматически
- **Валидация**: взаимоисключающие списки проверяются в реальном времени
- **Типизация**: строгая типизация через TypeScript

