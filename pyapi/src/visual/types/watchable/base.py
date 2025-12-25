from types import FrameType
from abc import ABC, abstractmethod
from visual.types.graph import GraphUnion
from inspect import currentframe

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