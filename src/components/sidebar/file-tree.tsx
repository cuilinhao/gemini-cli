'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, File, Folder, FolderOpen, Plus, Trash2, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger,
  ContextMenuSeparator 
} from '@/components/ui/context-menu';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  path?: string;
}

interface FileTreeProps {
  files: FileNode[];
  activeFile?: string;
  onFileSelect: (file: FileNode) => void;
  onFileCreate?: (parent: FileNode | null, type: 'file' | 'folder') => void;
  onFileDelete?: (file: FileNode) => void;
  onFileRename?: (file: FileNode, newName: string) => void;
  className?: string;
}

export default function FileTree({
  files,
  activeFile,
  onFileSelect,
  onFileCreate,
  onFileDelete,
  onFileRename,
  className = ''
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const startEditing = (file: FileNode) => {
    setEditingFile(file.id);
    setEditingName(file.name);
  };

  const finishEditing = (file: FileNode) => {
    if (editingName.trim() && editingName !== file.name) {
      onFileRename?.(file, editingName.trim());
    }
    setEditingFile(null);
    setEditingName('');
  };

  const cancelEditing = () => {
    setEditingFile(null);
    setEditingName('');
  };

  const getFileIcon = (file: FileNode) => {
    if (file.type === 'folder') {
      return expandedFolders.has(file.id) ? (
        <FolderOpen className="w-4 h-4 text-[#58a6ff]" />
      ) : (
        <Folder className="w-4 h-4 text-[#58a6ff]" />
      );
    }

    // File type icons based on extension with GitHub theme colors
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return <File className="w-4 h-4 text-[#f7df1e]" />; // JavaScript yellow
      case 'ts':
      case 'tsx':
        return <File className="w-4 h-4 text-[#3178c6]" />; // TypeScript blue
      case 'py':
        return <File className="w-4 h-4 text-[#3776ab]" />; // Python blue
      case 'html':
        return <File className="w-4 h-4 text-[#e34c26]" />; // HTML orange
      case 'css':
      case 'scss':
        return <File className="w-4 h-4 text-[#1572b6]" />; // CSS blue
      case 'json':
        return <File className="w-4 h-4 text-[#39d353]" />; // JSON green
      case 'md':
        return <File className="w-4 h-4 text-[#7d8590]" />; // Markdown gray
      case 'go':
        return <File className="w-4 h-4 text-[#00add8]" />; // Go cyan
      case 'rs':
        return <File className="w-4 h-4 text-[#ce422b]" />; // Rust orange
      case 'java':
        return <File className="w-4 h-4 text-[#ed8b00]" />; // Java orange
      case 'php':
        return <File className="w-4 h-4 text-[#777bb4]" />; // PHP purple
      default:
        return <File className="w-4 h-4 text-[#7d8590]" />; // Default gray
    }
  };

  const renderFileNode = (file: FileNode, depth: number = 0) => {
    const isExpanded = expandedFolders.has(file.id);
    const isActive = activeFile === file.id;
    const isEditing = editingFile === file.id;

    return (
      <div key={file.id}>
        <ContextMenu>
          <ContextMenuTrigger>
            <div
              className={`flex items-center px-2 py-1 hover:bg-[#21262d] cursor-pointer group transition-colors rounded-sm mx-1 ${
                isActive ? 'bg-[#21262d] text-[#e6edf3]' : 'text-[#e6edf3]'
              }`}
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
              onClick={() => {
                if (file.type === 'folder') {
                  toggleFolder(file.id);
                } else {
                  onFileSelect(file);
                }
              }}
            >
              {file.type === 'folder' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-4 h-4 p-0 mr-1 hover:bg-[#30363d] text-[#7d8590]"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(file.id);
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </Button>
              )}
              
              <div className="flex items-center flex-1 min-w-0">
                {getFileIcon(file)}
                
                {isEditing ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => finishEditing(file)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        finishEditing(file);
                      } else if (e.key === 'Escape') {
                        cancelEditing();
                      }
                    }}
                    className="ml-2 h-6 text-sm bg-[#0d1117] border-[#30363d] text-[#e6edf3]"
                    autoFocus
                  />
                ) : (
                  <span className="ml-2 text-sm truncate">{file.name}</span>
                )}
              </div>
            </div>
          </ContextMenuTrigger>
          
          <ContextMenuContent className="bg-[#21262d] border-[#30363d]">
            {file.type === 'folder' && (
              <>
                <ContextMenuItem 
                  onClick={() => onFileCreate?.(file, 'file')}
                  className="text-[#e6edf3] hover:bg-[#30363d] focus:bg-[#30363d]"
                >
                  <Plus className="w-4 h-4 mr-2 text-[#39d353]" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem 
                  onClick={() => onFileCreate?.(file, 'folder')}
                  className="text-[#e6edf3] hover:bg-[#30363d] focus:bg-[#30363d]"
                >
                  <Plus className="w-4 h-4 mr-2 text-[#58a6ff]" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-[#30363d]" />
              </>
            )}
            <ContextMenuItem 
              onClick={() => startEditing(file)}
              className="text-[#e6edf3] hover:bg-[#30363d] focus:bg-[#30363d]"
            >
              <Edit3 className="w-4 h-4 mr-2 text-[#f78166]" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onFileDelete?.(file)}
              className="text-[#f85149] hover:bg-[#30363d] focus:bg-[#30363d]"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>

        {file.type === 'folder' && isExpanded && file.children && (
          <div>
            {file.children.map((child) => renderFileNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`${className} bg-[#161b22] text-[#e6edf3]`}>
      <div className="overflow-auto h-full py-2">
        {files.map((file) => renderFileNode(file))}
      </div>
    </div>
  );
}