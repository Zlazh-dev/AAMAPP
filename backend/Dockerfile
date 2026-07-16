# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# --- Production stage ---
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV UPLOAD_ROOT=/data/uploads
# Buat direktori uploads & pastikan writable oleh user node (uid 1000)
RUN mkdir -p /data/uploads && chown -R node:node /data
# Install deps sebagai root (writable /app), bukan USER node
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
# Pastikan dist & node_modules dimiliki node (non-root runtime)
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]
