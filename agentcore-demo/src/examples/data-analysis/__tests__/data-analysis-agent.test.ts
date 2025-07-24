/**
 * Tests for DataAnalysisAgent
 */

import * as path from 'path';
import { DataAnalysisAgent } from '../data-analysis-agent';
import { 
  AnalysisRequest, 
  AnalysisType, 
  DataSourceType, 
  DataFormat, 
  VisualizationType,
  WebResearchRequest
} from '../models';

// Mock dependencies
const mockRuntimeService = {
  generateResponse: jest.fn().mockImplementation(async (options) => {
    if (options.messages.some(m => m.content.includes('Generate Python code'))) {
      return {
        role: 'assistant',
        content: `
\`\`\`python
import pandas as pd
import matplotlib.pyplot as plt
import json
import os

# Get the current working directory
cwd = os.getcwd()
print(f"Working directory: {cwd}")

# List files in the directory
print("Files in directory:")
for file in os.listdir():
    print(f"- {file}")

# Analysis summary and insights
analysis_summary = "This is a mock analysis summary"
insights = ["Insight 1", "Insight 2", "Insight 3"]

# Print results
print(f"Analysis summary: {analysis_summary}")
print(f"Insights: {insights}")
\`\`\`
        `
      };
    } else if (options.messages.some(m => m.content.includes('Summarize the following search results'))) {
      return {
        role: 'assistant',
        content: 'This is a mock research summary based on the search results.'
      };
    }
    
    return {
      role: 'assistant',
      content: 'Mock response'
    };
  })
};

const mockCodeInterpreter = {
  executeCode: jest.fn().mockImplementation(async (options) => {
    return {
      output: `
Working directory: /tmp/data-analysis/12345
Files in directory:
- analysis.py
- source_0_sales_data.csv
Analysis summary: This is a mock analysis summary
Insights: ["Insight 1", "Insight 2", "Insight 3"]
      `,
      error: null
    };
  })
};

const mockBrowserService = {
  createBrowser: jest.fn().mockImplementation(async () => {
    return {
      navigateToUrl: jest.fn().mockImplementation(async (url) => {
        return {
          fillForm: jest.fn(),
          submitForm: jest.fn(),
          waitForSelector: jest.fn(),
          extractContent: jest.fn().mockResolvedValue([
            {
              title: 'Mock Search Result 1',
              url: 'https://example.com/result1',
              snippet: 'This is a mock search result snippet.'
            },
            {
              title: 'Mock Search Result 2',
              url: 'https://example.com/result2',
              snippet: 'This is another mock search result snippet.'
            }
          ]),
          extractMainContent: jest.fn().mockResolvedValue('Mock page content'),
          getHtml: jest.fn().mockResolvedValue('<html><body>Mock HTML</body></html>'),
          getText: jest.fn().mockResolvedValue('Mock text content'),
          getContent: jest.fn().mockResolvedValue('{"mock": "json content"}')
        };
      }),
      close: jest.fn()
    };
  })
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
    copyFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock file content')),
    readdirSync: jest.fn().mockReturnValue(['analysis.py', 'visualization.png']),
    rmSync: jest.fn()
  };
});

describe('DataAnalysisAgent', () => {
  let agent: DataAnalysisAgent;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    agent = new DataAnalysisAgent(
      {
        name: 'Test Agent',
        modelProvider: 'openai',
        modelName: 'gpt-3.5-turbo',
        codeInterpreterEnabled: true,
        browserEnabled: true
      },
      mockRuntimeService as any,
      mockCodeInterpreter as any,
      mockBrowserService as any,
      mockObservability as any
    );
  });
  
  afterEach(() => {
    agent.dispose();
  });
  
  describe('analyzeData', () => {
    it('should analyze data and return results', async () => {
      const request: AnalysisRequest = {
        dataSources: [
          {
            type: DataSourceType.FILE,
            location: path.join(__dirname, '..', 'data', 'sales_data.csv'),
            format: DataFormat.CSV
          }
        ],
        analysisType: AnalysisType.EXPLORATORY,
        question: 'What are the sales trends?',
        visualizationType: VisualizationType.BAR,
        includeCode: true
      };
      
      const result = await agent.analyzeData(request);
      
      expect(result).toBeDefined();
      expect(result.summary).toBe('This is a mock analysis summary');
      expect(result.insights).toEqual(['Insight 1', 'Insight 2', 'Insight 3']);
      expect(result.error).toBeUndefined();
      expect(result.visualizationData).toBeDefined();
      expect(result.executedCode).toBeDefined();
      
      // Check if runtime service was called
      expect(mockRuntimeService.generateResponse).toHaveBeenCalled();
      
      // Check if code interpreter was called
      expect(mockCodeInterpreter.executeCode).toHaveBeenCalled();
    });
    
    it('should handle errors during analysis', async () => {
      // Mock code interpreter to throw an error
      mockCodeInterpreter.executeCode.mockRejectedValueOnce(new Error('Mock execution error'));
      
      const request: AnalysisRequest = {
        dataSources: [
          {
            type: DataSourceType.FILE,
            location: path.join(__dirname, '..', 'data', 'sales_data.csv'),
            format: DataFormat.CSV
          }
        ],
        analysisType: AnalysisType.EXPLORATORY,
        question: 'What are the sales trends?'
      };
      
      const result = await agent.analyzeData(request);
      
      expect(result).toBeDefined();
      expect(result.summary).toBe('Analysis failed');
      expect(result.error).toBeDefined();
      
      // Check if error was logged
      expect(mockObservability.getLogger().error).toHaveBeenCalled();
    });
  });
  
  describe('performWebResearch', () => {
    it('should perform web research and return results', async () => {
      const request: WebResearchRequest = {
        query: 'test query',
        maxResults: 2,
        includeContent: true
      };
      
      const result = await agent.performWebResearch(request);
      
      expect(result).toBeDefined();
      expect(result.query).toBe('test query');
      expect(result.results).toHaveLength(2);
      expect(result.summary).toBeDefined();
      
      // Check if browser service was called
      expect(mockBrowserService.createBrowser).toHaveBeenCalled();
      
      // Check if runtime service was called for summary
      expect(mockRuntimeService.generateResponse).toHaveBeenCalled();
    });
    
    it('should handle errors during web research', async () => {
      // Mock browser service to throw an error
      mockBrowserService.createBrowser.mockRejectedValueOnce(new Error('Mock browser error'));
      
      const request: WebResearchRequest = {
        query: 'test query'
      };
      
      const result = await agent.performWebResearch(request);
      
      expect(result).toBeDefined();
      expect(result.query).toBe('test query');
      expect(result.results).toEqual([]);
      expect(result.summary).toContain('Research failed');
      
      // Check if error was logged
      expect(mockObservability.getLogger().error).toHaveBeenCalled();
    });
  });
});