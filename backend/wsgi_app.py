"""WSGI entry point for PythonAnywhere, which only proxies WSGI apps on the free tier."""
from a2wsgi import ASGIMiddleware

from app.main import app as _asgi_app

application = ASGIMiddleware(_asgi_app)
