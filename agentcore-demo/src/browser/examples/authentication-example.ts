/**
 * Example of authentication handling in the browser
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

/**
 * Run the authentication example
 */
async function runAuthenticationExample() {
  try {
    console.log('Starting authentication example...');
    
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
    
    // Example 1: Form-based authentication
    console.log('\n=== Example 1: Form-based authentication ===');
    
    // Navigate to a login page
    console.log('\nNavigating to a login page...');
    
    const loginRequest: NavigationRequest = {
      url: 'https://demo.applitools.com/',
      waitUntil: 'networkidle2',
    };
    
    const loginResponse = await browser.navigate(loginRequest);
    
    console.log('Login page navigation result:');
    console.log(`- URL: ${loginResponse.url}`);
    console.log(`- Title: ${loginResponse.title}`);
    
    // Fill in the login form
    console.log('\nFilling in the login form...');
    
    // Type in the username field
    const usernameInteractionRequest: ElementInteractionRequest = {
      selector: '#username',
      action: 'type',
      value: 'demo_user',
    };
    
    await browser.interactWithElement(usernameInteractionRequest);
    
    // Type in the password field
    const passwordInteractionRequest: ElementInteractionRequest = {
      selector: '#password',
      action: 'type',
      value: 'demo_password',
    };
    
    await browser.interactWithElement(passwordInteractionRequest);
    
    // Submit the login form
    console.log('\nSubmitting the login form...');
    
    const loginSubmissionRequest: ElementInteractionRequest = {
      selector: '#log-in',
      action: 'click',
    };
    
    const loginSubmissionResponse = await browser.interactWithElement(loginSubmissionRequest);
    
    console.log('Login submission result:');
    console.log(`- Success: ${loginSubmissionResponse.success}`);
    
    if (loginSubmissionResponse.error) {
      console.log(`- Error: ${loginSubmissionResponse.error}`);
    } else {
      // Wait a moment for the page to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we're logged in
      console.log('\nChecking if we are logged in...');
      
      const loggedInContentRequest: ContentExtractionRequest = {
        selector: '.logged-user-name',
        extractText: true,
      };
      
      const loggedInContentResponse = await browser.extractContent(loggedInContentRequest);
      
      if (loggedInContentResponse.text) {
        console.log(`Logged in as: ${loggedInContentResponse.text}`);
      } else {
        console.log('Not logged in');
      }
      
      // Get cookies
      console.log('\nGetting cookies...');
      
      const cookies = await browser.getCookies();
      
      console.log(`Found ${cookies.length} cookies:`);
      cookies.forEach((cookie, index) => {
        console.log(`${index + 1}. ${cookie.name}=${cookie.value}`);
      });
    }
    
    // Example 2: Cookie-based authentication
    console.log('\n=== Example 2: Cookie-based authentication ===');
    
    // Navigate to a new page
    console.log('\nNavigating to a new page...');
    
    const newPageRequest: NavigationRequest = {
      url: 'https://httpbin.org/cookies',
      waitUntil: 'networkidle2',
    };
    
    const newPageResponse = await browser.navigate(newPageRequest);
    
    console.log('New page navigation result:');
    console.log(`- URL: ${newPageResponse.url}`);
    console.log(`- Title: ${newPageResponse.title}`);
    
    // Set authentication cookies
    console.log('\nSetting authentication cookies...');
    
    const authCookies: Cookie[] = [
      {
        name: 'session_id',
        value: '12345',
        domain: 'httpbin.org',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      },
      {
        name: 'user_id',
        value: 'demo_user',
        domain: 'httpbin.org',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      },
    ];
    
    await browser.setCookies(authCookies);
    
    // Refresh the page to use the new cookies
    console.log('\nRefreshing the page...');
    
    const refreshRequest: NavigationRequest = {
      url: 'https://httpbin.org/cookies',
      waitUntil: 'networkidle2',
    };
    
    const refreshResponse = await browser.navigate(refreshRequest);
    
    console.log('Page refresh result:');
    console.log(`- URL: ${refreshResponse.url}`);
    console.log(`- Title: ${refreshResponse.title}`);
    
    // Extract the page content to see the cookies
    console.log('\nExtracting page content to see the cookies...');
    
    const cookieContentRequest: ContentExtractionRequest = {
      extractText: true,
    };
    
    const cookieContentResponse = await browser.extractContent(cookieContentRequest);
    
    if (cookieContentResponse.text) {
      console.log('Page content:');
      console.log(cookieContentResponse.text);
    }
    
    // Example 3: Header-based authentication
    console.log('\n=== Example 3: Header-based authentication ===');
    
    // Navigate to a page that requires authentication headers
    console.log('\nNavigating to a page with authentication headers...');
    
    const headerAuthRequest: NavigationRequest = {
      url: 'https://httpbin.org/headers',
      waitUntil: 'networkidle2',
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'X-API-Key': 'demo_api_key',
      },
    };
    
    const headerAuthResponse = await browser.navigate(headerAuthRequest);
    
    console.log('Header authentication navigation result:');
    console.log(`- URL: ${headerAuthResponse.url}`);
    console.log(`- Title: ${headerAuthResponse.title}`);
    
    // Extract the page content to see the headers
    console.log('\nExtracting page content to see the headers...');
    
    const headerContentRequest: ContentExtractionRequest = {
      extractText: true,
    };
    
    const headerContentResponse = await browser.extractContent(headerContentRequest);
    
    if (headerContentResponse.text) {
      console.log('Page content:');
      console.log(headerContentResponse.text);
    }
    
    // Close the browser
    console.log('\nClosing browser...');
    await browser.close();
    
    console.log('\nAuthentication example completed successfully');
  } catch (error) {
    console.error('Error in authentication example:', error);
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runAuthenticationExample();
}

export default runAuthenticationExample;