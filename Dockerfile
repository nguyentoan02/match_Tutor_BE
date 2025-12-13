# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder
WORKDIR /app

# Cài đặt system dependency cho pdftotext
RUN apk add --no-cache poppler-utils

# Copy và cài đặt Node dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code và Build
COPY . .
RUN npm run build

# Stage 2: Production Final Image
FROM node:22-alpine
WORKDIR /app

# Cài đặt system dependency cho pdftotext (BẮT BUỘC)
RUN apk add --no-cache poppler-utils

# Tận dụng cache từ Stage 1
COPY package.json package-lock.json ./
RUN npm install --production

# Copy built code từ builder stage
COPY --from=builder /app/dist ./dist

# EXPOSE port
EXPOSE 5000

# Khởi động ứng dụng và các worker
CMD ["npm", "run", "start"]