/**
 * Browser module for AWS AgentCore
 * Provides web browsing capabilities
 */
import { config, logger } from '../common';
import { NavigationRequest } from './models/browser';
import { BrowserProviderType, BrowserService } from './services/browser-service';

// Export models and services
export * from './models/browser';
export * from './services/browser-service';
export * from './services/puppeteer-browser';

/**
 * Browser demo for AWS AgentCore
 * Demonstrates web browsing capabilities
 */
export default async function browserDemo() {
  logger.info('Starting Browser demo');
  
  try {
    // Check if browser is enabled
    if (!config.browser.enabled) {
      logger.info('Browser is disabled in config');
      return;
    }
    
    // Initialize the browser service
    const browser = new BrowserService({
      providerType: BrowserProviderType.PUPPETEER,
      puppeteer: {
        headless: config.browser.headless,
        defaultTimeout: config.browser.timeout,
      },
    });
    
    // Initialize the browser
    logger.info('Initializing browser...');
    await browser.initialize();
    
    // Navigate to a URL
    logger.info('Navigating to example.com...');
    
    const navigationRequest: NavigationRequest = {
      url: 'https://example.com',
    };
    
    const navigationResponse = await browser.navigate(navigationRequest);
    
    logger.info('Navigation result:', {
      url: navigationResponse.url,
      title: navigationResponse.title,
      error: navigationResponse.error,
    });
    
    // Extract content
    logger.info('Extracting content...');
    
    const contentResponse = await browser.extractContent({
      extractText: true,
      includeHtml: true,
      extractLinks: true,
      extractImages: true,
    });
    
    logger.info('Content extraction result:', {
      textLength: contentResponse.text?.length,
      htmlLength: contentResponse.html?.length,
      linkCount: contentResponse.links?.length,
      imageCount: contentResponse.images?.length,
      error: contentResponse.error,
    });
    
    // Take a screenshot
    logger.info('Taking screenshot...');
    
    const screenshot = await browser.takeScreenshot(true);
    
    logger.info('Screenshot taken', {
      screenshotLength: screenshot.length,
    });
    
    // Navigate to a more complex page
    logger.info('Navigating to a more complex page...');
    
    const complexNavigationRequest: NavigationRequest = {
      url: 'https://news.ycombinator.com',
    };
    
    const complexNavigationResponse = await browser.navigate(complexNavigationRequest);
    
    logger.info('Complex navigation result:', {
      url: complexNavigationResponse.url,
      title: complexNavigationResponse.title,
      error: complexNavigationResponse.error,
    });
    
    // Extract links
    logger.info('Extracting links...');
    
    const linksResponse = await browser.extractContent({
      extractLinks: true,
      selector: '.storylink',
    });
    
    logger.info('Links extraction result:', {
      linkCount: linksResponse.links?.length,
      error: linksResponse.error,
    });
    
    if (linksResponse.links && linksResponse.links.length > 0) {
      logger.info('First 5 links:', {
        links: linksResponse.links.slice(0, 5).map(link => ({
          url: link.url,
          text: link.text,
        })),
      });
    }
    
    // Close the browser
    logger.info('Closing browser...');
    await browser.close();
    
    logger.info('Browser demo completed successfully');
  } catch (error) {
    logger.error('Error in browser demo', { error });
  }
}