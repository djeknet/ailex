import { Tool } from '@shared/types/tools';

export const collectContactsTool: Tool = {
  id: 'collect-contacts',
  name: 'Собрать контакты',
  description: 'Собирает email, телефоны или telegram со страницы',
  icon: '📧',

  async execute(params: { tabId: number; contactType?: string; format?: string }) {
    try {
      // Get page content
      const response = await chrome.tabs.sendMessage(params.tabId, {
        type: 'GET_PAGE_CONTEXT',
        data: { type: 'text' }
      });

      if (!response.success) {
        throw new Error('Failed to get page content');
      }

      const pageContent = response.data;
      const contactType = params.contactType || 'all';
      const format = params.format || 'text';

      // Extract contacts using regex
      const contacts = extractContacts(pageContent, contactType);

      // Format results
      const formattedResult = formatContacts(contacts, format);

      return {
        success: true,
        contacts,
        formatted: formattedResult,
        count: Object.values(contacts).reduce((sum: number, arr: any) => sum + arr.length, 0)
      };
    } catch (error) {
      console.error('Error in collect contacts tool:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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
    return JSON.stringify(contacts, null, 2);
  }

  if (format === 'csv') {
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
    return csv;
  }

  // text format
  let text = '';
  if (contacts.emails?.length > 0) {
    text += 'Emails:\n' + contacts.emails.join('\n') + '\n\n';
  }
  if (contacts.phones?.length > 0) {
    text += 'Phones:\n' + contacts.phones.join('\n') + '\n\n';
  }
  if (contacts.telegrams?.length > 0) {
    text += 'Telegram:\n' + contacts.telegrams.map((t: string) => '@' + t).join('\n') + '\n\n';
  }
  return text;
}

