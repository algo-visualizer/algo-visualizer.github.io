from visual.types.watchable.ds import DS
from visual.types.graph import ArrayGraph, ArrayGraphContent
from visual.types.watchable.base import _NotCaptured, _get_caller_frame
from visual.types.graph import Pointer
from inspect import currentframe
from typing import override, Iterable, cast
from types import FrameType

class Array(DS):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)

    @override
    def generate_graph(self, frame: FrameType | None = None) -> ArrayGraph:
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
        for var in self.pointable.get_index_dict().values():
            index = var.capture(frame)
            pointer = None
            if isinstance(index, _NotCaptured):
                pointer = Pointer(name=var.varname, index=repr(index), notcaptured=True)
            else:
                pointer = Pointer(name=var.varname, index=cast(int | str, index), notcaptured=False)
            content.pointers.append(pointer)
        itemvars_value = {var.varname: var.capture(frame) for var in self.pointable.get_item_dict().values()}
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