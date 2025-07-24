/**
 * Tests for DocumentProcessor
 */

import * as path from 'path';
import { DocumentProcessor } from '../document-processor';
import { 
  ProcessingRequest, 
  ProcessingOperation, 
  DocumentFormat,
  DocumentType
} from '../models';

// Mock dependencies
const mockRuntimeService = {
  generateResponse: jest.fn().mockImplementation(async (options) => {
    // Return different responses based on the operation
    if (options.messages.some(m => m.content.includes('Classify the following document'))) {
      return {
        role: 'assistant',
        content: `
\`\`\`json
{
  "documentType": "invoice",
  "confidence": 0.95,
  "possibleTypes": [
    { "type": "invoice", "confidence": 0.95 },
    { "type": "receipt", "confidence": 0.3 }
  ]
}
\`\`\`
        `
      };
    } else if (options.messages.some(m => m.content.includes('Extract the following information'))) {
      return {
        role: 'assistant',
        content: `
\`\`\`json
{
  "invoice_number": "INV-2023-0042",
  "date": "2023-01-15",
  "due_date": "2023-02-15",
  "total_amount": "$8,531.99",
  "vendor_name": "Acme Corporation",
  "client_name": "XYZ Enterprises",
  "structuredData": {
    "invoice": {
      "number": "INV-2023-0042",
      "date": "2023-01-15",
      "due_date": "2023-02-15",
      "total": "$8,531.99",
      "subtotal": "$7,899.99",
      "tax": "$632.00"
    },
    "vendor": {
      "name": "Acme Corporation",
      "address": "123 Business Street, Business City, BC 12345",
      "phone": "(555) 123-4567",
      "email": "billing@acme.example.com"
    },
    "client": {
      "name": "XYZ Enterprises",
      "address": "456 Client Avenue, Client City, CC 67890",
      "phone": "(555) 987-6543",
      "email": "accounts@xyz.example.com"
    },
    "items": [
      {
        "description": "Professional Services - Software Development",
        "quantity": 40,
        "unit_price": "$150.00",
        "amount": "$6,000.00"
      },
      {
        "description": "Server Hosting - Premium Tier",
        "quantity": 1,
        "unit_price": "$299.99",
        "amount": "$299.99"
      }
    ]
  }
}
\`\`\`
        `
      };
    } else if (options.messages.some(m => m.content.includes('Summarize the following document'))) {
      return {
        role: 'assistant',
        content: `
\`\`\`json
{
  "summary": "This is a mock summary of the document.",
  "keyPoints": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ]
}
\`\`\`
        `
      };
    } else if (options.messages.some(m => m.content.includes('Redact the following sensitive information'))) {
      return {
        role: 'assistant',
        content: `
\`\`\`json
{
  "redactedContent": "INVOICE\\n\\nInvoice Number: INV-2023-0042\\nDate: 2023-01-15\\nDue Date: 2023-02-15\\n\\nFrom:\\nAcme Corporation\\n[REDACTED]\\n[REDACTED]\\n[REDACTED]\\nEmail: [REDACTED]\\n\\nTo:\\nXYZ Enterprises\\n[REDACTED]\\n[REDACTED]\\n[REDACTED]\\nEmail: [REDACTED]\\n\\n...",
  "redactedFields": [
    { "type": "address", "count": 2 },
    { "type": "phone", "count": 2 },
    { "type": "email", "count": 2 },
    { "type": "bank_account", "count": 1 }
  ]
}
\`\`\`
        `
      };
    }
    
    return {
      role: 'assistant',
      content: 'Mock response'
    };
  })
};

const mockBrowserService = {
  createBrowser: jest.fn().mockImplementation(async () => {
    return {
      navigateToUrl: jest.fn().mockImplementation(async (url) => {
        return {
          getText: jest.fn().mockResolvedValue('Mock page content'),
          getHtml: jest.fn().mockResolvedValue('<html><body>Mock HTML</body></html>'),
          close: jest.fn()
        };
      }),
      close: jest.fn()
    };
  })
};

const mockConversationManager = {
  saveConversation: jest.fn().mockResolvedValue(undefined),
  getConversation: jest.fn().mockResolvedValue(null)
};

const mockObservability = {
  getLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setContext: jest.fn()
  }),
  getMetricsCollector: jest.fn().mockReturnValue({
    putMetric: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined)
  }),
  getTracer: jest.fn().mockReturnValue({
    startSegment: jest.fn().mockReturnValue({ id: 'segment-1', name: 'test', startTime: Date.now() }),
    endSegment: jest.fn(),
    addAnnotation: jest.fn(),
    addMetadata: jest.fn(),
    addError: jest.fn()
  }),
  getConfig: jest.fn().mockReturnValue({})
};

// Mock fs module
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn().mockReturnValue('Mock file content'),
    rmSync: jest.fn()
  };
});

describe('DocumentProcessor', () => {
  let processor: DocumentProcessor;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    processor = new DocumentProcessor(
      {
        name: 'Test Processor',
        modelProvider: 'openai',
        modelName: 'gpt-3.5-turbo',
        browserEnabled: true,
        memoryEnabled: true
      },
      mockRuntimeService as any,
      mockBrowserService as any,
      mockConversationManager as any,
      mockObservability as any
    );
  });
  
  afterEach(() => {
    processor.dispose();
  });
  
  describe('processDocument', () => {
    it('should process a document with multiple operations', async () => {
      const request: ProcessingRequest = {
        document: {
          type: 'file',
          location: path.join(__dirname, '..', 'data', 'invoice.txt'),
          format: DocumentFormat.TEXT
        },
        operations: [
          ProcessingOperation.CLASSIFICATION,
          ProcessingOperation.EXTRACTION,
          ProcessingOperation.SUMMARIZATION
        ]
      };
      
      const result = await processor.processDocument(request);
      
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.error).toBeUndefined();
      
      // Check classification result
      const classification = result.results[ProcessingOperation.CLASSIFICATION];
      expect(classification.documentType).toBe(DocumentType.INVOICE);
      expect(classification.confidence).toBe(0.95);
      
      // Check extraction result
      const extraction = result.results[ProcessingOperation.EXTRACTION];
      expect(extraction.fields).toBeDefined();
      expect(extraction.fields.length).toBeGreaterThan(0);
      expect(extraction.structuredData).toBeDefined();
      
      // Check summarization result
      const summarization = result.results[ProcessingOperation.SUMMARIZATION];
      expect(summarization.summary).toBeDefined();
      expect(summarization.keyPoints).toBeDefined();
      
      // Check if runtime service was called for each operation
      expect(mockRuntimeService.generateResponse).toHaveBeenCalledTimes(3);
      
      // Check if document was stored in memory
      expect(mockConversationManager.saveConversation).toHaveBeenCalled();
    });
    
    it('should handle errors during processing', async () => {
      // Mock runtime service to throw an error
      mockRuntimeService.generateResponse.mockRejectedValueOnce(new Error('Mock error'));
      
      const request: ProcessingRequest = {
        document: {
          type: 'file',
          location: path.join(__dirname, '..', 'data', 'invoice.txt'),
          format: DocumentFormat.TEXT
        },
        operations: [
          ProcessingOperation.CLASSIFICATION
        ]
      };
      
      const result = await processor.processDocument(request);
      
      expect(result).toBeDefined();
      expect(result.error).toBeDefined();
      expect(result.results).toEqual({});
      
      // Check if error was logged
      expect(mockObservability.getLogger().error).toHaveBeenCalled();
    });
    
    it('should handle URL documents', async () => {
      const request: ProcessingRequest = {
        document: {
          type: 'url',
          location: 'https://example.com',
          format: DocumentFormat.HTML
        },
        operations: [
          ProcessingOperation.CLASSIFICATION
        ]
      };
      
      const result = await processor.processDocument(request);
      
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.results).toBeDefined();
      
      // Check if browser service was called
      expect(mockBrowserService.createBrowser).toHaveBeenCalled();
    });
    
    it('should handle text documents', async () => {
      const request: ProcessingRequest = {
        document: {
          type: 'text',
          content: 'This is a test document',
          format: DocumentFormat.TEXT
        },
        operations: [
          ProcessingOperation.CLASSIFICATION
        ]
      };
      
      const result = await processor.processDocument(request);
      
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.content).toBe('This is a test document');
      expect(result.results).toBeDefined();
    });
  });
});