// Storage service for Chrome Storage API

export interface StorageData {
  [key: string]: any;
}

// Sync storage operations (settings, small data)
export async function getSyncStorage<T = any>(keys?: string | string[]): Promise<T> {
  return new Promise((resolve) => {
    if (keys) {
      chrome.storage.sync.get(keys, (result) => {
        resolve(result as T);
      });
    } else {
      chrome.storage.sync.get(null, (result) => {
        resolve(result as T);
      });
    }
  });
}

export async function setSyncStorage(data: StorageData): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function removeSyncStorage(keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// Local storage operations (larger data, caching)
export async function getLocalStorage<T = any>(keys?: string | string[]): Promise<T> {
  return new Promise((resolve) => {
    if (keys) {
      chrome.storage.local.get(keys, (result) => {
        resolve(result as T);
      });
    } else {
      chrome.storage.local.get(null, (result) => {
        resolve(result as T);
      });
    }
  });
}

export async function setLocalStorage(data: StorageData): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function removeLocalStorage(keys: string | string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

export async function clearLocalStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => {
      resolve();
    });
  });
}

// Cache models for operators
export async function cacheModels(operator: string, models: any[]): Promise<void> {
  console.log(`[storageService] Caching ${models.length} models for ${operator}`);
  await setLocalStorage({
    [`models_${operator}`]: {
      data: models,
      timestamp: Date.now()
    }
  });
  console.log(`[storageService] Models cached successfully for ${operator}`);
}

export async function getCachedModels(operator: string): Promise<any[] | null> {
  console.log(`[storageService] Getting cached models for ${operator}`);
  const result = await getLocalStorage<StorageData>([`models_${operator}`]);
  const cached = result[`models_${operator}`];
  
  if (!cached) {
    console.log(`[storageService] No cached models found for ${operator}`);
    return null;
  }
  
  console.log(`[storageService] Found cached models for ${operator}:`, {
    count: cached.data?.length || 0,
    timestamp: new Date(cached.timestamp).toISOString()
  });
  
  // Cache expiration: 24 hours
  const CACHE_DURATION = 24 * 60 * 60 * 1000;
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    console.log(`[storageService] Cache expired for ${operator}, removing`);
    await removeLocalStorage([`models_${operator}`]);
    return null;
  }
  
  return cached.data;
}

