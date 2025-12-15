import json
from visual.types import snapshot 

with open("schema/Snapshot.json", "w") as f:
    json.dump(snapshot.Snapshot.model_json_schema(), f, indent=2)


