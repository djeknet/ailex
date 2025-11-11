import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Chat, ChatMessage, ChatFolder, Statistics, ApiLogEntry } from '@shared/types/database';

interface AiLexDB extends DBSchema {
  chats: {
    key: string;
    value: Chat;
    indexes: { 'by-site': string; 'by-updated': number };
  };
  history: {
    key: string;
    value: ChatMessage;
    indexes: { 'by-chat': string; 'by-created': number };
  };
  folders: {
    key: string;
    value: ChatFolder;
    indexes: { 'by-created': number };
  };
  statistics: {
    key: string;
    value: Statistics;
    indexes: { 'by-date': string; 'by-operator': string };
  };
  apiLogs: {
    key: string;
    value: ApiLogEntry;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'ailex-db';
const DB_VERSION = 2; // Увеличиваем версию для добавления новой таблицы

let dbInstance: IDBPDatabase<AiLexDB> | null = null;

async function getDB(): Promise<IDBPDatabase<AiLexDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<AiLexDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Chats store
      if (!db.objectStoreNames.contains('chats')) {
        const chatsStore = db.createObjectStore('chats', { keyPath: 'id' });
        chatsStore.createIndex('by-site', 'site');
        chatsStore.createIndex('by-updated', 'updatedAt');
      }

      // History store
      if (!db.objectStoreNames.contains('history')) {
        const historyStore = db.createObjectStore('history', { keyPath: 'id' });
        historyStore.createIndex('by-chat', 'chatId');
        historyStore.createIndex('by-created', 'createdAt');
      }

      // Folders store
      if (!db.objectStoreNames.contains('folders')) {
        const foldersStore = db.createObjectStore('folders', { keyPath: 'id' });
        foldersStore.createIndex('by-created', 'createdAt');
      }

      // Statistics store
      if (!db.objectStoreNames.contains('statistics')) {
        const statsStore = db.createObjectStore('statistics', { keyPath: 'id' });
        statsStore.createIndex('by-date', 'date');
        statsStore.createIndex('by-operator', 'operator');
      }

      // API Logs store (developer mode)
      if (!db.objectStoreNames.contains('apiLogs')) {
        const apiLogsStore = db.createObjectStore('apiLogs', { keyPath: 'id' });
        apiLogsStore.createIndex('by-timestamp', 'timestamp');
      }
    }
  });

  return dbInstance;
}

// Chats operations
export async function createChat(chat: Chat): Promise<void> {
  const db = await getDB();
  try {
    await db.add('chats', chat);
  } catch (error) {
    // If chat already exists, update it instead
    if (error instanceof Error && error.name === 'ConstraintError') {
      console.warn('[dbService] Chat already exists, updating instead:', chat.id);
      await db.put('chats', chat);
    } else {
      throw error;
    }
  }
}

export async function getChat(id: string): Promise<Chat | undefined> {
  const db = await getDB();
  return await db.get('chats', id);
}

export async function getChatsBySite(site: string): Promise<Chat[]> {
  const db = await getDB();
  return await db.getAllFromIndex('chats', 'by-site', site);
}

export async function getAllChats(): Promise<Chat[]> {
  const db = await getDB();
  const chats = await db.getAll('chats');
  return chats.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function updateChat(chat: Chat): Promise<void> {
  const db = await getDB();
  await db.put('chats', chat);
}

export async function deleteChat(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('chats', id);
  // Also delete all messages from this chat
  const messages = await getMessagesByChat(id);
  for (const msg of messages) {
    await deleteMessage(msg.id);
  }
}

// History operations
export async function addMessage(message: ChatMessage): Promise<void> {
  const db = await getDB();
  await db.add('history', message);
}

export async function getMessage(id: string): Promise<ChatMessage | undefined> {
  const db = await getDB();
  return await db.get('history', id);
}

export async function getMessagesByChat(chatId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex('history', 'by-chat', chatId);
  return messages.sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateMessage(messageId: string, updates: Partial<ChatMessage>): Promise<void> {
  const db = await getDB();
  const existingMessage = await db.get('history', messageId);
  
  if (!existingMessage) {
    throw new Error(`Message with id ${messageId} not found`);
  }
  
  const updatedMessage = { ...existingMessage, ...updates };
  await db.put('history', updatedMessage);
}

export async function deleteMessage(messageId: string): Promise<void> {
  const db = await getDB();
  await db.delete('history', messageId);
}

export async function deleteAllHistory(): Promise<void> {
  const db = await getDB();
  await db.clear('history');
  await db.clear('chats');
}

// Folders operations
export async function createFolder(folder: ChatFolder): Promise<void> {
  const db = await getDB();
  await db.add('folders', folder);
}

export async function getAllFolders(): Promise<ChatFolder[]> {
  const db = await getDB();
  const folders = await db.getAll('folders');
  return folders.sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateFolder(folder: ChatFolder): Promise<void> {
  const db = await getDB();
  await db.put('folders', folder);
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('folders', id);
}

// Statistics operations
export async function addStatistics(stats: Statistics): Promise<void> {
  const db = await getDB();
  const existing = await db.get('statistics', stats.id);
  
  if (existing) {
    // Update existing statistics
    existing.totalTokens += stats.totalTokens;
    existing.inputTokens += stats.inputTokens;
    existing.outputTokens += stats.outputTokens;
    existing.messageCount += stats.messageCount;
    await db.put('statistics', existing);
  } else {
    await db.add('statistics', stats);
  }
}

export async function getStatisticsByDate(date: string): Promise<Statistics[]> {
  const db = await getDB();
  return await db.getAllFromIndex('statistics', 'by-date', date);
}

export async function getStatisticsByOperator(operator: string): Promise<Statistics[]> {
  const db = await getDB();
  return await db.getAllFromIndex('statistics', 'by-operator', operator);
}

export async function getAllStatistics(): Promise<Statistics[]> {
  const db = await getDB();
  return await db.getAll('statistics');
}

export async function getStatisticsByDateRange(
  startDate: string, 
  endDate: string,
  operator?: string
): Promise<Statistics[]> {
  const db = await getDB();
  const allStats = await db.getAll('statistics');
  
  return allStats.filter(stat => {
    const dateMatch = stat.date >= startDate && stat.date <= endDate;
    const operatorMatch = !operator || stat.operator === operator;
    return dateMatch && operatorMatch;
  });
}

// API Logs operations (developer mode)
export async function addApiLog(log: ApiLogEntry): Promise<void> {
  const db = await getDB();
  await db.add('apiLogs', log);
  
  // Автоматически удалять старые логи если их больше 200
  const allLogs = await db.getAllFromIndex('apiLogs', 'by-timestamp');
  if (allLogs.length > 200) {
    // Удаляем самые старые логи
    const logsToDelete = allLogs.slice(0, allLogs.length - 200);
    for (const oldLog of logsToDelete) {
      await db.delete('apiLogs', oldLog.id);
    }
  }
}

export async function getApiLogs(limit: number = 100): Promise<ApiLogEntry[]> {
  const db = await getDB();
  const logs = await db.getAllFromIndex('apiLogs', 'by-timestamp');
  // Сортируем по времени (новые первые) и берем только указанное количество
  return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

export async function clearApiLogs(): Promise<void> {
  const db = await getDB();
  await db.clear('apiLogs');
}
