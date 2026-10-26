FROM public.ecr.aws/docker/library/python:3.13-slim
RUN apt-get update && apt-get install -y --no-install-recommends iproute2 openssl \
    && rm -rf /var/lib/apt/lists/*
