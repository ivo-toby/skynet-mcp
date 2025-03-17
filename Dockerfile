FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port for the server
EXPOSE 3000

# Set environment to development by default
ENV NODE_ENV=development

# Command to run the application
CMD ["node", "dist/index.js"]