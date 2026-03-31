FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install -g ts-node typescript

EXPOSE 3000
# Run migrations then start server
CMD ["sh", "-c", "npx knex migrate:latest && npx ts-node src/index.ts"]
