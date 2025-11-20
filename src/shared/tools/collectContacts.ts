import { Tool } from '@shared/types/tools';
import { getTranslation } from '@shared/i18n/useTranslation';

export const collectContactsTool: Tool = {
  id: 'collect-contacts',
  name: 'Collect contacts',
  description: 'Collect contacts from a page',
  nameKey: 'tool_collectContacts',
  descriptionKey: 'tool_collectContacts_desc',
  icon: '📧',
  command: '/contacts',
  urlPattern: undefined, // Works on all websites
  isBuiltIn: true,
  systemInstructions: 'IMPORTANT: First, you MUST ask the user: 1) What type of contacts to collect (all/email/phone/telegram)? 2) In what format to return (text/json/csv)? Only after receiving the answers, call this tool with the specified parameters. When you receive the result from the tool, return it AS IS without any modifications or reformatting - the result is already properly formatted with markdown code blocks.',
  
  parameters: {
    type: 'object',
    properties: {
      contactType: {
        type: 'string',
        description: 'The type of contacts to collect. The user MUST specify explicitly.',
        enum: ['all', 'email', 'phone', 'telegram']
      },
      format: {
        type: 'string',
        description: 'The format to return the contacts in. The user MUST specify explicitly.',
        enum: ['text', 'json', 'csv']
      }
    },
    required: ['contactType', 'format']
  },

  async execute(params: { tabId: number; contactType?: string; format?: string }) {
    try {
      // Get page content using executeDOMFunction
      const { executeDOMFunction } = await import('@shared/services/toolExecutor');
      
      // Get text content from page
      const pageContent = await executeDOMFunction('getText', undefined, params.tabId);
      
      console.log('[collectContacts] Page content type:', typeof pageContent);
      console.log('[collectContacts] Page content length:', pageContent?.length);
      console.log('[collectContacts] Page content preview:', pageContent?.substring(0, 200));

      if (!pageContent || typeof pageContent !== 'string' || pageContent.trim().length === 0) {
        return getTranslation('pageContentNotAvailable');
      }

      const contactType = params.contactType || 'all';
      const format = params.format || 'text';

      // Extract contacts using regex
      const contacts = extractContacts(pageContent, contactType);

      const totalCount = Object.values(contacts).reduce((sum: number, arr: any) => sum + arr.length, 0);

      console.log('[collectContacts] Found contacts:', contacts);
      console.log('[collectContacts] Total count:', totalCount);

      if (totalCount === 0) {
        return getTranslation('contactsNotFoundType').replace('{type}', contactType);
      }

      // Format results
      const formattedResult = formatContacts(contacts, format);

      return `${getTranslation('contactsFoundCount').replace('{count}', totalCount.toString())}\n\n${formattedResult}`;
    } catch (error) {
      console.error('Error in collect contacts tool:', error);
      const errorMsg = error instanceof Error ? error.message : getTranslation('unknownError');
      return `${getTranslation('errorCollectingContacts')}: ${errorMsg}`;
    }
  }
};

function extractContacts(content: string, type: string) {
  const contacts: any = {
    emails: [],
    phones: [],
    telegrams: []
  };

  if (type === 'all' || type === 'email') {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = content.match(emailRegex);
    if (emailMatches) {
      contacts.emails = [...new Set(emailMatches)];
    }
  }

  if (type === 'all' || type === 'phone') {
    const phoneRegex = /(?:\+?(\d{1,3}))?[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    const phoneMatches = content.match(phoneRegex);
    if (phoneMatches) {
      // Filter out false positives (numbers that are too short or dates)
      const validPhones = phoneMatches.filter(phone => {
        const digits = phone.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      });
      contacts.phones = [...new Set(validPhones)];
    }
  }

  if (type === 'all' || type === 'telegram') {
    const telegramRegex = /@([a-zA-Z0-9_]{5,32})|t\.me\/([a-zA-Z0-9_]{5,32})/g;
    const telegramMatches = content.matchAll(telegramRegex);
    const telegrams = [];
    for (const match of telegramMatches) {
      telegrams.push(match[1] || match[2]);
    }
    contacts.telegrams = [...new Set(telegrams)];
  }

  return contacts;
}

function formatContacts(contacts: any, format: string): string {
  if (format === 'json') {
    // Wrap JSON in markdown code block
    return '```json\n' + JSON.stringify(contacts, null, 2) + '\n```';
  }

  if (format === 'csv') {
    // Wrap CSV in markdown code block
    let csv = 'Type,Value\n';
    contacts.emails?.forEach((email: string) => {
      csv += `Email,${email}\n`;
    });
    contacts.phones?.forEach((phone: string) => {
      csv += `Phone,${phone}\n`;
    });
    contacts.telegrams?.forEach((telegram: string) => {
      csv += `Telegram,@${telegram}\n`;
    });
    return '```csv\n' + csv + '```';
  }

  // text format - use markdown list
  let text = '';
  if (contacts.emails?.length > 0) {
    text += '**Emails:**\n';
    contacts.emails.forEach((email: string) => {
      text += `- ${email}\n`;
    });
    text += '\n';
  }
  if (contacts.phones?.length > 0) {
    text += '**Phones:**\n';
    contacts.phones.forEach((phone: string) => {
      text += `- ${phone}\n`;
    });
    text += '\n';
  }
  if (contacts.telegrams?.length > 0) {
    text += '**Telegram:**\n';
    contacts.telegrams.forEach((t: string) => {
      text += `- @${t}\n`;
    });
    text += '\n';
  }
  return text;
}

