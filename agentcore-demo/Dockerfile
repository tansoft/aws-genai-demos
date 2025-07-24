FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/index.js"]