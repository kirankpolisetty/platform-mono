ARG NODE_IMAGE=registry.redhat.io/ubi9/nodejs-22:latest
ARG NGINX_IMAGE=registry.redhat.io/ubi9/nginx-124:latest

FROM ${NODE_IMAGE} AS builder

ARG APP_NAME=dataviewer

WORKDIR /opt/app-root/src

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx ng build ${APP_NAME}

FROM ${NGINX_IMAGE}

ARG APP_NAME=dataviewer

COPY --from=builder /opt/app-root/src/dist/${APP_NAME}/browser /opt/app-root/src

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
