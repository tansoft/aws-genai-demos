/**
 * Example of web interaction capabilities
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
 * Run the interaction example
 */
async function runInteractionExample() {
  try {
    console.log('Starting interaction example...');
    
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
    
    // Navigate to a search engine
    console.log('\nNavigating to DuckDuckGo...');
    
    const searchRequest: NavigationRequest = {
      url: 'https://duckduckgo.com/',
      waitUntil: 'networkidle2',
    };
    
    const searchResponse = await browser.navigate(searchRequest);
    
    console.log('Search engine navigation result:');
    console.log(`- URL: ${searchResponse.url}`);
    console.log(`- Title: ${searchResponse.title}`);
    
    // Perform a search
    console.log('\nPerforming a search...');
    
    // Type in the search box
    const searchInteractionRequest: ElementInteractionRequest = {
      selector: 'input[name="q"]',
      action: 'type',
      value: 'AWS AgentCore',
    };
    
    const searchInteractionResponse = await browser.interactWithElement(searchInteractionRequest);
    
    console.log('Search interaction result:');
    console.log(`- Success: ${searchInteractionResponse.success}`);
    
    if (searchInteractionResponse.error) {
      console.log(`- Error: ${searchInteractionResponse.error}`);
    }
    
    // Submit the search form
    console.log('\nSubmitting the search form...');
    
    const searchSubmissionRequest: FormSubmissionRequest = {
      selector: 'form#search_form',
      formData: {
        q: 'AWS AgentCore',
      },
      waitForNavigation: true,
    };
    
    const searchSubmissionResponse = await browser.submitForm(searchSubmissionRequest);
    
    console.log('Search submission result:');
    console.log(`- Success: ${searchSubmissionResponse.success}`);
    console.log(`- URL after submission: ${searchSubmissionResponse.url}`);
    
    if (searchSubmissionResponse.error) {
      console.log(`- Error: ${searchSubmissionResponse.error}`);
    }
    
    // Extract search results
    console.log('\nExtracting search results...');
    
    const resultsRequest: ContentExtractionRequest = {
      selector: '.result',
      extractText: true,
      extractLinks: true,
    };
    
    const resultsResponse = await browser.extractContent(resultsRequest);
    
    if (resultsResponse.links && resultsResponse.links.length > 0) {
      console.log(`Found ${resultsResponse.links.length} search results:`);
      resultsResponse.links.slice(0, 5).forEach((link, index) => {
        console.log(`${index + 1}. ${link.text} - ${link.url}`);
      });
      
      // Click on the first search result
      if (resultsResponse.links.length > 0) {
        console.log('\nClicking on the first search result...');
        
        const clickInteractionRequest: ElementInteractionRequest = {
          selector: '.result__a',
          action: 'click',
        };
        
        const clickInteractionResponse = await browser.interactWithElement(clickInteractionRequest);
        
        console.log('Click interaction result:');
        console.log(`- Success: ${clickInteractionResponse.success}`);
        
        if (clickInteractionResponse.error) {
          console.log(`- Error: ${clickInteractionResponse.error}`);
        } else {
          // Wait a moment for the page to load
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Get the current URL and title
          const navigationResponse = await browser.navigate({
            url: await browser.getManager().getCurrentUrl(),
          });
          
          console.log('\nNavigated to search result:');
          console.log(`- URL: ${navigationResponse.url}`);
          console.log(`- Title: ${navigationResponse.title}`);
        }
      }
    }
    
    // Navigate to a form page
    console.log('\nNavigating to a form page...');
    
    const formRequest: NavigationRequest = {
      url: 'https://httpbin.org/forms/post',
      waitUntil: 'networkidle2',
    };
    
    const formResponse = await browser.navigate(formRequest);
    
    console.log('Form page navigation result:');
    console.log(`- URL: ${formResponse.url}`);
    console.log(`- Title: ${formResponse.title}`);
    
    // Interact with form elements
    console.log('\nInteracting with form elements...');
    
    // Type in the customer name field
    const nameInteractionRequest: ElementInteractionRequest = {
      selector: 'input[name="custname"]',
      action: 'type',
      value: 'John Doe',
    };
    
    await browser.interactWithElement(nameInteractionRequest);
    
    // Select a pizza size (radio button)
    const sizeInteractionRequest: ElementInteractionRequest = {
      selector: 'input[name="size"][value="medium"]',
      action: 'click',
    };
    
    await browser.interactWithElement(sizeInteractionRequest);
    
    // Select a topping (checkbox)
    const toppingInteractionRequest: ElementInteractionRequest = {
      selector: 'input[name="topping"][value="bacon"]',
      action: 'click',
    };
    
    await browser.interactWithElement(toppingInteractionRequest);
    
    // Type in the comments field
    const commentsInteractionRequest: ElementInteractionRequest = {
      selector: 'textarea[name="comments"]',
      action: 'type',
      value: 'Please deliver quickly!',
    };
    
    await browser.interactWithElement(commentsInteractionRequest);
    
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
    console.log(`- URL after submission: ${formSubmissionResponse.url}`);
    
    if (formSubmissionResponse.error) {
      console.log(`- Error: ${formSubmissionResponse.error}`);
    } else {
      // Extract the response content
      console.log('\nExtracting response content...');
      
      const responseContentRequest: ContentExtractionRequest = {
        extractText: true,
      };
      
      const responseContentResponse = await browser.extractContent(responseContentRequest);
      
      if (responseContentResponse.text) {
        console.log('Response content:');
        console.log(responseContentResponse.text.substring(0, 500) + '...');
      }
    }
    
    // Navigate to a page with hover effects
    console.log('\nNavigating to a page with hover effects...');
    
    const hoverRequest: NavigationRequest = {
      url: 'https://www.w3schools.com/css/css_tooltip.asp',
      waitUntil: 'networkidle2',
    };
    
    const hoverResponse = await browser.navigate(hoverRequest);
    
    console.log('Hover page navigation result:');
    console.log(`- URL: ${hoverResponse.url}`);
    console.log(`- Title: ${hoverResponse.title}`);
    
    // Hover over an element
    console.log('\nHovering over an element...');
    
    const hoverInteractionRequest: ElementInteractionRequest = {
      selector: '.tooltip',
      action: 'hover',
    };
    
    const hoverInteractionResponse = await browser.interactWithElement(hoverInteractionRequest);
    
    console.log('Hover interaction result:');
    console.log(`- Success: ${hoverInteractionResponse.success}`);
    
    if (hoverInteractionResponse.error) {
      console.log(`- Error: ${hoverInteractionResponse.error}`);
    } else {
      // Take a screenshot to capture the hover effect
      console.log('\nTaking screenshot of hover effect...');
      
      const screenshot = await browser.takeScreenshot(false);
      
      console.log(`Screenshot taken (${screenshot.length} bytes)`);
    }
    
    // Close the browser
    console.log('\nClosing browser...');
    await browser.close();
    
    console.log('\nInteraction example completed successfully');
  } catch (error) {
    console.error('Error in interaction example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runInteractionExample();
}

export default runInteractionExample;