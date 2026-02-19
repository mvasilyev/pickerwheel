FROM node:20-alpine

WORKDIR /app

COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --production

COPY server/ ./server/
COPY public/ ./public/

EXPOSE 3000

WORKDIR /app/server
CMD ["node", "index.js"]
