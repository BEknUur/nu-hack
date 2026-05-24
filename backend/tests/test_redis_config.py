import unittest

from core.redis.config import RedisSettings


class RedisSettingsTests(unittest.TestCase):
    def test_accepts_redis_url(self):
        settings = RedisSettings(_env_file=None, REDIS_URL="redis://:pass@example.com:6379/0")
        self.assertEqual(settings.connection_url, "redis://:pass@example.com:6379/0")

    def test_builds_non_ssl_url_from_host_port(self):
        settings = RedisSettings(
            _env_file=None,
            REDIS_HOST="a1-redis1.alem.ai",
            REDIS_PORT=31003,
            REDIS_PASSWORD="secret",
            REDIS_DB=0,
        )
        self.assertEqual(settings.connection_url, "redis://:secret@a1-redis1.alem.ai:31003/0")

    def test_builds_ssl_url_when_enabled(self):
        settings = RedisSettings(
            _env_file=None,
            REDIS_HOST="a1-redis1.alem.ai",
            REDIS_PORT=31003,
            REDIS_PASSWORD="secret",
            REDIS_DB=1,
            REDIS_SSL=True,
        )
        self.assertEqual(settings.connection_url, "rediss://:secret@a1-redis1.alem.ai:31003/1")

    def test_requires_url_or_host_port(self):
        with self.assertRaises(ValueError):
            RedisSettings(_env_file=None, REDIS_HOST="", REDIS_PORT=0)


if __name__ == "__main__":
    unittest.main()
