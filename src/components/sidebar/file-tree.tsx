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
        <FolderOpen className="w-4 h-4 text-blue-500" />
      ) : (
        <Folder className="w-4 h-4 text-blue-500" />
      );
    }

    // File type icons based on extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        return <File className="w-4 h-4 text-yellow-500" />;
      case 'py':
        return <File className="w-4 h-4 text-blue-600" />;
      case 'html':
        return <File className="w-4 h-4 text-orange-500" />;
      case 'css':
      case 'scss':
        return <File className="w-4 h-4 text-pink-500" />;
      case 'json':
        return <File className="w-4 h-4 text-green-500" />;
      case 'md':
        return <File className="w-4 h-4 text-gray-600" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
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
              className={`flex items-center px-2 py-1 hover:bg-muted cursor-pointer group ${
                isActive ? 'bg-muted' : ''
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
                  className="w-4 h-4 p-0 mr-1"
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
                    className="ml-2 h-6 text-sm"
                    autoFocus
                  />
                ) : (
                  <span className="ml-2 text-sm truncate">{file.name}</span>
                )}
              </div>
            </div>
          </ContextMenuTrigger>
          
          <ContextMenuContent>
            {file.type === 'folder' && (
              <>
                <ContextMenuItem onClick={() => onFileCreate?.(file, 'file')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => onFileCreate?.(file, 'folder')}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Folder
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => startEditing(file)}>
              <Edit3 className="w-4 h-4 mr-2" />
              Rename
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onFileDelete?.(file)}
              className="text-destructive"
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
    <div className={`${className}`}>
      <div className="flex items-center justify-between p-2 border-b">
        <h3 className="font-semibold text-sm">Explorer</h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFileCreate?.(null, 'file')}
            className="w-6 h-6 p-0"
          >
            <Plus className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFileCreate?.(null, 'folder')}
            className="w-6 h-6 p-0"
          >
            <Folder className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="overflow-auto">
        {files.map((file) => renderFileNode(file))}
      </div>
    </div>
  );
}