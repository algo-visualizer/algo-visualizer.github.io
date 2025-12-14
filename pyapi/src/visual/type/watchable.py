from inspect import currentframe
from abc import ABC, abstractmethod
from collections import deque
from types import FrameType
from typing import Callable, Iterable, cast, override
from visual.type.graph import (
    GraphUnion, VarGraph,
    Pointer, Pointer2D,
    ArrayGraph, ArrayGraphContent, 
    Array2DGraph, Array2DGraphContent,
    NodesGraph, NodesGraphContent, 
    NodesGraphContentItem, NodeId, NodeWeight, 
)

class _NotCaptured:
    pass

def _get_caller_frame(frame: FrameType | None):
    if not frame or not frame.f_back:
        raise RuntimeError("No valid frame selected")
    return frame.f_back

class Watchable(ABC):

    def __init__(self, var: str, *, expr: bool = False):
        """
        **Provide variable names or expressions but not both.** `expr=False` looks up `vars` arguments by name at locals/globals of the execution frame which has better performance. `expr=True` treats `vars` arguments as expressions and directly evaluate them by using `eval()` during capture.

        **Use `expr=False` in most cases.** Use `expr=True` when you must watch a composite expression or computation that is not stored in a simple variable.

        Examples:
            ```python
            Watchable('i')
            Watchable('i + j', expr=True) # The varname will be 'i + j' in this case
            Watchable('i, j', expr=True) # Notice that it's not Watchable('i, j')

            # Wrong usage
            Watchable()
            ```
        """

        if not isinstance(var, str):
            raise TypeError("`var` must be a string")
        
        if not isinstance(expr, bool):
            raise TypeError("`expr` must be a boolean")

        if not expr:
            self.varname = var
            self._expr = None
        else:
            self.varname = var
            self._expr = var

    def __eq__(self, other):
        return type(self) == type(other) and self.varname == other.varname
    
    def __hash__(self):
        return hash((type(self), self.varname))

    def capture(self, frame: FrameType | None = None):
        """
        Capture the current state of the watchable variable from the given frame
        Args:
            frame (FrameType | None): The execution frame. If None, it uses the parent frame (the frame which called this function).
        Returns:
            Any: The captured value of the watchable variable, or _NotCaptured if not found.
        """

        if frame is None:
            frame = _get_caller_frame(currentframe())

        local_vars = frame.f_locals
        global_vars = frame.f_globals

        if self._expr:
            try:
                value = eval(self._expr, global_vars, local_vars)
            except Exception:
                return _NotCaptured()
            return value
        
        # Capture Watched Variable (Look in Locals then Globals)
        # This matches names strictly, no expression evaluation.
        found = False
        value = None
        
        if self.varname in local_vars:
            value = local_vars[self.varname]
            found = True
        elif self.varname in global_vars:
            value = global_vars[self.varname]
            found = True

        if not found:
            return _NotCaptured()

        return value


    @abstractmethod
    def generate_graph(self, frame: FrameType | None = None) -> GraphUnion:
        """
        Generate a graph representation of the watchable variable.
        Args:
            frame (FrameType | None): The execution frame. If None, it uses the parent frame (the frame which called this function).
        Returns:
            Graph: The generated graph representation
        """
        pass

class Var(Watchable): 
    
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)

    @override
    def generate_graph(self, frame = None) -> VarGraph:
        if frame is None:
            frame = _get_caller_frame(currentframe())
        curr_value = self.capture(frame)

        frameid, parent_frameid = str(id(frame)), None
        if (parent_frame := frame.f_back) is not None:
            parent_frameid = str(id(parent_frame))
        return VarGraph(
            frameid=frameid,
            parent_frameid=parent_frameid,
            notcaptured=True if isinstance(curr_value, _NotCaptured) else False,
            content=repr(curr_value),
        )

class DS(Watchable, ABC):
    def __init__(
        self, 
        var: str, 
        *,
        expr: bool = False,
    ):
        super().__init__(var, expr=expr)
        self._index_registry: dict[str, Var] = {}
        self._item_registry: dict[str, Var] = {}

    def get_index_dict(self):
        return self._index_registry
    
    def get_item_dict(self):
        return self._item_registry

    def add_index(self, var: str, expr: bool = False):
        self._index_registry[var] = Var(var, expr=expr)
    
    def add_item(self, var: str, expr: bool = False):
        self._item_registry[var] = Var(var, expr=expr)

    def remove_index(self, var: str):
        """
        **Not recommended to use.** Information increment is better than decrement. If you really want to constrain the effective index/item effective scope, use `with` statement.
        """
        del self._index_registry[var]
    
    def remove_item(self, var: str):
        """
        **Not recommended to use.** Information increment is better than decrement. If you really want to constrain the effective index/item effective scope, use `with` statement.
        """
        del self._item_registry[var]

class Array(DS):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)

    @override
    def generate_graph(self, frame = None) -> ArrayGraph:
        if frame is None:
            frame = _get_caller_frame(currentframe())
        curr_value = self.capture(frame)
        frameid, parent_frameid = str(id(frame)), None
        if parent_frame := frame.f_back is not None:
            parent_frameid = str(id(parent_frame))
        if isinstance(curr_value, _NotCaptured):
            return ArrayGraph(
                frameid=frameid,
                parent_frameid=parent_frameid,
                notcaptured=True,
                content=repr(curr_value),
            )
        content = ArrayGraphContent()
        for var in self._index_registry.values():
            index = var.capture(frame)
            pointer = None
            if isinstance(index, _NotCaptured):
                pointer = Pointer(name=var.varname, index=repr(index), notcaptured=True)
            else:
                pointer = Pointer(name=var.varname, index=cast(int | str, index), notcaptured=False)
            content.pointers.append(pointer)
        itemvars_value = {var.varname: var.capture(frame) for var in self._item_registry.values()}
        curr_value = cast(Iterable, curr_value)
        for i, item in enumerate(curr_value):
            for itemvarname, itemvar in itemvars_value.items():
                if item is not itemvar:
                    continue
                content.pointers.append(Pointer(name=itemvarname, index=i, notcaptured=False))
            content.value.append(repr(item))
                  
        return ArrayGraph(
            frameid=frameid,
            parent_frameid=parent_frameid,
            notcaptured=False,
            content=content,
        )

class Array2D(DS):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    @override
    def generate_graph(self, frame = None) -> Array2DGraph:
        if frame is None:
            frame = _get_caller_frame(currentframe())
        curr_value = self.capture(frame)
        frameid, parent_frameid = str(id(frame)), None
        if parent_frame := frame.f_back is not None:
            parent_frameid = str(id(parent_frame))
        if isinstance(curr_value, _NotCaptured):
            return Array2DGraph(
                frameid=frameid,
                parent_frameid=parent_frameid,
                notcaptured=True,
                content=repr(curr_value),
            )
        content = Array2DGraphContent()
        for var in self._index_registry.values():
            index = var.capture(frame)
            pointer = None
            if isinstance(index, _NotCaptured):
                pointer = Pointer2D(name=var.varname, index=repr(index), notcaptured=True)
            else:
                pointer = Pointer2D(name=var.varname, index=cast(tuple[int, int] | str, index), notcaptured=False)
            content.pointers.append(pointer)
        itemvars_value = {var.varname: var.capture(frame) for var in self._item_registry.values()}
        curr_value = cast(Iterable[Iterable], curr_value)
        for i, row in enumerate(curr_value):
            l: list[str] = []
            for j, item in enumerate(row):
                for itemvarname, itemvar in itemvars_value.items():
                    if item is not itemvar:
                        continue
                    content.pointers.append(Pointer2D(name=itemvarname, index=(i, j), notcaptured=False))
                l.append(repr(item))
            content.value.append(l)
                  
        return Array2DGraph(
            frameid=frameid,
            parent_frameid=parent_frameid,
            notcaptured=False,
            content=content,
        )
    
class Array3D(DS):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    ...

class ArrayND(DS):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    ...

Tensor = ArrayND
    
class Nodes[_NodesType, _NodeType, _IdType: NodeId, _WeightType: NodeWeight](DS):
    def __init__(
        self, 
        var: str,
        head_id: Callable[[_NodesType], _IdType], 
        next_ids: Callable[[_NodesType, _IdType], _IdType | tuple[_IdType, _WeightType] | list[_IdType] | list[tuple[_IdType, _WeightType]]],
        value: Callable[[_NodesType, _IdType], _NodeType],
        *,
        expr: bool = False, 
    ):
        super().__init__(var, expr=expr)
        self._head_id_func = head_id
        self._next_ids_func = next_ids
        self._value_func = value

    def _traverse(self, nodes: _NodesType):
        head_id = self._head_id_func(nodes)
        visited: set[_IdType] = set([head_id])
        queue: deque[_IdType] = deque([head_id])
        graph_content = NodesGraphContent()
        rawids: list[_IdType] = []

        while queue:
            id = queue.popleft()
            rawids.append(id)
            nexts = self._next_ids_func(nodes, id)
            if not isinstance(nexts, list):
                nexts = [nexts]
            new_nexts: list[tuple[_IdType, _WeightType]] = []
            nexts_pure_str: list[tuple[str, str]] = []
            for n in nexts:
                if not isinstance(n, tuple):
                    n = (n, cast(_WeightType, 1))
                if n[0] is None: continue
                new_nexts.append(n)
                nexts_pure_str.append((repr(n[0]), repr(n[1])))
            nexts = new_nexts
            graph_content.value[repr(id)] = NodesGraphContentItem(
                value="", # Get value in self.generate_graph 
                nexts=nexts_pure_str
            )
            # traverse its neighbors
            for neighborid, _ in nexts:
                if neighborid in visited:
                    continue
                visited.add(neighborid)
                queue.append(neighborid)

        return graph_content, rawids

    @override
    def generate_graph(self, frame = None) -> NodesGraph:
        if frame is None:
            frame = _get_caller_frame(currentframe())
        curr_value = self.capture(frame)
        frameid, parent_frameid = str(id(frame)), None
        if parent_frame := frame.f_back is not None:
            parent_frameid = str(id(parent_frame))
        if isinstance(curr_value, _NotCaptured):
            return NodesGraph(
                frameid=frameid,
                parent_frameid=parent_frameid,
                notcaptured=True,
                content=repr(curr_value),
            )
        curr_value = cast(_NodesType, curr_value)
        graph_content, rawids = self._traverse(curr_value)
        for var in self._index_registry.values():
            index = var.capture(frame)
            pointer = Pointer(
                name=var.varname, index=repr(index), 
                notcaptured=True if isinstance(index, _NotCaptured) else False
            )
            graph_content.pointers.append(pointer)
        itemvars_value = {var.varname: var.capture(frame) for var in self._item_registry.values()}
        for nodeid in rawids:
            nodevalue = self._value_func(curr_value, nodeid)
            for itemvarname, itemvar in itemvars_value.items():
                if nodevalue is not itemvar:
                    continue
                graph_content.pointers.append(Pointer(
                    name=itemvarname, index=repr(nodeid), 
                    notcaptured=False
                ))
            graph_content.value[repr(nodeid)].value = repr(nodevalue)
        return NodesGraph(
            frameid=frameid,
            parent_frameid=parent_frameid,
            notcaptured=False,
            content=graph_content,
        )