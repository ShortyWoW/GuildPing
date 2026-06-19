import logging
import sys

# Format string representing time, log level, module name, line number, and log message
LOG_FORMAT = "%(asctime)s - %(levelname)s - [%(name)s:%(lineno)d] - %(message)s"

def setup_logging():
    """
    Sets up the structured logging system for the backend application.
    Configures handlers to output log messages to the console for Docker debugging.
    """
    root_logger = logging.getLogger()
    
    # Avoid duplicate logs if logging was initialized elsewhere
    if root_logger.handlers:
        return
        
    root_logger.setLevel(logging.INFO)
    
    # Console output handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    
    formatter = logging.Formatter(LOG_FORMAT)
    console_handler.setFormatter(formatter)
    
    root_logger.addHandler(console_handler)
    
    # Silence verbose library loggers for clean backend console logs
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    logging.info("GuildPing structured logging system initialized.")

# Standard logging instance to be imported inside services, APIs, and models
logger = logging.getLogger("guildping")
logger.setLevel(logging.INFO)
