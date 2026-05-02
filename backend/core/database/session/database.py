# Third-party modules
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Project modules
from database.config import alemdb_settings 

engine = create_engine(
    alemdb_settings.url, 
    echo=alemdb_settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800, 
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """
    Database session generator.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()