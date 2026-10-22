FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    TZ=Asia/Shanghai \
    VIRTUAL_ENV=/opt/venv

ENV PATH="$VIRTUAL_ENV/bin:$PATH"

RUN apt-get update \
    && apt-get install -y --no-install-recommends tzdata ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY security/ /app/security/
RUN mkdir -p /app/security/ca/empty
ENV SSL_CERT_FILE=/app/security/ca/ca-certificates.crt \
    SSL_CERT_DIR=/app/security/ca/empty \
    REQUESTS_CA_BUNDLE=/app/security/ca/ca-certificates.crt \
    CURL_CA_BUNDLE=/app/security/ca/ca-certificates.crt

ENV AWS_CA_BUNDLE=/app/security/ca/ca-certificates.crt
ENV GRPC_DEFAULT_SSL_ROOTS_FILE_PATH=/app/security/ca/ca-certificates.crt
RUN /usr/local/bin/python -m pip install --no-cache-dir --cert "$SSL_CERT_FILE" pip==26.2.2 uv==0.13.4 \
    && python -m venv "$VIRTUAL_ENV"

COPY pyproject.toml uv.lock /app/

RUN uv sync --frozen --no-dev --no-install-project --active \
    && uv pip install --python "$VIRTUAL_ENV/bin/python" --no-deps pip==26.2.2

# Pre-install Playwright Chromium + OS deps to make auto-register/solver usable in Docker
# without doing `apt-get` at runtime.
RUN python -m playwright install --with-deps chromium

COPY config.defaults.toml /app/config.defaults.toml
COPY app /app/app
COPY main.py /app/main.py
COPY scripts /app/scripts

# When building on Windows, shell scripts may be copied with CRLF endings and
# without executable bit. Normalize both to keep ENTRYPOINT reliable.
RUN sed -i 's/\r$//' /app/scripts/*.sh || true \
    && chmod +x /app/scripts/*.sh || true

RUN mkdir -p /app/data /app/data/tmp /app/logs

EXPOSE 8788

ENTRYPOINT ["python", "/app/security/security_ca.py", "--exec", "/app/scripts/entrypoint.sh"]
CMD ["/app/scripts/start.sh"]
