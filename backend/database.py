"""Shared PostgreSQL configuration and connection factory."""

from __future__ import annotations

import os

import psycopg


DATABASE_CONNECT_TIMEOUT_SECONDS = 3


def database_url():
    """Read the server-only PostgreSQL URL without logging or exposing it."""
    return os.environ.get("DATABASE_URL")


def connect_database(connection_url=None):
    """Create a Psycopg 3 connection using the shared timeout policy."""
    url = connection_url or database_url()
    if not url:
        raise ValueError("DATABASE_URL is not configured.")
    return psycopg.connect(url, connect_timeout=DATABASE_CONNECT_TIMEOUT_SECONDS)
