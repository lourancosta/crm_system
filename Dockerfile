FROM node:22-alpine

# O readinessProbe do chart e do tipo exec e termina em `curl -sf .../healthz`.
# A imagem base alpine nao traz curl, entao o probe falhava com
# "/bin/sh: curl: not found" e o pod nunca ficava Ready -- mesmo com a app
# de pe e o /healthz respondendo 200.
RUN apk add --no-cache curl

WORKDIR /app

# Install API dependencies
COPY package*.json ./

RUN npm ci

# Install client dependencies
COPY client/package*.json ./client/

RUN cd client && npm ci

# Copy application source
COPY . .

# Build API + client
RUN npm run build

EXPOSE 80

CMD ["npm", "start"]