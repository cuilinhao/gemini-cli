'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type AuthUser } from '@/auth/supabase-config';
import { ChevronLeft, ChevronRight, Play, Settings, FileText, MessageSquare, Upload, X, BarChart3, Terminal, Search, GitBranch, Bell, Maximize2, Minimize2, MoreHorizontal, Folder, Code, Zap, Sparkles, Bot, Monitor, Database, Cloud, Lock, Palette, Copy, Check } from 'lucide-react';
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

export default function LandingPage() {
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
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);

  // Check authentication and trial mode
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { user } = await getSession();
        setSession(user);
        setLoading(false);

        // 默认启用试用模式，除非用户已登录或明确禁用
        const trialMode = localStorage.getItem('trialMode');
        const disableTrialMode = localStorage.getItem('disableTrialMode') === 'true';
        
        if (!user && !disableTrialMode) {
          // 默认启用试用模式
          setIsTrialMode(true);
          localStorage.setItem('trialMode', 'true');
          
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
              content: `欢迎使用 Gemini CLI！🎉

当前处于试用模式，你可以：
• 每日 50 次请求
• 每日 1000 tokens  
• 使用 Gemini 1.5 Flash 模型
• 代码辅助和脚本生成
• Monaco 代码编辑器

试用模式功能有限。登录 Google 或 GitHub 账户可解锁完整功能！

请问有什么编程问题我可以帮助你解决吗？`
            }]);
          }
        } else if (user) {
          // 用户已登录，禁用试用模式
          setIsTrialMode(false);
          localStorage.removeItem('trialMode');
        } else if (!user && disableTrialMode) {
          // 用户明确禁用试用模式且未登录，跳转到登录页
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

  const handleCopyMessage = async (content: string, messageIndex: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageIndex(messageIndex);
      // 2秒后重置复制状态
      setTimeout(() => {
        setCopiedMessageIndex(null);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
      // 降级方案：创建临时文本域
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedMessageIndex(messageIndex);
        setTimeout(() => {
          setCopiedMessageIndex(null);
        }, 2000);
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
      }
      document.body.removeChild(textArea);
    }
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
    <div className="h-screen flex flex-col overflow-hidden bg-[#0d1117] text-white">
      {/* Professional Header Bar */}
      <div className="h-12 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4 relative">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[#f78166] to-[#ea6045] rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Gemini CLI</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
              <Folder className="w-4 h-4 mr-1" />
              <span className="text-xs">Explorer</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
              <Search className="w-4 h-4 mr-1" />
              <span className="text-xs">Search</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
              <GitBranch className="w-4 h-4 mr-1" />
              <span className="text-xs">Source</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
              <Bot className="w-4 h-4 mr-1" />
              <span className="text-xs">AI</span>
            </Button>
          </div>
        </div>

        {/* Center Section - Project Info */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
          <div className="bg-[#21262d] px-3 py-1 rounded-md border border-[#30363d]">
            <span className="text-xs text-[#7d8590]">AI思维导图生成MVP</span>
          </div>
          {isTrialMode && (
            <div className="bg-gradient-to-r from-[#f78166] to-[#ea6045] px-2 py-1 rounded-md">
              <span className="text-xs font-medium text-white">Trial Mode</span>
            </div>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
            <Bell className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-[#7d8590] hover:text-white hover:bg-[#21262d]" onClick={() => router.push('/usage')}>
            <BarChart3 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-[#7d8590] hover:text-white hover:bg-[#21262d]" onClick={() => router.push('/settings')}>
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Modern Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 bg-[#161b22] border-r border-[#30363d] flex flex-col overflow-hidden`}>
          {/* Sidebar Header */}
          <div className="h-10 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#7d8590]" />
              <span className="text-xs font-medium text-[#e6edf3]">Explorer</span>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-[#30363d]" onClick={() => setSidebarCollapsed(true)}>
                <ChevronLeft className="w-3 h-3 text-[#7d8590]" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-[#30363d]">
                <MoreHorizontal className="w-3 h-3 text-[#7d8590]" />
              </Button>
            </div>
          </div>

          {/* Project Section */}
          <div className="p-4 border-b border-[#30363d]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gradient-to-br from-[#f78166] to-[#ea6045] rounded-sm"></div>
                <span className="text-sm font-medium text-[#e6edf3]">AI思维导图生成MVP</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-[#30363d]">
                <ChevronRight className="w-3 h-3 text-[#7d8590]" />
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" className="h-8 justify-start text-[#7d8590] hover:text-white hover:bg-[#21262d]">
                <Code className="w-3 h-3 mr-2" />
                <span className="text-xs">New File</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 justify-start text-[#7d8590] hover:text-white hover:bg-[#21262d]">
                <Folder className="w-3 h-3 mr-2" />
                <span className="text-xs">New Folder</span>
              </Button>
            </div>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-y-auto">
            <FileTree
              files={fileTree}
              activeFile={activeFile}
              onFileSelect={handleFileSelect}
              onFileCreate={handleFileCreate}
              onFileDelete={handleFileDelete}
              onFileRename={handleFileRename}
              className="h-full bg-[#161b22] text-white"
            />
          </div>
        </div>

        {/* Collapsed Sidebar Button */}
        {sidebarCollapsed && (
          <div className="w-12 bg-[#161b22] border-r border-[#30363d] flex flex-col items-center py-4 gap-4">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#21262d]" onClick={() => setSidebarCollapsed(false)}>
              <Folder className="w-4 h-4 text-[#7d8590]" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#21262d]">
              <Search className="w-4 h-4 text-[#7d8590]" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-[#21262d]">
              <GitBranch className="w-4 h-4 text-[#7d8590]" />
            </Button>
          </div>
        )}

        {/* Modern Editor Area */}
        <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
          {/* Editor Header with Tabs */}
          <div className="h-10 bg-[#161b22] border-b border-[#30363d] flex items-center">
            <Tabs value={activeFile} onValueChange={setActiveFile} className="flex-1">
              <TabsList className="h-10 bg-transparent border-0 rounded-none justify-start p-0">
                {files.map((file) => (
                  <TabsTrigger 
                    key={file} 
                    value={file} 
                    className="h-10 px-4 border-r border-[#30363d] rounded-none bg-transparent data-[state=active]:bg-[#0d1117] data-[state=active]:text-white text-[#7d8590] hover:text-white hover:bg-[#21262d] transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-sm"></div>
                      <span className="text-xs">{file}</span>
                      <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 hover:bg-[#30363d]">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </TabsTrigger>
                ))}
                <Button variant="ghost" size="sm" className="h-10 px-2 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
                  <span className="text-lg">+</span>
                </Button>
              </TabsList>
            </Tabs>
            
            <div className="flex items-center gap-2 px-4">
              <Button variant="ghost" size="sm" className="h-6 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
                <Maximize2 className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 relative bg-[#0d1117]">
            <Tabs value={activeFile} className="h-full">
              <TabsContent value={activeFile} className="h-full m-0 border-0">
                <MonacoEditor
                  value={getFileContent(activeFile)}
                  onChange={(value) => handleFileChange(activeFile, value || '')}
                  language={getLanguageFromFile(activeFile)}
                  height="100%"
                  options={{
                    fontSize: 13,
                    lineHeight: 20,
                    fontFamily: "'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace",
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    roundedSelection: false,
                    renderLineHighlight: 'line',
                    cursorStyle: 'line',
                    automaticLayout: true,
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Modern Terminal */}
          <div className={`${terminalCollapsed ? 'h-0' : 'h-40'} transition-all duration-300 bg-[#0d1117] border-t border-[#30363d] overflow-hidden`}>
            <div className="h-8 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Terminal className="w-3 h-3 text-[#7d8590]" />
                <span className="text-xs text-[#e6edf3]">Terminal</span>
                <div className="flex items-center gap-1 ml-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-[#30363d]" onClick={() => setTerminalCollapsed(true)}>
                  <Minimize2 className="w-3 h-3 text-[#7d8590]" />
                </Button>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-[#30363d]">
                  <MoreHorizontal className="w-3 h-3 text-[#7d8590]" />
                </Button>
              </div>
            </div>
            <div className="flex-1 bg-[#0d1117] p-4 font-mono text-sm overflow-y-auto">
              <div className="text-[#58a6ff]">
                <span className="text-[#7c3aed]">➜</span>
                <span className="text-[#39d353] ml-2">gemini-cli</span>
                <span className="text-[#f78166] ml-2">git:(main)</span>
                <span className="text-[#e6edf3] ml-2">npm run dev</span>
              </div>
              <div className="text-[#39d353] mt-2">
                ✓ Ready in 772ms
              </div>
              <div className="text-[#7d8590] mt-1">
                - Local: http://localhost:3001
              </div>
              <div className="text-[#7d8590]">
                - Network: http://192.168.1.2:3001
              </div>
              <div className="text-[#58a6ff] mt-2 animate-pulse">
                <span className="text-[#7c3aed]">➜</span>
                <span className="text-[#39d353] ml-2">gemini-cli</span>
                <span className="text-[#f78166] ml-2">git:(main)</span>
                <span className="ml-2">_</span>
              </div>
            </div>
          </div>

          {/* Terminal Toggle */}
          {terminalCollapsed && (
            <div className="h-8 bg-[#161b22] border-t border-[#30363d] flex items-center px-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTerminalCollapsed(false)}
                className="h-6 text-[#7d8590] hover:text-white hover:bg-[#21262d]"
              >
                <Terminal className="w-3 h-3 mr-2" />
                <span className="text-xs">Terminal</span>
              </Button>
            </div>
          )}
        </div>

        {/* Modern AI Chat Panel */}
        <div className="w-96 bg-[#161b22] border-l border-[#30363d] flex flex-col overflow-hidden">
          {/* Chat Header */}
          <div className="h-12 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] rounded-lg flex items-center justify-center">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <span className="text-xs font-medium text-[#e6edf3]">AI Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-[#30363d]">
                    <Upload className="w-3 h-3 text-[#7d8590]" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-[#21262d] border-[#30363d] text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Upload PDF Document</DialogTitle>
                  </DialogHeader>
                  <FileDropZone onFileProcessed={handleFileProcessed} />
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-[#30363d]">
                <MoreHorizontal className="w-3 h-3 text-[#7d8590]" />
              </Button>
            </div>
          </div>

          {/* Model & Settings Section */}
          <div className="p-4 border-b border-[#30363d] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#7d8590]">Model</span>
              <div className="flex items-center gap-1">
                <Monitor className="w-3 h-3 text-[#39d353]" />
                <span className="text-xs text-[#39d353]">Online</span>
              </div>
            </div>
            
            <Select 
              value={selectedModel} 
              onValueChange={setSelectedModel}
              disabled={isTrialMode}
            >
              <SelectTrigger className="w-full bg-[#0d1117] border-[#30363d] text-white">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent className="bg-[#21262d] border-[#30363d]">
                <SelectItem value="gemini-1.5-pro" disabled={isTrialMode} className="text-white hover:bg-[#30363d]">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-blue-400" />
                    <span>Gemini 1.5 Pro</span>
                    {isTrialMode && <Lock className="w-3 h-3 text-[#7d8590]" />}
                  </div>
                </SelectItem>
                <SelectItem value="gemini-1.5-flash" className="text-white hover:bg-[#30363d]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-orange-400" />
                    <span>Gemini 1.5 Flash</span>
                    {isTrialMode && <span className="text-xs text-orange-400">(Trial)</span>}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Enhanced Trial Usage Indicator */}
            {isTrialMode && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#7d8590]">Trial Usage</span>
                  <div className="flex items-center gap-1">
                    <Database className="w-3 h-3 text-orange-400" />
                    <span className="text-xs text-orange-400">Limited</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#7d8590]">Requests</span>
                    <span className="text-[#e6edf3]">45/50</span>
                  </div>
                  <div className="w-full bg-[#21262d] rounded-full h-1">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 h-1 rounded-full" style={{width: '90%'}}></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#7d8590]">Tokens</span>
                    <span className="text-[#e6edf3]">850/1000</span>
                  </div>
                  <div className="w-full bg-[#21262d] rounded-full h-1">
                    <div className="bg-gradient-to-r from-green-500 to-yellow-500 h-1 rounded-full" style={{width: '85%'}}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0d1117]">
            {messages.map((msg, index) => (
              <div key={index} className="flex gap-3">
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 bg-gradient-to-br from-[#7c3aed] to-[#a855f7] rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="w-6 h-6 bg-[#39d353] rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-semibold text-white">U</span>
                  </div>
                )}
                <div className={`flex-1 p-3 rounded-lg relative group ${
                  msg.role === 'user' 
                    ? 'bg-[#1f2937] border border-[#374151]' 
                    : 'bg-[#161b22] border border-[#30363d]'
                }`}>
                  <div className="text-sm text-[#e6edf3] whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </div>
                  
                  {/* 复制按钮 - 只在 AI 消息中显示 */}
                  {msg.role === 'assistant' && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-[#30363d] text-[#7d8590] hover:text-white"
                        onClick={() => handleCopyMessage(msg.content, index)}
                        title={copiedMessageIndex === index ? "已复制!" : "复制消息"}
                      >
                        {copiedMessageIndex === index ? (
                          <Check className="w-3 h-3 text-green-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Enhanced Input Area */}
          <div className="p-4 border-t border-[#30363d] bg-[#161b22]">
            <div className="space-y-3">
              <div className="relative">
                <Textarea
                  placeholder="Ask Gemini anything... Use /script for bash commands"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[80px] bg-[#0d1117] border-[#30363d] text-white placeholder-[#7d8590] resize-none pr-12"
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
                <div className="absolute bottom-3 right-3 flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-[#30363d]">
                    <Palette className="w-3 h-3 text-[#7d8590]" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
                    <Code className="w-3 h-3 mr-1" />
                    <span className="text-xs">/script</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-[#7d8590] hover:text-white hover:bg-[#21262d]">
                    <Upload className="w-3 h-3 mr-1" />
                    <span className="text-xs">Upload</span>
                  </Button>
                </div>
                
                <Button 
                  onClick={() => {
                    if (message.startsWith('/script ')) {
                      handleScriptCommand();
                    } else {
                      handleSendMessage();
                    }
                  }} 
                  size="sm"
                  className="h-7 bg-gradient-to-r from-[#f78166] to-[#ea6045] hover:from-[#ea6045] hover:to-[#dc3626] text-white border-0"
                  disabled={!message.trim()}
                >
                  {message.startsWith('/script ') ? (
                    <>
                      <Code className="w-3 h-3 mr-1" />
                      Generate
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 mr-1" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
