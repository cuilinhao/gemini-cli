'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type AuthUser } from '@/auth/supabase-config';
import { ChevronLeft, ChevronRight, Play, Settings, FileText, MessageSquare, Upload, X, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MonacoEditor from '@/components/editor/monaco-editor';
import FileDropZone from '@/components/file-upload/file-drop-zone';
import FileTree, { type FileNode } from '@/components/sidebar/file-tree';
import TrialUsageIndicator from '@/components/ui/trial-usage-indicator';
import type { PDFParseResult } from '@/lib/pdf-parser';

export default function AppPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-pro');
  const [message, setMessage] = useState('');
  const [mobileView, setMobileView] = useState<'files' | 'editor' | 'chat'>('editor');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [fileTree, setFileTree] = useState<FileNode[]>([
    {
      id: 'main.py',
      name: 'main.py',
      type: 'file',
      path: 'main.py'
    },
    {
      id: 'utils.py',
      name: 'utils.py',
      type: 'file',
      path: 'utils.py'
    },
    {
      id: 'README.md',
      name: 'README.md',
      type: 'file',
      path: 'README.md'
    },
    {
      id: 'src',
      name: 'src',
      type: 'folder',
      children: [
        {
          id: 'src/components',
          name: 'components',
          type: 'folder',
          children: [
            {
              id: 'src/components/Button.tsx',
              name: 'Button.tsx',
              type: 'file',
              path: 'src/components/Button.tsx'
            }
          ]
        },
        {
          id: 'src/utils',
          name: 'utils',
          type: 'folder',
          children: [
            {
              id: 'src/utils/helpers.ts',
              name: 'helpers.ts',
              type: 'file',
              path: 'src/utils/helpers.ts'
            }
          ]
        }
      ]
    }
  ]);
  const [files, setFiles] = useState(['main.py', 'utils.py', 'README.md']);
  const [activeFile, setActiveFile] = useState('main.py');
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Hello! I\'m your AI coding assistant. How can I help you today?' }
  ]);
  const [fileContents, setFileContents] = useState<Record<string, string>>({
    'main.py': '# Welcome to Gemini CLI\nprint("Hello, World!")\n\n# Your Python code here',
    'utils.py': '# Utility functions\n\ndef helper_function():\n    """A helpful utility function"""\n    return "This is a helper"',
    'README.md': '# Project Title\n\nThis is your project description.\n\n## Getting Started\n\n1. Install dependencies\n2. Run the application\n3. Start coding!',
    'src/components/Button.tsx': 'import React from "react";\n\ninterface ButtonProps {\n  children: React.ReactNode;\n  onClick?: () => void;\n}\n\nexport const Button: React.FC<ButtonProps> = ({ children, onClick }) => {\n  return (\n    <button onClick={onClick} className="btn">\n      {children}\n    </button>\n  );\n};',
    'src/utils/helpers.ts': 'export function formatDate(date: Date): string {\n  return date.toLocaleDateString();\n}\n\nexport function capitalize(str: string): string {\n  return str.charAt(0).toUpperCase() + str.slice(1);\n}'
  });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [trialUserId, setTrialUserId] = useState<string | null>(null);

  // Check authentication and trial mode
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user } = await getSession();
        setSession(user);
        setLoading(false);

        const trialMode = localStorage.getItem('trialMode');
        if (trialMode === 'true') {
          setIsTrialMode(true);
          
          // Generate or get trial user ID
          let userId = localStorage.getItem('trialUserId');
          if (!userId) {
            // Generate trial user ID (simplified - could use browser fingerprinting)
            userId = `trial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('trialUserId', userId);
          }
          setTrialUserId(userId);
          
          // Force flash model for trial users
          setSelectedModel('gemini-1.5-flash');
          
          // Add welcome message for trial users
          if (messages.length === 1) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Welcome to Gemini CLI Trial Mode! 🎉

You have access to:
• 50 requests per day
• 1000 tokens per day  
• Gemini 1.5 Flash model
• Code assistance and script generation
• Monaco code editor

Some features are limited in trial mode. Sign in with Google or GitHub to unlock unlimited usage and all features!

Try asking me to help with your code or use /script to generate bash scripts!`
            }]);
          }
        } else if (!user) {
          router.push('/auth/signin');
          return;
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, messages.length]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    // Add loading message
    const loadingMessage = { role: 'assistant', content: '...' };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          model: selectedModel,
          userId: isTrialMode ? trialUserId : session?.email,
          isTrialMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                assistantResponse += parsed.chunk;
                // Update the last message
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantResponse
                  };
                  return newMessages;
                });
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        };
        return newMessages;
      });
    }
  };

  const handleFileProcessed = (result: PDFParseResult) => {
    setUploadDialogOpen(false);
    
    // Auto-send file content for summarization
    const summarizePrompt = `Please analyze and summarize this PDF document:\n\n${result.text}`;
    
    const userMessage = { role: 'user', content: `📄 Uploaded: ${result.metadata?.title || 'PDF Document'}` };
    setMessages(prev => [...prev, userMessage]);
    
    // Send for AI processing
    handleAIResponse(summarizePrompt);
  };

  const handleAIResponse = async (prompt: string) => {
    // Add loading message
    const loadingMessage = { role: 'assistant', content: '...' };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: prompt,
          model: selectedModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let assistantResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                assistantResponse += parsed.chunk;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: assistantResponse
                  };
                  return newMessages;
                });
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing the file. Please try again.'
        };
        return newMessages;
      });
    }
  };

  const handleScriptCommand = async () => {
    if (!message.trim() || !message.startsWith('/script ')) return;

    const command = message.slice(8).trim(); // Remove '/script ' prefix
    if (!command) return;

    const userMessage = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    // Add loading message
    const loadingMessage = { role: 'assistant', content: 'Generating script...' };
    setMessages(prev => [...prev, loadingMessage]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Generate a bash script for: ${command}`,
          model: 'gemini-1.5-flash', // Use flash for faster script generation
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate script');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      let scriptResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.chunk) {
                scriptResponse += parsed.chunk;
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: `Here's your bash script:\n\n\`\`\`bash\n${scriptResponse}\n\`\`\``
                  };
                  return newMessages;
                });
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Script generation error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          role: 'assistant',
          content: 'Sorry, I encountered an error generating the script. Please try again.'
        };
        return newMessages;
      });
    }
  };

  const getFileContent = (filename: string): string => {
    return fileContents[filename] || '';
  };

  const handleFileChange = (filename: string, content: string) => {
    setFileContents(prev => ({
      ...prev,
      [filename]: content
    }));
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'file' && file.path) {
      setActiveFile(file.path);
      // Ensure file content exists
      if (!fileContents[file.path]) {
        setFileContents(prev => ({
          ...prev,
          [file.path!]: `// ${file.name}\n// New file content`
        }));
      }
    }
  };

  const handleFileCreate = (parent: FileNode | null, type: 'file' | 'folder') => {
    const newName = type === 'file' ? 'untitled.txt' : 'New Folder';
    const parentPath = parent?.id || '';
    const newPath = parentPath ? `${parentPath}/${newName}` : newName;
    
    const newNode: FileNode = {
      id: newPath,
      name: newName,
      type,
      path: type === 'file' ? newPath : undefined,
      children: type === 'folder' ? [] : undefined
    };

    // Add to file tree (simplified - would need proper tree manipulation)
    console.log('Create file/folder:', newNode);
  };

  const handleFileDelete = (file: FileNode) => {
    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      // Remove from file tree and contents
      if (file.path) {
        setFileContents(prev => {
          const newContents = { ...prev };
          delete newContents[file.path!];
          return newContents;
        });
      }
      console.log('Delete file:', file);
    }
  };

  const handleFileRename = (file: FileNode, newName: string) => {
    // Update file tree and potentially file contents key
    console.log('Rename file:', file, 'to:', newName);
  };

  const getLanguageFromFile = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py': return 'python';
      case 'js': return 'javascript';
      case 'ts': return 'typescript';
      case 'tsx': return 'typescript';
      case 'jsx': return 'javascript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'scss': return 'scss';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'yml':
      case 'yaml': return 'yaml';
      case 'xml': return 'xml';
      case 'sql': return 'sql';
      case 'sh': return 'shell';
      case 'bash': return 'shell';
      case 'go': return 'go';
      case 'rs': return 'rust';
      case 'php': return 'php';
      case 'rb': return 'ruby';
      case 'java': return 'java';
      case 'c': return 'c';
      case 'cpp':
      case 'cc':
      case 'cxx': return 'cpp';
      case 'cs': return 'csharp';
      default: return 'plaintext';
    }
  };

  // Show loading screen during authentication check
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-0 md:w-0' : 'w-64 md:w-64'} transition-all duration-300 bg-muted/50 border-r overflow-hidden hidden md:block`}>
        <FileTree
          files={fileTree}
          activeFile={activeFile}
          onFileSelect={handleFileSelect}
          onFileCreate={handleFileCreate}
          onFileDelete={handleFileDelete}
          onFileRename={handleFileRename}
          className="h-full"
        />
      </div>

      {/* Mobile File Tree */}
      <div className={`${mobileView === 'files' ? 'block' : 'hidden'} md:hidden fixed inset-0 z-40 bg-background pt-12`}>
        <FileTree
          files={fileTree}
          activeFile={activeFile}
          onFileSelect={(file) => {
            handleFileSelect(file);
            setMobileView('editor');
          }}
          onFileCreate={handleFileCreate}
          onFileDelete={handleFileDelete}
          onFileRename={handleFileRename}
          className="h-full"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 border-b bg-background flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
            <span className="text-sm font-medium">Gemini CLI</span>
            {isTrialMode && (
              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                Trial Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {session && (
              <Button variant="ghost" size="sm" onClick={() => router.push('/usage')}>
                <BarChart3 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => router.push('/settings')}>
              <Settings className="w-4 h-4" />
            </Button>
            {session && (
              <Button variant="ghost" size="sm" onClick={() => router.push('/auth/signin')}>
                Sign Out
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex relative">
          {/* Mobile Navigation */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b h-12 flex items-center justify-between px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileView('files')}
              className={mobileView === 'files' ? 'bg-accent' : ''}
            >
              <FileText className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileView('editor')}
                className={mobileView === 'editor' ? 'bg-accent' : ''}
              >
                <span className="text-sm font-medium">Gemini CLI</span>
              </Button>
              {isTrialMode && (
                <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                  Trial
                </span>
              )}
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowMobileChat(true)}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          </div>

          {/* Editor Pane */}
          <div className={`${mobileView === 'editor' ? 'flex' : 'hidden'} md:flex flex-1 flex-col md:mt-0 mt-12`}>
            {/* File Tabs */}
            <Tabs value={activeFile} onValueChange={setActiveFile} className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-10">
                {files.map((file) => (
                  <TabsTrigger key={file} value={file} className="px-4 py-2 text-sm">
                    {file}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {/* Editor Content */}
              <div className="flex-1 relative">
                <TabsContent value={activeFile} className="h-full m-0 p-0">
                  <MonacoEditor
                    value={getFileContent(activeFile)}
                    onChange={(value) => handleFileChange(activeFile, value || '')}
                    language={getLanguageFromFile(activeFile)}
                    height="100%"
                  />
                </TabsContent>
              </div>
            </Tabs>

            {/* Terminal Toggle Button */}
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTerminalCollapsed(!terminalCollapsed)}
                className="w-full justify-start"
              >
                <Play className="w-4 h-4 mr-2" />
                {terminalCollapsed ? 'Show Terminal' : 'Hide Terminal'}
              </Button>
            </div>

            {/* Terminal */}
            <div className={`${terminalCollapsed ? 'h-0' : 'h-32'} transition-all duration-300 border-t overflow-hidden`}>
              <div className="h-full bg-black text-green-400 p-4 font-mono text-sm overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span>Terminal</span>
                </div>
                <div>$ waiting for commands...</div>
              </div>
            </div>
          </div>

          {/* Chat Pane */}
          <div className="w-80 border-l flex-col bg-background hidden md:flex">
            {/* Chat Header */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">AI Assistant</h3>
                <div className="flex items-center gap-2">
                  <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Upload className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Upload PDF Document</DialogTitle>
                      </DialogHeader>
                      <FileDropZone onFileProcessed={handleFileProcessed} />
                    </DialogContent>
                  </Dialog>
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-3">
                <Select 
                  value={selectedModel} 
                  onValueChange={setSelectedModel}
                  disabled={isTrialMode}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-1.5-pro" disabled={isTrialMode}>
                      Gemini 1.5 Pro {isTrialMode && '(Requires API Key)'}
                    </SelectItem>
                    <SelectItem value="gemini-1.5-flash">
                      Gemini 1.5 Flash {isTrialMode && '(Trial Mode)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Trial Usage Indicator */}
                <TrialUsageIndicator 
                  userId={trialUserId || ''} 
                  isTrialMode={isTrialMode}
                />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg max-w-full ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground ml-4' 
                      : 'bg-muted mr-4'
                  }`}
                >
                  <div className="text-sm">{msg.content}</div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex flex-col gap-2">
                <Textarea
                  placeholder="Type your message or use /script for commands..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[60px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (message.startsWith('/script ')) {
                        handleScriptCommand();
                      } else {
                        handleSendMessage();
                      }
                    }
                  }}
                />
                <Button 
                  onClick={() => {
                    if (message.startsWith('/script ')) {
                      handleScriptCommand();
                    } else {
                      handleSendMessage();
                    }
                  }} 
                  className="w-full"
                >
                  {message.startsWith('/script ') ? 'Generate Script' : 'Send'}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Chat Modal */}
          {showMobileChat && (
            <div className="md:hidden fixed inset-0 z-50 bg-background">
              {/* Mobile Chat Header */}
              <div className="h-12 border-b bg-background flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">AI Assistant</h3>
                  {isTrialMode && (
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                      Trial Mode
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileChat(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Mobile Chat Content */}
              <div className="flex flex-col h-full pt-12">
                {/* Model Selection */}
                <div className="p-4 border-b space-y-3">
                  <Select 
                    value={selectedModel} 
                    onValueChange={setSelectedModel}
                    disabled={isTrialMode}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-1.5-pro" disabled={isTrialMode}>
                        Gemini 1.5 Pro {isTrialMode && '(Requires API Key)'}
                      </SelectItem>
                      <SelectItem value="gemini-1.5-flash">
                        Gemini 1.5 Flash {isTrialMode && '(Trial Mode)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Trial Usage Indicator */}
                  <TrialUsageIndicator 
                    userId={trialUserId || ''} 
                    isTrialMode={isTrialMode}
                  />
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg max-w-full ${
                        msg.role === 'user' 
                          ? 'bg-primary text-primary-foreground ml-4' 
                          : 'bg-muted mr-4'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  ))}
                </div>

                {/* Mobile Chat Input */}
                <div className="p-4 border-t bg-background">
                  <div className="flex flex-col gap-2">
                    <Textarea
                      placeholder="Type your message or use /script for commands..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (message.startsWith('/script ')) {
                            handleScriptCommand();
                          } else {
                            handleSendMessage();
                          }
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Upload PDF Document</DialogTitle>
                          </DialogHeader>
                          <FileDropZone onFileProcessed={handleFileProcessed} />
                        </DialogContent>
                      </Dialog>
                      <Button 
                        onClick={() => {
                          if (message.startsWith('/script ')) {
                            handleScriptCommand();
                          } else {
                            handleSendMessage();
                          }
                        }} 
                        className="flex-1"
                      >
                        {message.startsWith('/script ') ? 'Generate Script' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}