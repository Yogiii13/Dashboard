from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
from bson import json_util
import json
from config import Config
from flask_caching import Cache

app = Flask(__name__)
CORS(app)

# Configure cache
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

app = Flask(__name__, static_folder="../Frontend")

# MongoDB Connection
client = MongoClient(Config.MONGO_URI)
db = client[Config.DATABASE_NAME]
collection = db[Config.COLLECTION_NAME]

# Ensure indexes are created
collection.create_index([("State", 1)])
collection.create_index([("City", 1)])
collection.create_index([("Categories", 1)])

@app.route('/')
def serve_frontend():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

def convert_mongo_document(doc):
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

@app.route('/api/businesses', methods=['GET'])
@cache.cached(timeout=60)  # Cache for 60 seconds
def get_businesses():
    try:
        page = int(request.args.get('page', 1))
        page_size = int(request.args.get('page_size', Config.DEFAULT_PAGE_SIZE))
        state = request.args.get('state')
        city = request.args.get('city')
        category = request.args.get('category')

        query = {}
        if state:
            query['State'] = state
        if city:
            query['City'] = city
        if category:
            query['Categories'] = {'$regex': category, '$options': 'i'}

        skip = (page - 1) * page_size
        total_count = collection.count_documents(query)
        businesses = list(collection.find(query).skip(skip).limit(page_size))
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
@cache.cached(timeout=3600)  # Cache for 1 hour
def get_states():
    try:
        states = collection.distinct('State')
        return jsonify(states)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/filters/cities', methods=['GET'])
@cache.cached(timeout=3600)  # Cache for 1 hour
def get_cities():
    try:
        state = request.args.get('state')
        query = {'State': state} if state else {}
        cities = collection.distinct('City', query)
        return jsonify(cities)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/filters/categories', methods=['GET'])
@cache.cached(timeout=3600)  # Cache for 1 hour
def get_categories():
    try:
        categories = collection.distinct('Categories')
        return jsonify(categories)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export', methods=['POST'])
def export_data():
    try:
        data = request.json or {}
        export_type = data.get('type', 'all')
        filters = data.get('filters', {})

        query = {}
        if filters.get('state'):
            query['State'] = filters['state']
        if filters.get('city'):
            query['City'] = filters['city']
        if filters.get('category'):
            query['Categories'] = {'$regex': filters['category'], '$options': 'i'}

        if export_type == 'all':
            businesses = list(collection.find(query))
        else:
            page = filters.get('page', 1)
            page_size = filters.get('page_size', Config.DEFAULT_PAGE_SIZE)
            skip = (page - 1) * page_size
            businesses = list(collection.find(query).skip(skip).limit(page_size))

        businesses = [convert_mongo_document(business) for business in businesses]
        return jsonify(businesses)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=3000)