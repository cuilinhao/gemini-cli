'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Key, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const response = await fetch('/api/user/api-key');
      if (response.ok) {
        const data = await response.json();
        setHasApiKey(data.hasApiKey);
      }
    } catch (error) {
      console.error('Error checking API key:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setHasApiKey(true);
        setApiKey('');
        toast.success('API key saved successfully');
      } else {
        toast.error(data.error || 'Failed to save API key');
      }
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!confirm('Are you sure you want to delete your API key? This will disable AI features.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/user/api-key', {
        method: 'DELETE',
      });

      if (response.ok) {
        setHasApiKey(false);
        setApiKey('');
        toast.success('API key deleted successfully');
      } else {
        toast.error('Failed to delete API key');
      }
    } catch (error) {
      toast.error('Failed to delete API key');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and API configuration
        </p>
      </div>

      {/* API Key Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Google API Key
          </CardTitle>
          <CardDescription>
            Configure your Google API key to use Gemini models. Your key is encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasApiKey ? (
            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  API key is configured and ready to use. You can now chat with Gemini models.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDeleteApiKey}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete API Key
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No API key configured. You can use trial mode with limited functionality, or add your own Google API key for full access.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="apiKey">Google API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="AIza..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get your API key from{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Google Cloud Console
                  </a>
                </p>
              </div>

              <Button
                onClick={handleSaveApiKey}
                disabled={loading || !apiKey.trim()}
                className="w-full"
              >
                {loading ? 'Saving...' : 'Save API Key'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trial Mode Info */}
      {!hasApiKey && (
        <Card>
          <CardHeader>
            <CardTitle>Trial Mode</CardTitle>
            <CardDescription>
              You can use Gemini CLI in trial mode with limited functionality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Model:</span>
                <span className="font-medium">Gemini 1.5 Flash</span>
              </div>
              <div className="flex justify-between">
                <span>Daily token limit:</span>
                <span className="font-medium">1,000 tokens</span>
              </div>
              <div className="flex justify-between">
                <span>File upload:</span>
                <span className="font-medium">Disabled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}