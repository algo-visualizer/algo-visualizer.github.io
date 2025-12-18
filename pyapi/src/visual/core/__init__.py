"""
Visual Core Module

Core functionality for code instrumentation and variable snapshotting.
This module is designed to work with Pyodide in the browser environment.
**It should only be used by algo-visualizer developers instead of end users.**
"""

from inspect import currentframe
import json
from copy import deepcopy
from visual.core import watcher
from visual.core.io import snapshot_io, redirect_stdout
from visual.core.watcher import WatcherContext, PointableWatcherContext, Pointable2DWatcherContext
from typing import Callable, cast
from visual.types.snapshot import Snapshot
from visual.types.graph import GraphGroup, NodeId, NodeWeight
from visual.types.watchable import Var
from visual.types.pointable import Pointable, Pointable2D, DS, Array, Array2D, Nodes 

# Global state for snapshots and configuration
_snapshots: list[Snapshot] = []
_linemap: dict[str, int] = {}

def _visual_api_breakpoint(condition_expr: str | None = None) -> Snapshot | None:
    """
    Breakpoint function that captures variables snapshot at the current execution frame.
    
    This function is called at instrumented breakpoints in the user's code. It creates and returns a Snapshot object
    containing the current line number and the graphs of all watchable variables at the top of the global watcher registry stack. Also, it appends the snapshot to the global snapshots container as a side effect.

    Args:
        condition_expr (str | None): 
            An optional boolean expression to evaluate as a condition for capturing the snapshot.
            If provided, the snapshot will only be captured if the expression evaluates to True.
            The expression is evaluated in the context of the current execution frame.

    Returns:
        Snapshot | None: The captured snapshot at the breakpoint. Returns None if the condition_expr is provided and evaluates to False
    """
    
    frame = currentframe()
    try:
        if not frame or not frame.f_back:
            raise RuntimeError("No valid frame selected")
        frame = frame.f_back

        if condition_expr:
            try:
                condition_result = eval(condition_expr, frame.f_globals, frame.f_locals)
            except Exception:
                condition_result = False
            if not isinstance(condition_result, bool):
                    raise TypeError(f"{condition_expr} is evaluated to {condition_result} which is not a boolean")
            if not condition_result:
                return
            
        # Get current line number in the executed code
        lineno = frame.f_lineno
        
        # Map back to original source line using the injected map
        real_line = _linemap.get(str(lineno), lineno)

        graphs: GraphGroup = {}
        
        for varname, watchables in watcher.get_registry().items():
            graph = watchables[-1].generate_graph(frame)
            graphs[varname] = graph
    finally:
        del frame # Prevent creating cycle reference

    snapshot = Snapshot(
        line=real_line,
        graph_group=graphs,
        event="line",
        stdout=snapshot_io.read_and_clear(),
    )

    _snapshots.append(snapshot)

    return snapshot
    

def _visual_api_watch_var(var: str, *vars: str, expr: bool = False) -> WatcherContext[Var]:
    """
    Registers variable names to be watched in the snapshot.
    
    Args:
        var (str): Variable Name to watch.
        *vars (str): Additional variable names to watch.
        expr (bool): Whether the `var` and `*vars` are actually expressions.

    **Provide variable names or expressions but not both.** `expr=False` looks up `vars` arguments by name at locals/globals of the execution frame which has better performance. `expr=True` treats `vars` arguments as expressions and directly evaluate them by using `eval()` during capture.

    **Use `expr=False` in most cases.** Use `expr=True` when you must watch a composite expression or computation that is not stored in a simple variable.
        
    Examples:
        ```python
        var('x', 'i', 'global_var')
        var('i+j', 'x+y', expr=True)

        # Wrong usage
        var()
        var('i+j', 'x+y') # Didn't specify that they are expressions
        ```
    Returns:
        WatcherContext[Var]: The context manager containing the registered watchables.
    """
    l: list[Var] = []
    for varname in (var, *vars):
        v = Var(varname, expr=expr)
        l.append(v)
        watcher.watch(v)
    return WatcherContext(l)

def _visual_api_inherit(ds_var: str) -> PointableWatcherContext[Pointable] | Pointable2DWatcherContext[Pointable2D]:
    """
    Inherit (deepcopy) the watchable at the top of the registry stack. The watchable must be a DS.

    **It is recommended to be used when you have instantiated a complex `DSWatcherContext` and you don't want to repeat the same instantiation operations.**

    Args:
        ds_var (str): The variable name of the watchable to inherit.

    Examples:
        ```python
        array('arr').index('i', 'j') 

        with inherit('arr').index('k'): # Register a new watchable inherited from the latest 'arr' watchable
            ...
            breakpoint() # It will show 'arr' with the index 'i', 'j', 'k'
        breakpoint() # It will show 'arr' with the index 'i', 'j'
        ```
    Returns:
        PointableWatcherContext | Pointable2DWatcherContext: The context manager containing the inherited watchable.
    """
    registry = watcher.get_registry()
    if not registry.get(ds_var):
        raise ValueError(f"Can't inherit variable {ds_var} that has no watchable existing")
    w = registry[ds_var][-1]
    if not isinstance(w, DS):
        raise ValueError(f"Can't inherit watchable {ds_var} that is not a DS ")
    if isinstance(w, Pointable):
        new_w = deepcopy(w)
        watcher.watch(new_w)
        return PointableWatcherContext([new_w])
    elif isinstance(w, Pointable2D):
        new_w = deepcopy(w)
        watcher.watch(new_w)
        return Pointable2DWatcherContext([new_w])
    else:
        raise ValueError(f"There are no matching context constructor for watchable {ds_var}")


def _visual_api_watch_array(var: str, *vars: str, expr: bool = False) -> PointableWatcherContext[Array]:
    """
    Registers an iterable variable to be watched in the snapshot.
    
    Args:
        var (str): Variable Name of iterable to watch.
        *vars (str): Additional variable names of iterables to watch.
        expr (bool): Whether the `var` and `*vars` are actually expressions.

    **Provide variable names or expressions but not both.** `expr=False` looks up `vars` arguments by name at locals/globals of the execution frame which has better performance. `expr=True` treats `vars` arguments as expressions and directly evaluate them by using `eval()` during capture.

    **Use `expr=False` in most cases.** Use `expr=True` when you must watch a composite expression or computation that is not stored in a simple variable.

    Examples:
        ```python
        array('my_list', 'my_deque')
        array('arr[:1]', 'arr.sort()', expr=True)
        array('my_list').index('i', 'j').item('target').index('i+1', 'i+2', expr=True)
        array('list1', 'list2').index('i', 'j').item('target').index('i+1', 'i+2', expr=True) # Multiple arrays with multiple indexes and items binding

        # Wrong usage
        array()
        array('arr[:1]', 'arr.sort()') # Didn't specify that they are expressions
        ```

    Returns:
        PointableWatcherContext[Array]: The context manager containing the watched variables.
    """
    l: list[Array] = []
    for varname in (var, *vars):
        v = Array(varname, expr=expr)
        l.append(v)
        watcher.watch(v)
    return PointableWatcherContext(l)

def _visual_api_watch_array2d(var: str, *vars: str, expr: bool = False) -> Pointable2DWatcherContext[Array2D]:
    """
    Registers an 2-dimensional iterable variable to be watched in the snapshot.
    
    Args:
        var (str): Variable Name of 2-dimensional iterable to watch.
        *vars (str): Additional variable names of 2-dimensional iterables to watch.
        expr (bool): Whether the `var` and `*vars` are actually expressions.

    **Provide variable names or expressions but not both.** `expr=False` looks up `vars` arguments by name at locals/globals of the execution frame which has better performance. `expr=True` treats `vars` arguments as expressions and directly evaluate them by using `eval()` during capture.

    **Use `expr=False` in most cases.** Use `expr=True` when you must watch a composite expression or computation that is not stored in a simple variable.

    Returns:
        Pointable2DWatcherContext[Array2D]: The context manager containing the watched variables.
    """
    l: list[Array2D] = []
    for varname in (var, *vars):
        v = Array2D(varname, expr=expr)
        l.append(v)
        watcher.watch(v)
    return Pointable2DWatcherContext(l)

def _HEAD_ID_FUNC_DEFAULT(nodes: list[int]):
    return 0

def _NEXT_IDS_FUNC_DEFAULT(nodes: list[int], id: int):
    return (nodes[id], 1)

def _VALUE_FUNC_DEFAULT(nodes: list[int], id: int):
    return id

def _visual_api_watch_nodes[_NodesType, _NodeType, _IdType: NodeId, _WeightType: NodeWeight](
        var: str,
        head_id: Callable[[_NodesType], _IdType] = _HEAD_ID_FUNC_DEFAULT, 
        next_ids: Callable[[_NodesType, _IdType], _IdType | tuple[_IdType, _WeightType] | list[_IdType] | list[tuple[_IdType, _WeightType]]] = _NEXT_IDS_FUNC_DEFAULT,
        value: Callable[[_NodesType, _IdType], _NodeType] = _VALUE_FUNC_DEFAULT,
        *,
        expr: bool = False,
    ) -> PointableWatcherContext[Nodes[_NodesType, _NodeType, _IdType, _WeightType]]:
    """
    Registers a nodes variable to be watched in the snapshot.

    Args:
        var (str): Variable name of the nodes structure to watch.
        head_id (Callable): 
            Function to get the head id from the nodes. Id must be an integer or string. You can use `repr` and `eval` to convert complex ids to string and back.
            Example:
            ```python
            def head_id(nodes):
                return nodes.head_id
            ```
        next_ids (Callable): 
            Function to get the next ids and weights from a given id. Weight is defaulted to 1 if not provided. Id must be an integer or string (None means no next ids). You can use `repr` and `eval` to convert complex ids to string and back.
            Example:
            ```python
            def next_ids(nodes, id):
                next_nodes = nodes[id].nexts
                return [(next_node.id, next_node.weight) for next_node in next_nodes]
            ```
        value (Callable): 
            Function to get the node value (the actual object) from a given id.
            Example:
            ```python
            def value(nodes, id):
                return nodes[id].value
            ```
        expr (bool): 
            Whether the `var` is an expression.

    **Provide variable name or expression.** `expr=False` looks up `var` by name at locals/globals of the execution frame which has better performance. `expr=True` treats `var` as an expression and directly evaluate it by using `eval()` during capture.

    **Use `expr=False` in most cases.** Use `expr=True` when you must watch a composite expression or computation that is not stored in a simple variable.

    Examples:
        ```python
        nodes('linked_list') 
        nodes('graph_nodes', get_head_id, get_next_ids, get_value) # Custom node definitions
        nodes('linked_lists[0]', expr=True)
        nodes('linked_list').index('i', 'j').item('node').index('i+1', 'j+1', expr=True)

        # Wrong usage
        nodes('linked_list[0]') # Didn't specify that it's an expression

        ```
    Returns:
        PointableWatcherContext: The context manager containing the registered Nodes watchable.
    """
    v = Nodes[_NodesType, _NodeType, _IdType, _WeightType](
        var, head_id, next_ids, value, expr=expr,
    )
    watcher.watch(v)
    return PointableWatcherContext([v])


def _visual_api_reset_state():
    """
    Reset the module state for a new execution. It designs for use in Pyodide.
    
    This should be called before each new code execution in Pyodide to:
    1. Clear all snapshots and watchable registry.
    2. Clear all non-builtin global variables at the execution frame (caller frame of this function).
    3. Redirect sys.stdout to internal buffers.
    """
    frame = currentframe()
    try:
        if not frame or not frame.f_back:
            raise RuntimeError("Failed to get execution frame")
        global _snapshots
        _snapshots = []
        watcher.clear()
        global_vars = frame.f_back.f_globals
        
        # Reset buffers
        snapshot_io.read_and_clear()
        
        # Redirect stdout
        redirect_stdout()

    finally:
        del frame # Prevent creating cycle reference
    keys_to_delete_strict = [
        key for key in global_vars
        if not key.startswith('__')
        and key != 'micropip'
    ]
    for key in keys_to_delete_strict:
        del global_vars[key]

    return keys_to_delete_strict

def _visual_api_get_snapshots_json():
    """
    Get the current list of snapshots JSON string.
    
    Returns:
        str: List of snapshot dictionaries (JSON string)
    """
    return json.dumps([snapshot.model_dump(mode='json') for snapshot in _snapshots], ensure_ascii=False)

def _visual_api_set_linemap(linemap: dict | str):
    """
    Set the line number mapping for source code.
    
    Args:
        linemap (dict | str): Mapping from instrumented line numbers to original line numbers. If a string is provided, it is parsed as JSON.
    """
    global _linemap
    _linemap = linemap if isinstance(linemap, dict) else json.loads(linemap)

__all__ = [
    '_visual_api_breakpoint',
    '_visual_api_watch_var',
    '_visual_api_inherit',
    '_visual_api_watch_array',
    '_visual_api_watch_array2d',
    '_visual_api_watch_nodes',
    '_visual_api_reset_state',
    '_visual_api_get_snapshots_json',
    '_visual_api_set_linemap',
    'watcher',
]