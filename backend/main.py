from flask import Flask
from dotenv import load_dotenv
import os
from data.db import db

# Initialize the Flask application
app = Flask(__name__)

# Define a route for the home page
@app.route("/")
def hello_world():
    return "<h1>Hello, World!</h1>"

# Optional: Run the app if this file is executed directly
if __name__ == "__main__":
    app.run(debug=True)
