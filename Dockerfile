# Use a lightweight Node image
FROM node:18-alpine

WORKDIR /app

# 1. Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# 2. Copy Source Code
COPY . .

# 3. Start the Ingestion Service
# We explicitly point to the ingestion index file
CMD ["node", "index.js"]