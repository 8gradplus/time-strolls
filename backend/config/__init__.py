from pydantic import ValidationError
from swak.funcflow import Pipe
from .validate import Validator
import os
from envyaml import EnvYAML

def load_yaml(path: str) -> dict:
    abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", path))
    return (EnvYAML(abs_path, strict=False).export())

def validate(config: dict):
    try:
        return Validator(**config)
    except ValidationError as e:
        print(e)

config = Pipe(
    load_yaml,
    validate
)("config.yml")
