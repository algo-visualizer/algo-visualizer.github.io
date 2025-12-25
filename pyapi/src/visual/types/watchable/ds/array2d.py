from visual.types.watchable.ds import DS2D
from visual.types.graph import Array2DGraph, Array2DGraphContent
from visual.types.watchable.base import _NotCaptured, _get_caller_frame
from visual.types.watchable.var import Var
from visual.types.graph import Pointer
from inspect import currentframe
from typing import override, Iterable, cast
from types import FrameType

class Array2D(DS2D):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)

    @override
    def generate_graph(self, frame: FrameType | None = None) -> Array2DGraph:
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
        for var0, var1 in self.pointable.get_index_dict().values():
            pointer0, pointer1 = create_pointer(var0, frame), create_pointer(var1, frame)
            content.pointers.append((pointer0, pointer1))
        itemvars_value = {var.varname: var.capture(frame) for var in self.pointable.get_item_dict().values()}
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