FROM node:22-bookworm-slim
WORKDIR /opt/dawn-code
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run package \
  && mkdir -p /opt/dawn-code/bin \
  && cp dist/gateway.cjs /opt/dawn-code/dist/gateway.cjs \
  && cp deploy/run-gateway.sh /opt/dawn-code/bin/run-gateway.sh
ENV DAWN_CODE_HOST=0.0.0.0 \
    DAWN_CODE_PORT=8791 \
    DAWN_CODE_DATA=/var/lib/dawn-code
EXPOSE 8791
CMD ["node", "/opt/dawn-code/dist/gateway.cjs"]
