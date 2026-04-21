import os
import httpx
from supabase import Client, ClientOptions, create_client
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")

# Force HTTP/1.1 to avoid intermittent HTTP/2 protocol-state errors in some networks.
_http_client = httpx.Client(http2=False, timeout=30.0)
_client_options = ClientOptions(httpx_client=_http_client)
db: Client = create_client(url, key, options=_client_options)

print("Supabase client initialized successfully.")
