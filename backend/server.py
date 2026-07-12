"""Flask web server for Terminlandschaft."""

import logging
import os

from flask import Flask, send_file
from flask_cors import CORS

from backend.api.routes import api_bp
from backend.api.logging_middleware import register_logging_middleware
from backend.config import (
    CORS_ORIGINS,
    FLASK_DEBUG,
    WEB_HOST,
    WEB_PORT,
    setup_logging,
)

setup_logging()
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__, static_folder="../frontend/dist", static_url_path="")
    CORS(app, origins=CORS_ORIGINS, supports_credentials=True)

    # Register structured request logging middleware
    register_logging_middleware(app)

    app.register_blueprint(api_bp, url_prefix="/api")

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_static(path):
        """Serve React build or fallback to index.html."""
        static_folder = app.static_folder or ""
        if path and os.path.exists(os.path.join(static_folder, path)):
            return send_file(os.path.join(static_folder, path))
        index_path = os.path.join(static_folder, "index.html")
        if os.path.exists(index_path):
            return send_file(index_path)
        return "Frontend not built. Run 'npm run build' in frontend/", 404

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=FLASK_DEBUG, host=WEB_HOST, port=WEB_PORT)
