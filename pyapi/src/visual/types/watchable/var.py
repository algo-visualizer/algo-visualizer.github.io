from visual.types.watchable.base import Watchable
from visual.types.graph import VarGraph
from visual.types.watchable.base import _NotCaptured, _get_caller_frame
from inspect import currentframe
from typing import override
from types import FrameType

class Var(Watchable): 
    
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)

    @override
    def generate_graph(self, frame: FrameType | None = None) -> VarGraph:
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