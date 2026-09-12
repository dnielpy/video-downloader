FROM alpine:3.22

RUN apk add --no-cache aria2 ca-certificates curl \
  && addgroup -g 1000 download \
  && adduser -D -H -u 1000 -G download download \
  && mkdir -p /config /downloads /state/events \
  && chown -R download:download /config /downloads /state

COPY aria2.conf /etc/aria2/aria2.conf
COPY entrypoint.sh aria2-event.sh aria2-healthcheck.sh /usr/local/bin/

RUN chmod 755 /usr/local/bin/entrypoint.sh /usr/local/bin/aria2-event.sh /usr/local/bin/aria2-healthcheck.sh \
  && ln -s /usr/local/bin/aria2-event.sh /usr/local/bin/aria2-event-complete \
  && ln -s /usr/local/bin/aria2-event.sh /usr/local/bin/aria2-event-error \
  && ln -s /usr/local/bin/aria2-event.sh /usr/local/bin/aria2-event-removed

USER download
EXPOSE 6800

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
