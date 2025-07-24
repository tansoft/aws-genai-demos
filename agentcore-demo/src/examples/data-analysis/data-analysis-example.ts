/**
 * Example demonstrating AWS AgentCore data analysis capabilities
 * This example integrates code interpreter and browser features
 */

import * as path from 'path';
import { RuntimeService } from '../../runtime/services/runtime-service';
import { ProviderFactory } from '../../runtime/services/provider-factory';
import { ProtocolFactory } from '../../runtime/services/protocol-factory';
import { CodeInterpreter } from '../../code-interpreter/services/code-interpreter';
import { DockerSandbox } from '../../code-interpreter/services/docker-sandbox';
import { BrowserService } from '../../browser/services/browser-service';
import { PuppeteerBrowser } from '../../browser/services/puppeteer-browser';
import { createObservabilityManager, LogLevel } from '../../observability';
import { DataAnalysisAgent } from './data-analysis-agent';
import { 
  AnalysisRequest, 
  AnalysisType, 
  DataSourceType, 
  DataFormat, 
  VisualizationType,
  WebResearchRequest
} from './models';

/**
 * Run the data analysis example
 */
async function runDataAnalysisExample() {
  console.log('=== AWS AgentCore Data Analysis Example ===');
  
  try {
    // Set up observability
    const observability = createObservabilityManager({
      logLevel: LogLevel.INFO,
      serviceName: 'data-analysis-example'
    });
    
    const logger = observability.getLogger();
    logger.info('Starting data analysis example');
    
    // Set up runtime service
    const providerFactory = new ProviderFactory();
    const protocolFactory = new ProtocolFactory();
    const runtimeService = new RuntimeService(providerFactory, protocolFactory);
    
    // Set up code interpreter
    const sandbox = new DockerSandbox({
      image: 'python:3.9',
      timeout: 30000,
      memoryLimit: '512m',
      enableNetwork: false
    });
    
    const codeInterpreter = new CodeInterpreter(sandbox);
    
    // Set up browser service
    const puppeteerBrowser = new PuppeteerBrowser({
      headless: true,
      timeout: 30000
    });
    
    const browserService = new BrowserService(puppeteerBrowser);
    
    // Create data analysis agent
    const dataAnalysisAgent = new DataAnalysisAgent(
      {
        name: 'Data Analysis Agent',
        modelProvider: process.env.MODEL_PROVIDER || 'openai',
        modelName: process.env.MODEL_NAME || 'gpt-3.5-turbo',
        codeInterpreterEnabled: true,
        browserEnabled: true
      },
      runtimeService,
      codeInterpreter,
      browserService,
      observability
    );
    
    try {
      // Example 1: Analyze sales data
      console.log('\n--- Example 1: Analyzing Sales Data ---');
      await runSalesDataAnalysis(dataAnalysisAgent);
      
      // Example 2: Analyze customer data
      console.log('\n--- Example 2: Analyzing Customer Data ---');
      await runCustomerDataAnalysis(dataAnalysisAgent);
      
      // Example 3: Web research
      console.log('\n--- Example 3: Performing Web Research ---');
      await runWebResearch(dataAnalysisAgent);
      
    } finally {
      // Clean up resources
      dataAnalysisAgent.dispose();
    }
    
    logger.info('Data analysis example completed');
    
  } catch (error) {
    console.error('Error running data analysis example:', error);
  }
}

/**
 * Run sales data analysis example
 * @param agent Data analysis agent
 */
async function runSalesDataAnalysis(agent: DataAnalysisAgent) {
  // Create analysis request
  const request: AnalysisRequest = {
    dataSources: [
      {
        type: DataSourceType.FILE,
        location: path.join(__dirname, 'data', 'sales_data.csv'),
        format: DataFormat.CSV
      }
    ],
    analysisType: AnalysisType.EXPLORATORY,
    question: 'What are the sales trends by region and product?',
    visualizationType: VisualizationType.BAR,
    includeCode: true,
    includeExplanation: true
  };
  
  console.log('Analyzing sales data...');
  
  // Perform analysis
  const result = await agent.analyzeData(request);
  
  // Display results
  console.log('\nAnalysis Summary:');
  console.log(result.summary);
  
  console.log('\nKey Insights:');
  result.insights.forEach((insight, index) => {
    console.log(`${index + 1}. ${insight}`);
  });
  
  if (result.error) {
    console.error('\nError:', result.error);
  }
  
  if (result.visualizationData) {
    console.log('\nVisualization generated. (Base64 data not shown)');
  }
}

/**
 * Run customer data analysis example
 * @param agent Data analysis agent
 */
async function runCustomerDataAnalysis(agent: DataAnalysisAgent) {
  // Create analysis request
  const request: AnalysisRequest = {
    dataSources: [
      {
        type: DataSourceType.FILE,
        location: path.join(__dirname, 'data', 'customer_data.json'),
        format: DataFormat.JSON
      }
    ],
    analysisType: AnalysisType.DESCRIPTIVE,
    question: 'What are the purchasing patterns by customer segment?',
    visualizationType: VisualizationType.PIE,
    includeCode: true,
    includeExplanation: true
  };
  
  console.log('Analyzing customer data...');
  
  // Perform analysis
  const result = await agent.analyzeData(request);
  
  // Display results
  console.log('\nAnalysis Summary:');
  console.log(result.summary);
  
  console.log('\nKey Insights:');
  result.insights.forEach((insight, index) => {
    console.log(`${index + 1}. ${insight}`);
  });
  
  if (result.error) {
    console.error('\nError:', result.error);
  }
  
  if (result.visualizationData) {
    console.log('\nVisualization generated. (Base64 data not shown)');
  }
}

/**
 * Run web research example
 * @param agent Data analysis agent
 */
async function runWebResearch(agent: DataAnalysisAgent) {
  // Create research request
  const request: WebResearchRequest = {
    query: 'latest trends in data analysis and visualization',
    maxResults: 3,
    includeContent: true
  };
  
  console.log('Performing web research...');
  
  // Perform research
  const result = await agent.performWebResearch(request);
  
  // Display results
  console.log('\nResearch Summary:');
  console.log(result.summary);
  
  console.log('\nSearch Results:');
  result.results.forEach((item, index) => {
    console.log(`\n${index + 1}. ${item.title}`);
    console.log(`   URL: ${item.url}`);
    console.log(`   Snippet: ${item.snippet}`);
  });
}

// Run the example if this file is executed directly
if (require.main === module) {
  runDataAnalysisExample()
    .then(() => console.log('\nExample finished'))
    .catch(err => console.error('Example failed:', err));
}

export { runDataAnalysisExample };