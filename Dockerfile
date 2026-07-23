FROM node:18-slim

# লিনাক্সে LibreOffice, Writer এবং Java এনভায়রনমেন্ট একসাথে ইনস্টল করা যাতে soffice বাইনারি পাওয়া যায়
RUN apt-get update && apt-get install -y \
    libreoffice \
    libreoffice-writer \
    default-jre \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 10000
CMD ["node", "index.js"]
