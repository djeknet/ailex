import { Theme, SupportedLanguage } from './common';
import { AIOperatorConfig } from './ai';

export type { AIOperatorConfig, AIOperator } from './ai';
export type HistoryMode = 'all' | 'per-site' | 'session';
export type PageContextType = 'text' | 'dom' | 'html';
export type ResponseTone = 'professional' | 'friendly' | 'direct' | 'confident' | 'casual';

export interface Instruction {
  id: string;
  name: string;
  domain: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExtensionSettings {
  theme: Theme;
  colorScheme?: 'green' | 'blue' | 'neutral' | 'orange' | 'red' | 'rose' | 'violet' | 'yellow'; // Color scheme
  fontFamily?: 'system' | 'urbanist' | 'jetbrains-mono' | 'ibm-plex-sans' | 'manrope' | 'ubuntu-sans'; // Font family
  language: SupportedLanguage;
  historyMode: HistoryMode;
  operators: AIOperatorConfig[];
  personalInfo?: PersonalInfo;
  generalInstruction?: string;
  instructions: Instruction[];
  showAISuggestions: boolean; // Show AI-generated follow-up questions in responses
  showSiteWidget: boolean; // Show site widget with context-aware prompts
  maxFileSize?: number; // Maximum file size in MB (default: 10)
  maxImageSize?: number; // Maximum image size in MB (default: 5)
  developerMode?: boolean; // Enable developer mode with API logs panel
  autoDeletionDays?: number; // Auto-delete chats older than N days (default: 30)
}

export interface PersonalInfo {
  // Basic info
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  
  // Location
  country?: string;
  state?: string; // State/Province/Region
  city?: string;
  address?: string;
  addressLine2?: string; // Apartment, suite, unit, floor, etc.
  zipCode?: string;
  
  // Professional
  position?: string;
  company?: string;
  workPhone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  resumeUrl?: string;
  orcid?: string;
  
  // Social
  telegram?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
  
  // Personal
  about?: string;
  
  // Sensitive data (encrypted)
  dateOfBirth?: string; // encrypted
  idNumber?: string; // encrypted (passport/ID)
  driverLicense?: string; // encrypted
  healthInsurance?: string; // encrypted
}

export interface UIState {
  activeView: 'chat' | 'settings' | 'history' | 'help' | 'tools';
  isLoading: boolean;
  activeModal?: string;
}

// Tab reference for @ mentions
export interface TabReference {
  id: number; // Chrome tab ID
  title: string;
  url: string;
  favicon?: string;
}

