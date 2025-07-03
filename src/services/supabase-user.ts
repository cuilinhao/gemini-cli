import { supabase } from '@/lib/supabase';
import { encrypt, decrypt } from '@/lib/encryption';
import type { Database } from '@/lib/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export class SupabaseUserService {
  // 获取或创建用户profile
  static async getOrCreateProfile(userId: string, email: string): Promise<Profile> {
    try {
      // 首先尝试获取现有profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (existingProfile) {
        return existingProfile;
      }

      // 如果不存在，创建新的profile
      const { data: newProfile, error } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        throw new Error('Failed to create user profile');
      }

      return newProfile;
    } catch (error) {
      console.error('Error getting or creating profile:', error);
      throw new Error('Failed to get or create profile');
    }
  }

  // 更新用户profile
  static async updateProfile(
    userId: string,
    updates: Partial<{
      nickname: string;
      avatar_url: string;
      locale: string;
    }>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating profile:', error);
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }
  }

  // 设置API密钥
  static async setApiKey(userId: string, apiKey: string): Promise<void> {
    try {
      const encryptedKey = encrypt(apiKey);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          api_key_enc: encryptedKey,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error setting API key:', error);
        throw new Error('Failed to set API key');
      }
    } catch (error) {
      console.error('Error setting API key:', error);
      throw new Error('Failed to set API key');
    }
  }

  // 获取API密钥
  static async getApiKey(userId: string): Promise<string | null> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('api_key_enc')
        .eq('id', userId)
        .single();

      if (!profile?.api_key_enc) {
        return null;
      }

      return decrypt(profile.api_key_enc);
    } catch (error) {
      console.error('Error getting API key:', error);
      return null;
    }
  }

  // 检查用户是否有API密钥
  static async hasApiKey(userId: string): Promise<boolean> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('api_key_enc')
        .eq('id', userId)
        .single();

      return !!profile?.api_key_enc;
    } catch (error) {
      console.error('Error checking API key:', error);
      return false;
    }
  }

  // 删除API密钥
  static async removeApiKey(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          api_key_enc: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) {
        console.error('Error removing API key:', error);
        throw new Error('Failed to remove API key');
      }
    } catch (error) {
      console.error('Error removing API key:', error);
      throw new Error('Failed to remove API key');
    }
  }

  // 获取用户统计信息
  static async getUserInfo(userId: string): Promise<{
    profile: Profile;
    hasApiKey: boolean;
    joinDate: string;
  }> {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!profile) {
        throw new Error('Profile not found');
      }

      return {
        profile,
        hasApiKey: !!profile.api_key_enc,
        joinDate: profile.created_at || new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw new Error('Failed to get user info');
    }
  }
}