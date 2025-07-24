/**
 * Models for the data analysis agent example
 */

/**
 * Data source type enum
 */
export enum DataSourceType {
  FILE = 'file',
  URL = 'url',
  DATABASE = 'database',
  API = 'api'
}

/**
 * Data format enum
 */
export enum DataFormat {
  CSV = 'csv',
  JSON = 'json',
  XML = 'xml',
  HTML = 'html',
  TEXT = 'text'
}

/**
 * Analysis type enum
 */
export enum AnalysisType {
  DESCRIPTIVE = 'descriptive',
  EXPLORATORY = 'exploratory',
  PREDICTIVE = 'predictive',
  PRESCRIPTIVE = 'prescriptive',
  CUSTOM = 'custom'
}

/**
 * Visualization type enum
 */
export enum VisualizationType {
  BAR = 'bar',
  LINE = 'line',
  PIE = 'pie',
  SCATTER = 'scatter',
  HEATMAP = 'heatmap',
  NONE = 'none'
}

/**
 * Data source interface
 */
export interface DataSource {
  type: DataSourceType;
  location: string;
  format: DataFormat;
  credentials?: Record<string, string>;
  parameters?: Record<string, any>;
}

/**
 * Analysis request interface
 */
export interface AnalysisRequest {
  dataSources: DataSource[];
  analysisType: AnalysisType;
  question?: string;
  parameters?: Record<string, any>;
  visualizationType?: VisualizationType;
  includeCode?: boolean;
  includeExplanation?: boolean;
}

/**
 * Analysis result interface
 */
export interface AnalysisResult {
  summary: string;
  insights: string[];
  data?: any;
  visualizationCode?: string;
  visualizationData?: string;
  executedCode?: string;
  executionOutput?: string;
  error?: string;
}

/**
 * Web research request interface
 */
export interface WebResearchRequest {
  query: string;
  maxResults?: number;
  includeContent?: boolean;
}

/**
 * Web research result interface
 */
export interface WebResearchResult {
  query: string;
  results: WebResearchItem[];
  summary?: string;
}

/**
 * Web research item interface
 */
export interface WebResearchItem {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

/**
 * Data analysis agent configuration interface
 */
export interface DataAnalysisAgentConfig {
  name: string;
  description?: string;
  modelProvider: string;
  modelName: string;
  codeInterpreterEnabled: boolean;
  browserEnabled: boolean;
  supportedLanguages?: string[];
  maxExecutionTime?: number;
}