/**
 * Example demonstrating AWS AgentCore CloudWatch dashboard creation
 * This example shows how to programmatically create CloudWatch dashboards
 */

import * as AWS from 'aws-sdk';

/**
 * Run the dashboard example
 */
async function runDashboardExample() {
  console.log('Running AWS AgentCore Dashboard Example');
  
  // Configuration
  const serviceName = 'aws-agentcore';
  const environment = 'dev';
  const region = process.env.AWS_REGION || 'us-east-1';
  const dashboardName = `${serviceName}-${environment}-dashboard`;
  
  // Create CloudWatch client
  const cloudwatch = new AWS.CloudWatch({ region });
  
  try {
    // Create dashboard
    const dashboard = await createDashboard(cloudwatch, dashboardName, serviceName, environment, region);
    console.log(`Dashboard created: ${dashboard.DashboardArn}`);
    
    // Output dashboard URL
    const dashboardUrl = `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#dashboards:name=${dashboardName}`;
    console.log(`Dashboard URL: ${dashboardUrl}`);
    
  } catch (error) {
    console.error('Error creating dashboard:', error);
    throw error;
  }
  
  console.log('Dashboard example completed');
}

/**
 * Create a CloudWatch dashboard
 * @param cloudwatch CloudWatch client
 * @param dashboardName Dashboard name
 * @param serviceName Service name
 * @param environment Environment name
 * @param region AWS region
 * @returns Dashboard creation result
 */
async function createDashboard(
  cloudwatch: AWS.CloudWatch,
  dashboardName: string,
  serviceName: string,
  environment: string,
  region: string
): Promise<AWS.CloudWatch.PutDashboardOutput> {
  // Create dashboard body
  const dashboardBody = {
    widgets: [
      // Service Overview Section
      {
        type: 'text',
        x: 0,
        y: 0,
        width: 24,
        height: 1,
        properties: {
          markdown: `# ${serviceName.toUpperCase()} - ${environment.toUpperCase()} Environment Monitoring Dashboard\nLast updated: ${new Date().toISOString()}`
        }
      },
      
      // Request Metrics
      {
        type: 'metric',
        x: 0,
        y: 1,
        width: 8,
        height: 6,
        properties: {
          metrics: [
            [ 'AWS/AgentCore', 'RequestCount', 'Service', serviceName, 'Environment', environment ],
            [ '.', 'ErrorCount', '.', '.', '.', '.' ]
          ],
          view: 'timeSeries',
          stacked: false,
          region,
          title: 'Requests and Errors',
          period: 60,
          stat: 'Sum'
        }
      },
      
      // Latency Metrics
      {
        type: 'metric',
        x: 8,
        y: 1,
        width: 8,
        height: 6,
        properties: {
          metrics: [
            [ 'AWS/AgentCore', 'Latency', 'Service', serviceName, 'Environment', environment, { stat: 'Average' } ],
            [ '...', { stat: 'p90' } ],
            [ '...', { stat: 'p99' } ]
          ],
          view: 'timeSeries',
          stacked: false,
          region,
          title: 'Latency',
          period: 60
        }
      },
      
      // Success Rate
      {
        type: 'metric',
        x: 16,
        y: 1,
        width: 8,
        height: 6,
        properties: {
          metrics: [
            [ { expression: '100 - 100 * (m2 / m1)', label: 'Success Rate (%)', id: 'expr' } ],
            [ 'AWS/AgentCore', 'RequestCount', 'Service', serviceName, 'Environment', environment, { id: 'm1', visible: false } ],
            [ '.', 'ErrorCount', '.', '.', '.', '.', { id: 'm2', visible: false } ]
          ],
          view: 'timeSeries',
          stacked: false,
          region,
          title: 'Success Rate',
          period: 60,
          yAxis: {
            left: {
              min: 0,
              max: 100
            }
          }
        }
      },
      
      // Memory Usage
      {
        type: 'metric',
        x: 0,
        y: 7,
        width: 8,
        height: 6,
        properties: {
          metrics: [
            [ 'AWS/AgentCore', 'MemoryUsage', 'Service', serviceName, 'Environment', environment ]
          ],
          view: 'timeSeries',
          stacked: false,
          region,
          title: 'Memory Usage',
          period: 60,
          stat: 'Average'
        }
      },
      
      // CPU Usage
      {
        type: 'metric',
        x: 8,
        y: 7,
        width: 8,
        height: 6,
        properties: {
          metrics: [
            [ 'AWS/AgentCore', 'CPUUsage', 'Service', serviceName, 'Environment', environment ]
          ],
          view: 'timeSeries',
          stacked: false,
          region,
          title: 'CPU Usage',
          period: 60,
          stat: 'Average'
        }
      },
      
      // API Calls
      {
        type: 'metric',
        x: 16,
        y: 7,
        width: 8,
        height: 6,
        properties: {
          metrics: [
            [ 'AWS/AgentCore', 'ApiCallCount', 'Service', serviceName, 'Environment', environment, 'ApiName', 'GetUser' ],
            [ '...', 'ApiName', 'ListItems' ],
            [ '...', 'ApiName', 'ProcessData' ]
          ],
          view: 'timeSeries',
          stacked: true,
          region,
          title: 'API Calls by Type',
          period: 60,
          stat: 'Sum'
        }
      },
      
      // Error Logs
      {
        type: 'log',
        x: 0,
        y: 13,
        width: 24,
        height: 6,
        properties: {
          query: `SOURCE '/${serviceName}/${environment}/logs' | fields @timestamp, @message\n| filter @message like /ERROR/\n| sort @timestamp desc\n| limit 20`,
          region,
          title: 'Recent Error Logs',
          view: 'table'
        }
      },
      
      // X-Ray Traces
      {
        type: 'metric',
        x: 0,
        y: 19,
        width: 24,
        height: 6,
        properties: {
          metrics: [
            [ 'AWS/XRay', 'TimeToFirstByte', 'ServiceType', 'AWS::Lambda', 'Service', serviceName ],
            [ '.', 'TotalTime', '.', '.', '.', '.' ]
          ],
          view: 'timeSeries',
          stacked: false,
          region,
          title: 'X-Ray Trace Metrics',
          period: 60
        }
      }
    ]
  };
  
  // Create or update dashboard
  return await cloudwatch.putDashboard({
    DashboardName: dashboardName,
    DashboardBody: JSON.stringify(dashboardBody)
  }).promise();
}

// Run the example if this file is executed directly
if (require.main === module) {
  runDashboardExample()
    .then(() => console.log('Example finished successfully'))
    .catch(err => console.error('Example failed:', err));
}

export { runDashboardExample };