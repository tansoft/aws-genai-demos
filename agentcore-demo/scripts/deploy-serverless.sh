#!/bin/bash

# Deploy the serverless application for AWS AgentCore Runtime

# Set default environment if not provided
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-west-2}
STACK_NAME="agentcore-runtime-serverless-$ENVIRONMENT"

echo "Deploying serverless application to environment $ENVIRONMENT in region $REGION"

# Build the project
echo "Building the project..."
npm run build

# Deploy the serverless application using AWS SAM
echo "Deploying serverless application..."
sam deploy \
  --template-file serverless/runtime/template.yaml \
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
  --capabilities CAPABILITY_IAM \
  --region $REGION \
  --no-confirm-changeset

# Get the outputs from the CloudFormation stack
echo "Getting stack outputs..."
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs" \
  --output json \
  --region $REGION > .env.serverless

# Extract API URL from outputs
API_URL=$(cat .env.serverless | jq -r '.[] | select(.OutputKey=="RuntimeApiUrl") | .OutputValue')

echo "Serverless deployment complete!"
echo "API URL: $API_URL"
echo "Stack outputs have been saved to .env.serverless"