from pinecone import Pinecone
from dotenv import load_dotenv

import more_itertools
import os
load_dotenv()

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
INDEX_NAME = os.getenv("PINECONE_INDEX_NAME")
index = pc.Index(INDEX_NAME)


def upsert_chunks(chunks, class_id, user_id, file_name):
    batches = [list(batch) for batch in more_itertools.chunked(chunks,90)]

    for i, batch in enumerate(batches):
        records = []
        print(len(batch))
        for j, chunk in enumerate(batch):
            records.append({
                "_id": f"{file_name}_{i}_{j}",
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