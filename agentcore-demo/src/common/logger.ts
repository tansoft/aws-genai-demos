import winston from 'winston';
import { config } from './config';

// Create a logger instance
const logger = winston.createLogger({
  level: config.observability.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'agentcore-demo' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add file transport if configured
if (config.observability.logging.destination === 'file') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/agentcore-demo.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }));
}

export default logger;