from visual import *

with array2d('arr').index(('i', 'j')):
    a = []
    arr = [[1, 2], [3, 4], [a, 6]]
    i, j = 0, 0
    breakpoint()
    with inherit('arr').item('a'):
        breakpoint()

from visual.core import _visual_api_get_snapshots_json

with open('snapshots.json', 'w') as f:
    f.write(_visual_api_get_snapshots_json())
