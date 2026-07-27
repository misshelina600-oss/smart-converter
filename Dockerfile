FROM node:18-slim

# সার্ভারে LibreOffice এবং প্রয়োজনীয় ফন্ট ইনস্টল করা হচ্ছে যাতে কনভার্ট করতে কোনো সমস্যা না হয়
RUN apt-get update && apt-get install -y \
    libreoffice \
    default-jre \
    fonts-libertine \
    fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 10000

CMD ["npm", "start"]
