FROM node:22-bookworm-slim

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium ffmpeg fonts-dejavu-core fonts-liberation ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global hyperframes@0.7.70
RUN mkdir -p /tmp/sharp-runtime \
    && cd /tmp/sharp-runtime \
    && npm init -y >/dev/null \
    && npm install --include=optional --os=linux --cpu=x64 sharp@0.34.5 \
    && cp -a node_modules/@img /usr/local/lib/node_modules/hyperframes/node_modules/ \
    && rm -rf /tmp/sharp-runtime
RUN hyperframes telemetry disable

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
RUN mkdir -p /opt/hyperframes-seed
COPY index.html /opt/hyperframes-seed/index.html
COPY forwarder.mjs /opt/hyperframes-forwarder.mjs
COPY entrypoint.sh /usr/local/bin/hyperframes-entrypoint
RUN chmod +x /usr/local/bin/hyperframes-entrypoint
WORKDIR /data/hyperframes/projects/default
EXPOSE 3002
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/hyperframes-entrypoint"]
