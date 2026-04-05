from flask import Flask, request
from dotenv import load_dotenv
import os
from data.db import db

# Initialize the Flask application
app = Flask(__name__)

# Define a route for the home page
@app.route("/computations/prompt_chunker", methods=["GET"])
def prompt_chunker():
    instructions = request.get_json().get('instructions')
    from computations.PromptChunker import PromptChunker

    if not instructions:
        return {"error": "Instructions parameter is required"}, 400

    chunker = PromptChunker(instructions)
    tasks = chunker.get_tasks_from_ai(instructions)
    task_count = chunker.task_counter(tasks)
    total_xp = chunker.xp_calculator(tasks)

    return {
        "tasks": tasks,
        "task_count": task_count,
        "total_xp": total_xp
    }
    

# Optional: Run the app if this file is executed directly
if __name__ == "__main__":
    app.run(debug=True)
