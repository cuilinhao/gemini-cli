'use client';

import { useState, useCallback } from 'react';
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PDFParser, type PDFParseResult } from '@/lib/pdf-parser';

interface FileDropZoneProps {
  onFileProcessed: (result: PDFParseResult) => void;
  className?: string;
}

export default function FileDropZone({ onFileProcessed, className = '' }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PDFParseResult | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  const handleFileSelection = async (file: File) => {
    setError(null);
    setResult(null);
    
    // Validate file
    const validation = PDFParser.validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }
    
    setSelectedFile(file);
    setProcessing(true);
    
    try {
      const parseResult = await PDFParser.parseFile(file);
      setResult(parseResult);
      onFileProcessed(parseResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setProcessing(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {!selectedFile && (
        <Card
          className={`border-2 border-dashed transition-colors cursor-pointer ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <div className="p-8 text-center">
            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Upload PDF Document</h3>
            <p className="text-muted-foreground mb-4">
              Drag & drop a PDF file here, or click to select
            </p>
            <p className="text-sm text-muted-foreground">
              Maximum file size: 20MB • Supports PDF files only
            </p>
            <input
              id="file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>
        </Card>
      )}

      {selectedFile && (
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <File className="w-8 h-8 text-red-500" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFile}
              disabled={processing}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {processing && (
            <div className="mt-4 flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Processing PDF...</span>
            </div>
          )}
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            PDF processed successfully! Extracted {result.pageCount} pages out of {result.totalPages} total pages.
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Card className="p-4">
          <h4 className="font-semibold mb-2">Document Summary</h4>
          <div className="space-y-1 text-sm">
            {result.metadata?.title && (
              <div><span className="font-medium">Title:</span> {result.metadata.title}</div>
            )}
            {result.metadata?.author && (
              <div><span className="font-medium">Author:</span> {result.metadata.author}</div>
            )}
            <div><span className="font-medium">Total Pages:</span> {result.totalPages}</div>
            <div><span className="font-medium">Extracted Pages:</span> {result.extractedPages.join(', ')}</div>
            <div><span className="font-medium">Text Length:</span> {result.text.length.toLocaleString()} characters</div>
          </div>
        </Card>
      )}
    </div>
  );
}