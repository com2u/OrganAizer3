FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
EXPOSE 3030
CMD ["npx", "slidev", "/slides/slides.md", "--remote", "--port", "3030", "--base", "/slidev/"]
