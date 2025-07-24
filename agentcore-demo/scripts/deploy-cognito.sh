#!/bin/bash

# Deploy the Cognito resources for AWS AgentCore Identity

# Set default environment if not provided
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-west-2}
STACK_NAME="agentcore-cognito-$ENVIRONMENT"
USER_POOL_NAME=${USER_POOL_NAME:-agentcore-users}
CLIENT_NAME=${CLIENT_NAME:-agentcore-client}

# Check if required parameters are provided
if [ -z "$ADMIN_EMAIL" ]; then
  echo "Error: ADMIN_EMAIL is required"
  echo "Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password USER_EMAIL=user@example.com USER_PASSWORD=password ./scripts/deploy-cognito.sh [environment]"
  exit 1
fi

if [ -z "$ADMIN_PASSWORD" ]; then
  echo "Error: ADMIN_PASSWORD is required"
  echo "Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password USER_EMAIL=user@example.com USER_PASSWORD=password ./scripts/deploy-cognito.sh [environment]"
  exit 1
fi

if [ -z "$USER_EMAIL" ]; then
  echo "Error: USER_EMAIL is required"
  echo "Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password USER_EMAIL=user@example.com USER_PASSWORD=password ./scripts/deploy-cognito.sh [environment]"
  exit 1
fi

if [ -z "$USER_PASSWORD" ]; then
  echo "Error: USER_PASSWORD is required"
  echo "Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password USER_EMAIL=user@example.com USER_PASSWORD=password ./scripts/deploy-cognito.sh [environment]"
  exit 1
fi

echo "Deploying Cognito resources for AWS AgentCore Identity to environment $ENVIRONMENT in region $REGION"

# Deploy the CloudFormation stack
aws cloudformation deploy \
  --template-file cloudformation/cognito.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    Environment=$ENVIRONMENT \
    UserPoolName=$USER_POOL_NAME \
    ClientName=$CLIENT_NAME \
    AdminEmail=$ADMIN_EMAIL \
    AdminUsername=${ADMIN_USERNAME:-admin} \
    AdminPassword=$ADMIN_PASSWORD \
    UserEmail=$USER_EMAIL \
    UserUsername=${USER_USERNAME:-user} \
    UserPassword=$USER_PASSWORD \
  --capabilities CAPABILITY_IAM \
  --region $REGION

# Get the outputs from the CloudFormation stack
echo "Getting stack outputs..."
aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs" \
  --output json \
  --region $REGION > .env.cognito

# Extract user pool ID and client ID from outputs
USER_POOL_ID=$(cat .env.cognito | jq -r '.[] | select(.OutputKey=="UserPoolId") | .OutputValue')
CLIENT_ID=$(cat .env.cognito | jq -r '.[] | select(.OutputKey=="UserPoolClientId") | .OutputValue')

echo "Cognito resources deployment complete!"
echo "User Pool ID: $USER_POOL_ID"
echo "Client ID: $CLIENT_ID"
echo "Stack outputs have been saved to .env.cognito"

# Update .env file with user pool ID and client ID
if [ -f .env ]; then
  echo "Updating .env file with Cognito configuration..."
  sed -i '' "s/USER_POOL_ID=.*/USER_POOL_ID=$USER_POOL_ID/" .env 2>/dev/null || sed -i "s/USER_POOL_ID=.*/USER_POOL_ID=$USER_POOL_ID/" .env
  sed -i '' "s/CLIENT_ID=.*/CLIENT_ID=$CLIENT_ID/" .env 2>/dev/null || sed -i "s/CLIENT_ID=.*/CLIENT_ID=$CLIENT_ID/" .env
  echo "Updated .env file"
fi

# Set admin user password
echo "Setting admin user password..."
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username ${ADMIN_USERNAME:-admin} \
  --password $ADMIN_PASSWORD \
  --permanent \
  --region $REGION

# Set regular user password
echo "Setting regular user password..."
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username ${USER_USERNAME:-user} \
  --password $USER_PASSWORD \
  --permanent \
  --region $REGION

echo "User passwords set successfully"