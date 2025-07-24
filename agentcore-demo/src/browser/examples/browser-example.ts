/**
 * Example of using the browser
 */
import { 
  BrowserProviderType, 
  BrowserService, 
  ContentExtractionRequest, 
  ElementInteractionRequest, 
  FormSubmissionRequest, 
  NavigationRequest 
} from '../';

/**
 * Run the browser example
 */
async function runBrowserExample() {
  try {
    console.log('Starting browser example...');
    
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
    
    // Navigate to a URL
    console.log('\nNavigating to example.com...');
    
    const navigationRequest: NavigationRequest = {
      url: 'https://example.com',
    };
    
    const navigationResponse = await browser.navigate(navigationRequest);
    
    console.log('Navigation result:');
    console.log(`- URL: ${navigationResponse.url}`);
    console.log(`- Title: ${navigationResponse.title}`);
    
    if (navigationResponse.error) {
      console.log(`- Error: ${navigationResponse.error}`);
    }
    
    // Extract content
    console.log('\nExtracting content...');
    
    const contentRequest: ContentExtractionRequest = {
      extractText: true,
      includeHtml: true,
      extractLinks: true,
      extractImages: true,
    };
    
    const contentResponse = await browser.extractContent(contentRequest);
    
    console.log('Content extraction result:');
    
    if (contentResponse.text) {
      console.log(`- Text length: ${contentResponse.text.length} characters`);
      console.log(`- Text preview: ${contentResponse.text.substring(0, 100)}...`);
    }
    
    if (contentResponse.html) {
      console.log(`- HTML length: ${contentResponse.html.length} characters`);
    }
    
    if (contentResponse.links) {
      console.log(`- Links: ${contentResponse.links.length}`);
      
      if (contentResponse.links.length > 0) {
        console.log('  First 3 links:');
        contentResponse.links.slice(0, 3).forEach((link, index) => {
          console.log(`  ${index + 1}. ${link.text} - ${link.url}`);
        });
      }
    }
    
    if (contentResponse.images) {
      console.log(`- Images: ${contentResponse.images.length}`);
      
      if (contentResponse.images.length > 0) {
        console.log('  First 3 images:');
        contentResponse.images.slice(0, 3).forEach((image, index) => {
          console.log(`  ${index + 1}. ${image.alt || 'No alt text'} - ${image.url}`);
        });
      }
    }
    
    if (contentResponse.error) {
      console.log(`- Error: ${contentResponse.error}`);
    }
    
    // Take a screenshot
    console.log('\nTaking screenshot...');
    
    const screenshot = await browser.takeScreenshot(true);
    
    console.log(`Screenshot taken (${screenshot.length} bytes)`);
    
    // Navigate to a form page
    console.log('\nNavigating to a form page...');
    
    const formNavigationRequest: NavigationRequest = {
      url: 'https://httpbin.org/forms/post',
    };
    
    const formNavigationResponse = await browser.navigate(formNavigationRequest);
    
    console.log('Form navigation result:');
    console.log(`- URL: ${formNavigationResponse.url}`);
    console.log(`- Title: ${formNavigationResponse.title}`);
    
    // Fill out the form
    console.log('\nFilling out the form...');
    
    // Fill the customer name field
    const nameInteractionRequest: ElementInteractionRequest = {
      selector: 'input[name="custname"]',
      action: 'type',
      value: 'John Doe',
    };
    
    await browser.interactWithElement(nameInteractionRequest);
    
    // Select a pizza size
    const sizeInteractionRequest: ElementInteractionRequest = {
      selector: 'input[name="size"][value="medium"]',
      action: 'click',
    };
    
    await browser.interactWithElement(sizeInteractionRequest);
    
    // Select a topping
    const toppingInteractionRequest: ElementInteractionRequest = {
      selector: 'input[name="topping"][value="bacon"]',
      action: 'click',
    };
    
    await browser.interactWithElement(toppingInteractionRequest);
    
    // Submit the form
    console.log('\nSubmitting the form...');
    
    const formSubmissionRequest: FormSubmissionRequest = {
      selector: 'form',
      formData: {
        custname: 'John Doe',
        size: 'medium',
        topping: 'bacon',
        comments: 'Please deliver quickly!',
      },
      submitButtonSelector: 'button[type="submit"]',
      waitForNavigation: true,
    };
    
    const formSubmissionResponse = await browser.submitForm(formSubmissionRequest);
    
    console.log('Form submission result:');
    console.log(`- Success: ${formSubmissionResponse.success}`);
    
    if (formSubmissionResponse.url) {
      console.log(`- URL after submission: ${formSubmissionResponse.url}`);
    }
    
    if (formSubmissionResponse.error) {
      console.log(`- Error: ${formSubmissionResponse.error}`);
    }
    
    // Extract the response content
    console.log('\nExtracting response content...');
    
    const responseContentRequest: ContentExtractionRequest = {
      extractText: true,
      includeHtml: false,
    };
    
    const responseContentResponse = await browser.extractContent(responseContentRequest);
    
    console.log('Response content:');
    
    if (responseContentResponse.text) {
      console.log(responseContentResponse.text);
    }
    
    if (responseContentResponse.error) {
      console.log(`- Error: ${responseContentResponse.error}`);
    }
    
    // Get cookies
    console.log('\nGetting cookies...');
    
    const cookies = await browser.getCookies();
    
    console.log(`Found ${cookies.length} cookies:`);
    cookies.forEach((cookie, index) => {
      console.log(`${index + 1}. ${cookie.name}=${cookie.value}`);
    });
    
    // Close the browser
    console.log('\nClosing browser...');
    await browser.close();
    
    console.log('\nBrowser example completed successfully');
  } catch (error) {
    console.error('Error in browser example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runBrowserExample();
}

export default runBrowserExample;