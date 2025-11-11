# Техническая спецификация браузерного расширения

## Обзор проекта

**Тип**: Браузерное расширение Chrome (Manifest V3)  
**Назначение**: Современное веб-расширение с React интерфейсом  

## Технологический стек

### Основные технологии
- **Frontend Framework**: React + TypeScript
- **Build Tool**: Vite + Chrome Extension plugin
- **State Management**: Zustand с middleware (persist, devtools)
- **Styling**: TailwindCSS + PostCSS
- **Icons**: lucide-react
- **Testing**: Jest + типизация для Chrome API

### Дополнительные библиотеки
- **PDF Generation**: Библиотека генерации PDF документов
- **Screenshots**: Библиотеки для создания скриншотов
- **UI Components**: shadcn/ui (на основе Radix UI)

### Основные зависимости
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.0",
    "lucide-react": "^0.290.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^4.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "@crxjs/vite-plugin": "^2.0.0",
    "tailwindcss": "^3.3.0",
    "tailwindcss-animate": "^1.0.7",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### Инструменты разработки
- **Bundler**: Vite с оптимизацией для Chrome Extension
- **TypeScript Config**: Современный target, строгая типизация
- **Linting**: ESLint с правилами для React/TypeScript
- **Static Copy**: Плагин для копирования статических ресурсов

## Архитектура расширения

### Manifest V3 структура
```json
{
  "manifest_version": 3,
  "name": "__MSG_extensionName__",
  "version": "1.0.0",
  "action": {
    "default_popup": "src/ui/popup/index.html"
  },
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [{
    "matches": ["http://*/*", "https://*/*"],
    "js": ["src/content/index.ts"],
    "run_at": "document_end"
  }]
}
```

Иконки раширения находяся в папке 'icons'.

### Основные компоненты

#### 1. Background Service Worker (`src/background/`)
- **Файл**: `index.ts`
- **Сервисы**: `services/`, `handlers/`
- **Функции**: API коммуникация, управление состоянием, обработка событий

#### 2. Content Scripts (`src/content/`)
- **Основной файл**: `index.ts`
- **Функции**: Инжекция в веб-страницы, взаимодействие с DOM, сбор данных

#### 3. Side Panel
- **Path**: `src/ui/popup/index.html`
- **Функции**: Интерфейс в боковой панели браузера

## Структура данных

### Типизация (`src/shared/types/`)

#### Основные типы
```typescript
// common.ts - базовые типы
export type Theme = 'light' | 'dark' | 'system';
export type SupportedLanguage = 'en' | 'es' | 'ru';
export type UUID = string;
export type Timestamp = number;

// extension.ts - состояние расширения
export interface ExtensionState {
  auth: AuthenticationState;
  settings: ExtensionSettings;
  ui: UIState;
  cache: CacheState;
  lifecycle: LifecycleState;
}
```

#### API Types (`api.ts`)
```typescript
// Основные API запросы
export interface BaseApiRequest {
  url: string;
  timestamp: Timestamp;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Timestamp;
}

```

### State Management (Zustand)

#### Центральный Store (`src/shared/stores/extensionStore.ts`)
```typescript
interface ExtensionStoreState extends ExtensionState {
  
  // Settings actions  
  updateSettings: (settings: Partial<ExtensionSettings>) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: SupportedLanguage) => void;
  
  // UI actions
  setActiveView: (view: string) => void;
  openModal: (modal: string) => void;
  closeModal: (modal: string) => void;
  addToast: (toast: ToastData) => void;
}
```

#### Persistence
- **Storage**: Chrome Storage API через Zustand persist middleware
- **Data Protection**: Кодирование чувствительных данных
- **Cache**: Автоматическая очистка устаревших данных

## API Интеграция

### API Client (`src/shared/services/apiClient.ts`)
- **Base URL**: Конфигурируемый базовый URL
- **Authentication**: Система аутентификации пользователей
- **Security**: Безопасная передача данных
- **Error Handling**: Централизованная обработка ошибок

### Сервисы (`src/shared/services/`)
- **authService.ts**: Аутентификация пользователей
- **dataService.ts**: Управление данными приложения
- **storageService.ts**: Хранение данных
- **exportService.ts**: Экспорт данных
- **screenshotService.ts**: Создание скриншотов

## UI/UX Компоненты

### Компонентная архитектура (`src/ui/`)

#### UI Components (shadcn/ui)
- **Button**: Универсальные кнопки с вариантами стилей
- **Input**: Поля ввода с встроенной валидацией
- **Dialog**: Модальные окна с accessibility
- **Toast**: Уведомления с анимациями
- **Spinner**: Индикаторы загрузки
- **DropdownMenu**: Выпадающие меню
- **Card**: Карточки контента
- **Badge**: Значки и метки

#### Organisms (Сложные компоненты)
- **PopupHeader**: Заголовок popup окна
- **ChatView**: Вывод чата
- **SettingsPanel**: Панель настроек

#### Пример использования компонентов
```typescript
// Пример popup компонента с shadcn/ui
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/components/ui/dialog";
import { Settings, Download } from "lucide-react";

export const PopupComponent = () => {
  return (
    <div className="w-popup min-h-popup p-4 bg-background">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-foreground">Extension</h1>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-4">
        <Input placeholder="Введите текст..." />
        <Button className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Скачать
        </Button>
      </div>
    </div>
  );
};
```

### Стилизация
- **Framework**: TailwindCSS с shadcn/ui конфигурацией
- **Design System**: shadcn/ui компоненты на основе Radix UI
- **Themes**: CSS variables система для светлой/темной темы
- **Icons**: lucide-react с единообразным стилем
- **Responsive**: Адаптивный дизайн для sidepanel
- **Animations**: tailwindcss-animate для плавных переходов
- **Accessibility**: Встроенная поддержка ARIA и keyboard navigation

#### shadcn/ui конфигурация
```json
// components.json
{
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/ui/styles/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/ui/components",
    "utils": "@/shared/utils"
  }
}
```

#### Tailwind конфигурация для расширений
```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        }
      },
      maxWidth: {
        'popup': '400px'
      },
      minHeight: {
        'popup': '500px'
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
```

## Интернационализация

### Поддерживаемые языки
- **Английский** (en) - основной
- **Испанский** (es)  
- **Русский** (ru)

### Структура локализации (`src/_locales/`)
```
_locales/
├── en/messages.json
├── es/messages.json  
└── ru/messages.json
```

### i18n система (`src/shared/i18n/`)
- **useTranslation**: React хук для переводов
- **TranslationProvider**: Контекст провайдер
- **Автоопределение**: Язык браузера по умолчанию

## Права доступа (Permissions)

### Основные разрешения
```json
{
  "permissions": [
    "storage",        // Локальное хранение данных
    "activeTab",      // Доступ к активной вкладке
    "tabs"            // Управление вкладками
    "unlimitedStorage"
  ]
}
```

### Host Permissions
```json
{
  "host_permissions": [
    "http://*/*",     // Все HTTP сайты
    "https://*/*"     // Все HTTPS сайты
  ]
}
```

## Сборка и развертывание

### Build конфигурация (Vite)
```typescript
export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  
  return {
    plugins: [
      react(),
      crx({ manifest }),
      viteStaticCopy({
        targets: [
          { src: "src/_locales", dest: "" },
          { src: "public/fonts", dest: "" }
        ]
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@ui': path.resolve(__dirname, './src/ui'),
        '@shared': path.resolve(__dirname, './src/shared')
      }
    },
    build: {
      target: "es2020",
      minify: isProduction ? "terser" : false,
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true
        },
        format: {
          comments: false
        }
      }
    },
    css: {
      postcss: {
        plugins: isProduction ? [
          require('tailwindcss'),
          require('autoprefixer'),
          require('cssnano')
        ] : [
          require('tailwindcss'),
          require('autoprefixer')
        ]
      }
    }
  };
});
```

### Scripts
```json
{
  "dev": "vite",
  "build:dev": "vite build --mode development", 
  "build:prod": "vite build --mode production && node scripts/clean-dist.cjs",
  "package": "npm run clean && npm run build:prod && npm run create-package",
  "ui:init": "npx shadcn-ui@latest init",
  "ui:add": "npx shadcn-ui@latest add",
  "type-check": "tsc --noEmit",
  "lint": "eslint src --ext .ts,.tsx",
  "test": "jest",
  "test:coverage": "jest --coverage"
}
```

### Инициализация shadcn/ui
```bash
# Инициализация проекта с shadcn/ui
npm run ui:init

# Добавление базовых компонентов
npm run ui:add button input dialog dropdown-menu card badge button-group checkbox table dialog  input-group kbd label scroll-area select spinner switch tabs textarea toggle tooltip alert alert-dialog

# Добавление дополнительных компонентов по необходимости
npm run ui:add toast tabs accordion
```

### Оптимизация размера
- **Bundle Size Limits**: Контроль размера сборки
- **Tree Shaking**: Удаление неиспользуемого кода  
- **Code Splitting**: Разделение на чанки
- **Asset Optimization**: Сжатие изображений и ресурсов

## Тестирование

### Jest конфигурация
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1'
  },
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  }
};
```

### Типы тестов
- **Unit Tests**: Тестирование отдельных функций и компонентов
- **Integration Tests**: Тестирование взаимодействия компонентов  
- **E2E Tests**: End-to-end тестирование (Playwright)
- **Coverage**: Покрытие кода не менее 85%

## Безопасность

### Content Security Policy
```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'self'"
  }
}
```

### Защита данных
- **API Security**: Безопасная передача параметров
- **Storage**: Кодирование чувствительных данных
- **Authentication**: Безопасная токен система

### Валидация
- **Input Validation**: Проверка всех пользовательских вводов
- **URL Validation**: Проверка доменов и протоколов
- **XSS Protection**: Экранирование пользовательского контента

## Производительность

### Оптимизации
- **Lazy Loading**: Отложенная загрузка компонентов
- **Memoization**: React.memo для предотвращения ре-рендеров  
- **Debouncing**: Ограничение частоты API запросов

## Мониторинг и аналитика

### Error Tracking
- **Console Logging**: Структурированные логи для отладки
- **Error Boundaries**: React компоненты для перехвата ошибок
- **API Error Handling**: Централизованная обработка API ошибок

### Usage Analytics  
- **User Actions**: Трекинг действий пользователей
- **Performance Metrics**: Метрики производительности
- **Feature Usage**: Статистика использования функций

## Развертывание и дистрибуция

### Магазин расширений
- **Manifest V3**: Соответствие современным стандартам
- **Privacy Policy**: Политика конфиденциальности
- **Store Assets**: Иконки, скриншоты, описания

### Версионирование
- **Semantic Versioning**: Major.Minor.Patch формат
- **Автоматические обновления**: Через магазин расширений
- **Rollback Strategy**: Откат к предыдущим версиям

### CI/CD Pipeline
```bash
# Проверки перед релизом
npm run type-check    # TypeScript валидация
npm run lint         # ESLint проверки  
npm run test         # Запуск тестов
npm run build:prod   # Production сборка
npm run size-check   # Проверка размера бандла
```

## Заключение

Данная спецификация описывает универсальную архитектуру современного браузерного расширения, построенного на актуальных технологиях. Архитектура обеспечивает масштабируемость, производительность и простоту поддержки. Использование TypeScript и строгих правил линтинга гарантирует высокое качество кода и может быть адаптирована для различных типов расширений.
