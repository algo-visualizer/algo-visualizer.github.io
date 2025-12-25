from visual.types.watchable.base import Watchable
from visual.types.pointable import Pointable, Pointable2D, Pointable3D, PointableND
from abc import ABC
from typing import override


class DS(Watchable, ABC):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
        self.pointable = self._generate_pointable()

    def _generate_pointable[_IndexRegistryKey, _IndexRegistryValue](self):
        return Pointable[_IndexRegistryKey, _IndexRegistryValue]()

class DS2D(DS, ABC):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    
    @override
    def _generate_pointable(self):
        return Pointable2D()

class DS3D(DS, ABC):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    
    @override
    def _generate_pointable(self):
        return Pointable3D()

class DSND(DS, ABC):
    def __init__(self, var: str, *, expr: bool = False):
        super().__init__(var, expr=expr)
    
    @override
    def _generate_pointable(self):
        return PointableND()