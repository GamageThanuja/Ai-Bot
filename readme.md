# Ai-Bot Setup Instructions

Follow these steps to set up and run the Ai-Bot application from scratch:

## 1. Clone the Repository
If you haven't already, clone the repository:
```sh
git clone <your-repo-url>
cd Ai-Bot
```

## 2. Create and Activate a Virtual Environment
```sh
python3 -m venv venv
source venv/bin/activate
```

## 3. Install Dependencies
Install all required Python packages:
```sh
python -m pip install -r requirements.txt
```

## 4. Update Dependencies (Optional)
If you install new packages, update `requirements.txt`:
```sh
python -m pip freeze > requirements.txt
```

## 5. Run the Application
You can run the FastAPI application using Uvicorn:
```sh
uvicorn app.main:app --reload
```

The application will be available at:
```
http://127.0.0.1:8000
```

## 6. Access the Web Interface
Open your browser and go to:
```
http://127.0.0.1:8000
```

## 7. Troubleshooting
- If you see `ModuleNotFoundError`, install the missing package using:
  ```sh
  python -m pip install <package-name>
  ```
- Make sure your virtual environment is activated before installing packages or running the app.

---

You are now ready to use Ai-Bot!
