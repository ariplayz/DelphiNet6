# Stage 1: Build the frontend
FROM node:20-alpine AS build-stage
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Final image with server and built frontend
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/ ./server/
COPY --from=build-stage /app/dist ./dist

EXPOSE 80
ENV PORT=80
ENV WEB_ROOT=/app/dist
ENV DATA_DIR=/app/server/data

CMD ["node", "server/index.js"]
