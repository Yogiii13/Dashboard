import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    # MongoDB Configuration
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
    DATABASE_NAME = 'Stellanova'
    COLLECTION_NAME = 'Cleaned_Business'

    # Pagination settings
    DEFAULT_PAGE_SIZE = 50
    
    # Cache settings
    ENABLE_CACHE = True
    CACHE_TIMEOUT = 3600  # 1 hour in seconds
    
    # Fixed total document count (update periodically for accuracy)
    # This avoids repeated count_documents() calls which are expensive
    TOTAL_DOCUMENTS = 11798652
    
    # Export limits for safety
    MAX_EXPORT_LIMIT = 10000  # Maximum records to export