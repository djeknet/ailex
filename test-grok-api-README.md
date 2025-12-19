# Тестирование Grok API Web Search

Этот скрипт тестирует различные конфигурации параметров `web_search` и `x_search` для Grok API (xAI).

## Установка и запуск

### 1. Получи API ключ
Зарегистрируйся на https://x.ai/ и получи API ключ.

### 2. Установи ключ в переменную окружения

**Windows (PowerShell):**
```powershell
$env:XAI_API_KEY="your-api-key-here"
```

**Linux/macOS:**
```bash
export XAI_API_KEY="your-api-key-here"
```

### 3. Запусти тесты

```bash
node test-grok-api.js
```

## Что тестируется

Скрипт проверяет 9 различных конфигураций:

### Тест 1: Базовый web_search
```json
{
  "tools": [
    { "type": "web_search" }
  ]
}
```

### Тест 2: Web_search с разрешёнными доменами
```json
{
  "tools": [
    { 
      "type": "web_search",
      "allowed_domains": ["wikipedia.org", "reuters.com"]
    }
  ]
}
```

### Тест 3: Web_search с заблокированными доменами
```json
{
  "tools": [
    { 
      "type": "web_search",
      "excluded_domains": ["spam.com", "ads.com"]
    }
  ]
}
```

### Тест 4: Web_search с пониманием изображений
```json
{
  "tools": [
    { 
      "type": "web_search",
      "enable_image_understanding": true
    }
  ]
}
```

### Тест 5: Web_search комбо
```json
{
  "tools": [
    { 
      "type": "web_search",
      "allowed_domains": ["wikipedia.org"],
      "enable_image_understanding": true
    }
  ]
}
```

### Тест 6: X_search без параметров
```json
{
  "tools": [
    { "type": "web_search" },
    { "type": "x_search" }
  ]
}
```

### Тест 7: X_search с разрешёнными аккаунтами
```json
{
  "tools": [
    { "type": "web_search" },
    { 
      "type": "x_search",
      "allowed_x_handles": ["elonmusk", "OpenAI"]
    }
  ]
}
```

### Тест 8: X_search с датами
```json
{
  "tools": [
    { "type": "web_search" },
    { 
      "type": "x_search",
      "from_date": "2025-11-01",
      "to_date": "2025-11-08"
    }
  ]
}
```

### Тест 9: Полная конфигурация
```json
{
  "tools": [
    { 
      "type": "web_search",
      "allowed_domains": ["wikipedia.org", "reuters.com"],
      "enable_image_understanding": true
    },
    { 
      "type": "x_search",
      "allowed_x_handles": ["elonmusk"],
      "from_date": "2025-11-01",
      "enable_image_understanding": true,
      "enable_video_understanding": true
    }
  ]
}
```

## Результат

Скрипт выведет:
- ✅ Успешные тесты
- ❌ Неудачные тесты (с кодом ошибки и телом ответа)
- 📊 Итоги по всем тестам

## Ожидаемые результаты

Если Grok API **НЕ поддерживает** определённые параметры, ты увидишь:
- `422 Unprocessable Content` - параметр не поддерживается или неверный формат
- `400 Bad Request` - неверный формат запроса

Если параметр **поддерживается**:
- `200 OK` - успешный ответ
- Citations в ответе (если найдены источники)

## Пример вывода

```
🧪 Test 1: Базовый web_search без параметров

📤 Request body:
{
  "model": "grok-4-0709",
  "messages": [...],
  "tools": [{ "type": "web_search" }]
}

📥 Response status: 200 OK

✅ Success! Response preview:
- Model: grok-4-0709
- Choices: 1
- Content length: 1523 chars

📚 Citations: 5
  1. https://reuters.com/...
  2. https://wikipedia.org/...
  3. https://news.com/...

================================================================================

📊 ИТОГИ ТЕСТОВ
================================================================================
✅ Test 1: Базовый web_search без параметров
❌ Test 2: Web_search с allowed_domains (422 Error)
✅ Test 3: Web_search с excluded_domains
...

🎯 Успешно: 6/9
```

## Устранение проблем

### Ошибка: "Failed to fetch"
- Проверь интернет-соединение
- Убедись, что API endpoint доступен

### Ошибка: 401 Unauthorized
- Проверь правильность API ключа
- Убедись, что ключ активен

### Ошибка: 422 Unprocessable Content
- Параметр не поддерживается API
- Проверь документацию Grok на актуальность

### Ошибка: 429 Too Many Requests
- Слишком много запросов
- Увеличь задержку между тестами (параметр `setTimeout` в коде)








