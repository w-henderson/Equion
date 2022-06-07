FROM node:alpine

# For some reason Python is required
RUN apk add --no-cache --virtual .gyp g++ make py3-pip

WORKDIR /app

COPY package*.json ./
RUN npm install

RUN apk del .gyp

COPY . .

RUN npm run build