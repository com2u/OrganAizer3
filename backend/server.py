"""Flask web server for Terminlandschaft."""

import logging
import os

from flask import Flask, send_file
from flask_cors import CORS

from backend.api.routes import api_bp
from backend.api.resources_routes import resources_bp
from backend.api.planning_routes import planning_bp
from backend.api.ai_connections_routes import ai_connections_bp
from backend.api.obsidian_routes import obsidian_bp
from backend.api.verbindungen_routes import verbindungen_bp
from backend.api.n8n_routes import n8n_bp
from backend.api.access_requests_routes import access_requests_bp
from backend.api.telephony_routes import telephony_bp
from backend.api.logging_middleware import register_logging_middleware
from backend.config import (
    CORS_ORIGINS,
    DB_PATH,
    FLASK_DEBUG,
    WEB_HOST,
    WEB_PORT,
    setup_logging,
)
from backend.db.sqlite_adapter import SQLiteAdapter

setup_logging()
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    """Create and configure the Flask application."""
    app = Flask(__name__, static_folder="../frontend/dist", static_url_path="")
    CORS(app, origins=CORS_ORIGINS, supports_credentials=True)

    # Register structured request logging middleware
    register_logging_middleware(app)

    # Ensure all tables exist (idempotent, uses CREATE TABLE IF NOT EXISTS)
    db = SQLiteAdapter(DB_PATH)
    db.connect()
    db.create_tables()
    db.disconnect()

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(resources_bp, url_prefix="/api/resources")
    app.register_blueprint(planning_bp, url_prefix="/api/planning")
    app.register_blueprint(ai_connections_bp, url_prefix="/api/ai-connections")
    app.register_blueprint(obsidian_bp, url_prefix="/api/obsidian")
    app.register_blueprint(verbindungen_bp, url_prefix="/api/verbindungen")
    app.register_blueprint(n8n_bp, url_prefix="/api/n8n")
    app.register_blueprint(telephony_bp, url_prefix="/api/telephony")
    # Public blueprint – no auth guard (intentional, see access_requests_routes.py)
    app.register_blueprint(access_requests_bp, url_prefix="/api/access-requests")

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
