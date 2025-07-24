#!/bin/bash

# Deploy the secure memory resources for AWS AgentCore

# Set default environment if not provided
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-west-2}
STACK_NAME="agentcore-secure-memory-$ENVIRONMENT"
TABLE_NAME=${TABLE_NAME:-agentcore-secure-memory}
KMS_KEY_ALIAS=${KMS_KEY_ALIAS:-alias/agentcore-memory-key}
ENABLE_ENCRYPTION=${ENABLE_ENCRYPTION:-true}

echo "Deploying secure memory resources for AWS AgentCore to environment $ENVIRONMENT in region $REGION"

# Deploy the CloudFormation stack
aws cloudformation deploy \
  --template-file cloudformation/secure-memory.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    TableName=$TABLE_NAME \
    KmsKeyAlias=$KMS_KEY_ALIAS \
    EnableEncryption=$ENABLE_ENCRYPTION \
  --capabilities CAPABILITY_NAMED_IAM \
  --region $REGION

# Get the outputs from the CloudFormation stack
echo "Getting stack outputs..."
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs" \
  --output json \
  --region $REGION > .env.secure-memory

# Extract table name and KMS key ID from outputs
TABLE_NAME=$(cat .env.secure-memory | jq -r '.[] | select(.OutputKey=="TableName") | .OutputValue')
KMS_KEY_ID=$(cat .env.secure-memory | jq -r '.[] | select(.OutputKey=="KmsKeyId") | .OutputValue')

echo "Secure memory resources deployment complete!"
echo "Table name: $TABLE_NAME"
echo "KMS key ID: $KMS_KEY_ID"
echo "Stack outputs have been saved to .env.secure-memory"

# Update .env file with table name and KMS key ID
if [ -f .env ]; then
  echo "Updating .env file with secure memory configuration..."
  sed -i '' "s/SECURE_MEMORY_TABLE_NAME=.*/SECURE_MEMORY_TABLE_NAME=$TABLE_NAME/" .env 2>/dev/null || sed -i "s/SECURE_MEMORY_TABLE_NAME=.*/SECURE_MEMORY_TABLE_NAME=$TABLE_NAME/" .env
  sed -i '' "s/SECURE_MEMORY_KMS_KEY_ID=.*/SECURE_MEMORY_KMS_KEY_ID=$KMS_KEY_ID/" .env 2>/dev/null || sed -i "s/SECURE_MEMORY_KMS_KEY_ID=.*/SECURE_MEMORY_KMS_KEY_ID=$KMS_KEY_ID/" .env
  echo "Updated .env file"
fi