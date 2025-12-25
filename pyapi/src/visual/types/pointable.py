from visual.types.watchable.var import Var
from typing import cast, override

class Pointable[_IndexRegistryKey = str, _IndexRegistryValue = Var]():
    def __init__(self):
        self._index_registry = cast(dict[_IndexRegistryKey, _IndexRegistryValue], {})
        self._item_registry = cast(dict[str, Var], {})

    def get_index_dict(self):
        return self._index_registry
    
    def get_item_dict(self):
        return self._item_registry

    def add_index(self, var: _IndexRegistryKey, expr: bool = False):
        self._index_registry[var] = cast(_IndexRegistryValue, Var(cast(str, var), expr=expr))
    
    def add_item(self, var: str, expr: bool = False):
        self._item_registry[var] = Var(var, expr=expr)

    def remove_index(self, var: _IndexRegistryKey):
        """
        **Not recommended to use.** Information increment is better than decrement. If you really want to constrain the effective index scope, use `with` statement with `DSWatcherContext`.
        """
        del self._index_registry[var]
    
    def remove_item(self, var: str):
        """
        **Not recommended to use.** Information increment is better than decrement. If you really want to constrain the effective item scope, use `with` statement with `DSWatcherContext`.
        """
        del self._item_registry[var]

class Pointable2D(Pointable[tuple[str, str], tuple[Var, Var]]):
    def __init__(self):
        super().__init__()

    @override
    def add_index(self, var: tuple[str, str], expr: bool = False):
        self._index_registry[var] = (Var(var[0], expr=expr), Var(var[1], expr=expr))
    
    @override
    def add_item(self, var: str, expr: bool = False):
        self._item_registry[var] = Var(var, expr=expr)
    
class Pointable3D(Pointable[tuple[str, str, str], tuple[Var, Var, Var]]):
    ...

class PointableND(Pointable[tuple[str, ...], tuple[Var, ...]]):
    ...

