#!/bin/bash

# Deploy the advanced serverless application for AWS AgentCore Runtime

# Set default environment if not provided
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-west-2}
STACK_NAME="agentcore-runtime-advanced-$ENVIRONMENT"

echo "Deploying advanced serverless application to environment $ENVIRONMENT in region $REGION"

# Build the project
echo "Building the project..."
npm run build

# Deploy the serverless application using AWS SAM
echo "Deploying advanced serverless application..."
sam deploy \
  --template-file serverless/runtime/advanced-template.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    ModelProvider=${MODEL_PROVIDER:-openai} \
    ModelName=${MODEL_NAME:-gpt-4} \
    ModelProtocol=${MODEL_PROTOCOL:-openai} \
    ModelTemperature=${MODEL_TEMPERATURE:-0.7} \
    ModelMaxTokens=${MODEL_MAX_TOKENS:-1000} \
    OpenAIApiKey=${OPENAI_API_KEY:-''} \
    AnthropicApiKey=${ANTHROPIC_API_KEY:-''} \
    EnableCaching=${ENABLE_CACHING:-true} \
    CacheTTL=${CACHE_TTL:-3600} \
    EnableRateLimiting=${ENABLE_RATE_LIMITING:-true} \
    RateLimit=${RATE_LIMIT:-100} \
  --capabilities CAPABILITY_IAM \
  --region $REGION \
  --no-confirm-changeset

# Get the outputs from the CloudFormation stack
echo "Getting stack outputs..."
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs" \
  --output json \
  --region $REGION > .env.advanced-serverless

# Extract API URL and Dashboard URL from outputs
API_URL=$(cat .env.advanced-serverless | jq -r '.[] | select(.OutputKey=="RuntimeApiUrl") | .OutputValue')
DASHBOARD_URL=$(cat .env.advanced-serverless | jq -r '.[] | select(.OutputKey=="DashboardUrl") | .OutputValue')

echo "Advanced serverless deployment complete!"
echo "API URL: $API_URL"
echo "Dashboard URL: $DASHBOARD_URL"
echo "Stack outputs have been saved to .env.advanced-serverless"