import uuid
import os
import json
from dotenv import load_dotenv

import os

from groq import Groq

load_dotenv()

class PromptChunker:

    def __init__(self, instructions):
        self.instructions = instructions
        self.task= []

    def get_tasks_from_ai(self, instruction, context):
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))

        full_prompt = f"""
        Use the context below to answer the question, then break it into actionable study tasks.

        Context:
        {context}

        Question:
        {instruction}

        Then:
        Break the answer into smaller tasks.

        Rules:
        - Each task must be 1–2 sentences.
        - Assign XP points based on difficulty.
        - Total XP must not exceed 100.
        - XP must be an integer.
        - Output ONLY valid JSON.

        Format:
        [
            {{"task": "Task description", "xp": xp_points}}
        ]
        """

        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": full_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0
        )

        response = chat_completion.choices[0].message.content

        data = json.loads(response)

        for item in data:
            item["id"] = str(uuid.uuid4())
            item["completed"] = False

        return data

    def task_counter(self, task_list):
        count = 0
        for task in task_list:
            count = count + 1
        return count
    
    def xp_calculator(self, task_list):
        total_xp = 0
        for task in task_list:
            total_xp = total_xp + task["xp"]
        return total_xp
    
    def task_remover(self, task_list, task_to_remove):
        updated_task_list = [task for task in task_list if task["task"] != task_to_remove]
        return updated_task_list

    def mark_task_complete(self, task_list, index):
        if 0 <= index < len(task_list):
            task_list[index]["completed"] = True
                
    def show_progress(self, earned_xp, total_xp):
        bar = int((earned_xp / total_xp) * 10) * "█" if total_xp > 0 else ""
        print(f"\nProgress: [{bar:<10}] {earned_xp}/{total_xp} XP")

        
# ================= MAIN =================
if __name__ == "__main__":

    instruction = input("Enter your instruction: ")
    task_instance = PromptChunker(instruction)

    try:
        task_list = task_instance.get_tasks_from_ai(instruction)

        # Add completion field
        for task in task_list:
            task["completed"] = False

        while True:
            print("\n Task List:\n")

            for i, task in enumerate(task_list, start=1):
                status = "✔" if task["completed"] else " "
                print(f"{i}. [{status}] {task['task']} ({task['xp']} XP)")

            total_xp = task_instance.xp_calculator(task_list)
            earned_xp = sum(task["xp"] for task in task_list if task["completed"])

            print("\n Summary:")
            print(f"Total Tasks: {len(task_list)}")
            print(f"Total XP: {total_xp}/100")

            task_instance.show_progress(earned_xp, total_xp)

            user_input = input(
                "\nEnter task number to complete (or 'q' to quit): "
            )

            if user_input.lower() == 'q':
                break

            if user_input.isdigit():
                index = int(user_input) - 1
                task_instance.mark_task_complete(task_list, index)

    except Exception as e:
        print("\n Error generating tasks:")
        print(e)