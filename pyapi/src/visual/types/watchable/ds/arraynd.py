from visual.types.watchable.ds import DSND

class ArrayND(DSND):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    ...

Tensor = ArrayND