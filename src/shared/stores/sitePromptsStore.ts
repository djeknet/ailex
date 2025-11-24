import { create } from 'zustand';
import { SitePrompt, DetectedPage } from '@shared/types/sitePrompts';
import { getPromptsForUrl } from '@shared/utils/sitePrompts';

interface SitePromptsStore {
  currentSitePrompts: SitePrompt[] | null;
  currentDomain: string | null;
  currentPageType: string | null;
  currentCategory: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadPromptsForUrl: (url: string, tabId?: number) => Promise<void>;
  clearPrompts: () => void;
  setError: (error: string | null) => void;
}

export const useSitePromptsStore = create<SitePromptsStore>((set) => ({
  currentSitePrompts: null,
  currentDomain: null,
  currentPageType: null,
  currentCategory: null,
  isLoading: false,
  error: null,

  loadPromptsForUrl: async (url: string, tabId?: number) => {
    set({ isLoading: true, error: null });
    
    try {
      console.log('[sitePromptsStore] Loading prompts for URL:', url);
      
      const detectedPage: DetectedPage | null = await getPromptsForUrl(url, tabId);
      
      if (detectedPage) {
        console.log('[sitePromptsStore] Found prompts:', {
          domain: detectedPage.domain,
          pageType: detectedPage.pageType,
          category: detectedPage.category,
          promptsCount: detectedPage.prompts.length
        });
        
        set({
          currentSitePrompts: detectedPage.prompts,
          currentDomain: detectedPage.domain,
          currentPageType: detectedPage.pageType,
          currentCategory: detectedPage.category,
          isLoading: false
        });
      } else {
        console.log('[sitePromptsStore] No prompts found for URL:', url);
        
        set({
          currentSitePrompts: null,
          currentDomain: null,
          currentPageType: null,
          currentCategory: null,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('[sitePromptsStore] Error loading prompts:', error);
      
      set({
        currentSitePrompts: null,
        currentDomain: null,
        currentPageType: null,
        currentCategory: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  clearPrompts: () => {
    set({
      currentSitePrompts: null,
      currentDomain: null,
      currentPageType: null,
      currentCategory: null,
      error: null
    });
  },

  setError: (error: string | null) => {
    set({ error });
  }
}));

