from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import uuid
from app.processor.transcribe import transcribe
from app.processor.filler import detect_fillers
from app.processor.splicer import splice_audio

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "outputs"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

@app.route("/process", methods=["POST"])
def process():
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    file = request.files["audio"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400
    
    # save uploaded file
    job_id = str(uuid.uuid4())[:8]
    input_path = f"{UPLOAD_FOLDER}/{job_id}_{file.filename}"
    output_path = f"{OUTPUT_FOLDER}/{job_id}_clean.mp3"
    file.save(input_path)
    
    # pipeline
    print(f"Processing job {job_id}...")
    words = transcribe(input_path)
    fillers = detect_fillers(words)
    splice_audio(input_path, fillers, output_path)
    
    return jsonify({
        "job_id": job_id,
        "fillers_removed": len(fillers),
        "fillers": [{"word": f["word"], "start": f["start"], "end": f["end"]} for f in fillers],
        "download_url": f"/download/{job_id}"
    })

@app.route("/download/<job_id>", methods=["GET"])
def download(job_id):
    output_path = f"{OUTPUT_FOLDER}/{job_id}_clean.mp3"
    if not os.path.exists(output_path):
        return jsonify({"error": "File not found"}), 404
    return send_file(output_path, as_attachment=True, download_name="clean.mp3")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(debug=True, port=5001)