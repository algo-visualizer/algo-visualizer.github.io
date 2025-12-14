import sys
import io

class _SnapshotIO(io.StringIO):
    def __init__(self):
        super().__init__()

    def read_and_clear(self) -> str:
        content = self.getvalue()
        self.truncate(0)
        self.seek(0)
        return content

original_stdout = sys.stdout
snapshot_io = _SnapshotIO()

class _DualStream:
    def __init__(self):
        self.stdout = original_stdout
        self.snapshot_io = snapshot_io

    def write(self, text):
        self.stdout.write(text)
        self.snapshot_io.write(text)

    def flush(self):
        self.stdout.flush()

    def isatty(self):
        return self.stdout.isatty()

def redirect_stdout():
    sys.stdout = _DualStream()