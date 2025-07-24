/**
 * Example of web navigation and content extraction
 */
import { 
  BrowserProviderType, 
  BrowserService, 
  ContentExtractionRequest, 
  NavigationRequest 
} from '../';

/**
 * Run the navigation example
 */
async function runNavigationExample() {
  try {
    console.log('Starting navigation example...');
    
    // Initialize the browser service
    const browser = new BrowserService({
      providerType: BrowserProviderType.PUPPETEER,
      puppeteer: {
        headless: true,
        defaultTimeout: 30000,
      },
    });
    
    // Initialize the browser
    console.log('Initializing browser...');
    await browser.initialize();
    
    // Navigate to Wikipedia
    console.log('\nNavigating to Wikipedia...');
    
    const wikipediaRequest: NavigationRequest = {
      url: 'https://en.wikipedia.org/wiki/Main_Page',
      waitUntil: 'networkidle2',
    };
    
    const wikipediaResponse = await browser.navigate(wikipediaRequest);
    
    console.log('Wikipedia navigation result:');
    console.log(`- URL: ${wikipediaResponse.url}`);
    console.log(`- Title: ${wikipediaResponse.title}`);
    
    if (wikipediaResponse.error) {
      console.log(`- Error: ${wikipediaResponse.error}`);
    }
    
    // Extract featured article
    console.log('\nExtracting featured article...');
    
    const featuredArticleRequest: ContentExtractionRequest = {
      selector: '#mp-tfa',
      extractText: true,
      includeHtml: false,
      extractLinks: true,
    };
    
    const featuredArticleResponse = await browser.extractContent(featuredArticleRequest);
    
    console.log('Featured article:');
    
    if (featuredArticleResponse.text) {
      console.log(`- Text preview: ${featuredArticleResponse.text.substring(0, 200)}...`);
    }
    
    if (featuredArticleResponse.links && featuredArticleResponse.links.length > 0) {
      console.log('- Links in featured article:');
      featuredArticleResponse.links.slice(0, 5).forEach((link, index) => {
        console.log(`  ${index + 1}. ${link.text} - ${link.url}`);
      });
      
      // Navigate to the first link in the featured article
      if (featuredArticleResponse.links.length > 0) {
        const firstLink = featuredArticleResponse.links[0];
        
        console.log(`\nNavigating to first link: ${firstLink.text} (${firstLink.url})...`);
        
        const linkNavigationRequest: NavigationRequest = {
          url: firstLink.url,
          waitUntil: 'networkidle2',
        };
        
        const linkNavigationResponse = await browser.navigate(linkNavigationRequest);
        
        console.log('Link navigation result:');
        console.log(`- URL: ${linkNavigationResponse.url}`);
        console.log(`- Title: ${linkNavigationResponse.title}`);
        
        // Extract the first paragraph
        console.log('\nExtracting first paragraph...');
        
        const paragraphRequest: ContentExtractionRequest = {
          selector: '.mw-parser-output > p:not(.mw-empty-elt)',
          extractText: true,
        };
        
        const paragraphResponse = await browser.extractContent(paragraphRequest);
        
        if (paragraphResponse.text) {
          console.log('First paragraph:');
          console.log(paragraphResponse.text);
        }
        
        // Take a screenshot
        console.log('\nTaking screenshot...');
        
        const screenshot = await browser.takeScreenshot(false);
        
        console.log(`Screenshot taken (${screenshot.length} bytes)`);
      }
    }
    
    // Navigate to a news site
    console.log('\nNavigating to a news site...');
    
    const newsRequest: NavigationRequest = {
      url: 'https://news.ycombinator.com',
      waitUntil: 'domcontentloaded',
    };
    
    const newsResponse = await browser.navigate(newsRequest);
    
    console.log('News site navigation result:');
    console.log(`- URL: ${newsResponse.url}`);
    console.log(`- Title: ${newsResponse.title}`);
    
    // Extract news headlines
    console.log('\nExtracting news headlines...');
    
    const headlinesRequest: ContentExtractionRequest = {
      selector: '.titleline > a',
      extractText: true,
      extractLinks: true,
    };
    
    const headlinesResponse = await browser.extractContent(headlinesRequest);
    
    if (headlinesResponse.links && headlinesResponse.links.length > 0) {
      console.log(`Found ${headlinesResponse.links.length} headlines:`);
      headlinesResponse.links.slice(0, 10).forEach((link, index) => {
        console.log(`${index + 1}. ${link.text} - ${link.url}`);
      });
    }
    
    // Navigate to a complex page with images
    console.log('\nNavigating to a page with images...');
    
    const imagesRequest: NavigationRequest = {
      url: 'https://unsplash.com/s/photos/nature',
      waitUntil: 'networkidle2',
    };
    
    const imagesResponse = await browser.navigate(imagesRequest);
    
    console.log('Images page navigation result:');
    console.log(`- URL: ${imagesResponse.url}`);
    console.log(`- Title: ${imagesResponse.title}`);
    
    // Extract images
    console.log('\nExtracting images...');
    
    const extractImagesRequest: ContentExtractionRequest = {
      extractImages: true,
    };
    
    const extractImagesResponse = await browser.extractContent(extractImagesRequest);
    
    if (extractImagesResponse.images && extractImagesResponse.images.length > 0) {
      console.log(`Found ${extractImagesResponse.images.length} images:`);
      extractImagesResponse.images.slice(0, 5).forEach((image, index) => {
        console.log(`${index + 1}. ${image.alt || 'No alt text'} - ${image.url}`);
        console.log(`   Size: ${image.width}x${image.height}`);
      });
    }
    
    // Close the browser
    console.log('\nClosing browser...');
    await browser.close();
    
    console.log('\nNavigation example completed successfully');
  } catch (error) {
    console.error('Error in navigation example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runNavigationExample();
}

export default runNavigationExample;