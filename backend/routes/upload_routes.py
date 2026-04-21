import io
from flask import Blueprint, request
from data.db import db

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
    chunks = chunk_text(text)

    # Store in Pinecone
    upsert_chunks(chunks, course_code, student_id, file.filename)

    course = db.table("courses").select("id").eq("code", course_code).eq("student_id", student_id).execute()
    if not course.data:
        return {"error": "Course not found"}, 404

    db.table("course_materials").insert({
        "student_id": student_id,
        "course_id": course.data[0].get("id"),
        "filename": file.filename,
    }).execute()

    return {
        "message": "Source uploaded successfully",
        "chunks_stored": len(chunks)
    }

@source_bp.route("/<student_id>/<course_code>/retrieve_source", methods=["GET"])
def retrieve_source(student_id, course_code):
    course = db.table("courses").select("id").eq("code", course_code).eq("student_id", student_id).execute()
    if not course.data:
        return {"error": "Course not found"}, 404

    material_rows = (
        db.table("course_materials")
        .select("filename, uploaded_at")
        .eq("student_id", student_id)
        .eq("course_id", course.data[0].get("id"))
        .execute()
    )
    sources = [row.get("filename") for row in (material_rows.data or []) if row.get("filename")]

    return {
        "course_code" : course_code,
        "sources" : sources
    }
