#!/bin/bash
# Deploy code interpreter resources for AWS AgentCore

# Set default environment if not provided
ENVIRONMENT=${1:-dev}

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the CloudFormation stack name
STACK_NAME="agentcore-code-interpreter-$ENVIRONMENT"

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
echo "Deploying code interpreter resources to $ENVIRONMENT environment..."

aws cloudformation deploy \
  --template-file "$SCRIPT_DIR/../cloudformation/code-interpreter.yaml" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
    VpcId="$VPC_ID" \
    SubnetIds="$SUBNET_IDS" \
  --capabilities CAPABILITY_NAMED_IAM

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "Code interpreter resources deployed successfully!"
  
  # Get outputs
  CLUSTER_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ClusterArn'].OutputValue" --output text)
  PYTHON_TASK_DEF=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='PythonTaskDefinitionArn'].OutputValue" --output text)
  JS_TASK_DEF=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='JavaScriptTaskDefinitionArn'].OutputValue" --output text)
  R_TASK_DEF=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='RTaskDefinitionArn'].OutputValue" --output text)
  SECURITY_GROUP_ID=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='SecurityGroupId'].OutputValue" --output text)
  FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='CodeExecutionFunctionArn'].OutputValue" --output text)
  
  echo "Cluster ARN: $CLUSTER_ARN"
  echo "Python Task Definition ARN: $PYTHON_TASK_DEF"
  echo "JavaScript Task Definition ARN: $JS_TASK_DEF"
  echo "R Task Definition ARN: $R_TASK_DEF"
  echo "Security Group ID: $SECURITY_GROUP_ID"
  echo "Function ARN: $FUNCTION_ARN"
  
  # Update .env file with code interpreter information
  if [ -f "$SCRIPT_DIR/../.env" ]; then
    echo "Updating .env file with code interpreter information..."
    
    # Check if the variables already exist in the .env file
    if grep -q "CODE_INTERPRETER_CLUSTER_ARN" "$SCRIPT_DIR/../.env"; then
      # Update existing variables
      sed -i '' "s|CODE_INTERPRETER_CLUSTER_ARN=.*|CODE_INTERPRETER_CLUSTER_ARN=$CLUSTER_ARN|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|CODE_INTERPRETER_PYTHON_TASK_DEF=.*|CODE_INTERPRETER_PYTHON_TASK_DEF=$PYTHON_TASK_DEF|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|CODE_INTERPRETER_JS_TASK_DEF=.*|CODE_INTERPRETER_JS_TASK_DEF=$JS_TASK_DEF|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|CODE_INTERPRETER_R_TASK_DEF=.*|CODE_INTERPRETER_R_TASK_DEF=$R_TASK_DEF|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|CODE_INTERPRETER_SECURITY_GROUP=.*|CODE_INTERPRETER_SECURITY_GROUP=$SECURITY_GROUP_ID|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|CODE_INTERPRETER_FUNCTION_ARN=.*|CODE_INTERPRETER_FUNCTION_ARN=$FUNCTION_ARN|g" "$SCRIPT_DIR/../.env"
    else
      # Add new variables
      echo "" >> "$SCRIPT_DIR/../.env"
      echo "# Code interpreter information" >> "$SCRIPT_DIR/../.env"
      echo "CODE_INTERPRETER_CLUSTER_ARN=$CLUSTER_ARN" >> "$SCRIPT_DIR/../.env"
      echo "CODE_INTERPRETER_PYTHON_TASK_DEF=$PYTHON_TASK_DEF" >> "$SCRIPT_DIR/../.env"
      echo "CODE_INTERPRETER_JS_TASK_DEF=$JS_TASK_DEF" >> "$SCRIPT_DIR/../.env"
      echo "CODE_INTERPRETER_R_TASK_DEF=$R_TASK_DEF" >> "$SCRIPT_DIR/../.env"
      echo "CODE_INTERPRETER_SECURITY_GROUP=$SECURITY_GROUP_ID" >> "$SCRIPT_DIR/../.env"
      echo "CODE_INTERPRETER_FUNCTION_ARN=$FUNCTION_ARN" >> "$SCRIPT_DIR/../.env"
    fi
    
    echo ".env file updated successfully"
  else
    echo "Warning: .env file not found. Please create it and add the code interpreter information manually."
  fi
else
  echo "Error: Code interpreter resources deployment failed"
  exit 1
fi