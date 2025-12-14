import subprocess

subprocess.run(["uv", "build", "pyapi", "--wheel", "-o", "public/pyodide_packages", "--no-create-gitignore"])