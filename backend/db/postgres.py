"""
PostgreSQL database connection and models for the CFO App.
"""
from sqlalchemy import create_engine, Column, String, Boolean, DateTime, ForeignKey, JSON, Text, Float, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import UUID
import os
from datetime import datetime
import uuid
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check if database should be skipped
SKIP_DB = os.getenv("SKIP_DB", "0") in {"1", "true", "True"}

if not SKIP_DB:
    # Create SQLAlchemy engine using Supabase Postgres credentials
    print("\nInitializing PostgreSQL connection...")
    db_password = os.getenv('SUPABASE_DB_PASSWORD')
    print(f"DB Password set: {'yes' if db_password else 'no'} (length: {len(db_password) if db_password else 0})")
else:
    print("\nSkipping PostgreSQL connection (SKIP_DB=1)")
    db_password = None

if not SKIP_DB:
    # Get DATABASE_URL from environment variable
    DATABASE_URL = os.getenv('DATABASE_URL')
    
    if not DATABASE_URL:
        # Fallback: construct from individual components if DATABASE_URL not set
        if db_password:
            db_password = db_password.replace('@', '%40')
            print("URL encoded @ symbol in password")
        DATABASE_URL = f"postgresql://postgres.rpilyciarvacbmaaszvc:{db_password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres"
    
    print(f"Database URL: {DATABASE_URL[:50]}...{DATABASE_URL[-20:]}")

    # Create engine with debug output
    print("Creating SQLAlchemy engine...")
    try:
        engine = create_engine(DATABASE_URL, echo=True)  # Enable SQL query logging
        print("Successfully created SQLAlchemy engine")
    except Exception as e:
        print(f"\nFailed to create SQLAlchemy engine:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        if hasattr(e, '__cause__') and e.__cause__:
            print(f"Caused by: {str(e.__cause__)}")
        raise

    # Run simple auto-migration to ensure newer columns exist (primarily for tests / CI)
    with engine.connect() as conn:
        try:
            # Ensure extra_metadata column exists
            res = conn.execute(text("""
                SELECT 1 FROM information_schema.columns 
                WHERE table_name='financial_statements' 
                  AND column_name='extra_metadata' 
                LIMIT 1;"""))
            if res.fetchone() is None:
                print("Adding missing column extra_metadata to financial_statements …")
                conn.execute(text("ALTER TABLE financial_statements ADD COLUMN extra_metadata JSONB"))
                conn.commit()
        except Exception as mig_err:
            # Non-fatal: print but continue startup
            print(f"Auto-migration check failed: {mig_err}")

# Create session factory (only if database is available)
if not SKIP_DB:
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    # Create a dummy session factory when database is skipped
    SessionLocal = None

# Create base class for declarative models
Base = declarative_base()

class User(Base):
    """User model matching Supabase users table"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FinancialStatement(Base):
    """Financial statement model matching the existing database table"""
    __tablename__ = "financial_statements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    file_name = Column(Text, nullable=False)
    file_path = Column(Text, nullable=False)
    statement_type = Column(Text, nullable=False)  # income_statement, balance_sheet, cash_flow
    upload_date = Column(DateTime(timezone=True), default=datetime.utcnow)
    file_size = Column(BigInteger)
    file_type = Column(Text)  # e.g., csv, xlsx, pdf
    parsed_data = Column(JSON)  # Parsed financial data
    extra_metadata = Column(JSON)  # Additional metadata (e.g., date ranges, currency)

class FinancialCategory(Base):
    """Financial category model for classifying statement items"""
    __tablename__ = "financial_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # income, expense, asset, liability, equity
    description = Column(Text)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("financial_categories.id"))  # For hierarchical categories
    extra_metadata = Column(JSON)  # Additional metadata (e.g., custom rules, AI hints)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Create stub objects when SKIP_DB is enabled
if SKIP_DB:
    # Create stub engine and session
    engine = None
    SessionLocal = None
    Base = declarative_base()
    
    # Create stub User model
    class User:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)
    
    # Create stub FinancialStatement model
    class FinancialStatement:
        def __init__(self, **kwargs):
            for key, value in kwargs.items():
                setattr(self, key, value)
else:
    # SessionLocal already created above in the conditional block
    pass

# Dependency to get database session
def get_db():
    """Get database session"""
    if SKIP_DB:
        # Return a stub session for testing
        class StubSession:
            def query(self, *args): return self
            def filter(self, *args): return self
            def first(self): return None
            def all(self): return []
            def add(self, obj): pass
            def commit(self): pass
            def refresh(self, obj): pass
            def rollback(self): pass
            def close(self): pass
        yield StubSession()
    else:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
