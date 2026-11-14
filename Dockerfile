FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
RUN mkdir -p /app/uploads /app/render-output /app/.secrets && chown -R node:node /app
USER node
EXPOSE 3001
CMD ["node", "dist-server/index.cjs"]
