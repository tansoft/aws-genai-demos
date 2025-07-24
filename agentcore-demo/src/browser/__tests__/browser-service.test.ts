/**
 * Tests for browser service
 */
import { 
  BrowserProviderType, 
  BrowserService, 
  ContentExtractionRequest, 
  Cookie, 
  ElementInteractionRequest, 
  FormSubmissionRequest, 
  NavigationRequest 
} from '../';

// Mock the puppeteer browser manager
jest.mock('../services/puppeteer-browser', () => {
  return {
    PuppeteerBrowserManager: jest.fn().mockImplementation(() => {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        navigate: jest.fn().mockImplementation((request: NavigationRequest) => {
          return Promise.resolve({
            url: request.url,
            title: 'Mock Page Title',
            cookies: [],
            metadata: {
              requestId: 'mock-request-id',
              timestamp: new Date().toISOString(),
            },
          });
        }),
        extractContent: jest.fn().mockImplementation((request: ContentExtractionRequest) => {
          return Promise.resolve({
            text: request.extractText ? 'Mock text content' : undefined,
            html: request.includeHtml ? '<html><body>Mock HTML content</body></html>' : undefined,
            links: request.extractLinks ? [
              { url: 'https://example.com/link1', text: 'Link 1' },
              { url: 'https://example.com/link2', text: 'Link 2' },
            ] : undefined,
            images: request.extractImages ? [
              { url: 'https://example.com/image1.jpg', alt: 'Image 1' },
              { url: 'https://example.com/image2.jpg', alt: 'Image 2' },
            ] : undefined,
            metadata: {
              requestId: 'mock-request-id',
              timestamp: new Date().toISOString(),
            },
          });
        }),
        interactWithElement: jest.fn().mockImplementation((request: ElementInteractionRequest) => {
          return Promise.resolve({
            success: true,
            metadata: {
              requestId: 'mock-request-id',
              timestamp: new Date().toISOString(),
              action: request.action,
            },
          });
        }),
        submitForm: jest.fn().mockImplementation((request: FormSubmissionRequest) => {
          return Promise.resolve({
            success: true,
            url: 'https://example.com/submitted',
            metadata: {
              requestId: 'mock-request-id',
              timestamp: new Date().toISOString(),
            },
          });
        }),
        getCookies: jest.fn().mockResolvedValue([
          { name: 'cookie1', value: 'value1' },
          { name: 'cookie2', value: 'value2' },
        ]),
        setCookies: jest.fn().mockResolvedValue(undefined),
        takeScreenshot: jest.fn().mockResolvedValue('mock-screenshot-base64'),
        close: jest.fn().mockResolvedValue(undefined),
        isReady: jest.fn().mockReturnValue(true),
        getCurrentUrl: jest.fn().mockResolvedValue('https://example.com'),
        getPageTitle: jest.fn().mockResolvedValue('Mock Page Title'),
      };
    }),
  };
});

describe('BrowserService', () => {
  let browser: BrowserService;
  
  beforeEach(() => {
    browser = new BrowserService({
      providerType: BrowserProviderType.PUPPETEER,
      puppeteer: {
        headless: true,
      },
    });
  });
  
  it('should initialize successfully', async () => {
    await browser.initialize();
    expect(browser.isReady()).toBe(true);
  });
  
  it('should navigate to a URL', async () => {
    await browser.initialize();
    
    const request: NavigationRequest = {
      url: 'https://example.com',
    };
    
    const response = await browser.navigate(request);
    
    expect(response.url).toBe('https://example.com');
    expect(response.title).toBe('Mock Page Title');
  });
  
  it('should extract content', async () => {
    await browser.initialize();
    
    const request: ContentExtractionRequest = {
      extractText: true,
      includeHtml: true,
      extractLinks: true,
      extractImages: true,
    };
    
    const response = await browser.extractContent(request);
    
    expect(response.text).toBe('Mock text content');
    expect(response.html).toBe('<html><body>Mock HTML content</body></html>');
    expect(response.links).toHaveLength(2);
    expect(response.images).toHaveLength(2);
  });
  
  it('should interact with elements', async () => {
    await browser.initialize();
    
    const request: ElementInteractionRequest = {
      selector: '#test',
      action: 'click',
    };
    
    const response = await browser.interactWithElement(request);
    
    expect(response.success).toBe(true);
    expect(response.metadata?.action).toBe('click');
  });
  
  it('should submit forms', async () => {
    await browser.initialize();
    
    const request: FormSubmissionRequest = {
      selector: 'form',
      formData: {
        name: 'Test',
        email: 'test@example.com',
      },
    };
    
    const response = await browser.submitForm(request);
    
    expect(response.success).toBe(true);
    expect(response.url).toBe('https://example.com/submitted');
  });
  
  it('should get cookies', async () => {
    await browser.initialize();
    
    const cookies = await browser.getCookies();
    
    expect(cookies).toHaveLength(2);
    expect(cookies[0].name).toBe('cookie1');
    expect(cookies[0].value).toBe('value1');
  });
  
  it('should set cookies', async () => {
    await browser.initialize();
    
    const cookies: Cookie[] = [
      { name: 'test', value: 'value' },
    ];
    
    await expect(browser.setCookies(cookies)).resolves.not.toThrow();
  });
  
  it('should take screenshots', async () => {
    await browser.initialize();
    
    const screenshot = await browser.takeScreenshot();
    
    expect(screenshot).toBe('mock-screenshot-base64');
  });
  
  it('should close the browser', async () => {
    await browser.initialize();
    
    await expect(browser.close()).resolves.not.toThrow();
  });
});