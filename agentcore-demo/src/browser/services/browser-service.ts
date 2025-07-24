/**
 * Browser service for AWS AgentCore
 */
import { logger } from '../../common';
import { 
  BrowserManager, 
  ContentExtractionRequest, 
  ContentExtractionResponse, 
  Cookie, 
  ElementInteractionRequest, 
  ElementInteractionResponse, 
  FormSubmissionRequest, 
  FormSubmissionResponse, 
  NavigationRequest, 
  NavigationResponse 
} from '../models/browser';
import { PuppeteerBrowserManager, PuppeteerBrowserConfig } from './puppeteer-browser';

/**
 * Browser provider type
 */
export enum BrowserProviderType {
  PUPPETEER = 'puppeteer',
  FARGATE = 'fargate',
}

/**
 * Browser service configuration
 */
export interface BrowserServiceConfig {
  providerType: BrowserProviderType;
  puppeteer?: PuppeteerBrowserConfig;
  fargate?: {
    clusterArn?: string;
    taskDefinitionArn?: string;
    subnetIds?: string[];
    securityGroupIds?: string[];
    region?: string;
  };
}

/**
 * Browser service
 */
export class BrowserService {
  private manager: BrowserManager;
  private config: BrowserServiceConfig;
  
  constructor(config: BrowserServiceConfig) {
    this.config = config;
    
    // Create the appropriate manager
    switch (config.providerType) {
      case BrowserProviderType.PUPPETEER:
        this.manager = new PuppeteerBrowserManager(config.puppeteer);
        break;
        
      case BrowserProviderType.FARGATE:
        // TODO: Implement Fargate browser manager
        throw new Error('Fargate browser manager not implemented yet');
        
      default:
        throw new Error(`Unsupported browser provider type: ${config.providerType}`);
    }
    
    logger.info('Browser service initialized', {
      providerType: config.providerType,
    });
  }
  
  /**
   * Initialize the browser
   */
  async initialize(): Promise<void> {
    return this.manager.initialize();
  }
  
  /**
   * Navigate to a URL
   * @param request The navigation request
   */
  async navigate(request: NavigationRequest): Promise<NavigationResponse> {
    return this.manager.navigate(request);
  }
  
  /**
   * Extract content from the current page
   * @param request The content extraction request
   */
  async extractContent(request: ContentExtractionRequest): Promise<ContentExtractionResponse> {
    return this.manager.extractContent(request);
  }
  
  /**
   * Interact with an element on the current page
   * @param request The element interaction request
   */
  async interactWithElement(request: ElementInteractionRequest): Promise<ElementInteractionResponse> {
    return this.manager.interactWithElement(request);
  }
  
  /**
   * Submit a form on the current page
   * @param request The form submission request
   */
  async submitForm(request: FormSubmissionRequest): Promise<FormSubmissionResponse> {
    return this.manager.submitForm(request);
  }
  
  /**
   * Get cookies from the current page
   */
  async getCookies(): Promise<Cookie[]> {
    return this.manager.getCookies();
  }
  
  /**
   * Set cookies for the current page
   * @param cookies The cookies to set
   */
  async setCookies(cookies: Cookie[]): Promise<void> {
    return this.manager.setCookies(cookies);
  }
  
  /**
   * Take a screenshot of the current page
   * @param fullPage Whether to take a screenshot of the full page
   */
  async takeScreenshot(fullPage?: boolean): Promise<string> {
    return this.manager.takeScreenshot(fullPage);
  }
  
  /**
   * Close the browser
   */
  async close(): Promise<void> {
    return this.manager.close();
  }
  
  /**
   * Check if the browser is ready
   */
  isReady(): boolean {
    return this.manager.isReady();
  }
  
  /**
   * Get the browser manager
   */
  getManager(): BrowserManager {
    return this.manager;
  }
}