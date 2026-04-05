import os
from supabase import create_client, Client
from dotenv import load_dotenv
# Load environment variables from the .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

db: Client = create_client(url, key)

print("Supabase client initialized successfully.")
