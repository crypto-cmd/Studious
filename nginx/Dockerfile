FROM nginx:alpine

RUN apk add --no-cache gettext

COPY nginx.conf /etc/nginx/nginx.conf.template

EXPOSE 80

CMD ["/bin/sh", "-c", "\
    envsubst '${DOMAIN} ${APP_DOMAIN}' \
    < /etc/nginx/nginx.conf.template \
    > /etc/nginx/nginx.conf && \
    nginx -g 'daemon off;'"]
