/**
 * Puppeteer browser manager for AWS AgentCore
 * This implementation uses Puppeteer to create headless browsers for web browsing
 */
import * as puppeteer from 'puppeteer';
import { v4 as uuidv4 } from 'uuid';
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
  Image, 
  Link, 
  NavigationRequest, 
  NavigationResponse 
} from '../models/browser';

/**
 * Puppeteer browser configuration
 */
export interface PuppeteerBrowserConfig {
  headless?: boolean;
  defaultTimeout?: number;
  defaultViewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  executablePath?: string;
  ignoreHTTPSErrors?: boolean;
  args?: string[];
}

/**
 * Puppeteer browser manager implementation
 */
export class PuppeteerBrowserManager implements BrowserManager {
  private config: PuppeteerBrowserConfig;
  private browser: puppeteer.Browser | null;
  private page: puppeteer.Page | null;
  private ready: boolean;
  
  constructor(config: PuppeteerBrowserConfig = {}) {
    this.config = {
      headless: config.headless !== false,
      defaultTimeout: config.defaultTimeout || 30000,
      defaultViewport: config.defaultViewport || {
        width: 1280,
        height: 800,
      },
      userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      executablePath: config.executablePath,
      ignoreHTTPSErrors: config.ignoreHTTPSErrors !== false,
      args: config.args || [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
      ],
    };
    this.browser = null;
    this.page = null;
    this.ready = false;
    
    logger.info('Puppeteer browser manager initialized', {
      headless: this.config.headless,
      defaultTimeout: this.config.defaultTimeout,
      viewport: this.config.defaultViewport,
    });
  }
  
  /**
   * Initialize the browser
   */
  async initialize(): Promise<void> {
    try {
      // Launch the browser
      this.browser = await puppeteer.launch({
        headless: this.config.headless,
        defaultViewport: this.config.defaultViewport,
        args: this.config.args,
        executablePath: this.config.executablePath,
        ignoreHTTPSErrors: this.config.ignoreHTTPSErrors,
      });
      
      // Create a new page
      this.page = await this.browser.newPage();
      
      // Set user agent
      await this.page.setUserAgent(this.config.userAgent!);
      
      // Set default timeout
      this.page.setDefaultTimeout(this.config.defaultTimeout!);
      
      // Set up error handling
      this.page.on('error', (error) => {
        logger.error('Page error', { error });
      });
      
      this.page.on('pageerror', (error) => {
        logger.error('Page JavaScript error', { error });
      });
      
      this.ready = true;
      logger.info('Puppeteer browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Puppeteer browser', { error });
      throw new Error(`Failed to initialize Puppeteer browser: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Navigate to a URL
   * @param request The navigation request
   */
  async navigate(request: NavigationRequest): Promise<NavigationResponse> {
    try {
      logger.debug('Navigating to URL', { request });
      
      if (!this.ready || !this.page) {
        throw new Error('Browser is not initialized');
      }
      
      const startTime = Date.now();
      const requestId = request.requestId || uuidv4();
      
      // Set cookies if provided
      if (request.cookies && request.cookies.length > 0) {
        await this.setCookies(request.cookies);
      }
      
      // Set extra HTTP headers if provided
      if (request.headers) {
        await this.page.setExtraHTTPHeaders(request.headers);
      }
      
      // Navigate to the URL
      const response = await this.page.goto(request.url, {
        waitUntil: request.waitUntil || 'networkidle2',
        timeout: request.timeout || this.config.defaultTimeout,
        referer: request.referer,
      });
      
      if (!response) {
        throw new Error('Navigation failed: No response received');
      }
      
      // Get the page title
      const title = await this.page.title();
      
      // Get the current URL (may be different from the requested URL due to redirects)
      const url = this.page.url();
      
      // Get cookies
      const cookies = await this.getCookies();
      
      // Create the response
      const navigationResponse: NavigationResponse = {
        url,
        title,
        cookies,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          statusCode: response.status(),
          statusText: response.statusText(),
          headers: response.headers(),
          duration: Date.now() - startTime,
        },
      };
      
      logger.debug('Navigation completed', { url, title, statusCode: response.status() });
      
      return navigationResponse;
    } catch (error) {
      logger.error('Error navigating to URL', { error, url: request.url });
      
      return {
        url: request.url,
        title: '',
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
  
  /**
   * Extract content from the current page
   * @param request The content extraction request
   */
  async extractContent(request: ContentExtractionRequest): Promise<ContentExtractionResponse> {
    try {
      logger.debug('Extracting content', { request });
      
      if (!this.ready || !this.page) {
        throw new Error('Browser is not initialized');
      }
      
      const requestId = request.requestId || uuidv4();
      const selector = request.selector;
      const xpath = request.xpath;
      
      // Determine the target element
      let element: puppeteer.ElementHandle | null = null;
      
      if (selector) {
        element = await this.page.$(selector);
      } else if (xpath) {
        const elements = await this.page.$x(xpath);
        if (elements.length > 0) {
          element = elements[0];
        }
      }
      
      // Extract content based on the request
      const response: ContentExtractionResponse = {
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          selector,
          xpath,
        },
      };
      
      // Extract text if requested
      if (request.extractText) {
        if (element) {
          response.text = await this.page.evaluate(el => el.textContent || '', element);
        } else {
          response.text = await this.page.evaluate(() => document.body.textContent || '');
        }
      }
      
      // Extract HTML if requested
      if (request.includeHtml) {
        if (element) {
          response.html = await this.page.evaluate(el => el.outerHTML, element);
        } else {
          response.html = await this.page.evaluate(() => document.documentElement.outerHTML);
        }
      }
      
      // Extract links if requested
      if (request.extractLinks) {
        response.links = await this.extractLinks(selector);
      }
      
      // Extract images if requested
      if (request.extractImages) {
        response.images = await this.extractImages(selector);
      }
      
      logger.debug('Content extraction completed', { 
        hasText: !!response.text, 
        hasHtml: !!response.html,
        linkCount: response.links?.length,
        imageCount: response.images?.length,
      });
      
      return response;
    } catch (error) {
      logger.error('Error extracting content', { error });
      
      return {
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
  
  /**
   * Interact with an element on the current page
   * @param request The element interaction request
   */
  async interactWithElement(request: ElementInteractionRequest): Promise<ElementInteractionResponse> {
    try {
      logger.debug('Interacting with element', { request });
      
      if (!this.ready || !this.page) {
        throw new Error('Browser is not initialized');
      }
      
      const requestId = request.requestId || uuidv4();
      const selector = request.selector;
      const xpath = request.xpath;
      const timeout = request.timeout || this.config.defaultTimeout;
      
      // Determine the target element
      let element: puppeteer.ElementHandle | null = null;
      
      if (selector) {
        // Wait for the element to be available
        await this.page.waitForSelector(selector, { timeout });
        element = await this.page.$(selector);
      } else if (xpath) {
        // Wait for the element to be available
        await this.page.waitForXPath(xpath, { timeout });
        const elements = await this.page.$x(xpath);
        if (elements.length > 0) {
          element = elements[0];
        }
      }
      
      if (!element) {
        throw new Error('Element not found');
      }
      
      // Perform the requested action
      switch (request.action) {
        case 'click':
          await element.click();
          break;
          
        case 'type':
          if (!request.value) {
            throw new Error('Value is required for type action');
          }
          await element.type(request.value);
          break;
          
        case 'select':
          if (!request.value) {
            throw new Error('Value is required for select action');
          }
          await element.select(request.value);
          break;
          
        case 'hover':
          await element.hover();
          break;
          
        case 'focus':
          await element.focus();
          break;
          
        case 'blur':
          await this.page.evaluate(el => el.blur(), element);
          break;
          
        default:
          throw new Error(`Unsupported action: ${request.action}`);
      }
      
      logger.debug('Element interaction completed', { action: request.action });
      
      return {
        success: true,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          action: request.action,
          selector,
          xpath,
        },
      };
    } catch (error) {
      logger.error('Error interacting with element', { error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
  
  /**
   * Submit a form on the current page
   * @param request The form submission request
   */
  async submitForm(request: FormSubmissionRequest): Promise<FormSubmissionResponse> {
    try {
      logger.debug('Submitting form', { request });
      
      if (!this.ready || !this.page) {
        throw new Error('Browser is not initialized');
      }
      
      const requestId = request.requestId || uuidv4();
      const selector = request.selector;
      const xpath = request.xpath;
      const timeout = request.timeout || this.config.defaultTimeout;
      
      // Determine the form element
      let formElement: puppeteer.ElementHandle | null = null;
      
      if (selector) {
        // Wait for the form to be available
        await this.page.waitForSelector(selector, { timeout });
        formElement = await this.page.$(selector);
      } else if (xpath) {
        // Wait for the form to be available
        await this.page.waitForXPath(xpath, { timeout });
        const elements = await this.page.$x(xpath);
        if (elements.length > 0) {
          formElement = elements[0];
        }
      }
      
      if (!formElement) {
        throw new Error('Form not found');
      }
      
      // Fill the form fields
      for (const [name, value] of Object.entries(request.formData)) {
        // Find the input field
        const inputSelector = `${selector || ''} [name="${name}"]`;
        const input = await this.page.$(inputSelector);
        
        if (input) {
          // Determine the input type
          const inputType = await this.page.evaluate(el => el.type, input);
          
          switch (inputType.toLowerCase()) {
            case 'checkbox':
              if (value === 'true' || value === '1') {
                await input.click();
              }
              break;
              
            case 'radio':
              if (value === 'true' || value === '1') {
                await input.click();
              }
              break;
              
            case 'select-one':
            case 'select-multiple':
              await input.select(value);
              break;
              
            default:
              // Clear the input field first
              await this.page.evaluate(el => el.value = '', input);
              // Type the value
              await input.type(value);
              break;
          }
        }
      }
      
      // Submit the form
      let navigationPromise: Promise<puppeteer.HTTPResponse | null> | null = null;
      
      if (request.waitForNavigation) {
        navigationPromise = this.page.waitForNavigation({
          waitUntil: 'networkidle2',
          timeout,
        });
      }
      
      if (request.submitButtonSelector) {
        // Click the submit button
        await this.page.click(request.submitButtonSelector);
      } else {
        // Submit the form
        await this.page.evaluate(form => form.submit(), formElement);
      }
      
      // Wait for navigation if requested
      if (navigationPromise) {
        await navigationPromise;
      }
      
      // Get the current URL
      const url = this.page.url();
      
      logger.debug('Form submission completed', { url });
      
      return {
        success: true,
        url,
        metadata: {
          requestId,
          timestamp: new Date().toISOString(),
          formSelector: selector,
          formXpath: xpath,
        },
      };
    } catch (error) {
      logger.error('Error submitting form', { error });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
  
  /**
   * Get cookies from the current page
   */
  async getCookies(): Promise<Cookie[]> {
    try {
      if (!this.ready || !this.page) {
        throw new Error('Browser is not initialized');
      }
      
      const puppeteerCookies = await this.page.cookies();
      
      // Convert Puppeteer cookies to our Cookie format
      const cookies: Cookie[] = puppeteerCookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None',
      }));
      
      return cookies;
    } catch (error) {
      logger.error('Error getting cookies', { error });
      return [];
    }
  }
  
  /**
   * Set cookies for the current page
   * @param cookies The cookies to set
   */
  async setCookies(cookies: Cookie[]): Promise<void> {
    try {
      if (!this.ready || !this.page) {
        throw new Error('Browser is not initialized');
      }
      
      // Convert our Cookie format to Puppeteer cookies
      const puppeteerCookies = cookies.map(cookie => ({
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      }));
      
      await this.page.setCookie(...puppeteerCookies);
    } catch (error) {
      logger.error('Error setting cookies', { error });
      throw error;
    }
  }
  
  /**
   * Take a screenshot of the current page
   * @param fullPage Whether to take a screenshot of the full page
   */
  async takeScreenshot(fullPage: boolean = false): Promise<string> {
    try {
      if (!this.ready || !this.page) {
        throw new Error('Browser is not initialized');
      }
      
      // Take a screenshot
      const screenshot = await this.page.screenshot({
        encoding: 'base64',
        fullPage,
      });
      
      return screenshot.toString();
    } catch (error) {
      logger.error('Error taking screenshot', { error });
      throw error;
    }
  }
  
  /**
   * Close the browser
   */
  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
        this.ready = false;
        
        logger.info('Puppeteer browser closed');
      }
    } catch (error) {
      logger.error('Error closing Puppeteer browser', { error });
      throw error;
    }
  }
  
  /**
   * Check if the browser is ready
   */
  isReady(): boolean {
    return this.ready;
  }
  
  /**
   * Extract links from the current page
   * @param selector The CSS selector to extract links from
   */
  private async extractLinks(selector?: string): Promise<Link[]> {
    if (!this.page) {
      return [];
    }
    
    try {
      // Extract links from the page
      const links = await this.page.evaluate((sel) => {
        const elements = sel ? document.querySelectorAll(`${sel} a`) : document.querySelectorAll('a');
        
        return Array.from(elements).map(el => ({
          url: el.href,
          text: el.textContent || '',
          title: el.title || undefined,
        }));
      }, selector || '');
      
      return links;
    } catch (error) {
      logger.error('Error extracting links', { error });
      return [];
    }
  }
  
  /**
   * Extract images from the current page
   * @param selector The CSS selector to extract images from
   */
  private async extractImages(selector?: string): Promise<Image[]> {
    if (!this.page) {
      return [];
    }
    
    try {
      // Extract images from the page
      const images = await this.page.evaluate((sel) => {
        const elements = sel ? document.querySelectorAll(`${sel} img`) : document.querySelectorAll('img');
        
        return Array.from(elements).map(el => ({
          url: el.src,
          alt: el.alt || undefined,
          width: el.width || undefined,
          height: el.height || undefined,
        }));
      }, selector || '');
      
      return images;
    } catch (error) {
      logger.error('Error extracting images', { error });
      return [];
    }
  }
}