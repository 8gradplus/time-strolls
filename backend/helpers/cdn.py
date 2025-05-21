import boto3
import asyncio
from botocore.client import Config as BotoConfig
from config import config
cdn = config.cdn

def get_client():
    return boto3.client('s3',
        region_name=cdn.region,
        endpoint_url=cdn.endpoint,
        aws_access_key_id=cdn.credentials.key,
        aws_secret_access_key=cdn.credentials.secret,
        config=BotoConfig(signature_version='s3v4'))


def put_object(content: bytes, path: str, content_type):
    s3 = get_client()
    s3.put_object(
        Body=content,
        Bucket=cdn.bucket,
        Key=path,
        ContentType=content_type,
        ACL="public-read"
        )

def delete_object(path: str):
    s3 = get_client()
    s3.delete_object(Bucket=cdn.bucket, Key=path)

async def write(content: bytes, path: str, content_type):
    await asyncio.to_thread(put_object, content, path, content_type)

async def delete(path):
    await asyncio.to_thread(delete_object, path)


# Todo replace in file upload: write_s3 -> write / put_object
def write_s3(stuff: bytes, path: str, content_type:str =f"image/{config.tile.format}"):
    if stuff is None:
           raise ValueError("Cannot upload None content. Expected bytes object.")

    if not isinstance(stuff, bytes):
           raise TypeError(f"Expected bytes object, got {type(stuff)}")

    s3 = get_client()
    s3.put_object(
        Body=stuff,
        Bucket=cdn.bucket,
        Key=path,
        ContentType=content_type,
        ACL="public-read"
    )
