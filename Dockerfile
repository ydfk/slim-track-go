# syntax=docker/dockerfile:1.6

FROM golang:1.25-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /app/slim-track ./

FROM alpine:3.20 AS runtime
RUN sed -i 's/https/http/g' /etc/apk/repositories \
    && apk update \
    && apk add --no-cache ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app
ENV DATABASE_PATH=/data/slim-track.db
COPY --from=builder /app/slim-track /app/slim-track
COPY --from=builder /app/templates /app/templates
COPY --from=builder /app/static /app/static

EXPOSE 8080
VOLUME ["/data"]
ENTRYPOINT ["/app/slim-track"]

