# Third-party modules
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Project modules
from core.database.config import alemdb_settings 

engine = create_engine(
    alemdb_settings.url, 
    echo=alemdb_settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800, 
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Analog migration
def create_db_schema() -> None:
    """
    Ensure database tables exist for all registered ORM models.
    """
    import services.ml_data.models  # noqa: F401
    import services.auth.models  # noqa: F401

    Base.metadata.create_all(bind=engine)

def get_db():
    """
    Database session generator.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
