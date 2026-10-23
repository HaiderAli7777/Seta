# Build the app, then run the sync server, which also serves the app.
# docker build -t invoeez -f server/Dockerfile .      (run from the invoeez folder)
# docker run -p 8787:8787 -e DATABASE_URL=postgres://user:pass@host:5432/invoeez invoeez
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app/server
COPY server/package.json ./
RUN npm install --omit=dev
COPY server/ ./
COPY --from=build /app/dist /app/dist
ENV APP_DIR=/app/dist PORT=8787 NODE_ENV=production
EXPOSE 8787
CMD ["node", "index.mjs"]
