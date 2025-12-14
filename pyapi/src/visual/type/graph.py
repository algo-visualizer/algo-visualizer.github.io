from __future__ import annotations # Remove this in Python 3.14

from typing import Annotated, Any, Hashable, Literal
from pydantic import BaseModel, Field

type GraphUnion = VarGraph | ArrayGraph | Array2DGraph | NodesGraph
type GraphGroup = dict[str, Annotated[GraphUnion, Field(discriminator='type')]]

class Graph(BaseModel):
    frameid: str
    parent_frameid: str | None
    notcaptured: bool

class VarGraph(Graph):
    type: Literal["var"] = "var"
    content: str


class Pointer(BaseModel):
    name: str
    index: int | str
    notcaptured: bool

class Pointer2D(BaseModel):
    name: str
    index: tuple[int, int] | str
    notcaptured: bool

class ArrayGraph(Graph):
    type: Literal["array"] = "array"
    content: str | ArrayGraphContent

class ArrayGraphContent(BaseModel):
    value: list[str] = Field(default_factory=list)
    pointers: list[Pointer] = Field(default_factory=list)

class Array2DGraph(Graph):
    type: Literal["array2d"] = "array2d"
    content: str | Array2DGraphContent

class Array2DGraphContent(BaseModel):
    value: list[list[str]] = Field(default_factory=list)
    pointers: list[Pointer2D] = Field(default_factory=list)

type NodeId = int | str | None
type NodeWeight = Hashable

class NodesGraph(Graph):
    type: Literal["nodes"] = "nodes"
    content: str | NodesGraphContent

class NodesGraphContent(BaseModel):
    value: dict[str, NodesGraphContentItem] = Field(default_factory=dict)
    pointers: list[Pointer] = Field(default_factory=list)

class NodesGraphContentItem(BaseModel):
    value: str
    nexts: list[tuple[str, str]] = Field(default_factory=list)

