'use client';

import { Editor } from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface MonacoEditorProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  height?: string;
  options?: any;
}

export default function MonacoEditor({
  value = '',
  onChange,
  language = 'javascript',
  height = '100%',
  options = {},
}: MonacoEditorProps) {
  // Force dark theme for our professional interface
  const [editorTheme, setEditorTheme] = useState('gemini-dark');

  useEffect(() => {
    setEditorTheme('gemini-dark');
  }, []);

  const defaultOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    wordWrap: 'on' as const,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    renderWhitespace: 'selection' as const,
    tabSize: 2,
    insertSpaces: true,
    folding: true,
    lineNumbers: 'on' as const,
    glyphMargin: false,
    contextmenu: true,
    mouseWheelZoom: true,
    smoothScrolling: true,
    cursorBlinking: 'smooth' as const,
    cursorSmoothCaretAnimation: true,
    ...options,
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Configure custom themes
    monaco.editor.defineTheme('gemini-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'F97583' },
        { token: 'string', foreground: '9ECBFF' },
        { token: 'number', foreground: '79B8FF' },
      ],
      colors: {
        'editor.background': '#0D1117',
        'editor.foreground': '#C9D1D9',
        'editorLineNumber.foreground': '#484F58',
        'editorLineNumber.activeForeground': '#C9D1D9',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#264F7840',
      },
    });

    monaco.editor.defineTheme('gemini-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'D73A49' },
        { token: 'string', foreground: '032F62' },
        { token: 'number', foreground: '005CC5' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#24292E',
        'editorLineNumber.foreground': '#1B1F23',
        'editorLineNumber.activeForeground': '#24292E',
        'editor.selectionBackground': '#3392FF44',
      },
    });

    // Set the custom dark theme
    monaco.editor.setTheme('gemini-dark');

    // Add custom key bindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Handle save action
      console.log('Save command triggered');
    });

    // Focus editor
    editor.focus();
  };

  return (
    <Editor
      height={height}
      language={language}
      value={value}
      onChange={onChange}
      theme="gemini-dark"
      options={defaultOptions}
      onMount={handleEditorDidMount}
      loading={
        <div className="flex items-center justify-center h-full bg-[#0d1117]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f78166]"></div>
        </div>
      }
    />
  );
}