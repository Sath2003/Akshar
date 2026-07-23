import json
import os

def test_manifest_structure():
    manifest_path = os.path.join(os.path.dirname(__file__), "..", "manifests", "sample-lessons.json")
    
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)
        
    assert "lessonId" in manifest
    assert "language" in manifest
    assert "segments" in manifest
    
    for segment in manifest["segments"]:
        assert "id" in segment
        assert "text" in segment
        assert "outputFile" in segment
