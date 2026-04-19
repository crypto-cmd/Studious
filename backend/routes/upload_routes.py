from flask import Flask, request, Blueprint
import uuid
import shutil

from vecor_store.pdfProcessor import extract_text, chunk_text
from vecor_store.Pinecone import upsert_chunks

source_bp = Blueprint('source_bp', __name__)

@source_bp.route("/<student_id>/<course_code>/upload_source", methods=["POST"])
def upload_source(student_id, course_code):

    file = request.files.get("file")

    if not file:
        return {"error": "No file uploaded"}, 400

    file_path = f"temp_{uuid.uuid4()}.pdf"
    file.save(file_path)

    # Extract + chunk
    text = extract_text(file_path)
    chunks = chunk_text(text)

    # Store in Pinecone
    upsert_chunks(chunks, course_code, student_id, file.filename)

    return {
        "message": "Source uploaded successfully",
        "chunks_stored": len(chunks)
    }
