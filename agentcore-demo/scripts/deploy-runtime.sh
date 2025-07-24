#!/bin/bash

# Deploy the runtime Lambda function

# Set default environment if not provided
ENVIRONMENT=${1:-dev}
REGION=${AWS_REGION:-us-west-2}

echo "Deploying runtime Lambda function to environment $ENVIRONMENT in region $REGION"

# Build the project
echo "Building the project..."
npm run build

# Create a temporary directory for the Lambda package
mkdir -p .tmp/runtime

# Copy the necessary files to the temporary directory
echo "Preparing Lambda package..."
cp -r dist/runtime .tmp/runtime/
cp -r dist/common .tmp/runtime/
cp package.json .tmp/runtime/

# Install production dependencies in the temporary directory
echo "Installing production dependencies..."
cd .tmp/runtime
npm install --production
cd ../..

# Create a zip file for the Lambda function
echo "Creating Lambda package..."
cd .tmp/runtime
zip -r ../../runtime-lambda.zip .
cd ../..

# Get the deployment bucket name from CloudFormation outputs
echo "Getting deployment bucket name..."
STACK_NAME="agentcore-demos-$ENVIRONMENT"
DEPLOYMENT_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='DeploymentBucketName'].OutputValue" \
  --output text \
  --region $REGION)

if [ -z "$DEPLOYMENT_BUCKET" ]; then
  echo "Error: Could not get deployment bucket name from CloudFormation outputs"
  exit 1
fi

# Upload the Lambda package to S3
echo "Uploading Lambda package to S3..."
aws s3 cp runtime-lambda.zip s3://$DEPLOYMENT_BUCKET/$ENVIRONMENT/runtime-lambda.zip --region $REGION

# Update the Lambda function code
echo "Updating Lambda function code..."
aws lambda update-function-code \
  --function-name agentcore-runtime-$ENVIRONMENT \
  --s3-bucket $DEPLOYMENT_BUCKET \
  --s3-key $ENVIRONMENT/runtime-lambda.zip \
  --region $REGION

# Clean up
echo "Cleaning up..."
rm -rf .tmp
rm runtime-lambda.zip

echo "Deployment complete!"