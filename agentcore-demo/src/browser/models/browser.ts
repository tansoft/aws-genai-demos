/**
 * Browser models for AWS AgentCore
 */

/**
 * Browser navigation request
 */
export interface NavigationRequest {
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  timeout?: number;
  referer?: string;
  headers?: Record<string, string>;
  cookies?: Cookie[];
  requestId?: string;
  userId?: string;
}

/**
 * Browser navigation response
 */
export interface NavigationResponse {
  url: string;
  title: string;
  content?: string;
  screenshot?: string;
  cookies?: Cookie[];
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Content extraction request
 */
export interface ContentExtractionRequest {
  selector?: string;
  xpath?: string;
  includeHtml?: boolean;
  extractLinks?: boolean;
  extractImages?: boolean;
  extractText?: boolean;
  requestId?: string;
}

/**
 * Content extraction response
 */
export interface ContentExtractionResponse {
  text?: string;
  html?: string;
  links?: Link[];
  images?: Image[];
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Element interaction request
 */
export interface ElementInteractionRequest {
  selector?: string;
  xpath?: string;
  action: 'click' | 'type' | 'select' | 'hover' | 'focus' | 'blur';
  value?: string;
  timeout?: number;
  requestId?: string;
}

/**
 * Element interaction response
 */
export interface ElementInteractionResponse {
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Form submission request
 */
export interface FormSubmissionRequest {
  selector?: string;
  xpath?: string;
  formData: Record<string, string>;
  submitButtonSelector?: string;
  waitForNavigation?: boolean;
  timeout?: number;
  requestId?: string;
}

/**
 * Form submission response
 */
export interface FormSubmissionResponse {
  success: boolean;
  url?: string;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Cookie
 */
export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

/**
 * Link
 */
export interface Link {
  url: string;
  text: string;
  title?: string;
}

/**
 * Image
 */
export interface Image {
  url: string;
  alt?: string;
  width?: number;
  height?: number;
}

/**
 * Browser manager interface
 */
export interface BrowserManager {
  /**
   * Initialize the browser
   */
  initialize(): Promise<void>;
  
  /**
   * Navigate to a URL
   * @param request The navigation request
   */
  navigate(request: NavigationRequest): Promise<NavigationResponse>;
  
  /**
   * Extract content from the current page
   * @param request The content extraction request
   */
  extractContent(request: ContentExtractionRequest): Promise<ContentExtractionResponse>;
  
  /**
   * Interact with an element on the current page
   * @param request The element interaction request
   */
  interactWithElement(request: ElementInteractionRequest): Promise<ElementInteractionResponse>;
  
  /**
   * Submit a form on the current page
   * @param request The form submission request
   */
  submitForm(request: FormSubmissionRequest): Promise<FormSubmissionResponse>;
  
  /**
   * Get cookies from the current page
   */
  getCookies(): Promise<Cookie[]>;
  
  /**
   * Set cookies for the current page
   * @param cookies The cookies to set
   */
  setCookies(cookies: Cookie[]): Promise<void>;
  
  /**
   * Take a screenshot of the current page
   * @param fullPage Whether to take a screenshot of the full page
   */
  takeScreenshot(fullPage?: boolean): Promise<string>;
  
  /**
   * Close the browser
   */
  close(): Promise<void>;
  
  /**
   * Check if the browser is ready
   */
  isReady(): boolean;
}

/**
 * Page navigator interface
 */
export interface PageNavigator {
  /**
   * Navigate to a URL
   * @param url The URL to navigate to
   * @param options Navigation options
   */
  navigateTo(url: string, options?: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
    referer?: string;
    headers?: Record<string, string>;
  }): Promise<{
    url: string;
    title: string;
  }>;
  
  /**
   * Go back in the browser history
   */
  goBack(): Promise<void>;
  
  /**
   * Go forward in the browser history
   */
  goForward(): Promise<void>;
  
  /**
   * Reload the current page
   */
  reload(): Promise<void>;
  
  /**
   * Get the current URL
   */
  getCurrentUrl(): Promise<string>;
  
  /**
   * Get the current page title
   */
  getPageTitle(): Promise<string>;
}

/**
 * Content extractor interface
 */
export interface ContentExtractor {
  /**
   * Extract text from the current page
   * @param selector The CSS selector to extract text from
   */
  extractText(selector?: string): Promise<string>;
  
  /**
   * Extract HTML from the current page
   * @param selector The CSS selector to extract HTML from
   */
  extractHtml(selector?: string): Promise<string>;
  
  /**
   * Extract links from the current page
   * @param selector The CSS selector to extract links from
   */
  extractLinks(selector?: string): Promise<Link[]>;
  
  /**
   * Extract images from the current page
   * @param selector The CSS selector to extract images from
   */
  extractImages(selector?: string): Promise<Image[]>;
}