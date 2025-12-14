FROM mcr.microsoft.com/devcontainers/typescript-node:22 as base

WORKDIR /workspaces/algo-visualizer

SHELL ["/bin/bash", "-c"]

ENV NODE_OPTIONS=--max-old-space-size=8192

COPY . .

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive && \
    apt-get install -y --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN npm install -g bun

