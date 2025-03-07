from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient, ASCENDING
from bson import json_util
import json
from config import Config

app = Flask(__name__, static_folder="../Frontend")
CORS(app)

# MongoDB Connection
client = MongoClient(Config.MONGO_URI)
db = client[Config.DATABASE_NAME]
collection = db[Config.COLLECTION_NAME]

# Create indexes on frequently queried fields to improve performance
def create_indexes():
    # Create indexes for fields used in filtering
    collection.create_index([("State", ASCENDING)])
    collection.create_index([("City", ASCENDING)])
    collection.create_index([("Categories", ASCENDING)])
    # Add compound indexes for common query combinations
    collection.create_index([("State", ASCENDING), ("City", ASCENDING)])
    print("Indexes created successfully")

# Serve index.html when accessing "/"
@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

# Serve static files (CSS, JS)
@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

def convert_mongo_document(doc):
    """Convert MongoDB document to a JSON-serializable format."""
    # Convert ObjectId to string
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

@app.route('/api/businesses', methods=['GET'])
def get_businesses():
    try:
        # Pagination parameters
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', Config.DEFAULT_PAGE_SIZE))
        
        # Filter parameters
        state = request.args.get('state')
        city = request.args.get('city')
        category = request.args.get('category')

        # Build filter query
        query = {}
        if state:
            query['State'] = state
        if city:
            query['City'] = city
        if category:
            query['Categories'] = {'$regex': category, '$options': 'i'}

        # Calculate skip and limit for pagination
        skip = (page - 1) * page_size
        
        # Optimize query with projection - limit fields returned
        projection = {
            '_id': 1,
            'Business Name': 1,
            'Origin': 1,
            'State': 1,
            'City': 1,
            'Categories': 1,
            'Phone': 1,
            'Address': 1
        }
        
        # Fetch total count for pagination (use cached count for performance)
        # For large collections, consider cached or estimated counts
        if query:
            total_count = collection.count_documents(query)
        else:
            # Use metadata collection for storing counts that rarely change
            total_count = Config.TOTAL_DOCUMENTS  # Use a constant for non-filtered queries
        
        # Fetch businesses with pagination and projection
        businesses = list(collection.find(query, projection).skip(skip).limit(page_size))
        
        # Convert documents to JSON-serializable format
        businesses = [convert_mongo_document(business) for business in businesses]

        return jsonify({
            'businesses': businesses,
            'total_count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/filters/states', methods=['GET'])
def get_states():
    try:
        # Get unique states - cache this for performance
        states = collection.distinct('State')
        return jsonify(states)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/filters/cities', methods=['GET'])
def get_cities():
    try:
        # Filter cities by state if provided
        state = request.args.get('state')
        
        if state:
            # Get cities for a specific state
            cities = collection.distinct('City', {'State': state})
        else:
            # If no state filter is provided, limit the number of cities returned
            # to avoid sending too much data (especially for initial load)
            pipeline = [
                {"$group": {"_id": "$City", "count": {"$sum": 1}}},
                {"$sort": {"count": -1}},
                {"$limit": 500},  # Limit to top 500 cities by count
                {"$project": {"_id": 1}}
            ]
            result = list(collection.aggregate(pipeline))
            cities = [doc["_id"] for doc in result]
            
        return jsonify(cities)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/filters/categories', methods=['GET'])
def get_categories():
    try:
        # Optimize to return limited categories
        pipeline = [
            {"$unwind": "$Categories"},
            {"$group": {"_id": "$Categories", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 100},  # Only get top 100 categories
            {"$project": {"_id": 1}}
        ]
        result = list(collection.aggregate(pipeline))
        categories = [doc["_id"] for doc in result]
        return jsonify(categories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export', methods=['POST'])
def export_data():
    try:
        # Get export parameters from request
        data = request.json or {}
        export_type = data.get('type', 'all')
        filters = data.get('filters', {})

        # Build query based on filters
        query = {}
        if filters.get('state'):
            query['State'] = filters['state']
        if filters.get('city'):
            query['City'] = filters['city']
        if filters.get('category'):
            query['Categories'] = {'$regex': filters['category'], '$options': 'i'}

        # Optimize query with projection - limit fields returned
        projection = {
            '_id': 1,
            'Business Name': 1,
            'Origin': 1,
            'State': 1,
            'City': 1, 
            'Categories': 1,
            'Phone': 1,
            'Address': 1
        }

        # Fetch data based on export type with limits for safety
        if export_type == 'all':
            # Limit total exports to prevent overwhelming the server/client
            max_export = Config.MAX_EXPORT_LIMIT
            businesses = list(collection.find(query, projection).limit(max_export))
        else:
            # Export with pagination
            page = int(filters.get('page', 1))
            page_size = int(filters.get('page_size', Config.DEFAULT_PAGE_SIZE))
            skip = (page - 1) * page_size
            businesses = list(collection.find(query, projection).skip(skip).limit(page_size))

        # Convert documents to JSON-serializable format
        businesses = [convert_mongo_document(business) for business in businesses]

        return jsonify(businesses)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    create_indexes()  # Create indexes on startup
    print(app.url_map)
    app.run(debug=True, port=3000)