from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict
from datetime import datetime
import os
from supabase import create_client, Client
from uuid import uuid4
from sqlalchemy.orm import Session
from db.postgres import get_db, User as DBUser
from functools import lru_cache

router = APIRouter(prefix="/auth", tags=["auth"])

# Required environment variables
REQUIRED_ENV_VARS = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
]

# Validate environment variables
def validate_env_vars():
    missing_vars = [var for var in REQUIRED_ENV_VARS if not os.getenv(var)]
    if missing_vars:
        raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}")

# Optional flag to disable local Postgres usage (CI / offline mode)

def db_disabled() -> bool:
    """Return True when SKIP_DB=1 in the environment."""
    return os.getenv("SKIP_DB") == "1"

# Initialize Supabase clients with validation
@lru_cache()
def get_supabase_auth() -> Client:
    """Return a Supabase client. If SKIP_SERVICE_CHECKS=1, return a stub that mimics what we need."""
    if os.getenv("SKIP_SERVICE_CHECKS") == "1":
        class _StubSession:  # minimal stub to satisfy tests
            def __init__(self, email: str):
                self.access_token = str(uuid4())
                self.refresh_token = str(uuid4())
                self.user = type("_User", (), {"id": str(uuid4()), "email": email})

        class _StubAuth:
            def sign_up(self, payload):
                return type("_Resp", (), {
                    "user": type("_User", (), {"id": str(uuid4()), "email": payload["email"]}),
                    "session": _StubSession(payload["email"])
                })
            def sign_in_with_password(self, payload):
                return type("_Resp", (), {
                    "user": type("_User", (), {"id": str(uuid4()), "email": payload["email"]}),
                    "session": _StubSession(payload["email"])
                })
            def get_user(self, token):
                # Treat any token as valid
                return type("_Resp", (), {
                    "user": type("_User", (), {"id": str(uuid4()), "email": "test@example.com"})
                })
            async def sign_out(self):
                return None
        class _StubClient:
            auth = _StubAuth()
        return _StubClient()

    # normal path
    validate_env_vars()
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_ANON_KEY")
    )
    validate_env_vars()
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_ANON_KEY")  # For auth operations only
    )

@lru_cache()
def get_supabase_db() -> Client:
    validate_env_vars()
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # For database operations
    )

# OAuth2 scheme for token validation
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

# Models
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    is_active: bool = True

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class AuthResponse(BaseModel):
    user: User
    session: Dict

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # In offline mode trust token without Supabase
        if os.getenv("SKIP_SERVICE_CHECKS") == "1":
            # simple decode: token is irrelevant
            return User(id=str(uuid4()), email="test@example.com", is_active=True)

        # Verify token with Supabase
        supabase = get_supabase_auth()
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise credentials_exception

        # If DB checks are disabled, trust Supabase and return a basic model
        if db_disabled():
            return User(id=user.user.id, email=user.user.email, is_active=True)

        # Get user from database using SQLAlchemy
        db_user = db.query(DBUser).filter(DBUser.id == user.user.id).first()
        if not db_user:
            raise credentials_exception

        return User.model_validate(db_user)
    except Exception as e:
        raise credentials_exception

@router.post("/signup", response_model=Token)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        supabase = get_supabase_auth()
        
        # Check if user exists
        existing_user = db.query(DBUser).filter(DBUser.email == user.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create user in Supabase Auth
        try:
            auth_response = supabase.auth.sign_up({
                "email": user.email,
                "password": user.password
            })
            
            if not auth_response or not auth_response.user or not auth_response.user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create user in Supabase Auth"
                )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Auth error: {str(e)}"
            )

        # If we are intentionally skipping DB, return tokens immediately
        if db_disabled():
            # Ensure we have a session (if email confirmation disabled)
            if auth_response.session is None:
                auth_response = supabase.auth.sign_in_with_password({
                    "email": user.email,
                    "password": user.password
                })
            return {
                "access_token": auth_response.session.access_token,
                "refresh_token": auth_response.session.refresh_token,
                "token_type": "bearer"
            }

        # Insert user into database
        try:
            db_user = DBUser(
                id=auth_response.user.id,
                email=user.email,
                is_active=True
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        except Exception as e:
            db.rollback()
            # Clean up the auth user since db insert failed
            try:
                supabase_db = get_supabase_db()
                supabase_db.auth.admin.delete_user(auth_response.user.id)
            except Exception as cleanup_error:
                print(f"Failed to clean up auth user: {str(cleanup_error)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database error: {str(e)}"
            )

        # Return session tokens
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer"
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {str(e)}"
        )

@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    try:
        supabase = get_supabase_auth()
        
        # Sign in with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })

        if not auth_response or not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Verify user exists in database (skip if DB disabled)
        if not db_disabled():
            user = db.query(DBUser).filter(DBUser.id == auth_response.user.id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found in database",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # Return session tokens
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer"
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"},
        )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    try:
        supabase = get_supabase_auth()
        await supabase.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Logout failed: {str(e)}"
        )

@router.post("/refresh-token", response_model=Token)
async def refresh_token(refresh_token: str):
    try:
        supabase = get_supabase_auth()
        auth_response = supabase.auth.refresh_session(refresh_token)
        
        return {
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
