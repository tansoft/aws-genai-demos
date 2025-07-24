#!/bin/bash

# Deploy the DynamoDB table for AWS AgentCore Memory

# Set default environment if not provided
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-west-2}
STACK_NAME="agentcore-memory-table-$ENVIRONMENT"
TABLE_NAME=${TABLE_NAME:-agentcore-memory}
BILLING_MODE=${BILLING_MODE:-PAY_PER_REQUEST}

echo "Deploying DynamoDB table for AWS AgentCore Memory to environment $ENVIRONMENT in region $REGION"

# Deploy the CloudFormation stack
aws cloudformation deploy \
  --template-file cloudformation/memory-table.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    TableName=$TABLE_NAME \
    BillingMode=$BILLING_MODE \
  --capabilities CAPABILITY_IAM \
  --region $REGION

# Get the outputs from the CloudFormation stack
echo "Getting stack outputs..."
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs" \
  --output json \
  --region $REGION > .env.memory-table

# Extract table name from outputs
TABLE_NAME=$(cat .env.memory-table | jq -r '.[] | select(.OutputKey=="TableName") | .OutputValue')

echo "DynamoDB table deployment complete!"
echo "Table name: $TABLE_NAME"
echo "Stack outputs have been saved to .env.memory-table"

# Update .env file with table name
if [ -f .env ]; then
  echo "Updating .env file with table name..."
  sed -i '' "s/MEMORY_TABLE_NAME=.*/MEMORY_TABLE_NAME=$TABLE_NAME/" .env 2>/dev/null || sed -i "s/MEMORY_TABLE_NAME=.*/MEMORY_TABLE_NAME=$TABLE_NAME/" .env
  echo "Updated .env file"
fi