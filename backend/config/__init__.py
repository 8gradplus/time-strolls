from pydantic import ValidationError
from swak.funcflow import Pipe
import yaml
from .validate import Validator
import os

def load_yaml(path: str) -> dict:
    abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", path))
    print(abs_path)
    with open(abs_path, "r") as f:
        return yaml.safe_load(f)

def validate(config: dict):
    try:
        return Validator(**config)
    except ValidationError as e:
        print(e)

config = Pipe(load_yaml, validate)("config.yml")
