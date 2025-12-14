import subprocess

subprocess.run(["pdoc", "pyapi/src/visual", "-d", "google", "-o", "public/docs"])
