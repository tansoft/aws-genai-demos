/**
 * Models for the document processing example
 */

/**
 * Document type enum
 */
export enum DocumentType {
  INVOICE = 'invoice',
  CONTRACT = 'contract',
  REPORT = 'report',
  EMAIL = 'email',
  LETTER = 'letter',
  RESUME = 'resume',
  UNKNOWN = 'unknown'
}

/**
 * Document format enum
 */
export enum DocumentFormat {
  TEXT = 'text',
  PDF = 'pdf',
  DOCX = 'docx',
  HTML = 'html',
  JSON = 'json',
  XML = 'xml'
}

/**
 * Processing operation enum
 */
export enum ProcessingOperation {
  CLASSIFICATION = 'classification',
  EXTRACTION = 'extraction',
  SUMMARIZATION = 'summarization',
  TRANSLATION = 'translation',
  ANALYSIS = 'analysis',
  REDACTION = 'redaction'
}

/**
 * Document source interface
 */
export interface DocumentSource {
  type: 'file' | 'url' | 'text';
  location?: string;
  content?: string;
  format: DocumentFormat;
}

/**
 * Document metadata interface
 */
export interface DocumentMetadata {
  documentType?: DocumentType;
  title?: string;
  author?: string;
  createdAt?: string;
  modifiedAt?: string;
  pageCount?: number;
  wordCount?: number;
  language?: string;
  keywords?: string[];
  customFields?: Record<string, any>;
}

/**
 * Document interface
 */
export interface Document {
  id: string;
  source: DocumentSource;
  content: string;
  metadata: DocumentMetadata;
}

/**
 * Processing request interface
 */
export interface ProcessingRequest {
  document: DocumentSource;
  operations: ProcessingOperation[];
  options?: Record<string, any>;
}

/**
 * Processing result interface
 */
export interface ProcessingResult {
  document: Document;
  results: Record<ProcessingOperation, any>;
  error?: string;
}

/**
 * Extraction field interface
 */
export interface ExtractionField {
  name: string;
  value: string;
  confidence?: number;
}

/**
 * Classification result interface
 */
export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  possibleTypes?: Array<{
    type: DocumentType;
    confidence: number;
  }>;
}

/**
 * Extraction result interface
 */
export interface ExtractionResult {
  fields: ExtractionField[];
  structuredData?: Record<string, any>;
}

/**
 * Summarization result interface
 */
export interface SummarizationResult {
  summary: string;
  keyPoints?: string[];
}

/**
 * Translation result interface
 */
export interface TranslationResult {
  translatedContent: string;
  sourceLanguage: string;
  targetLanguage: string;
}

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  sentiment?: {
    score: number;
    label: 'positive' | 'neutral' | 'negative';
  };
  entities?: Array<{
    text: string;
    type: string;
    startPos: number;
    endPos: number;
  }>;
  topics?: string[];
  insights?: string[];
}

/**
 * Redaction result interface
 */
export interface RedactionResult {
  redactedContent: string;
  redactedFields: Array<{
    type: string;
    count: number;
  }>;
}

/**
 * Document processor configuration interface
 */
export interface DocumentProcessorConfig {
  name: string;
  description?: string;
  modelProvider: string;
  modelName: string;
  browserEnabled?: boolean;
  memoryEnabled?: boolean;
  observabilityEnabled?: boolean;
  supportedOperations?: ProcessingOperation[];
  supportedDocumentTypes?: DocumentType[];
  supportedFormats?: DocumentFormat[];
}