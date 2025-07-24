/**
 * Data Analysis Agent for AWS AgentCore
 * Integrates code interpreter and browser features
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { 
  RuntimeService 
} from '../../runtime/models/runtime';
import { 
  CodeInterpreter 
} from '../../code-interpreter/services/code-interpreter';
import { 
  BrowserService 
} from '../../browser/services/browser-service';
import { 
  ObservabilityManager, 
  LogLevel, 
  MetricUnit 
} from '../../observability/models/observability';
import { 
  DataAnalysisAgentConfig,
  AnalysisRequest,
  AnalysisResult,
  WebResearchRequest,
  WebResearchResult,
  DataSourceType,
  DataFormat
} from './models';

/**
 * Data Analysis Agent
 */
export class DataAnalysisAgent {
  private config: DataAnalysisAgentConfig;
  private runtimeService: RuntimeService;
  private codeInterpreter?: CodeInterpreter;
  private browserService?: BrowserService;
  private observability: ObservabilityManager;
  private logger: any;
  private metrics: any;
  private tracer: any;
  private workingDir: string;

  /**
   * Constructor
   * @param config Agent configuration
   * @param runtimeService Runtime service
   * @param codeInterpreter Code interpreter (optional)
   * @param browserService Browser service (optional)
   * @param observability Observability manager
   */
  constructor(
    config: DataAnalysisAgentConfig,
    runtimeService: RuntimeService,
    codeInterpreter?: CodeInterpreter,
    browserService?: BrowserService,
    observability?: ObservabilityManager
  ) {
    this.config = {
      ...config,
      codeInterpreterEnabled: config.codeInterpreterEnabled && !!codeInterpreter,
      browserEnabled: config.browserEnabled && !!browserService,
      supportedLanguages: config.supportedLanguages || ['python', 'javascript'],
      maxExecutionTime: config.maxExecutionTime || 30000 // 30 seconds
    };
    
    this.runtimeService = runtimeService;
    this.codeInterpreter = codeInterpreter;
    this.browserService = browserService;
    
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
    
    this.logger = this.observability.getLogger('data-analysis-agent');
    this.metrics = this.observability.getMetricsCollector();
    this.tracer = this.observability.getTracer();
    
    // Create working directory
    this.workingDir = path.join(process.cwd(), 'tmp', 'data-analysis', uuidv4());
    this.ensureWorkingDir();
    
    this.logger.info('Data analysis agent initialized', { config: this.config });
  }

  /**
   * Analyze data
   * @param request Analysis request
   * @returns Analysis result
   */
  public async analyzeData(request: AnalysisRequest): Promise<AnalysisResult> {
    const segment = this.tracer.startSegment('AnalyzeData');
    
    try {
      this.logger.info('Starting data analysis', { 
        analysisType: request.analysisType,
        dataSourceCount: request.dataSources.length
      });
      this.metrics.putMetric('AnalysisRequests', 1, MetricUnit.COUNT, {
        AnalysisType: request.analysisType
      });
      
      // Validate request
      this.validateAnalysisRequest(request);
      
      // Load data from sources
      const loadedData = await this.loadDataFromSources(request);
      
      // Generate analysis code
      const analysisCode = await this.generateAnalysisCode(request, loadedData);
      
      // Execute analysis code
      const analysisResult = await this.executeAnalysisCode(analysisCode, request);
      
      this.logger.info('Data analysis completed successfully');
      this.metrics.putMetric('AnalysisCompleted', 1, MetricUnit.COUNT, {
        AnalysisType: request.analysisType
      });
      
      return analysisResult;
      
    } catch (error) {
      this.logger.error('Error analyzing data', error as Error);
      this.metrics.putMetric('AnalysisErrors', 1, MetricUnit.COUNT, {
        AnalysisType: request.analysisType
      });
      this.tracer.addError(segment, error as Error);
      
      return {
        summary: 'Analysis failed',
        insights: [],
        error: (error as Error).message
      };
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Perform web research
   * @param request Web research request
   * @returns Web research result
   */
  public async performWebResearch(request: WebResearchRequest): Promise<WebResearchResult> {
    const segment = this.tracer.startSegment('PerformWebResearch');
    
    try {
      if (!this.config.browserEnabled || !this.browserService) {
        throw new Error('Browser feature is not enabled');
      }
      
      this.logger.info('Starting web research', { query: request.query });
      this.metrics.putMetric('WebResearchRequests', 1, MetricUnit.COUNT);
      
      // Initialize browser
      const browser = await this.browserService.createBrowser();
      
      try {
        // Navigate to search engine
        const page = await browser.navigateToUrl('https://www.google.com');
        
        // Perform search
        await page.fillForm('input[name="q"]', request.query);
        await page.submitForm('form[action="/search"]');
        
        // Wait for results
        await page.waitForSelector('#search');
        
        // Extract search results
        const searchResults = await page.extractContent('#search .g', {
          title: '.LC20lb',
          url: 'a[href]',
          snippet: '.VwiC3b'
        });
        
        // Limit results
        const maxResults = request.maxResults || 5;
        const limitedResults = searchResults.slice(0, maxResults);
        
        // Get content if requested
        if (request.includeContent) {
          for (const result of limitedResults) {
            try {
              const contentPage = await browser.navigateToUrl(result.url);
              const mainContent = await contentPage.extractMainContent();
              result.content = mainContent;
            } catch (error) {
              this.logger.warn('Error extracting content', { url: result.url, error: (error as Error).message });
            }
          }
        }
        
        // Generate summary if there are results
        let summary = '';
        if (limitedResults.length > 0) {
          summary = await this.generateResearchSummary(request.query, limitedResults);
        }
        
        this.logger.info('Web research completed successfully', { 
          query: request.query,
          resultCount: limitedResults.length
        });
        this.metrics.putMetric('WebResearchCompleted', 1, MetricUnit.COUNT);
        
        return {
          query: request.query,
          results: limitedResults,
          summary
        };
        
      } finally {
        // Close browser
        await browser.close();
      }
      
    } catch (error) {
      this.logger.error('Error performing web research', error as Error);
      this.metrics.putMetric('WebResearchErrors', 1, MetricUnit.COUNT);
      this.tracer.addError(segment, error as Error);
      
      return {
        query: request.query,
        results: [],
        summary: `Research failed: ${(error as Error).message}`
      };
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Validate analysis request
   * @param request Analysis request
   */
  private validateAnalysisRequest(request: AnalysisRequest): void {
    if (!request.dataSources || request.dataSources.length === 0) {
      throw new Error('At least one data source is required');
    }
    
    if (!request.analysisType) {
      throw new Error('Analysis type is required');
    }
    
    // Check if code interpreter is enabled for analysis
    if (!this.config.codeInterpreterEnabled || !this.codeInterpreter) {
      throw new Error('Code interpreter is required for data analysis but is not enabled');
    }
  }

  /**
   * Load data from sources
   * @param request Analysis request
   * @returns Loaded data files
   */
  private async loadDataFromSources(request: AnalysisRequest): Promise<string[]> {
    const segment = this.tracer.startSegment('LoadDataFromSources');
    
    try {
      const loadedFiles: string[] = [];
      
      for (const [index, source] of request.dataSources.entries()) {
        try {
          let filePath: string;
          
          switch (source.type) {
            case DataSourceType.FILE:
              filePath = await this.loadFileSource(source.location, index);
              break;
              
            case DataSourceType.URL:
              filePath = await this.loadUrlSource(source.location, source.format, index);
              break;
              
            case DataSourceType.API:
              filePath = await this.loadApiSource(source.location, source.parameters || {}, index);
              break;
              
            case DataSourceType.DATABASE:
              throw new Error('Database sources are not yet supported');
              
            default:
              throw new Error(`Unsupported data source type: ${source.type}`);
          }
          
          loadedFiles.push(filePath);
          
        } catch (error) {
          this.logger.error('Error loading data source', error as Error, { sourceIndex: index });
          throw new Error(`Error loading data source ${index}: ${(error as Error).message}`);
        }
      }
      
      return loadedFiles;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Load file source
   * @param location File location
   * @param index Source index
   * @returns File path
   */
  private async loadFileSource(location: string, index: number): Promise<string> {
    // Check if file exists
    if (!fs.existsSync(location)) {
      throw new Error(`File not found: ${location}`);
    }
    
    // Copy file to working directory
    const fileName = path.basename(location);
    const destPath = path.join(this.workingDir, `source_${index}_${fileName}`);
    
    fs.copyFileSync(location, destPath);
    
    this.logger.info('Loaded file source', { location, destPath });
    return destPath;
  }

  /**
   * Load URL source
   * @param url URL location
   * @param format Data format
   * @param index Source index
   * @returns File path
   */
  private async loadUrlSource(url: string, format: DataFormat, index: number): Promise<string> {
    if (!this.config.browserEnabled || !this.browserService) {
      throw new Error('Browser feature is required to load URL sources but is not enabled');
    }
    
    // Initialize browser
    const browser = await this.browserService.createBrowser();
    
    try {
      // Navigate to URL
      const page = await browser.navigateToUrl(url);
      
      // Extract content based on format
      let content: string;
      
      switch (format) {
        case DataFormat.HTML:
          content = await page.getHtml();
          break;
          
        case DataFormat.TEXT:
          content = await page.getText();
          break;
          
        case DataFormat.JSON:
          content = await page.getContent();
          // Try to parse as JSON to validate
          JSON.parse(content);
          break;
          
        case DataFormat.CSV:
          content = await page.getContent();
          break;
          
        case DataFormat.XML:
          content = await page.getContent();
          break;
          
        default:
          throw new Error(`Unsupported data format for URL source: ${format}`);
      }
      
      // Save content to file
      const extension = format.toLowerCase();
      const destPath = path.join(this.workingDir, `source_${index}.${extension}`);
      
      fs.writeFileSync(destPath, content);
      
      this.logger.info('Loaded URL source', { url, format, destPath });
      return destPath;
      
    } finally {
      // Close browser
      await browser.close();
    }
  }

  /**
   * Load API source
   * @param apiUrl API URL
   * @param parameters API parameters
   * @param index Source index
   * @returns File path
   */
  private async loadApiSource(apiUrl: string, parameters: Record<string, any>, index: number): Promise<string> {
    if (!this.config.browserEnabled || !this.browserService) {
      throw new Error('Browser feature is required to load API sources but is not enabled');
    }
    
    // Initialize browser
    const browser = await this.browserService.createBrowser();
    
    try {
      // Navigate to API URL
      const page = await browser.navigateToUrl(apiUrl);
      
      // Get API response
      const content = await page.getContent();
      
      // Try to parse as JSON to validate
      let jsonContent: any;
      try {
        jsonContent = JSON.parse(content);
      } catch (error) {
        throw new Error('API response is not valid JSON');
      }
      
      // Save content to file
      const destPath = path.join(this.workingDir, `source_${index}.json`);
      
      fs.writeFileSync(destPath, JSON.stringify(jsonContent, null, 2));
      
      this.logger.info('Loaded API source', { apiUrl, destPath });
      return destPath;
      
    } finally {
      // Close browser
      await browser.close();
    }
  }

  /**
   * Generate analysis code
   * @param request Analysis request
   * @param dataFiles Data files
   * @returns Analysis code
   */
  private async generateAnalysisCode(request: AnalysisRequest, dataFiles: string[]): Promise<string> {
    const segment = this.tracer.startSegment('GenerateAnalysisCode');
    
    try {
      this.logger.info('Generating analysis code');
      
      // Prepare data file information
      const dataFileInfo = dataFiles.map((filePath, index) => {
        const source = request.dataSources[index];
        return {
          path: filePath,
          type: source.type,
          format: source.format,
          filename: path.basename(filePath)
        };
      });
      
      // Create prompt for code generation
      const prompt = `
        Generate Python code to analyze the following data files:
        ${JSON.stringify(dataFileInfo, null, 2)}
        
        Analysis type: ${request.analysisType}
        ${request.question ? `Question to answer: ${request.question}` : ''}
        ${request.parameters ? `Additional parameters: ${JSON.stringify(request.parameters, null, 2)}` : ''}
        ${request.visualizationType ? `Create a ${request.visualizationType} visualization` : ''}
        
        Requirements:
        1. Use pandas for data loading and analysis
        2. Use matplotlib or seaborn for visualizations if needed
        3. Save any visualizations to files in the current directory
        4. Provide a summary of findings as a string variable named 'analysis_summary'
        5. Provide key insights as a list of strings in a variable named 'insights'
        6. Handle errors gracefully
        7. Include comments explaining the code
        
        Return only the Python code without any additional text.
      `;
      
      // Generate code using the runtime service
      const response = await this.runtimeService.generateResponse({
        provider: this.config.modelProvider,
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a data analysis expert. Generate Python code for data analysis based on the requirements.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        maxTokens: 2000
      });
      
      // Extract code from response
      const codeMatch = response.content.match(/```python\n([\s\S]*?)\n```/) || 
                        response.content.match(/```\n([\s\S]*?)\n```/) ||
                        [null, response.content];
      
      const code = codeMatch[1] || response.content;
      
      this.logger.info('Generated analysis code', { codeLength: code.length });
      return code;
      
    } catch (error) {
      this.logger.error('Error generating analysis code', error as Error);
      this.tracer.addError(segment, error as Error);
      throw new Error(`Failed to generate analysis code: ${(error as Error).message}`);
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Execute analysis code
   * @param code Analysis code
   * @param request Analysis request
   * @returns Analysis result
   */
  private async executeAnalysisCode(code: string, request: AnalysisRequest): Promise<AnalysisResult> {
    const segment = this.tracer.startSegment('ExecuteAnalysisCode');
    
    try {
      if (!this.codeInterpreter) {
        throw new Error('Code interpreter is not available');
      }
      
      this.logger.info('Executing analysis code');
      
      // Save code to file
      const codePath = path.join(this.workingDir, 'analysis.py');
      fs.writeFileSync(codePath, code);
      
      // Execute code
      const startTime = Date.now();
      const result = await this.codeInterpreter.executeCode({
        language: 'python',
        code,
        timeout: this.config.maxExecutionTime,
        workingDirectory: this.workingDir
      });
      const duration = Date.now() - startTime;
      
      this.metrics.putMetric('CodeExecutionTime', duration, MetricUnit.MILLISECONDS);
      
      // Check for errors
      if (result.error) {
        throw new Error(`Code execution failed: ${result.error}`);
      }
      
      // Parse output for summary and insights
      const summary = this.extractVariable(result.output, 'analysis_summary') || 'No summary provided';
      const insightsStr = this.extractVariable(result.output, 'insights');
      const insights = insightsStr ? this.parseInsights(insightsStr) : [];
      
      // Check for visualization files
      const visualizationFiles = this.findVisualizationFiles();
      let visualizationData = '';
      
      if (visualizationFiles.length > 0) {
        // Read the first visualization file as base64
        const visualizationPath = visualizationFiles[0];
        const visualizationBuffer = fs.readFileSync(visualizationPath);
        visualizationData = `data:image/png;base64,${visualizationBuffer.toString('base64')}`;
      }
      
      this.logger.info('Analysis code executed successfully', {
        executionTimeMs: duration,
        outputLength: result.output.length,
        visualizationCount: visualizationFiles.length
      });
      
      // Create result
      const analysisResult: AnalysisResult = {
        summary,
        insights,
        visualizationData,
        executionOutput: result.output
      };
      
      // Include code if requested
      if (request.includeCode) {
        analysisResult.executedCode = code;
      }
      
      return analysisResult;
      
    } catch (error) {
      this.logger.error('Error executing analysis code', error as Error);
      this.tracer.addError(segment, error as Error);
      
      return {
        summary: 'Analysis execution failed',
        insights: [],
        error: (error as Error).message,
        executedCode: request.includeCode ? code : undefined
      };
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Generate research summary
   * @param query Search query
   * @param results Search results
   * @returns Summary
   */
  private async generateResearchSummary(query: string, results: any[]): Promise<string> {
    const segment = this.tracer.startSegment('GenerateResearchSummary');
    
    try {
      this.logger.info('Generating research summary');
      
      // Create prompt for summary generation
      const prompt = `
        Summarize the following search results for the query: "${query}"
        
        Search Results:
        ${results.map((result, index) => `
          Result ${index + 1}:
          Title: ${result.title}
          URL: ${result.url}
          Snippet: ${result.snippet}
          ${result.content ? `Content: ${result.content.substring(0, 500)}...` : ''}
        `).join('\n')}
        
        Provide a concise summary that synthesizes the key information from these results.
      `;
      
      // Generate summary using the runtime service
      const response = await this.runtimeService.generateResponse({
        provider: this.config.modelProvider,
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Summarize search results concisely and accurately.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        maxTokens: 500
      });
      
      this.logger.info('Generated research summary');
      return response.content;
      
    } catch (error) {
      this.logger.error('Error generating research summary', error as Error);
      this.tracer.addError(segment, error as Error);
      return `Could not generate summary: ${(error as Error).message}`;
      
    } finally {
      this.tracer.endSegment(segment);
    }
  }

  /**
   * Extract variable from code output
   * @param output Code output
   * @param variableName Variable name
   * @returns Variable value or undefined
   */
  private extractVariable(output: string, variableName: string): string | undefined {
    // Look for print statements with the variable
    const regex = new RegExp(`${variableName}\\s*=\\s*["'\`]([^"'\`]*?)["'\`]|${variableName}:\\s*["'\`]([^"'\`]*?)["'\`]|print\\(${variableName}\\)\\s*([^\\n]*?)\\n`, 'i');
    const match = output.match(regex);
    
    if (match) {
      return match[1] || match[2] || match[3];
    }
    
    return undefined;
  }

  /**
   * Parse insights from string
   * @param insightsStr Insights string
   * @returns Array of insights
   */
  private parseInsights(insightsStr: string): string[] {
    try {
      // Try to parse as JSON array
      const insights = JSON.parse(insightsStr);
      if (Array.isArray(insights)) {
        return insights.map(insight => String(insight));
      }
    } catch (error) {
      // Not valid JSON, try to parse as string list
    }
    
    // Split by common list item patterns
    return insightsStr
      .split(/[\n,]|(?:\d+\.\s)/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  /**
   * Find visualization files in working directory
   * @returns Array of file paths
   */
  private findVisualizationFiles(): string[] {
    const files = fs.readdirSync(this.workingDir);
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg'];
    
    return files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .map(file => path.join(this.workingDir, file));
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