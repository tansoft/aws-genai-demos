#!/bin/bash

# Deploy AWS AgentCore Observability Resources
# This script deploys the CloudFormation stack for observability resources

# Set default values
STACK_NAME="aws-agentcore-observability"
TEMPLATE_FILE="cloudformation/observability.yaml"
ENVIRONMENT="dev"
SERVICE_NAME="aws-agentcore"
LOG_RETENTION_DAYS=14

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --stack-name)
      STACK_NAME="$2"
      shift
      shift
      ;;
    --environment|-e)
      ENVIRONMENT="$2"
      shift
      shift
      ;;
    --service-name|-s)
      SERVICE_NAME="$2"
      shift
      shift
      ;;
    --log-retention|-r)
      LOG_RETENTION_DAYS="$2"
      shift
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --stack-name NAME       CloudFormation stack name (default: aws-agentcore-observability)"
      echo "  --environment, -e ENV   Environment (dev, test, prod) (default: dev)"
      echo "  --service-name, -s NAME Service name for resource naming (default: aws-agentcore)"
      echo "  --log-retention, -r DAYS Log retention period in days (default: 14)"
      echo "  --help, -h              Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|test|prod)$ ]]; then
  echo "Error: Environment must be one of: dev, test, prod"
  exit 1
fi

# Validate log retention days
if [[ ! "$LOG_RETENTION_DAYS" =~ ^(1|3|5|7|14|30|60|90|120|150|180|365|400|545|731|1827|3653)$ ]]; then
  echo "Error: Log retention days must be one of: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653"
  exit 1
fi

echo "Deploying AWS AgentCore Observability Resources..."
echo "Stack Name: $STACK_NAME"
echo "Environment: $ENVIRONMENT"
echo "Service Name: $SERVICE_NAME"
echo "Log Retention: $LOG_RETENTION_DAYS days"

# Check if stack exists
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &> /dev/null; then
  # Update existing stack
  echo "Updating existing stack: $STACK_NAME"
  aws cloudformation update-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE_FILE" \
    --parameters \
      ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
      ParameterKey=ServiceName,ParameterValue="$SERVICE_NAME" \
      ParameterKey=LogRetentionDays,ParameterValue="$LOG_RETENTION_DAYS" \
    --capabilities CAPABILITY_IAM

  # Wait for stack update to complete
  echo "Waiting for stack update to complete..."
  aws cloudformation wait stack-update-complete --stack-name "$STACK_NAME"
else
  # Create new stack
  echo "Creating new stack: $STACK_NAME"
  aws cloudformation create-stack \
    --stack-name "$STACK_NAME" \
    --template-body "file://$TEMPLATE_FILE" \
    --parameters \
      ParameterKey=Environment,ParameterValue="$ENVIRONMENT" \
      ParameterKey=ServiceName,ParameterValue="$SERVICE_NAME" \
      ParameterKey=LogRetentionDays,ParameterValue="$LOG_RETENTION_DAYS" \
    --capabilities CAPABILITY_IAM

  # Wait for stack creation to complete
  echo "Waiting for stack creation to complete..."
  aws cloudformation wait stack-create-complete --stack-name "$STACK_NAME"
fi

# Get stack outputs
echo "Stack deployment completed. Outputs:"
aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs" \
  --output table

echo "Observability resources deployed successfully!"