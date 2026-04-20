from pinecone import Pinecone
from dotenv import load_dotenv

import os
load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
index = pc.Index(INDEX_NAME)


def upsert_chunks(chunks, class_id, user_id, file_name):
    records = []

    for i, chunk in enumerate(chunks):
        records.append({
            "_id": f"{file_name}_{i}",
            "text": chunk,
            "class_id": class_id,
            "user_id": user_id
        })

    index.upsert_records(f"{user_id}--{class_id}", records)  # namespace = class_id


def query_chunks(query, user_id, class_id):
    results = index.search(
        namespace=f"{user_id}--{class_id}",
        query={
            "inputs": {"text": query},
            "top_k": 2
        }
    )

    return results["result"]["hits"]