from flask import Flask, send_file, jsonify, request, abort
import os
import time
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, login_required

from data_loader import DataStore, MODELS, DEFAULT_MODEL

app = Flask(__name__)
app.secret_key = os.urandom(24)
bcrypt = Bcrypt(app)

login_manager = LoginManager()
login_manager.init_app(app)

# Accounts come from REFRACT_USERS, formatted "user1:password1,user2:password2",
# so no passwords live in the repo.
def load_users(spec):
    accounts = {}
    for entry in spec.split(","):
        username, sep, password = entry.strip().partition(":")
        if sep and username and password:
            accounts[username] = bcrypt.generate_password_hash(password).decode("utf-8")
    return accounts


users = load_users(os.environ.get("REFRACT_USERS", ""))
if not users:
    print("WARNING: no accounts configured; set REFRACT_USERS='user:password' to enable login")

# The data bundle. Override with DATA_PATH; defaults to data/ at the repo root (gitignored,
# can be a symlink). RESULTS_PATH can point results/ somewhere else (e.g. an external drive).
DATA_PATH = os.environ.get(
    "DATA_PATH",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data"),
)
RESULTS_PATH = os.environ.get("RESULTS_PATH")

DATA = None  # DataStore, loaded at startup


class User(UserMixin):
    def __init__(self, id):
        self.id = id

    @staticmethod
    def validate_login(username, password):
        if username in users and bcrypt.check_password_hash(users[username], password):
            user = User(username)
            login_user(user)
            return user
        return None

@login_manager.user_loader
def load_user(user_id):
    return User(user_id)


def _endpoint(endpoint_id):
    if not DATA.has(endpoint_id):
        abort(404, description=f"Unknown endpoint {endpoint_id}")
    return endpoint_id


def _model():
    model = request.args.get("model", DEFAULT_MODEL)
    if model not in MODELS:
        abort(400, description=f"Unknown model {model}")
    return model


def _send_png(path):
    if not path or not os.path.exists(path):
        abort(404, description="Image not found")
    return send_file(path, mimetype="image/png", max_age=3600)


def _or_404(value, what):
    if value is None:
        abort(404, description=f"{what} not available")
    return jsonify(value)


@app.route("/api/models")
@login_required
def get_models():
    return jsonify(models=MODELS, default=DEFAULT_MODEL)


@app.route("/api/endpoints")
@login_required
def get_endpoints():
    """Every endpoint in the run, with metadata and Pearson r per model"""
    return jsonify(DATA.endpoint_list)


@app.route("/api/endpoints/<endpoint_id>")
@login_required
def get_endpoint(endpoint_id):
    return jsonify(DATA.detail(_endpoint(endpoint_id)))


@app.route("/api/endpoints/<endpoint_id>/top_features")
@login_required
def get_top_features(endpoint_id):
    return _or_404(DATA.top_features(_endpoint(endpoint_id), _model()), "Top features")


@app.route("/api/endpoints/<endpoint_id>/predictions")
@login_required
def get_predictions(endpoint_id):
    return _or_404(DATA.predictions(_endpoint(endpoint_id), _model()), "Predictions")


@app.route("/api/endpoints/<endpoint_id>/plots/<kind>")
@login_required
def get_plot(endpoint_id, kind):
    folder = DATA.endpoint_dir(_endpoint(endpoint_id))
    if folder is None:
        abort(404, description="Results folder not downloaded")
    if kind == "selection":
        path = os.path.join(folder, "feature_selection", "selection_plot.png")
    elif kind in ("shap_summary", "pred_vs_actual"):
        path = os.path.join(folder, "predictive", f"{_model()}_{kind}.png")
    else:
        abort(404)
    return _send_png(path)


@app.route("/api/features/search")
@login_required
def search_features():
    return jsonify(DATA.search_features(request.args.get("q", "")))


@app.route("/api/features/<feature_id>")
@login_required
def get_feature(feature_id):
    return _or_404(DATA.feature_endpoints(feature_id), f"Feature {feature_id}")


@app.route("/api/overview")
@login_required
def get_overview():
    return jsonify(DATA.overview())


@app.route("/api/overview/figures/<name>")
@login_required
def get_overview_figure(name):
    return _send_png(DATA.figure_path(name))


@app.route("/api/methods")
@login_required
def get_methods():
    return jsonify(DATA.methods())


@app.route("/api/login", methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user = User.validate_login(username, password)
    if user:
        return jsonify(success=True), 200
    return jsonify(success=False), 401


def load_data():
    global DATA
    start = time.time()
    DATA = DataStore(DATA_PATH, RESULTS_PATH)
    print(
        f"Loaded {len(DATA.endpoint_list)} endpoints ({len(DATA.local)} with local results) "
        f"from {DATA.bundle_path} in {time.time() - start:.1f}s"
    )


if __name__ == '__main__':
    load_data()
    # Port 5000 is taken by macOS AirPlay Receiver, so default to 5001
    app.run(port=int(os.environ.get("PORT", 5001)))
