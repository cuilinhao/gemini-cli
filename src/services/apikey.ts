import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { encrypt, decrypt, isValidApiKey } from '@/lib/encryption';

export function getApiKey(req: Request) {
  const auth = req.headers.get("Authorization");
  if (!auth) {
    return "";
  }

  return auth.replace("Bearer ", "");
}

export class ApiKeyService {
  // Store encrypted API key for user
  static async storeApiKey(userEmail: string, apiKey: string): Promise<boolean> {
    try {
      if (!isValidApiKey(apiKey)) {
        throw new Error('Invalid Google API key format');
      }

      const encryptedKey = encrypt(apiKey);
      
      const result = await db
        .update(users)
        .set({ api_key_enc: encryptedKey })
        .where(eq(users.email, userEmail));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error storing API key:', error);
      throw error;
    }
  }

  // Get decrypted API key for user
  static async getApiKey(userEmail: string): Promise<string | null> {
    try {
      const [user] = await db
        .select({ api_key_enc: users.api_key_enc })
        .from(users)
        .where(eq(users.email, userEmail));
      
      if (!user?.api_key_enc) {
        return null;
      }

      return decrypt(user.api_key_enc);
    } catch (error) {
      console.error('Error retrieving API key:', error);
      return null;
    }
  }

  // Check if user has API key
  static async hasApiKey(userEmail: string): Promise<boolean> {
    try {
      const [user] = await db
        .select({ api_key_enc: users.api_key_enc })
        .from(users)
        .where(eq(users.email, userEmail));
      
      return !!user?.api_key_enc;
    } catch (error) {
      console.error('Error checking API key:', error);
      return false;
    }
  }

  // Delete API key for user
  static async deleteApiKey(userEmail: string): Promise<boolean> {
    try {
      const result = await db
        .update(users)
        .set({ api_key_enc: null })
        .where(eq(users.email, userEmail));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting API key:', error);
      throw error;
    }
  }

  // Validate API key format
  static validateApiKeyFormat(apiKey: string): { valid: boolean; error?: string } {
    if (!apiKey) {
      return { valid: false, error: 'API key is required' };
    }

    if (!isValidApiKey(apiKey)) {
      return { valid: false, error: 'Invalid Google API key format. Should start with "AIza" and be 39 characters long.' };
    }

    return { valid: true };
  }

  // Test API key by making a simple request
  static async testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const validation = this.validateApiKeyFormat(apiKey);
      if (!validation.valid) {
        return validation;
      }

      // TODO: Implement actual Google API test call
      // For now, just validate format
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Failed to validate API key' };
    }
  }
}
