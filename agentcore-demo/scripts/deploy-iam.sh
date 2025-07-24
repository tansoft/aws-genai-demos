#!/bin/bash
# Deploy IAM resources for AWS AgentCore

# Set default environment if not provided
ENVIRONMENT=${1:-dev}

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the CloudFormation stack name
STACK_NAME="agentcore-iam-$ENVIRONMENT"

# Deploy the CloudFormation stack
echo "Deploying IAM resources for environment: $ENVIRONMENT"
aws cloudformation deploy \
  --template-file "$SCRIPT_DIR/../cloudformation/iam.yaml" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides Environment="$ENVIRONMENT" \
  --capabilities CAPABILITY_NAMED_IAM

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "IAM resources deployed successfully"
  
  # Get the outputs from the CloudFormation stack
  echo "Getting IAM role ARNs..."
  ADMIN_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='AgentCoreAdminRoleArn'].OutputValue" --output text)
  USER_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='AgentCoreUserRoleArn'].OutputValue" --output text)
  GUEST_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='AgentCoreGuestRoleArn'].OutputValue" --output text)
  LAMBDA_ROLE_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='AgentCoreLambdaRoleArn'].OutputValue" --output text)
  
  echo "Admin Role ARN: $ADMIN_ROLE_ARN"
  echo "User Role ARN: $USER_ROLE_ARN"
  echo "Guest Role ARN: $GUEST_ROLE_ARN"
  echo "Lambda Role ARN: $LAMBDA_ROLE_ARN"
  
  # Update .env file with the role ARNs
  if [ -f "$SCRIPT_DIR/../.env" ]; then
    echo "Updating .env file with IAM role ARNs..."
    
    # Check if the variables already exist in the .env file
    if grep -q "IAM_ADMIN_ROLE_ARN" "$SCRIPT_DIR/../.env"; then
      # Update existing variables
      sed -i '' "s|IAM_ADMIN_ROLE_ARN=.*|IAM_ADMIN_ROLE_ARN=$ADMIN_ROLE_ARN|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|IAM_USER_ROLE_ARN=.*|IAM_USER_ROLE_ARN=$USER_ROLE_ARN|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|IAM_GUEST_ROLE_ARN=.*|IAM_GUEST_ROLE_ARN=$GUEST_ROLE_ARN|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|IAM_LAMBDA_ROLE_ARN=.*|IAM_LAMBDA_ROLE_ARN=$LAMBDA_ROLE_ARN|g" "$SCRIPT_DIR/../.env"
    else
      # Add new variables
      echo "" >> "$SCRIPT_DIR/../.env"
      echo "# IAM role ARNs" >> "$SCRIPT_DIR/../.env"
      echo "IAM_ADMIN_ROLE_ARN=$ADMIN_ROLE_ARN" >> "$SCRIPT_DIR/../.env"
      echo "IAM_USER_ROLE_ARN=$USER_ROLE_ARN" >> "$SCRIPT_DIR/../.env"
      echo "IAM_GUEST_ROLE_ARN=$GUEST_ROLE_ARN" >> "$SCRIPT_DIR/../.env"
      echo "IAM_LAMBDA_ROLE_ARN=$LAMBDA_ROLE_ARN" >> "$SCRIPT_DIR/../.env"
    fi
    
    echo ".env file updated successfully"
  else
    echo "Warning: .env file not found. Please create it and add the IAM role ARNs manually."
  fi
else
  echo "Error: IAM resources deployment failed"
  exit 1
fi