import redis
from core.redis.config import redis_settings


def _build_redis_client() -> redis.Redis:
    common_kwargs = {
        "decode_responses": redis_settings.decode_responses,
        "socket_connect_timeout": redis_settings.socket_connect_timeout,
        "socket_timeout": redis_settings.socket_timeout,
    }

    if redis_settings.redis_url:
        return redis.Redis.from_url(redis_settings.connection_url, **common_kwargs)

    return redis.Redis(
        host=redis_settings.host,
        port=redis_settings.port,
        username=redis_settings.username or None,
        password=redis_settings.password or None,
        db=redis_settings.db,
        ssl=redis_settings.ssl,
        **common_kwargs,
    )


redis_client: redis.Redis = _build_redis_client()


def get_redis() -> redis.Redis:
    """FastAPI dependency — yields the shared Redis client."""
    return redis_client


def ping_redis() -> bool:
    """Returns True if Redis is reachable, False otherwise."""
    try:
        return redis_client.ping()
    except Exception:
        return False
