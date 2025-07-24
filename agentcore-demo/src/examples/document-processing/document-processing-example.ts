/**
 * Example demonstrating AWS AgentCore document processing capabilities
 * This example integrates multiple features for document processing
 */

import * as path from 'path';
import { RuntimeService } from '../../runtime/services/runtime-service';
import { ProviderFactory } from '../../runtime/services/provider-factory';
import { ProtocolFactory } from '../../runtime/services/protocol-factory';
import { BrowserService } from '../../browser/services/browser-service';
import { PuppeteerBrowser } from '../../browser/services/puppeteer-browser';
import { ConversationManager } from '../../memory/services/conversation-manager';
import { ShortTermMemory } from '../../memory/services/short-term-memory';
import { createObservabilityManager, LogLevel } from '../../observability';
import { DocumentProcessor } from './document-processor';
import { 
  ProcessingRequest, 
  ProcessingOperation, 
  DocumentFormat
} from './models';

/**
 * Run the document processing example
 */
async function runDocumentProcessingExample() {
  console.log('=== AWS AgentCore Document Processing Example ===');
  
  try {
    // Set up observability
    const observability = createObservabilityManager({
      logLevel: LogLevel.INFO,
      serviceName: 'document-processing-example'
    });
    
    const logger = observability.getLogger();
    logger.info('Starting document processing example');
    
    // Set up runtime service
    const providerFactory = new ProviderFactory();
    const protocolFactory = new ProtocolFactory();
    const runtimeService = new RuntimeService(providerFactory, protocolFactory);
    
    // Set up browser service
    const puppeteerBrowser = new PuppeteerBrowser({
      headless: true,
      timeout: 30000
    });
    
    const browserService = new BrowserService(puppeteerBrowser);
    
    // Set up memory
    const shortTermMemory = new ShortTermMemory();
    const conversationManager = new ConversationManager(shortTermMemory);
    
    // Create document processor
    const documentProcessor = new DocumentProcessor(
      {
        name: 'Document Processor',
        modelProvider: process.env.MODEL_PROVIDER || 'openai',
        modelName: process.env.MODEL_NAME || 'gpt-3.5-turbo',
        browserEnabled: true,
        memoryEnabled: true,
        observabilityEnabled: true
      },
      runtimeService,
      browserService,
      conversationManager,
      observability
    );
    
    try {
      // Example 1: Process invoice
      console.log('\n--- Example 1: Processing Invoice ---');
      await processInvoice(documentProcessor);
      
      // Example 2: Process contract
      console.log('\n--- Example 2: Processing Contract ---');
      await processContract(documentProcessor);
      
      // Example 3: Process report
      console.log('\n--- Example 3: Processing Report ---');
      await processReport(documentProcessor);
      
    } finally {
      // Clean up resources
      documentProcessor.dispose();
    }
    
    logger.info('Document processing example completed');
    
  } catch (error) {
    console.error('Error running document processing example:', error);
  }
}

/**
 * Process invoice document
 * @param processor Document processor
 */
async function processInvoice(processor: DocumentProcessor) {
  // Create processing request
  const request: ProcessingRequest = {
    document: {
      type: 'file',
      location: path.join(__dirname, 'data', 'invoice.txt'),
      format: DocumentFormat.TEXT
    },
    operations: [
      ProcessingOperation.CLASSIFICATION,
      ProcessingOperation.EXTRACTION,
      ProcessingOperation.REDACTION
    ],
    options: {
      redactTypes: ['email', 'phone', 'address', 'bank_account']
    }
  };
  
  console.log('Processing invoice document...');
  
  // Process document
  const result = await processor.processDocument(request);
  
  // Display results
  console.log('\nDocument Classification:');
  const classification = result.results[ProcessingOperation.CLASSIFICATION];
  console.log(`Type: ${classification.documentType} (Confidence: ${classification.confidence.toFixed(2)})`);
  
  console.log('\nExtracted Information:');
  const extraction = result.results[ProcessingOperation.EXTRACTION];
  extraction.fields.slice(0, 5).forEach(field => {
    console.log(`${field.name}: ${field.value}`);
  });
  console.log(`... and ${extraction.fields.length - 5} more fields`);
  
  console.log('\nRedaction:');
  const redaction = result.results[ProcessingOperation.REDACTION];
  console.log('Redacted fields:');
  redaction.redactedFields.forEach(field => {
    console.log(`- ${field.type}: ${field.count} instances`);
  });
  
  if (result.error) {
    console.error('\nError:', result.error);
  }
}

/**
 * Process contract document
 * @param processor Document processor
 */
async function processContract(processor: DocumentProcessor) {
  // Create processing request
  const request: ProcessingRequest = {
    document: {
      type: 'file',
      location: path.join(__dirname, 'data', 'contract.txt'),
      format: DocumentFormat.TEXT
    },
    operations: [
      ProcessingOperation.CLASSIFICATION,
      ProcessingOperation.EXTRACTION,
      ProcessingOperation.SUMMARIZATION,
      ProcessingOperation.ANALYSIS
    ]
  };
  
  console.log('Processing contract document...');
  
  // Process document
  const result = await processor.processDocument(request);
  
  // Display results
  console.log('\nDocument Classification:');
  const classification = result.results[ProcessingOperation.CLASSIFICATION];
  console.log(`Type: ${classification.documentType} (Confidence: ${classification.confidence.toFixed(2)})`);
  
  console.log('\nSummarization:');
  const summarization = result.results[ProcessingOperation.SUMMARIZATION];
  console.log(summarization.summary);
  
  console.log('\nKey Points:');
  summarization.keyPoints?.forEach((point, index) => {
    console.log(`${index + 1}. ${point}`);
  });
  
  console.log('\nAnalysis:');
  const analysis = result.results[ProcessingOperation.ANALYSIS];
  
  if (analysis.sentiment) {
    console.log(`Sentiment: ${analysis.sentiment.label} (Score: ${analysis.sentiment.score.toFixed(2)})`);
  }
  
  if (analysis.topics) {
    console.log('Topics:');
    analysis.topics.forEach((topic, index) => {
      console.log(`- ${topic}`);
    });
  }
  
  if (result.error) {
    console.error('\nError:', result.error);
  }
}

/**
 * Process report document
 * @param processor Document processor
 */
async function processReport(processor: DocumentProcessor) {
  // Create processing request
  const request: ProcessingRequest = {
    document: {
      type: 'file',
      location: path.join(__dirname, 'data', 'report.txt'),
      format: DocumentFormat.TEXT
    },
    operations: [
      ProcessingOperation.CLASSIFICATION,
      ProcessingOperation.SUMMARIZATION,
      ProcessingOperation.TRANSLATION
    ],
    options: {
      translation: {
        targetLanguage: 'es' // Spanish
      }
    }
  };
  
  console.log('Processing report document...');
  
  // Process document
  const result = await processor.processDocument(request);
  
  // Display results
  console.log('\nDocument Classification:');
  const classification = result.results[ProcessingOperation.CLASSIFICATION];
  console.log(`Type: ${classification.documentType} (Confidence: ${classification.confidence.toFixed(2)})`);
  
  console.log('\nSummarization:');
  const summarization = result.results[ProcessingOperation.SUMMARIZATION];
  console.log(summarization.summary);
  
  console.log('\nTranslation:');
  const translation = result.results[ProcessingOperation.TRANSLATION];
  console.log(`Translated from ${translation.sourceLanguage} to ${translation.targetLanguage}`);
  console.log('First 150 characters of translation:');
  console.log(translation.translatedContent.substring(0, 150) + '...');
  
  if (result.error) {
    console.error('\nError:', result.error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runDocumentProcessingExample()
    .then(() => console.log('\nExample finished'))
    .catch(err => console.error('Example failed:', err));
}

export { runDocumentProcessingExample };