# Business Dashboard

## Overview
This project is a **one-pager dashboard** designed to manage and analyze business data efficiently. The dataset contains **11,798,652** entries stored in a **locally created MongoDB** database.

### 📌 Features:
- **Data Schema**:
  - `_id`, `Business Name`, `Origin URL`, `Address`, `State`, `City`, `Phone`, `Categories`
- **Filter-Based Search**:
  - Users can filter data based on **State, City, and Category**
- **Export Options**:
  - Data can be exported in **CSV, JSON, and XLSX** formats

## Prerequisites
- Python 3.8+
- MongoDB
- pip

## Setup Instructions

1. Clone the repository
```bash
git clone https://github.com/Yogiii13/Dashboard.git
cd Dashboard
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

## Usage
1. **Filter** business data using **State, City, or Category**
2. **Export** results in CSV, JSON, or XLSX format

