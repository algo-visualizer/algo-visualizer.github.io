from typing import Sequence
from collections import deque
from visual.types.watchable import Watchable, DS


class WatcherContext[T: Watchable]:
    def __init__(self, watchables: Sequence[T]):
        self.watchables = watchables

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        unwatch(*(w.varname for w in self.watchables))

class DSWatcherContext[T: DS](WatcherContext[T]):
    def __init__(self, watchables: Sequence[T]):
        super().__init__(watchables)

    def index(self, var: str, *vars: str, expr: bool = False):
        """
        Register variables to be used as index pointers for all watchables.
        
        Args:
            var (str): The variable name to be used as index pointer.
            *vars (str): Additional variable names to be used as index pointers.
            expr (bool): Whether the `var` and `*vars` are actually expressions.
        
        Returns:
            DSWatcherContext: Returns self to enable method chaining.
        """
        for s in (var, *vars):
            for w in self.watchables:
                w.pointable.add_index(s, expr=expr)
        return self

    def item(self, var: str, *vars: str, expr: bool = False):
        """
        Register variables to be used as item pointers for all watchables.
        
        Args:
            var (str): The variable name to be used as item pointer.
            *vars (str): Additional variable names to be used as item pointers.
            expr (bool): Whether the `var` and `*vars` are actually expressions.
        
        Returns:
            DSWatcherContext: Returns self to enable method chaining.
        """
        for s in (var, *vars):
            for w in self.watchables:
                w.pointable.add_item(s, expr=expr)
        return self



_registry: dict[str, deque[Watchable]] = {}

def watch(watchable: Watchable, *watchables: Watchable):
    """
    **DO NOT use this function directly. Use `var`, `array`, `nodes` etc. instead.**

    Registers the watchable to the top of the global watcher registry stack. 
    
    Since the `watch` system design principle is:     
    *Information increment is always better than decrement.*    
    the watchable will be appended to the global watcher registry stack instead of replacing the old one. **If the corresponding variable name didn't get `unwatch`ed, the last registered watchable with that variable name will be kept.**
   
    Args:
        watchable (Watchable): The watchable to register.
        *watchables (Watchable): Additional watchables to register.
    """
    global _registry
    for w in (watchable, *watchables):
        if _registry.get(w.varname) is None:
            _registry[w.varname] = deque()
        _registry[w.varname].append(w)

def unwatch(var: str, *vars: str):
    """
    **NOT recommended to use this function directly, especially in pure-top-level code. Use `with` statement instead.**
    
    Unregisters the last registered watchable with that variable name from the global watcher registry stack. 
    
    Args:
        var (str): The name of the variable to unregister.
        *vars (str): Additional variables to unregister.

    In some cases like declaring watchable in a function, you can use it via `with` statement:

    ```python
    def some_func():
        with var('x', 'y'):
            x, y = 1, 2
            with array('a', 'b'):
                a, b = [1, 2], [3, 4]
                ...
            # 'a', 'b' unwatched implicitly
            ...
        # 'x', 'y' unwatched implicitly
        return
    ```

    **It will implcitly call `unwatch` when the `with` block is exited.**

    `unwatch` will only unregister the watchable that is top of the stack. For example:

    ```python
    var('x', 'y') # Pure top-level watcher. No `unwatch` needed.

    def some_func():
        with var('x', 'y'):
            x, y = 1, 2
            ...
        # Inner 'x', 'y' unwatched implicitly, outer 'x', 'y' still watched.
        return
    ```
    """
    global _registry
    for v in (var, *vars):
        if _registry.get(v) is None:
            continue
        if _registry[v]:
            _registry[v].pop()
        if not _registry[v]:
            del _registry[v]

def get_registry() -> dict[str, deque[Watchable]]:
    return _registry

def clear():
    global _registry
    _registry = {}


