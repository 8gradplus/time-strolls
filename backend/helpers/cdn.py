import boto3
from botocore.client import Config
from config import config
from io import BytesIO

cdn = config.cdn

def get_client():
    return boto3.client('s3',
        region_name=cdn.region,
        endpoint_url=cdn.endpoint,
        aws_access_key_id=cdn.credentials.key,
        aws_secret_access_key=cdn.credentials.secret,
        config=Config(signature_version='s3v4'))

def write_s3(stuff: bytes, path: str):
    if stuff is None:
           raise ValueError("Cannot upload None content. Expected bytes object.")

    if not isinstance(stuff, bytes):
           raise TypeError(f"Expected bytes object, got {type(stuff)}")

    s3 = get_client()
    s3.put_object(
        Body=stuff,
        Bucket=cdn.bucket,
        Key=path,
        ContentType=f"image/{config.tile.format}",
        ACL="public-read"
    )
