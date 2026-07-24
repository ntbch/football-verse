from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field

Attribute = Annotated[int, Field(ge=1, le=100)]
Percentage = Annotated[float, Field(ge=0, le=100)]
Name = Annotated[str, Field(min_length=1, max_length=100)]
Version = Annotated[str, Field(min_length=1, max_length=30)]


class DomainModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
