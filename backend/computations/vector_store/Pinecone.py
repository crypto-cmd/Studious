from pinecone import Pinecone
from dotenv import load_dotenv

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
INDEX_NAME = s.getenv("PINECONE_INDEX_NAME")
index = pc.Index(INDEX_NAME)


def upsert_chunks(chunks, class_id, user_id, file_name):
    records = []

    for i, chunk in enumerate(chunks):
        records.append({
            "_id": f"{file_name}_{i}",
            "chunk_text": chunk,
            "class_id": class_id,
            "user_id": user_id
        })

    index.upsert_records(class_id, records)  # namespace = class_id


def query_chunks(query, class_id):
    results = index.search(
        namespace=class_id,
        query={
            "inputs": {"text": query},
            "top_k": 5
        }
    )

    return results["matches"]