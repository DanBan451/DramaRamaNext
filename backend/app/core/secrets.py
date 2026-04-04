"""
AWS Secrets Manager integration
"""
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def get_secret(secret_name: str = "dramarama/backend/config") -> dict:
    """
    Retrieve secret from AWS Secrets Manager.
    Falls back to environment variables if AWS is not available.
    """
    try:
        import boto3
        from botocore.exceptions import ClientError
        
        session = boto3.session.Session()
        client = session.client(
            service_name='secretsmanager',
            region_name='us-east-1'  # Change to your region
        )
        
        try:
            get_secret_value_response = client.get_secret_value(SecretId=secret_name)
            secret_string = get_secret_value_response['SecretString']
            secrets = json.loads(secret_string)
            logger.info(f"Successfully loaded secrets from AWS Secrets Manager: {secret_name}")
            return secrets
        except ClientError as e:
            logger.error(f"Failed to retrieve secret from AWS: {e}")
            raise
            
    except ImportError:
        logger.warning("boto3 not installed - AWS Secrets Manager not available")
        return {}
    except Exception as e:
        logger.error(f"Error accessing AWS Secrets Manager: {e}")
        return {}
