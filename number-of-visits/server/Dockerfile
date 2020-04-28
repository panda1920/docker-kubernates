FROM node:alpine

WORKDIR '/usr/app'

ENTRYPOINT []
CMD [ "npm", "start" ]

COPY ./package.json ./
RUN npm install
COPY ./ ./
