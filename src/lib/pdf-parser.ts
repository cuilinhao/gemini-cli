'use client';

import * as pdfjs from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export interface PDFParseResult {
  text: string;
  totalPages: number;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
  pageCount: number;
  extractedPages: number[];
}

export class PDFParser {
  private static MAX_PAGES = 20; // Limit as per PRD
  private static PAGES_FROM_EACH_END = 5; // Take first 5 and last 5 pages if over limit

  static async parseFile(file: File): Promise<PDFParseResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return await this.parseArrayBuffer(arrayBuffer);
    } catch (error) {
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async parseArrayBuffer(arrayBuffer: ArrayBuffer): Promise<PDFParseResult> {
    try {
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      
      // Get metadata
      const metadata = await this.extractMetadata(pdf);
      
      // Determine which pages to extract
      const pagesToExtract = this.determinePagesToExtract(totalPages);
      
      // Extract text from selected pages
      let extractedText = '';
      const extractedPages: number[] = [];
      
      for (const pageNum of pagesToExtract) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          let pageText = '';
          textContent.items.forEach((item: any) => {
            if ('str' in item) {
              pageText += item.str + ' ';
            }
          });
          
          if (pageText.trim()) {
            extractedText += `\n--- Page ${pageNum} ---\n${pageText.trim()}\n`;
            extractedPages.push(pageNum);
          }
        } catch (pageError) {
          console.warn(`Failed to extract page ${pageNum}:`, pageError);
        }
      }
      
      return {
        text: extractedText.trim(),
        totalPages,
        metadata,
        pageCount: extractedPages.length,
        extractedPages,
      };
    } catch (error) {
      throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static determinePagesToExtract(totalPages: number): number[] {
    if (totalPages <= this.MAX_PAGES) {
      // Extract all pages if within limit
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Extract first 5 and last 5 pages + attempt to get TOC
    const firstPages = Array.from({ length: this.PAGES_FROM_EACH_END }, (_, i) => i + 1);
    const lastPages = Array.from(
      { length: this.PAGES_FROM_EACH_END }, 
      (_, i) => totalPages - this.PAGES_FROM_EACH_END + i + 1
    );
    
    // Try to include potential TOC pages (usually pages 2-4)
    const tocPages = [2, 3, 4].filter(page => 
      page <= totalPages && 
      !firstPages.includes(page) && 
      !lastPages.includes(page)
    );
    
    return [...firstPages, ...tocPages, ...lastPages]
      .filter(page => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }

  private static async extractMetadata(pdf: any): Promise<PDFParseResult['metadata']> {
    try {
      const metadata = await pdf.getMetadata();
      const info = metadata.info;
      
      return {
        title: info.Title || undefined,
        author: info.Author || undefined,
        subject: info.Subject || undefined,
        creator: info.Creator || undefined,
        producer: info.Producer || undefined,
        creationDate: info.CreationDate ? new Date(info.CreationDate) : undefined,
        modificationDate: info.ModDate ? new Date(info.ModDate) : undefined,
      };
    } catch (error) {
      console.warn('Failed to extract PDF metadata:', error);
      return undefined;
    }
  }

  static validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    if (file.type !== 'application/pdf') {
      return { valid: false, error: 'File must be a PDF' };
    }
    
    // Check file size (20MB limit)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return { valid: false, error: 'PDF file too large. Maximum size is 20MB.' };
    }
    
    return { valid: true };
  }

  static formatExtractedText(result: PDFParseResult): string {
    let formatted = '';
    
    if (result.metadata?.title) {
      formatted += `Title: ${result.metadata.title}\n`;
    }
    if (result.metadata?.author) {
      formatted += `Author: ${result.metadata.author}\n`;
    }
    if (result.totalPages) {
      formatted += `Total Pages: ${result.totalPages}\n`;
    }
    if (result.extractedPages.length > 0) {
      formatted += `Extracted Pages: ${result.extractedPages.join(', ')}\n`;
    }
    
    formatted += '\n' + '='.repeat(50) + '\n\n';
    formatted += result.text;
    
    return formatted;
  }
}