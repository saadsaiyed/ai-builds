# Multi-stage Dockerfile for Create React App

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY . .
ARG REACT_APP_GEMINI_API_KEY=""
ENV REACT_APP_GEMINI_API_KEY=$REACT_APP_GEMINI_API_KEY
RUN npm run build

# Production stage
FROM nginx:stable-alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
