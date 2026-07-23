FROM node:18-slim

# LibreOffice এবং প্রয়োজনীয় প্যাকেজ ইন্সটল করা
RUN apt-get update && apt-get install -y \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 10000
CMD ["node", "index.js"]
