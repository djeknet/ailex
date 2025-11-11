#!/usr/bin/env node

/**
 * Grok API Web Search Test Script
 * 
 * Тестирует различные варианты параметров web_search и x_search
 * для Grok API (xAI)
 * 
 * Использование:
 * 1. Установи переменную окружения: export XAI_API_KEY="your-api-key"
 * 2. Запусти: node test-grok-api.js
 */

const API_KEY = process.env.XAI_API_KEY || 'xai-uF2q3OznXKR3VSsjbNOTuNZ7QRFtMYsgDWQl2OGOdUb6YWl74cWxKPcgdKvHBQ0qxWIOrFk580ZunYwf';
const API_URL = 'https://api.x.ai/v1/responses'; // Not /chat/completions!

// Тестовые конфигурации
const testCases = [
  {
    name: 'Test 1: Базовый web_search без параметров',
    tools: [
      { type: 'web_search' }
    ]
  },
  {
    name: 'Test 2: Web_search с allowed_domains',
    tools: [
      { 
        type: 'web_search',
        allowed_domains: ['wikipedia.org', 'reuters.com']
      }
    ]
  },
  {
    name: 'Test 3: Web_search с excluded_domains',
    tools: [
      { 
        type: 'web_search',
        excluded_domains: ['spam.com', 'ads.com']
      }
    ]
  }
];

async function testGrokAPI(testCase) {
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 ${testCase.name}`);
  console.log('='.repeat(80));
  
  const requestBody = {
    model: 'grok-4-fast',
    input: [
      {
        role: 'user',
        content: 'Какие топ 3 новости за сегодня?'
      }
    ],
    tools: testCase.tools
  };
  
  console.log('\n📤 Request body:');
  console.log(JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`\n📥 Response status: ${response.status} ${response.statusText}`);
    console.log(`📥 Response headers:`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    
    // Получаем текст ответа для отладки
    const responseText = await response.text();
    console.log(`\n📄 Raw response (first 500 chars):`);
    console.log(responseText.substring(0, 500));
    
    // Пытаемся распарсить как JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.log('\n❌ Failed to parse JSON response:');
      console.log(`Error: ${jsonError.message}`);
      console.log('\n📄 Full raw response:');
      console.log(responseText);
      return { success: false, error: `JSON parse error: ${jsonError.message}` };
    }
    
    if (!response.ok) {
      console.log('\n❌ Error response:');
      console.log(JSON.stringify(data, null, 2));
      return { success: false, error: data };
    }
    
    console.log('\n✅ Success! Response preview:');
    console.log(`- Model: ${data.model}`);
    console.log(`- Choices: ${data.choices?.length || 0}`);
    
    if (data.choices?.[0]?.message) {
      const message = data.choices[0].message;
      console.log(`- Content length: ${message.content?.length || 0} chars`);
      console.log(`- Tool calls: ${message.tool_calls?.length || 0}`);
    }
    
    // Citations
    if (data.citations) {
      console.log(`\n📚 Citations: ${data.citations.length}`);
      data.citations.slice(0, 3).forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
      });
    }
    
    return { success: true, data };
  } catch (error) {
    console.log('\n❌ Network error:');
    console.log(`Error type: ${error.constructor.name}`);
    console.log(`Error message: ${error.message}`);
    if (error.stack) {
      console.log(`Stack trace: ${error.stack}`);
    }
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n🚀 Grok API Web Search Tests');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`🔑 API Key: ${API_KEY.substring(0, 10)}...`);
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testGrokAPI(testCase);
    results.push({
      name: testCase.name,
      success: result.success
    });
    
    // Задержка между запросами
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Итоги
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 ИТОГИ ТЕСТОВ');
  console.log('='.repeat(80));
  
  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Test ${i + 1}: ${result.name}`);
  });
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 Успешно: ${successCount}/${results.length}`);
}

// Запуск
if (API_KEY === 'YOUR_API_KEY_HERE') {
  console.error('❌ Ошибка: Установите XAI_API_KEY');
  console.error('Использование: export XAI_API_KEY="your-key" && node test-grok-api.js');
  process.exit(1);
}

runAllTests().catch(console.error);

