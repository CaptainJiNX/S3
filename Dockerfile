FROM mhart/alpine-node:4.4.7
MAINTAINER Roger Wilson <ctjinx@gmail.com>

RUN apk add --no-cache python make gcc g++
RUN apk add --no-cache git

ENV S3BACKEND mem

RUN mkdir -p /app
WORKDIR /app

COPY package.json /app/

RUN npm install -q --registry=http://artifactory.viaplay.tv/artifactory/api/npm/mtg-npm-virtual && \
    rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp && \
    apk del python make gcc g++ git

COPY . /app
RUN npm run compile

CMD ["node", "dist.js"]

VOLUME ["/app/localData","/app/localMetadata","/app/mockData"]

EXPOSE 8000
