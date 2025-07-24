#!/bin/bash
# Deploy browser resources for AWS AgentCore

# Set default environment if not provided
ENVIRONMENT=${1:-dev}

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the CloudFormation stack name
STACK_NAME="agentcore-browser-$ENVIRONMENT"

# Check if VPC ID is provided
if [ -z "$VPC_ID" ]; then
  # Try to get the default VPC ID
  VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text)
  
  if [ -z "$VPC_ID" ] || [ "$VPC_ID" == "None" ]; then
    echo "Error: No default VPC found. Please provide a VPC ID using the VPC_ID environment variable."
    exit 1
  fi
  
  echo "Using default VPC: $VPC_ID"
fi

# Check if subnet IDs are provided
if [ -z "$SUBNET_IDS" ]; then
  # Try to get the subnet IDs for the VPC
  SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text | tr '\t' ',')
  
  if [ -z "$SUBNET_IDS" ] || [ "$SUBNET_IDS" == "None" ]; then
    echo "Error: No subnets found for VPC $VPC_ID. Please provide subnet IDs using the SUBNET_IDS environment variable."
    exit 1
  fi
  
  echo "Using subnets: $SUBNET_IDS"
fi

# Deploy CloudFormation stack
echo "Deploying browser resources to $ENVIRONMENT environment..."

aws cloudformation deploy \
  --template-file "$SCRIPT_DIR/../cloudformation/browser.yaml" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    VpcId="$VPC_ID" \
    SubnetIds="$SUBNET_IDS" \
  --capabilities CAPABILITY_NAMED_IAM

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "Browser resources deployed successfully!"
  
  # Get outputs
  CLUSTER_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ClusterArn'].OutputValue" --output text)
  SERVICE_NAME=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ServiceName'].OutputValue" --output text)
  SECURITY_GROUP_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='SecurityGroupId'].OutputValue" --output text)
  FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='BrowserControlFunctionArn'].OutputValue" --output text)
  
  echo "Cluster ARN: $CLUSTER_ARN"
  echo "Service Name: $SERVICE_NAME"
  echo "Security Group ID: $SECURITY_GROUP_ID"
  echo "Function ARN: $FUNCTION_ARN"
  
  # Update .env file with browser information
  if [ -f "$SCRIPT_DIR/../.env" ]; then
    echo "Updating .env file with browser information..."
    
    # Check if the variables already exist in the .env file
    if grep -q "BROWSER_CLUSTER_ARN" "$SCRIPT_DIR/../.env"; then
      # Update existing variables
      sed -i '' "s|BROWSER_CLUSTER_ARN=.*|BROWSER_CLUSTER_ARN=$CLUSTER_ARN|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|BROWSER_SERVICE_NAME=.*|BROWSER_SERVICE_NAME=$SERVICE_NAME|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|BROWSER_SECURITY_GROUP=.*|BROWSER_SECURITY_GROUP=$SECURITY_GROUP_ID|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|BROWSER_FUNCTION_ARN=.*|BROWSER_FUNCTION_ARN=$FUNCTION_ARN|g" "$SCRIPT_DIR/../.env"
    else
      # Add new variables
      echo "" >> "$SCRIPT_DIR/../.env"
      echo "# Browser information" >> "$SCRIPT_DIR/../.env"
      echo "BROWSER_CLUSTER_ARN=$CLUSTER_ARN" >> "$SCRIPT_DIR/../.env"
      echo "BROWSER_SERVICE_NAME=$SERVICE_NAME" >> "$SCRIPT_DIR/../.env"
      echo "BROWSER_SECURITY_GROUP=$SECURITY_GROUP_ID" >> "$SCRIPT_DIR/../.env"
      echo "BROWSER_FUNCTION_ARN=$FUNCTION_ARN" >> "$SCRIPT_DIR/../.env"
    fi
    
    echo ".env file updated successfully"
  else
    echo "Warning: .env file not found. Please create it and add the browser information manually."
  fi
else
  echo "Error: Browser resources deployment failed"
  exit 1
fi