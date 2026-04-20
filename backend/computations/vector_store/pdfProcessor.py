from PyPDF2 import PdfReader

def extract_text(file_stream):
    reader = PdfReader(file_stream)
    text = ""

    for page in reader.pages:
        text += page.extract_text() or ""

    return text


def chunk_text(text, chunk_size=100):
    words = text.split()
    return [
        " ".join(words[i:i+chunk_size])
        for i in range(0, len(words), chunk_size)
    ]