#!/bin/bash

# Deploy AWS resources for AgentCore demos

# Set default environment if not provided
ENVIRONMENT=${1:-dev}
STACK_NAME="agentcore-demos-$ENVIRONMENT"
REGION=${AWS_REGION:-us-west-2}

echo "Deploying stack $STACK_NAME to region $REGION for environment $ENVIRONMENT"

# Create S3 bucket for deployment if it doesn't exist
BUCKET_NAME="agentcore-demos-$ENVIRONMENT-$REGION"
aws s3api head-bucket --bucket $BUCKET_NAME 2>/dev/null || aws s3 mb s3://$BUCKET_NAME --region $REGION

# Package the CloudFormation template
aws cloudformation package \
  --template-file cloudformation/resources.yaml \
  --s3-bucket $BUCKET_NAME \
  --output-template-file cloudformation/packaged-template.yaml

# Deploy the CloudFormation stack
aws cloudformation deploy \
  --template-file cloudformation/packaged-template.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_IAM \
  --region $REGION

# Get the outputs from the CloudFormation stack
echo "Getting stack outputs..."
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs" \
  --output json \
  --region $REGION > .env.outputs

# Extract values from outputs and update .env file
echo "Updating .env file with stack outputs..."
MEMORY_TABLE_NAME=$(cat .env.outputs | jq -r '.[] | select(.OutputKey=="MemoryTableName") | .OutputValue')
USER_POOL_ID=$(cat .env.outputs | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
CLIENT_ID=$(cat .env.outputs | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')
TOOL_GATEWAY_FUNCTION_ARN=$(cat .env.outputs | jq -r '.[] | select(.OutputKey=="ToolGatewayFunctionArn") | .OutputValue')

# Update .env file
sed -i '' "s/MEMORY_TABLE_NAME=.*/MEMORY_TABLE_NAME=$MEMORY_TABLE_NAME/" .env 2>/dev/null || sed -i "s/MEMORY_TABLE_NAME=.*/MEMORY_TABLE_NAME=$MEMORY_TABLE_NAME/" .env
sed -i '' "s/USER_POOL_ID=.*/USER_POOL_ID=$USER_POOL_ID/" .env 2>/dev/null || sed -i "s/USER_POOL_ID=.*/USER_POOL_ID=$USER_POOL_ID/" .env
sed -i '' "s/CLIENT_ID=.*/CLIENT_ID=$CLIENT_ID/" .env 2>/dev/null || sed -i "s/CLIENT_ID=.*/CLIENT_ID=$CLIENT_ID/" .env

echo "Deployment complete!"
echo "Stack outputs have been saved to .env.outputs and relevant values have been updated in .env"