"""
Visual API Module

This module provides debugging and visualization capabilities for Python code execution
in the browser via Pyodide.
"""

from visual.type.watchable import (
    Var,
    Array,
    Array2D,
    Array3D,
    ArrayND,
    Tensor,
    Nodes,
)

from visual.core import watcher 

from visual.core import _visual_api_breakpoint as breakpoint
from visual.core import _visual_api_watch_var as var
from visual.core import _visual_api_watch_array as array
from visual.core import _visual_api_watch_array2d as array2d
from visual.core import _visual_api_watch_nodes as nodes

from visual import core, type
__all__ = [
    "core", "type",
    "breakpoint", "var", "array", "array2d", "nodes"   
]