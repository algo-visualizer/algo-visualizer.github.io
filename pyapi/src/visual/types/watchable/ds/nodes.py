from visual.types.watchable.ds import DS
from visual.types.graph import NodesGraph, NodesGraphContent, NodesGraphContentItem
from visual.types.watchable.base import _NotCaptured, _get_caller_frame
from visual.types.graph import Pointer, NodeId, NodeWeight
from inspect import currentframe
from typing import override, cast
from collections import deque
from types import FrameType
from typing import Callable

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
    def generate_graph(self, frame: FrameType | None = None) -> NodesGraph:
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
        for var in self.pointable.get_index_dict().values():
            index = var.capture(frame)
            pointer = Pointer(
                name=var.varname, index=repr(index), 
                notcaptured=True if isinstance(index, _NotCaptured) else False
            )
            graph_content.pointers.append(pointer)
        itemvars_value = {var.varname: var.capture(frame) for var in self.pointable.get_item_dict().values()}
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