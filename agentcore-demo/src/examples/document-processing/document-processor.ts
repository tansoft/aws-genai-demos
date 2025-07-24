/**
 * Document Processor for AWS AgentCore
 * Integrates multiple features for document processing
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  RuntimeService 
} from '../../runtime/models/runtime';
import { 
  BrowserService 
} from '../../browser/services/browser-service';
import { 
  ConversationManager 
} from '../../memory/services/conversation-manager';
import { 
  ObservabilityManager, 
  LogLevel, 
  MetricUnit 
} from '../../observability/models/observability';
import { 
  DocumentProcessorConfig,
  ProcessingRequest,
  ProcessingResult,
  Document,
  DocumentType,
  DocumentFormat,
  ProcessingOperation,
  ClassificationResult,
  ExtractionResult,
  SummarizationResult,
  TranslationResult,
  AnalysisResult,
  RedactionResult
} from './models';

/**
 * Document Processor
 */
export class DocumentProcessor {
  private config: DocumentProcessorConfig;
  private runtimeService: RuntimeService;
  private browserService?: BrowserService;
  private conversationManager?: ConversationManager;
  private observability: ObservabilityManager;
  private logger: any;
  private metrics: any;
  private tracer: any;
  private workingDir: string;

  /**
   * Constructor
   * @param config Processor configuration
   * @param runtimeService Runtime service
   * @param browserService Browser service (optional)
   * @param conversationManager Conversation manager (optional)
   * @param observability Observability manager
   */
  constructor(
    config: DocumentProcessorConfig,
    runtimeService: RuntimeService,
    browserService?: BrowserService,
    conversationManager?: ConversationManager,
    observability?: ObservabilityManager
  ) {
    this.config = {
      ...config,
      browserEnabled: config.browserEnabled && !!browserService,
      memoryEnabled: config.memoryEnabled && !!conversationManager,
      observabilityEnabled: config.observabilityEnabled !== false,
      supportedOperations: config.supportedOperations || Object.values(ProcessingOperation),
      supportedDocumentTypes: config.supportedDocumentTypes || Object.values(DocumentType),
      supportedFormats: config.supportedFormats || [
        DocumentFormat.TEXT,
        DocumentFormat.HTML,
        DocumentFormat.JSON
      ]
    };
    
    this.runtimeService = runtimeService;
    this.browserService = browserService;
    this.conversationManager = conversationManager;
    
    // Set up observability
    this.observability = observability || {
      getLogger: () => console,
      getMetricsCollector: () => ({
        putMetric: () => {},
        flush: async () => {}
      }),
      getTracer: () => ({
        startSegment: () => ({ id: 'mock', name: 'mock', startTime: Date.now() }),
        endSegment: () => {},
        addAnnotation: () => {},
        addMetadata: () => {},
        addError: () => {}
      }),
      getConfig: () => ({})
    };
    
    this.logger = this.observability.getLogger('document-processor');
    this.metrics = this.observability.getMetricsCollector();
    this.tracer = this.observability.getTracer();
    
    // Create working directory
    this.workingDir = path.join(process.cwd(), 'tmp', 'document-processing', uuidv4());
    this.ensureWorkingDir();
    
    this.logger.info('Document processor initialized', { config: this.config });
  }  /**
   
* Process a document
   * @param request Processing request
   * @returns Processing result
   */
  public async processDocument(request: ProcessingRequest): Promise<ProcessingResult> {
    const segment = this.tracer.startSegment('ProcessDocument');
    
    try {
      this.logger.info('Starting document processing', { 
        operations: request.operations,
        format: request.document.format
      });
      this.metrics.putMetric('DocumentProcessingRequests', 1, MetricUnit.COUNT);
      
      // Validate request
      this.validateRequest(request);
      
      // Load document
      const document = await this.loadDocument(request.document);
      
      // Process operations
      const results: Record<ProcessingOperation, any> = {} as Record<ProcessingOperation, any>;
      
      for (const operation of request.operations) {
        try {
          this.logger.info(`Processing operation: ${operation}`);
          this.metrics.putMetric('OperationRequests', 1, MetricUnit.COUNT, {
            Operation: operation
          });
          
          const startTime = Date.now();
          results[operation] = await this.processOperation(operation, document, request.options);
          const duration = Date.now() - startTime;
          
          this.metrics.putMetric('OperationDuration', duration, MetricUnit.MILLISECONDS, {
            Operation: operation
          });
          this.metrics.putMetric('OperationSuccess', 1, MetricUnit.COUNT, {
            Operation: operation
          });
          
        } catch (error) {
          this.logger.error(`Error processing operation: ${operation}`, error as Error);
          this.metrics.putMetric('OperationErrors', 1, MetricUnit.COUNT, {
            Operation: operation
          });
          
          results[operation] = { error: (error as Error).message };
        }
      }
      
      // Store document in memory if enabled
      if (this.config.memoryEnabled && this.conversationManager) {
        await this.storeDocumentInMemory(document, results);
      }
      
      this.logger.info('Document processing completed successfully');
      this.metrics.putMetric('DocumentProcessingCompleted', 1, MetricUnit.COUNT);
      
      return {
        document,
        results
      };
      
    } catch (error) {
      this.logger.error('Error processing document', error as Error);
      this.metrics.putMetric('DocumentProcessingErrors', 1, MetricUnit.COUNT);
      this.tracer.addError(segment, error as Error);
      
      return {
        document: {
          id: uuidv4(),
          source: request.document,
          content: '',
          metadata: {}
        },
        results: {} as Record<ProcessingOperation, any>,
        error: (error as Error).message
      };
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Validate processing request
   * @param request Processing request
   */
  private validateRequest(request: ProcessingRequest): void {
    if (!request.document) {
      throw new Error('Document is required');
    }
    
    if (!request.operations || request.operations.length === 0) {
      throw new Error('At least one operation is required');
    }
    
    // Check if document format is supported
    if (!this.config.supportedFormats?.includes(request.document.format)) {
      throw new Error(`Document format not supported: ${request.document.format}`);
    }
    
    // Check if operations are supported
    for (const operation of request.operations) {
      if (!this.config.supportedOperations?.includes(operation)) {
        throw new Error(`Operation not supported: ${operation}`);
      }
    }
    
    // Check document source
    if (request.document.type === 'file' && !request.document.location) {
      throw new Error('File location is required for file documents');
    }
    
    if (request.document.type === 'url' && !request.document.location) {
      throw new Error('URL is required for URL documents');
    }
    
    if (request.document.type === 'text' && !request.document.content) {
      throw new Error('Content is required for text documents');
    }
  }  /
**
   * Load document from source
   * @param source Document source
   * @returns Document
   */
  private async loadDocument(source: any): Promise<Document> {
    const segment = this.tracer.startSegment('LoadDocument');
    
    try {
      let content = '';
      
      switch (source.type) {
        case 'file':
          content = await this.loadFileDocument(source.location!);
          break;
          
        case 'url':
          content = await this.loadUrlDocument(source.location!);
          break;
          
        case 'text':
          content = source.content!;
          break;
          
        default:
          throw new Error(`Unsupported document source type: ${source.type}`);
      }
      
      // Create document
      const document: Document = {
        id: uuidv4(),
        source,
        content,
        metadata: {}
      };
      
      // Get basic metadata
      document.metadata = {
        wordCount: this.countWords(content),
        language: 'en' // Default to English
      };
      
      return document;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Load document from file
   * @param location File location
   * @returns Document content
   */
  private async loadFileDocument(location: string): Promise<string> {
    // Check if file exists
    if (!fs.existsSync(location)) {
      throw new Error(`File not found: ${location}`);
    }
    
    // Read file content
    const content = fs.readFileSync(location, 'utf-8');
    
    this.logger.info('Loaded document from file', { location, contentLength: content.length });
    return content;
  }

  /**
   * Load document from URL
   * @param url URL location
   * @returns Document content
   */
  private async loadUrlDocument(url: string): Promise<string> {
    if (!this.config.browserEnabled || !this.browserService) {
      throw new Error('Browser feature is required to load URL documents but is not enabled');
    }
    
    // Initialize browser
    const browser = await this.browserService.createBrowser();
    
    try {
      // Navigate to URL
      const page = await browser.navigateToUrl(url);
      
      // Get page content
      const content = await page.getText();
      
      this.logger.info('Loaded document from URL', { url, contentLength: content.length });
      return content;
      
    } finally {
      // Close browser
      await browser.close();
    }
  }  /**

   * Process operation on document
   * @param operation Processing operation
   * @param document Document
   * @param options Processing options
   * @returns Operation result
   */
  private async processOperation(
    operation: ProcessingOperation,
    document: Document,
    options?: Record<string, any>
  ): Promise<any> {
    switch (operation) {
      case ProcessingOperation.CLASSIFICATION:
        return this.classifyDocument(document, options);
        
      case ProcessingOperation.EXTRACTION:
        return this.extractFromDocument(document, options);
        
      case ProcessingOperation.SUMMARIZATION:
        return this.summarizeDocument(document, options);
        
      case ProcessingOperation.TRANSLATION:
        return this.translateDocument(document, options);
        
      case ProcessingOperation.ANALYSIS:
        return this.analyzeDocument(document, options);
        
      case ProcessingOperation.REDACTION:
        return this.redactDocument(document, options);
        
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Classify document
   * @param document Document
   * @param options Classification options
   * @returns Classification result
   */
  private async classifyDocument(document: Document, options?: Record<string, any>): Promise<ClassificationResult> {
    const segment = this.tracer.startSegment('ClassifyDocument');
    
    try {
      this.logger.info('Classifying document');
      
      // Create prompt for classification
      const prompt = `
        Classify the following document into one of these types:
        ${this.config.supportedDocumentTypes?.join(', ')}
        
        Document content:
        ${this.truncateContent(document.content, 2000)}
        
        Respond with a JSON object containing:
        1. documentType: The type of the document
        2. confidence: A number between 0 and 1 indicating confidence in the classification
        3. possibleTypes: An array of objects with type and confidence for other possible types
      `;
      
      // Generate classification using the runtime service
      const response = await this.runtimeService.generateResponse({
        provider: this.config.modelProvider,
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a document classification expert. Classify documents accurately based on their content.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2
      });
      
      // Extract JSON from response
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, response.content];
      
      const jsonContent = jsonMatch[1] || response.content;
      
      // Parse classification result
      let result: ClassificationResult;
      
      try {
        result = JSON.parse(jsonContent);
      } catch (error) {
        // If parsing fails, extract information using regex
        const typeMatch = jsonContent.match(/documentType["\s:]+([a-z_]+)/i);
        const confidenceMatch = jsonContent.match(/confidence["\s:]+([0-9.]+)/i);
        
        result = {
          documentType: (typeMatch ? typeMatch[1].toLowerCase() : 'unknown') as DocumentType,
          confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
          possibleTypes: []
        };
      }
      
      // Update document metadata
      document.metadata.documentType = result.documentType;
      
      this.logger.info('Document classified', { 
        documentType: result.documentType,
        confidence: result.confidence
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error classifying document', error as Error);
      this.tracer.addError(segment, error as Error);
      throw error;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }  /**

   * Extract information from document
   * @param document Document
   * @param options Extraction options
   * @returns Extraction result
   */
  private async extractFromDocument(document: Document, options?: Record<string, any>): Promise<ExtractionResult> {
    const segment = this.tracer.startSegment('ExtractFromDocument');
    
    try {
      this.logger.info('Extracting information from document');
      
      // Determine fields to extract based on document type
      const fieldsToExtract = this.getFieldsToExtract(document.metadata.documentType || DocumentType.UNKNOWN);
      
      // Create prompt for extraction
      const prompt = `
        Extract the following information from this document:
        ${fieldsToExtract.join(', ')}
        
        Document content:
        ${this.truncateContent(document.content, 3000)}
        
        Respond with a JSON object where:
        1. Each key is one of the requested fields
        2. Each value is the extracted information
        3. Include a "structuredData" field with a structured representation of the document
      `;
      
      // Generate extraction using the runtime service
      const response = await this.runtimeService.generateResponse({
        provider: this.config.modelProvider,
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a document information extraction expert. Extract structured information accurately from documents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      });
      
      // Extract JSON from response
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, response.content];
      
      const jsonContent = jsonMatch[1] || response.content;
      
      // Parse extraction result
      let extractedData: Record<string, any>;
      
      try {
        extractedData = JSON.parse(jsonContent);
      } catch (error) {
        throw new Error(`Failed to parse extraction result: ${(error as Error).message}`);
      }
      
      // Convert to extraction result format
      const fields = Object.entries(extractedData)
        .filter(([key]) => key !== 'structuredData')
        .map(([name, value]) => ({
          name,
          value: String(value),
          confidence: 0.9 // Default confidence
        }));
      
      const result: ExtractionResult = {
        fields,
        structuredData: extractedData.structuredData || extractedData
      };
      
      // Update document metadata
      if (extractedData.title) {
        document.metadata.title = extractedData.title;
      }
      
      if (extractedData.author) {
        document.metadata.author = extractedData.author;
      }
      
      if (extractedData.date || extractedData.createdAt) {
        document.metadata.createdAt = extractedData.date || extractedData.createdAt;
      }
      
      this.logger.info('Information extracted from document', { 
        fieldCount: fields.length
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error extracting information from document', error as Error);
      this.tracer.addError(segment, error as Error);
      throw error;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }  /
**
   * Summarize document
   * @param document Document
   * @param options Summarization options
   * @returns Summarization result
   */
  private async summarizeDocument(document: Document, options?: Record<string, any>): Promise<SummarizationResult> {
    const segment = this.tracer.startSegment('SummarizeDocument');
    
    try {
      this.logger.info('Summarizing document');
      
      // Get summarization options
      const maxLength = options?.maxLength || 500;
      const includeKeyPoints = options?.includeKeyPoints !== false;
      
      // Create prompt for summarization
      const prompt = `
        Summarize the following document in a concise way:
        
        Document content:
        ${this.truncateContent(document.content, 4000)}
        
        Provide a summary of approximately ${maxLength} characters.
        ${includeKeyPoints ? 'Also include 3-5 key points from the document.' : ''}
        
        Respond with a JSON object containing:
        1. summary: The document summary
        2. keyPoints: An array of key points (if requested)
      `;
      
      // Generate summary using the runtime service
      const response = await this.runtimeService.generateResponse({
        provider: this.config.modelProvider,
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a document summarization expert. Create concise, accurate summaries of documents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      });
      
      // Extract JSON from response
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, response.content];
      
      const jsonContent = jsonMatch[1] || response.content;
      
      // Parse summarization result
      let result: SummarizationResult;
      
      try {
        result = JSON.parse(jsonContent);
      } catch (error) {
        // If parsing fails, extract information using regex
        const summaryMatch = response.content.match(/summary["\s:]+([^"]+)/i) || 
                            response.content.match(/summary:(.*?)(?=\n\n|\n[a-z]+:|\n```|$)/is);
        
        result = {
          summary: summaryMatch ? summaryMatch[1].trim() : response.content,
          keyPoints: []
        };
        
        // Try to extract key points
        const keyPointsMatch = response.content.match(/key\s*points:(.*?)(?=\n\n|\n[a-z]+:|\n```|$)/is);
        if (keyPointsMatch) {
          result.keyPoints = keyPointsMatch[1]
            .split(/\n-|\n\d+\./)
            .map(point => point.trim())
            .filter(point => point.length > 0);
        }
      }
      
      this.logger.info('Document summarized', { 
        summaryLength: result.summary.length,
        keyPointCount: result.keyPoints?.length || 0
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error summarizing document', error as Error);
      this.tracer.addError(segment, error as Error);
      throw error;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }  /*
*
   * Translate document
   * @param document Document
   * @param options Translation options
   * @returns Translation result
   */
  private async translateDocument(document: Document, options?: Record<string, any>): Promise<TranslationResult> {
    const segment = this.tracer.startSegment('TranslateDocument');
    
    try {
      this.logger.info('Translating document');
      
      // Get translation options
      const targetLanguage = options?.targetLanguage || 'en';
      const sourceLanguage = options?.sourceLanguage || document.metadata.language || 'auto';
      
      // Create prompt for translation
      const prompt = `
        Translate the following document from ${sourceLanguage} to ${targetLanguage}:
        
        Document content:
        ${this.truncateContent(document.content, 4000)}
        
        Respond with a JSON object containing:
        1. translatedContent: The translated document content
        2. sourceLanguage: The detected source language
        3. targetLanguage: The target language
      `;
      
      // Generate translation using the runtime service
      const response = await this.runtimeService.generateResponse({
        provider: this.config.modelProvider,
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a document translation expert. Translate documents accurately while preserving formatting and meaning.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      });
      
      // Extract JSON from response
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, response.content];
      
      const jsonContent = jsonMatch[1] || response.content;
      
      // Parse translation result
      let result: TranslationResult;
      
      try {
        result = JSON.parse(jsonContent);
      } catch (error) {
        // If parsing fails, use the entire response as the translation
        result = {
          translatedContent: response.content,
          sourceLanguage: sourceLanguage === 'auto' ? 'unknown' : sourceLanguage,
          targetLanguage
        };
      }
      
      this.logger.info('Document translated', { 
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        contentLength: result.translatedContent.length
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error translating document', error as Error);
      this.tracer.addError(segment, error as Error);
      throw error;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  } 
 /**
   * Analyze document
   * @param document Document
   * @param options Analysis options
   * @returns Analysis result
   */
  private async analyzeDocument(document: Document, options?: Record<string, any>): Promise<AnalysisResult> {
    const segment = this.tracer.startSegment('AnalyzeDocument');
    
    try {
      this.logger.info('Analyzing document');
      
      // Get analysis options
      const includeSentiment = options?.includeSentiment !== false;
      const includeEntities = options?.includeEntities !== false;
      const includeTopics = options?.includeTopics !== false;
      const includeInsights = options?.includeInsights !== false;
      
      // Create prompt for analysis
      const prompt = `
        Analyze the following document:
        
        Document content:
        ${this.truncateContent(document.content, 4000)}
        
        Perform the following analyses:
        ${includeSentiment ? '- Sentiment analysis (positive, neutral, or negative with score from -1 to 1)' : ''}
        ${includeEntities ? '- Entity extraction (people, organizations, locations, dates, etc.)' : ''}
        ${includeTopics ? '- Topic identification (3-5 main topics)' : ''}
        ${includeInsights ? '- Key insights (3-5 important insights)' : ''}
        
        Respond with a JSON object containing the requested analyses.
      `;
      
      // Generate analysis using the runtime service
      const response = await this.runtimeService.generateResponse({
        provider: this.config.modelProvider,
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a document analysis expert. Analyze documents to extract insights, entities, sentiment, and topics.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2
      });
      
      // Extract JSON from response
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, response.content];
      
      const jsonContent = jsonMatch[1] || response.content;
      
      // Parse analysis result
      let result: AnalysisResult;
      
      try {
        result = JSON.parse(jsonContent);
      } catch (error) {
        // If parsing fails, create a basic result
        result = {};
        
        // Try to extract sentiment
        if (includeSentiment) {
          const sentimentMatch = response.content.match(/sentiment["\s:]+([a-z]+)/i);
          const scoreMatch = response.content.match(/score["\s:]+([0-9.-]+)/i);
          
          if (sentimentMatch) {
            const sentiment = sentimentMatch[1].toLowerCase();
            result.sentiment = {
              score: scoreMatch ? parseFloat(scoreMatch[1]) : (
                sentiment === 'positive' ? 0.7 : 
                sentiment === 'negative' ? -0.7 : 0
              ),
              label: sentiment === 'positive' ? 'positive' : 
                    sentiment === 'negative' ? 'negative' : 'neutral'
            };
          }
        }
        
        // Try to extract topics
        if (includeTopics) {
          const topicsMatch = response.content.match(/topics["\s:]+\[(.*?)\]/i) ||
                             response.content.match(/topics:(.*?)(?=\n\n|\n[a-z]+:|\n```|$)/is);
          
          if (topicsMatch) {
            result.topics = topicsMatch[1]
              .split(/,|\n-|\n\d+\./)
              .map(topic => topic.trim().replace(/["']/g, ''))
              .filter(topic => topic.length > 0);
          }
        }
        
        // Try to extract insights
        if (includeInsights) {
          const insightsMatch = response.content.match(/insights["\s:]+\[(.*?)\]/i) ||
                               response.content.match(/insights:(.*?)(?=\n\n|\n[a-z]+:|\n```|$)/is);
          
          if (insightsMatch) {
            result.insights = insightsMatch[1]
              .split(/,|\n-|\n\d+\./)
              .map(insight => insight.trim().replace(/["']/g, ''))
              .filter(insight => insight.length > 0);
          }
        }
      }
      
      // Update document metadata
      if (result.topics) {
        document.metadata.keywords = result.topics;
      }
      
      this.logger.info('Document analyzed', { 
        sentiment: result.sentiment?.label,
        entityCount: result.entities?.length || 0,
        topicCount: result.topics?.length || 0,
        insightCount: result.insights?.length || 0
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error analyzing document', error as Error);
      this.tracer.addError(segment, error as Error);
      throw error;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }  /**
 
  * Redact sensitive information from document
   * @param document Document
   * @param options Redaction options
   * @returns Redaction result
   */
  private async redactDocument(document: Document, options?: Record<string, any>): Promise<RedactionResult> {
    const segment = this.tracer.startSegment('RedactDocument');
    
    try {
      this.logger.info('Redacting document');
      
      // Get redaction options
      const redactTypes = options?.redactTypes || [
        'PII', 'email', 'phone', 'address', 'name', 'date_of_birth',
        'ssn', 'credit_card', 'bank_account', 'ip_address'
      ];
      
      // Create prompt for redaction
      const prompt = `
        Redact the following sensitive information from this document:
        ${redactTypes.join(', ')}
        
        Document content:
        ${this.truncateContent(document.content, 4000)}
        
        Replace each instance of sensitive information with [REDACTED] and keep track of what was redacted.
        
        Respond with a JSON object containing:
        1. redactedContent: The document content with sensitive information redacted
        2. redactedFields: An array of objects with type and count of redacted items
      `;
      
      // Generate redaction using the runtime service
      const response = await this.runtimeService.generateResponse({
        provider: this.config.modelProvider,
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a document redaction expert. Identify and redact sensitive information from documents.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1
      });
      
      // Extract JSON from response
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, response.content];
      
      const jsonContent = jsonMatch[1] || response.content;
      
      // Parse redaction result
      let result: RedactionResult;
      
      try {
        result = JSON.parse(jsonContent);
      } catch (error) {
        // If parsing fails, use regex to extract redacted content
        const contentMatch = response.content.match(/redactedContent["\s:]+([^"]+)/i) || 
                            response.content.match(/redacted content:(.*?)(?=\n\n|\n[a-z]+:|\n```|$)/is);
        
        result = {
          redactedContent: contentMatch ? contentMatch[1].trim() : document.content.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED]'),
          redactedFields: [
            {
              type: 'unknown',
              count: (result?.redactedContent?.match(/\[REDACTED\]/g) || []).length
            }
          ]
        };
      }
      
      this.logger.info('Document redacted', { 
        redactedFieldCount: result.redactedFields.length,
        totalRedactions: result.redactedFields.reduce((sum, field) => sum + field.count, 0)
      });
      
      return result;
      
    } catch (error) {
      this.logger.error('Error redacting document', error as Error);
      this.tracer.addError(segment, error as Error);
      throw error;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }  /**
 
  * Store document in memory
   * @param document Document
   * @param results Processing results
   */
  private async storeDocumentInMemory(document: Document, results: Record<ProcessingOperation, any>): Promise<void> {
    if (!this.config.memoryEnabled || !this.conversationManager) {
      return;
    }
    
    try {
      // Create memory entry
      const memoryData = {
        document: {
          id: document.id,
          metadata: document.metadata,
          contentPreview: this.truncateContent(document.content, 200)
        },
        results: Object.entries(results).reduce((acc, [key, value]) => {
          // Remove large content fields to save space
          const processedValue = { ...value };
          if (key === ProcessingOperation.TRANSLATION) {
            delete processedValue.translatedContent;
          }
          if (key === ProcessingOperation.REDACTION) {
            delete processedValue.redactedContent;
          }
          acc[key] = processedValue;
          return acc;
        }, {} as Record<string, any>)
      };
      
      // Store in memory
      await this.conversationManager.saveConversation(document.id, {
        messages: [],
        metadata: {
          documentProcessing: memoryData,
          timestamp: new Date().toISOString()
        }
      });
      
      this.logger.info('Document stored in memory', { documentId: document.id });
      
    } catch (error) {
      this.logger.error('Error storing document in memory', error as Error);
    }
  }

  /**
   * Get fields to extract based on document type
   * @param documentType Document type
   * @returns Array of fields to extract
   */
  private getFieldsToExtract(documentType: DocumentType): string[] {
    const commonFields = ['title', 'date', 'author'];
    
    switch (documentType) {
      case DocumentType.INVOICE:
        return [
          ...commonFields,
          'invoice_number',
          'due_date',
          'total_amount',
          'tax_amount',
          'vendor_name',
          'vendor_address',
          'client_name',
          'client_address',
          'line_items',
          'payment_terms'
        ];
        
      case DocumentType.CONTRACT:
        return [
          ...commonFields,
          'parties',
          'effective_date',
          'termination_date',
          'contract_value',
          'payment_terms',
          'obligations',
          'termination_conditions',
          'governing_law'
        ];
        
      case DocumentType.REPORT:
        return [
          ...commonFields,
          'executive_summary',
          'key_findings',
          'recommendations',
          'methodology',
          'data_sources',
          'conclusions'
        ];
        
      case DocumentType.EMAIL:
        return [
          'sender',
          'recipient',
          'cc',
          'bcc',
          'subject',
          'date',
          'body',
          'attachments'
        ];
        
      case DocumentType.LETTER:
        return [
          ...commonFields,
          'sender_name',
          'sender_address',
          'recipient_name',
          'recipient_address',
          'subject',
          'body',
          'signature'
        ];
        
      case DocumentType.RESUME:
        return [
          'name',
          'contact_information',
          'education',
          'work_experience',
          'skills',
          'certifications',
          'references'
        ];
        
      default:
        return [
          ...commonFields,
          'content_summary',
          'key_points',
          'entities',
          'dates',
          'locations'
        ];
    }
  }  /**
   *
 Count words in text
   * @param text Text to count words in
   * @returns Word count
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Truncate content to specified length
   * @param content Content to truncate
   * @param maxLength Maximum length
   * @returns Truncated content
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    return content.substring(0, maxLength) + '...';
  }

  /**
   * Ensure working directory exists
   */
  private ensureWorkingDir(): void {
    if (!fs.existsSync(this.workingDir)) {
      fs.mkdirSync(this.workingDir, { recursive: true });
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    try {
      // Clean up working directory
      if (fs.existsSync(this.workingDir)) {
        fs.rmSync(this.workingDir, { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.error('Error cleaning up resources', error as Error);
    }
  }
}