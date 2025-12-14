from typing import Literal
from pydantic import BaseModel

from visual.type.graph import GraphGroup


class Snapshot(BaseModel):
    line: int
    graph_group: GraphGroup
    stdout: str = ""
    event: Literal["line", "call", "return"]