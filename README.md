# Business Dashboard

## Prerequisites
- Python 3.8+
- MongoDB
- pip

## Setup Instructions

1. Clone the repository
```bash
git clone https://github.com/yourusername/Business-dashboard.git
cd Business-dashboard
```

2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
```

3. Install dependencies
```bash
pip install -r backend/requirements.txt
```

4. Configure MongoDB
- Ensure MongoDB is running
- Update `.env` file with your MongoDB connection string if different from default

5. Run the Flask application
```bash
cd backend
python app.py
```

## Frontend Configuration
- Update `index.html` to point to the correct backend URL
- Adjust `fetch` calls to match your backend endpoints