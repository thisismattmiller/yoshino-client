# Stage 1: Build frontend
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

COPY client/ client/
ARG BASE_PATH=/yoshino/
ENV BASE_PATH=$BASE_PATH
RUN cd client && npx vite build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server/ server/
COPY --from=build /app/client/dist client/dist

RUN mkdir -p data && chown node:node data

USER node
EXPOSE 3747
CMD ["node", "server/index.js"]
