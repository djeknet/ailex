/**
 * Capability types for site prompts
 */
export type SitePromptCapability = 'context' | 'search' | 'vision' | 'transcribe_youtube';

/**
 * Individual site prompt with text and capabilities
 */
export interface SitePrompt {
  text: string;
  textKey?: string; // Ключ локализации
  capabilities: SitePromptCapability[];
}

/**
 * Page type configuration with selectors and prompts
 */
export interface PageType {
  selectors: string[];
  urlPattern?: string; // Regex pattern or substring to match URL path
  prompts: SitePrompt[];
}

/**
 * Site configuration with category and page types
 */
export interface SiteConfig {
  category: string;
  pageTypes: Record<string, PageType>;
}

/**
 * Complete site prompts configuration
 * Keys are domain names (e.g., "amazon.com", "youtube.com")
 */
export type SitePromptsConfig = Record<string, SiteConfig>;

/**
 * Detected page information
 */
export interface DetectedPage {
  domain: string;
  pageType: string;
  prompts: SitePrompt[];
  category: string;
}

