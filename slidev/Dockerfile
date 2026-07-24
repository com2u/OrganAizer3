FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY entrypoint.sh /usr/local/bin/slidev-entrypoint
RUN chmod +x /usr/local/bin/slidev-entrypoint
EXPOSE 3030
ENTRYPOINT ["/usr/local/bin/slidev-entrypoint"]
