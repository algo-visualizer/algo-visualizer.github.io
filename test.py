    
try:
    from visual import *

    nodes('l').index('i', 'j').item('target')
    breakpoint()

    l = [1,2,0]
    breakpoint()

    l[2] = None
    breakpoint()

    i, j = 0, 1
    breakpoint()

    target = 2
    breakpoint()

finally:
    from visual.core import _snapshots

    print(_snapshots)
