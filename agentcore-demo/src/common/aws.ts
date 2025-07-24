import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { XRayClient } from '@aws-sdk/client-xray';

// Get AWS region from environment variables
const region = process.env.AWS_REGION || 'us-west-2';

// Create AWS clients
export const dynamoDBClient = new DynamoDBClient({ region });
export const lambdaClient = new LambdaClient({ region });
export const cognitoClient = new CognitoIdentityProviderClient({ region });
export const cloudWatchClient = new CloudWatchClient({ region });
export const cloudWatchLogsClient = new CloudWatchLogsClient({ region });
export const xRayClient = new XRayClient({ region });