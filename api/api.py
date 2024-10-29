from flask import Flask, send_file, jsonify, request, session
from glob import glob
import os
import pandas as pd
import sys
from flask_bcrypt import Bcrypt
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user

app = Flask(__name__)
app.secret_key = os.urandom(24)
bcrypt = Bcrypt(app)

login_manager = LoginManager()
login_manager.init_app(app)

users = {
    "corsellolab": bcrypt.generate_password_hash('stanford').decode('utf-8'),
    "nick": bcrypt.generate_password_hash("phillips").decode("utf-8"),
}

#RF_DATA_PATH = "../../data/20231023_retrain_large"
#XGBOOST_DATA_PATH = "../../data/final_results/output_final"
#REP1K_DATA_PATH = "../../data/rep1k"

REFRACT_DRUG_DATA_PATH = "../../data/drug_data/refract"
BASELINE_DRUG_DATA_PATH = "../../data/drug_data/baseline"
REFRACT_GENETIC_DATA_PATH = "../../data/genetic_dependency_data/refract"
BASELINE_GENETIC_DATA_PATH = "../../data/genetic_dependency_data/baseline"


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

class Drug:
    def __init__(self, dir_name):
        self.drug_name = dir_name.split("_")[0]
        self.refract_dir = os.path.join(REFRACT_DRUG_DATA_PATH, dir_name)
        self.baseline_dir = os.path.join(BASELINE_DRUG_DATA_PATH, dir_name)
        
        self.refract_pred_img = os.path.join(self.refract_dir, "pred_vs_actual.png")
        self.refract_shap_img = os.path.join(self.refract_dir, "shap_summary_plot.png")
        self.refract_preds = os.path.join(self.refract_dir, "predictions.csv")
        self.baseline_preds = os.path.join(self.baseline_dir, "model_table.csv")

        # Read just first row of predictions to get correlation
        if os.path.exists(self.refract_preds):
            df = pd.read_csv(self.refract_preds, nrows=1)
            self.pearson_corr = float(df.iloc[0,-1])
        else:
            self.pearson_corr = None

        # same for baseline
        if os.path.exists(self.baseline_preds):
            df = pd.read_csv(self.baseline_preds, nrows=1)
            self.baseline_pearson_corr = float(df.iloc[0,-1])
        else:
            self.baseline_pearson_corr = None

        if self.pearson_corr is not None and self.baseline_pearson_corr is not None:
            self.diff = self.pearson_corr - self.baseline_pearson_corr
        else:
            self.diff = None

    def to_dict(self):
        return {
            "Drug Name": self.drug_name,
            "Refract Pearson R": self.pearson_corr,
            "Baseline Pearson R": self.baseline_pearson_corr,
            "Difference": self.diff
        }
    

class Gene:
    def __init__(self, dir_name):
        self.gene_name = dir_name.split("_")[0]
        self.refract_dir = os.path.join(REFRACT_GENETIC_DATA_PATH, dir_name)
        self.baseline_dir = os.path.join(BASELINE_GENETIC_DATA_PATH, dir_name)
        
        self.refract_pred_img = os.path.join(self.refract_dir, "pred_vs_actual.png")
        self.refract_shap_img = os.path.join(self.refract_dir, "shap_summary_plot.png")
        self.refract_preds = os.path.join(self.refract_dir, "predictions.csv")
        self.baseline_preds = os.path.join(self.baseline_dir, "model_table.csv")

        # Read just first row of predictions to get correlation
        if os.path.exists(self.refract_preds):
            df = pd.read_csv(self.refract_preds, nrows=1)
            self.pearson_corr = float(df.iloc[0,-1])
        else:
            self.pearson_corr = None

        # same for baseline
        if os.path.exists(self.baseline_preds):
            df = pd.read_csv(self.baseline_preds, nrows=1)
            self.baseline_pearson_corr = float(df.iloc[0,-1])
        else:
            self.baseline_pearson_corr = None

        # compute the difference
        if self.pearson_corr is not None and self.baseline_pearson_corr is not None:
            self.diff = self.pearson_corr - self.baseline_pearson_corr
        else:
            self.diff = None

    def to_dict(self):
        return {
            "Drug Name": self.gene_name,
            "Refract Pearson R": self.pearson_corr,
            "Baseline Pearson R": self.baseline_pearson_corr,
            "Difference": self.diff
        }

@app.route("/api/setDataset", methods=['POST'])
#@login_required
def set_dataset():
    data = request.get_json()
    dataset = data.get('algorithm')
    if dataset not in ['Drug', 'Gene']:
        return jsonify(success=False, message="Invalid dataset"), 400
    
    session['current_dataset'] = 'Drug' if dataset == 'Drug' else 'Gene'
    return jsonify(success=True, message=f"Dataset set to {dataset}"), 200

@app.route("/api/compounds")
#@login_required
def get_compounds():
    """Return a list of all compounds as a dict based on the current dataset"""
    current_dataset = session.get('current_dataset', 'Drug')  # Default to RF if not set
    tmp_dict = {"Drug": DRUG_DICT, "Gene": GENE_DICT}[current_dataset]
    return jsonify([compound.to_dict() for compound in tmp_dict.values()])

@app.route("/api/<compound>/train_results")
#@login_required
def get_train_results(compound):
    # return the image using flask send_file
    current_dataset = session.get('current_dataset', 'Drug')  # Default to RF if not set
    tmp_dict = {"Drug": DRUG_DICT, "Gene": GENE_DICT}[current_dataset]
    return send_file(tmp_dict[compound].refract_pred_img, mimetype='image/png')

@app.route('/api/<compound>/shap')
#@login_required
def get_shap(compound):
    current_dataset = session.get('current_dataset', 'Drug')  # Default to RF if not set
    tmp_dict = {"Drug": DRUG_DICT, "Gene": GENE_DICT}[current_dataset]
    return send_file(tmp_dict[compound].refract_shap_img, mimetype='image/png')

@app.route("/api/login", methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user = User.validate_login(username, password)
    if user:
        return jsonify(success=True), 200
    return jsonify(success=False), 401

if __name__ == '__main__':
    drugs = glob(f"{REFRACT_DRUG_DATA_PATH}/*")
    genes = glob(f"{REFRACT_GENETIC_DATA_PATH}/*")

    drugs = [os.path.basename(drug) for drug in drugs]
    genes = [os.path.basename(gene) for gene in genes]

    # create drug and genetic objects
    DRUG_DICT = {drug: Drug(drug) for drug in drugs}
    GENE_DICT = {gene: Gene(gene) for gene in genes}

    # if the  Difference is None, drop the entry
    DRUG_DICT = {k.split("_")[0]: v for k, v in DRUG_DICT.items() if v.diff is not None}
    GENE_DICT = {k.split("_")[0]: v for k, v in GENE_DICT.items() if v.diff is not None}

    app.run()
