FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY dist/index.js ./
COPY dist/contract/* ./contract/
EXPOSE 5000
CMD ["node", "index.js"]