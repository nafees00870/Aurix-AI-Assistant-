/**
 * ApiKeyManager module
 * Manages client-side persistence and real-time verification of the user's
 * Google Gemini API key in localStorage, removing the requirement to edit .env files.
 */

export const AURIX_API_KEY_STORAGE = 'aurix_user_gemini_api_key';

export class ApiKeyManager {
  private static instance: ApiKeyManager;

  public static getInstance(): ApiKeyManager {
    if (!ApiKeyManager.instance) {
      ApiKeyManager.instance = new ApiKeyManager();
    }
    return ApiKeyManager.instance;
  }

  public getApiKey(): string {
    try {
      return localStorage.getItem(AURIX_API_KEY_STORAGE)?.trim() || '';
    } catch {
      return '';
    }
  }

  public hasApiKey(): boolean {
    return Boolean(this.getApiKey());
  }

  public setApiKey(key: string): void {
    try {
      const clean = key.trim();
      if (clean) {
        localStorage.setItem(AURIX_API_KEY_STORAGE, clean);
      } else {
        localStorage.removeItem(AURIX_API_KEY_STORAGE);
      }
    } catch (e) {
      console.warn('[ApiKeyManager] Failed to persist key:', e);
    }
  }

  public clearApiKey(): void {
    try {
      localStorage.removeItem(AURIX_API_KEY_STORAGE);
    } catch (e) {
      console.warn('[ApiKeyManager] Failed to clear key:', e);
    }
  }

  /**
   * Performs an instant validation check with the backend to verify the API key is active.
   */
  public async verifyApiKey(key: string): Promise<{ valid: boolean; message?: string; error?: string }> {
    const cleanKey = key.trim();
    if (!cleanKey) {
      return { valid: false, error: 'API key cannot be empty' };
    }

    try {
      const res = await fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cleanKey }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        return {
          valid: false,
          error: data.error || `Verification failed (HTTP ${res.status})`,
        };
      }

      return { valid: true, message: data.message || 'Key verified!' };
    } catch (err: any) {
      return {
        valid: false,
        error: err?.message || 'Network error verifying API key',
      };
    }
  }
}

export const apiKeyManager = ApiKeyManager.getInstance();
