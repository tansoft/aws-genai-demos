/**
 * Example tools for the chatbot
 */

/**
 * Get current date and time
 * @returns Current date and time
 */
export function getCurrentDateTime(): { date: string; time: string; timestamp: number } {
  const now = new Date();
  return {
    date: now.toLocaleDateString(),
    time: now.toLocaleTimeString(),
    timestamp: now.getTime()
  };
}

/**
 * Get weather information for a location
 * @param location Location
 * @returns Weather information
 */
export async function getWeather(location: string): Promise<any> {
  // This is a mock implementation
  const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'windy'];
  const temperatures = {
    sunny: { min: 70, max: 95 },
    cloudy: { min: 60, max: 75 },
    rainy: { min: 50, max: 70 },
    snowy: { min: 20, max: 35 },
    windy: { min: 55, max: 65 }
  };
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Generate random weather based on location hash
  const locationHash = location.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const condition = conditions[locationHash % conditions.length];
  const tempRange = temperatures[condition as keyof typeof temperatures];
  const temp = Math.floor(Math.random() * (tempRange.max - tempRange.min + 1)) + tempRange.min;
  
  return {
    location,
    condition,
    temperature: {
      fahrenheit: temp,
      celsius: Math.round((temp - 32) * 5 / 9)
    },
    humidity: Math.floor(Math.random() * 60) + 30,
    windSpeed: Math.floor(Math.random() * 20) + 5,
    forecast: 'This is a simulated weather forecast for demonstration purposes.'
  };
}

/**
 * Search for information
 * @param query Search query
 * @returns Search results
 */
export async function searchInformation(query: string): Promise<any> {
  // This is a mock implementation
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Generate mock search results
  return {
    query,
    results: [
      {
        title: `Information about ${query}`,
        snippet: `This is a simulated search result about ${query}. The actual implementation would connect to a real search API.`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`
      },
      {
        title: `More details on ${query}`,
        snippet: `Additional simulated information about ${query} for demonstration purposes.`,
        url: `https://example.com/details?topic=${encodeURIComponent(query)}`
      },
      {
        title: `${query} - Wikipedia`,
        snippet: `Wikipedia would provide comprehensive information about ${query}.`,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(' ', '_'))}`
      }
    ],
    totalResults: 42,
    searchTime: 0.42
  };
}

/**
 * Calculate expression
 * @param expression Math expression
 * @returns Calculation result
 */
export function calculateExpression(expression: string): any {
  try {
    // SECURITY WARNING: This is for demonstration only
    // In a real implementation, use a proper math expression parser
    // that doesn't use eval() which is unsafe
    
    // Simple validation to prevent code execution
    if (!/^[0-9+\-*/(). ]+$/.test(expression)) {
      throw new Error('Invalid expression. Only numbers and basic operators are allowed.');
    }
    
    // Calculate result
    // eslint-disable-next-line no-eval
    const result = eval(expression);
    
    return {
      expression,
      result,
      formatted: `${expression} = ${result}`
    };
  } catch (error) {
    return {
      expression,
      error: (error as Error).message,
      result: null
    };
  }
}

/**
 * Get tool definitions
 * @returns Tool definitions
 */
export function getToolDefinitions(): any[] {
  return [
    {
      name: 'getCurrentDateTime',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      },
      function: getCurrentDateTime
    },
    {
      name: 'getWeather',
      description: 'Get weather information for a location',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The location to get weather for (city, state, country)'
          }
        },
        required: ['location']
      },
      function: getWeather
    },
    {
      name: 'searchInformation',
      description: 'Search for information on a topic',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          }
        },
        required: ['query']
      },
      function: searchInformation
    },
    {
      name: 'calculateExpression',
      description: 'Calculate a mathematical expression',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to calculate (e.g., "2 + 2 * 3")'
          }
        },
        required: ['expression']
      },
      function: calculateExpression
    }
  ];
}