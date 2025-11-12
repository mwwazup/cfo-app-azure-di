"""
Logging configuration for the application.
"""
import logging
import sys
import os
from logging.handlers import RotatingFileHandler


def setup_logging():
    """Configure application logging based on environment."""
    env = os.getenv("ENV", "development")
    log_level = logging.DEBUG if env == "development" else logging.INFO
    
    # Create logger
    logger = logging.getLogger()
    logger.setLevel(log_level)
    
    # Remove existing handlers
    logger.handlers = []
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    # File handler for production
    if env == "production":
        log_dir = os.getenv("LOG_DIR", "logs")
        os.makedirs(log_dir, exist_ok=True)
        
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, "app.log"),
            maxBytes=10485760,  # 10MB
            backupCount=5
        )
        file_formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(file_formatter)
        logger.addHandler(file_handler)
    
    return logger


def get_logger(name: str):
    """Get a logger instance for a specific module."""
    return logging.getLogger(name)
