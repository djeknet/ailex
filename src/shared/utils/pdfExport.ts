import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { ChatMessage, MessageAttachment } from '@shared/types/database';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { getTranslation } from '@shared/i18n/useTranslation';
import { i18nService } from '@shared/i18n/i18nService';

// Инициализируем шрифты (включает Roboto с поддержкой кириллицы)
(pdfMake as any).vfs = (pdfFonts as any).pdfMake?.vfs || pdfFonts;

export type ExportType = 'all' | 'ai-only';

/**
 * Экспорт чата в PDF
 * @param messages - Массив сообщений чата
 * @param chatTitle - Название чата
 * @param exportType - Тип экспорта (все сообщения или только AI)
 */
export async function exportChatToPDF(
  messages: ChatMessage[],
  chatTitle: string,
  exportType: ExportType
): Promise<void> {
  try {
    // Инициализируем i18n если еще не инициализирован
    if (!i18nService.isLanguageLoaded(i18nService.getCurrentLanguage())) {
      await i18nService.initialize();
    }
    
    // Фильтруем сообщения по типу экспорта
    const filteredMessages = filterMessages(messages, exportType);
    
    if (filteredMessages.length === 0) {
      console.warn('No messages to export');
      return;
    }

    // Создаем контент документа
    const content: Content[] = [];

    // Добавляем заголовок
    content.push(
      {
        text: chatTitle,
        style: 'header',
        margin: [0, 0, 0, 5]
      },
      {
        text: `${new Date().toLocaleString(i18nService.getCurrentLanguage() === 'ru' ? 'ru-RU' : 'en-US')}${exportType === 'ai-only' ? ` • ${getTranslation('pdfExportAIOnly')}` : ''}`,
        style: 'subheader',
        margin: [0, 0, 0, 20] as [number, number, number, number]
      }
    );

    // Добавляем сообщения (с учетом бранчей)
    for (let i = 0; i < filteredMessages.length; i++) {
      const message = filteredMessages[i];
      
      if (message.isUser) {
        content.push(...createUserMessageContent(message));
      } else {
        // Для AI-сообщений проверяем, есть ли бранчи
        const branches = getBranchesForMessage(filteredMessages, message.id);
        
        if (branches.length > 0) {
          // Есть бранчи - выводим основное (если не пустое) + все бранчи
          // Пропускаем пустое контейнерное сообщение
          if (message.text && message.text.trim() !== '') {
            content.push(...createAIMessageContent(message));
          }
          branches.forEach(branch => {
            content.push({ text: '', margin: [0, 5, 0, 5] }); // Меньший отступ между бранчами
            content.push(...createAIMessageContent(branch));
          });
        } else if (!message.branchId) {
          // Нет бранчей и само не является бранчем - обычный вывод
          content.push(...createAIMessageContent(message));
        }
        // Если это бранч без основного сообщения, просто выводим его
        else if (message.branchId && !filteredMessages.find(m => m.id === message.branchId)) {
          content.push(...createAIMessageContent(message));
        }
      }
      content.push({ text: '', margin: [0, 10, 0, 10] }); // Отступ между сообщениями
    }

    // Определение документа
    // Используем только Roboto, так как Courier может отсутствовать в vfs_fonts
    const docDefinition: TDocumentDefinitions = {
      content,
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          color: '#1f2937'
        },
        subheader: {
          fontSize: 10,
          color: '#6b7280'
        },
        userMessage: {
          fontSize: 11,
          background: '#f3f4f6',
          margin: [0, 5, 0, 5]
        },
        aiMessage: {
          fontSize: 11,
          margin: [0, 5, 0, 5]
        },
        badge: {
          fontSize: 9,
          color: '#6b7280',
          italics: true
        },
        code: {
          fontSize: 9,
          background: '#f9fafb'
          // Убираем font: 'Courier', используем Roboto
        }
      },
      defaultStyle: {
        font: 'Roboto' // Roboto поддерживает кириллицу
      },
      pageSize: 'A4',
      pageMargins: [40, 40, 40, 40]
    };

    // Генерируем и сохраняем PDF
    const filename = generateFilename(chatTitle);
    pdfMake.createPdf(docDefinition).download(filename);
    
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

/**
 * Фильтрует сообщения по типу экспорта
 */
function filterMessages(messages: ChatMessage[], exportType: ExportType): ChatMessage[] {
  // НЕ фильтруем branch сообщения - оставляем их для группировки
  let filtered = messages;
  
  // Если только AI сообщения
  if (exportType === 'ai-only') {
    filtered = filtered.filter(msg => !msg.isUser);
  }
  
  return filtered;
}

/**
 * Находит все бранчи для конкретного сообщения
 */
function getBranchesForMessage(messages: ChatMessage[], messageId: string): ChatMessage[] {
  return messages.filter(m => m.branchId === messageId);
}

/**
 * Создает контент для сообщения пользователя
 */
function createUserMessageContent(message: ChatMessage): Content[] {
  const content: Content[] = [];
  const attachments = getAttachments(message);

  // Page context badge
  if (message.pageContextEnabled && message.pageTitle) {
    content.push({
      text: `[${getTranslation('pdfExportPage')}: ${message.pageTitle}]`,
      style: 'badge',
      margin: [0, 0, 0, 3],
      alignment: 'right'
    });
  }

  // Action label
  if (message.actionLabel) {
    content.push({
      text: message.actionLabel,
      fontSize: 10,
      bold: true,
      color: '#16a34a',
      margin: [0, 0, 0, 3],
      alignment: 'right'
    });
  }

  // Quoted text
  if (message.quotedText) {
    content.push({
      text: cleanMarkdown(message.quotedText),
      fontSize: 10,
      color: '#6b7280',
      italics: true,
      margin: [10, 5, 0, 5],
      alignment: 'right'
    });
  }

  // Attachments badges
  const attachmentTexts: string[] = [];
  attachments.forEach(att => {
    if (att.type === 'file') {
      attachmentTexts.push(`[${getTranslation('pdfExportFile')}: ${att.name}]`);
    } else if (att.type === 'dom') {
      attachmentTexts.push(`[DOM: ${att.name}]`);
    } else if (att.type === 'tab') {
      attachmentTexts.push(`[${getTranslation('pdfExportTab')}: ${att.tabTitle || att.name}]`);
    }
  });

  if (attachmentTexts.length > 0) {
    content.push({
      text: attachmentTexts.join('  '),
      fontSize: 9,
      color: '#3730a3',
      margin: [0, 0, 0, 3],
      alignment: 'right'
    });
  }

  // Main message text
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        text: cleanMarkdown(message.text),
        fillColor: '#f3f4f6',
        margin: [10, 8, 10, 8]
      }]],
      layout: {
        defaultBorder: false,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      }
    },
    margin: [100, 0, 0, 0] as [number, number, number, number]
  } as any);

  return content;
}

/**
 * Создает контент для сообщения AI
 */
function createAIMessageContent(message: ChatMessage): Content[] {
  const content: Content[] = [];

  // Model badge
  if (message.operator && message.model) {
    content.push({
      text: `[${message.operator} - ${message.model}]`,
      style: 'badge',
      margin: [0, 0, 0, 3]
    });
  }

  // Tool executions
  if (message.toolCalls && message.toolCalls.length > 0) {
    message.toolCalls.forEach(tool => {
      content.push({
        table: {
          widths: ['*'],
          body: [[{
            text: [
              { text: `[${getTranslation('pdfExportTool')}: ${tool.toolName}]\n`, bold: true, color: '#15803d' },
              { text: tool.output ? (typeof tool.output === 'string' ? tool.output : JSON.stringify(tool.output, null, 2)) : (tool.error || getTranslation('pdfExportNoResult')), color: tool.error ? '#dc2626' : '#166534' }
            ],
            fillColor: '#f0fdf4',
            margin: [8, 6, 8, 6]
          }]],
          layout: {
            defaultBorder: false
          }
        },
        margin: [0, 3, 0, 3] as [number, number, number, number]
      } as any);
    });
  }

  // Reasoning
  if (message.reasoningContent) {
    content.push({
      table: {
        widths: ['*'],
        body: [[{
          text: [
            { text: `[${getTranslation('pdfExportReasoning')}]\n`, bold: true },
            { text: cleanMarkdown(message.reasoningContent) }
          ],
          fillColor: '#fef3c7',
          margin: [8, 6, 8, 6]
        }]],
        layout: {
          defaultBorder: false
        }
      },
      fontSize: 10,
      color: '#713f12',
      margin: [0, 3, 0, 3] as [number, number, number, number]
    } as any);
  }

  // Main response text - парсим markdown
  // Используем stack вместо text, чтобы каждая строка была отдельным элементом
  const parsedContent = parseMarkdownForPDF(message.text);
  content.push({
    stack: parsedContent,
    margin: [0, 5, 100, 5]
  });

  // Citations
  if (message.citations && message.citations.length > 0) {
    const citationParts: any[] = [
      { text: `${getTranslation('pdfExportSources')}:\n`, bold: true }
    ];
    
    message.citations.forEach((c, idx) => {
      if (idx > 0) citationParts.push({ text: '\n' });
      citationParts.push({ text: `[${idx + 1}] ${c.title} - ` });
      citationParts.push({ 
        text: c.url, 
        link: c.url,
        color: '#2563eb',
        decoration: 'underline'
      });
    });
    
    content.push({
      text: citationParts,
      fontSize: 9,
      color: '#6b7280',
      margin: [0, 5, 0, 0]
    });
  }

  // Suggested questions
  if (message.suggestedQuestions && message.suggestedQuestions.length > 0) {
    content.push({
      table: {
        widths: ['*'],
        body: [[{
          text: [
            { text: `${getTranslation('pdfExportSuggestedQuestions')}:\n`, bold: true },
            { text: message.suggestedQuestions.map(q => `• ${q}`).join('\n') }
          ],
          fillColor: '#f9fafb',
          margin: [8, 6, 8, 6]
        }]],
        layout: {
          defaultBorder: false
        }
      },
      fontSize: 10,
      margin: [0, 5, 0, 0] as [number, number, number, number]
    } as any);
  }

  return content;
}

/**
 * Получает attachments из сообщения
 */
function getAttachments(message: ChatMessage): MessageAttachment[] {
  if (message.attachments) {
    try {
      return JSON.parse(message.attachments);
    } catch (error) {
      console.error('Failed to parse attachments:', error);
    }
  }
  // Fallback to old format
  if (message.attach_type && message.attach_name) {
    return [{
      type: message.attach_type,
      name: message.attach_name,
      data: message.file_data || '',
      xpath: message.xpath
    }];
  }
  return [];
}

/**
 * Очищает текст от markdown символов (простая очистка)
 */
function cleanMarkdown(text: string): string {
  // Заменяем экранированные \n на реальные переносы
  const normalized = text.replace(/\\n/g, '\n');
  
  return normalized
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, '')) // Убираем ограничители кода
    .replace(/`([^`]+)`/g, '$1') // Инлайн код
    .replace(/\*\*([^\*]+)\*\*/g, '$1') // Жирный текст
    .replace(/\*([^\*]+)\*/g, '$1') // Курсив
    .replace(/~~([^~]+)~~/g, '$1') // Зачеркнутый
    .replace(/#+\s/g, ''); // Заголовки
}

/**
 * Парсит markdown в структурированный контент для pdfMake
 */
function parseMarkdownForPDF(text: string): any[] {
  // ВАЖНО: Заменяем экранированные \n на реальные переносы строк
  const normalizedText = text.replace(/\\n/g, '\n');
  const lines = normalizedText.split('\n');
  
  const result: any[] = [];
  let currentParagraph: string[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;
  let currentListType: 'ol' | 'ul' | null = null;
  let listItems: any[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      // Объединяем строки параграфа, сохраняя переносы
      const fullText = currentParagraph.join('\n');
      
      // Парсим весь параграф как единое целое для правильной обработки форматирования
      result.push({
        text: parseInlineMarkdown(fullText),
        margin: [0, 0, 0, 3],
        preserveLeadingSpaces: true
      });
      
      currentParagraph = [];
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      const listContent = {
        [currentListType === 'ol' ? 'ol' : 'ul']: listItems,
        margin: [0, 3, 0, 3]
      };
      result.push(listContent);
      listItems = [];
      currentListType = null;
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        result.push({
          table: {
            widths: ['*'],
            body: [[{
              text: codeLines.join('\n'),
              fontSize: 9,
              fillColor: '#f9fafb',
              margin: [6, 4, 6, 4]
              // Используем Roboto вместо Courier
            }]]
          },
          layout: {
            defaultBorder: false
          },
          margin: [0, 3, 0, 3]
        });
        codeLines = [];
      }
      inCodeBlock = !inCodeBlock;
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headers
    if (line.match(/^#{1,6}\s/)) {
      flushParagraph();
      flushList();
      const level = line.match(/^#+/)?.[0].length || 1;
      const headerText = line.replace(/^#+\s/, '');
      result.push({
        text: parseInlineMarkdown(headerText),
        fontSize: 16 - level,
        bold: true,
        margin: [0, 5, 0, 3]
      });
      continue;
    }

    // Numbered lists (1. 2. etc)
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      if (currentListType !== 'ol') {
        flushList();
        currentListType = 'ol';
        inList = true;
      }
      listItems.push(parseInlineMarkdown(numberedMatch[2]));
      continue;
    }

    // Bullet lists (*, -, +)
    const bulletMatch = line.match(/^[\*\-\+]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (currentListType !== 'ul') {
        flushList();
        currentListType = 'ul';
        inList = true;
      }
      listItems.push(parseInlineMarkdown(bulletMatch[1]));
      continue;
    }

    // Empty line - flush current content
    if (line.trim() === '') {
      if (inList) {
        // Пустая строка внутри списка - завершаем список
        flushList();
      } else {
        flushParagraph();
      }
      continue;
    }

    // Regular paragraph
    if (inList) {
      flushList();
    }
    currentParagraph.push(line);
  }

  flushParagraph();
  flushList();

  return result.length > 0 ? result : [{ text: text }];
}

/**
 * Парсит inline markdown (жирный, курсив, код, ссылки)
 */
function parseInlineMarkdown(text: string): any {
  // Если строка пустая, возвращаем пустой текст
  if (!text || text.trim() === '') {
    return { text: '' };
  }

  // Сначала обрабатываем markdown ссылки [текст](url) - заменяем на маркеры
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, linkText, url) => {
    return `__LINK_START__${linkText}__LINK_URL__${url}__LINK_END__`;
  });

  const parts: any[] = [];
  let current = '';
  let i = 0;

  while (i < text.length) {
    // Проверяем начало маркера ссылки
    if (i + 13 <= text.length && text.substring(i, i + 13) === '__LINK_START__') {
      // Сохраняем накопленный текст
      if (current) {
        parts.push(...parseTextForLinks(current));
        current = '';
      }
      
      // Ищем конец маркера ссылки
      const urlStart = text.indexOf('__LINK_URL__', i);
      const linkEnd = text.indexOf('__LINK_END__', i);
      
      if (urlStart !== -1 && linkEnd !== -1 && urlStart < linkEnd) {
        const linkText = text.substring(i + 13, urlStart);
        const url = text.substring(urlStart + 13, linkEnd);
        parts.push({ text: linkText, link: url, color: '#2563eb', decoration: 'underline' });
        i = linkEnd + 13; // Переходим после конца маркера
        continue;
      } else {
        // Если маркер поврежден, добавляем символ в current и продолжаем
        current += text[i];
        i++;
        continue;
      }
    }

    // Bold **text**
    if (text.substr(i, 2) === '**') {
      if (current) {
        parts.push(...parseTextForLinks(current));
        current = '';
      }
      const endIndex = text.indexOf('**', i + 2);
      if (endIndex !== -1) {
        const boldText = text.substring(i + 2, endIndex);
        const boldParts = parseTextForLinks(boldText);
        boldParts.forEach(part => {
          if (typeof part === 'object' && part.text) {
            part.bold = true;
          }
        });
        parts.push(...boldParts);
        i = endIndex + 2;
        continue;
      }
    }

    // Italic *text* (но не если это часть **)
    if (text[i] === '*' && text[i + 1] !== '*' && (i === 0 || text[i - 1] !== '*')) {
      if (current) {
        parts.push(...parseTextForLinks(current));
        current = '';
      }
      const endIndex = text.indexOf('*', i + 1);
      if (endIndex !== -1 && text[endIndex + 1] !== '*') {
        const italicText = text.substring(i + 1, endIndex);
        const italicParts = parseTextForLinks(italicText);
        italicParts.forEach(part => {
          if (typeof part === 'object' && part.text) {
            part.italics = true;
          }
        });
        parts.push(...italicParts);
        i = endIndex + 1;
        continue;
      }
    }

    // Inline code `text`
    if (text[i] === '`') {
      if (current) {
        parts.push(...parseTextForLinks(current));
        current = '';
      }
      const endIndex = text.indexOf('`', i + 1);
      if (endIndex !== -1) {
        parts.push({ 
          text: text.substring(i + 1, endIndex), 
          fontSize: 9,
          background: '#f9fafb'
          // Используем Roboto вместо Courier
        });
        i = endIndex + 1;
        continue;
      }
    }

    current += text[i];
    i++;
  }

  if (current) {
    parts.push(...parseTextForLinks(current));
  }

  return parts.length > 1 ? parts : (parts.length === 1 ? parts[0] : { text: text });
}

/**
 * Парсит текст и находит обычные URL (http://, https://) и маркеры ссылок
 */
function parseTextForLinks(text: string): any[] {
  const parts: any[] = [];
  let lastIndex = 0;
  
  // Сначала обрабатываем маркеры ссылок __LINK_START__...__LINK_URL__...__LINK_END__
  // Используем нежадный квантификатор для правильной обработки
  const linkMarkerRegex = /__LINK_START__([\s\S]*?)__LINK_URL__([\s\S]*?)__LINK_END__/g;
  let linkMatch: RegExpExecArray | null;
  
  while ((linkMatch = linkMarkerRegex.exec(text)) !== null) {
    // Добавляем текст до маркера
    if (linkMatch.index > lastIndex) {
      const beforeText = text.substring(lastIndex, linkMatch.index);
      parts.push(...parsePlainUrls(beforeText));
    }
    
    // Добавляем ссылку из маркера
    const linkText = linkMatch[1].trim();
    const url = linkMatch[2].trim();
    parts.push({ 
      text: linkText, 
      link: url,
      color: '#2563eb',
      decoration: 'underline'
    });
    
    lastIndex = linkMatch.index + linkMatch[0].length;
  }
  
  // Добавляем оставшийся текст (обрабатываем обычные URL)
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    parts.push(...parsePlainUrls(remainingText));
  }

  return parts.length > 0 ? parts : [{ text: text }];
}

/**
 * Парсит обычные URL в тексте
 */
function parsePlainUrls(text: string): any[] {
  const urlRegex = /(https?:\/\/[^\s\)]+)/g;
  const parts: any[] = [];
  let lastIndex = 0;
  let urlMatch: RegExpExecArray | null;

  while ((urlMatch = urlRegex.exec(text)) !== null) {
    // Добавляем текст до ссылки
    if (urlMatch.index > lastIndex) {
      parts.push({ text: text.substring(lastIndex, urlMatch.index) });
    }
    
    // Добавляем ссылку
    const url = urlMatch[1];
    parts.push({ 
      text: url, 
      link: url,
      color: '#2563eb',
      decoration: 'underline'
    });
    
    lastIndex = urlMatch.index + url.length;
  }

  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    parts.push({ text: text.substring(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ text: text }];
}

/**
 * Генерирует имя файла для PDF
 */
function generateFilename(chatTitle: string): string {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  // Очищаем название чата от недопустимых символов
  const cleanTitle = chatTitle.replace(/[<>:"/\\|?*]/g, '-');
  
  return `${cleanTitle} - ${day}.${month}.${year}.pdf`;
}

