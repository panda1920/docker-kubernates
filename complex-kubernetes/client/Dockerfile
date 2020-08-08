FROM node:alpine as builder

# install dependency
WORKDIR /usr/app
COPY ./package.json .
RUN npm install

#  build app
COPY . .
RUN npm run build

# setup server
FROM nginx:latest
EXPOSE 3000
COPY --from=builder /usr/app/build /usr/share/nginx/html
COPY ./nginx/default.conf /etc/nginx/conf.d/default.conf
