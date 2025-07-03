'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Mail, Key, User } from 'lucide-react';
import { signInWithGoogle, signInWithGitHub, getSession } from '@/auth/supabase-config';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { user } = await getSession();
      if (user) {
        router.push('/app');
      }
    };
    checkSession();
  }, [router]);

  const handleSignIn = async (providerId: string) => {
    setLoading(true);
    try {
      if (providerId === 'google') {
        await signInWithGoogle();
      } else if (providerId === 'github') {
        await signInWithGitHub();
      }
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrialMode = () => {
    // For trial mode, we can store a flag in localStorage
    localStorage.setItem('trialMode', 'true');
    router.push('/app');
  };

  const getProviderIcon = (providerId: string) => {
    switch (providerId) {
      case 'google':
      case 'google-one-tap':
        return <Mail className="w-4 h-4" />;
      case 'github':
        return <Github className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getProviderName = (provider: any) => {
    switch (provider.id) {
      case 'google':
        return 'Continue with Google';
      case 'github':
        return 'Continue with GitHub';
      case 'google-one-tap':
        return 'Google One Tap';
      default:
        return `Continue with ${provider.name}`;
    }
  };

  const providers = [
    { id: 'google', name: 'Google' },
    { id: 'github', name: 'GitHub' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Key className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Gemini CLI</CardTitle>
          <CardDescription>
            Sign in to access your AI programming assistant
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Auth Providers */}
          {providers.map((provider: any) => (
            <Button
              key={provider.id}
              variant="outline"
              className="w-full"
              onClick={() => handleSignIn(provider.id)}
              disabled={loading}
            >
              {getProviderIcon(provider.id)}
              <span className="ml-2">{getProviderName(provider)}</span>
            </Button>
          ))}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Trial Mode */}
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleTrialMode}
            disabled={loading}
          >
            <Key className="w-4 h-4 mr-2" />
            Try without signing in
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>
              Trial mode includes limited features.{' '}
              <span className="font-medium">1000 tokens/day</span> with Gemini Flash.
            </p>
          </div>

          {/* Features List */}
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground">What you'll get:</h4>
            <ul className="space-y-1">
              <li>• AI-powered code assistance</li>
              <li>• Script generation with /script commands</li>
              <li>• PDF document analysis</li>
              <li>• Monaco code editor with syntax highlighting</li>
              <li>• File tree management</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
