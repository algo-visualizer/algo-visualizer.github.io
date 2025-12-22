import subprocess

subprocess.run(["uv", "build", "pyapi", "--wheel", "-o", "public/pyodide_packages", "--no-create-gitignore"])
subprocess.run(["uv", "build", "pylsp", "--wheel", "-o", "public/pyodide_packages", "--no-create-gitignore"])