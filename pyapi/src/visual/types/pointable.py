from abc import ABC
from inspect import currentframe
from visual.types.watchable import Var, Watchable, _NotCaptured, _get_caller_frame
from collections import deque
from types import FrameType
from typing import Callable, Iterable, cast, override
from visual.types.graph import (
    NodeId,
    NodeWeight,
    Pointer,
    ArrayGraph, ArrayGraphContent, 
    Array2DGraph, Array2DGraphContent,
    NodesGraph, NodesGraphContent, 
    NodesGraphContentItem, 
)

class DS(Watchable, ABC):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)

class Pointable(DS, ABC):
    def __init__(self, var: str, *, expr: bool = False):
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

class Array(Pointable):
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
    
class Nodes[_NodesType, _NodeType, _IdType: NodeId, _WeightType: NodeWeight](Pointable):
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

class Pointable2D(DS, ABC):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
        self._index_registry: dict[tuple[str, str], tuple[Var, Var]] = {}
        self._item_registry: dict[str, Var] = {}

    def get_index_dict(self):
        return self._index_registry
    
    def get_item_dict(self):
        return self._item_registry
    
    def add_index(self, var: tuple[str, str], expr: bool = False):
        self._index_registry[var] = (Var(var[0], expr=expr), Var(var[1], expr=expr))
    
    def add_item(self, var: str, expr: bool = False):
        self._item_registry[var] = Var(var, expr=expr)
    
    def remove_index(self, var: tuple[str, str]):
        """
        **Not recommended to use.** Information increment is better than decrement. If you really want to constrain the effective index/item effective scope, use `with` statement.
        """
        del self._index_registry[var]
    
    def remove_item(self, var: str):
        """
        **Not recommended to use.** Information increment is better than decrement. If you really want to constrain the effective index/item effective scope, use `with` statement.
        """
        del self._item_registry[var]

class Array2D(Pointable2D):
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
        def create_pointer(var: Var, frame: FrameType):
            index = var.capture(frame)
            pointer = None
            if isinstance(index, _NotCaptured):
                pointer = Pointer(name=var.varname, index=repr(index), notcaptured=True)
            else:
                pointer = Pointer(name=var.varname, index=cast(int | str, index), notcaptured=False)
            return pointer
        for var0, var1 in self._index_registry.values():
            pointer0, pointer1 = create_pointer(var0, frame), create_pointer(var1, frame)
            content.pointers.append((pointer0, pointer1))
        itemvars_value = {var.varname: var.capture(frame) for var in self._item_registry.values()}
        curr_value = cast(Iterable[Iterable], curr_value)
        for i, row in enumerate(curr_value):
            l: list[str] = []
            for j, item in enumerate(row):
                for itemvarname, itemvar in itemvars_value.items():
                    if item is not itemvar:
                        continue
                    pointer0 = Pointer(name=itemvarname, index=i, notcaptured=False)
                    pointer1 = Pointer(name=itemvarname, index=j, notcaptured=False)
                    content.pointers.append((pointer0, pointer1))
                l.append(repr(item))
            content.value.append(l)
                  
        return Array2DGraph(
            frameid=frameid,
            parent_frameid=parent_frameid,
            notcaptured=False,
            content=content,
        )
    
class Pointable3D(DS, ABC):
    ...

class Array3D(Pointable3D):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    ...

class PointableND(DS, ABC):
    ...

class ArrayND(PointableND):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    ...

Tensor = ArrayND


