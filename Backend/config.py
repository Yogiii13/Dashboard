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
    DEFAULT_PAGE_SIZE = 25