import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES модули не имеют __dirname, создаем его
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Пути к файлам
const SITE_PROMPTS_PATH = path.join(__dirname, '../site-prompts.json');
const RU_MESSAGES_PATH = path.join(__dirname, '../src/_locales/ru/messages.json');
const EN_MESSAGES_PATH = path.join(__dirname, '../src/_locales/en/messages.json');

// Загрузка файлов
function loadJSON(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

// Сохранение JSON с форматированием
function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

// Генерация ключа локализации
function generateKey(domain, pageType, index) {
  // Убираем .com, .ru и т.д. из домена
  let cleanDomain = domain.replace(/\.(com|ru|org|net|io|co|uk)$/i, '');
  // Заменяем все точки на подчеркивания (Chrome не принимает точки в ключах)
  cleanDomain = cleanDomain.replace(/\./g, '_');
  return `sitePrompt_${cleanDomain}_${pageType}_${index}`;
}

// Основная логика
function generateI18nKeys() {
  console.log('🔄 Загрузка site-prompts.json...');
  const sitePrompts = loadJSON(SITE_PROMPTS_PATH);
  
  console.log('🔄 Загрузка файлов локализации...');
  const ruMessages = loadJSON(RU_MESSAGES_PATH);
  const enMessages = loadJSON(EN_MESSAGES_PATH);
  
  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  
  // Проходим по всем сайтам и промптам
  for (const [domain, siteConfig] of Object.entries(sitePrompts)) {
    if (domain === 'default') continue; // Пропускаем default
    
    const pageTypes = siteConfig.pageTypes || {};
    
    for (const [pageType, pageConfig] of Object.entries(pageTypes)) {
      const prompts = pageConfig.prompts || [];
      
      prompts.forEach((prompt, index) => {
        // Генерируем ключ
        const key = generateKey(domain, pageType, index);
        
        // Проверяем, есть ли уже textKey
        if (prompt.textKey && prompt.textKey === key) {
          skippedCount++;
          return;
        }
        
        // Добавляем textKey в промпт
        prompt.textKey = key;
        
        // Добавляем в русскую локализацию
        if (!ruMessages[key]) {
          ruMessages[key] = {
            message: prompt.text
          };
          addedCount++;
        } else {
          updatedCount++;
        }
        
        // Добавляем в английскую локализацию (пока используем русский текст как плейсхолдер)
        if (!enMessages[key]) {
          enMessages[key] = {
            message: prompt.text // TODO: нужен перевод на английский
          };
        }
      });
    }
  }
  
  // Добавляем ключ для заголовка секции
  if (!ruMessages['sitePromptsSectionTitle']) {
    ruMessages['sitePromptsSectionTitle'] = {
      message: 'Возможно вас интересует:'
    };
    addedCount++;
  }
  
  if (!enMessages['sitePromptsSectionTitle']) {
    enMessages['sitePromptsSectionTitle'] = {
      message: 'You might be interested in:'
    };
  }
  
  console.log('💾 Сохранение обновленных файлов...');
  
  // Сохраняем обновленный site-prompts.json
  saveJSON(SITE_PROMPTS_PATH, sitePrompts);
  
  // Сохраняем файлы локализации
  saveJSON(RU_MESSAGES_PATH, ruMessages);
  saveJSON(EN_MESSAGES_PATH, enMessages);
  
  console.log('✅ Готово!');
  console.log(`   • Добавлено новых ключей: ${addedCount}`);
  console.log(`   • Обновлено существующих: ${updatedCount}`);
  console.log(`   • Пропущено (уже есть): ${skippedCount}`);
  console.log('');
  console.log('⚠️  ВАЖНО: Английские переводы используют русский текст как плейсхолдер.');
  console.log('   Необходимо вручную перевести все новые ключи в src/_locales/en/messages.json');
}

// Запуск
try {
  generateI18nKeys();
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}

