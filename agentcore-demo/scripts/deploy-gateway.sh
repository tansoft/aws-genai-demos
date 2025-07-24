#!/bin/bash
# Deploy gateway resources for AWS AgentCore

# Set default environment if not provided
ENVIRONMENT=${1:-dev}

# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the CloudFormation stack name
STACK_NAME="agentcore-gateway-$ENVIRONMENT"

# Create a temporary directory for the Lambda code
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Create the Lambda function code
cat > "$TEMP_DIR/index.js" << 'EOF'
/**
 * AWS Lambda function for AgentCore tool gateway
 */
exports.handler = async (event) => {
  console.log('Tool Gateway received event:', JSON.stringify(event));
  
  try {
    // Extract tool name and parameters
    const { tool, parameters } = event;
    
    if (!tool) {
      throw new Error('Tool name is required');
    }
    
    // Simple example tool that returns the current time
    if (tool === 'getCurrentTime') {
      return {
        result: new Date().toISOString()
      };
    }
    
    // Simple example tool that performs a calculation
    if (tool === 'calculate') {
      const { operation, a, b } = parameters;
      
      if (!operation) {
        throw new Error('Operation is required');
      }
      
      if (a === undefined || b === undefined) {
        throw new Error('Both a and b parameters are required');
      }
      
      let result;
      
      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          if (b === 0) {
            throw new Error('Division by zero');
          }
          result = a / b;
          break;
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
      
      return {
        result
      };
    }
    
    // Simple example tool that returns weather data
    if (tool === 'getWeather') {
      const { location } = parameters;
      
      if (!location) {
        throw new Error('Location is required');
      }
      
      // Mock weather data
      const weatherData = {
        'new york': { temperature: 72, condition: 'Sunny', humidity: 45 },
        'london': { temperature: 62, condition: 'Cloudy', humidity: 80 },
        'tokyo': { temperature: 85, condition: 'Rainy', humidity: 90 },
        'sydney': { temperature: 70, condition: 'Clear', humidity: 50 },
      };
      
      const locationKey = location.toLowerCase();
      
      if (weatherData[locationKey]) {
        return {
          result: weatherData[locationKey]
        };
      }
      
      return {
        result: { error: 'Location not found' }
      };
    }
    
    throw new Error(`Unknown tool: ${tool}`);
  } catch (error) {
    console.error('Error executing tool:', error);
    
    return {
      error: error.message
    };
  }
};
EOF

# Create a zip file for the Lambda function
cd "$TEMP_DIR"
zip -r function.zip index.js
cd -

# Create a CloudFormation template for the gateway
cat > "$TEMP_DIR/gateway.yaml" << EOF
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AWS Gateway resources for AgentCore'

Parameters:
  Environment:
    Type: String
    Default: $ENVIRONMENT
    Description: Environment name

Resources:
  # Lambda function for tool gateway
  ToolGatewayFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub 'agentcore-tool-gateway-\${Environment}'
      Handler: index.handler
      Role: !GetAtt ToolGatewayRole.Arn
      Code:
        ZipFile: |
          /**
           * AWS Lambda function for AgentCore tool gateway
           */
          exports.handler = async (event) => {
            console.log('Tool Gateway received event:', JSON.stringify(event));
            
            try {
              // Extract tool name and parameters
              const { tool, parameters } = event;
              
              if (!tool) {
                throw new Error('Tool name is required');
              }
              
              // Simple example tool that returns the current time
              if (tool === 'getCurrentTime') {
                return {
                  result: new Date().toISOString()
                };
              }
              
              // Simple example tool that performs a calculation
              if (tool === 'calculate') {
                const { operation, a, b } = parameters;
                
                if (!operation) {
                  throw new Error('Operation is required');
                }
                
                if (a === undefined || b === undefined) {
                  throw new Error('Both a and b parameters are required');
                }
                
                let result;
                
                switch (operation) {
                  case 'add':
                    result = a + b;
                    break;
                  case 'subtract':
                    result = a - b;
                    break;
                  case 'multiply':
                    result = a * b;
                    break;
                  case 'divide':
                    if (b === 0) {
                      throw new Error('Division by zero');
                    }
                    result = a / b;
                    break;
                  default:
                    throw new Error(\`Unknown operation: \${operation}\`);
                }
                
                return {
                  result
                };
              }
              
              // Simple example tool that returns weather data
              if (tool === 'getWeather') {
                const { location } = parameters;
                
                if (!location) {
                  throw new Error('Location is required');
                }
                
                // Mock weather data
                const weatherData = {
                  'new york': { temperature: 72, condition: 'Sunny', humidity: 45 },
                  'london': { temperature: 62, condition: 'Cloudy', humidity: 80 },
                  'tokyo': { temperature: 85, condition: 'Rainy', humidity: 90 },
                  'sydney': { temperature: 70, condition: 'Clear', humidity: 50 },
                };
                
                const locationKey = location.toLowerCase();
                
                if (weatherData[locationKey]) {
                  return {
                    result: weatherData[locationKey]
                  };
                }
                
                return {
                  result: { error: 'Location not found' }
                };
              }
              
              throw new Error(\`Unknown tool: \${tool}\`);
            } catch (error) {
              console.error('Error executing tool:', error);
              
              return {
                error: error.message
              };
            }
          };
      Runtime: nodejs18.x
      Timeout: 30
      MemorySize: 128

  # IAM Role for the Tool Gateway Lambda function
  ToolGatewayRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'AgentCore-ToolGateway-\${Environment}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  # CloudWatch Log Group for the Lambda function
  ToolGatewayLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/lambda/agentcore-tool-gateway-\${Environment}'
      RetentionInDays: 7

  # API Gateway for the Tool Gateway Lambda function
  ToolGatewayApi:
    Type: AWS::ApiGateway::RestApi
    Properties:
      Name: !Sub 'agentcore-tool-gateway-api-\${Environment}'
      Description: API for AWS AgentCore Tool Gateway
      EndpointConfiguration:
        Types:
          - REGIONAL
          
  # API Gateway Resource for the Tool Gateway Lambda function
  ToolGatewayApiResource:
    Type: AWS::ApiGateway::Resource
    Properties:
      RestApiId: !Ref ToolGatewayApi
      ParentId: !GetAtt ToolGatewayApi.RootResourceId
      PathPart: 'execute'
      
  # API Gateway Method for the Tool Gateway Lambda function
  ToolGatewayApiMethod:
    Type: AWS::ApiGateway::Method
    Properties:
      RestApiId: !Ref ToolGatewayApi
      ResourceId: !Ref ToolGatewayApiResource
      HttpMethod: POST
      AuthorizationType: NONE
      Integration:
        Type: AWS_PROXY
        IntegrationHttpMethod: POST
        Uri: !Sub 'arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/\${ToolGatewayFunction.Arn}/invocations'
      
  # API Gateway Deployment for the Tool Gateway Lambda function
  ToolGatewayApiDeployment:
    Type: AWS::ApiGateway::Deployment
    DependsOn:
      - ToolGatewayApiMethod
    Properties:
      RestApiId: !Ref ToolGatewayApi
      StageName: !Ref Environment
      
  # Lambda Permission for API Gateway
  ToolGatewayApiPermission:
    Type: AWS::Lambda::Permission
    Properties:
      Action: lambda:InvokeFunction
      FunctionName: !Ref ToolGatewayFunction
      Principal: apigateway.amazonaws.com
      SourceArn: !Sub 'arn:aws:execute-api:\${AWS::Region}:\${AWS::AccountId}:\${ToolGatewayApi}/\${Environment}/POST/execute'

Outputs:
  ToolGatewayFunctionArn:
    Description: ARN of the Tool Gateway Lambda function
    Value: !GetAtt ToolGatewayFunction.Arn
    Export:
      Name: !Sub '\${AWS::StackName}-ToolGatewayFunctionArn'
      
  ToolGatewayApiUrl:
    Description: URL of the Tool Gateway API
    Value: !Sub 'https://\${ToolGatewayApi}.execute-api.\${AWS::Region}.amazonaws.com/\${Environment}/execute'
    Export:
      Name: !Sub '\${AWS::StackName}-ToolGatewayApiUrl'
EOF

# Deploy CloudFormation stack
echo "Deploying gateway resources to $ENVIRONMENT environment..."

aws cloudformation deploy \
  --template-file "$TEMP_DIR/gateway.yaml" \
  --stack-name "$STACK_NAME" \
  --parameter-overrides \
    Environment="$ENVIRONMENT" \
  --capabilities CAPABILITY_NAMED_IAM

# Check if deployment was successful
if [ $? -eq 0 ]; then
  echo "Gateway resources deployed successfully!"
  
  # Get outputs
  FUNCTION_ARN=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ToolGatewayFunctionArn'].OutputValue" --output text)
  API_URL=$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs[?OutputKey=='ToolGatewayApiUrl'].OutputValue" --output text)
  
  echo "Tool Gateway Function ARN: $FUNCTION_ARN"
  echo "Tool Gateway API URL: $API_URL"
  
  # Update .env file with gateway information
  if [ -f "$SCRIPT_DIR/../.env" ]; then
    echo "Updating .env file with gateway information..."
    
    # Check if the variables already exist in the .env file
    if grep -q "GATEWAY_LAMBDA_FUNCTION_NAME" "$SCRIPT_DIR/../.env"; then
      # Update existing variables
      sed -i '' "s|GATEWAY_LAMBDA_FUNCTION_NAME=.*|GATEWAY_LAMBDA_FUNCTION_NAME=agentcore-tool-gateway-$ENVIRONMENT|g" "$SCRIPT_DIR/../.env"
      sed -i '' "s|GATEWAY_API_URL=.*|GATEWAY_API_URL=$API_URL|g" "$SCRIPT_DIR/../.env"
    else
      # Add new variables
      echo "" >> "$SCRIPT_DIR/../.env"
      echo "# Gateway information" >> "$SCRIPT_DIR/../.env"
      echo "GATEWAY_LAMBDA_FUNCTION_NAME=agentcore-tool-gateway-$ENVIRONMENT" >> "$SCRIPT_DIR/../.env"
      echo "GATEWAY_API_URL=$API_URL" >> "$SCRIPT_DIR/../.env"
    fi
    
    echo ".env file updated successfully"
  else
    echo "Warning: .env file not found. Please create it and add the gateway information manually."
  fi
else
  echo "Error: Gateway resources deployment failed"
  exit 1
fi

# Clean up temporary directory
rm -rf "$TEMP_DIR"
echo "Cleaned up temporary directory"