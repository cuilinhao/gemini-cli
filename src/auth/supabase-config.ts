import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

// 获取当前会话
export async function getSession(): Promise<{ user: AuthUser | null; session: Session | null }> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return { user: null, session: null };
    }

    if (!session?.user) {
      return { user: null, session: null };
    }

    const user: AuthUser = {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
      image: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
    };

    return { user, session };
  } catch (error) {
    console.error('Session error:', error);
    return { user: null, session: null };
  }
}

// 使用Google登录
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/app`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('Google sign in error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Google sign in failed:', error);
    throw error;
  }
}

// 使用GitHub登录
export async function signInWithGitHub() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/app`,
      },
    });

    if (error) {
      console.error('GitHub sign in error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('GitHub sign in failed:', error);
    throw error;
  }
}

// 登出
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Sign out failed:', error);
    throw error;
  }
}

// 监听认证状态变化
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      const user: AuthUser = {
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.name || session.user.user_metadata?.full_name,
        image: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
      };
      callback(user);
    } else {
      callback(null);
    }
  });
  
  return subscription;
}