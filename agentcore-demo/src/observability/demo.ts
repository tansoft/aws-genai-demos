/**
 * Main demo for AWS AgentCore Observability
 */

import { runLoggingExample } from './examples/logging-example';
import { runMetricsExample } from './examples/metrics-example';
import { runTracingExample } from './examples/tracing-example';
import { runIntegratedExample } from './examples/integrated-example';

/**
 * Run the observability demo
 */
async function runObservabilityDemo() {
  console.log('=== AWS AgentCore Observability Demo ===');
  
  // Run the examples
  console.log('\n--- Logging Example ---');
  await runLoggingExample();
  
  console.log('\n--- Metrics Example ---');
  await runMetricsExample();
  
  console.log('\n--- Tracing Example ---');
  await runTracingExample();
  
  console.log('\n--- Integrated Example ---');
  await runIntegratedExample();
  
  console.log('\n=== Observability Demo Completed ===');
}

export default runObservabilityDemo;