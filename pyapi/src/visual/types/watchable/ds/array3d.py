from visual.types.watchable.ds import DS3D

class Array3D(DS3D):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    ...