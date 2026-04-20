from flask import Flask, request, Blueprint
import uuid
import shutil
import io

from computations.vector_store.pdfProcessor import extract_text, chunk_text
from computations.vector_store.Pinecone import upsert_chunks

source_bp = Blueprint('source_bp', __name__)

@source_bp.route("/<student_id>/<course_code>/upload_source", methods=["POST"])
def upload_source(student_id, course_code):
    file = request.files["file"]

    if not file:
        return {"error": "No file uploaded"}, 400

    file_stream = io.BytesIO(file.read())

    # Extract + chunk
    text = extract_text(file_stream)
    print(text)
    chunks = chunk_text(text)

    # Store in Pinecone
    upsert_chunks(chunks, course_code, student_id, file.filename)

    course = db.table("courses").select("sources").eq("code", course_code).eq("student_id", student_id).execute()
    sources = course.data[0].get("sources", [])
    sources.append(file.filename)
    db.table("courses").update({"sources": sources}).eq("code", course_code).eq("student_id", student_id).execute()

    return {
        "message": "Source uploaded successfully",
        "chunks_stored": len(chunks)
    }

@source_bp.route("/<student_id>/<course_code>/retrieve_source", methods=["GET"])
def retrieve_source(student_id, course_code):
    course = db.table("courses").select("sources").eq("code", course_code).eq("student_id", student_id).execute()
    sources = course.data[0].get("sources", [])

    return {
        "course_code" : course_code
        "sources" : sources
    }
