FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Baked into the client bundle: where "Request a change" sends people.
ARG NEXT_PUBLIC_THESEUS_URL=
ENV NEXT_PUBLIC_THESEUS_URL=$NEXT_PUBLIC_THESEUS_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 DATA_DIR=/data
RUN mkdir -p /data && chown node:node /data
COPY --from=build /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
# No volume on /data on purpose: the demo resets to the seed on every restart.
CMD ["node", "server.js"]
