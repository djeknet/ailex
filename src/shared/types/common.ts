export type Theme = 'light' | 'dark' | 'system';
export type SupportedLanguage = 'en' | 'ru';
export type UUID = string;
export type Timestamp = number;

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

