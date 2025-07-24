/// <reference types="node" />
import { config, logger } from './common';

/**
 * Main entry point for the AWS AgentCore demos
 */
async function main() {
  try {
    logger.info('Starting AWS AgentCore demos', { config: { 
      id: config.id,
      name: config.name,
      features: {
        runtime: config.runtime.provider,
        memory: config.memory.shortTerm.enabled || config.memory.longTerm.enabled,
        identity: !!config.identity.authProvider,
        codeInterpreter: config.codeInterpreter.enabled,
        browser: config.browser.enabled,
        observability: true
      }
    }});

    // Import and run the requested demo based on command line arguments
    const demoType = process.argv[2] || 'all';
    
    switch (demoType) {
      case 'runtime':
        logger.info('Running Runtime demo');
        const runtimeDemo = require('./runtime').default;
        await runtimeDemo();
        break;
      case 'memory':
        logger.info('Running Memory demo');
        const memoryDemo = require('./memory').default;
        await memoryDemo();
        break;
      case 'identity':
        logger.info('Running Identity demo');
        const identityDemo = require('./identity').default;
        await identityDemo();
        break;
      case 'gateway':
        logger.info('Running Gateway demo');
        const gatewayDemo = require('./gateway').default;
        await gatewayDemo();
        break;
      case 'code-interpreter':
        logger.info('Running Code Interpreter demo');
        const codeInterpreterDemo = require('./code-interpreter').default;
        await codeInterpreterDemo();
        break;
      case 'browser':
        logger.info('Running Browser demo');
        const browserDemo = require('./browser').default;
        await browserDemo();
        break;
      case 'observability':
        logger.info('Running Observability demo');
        const observabilityDemo = require('./observability').default;
        await observabilityDemo();
        break;
      case 'all':
        logger.info('Running all demos');
        // Run all demos sequentially
        await runtimeDemo();
        await memoryDemo();
        await identityDemo();
        await gatewayDemo();
        await codeInterpreterDemo();
        await browserDemo();
        await observabilityDemo();
        break;
      default:
        logger.error('Unknown demo type', { demoType });
        process.exit(1);
    }

    logger.info('AWS AgentCore demos completed successfully');
  } catch (error) {
    logger.error('Error running AWS AgentCore demos', { error });
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main();
}

export default main;