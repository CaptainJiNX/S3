FROM mhart/alpine-node:4.4.7
MAINTAINER Roger Wilson <ctjinx@gmail.com>

ENV S3BACKEND mem

RUN mkdir -p /app
WORKDIR /app

COPY . /app

RUN apk add --no-cache python make gcc g++ git && \
    npm install && \
    npm run compile && \
    npm prune --production && \
    apk del python make gcc g++ git && \
    rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp

CMD ["node", "dist.js"]

VOLUME ["/app/localData","/app/localMetadata","/app/mockData"]

EXPOSE 8000
