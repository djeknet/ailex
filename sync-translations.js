// sync-translations.js using deepl-node package
import fs from "fs";
import path from "path";
import * as deepl from "deepl-node";

const __dirname = path.resolve();
const localesDir = path.join(__dirname, "src", "_locales");
const baseLang = "en";
const basePath = path.join(localesDir, baseLang, "messages.json");
const baseMessages = JSON.parse(fs.readFileSync(basePath, "utf-8"));

const DEEPL_API_KEY = "25c9f3dd-5a14-4ebc-b3d8-1d5ab319d9d2:fx";
const translator = new deepl.Translator(DEEPL_API_KEY);

// Language mapping for DeepL API compatibility
// Chrome Extension locales -> DeepL language codes
const languageMapping = {
  'ca': 'ca',        // Catalan
  'cs': 'cs',        // Czech
  'da': 'da',        // Danish
  'de': 'de',        // German
  'en': 'en-US',     // English
  'en_GB': 'en-GB',  // British English
  'en_US': 'en-US',  // American English
  'es': 'es',        // Spanish
  'es_419': 'es',    // Latin American Spanish -> Spanish
  'fi': 'fi',        // Finnish
  'fr': 'fr',        // French
  'it': 'it',        // Italian
  'ja': 'ja',        // Japanese
  'ko': 'ko',        // Korean
  'lt': 'lt',        // Lithuanian
  'lv': 'lv',        // Latvian
  'nl': 'nl',        // Dutch
  'no': 'nb',        // Norwegian -> Norwegian Bokmål
  'pl': 'pl',        // Polish
  'pt_BR': 'pt-BR',  // Brazilian Portuguese
  'pt_PT': 'pt-PT',  // European Portuguese
  'ru': 'ru',        // Russian
  'sk': 'sk',        // Slovak
  'sl': 'sl',        // Slovenian
  'sv': 'sv',        // Swedish
  'tr': 'tr',        // Turkish
  'uk': 'uk',        // Ukrainian
  'zh_CN': 'zh',     // Simplified Chinese
  'zh_TW': 'zh'      // Traditional Chinese -> Simplified Chinese (DeepL doesn't support Traditional)
};

// Languages not supported by DeepL API
const unsupportedLanguages = new Set([
  // Add any locales that don't have DeepL support
]);

async function translateText(text, to) {
  try {
    // Use mapped language code if available, otherwise use original
    const targetLang = languageMapping[to] || to;
    const result = await translator.translateText(text, null, targetLang);
    return result.text;
  } catch (error) {
    throw new Error("Translation failed: " + error.message);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processLocale(locale) {
  if (locale === baseLang) return;

  // Check if language is supported by DeepL
  if (unsupportedLanguages.has(locale)) {
    console.log(`⚠️  Skipping ${locale}: Language not supported by DeepL API`);
    return;
  }

  // Check if we have a mapping for this locale
  if (!languageMapping[locale]) {
    console.log(`⚠️  Skipping ${locale}: No DeepL language mapping available`);
    return;
  }

  const langFile = path.join(localesDir, locale, "messages.json");
  
  // Create directory if it doesn't exist
  const langDir = path.dirname(langFile);
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
  }

  let messages = {};
  if (fs.existsSync(langFile)) {
    messages = JSON.parse(fs.readFileSync(langFile, "utf-8"));
  }

  const missingKeys = Object.entries(baseMessages)
    .filter(([key]) => !messages[key])
    .map(([key, value]) => ({
      key,
      message: value.message,
      description: value.description || ""
    }));

  for (const { key, message, description } of missingKeys) {
    const combined = `${message} | ${description}`;
    console.log(`[${locale}] Translating key: ${key}`);

    try {
      const translated = await translateText(combined, locale);
      const [translatedMessage, translatedDescription] = translated.split("|").map(s => s.trim());

      messages[key] = {
        message: translatedMessage,
        description: translatedDescription || ""
      };

      fs.writeFileSync(langFile, JSON.stringify(messages, null, 2));
      await delay(200); // small delay to respect rate limits
    } catch (err) {
      // Check if error is due to unsupported language
      if (err.message.includes('target_lang') || err.message.includes('language')) {
        console.log(`⚠️  Skipping ${locale}: Language not supported by DeepL API (${err.message})`);
        return; // Skip this entire locale
      }
      
      console.error(`\n❌ Error translating key '${key}' for ${locale}:`, err.message);
      console.log(`⚠️  Continuing with next key...`);
      // Don't exit, continue with next key
    }
  }
}

(async () => {
  console.log(`🔍 Looking for locales in: ${localesDir}`);
  
  if (!fs.existsSync(localesDir)) {
    console.error(`❌ Locales directory not found: ${localesDir}`);
    process.exit(1);
  }

  const locales = fs
    .readdirSync(localesDir)
    .filter((dir) => {
      const messagesPath = path.join(localesDir, dir, "messages.json");
      return fs.statSync(path.join(localesDir, dir)).isDirectory() && 
             (fs.existsSync(messagesPath) || dir !== baseLang);
    });

  console.log(`📋 Found locales: ${locales.join(', ')}`);
  console.log(`🌍 Base language: ${baseLang}`);
  console.log(`🔄 Starting translation sync...\n`);

  let processedCount = 0;
  let skippedCount = 0;

  for (const locale of locales) {
    const initialSkipped = skippedCount;
    await processLocale(locale);
    
    if (locale !== baseLang) {
      if (unsupportedLanguages.has(locale) || !languageMapping[locale]) {
        skippedCount++;
      } else {
        processedCount++;
      }
    }
  }

  console.log(`\n✅ Translation sync complete!`);
  console.log(`📊 Processed: ${processedCount} locales`);
  console.log(`⏭️  Skipped: ${skippedCount} locales`);
})();
