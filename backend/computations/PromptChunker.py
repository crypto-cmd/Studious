import os
import json
from dotenv import load_dotenv
from google import genai

import os

from groq import Groq

load_dotenv()

class PromptChunker:

    def __init__(self, instructions):
        self.instructions = instructions
        self.task= []

    def get_tasks_from_ai(self, instruction):
            client = Groq(api_key=os.getenv("GROQ_API_KEY"))
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": instruction + """
                Break down the task above into smaller tasks.

                Rules:
                - Each task must be 1–2 sentences.
                - Assign XP points based on difficulty.
                - Total XP must not exceed 100.
                - XP must be an integer (not a string).
                - Output ONLY valid JSON.

                Format:
                [
                {"task": "Task description", "xp": xp_points}
                ]
                """,
                    }
                ],
                model="llama-3.3-70b-versatile",
            )
            response = chat_completion.choices[0].message.content

            json_string = json.dumps(response)
            data = json.loads(json_string)
            return data
        #how to parse json objects using regular expressions in python

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


        
if __name__ == "__main__":

    instruction = "Write a report on the current effects of slavery in Jamaica, making reference to Chapters 3-5."

    task_instance = PromptChunker(instruction)

    ai_output = task_instance.get_tasks_from_ai(instruction)
    task_list = json.loads(ai_output)
    task_amount = task_instance.task_counter(task_list)
    xp_total = task_instance.xp_calculator(task_list)

    print(task_list)
    print(task_amount)
    print(xp_total)
