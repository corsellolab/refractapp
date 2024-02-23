from flask import Flask, send_file, jsonify, request, session
from glob import glob
import os
import pandas as pd
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

RF_DATA_PATH = "../../data/20231023_retrain_large"
XGBOOST_DATA_PATH = "../../data/final_results/output_final"
REP1K_DATA_PATH = "../../data/rep1k"

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

class Compound:
    def __init__(self, dir, drug_df):
        # check if the last part of the basename is a float, if so:
        if os.path.basename(dir).split("_")[-1].replace(".", "").isdigit():
            self.compound_name = "_".join(os.path.basename(dir).split("_")[:-1]).lower()
        else:
            self.compound_name = os.path.basename(dir).lower()
        self.network = pd.read_csv(f"{dir}/network_interactions.csv")
        self.shap_plot = os.path.abspath(f"{dir}/shap_summary_plot.png")
        self.train_results = os.path.abspath(f"{dir}/train_results.png")
        with open(f"{dir}/train_corr.txt", "r") as f:
            self.train_corr = f.read()
        self.num_edges = len(self.network)
        # check if we have a repourposing_target for this drug
        # if so, set self.repurposing_target and self.MOA
        if self.compound_name in drug_df['Drug.Name'].values:
            drug_info = drug_df[drug_df['Drug.Name'] == self.compound_name]
            self.repurposing_target = str(drug_info['repurposing_target'].values[0])
            self.MOA = str(drug_info['MOA'].values[0])
        else:
            self.repurposing_target = "N/A"
            self.MOA = "N/A"

    def to_dict(self):
        return {
            "Drug Name": self.compound_name,
            "Pearson R": "{0:.5f}".format(float(self.train_corr)),
            "Connectivity": self.num_edges / 2,
            "Repurposing Target": self.repurposing_target,
            "MOA": self.MOA
        }

def load_compounds(path, drug_df):
    temp_dict = {}
    for dir in glob(f"{path}/*"):
        if os.path.exists(f"{dir}/network_interactions.csv"):
            compound = Compound(dir, drug_df)
            temp_dict[compound.compound_name] = compound
    return temp_dict

@app.route("/api/setDataset", methods=['POST'])
@login_required
def set_dataset():
    data = request.get_json()
    dataset = data.get('algorithm')
    if dataset not in ['Random Forest', 'XGBoost']:
        return jsonify(success=False, message="Invalid dataset"), 400
    
    session['current_dataset'] = 'RF' if dataset == 'Random Forest' else 'XGBOOST'
    return jsonify(success=True, message=f"Dataset set to {dataset}"), 200

@app.route("/api/compounds")
@login_required
def get_compounds():
    """Return a list of all compounds as a dict based on the current dataset"""
    current_dataset = session.get('current_dataset', 'RF')  # Default to RF if not set
    tmp_dict = {"RF": RF_DICT, "XGBOOST": XGBOOST_DICT}[current_dataset]
    return jsonify([compound.to_dict() for compound in tmp_dict.values()])

@app.route("/api/<compound>/network")
@login_required
def get_network(compound):
    # return the pandas dataframe as html table
    current_dataset = session.get('current_dataset', 'RF')  # Default to RF if not set
    tmp_dict = {"RF": RF_DICT, "XGBOOST": XGBOOST_DICT}[current_dataset]
    return tmp_dict[compound].network.to_json(orient="records")

@app.route("/api/<compound>/train_results")
@login_required
def get_train_results(compound):
    # return the image using flask send_file
    current_dataset = session.get('current_dataset', 'RF')  # Default to RF if not set
    tmp_dict = {"RF": RF_DICT, "XGBOOST": XGBOOST_DICT}[current_dataset]
    return send_file(tmp_dict[compound].train_results, mimetype='image/png')

@app.route('/api/<compound>/shap')
@login_required
def get_shap(compound):
    current_dataset = session.get('current_dataset', 'RF')  # Default to RF if not set
    tmp_dict = {"RF": RF_DICT, "XGBOOST": XGBOOST_DICT}[current_dataset]
    return send_file(tmp_dict[compound].shap_plot, mimetype='image/png')

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
    # map the compound to mechanism
    drug_df = pd.read_csv("../../data/meta/Repurposing_Public_23Q2_Extended_Primary_Compound_List.csv")
    drug_df['Drug.Name'] = drug_df['Drug.Name'].str.lower()
    # Initial load of the default dataset (RF)
    RF_DICT = load_compounds(RF_DATA_PATH, drug_df)
    XGBOOST_DICT = load_compounds(XGBOOST_DATA_PATH, drug_df)
    REP1K_DICT = load_compounds(REP1K_DATA_PATH, drug_df)
    # combine XGBOOST and REP1K
    XGBOOST_DICT.update(REP1K_DICT)
    print(f"Loaded {len(RF_DICT)} compounds for Random Forest")
    print(f"Loaded {len(XGBOOST_DICT)} compounds for XGBoost")
    # how many RF_DICT have MOA != None? 
    moa_count = sum(1 for compound in RF_DICT.values() if compound.MOA != "")
    print(f"{moa_count} compounds in Random Forest have MOA not equal to None")
    # how many XGBOOST_DICT have MOA != None?
    moa_count = sum(1 for compound in XGBOOST_DICT.values() if compound.MOA != "")
    print(f"{moa_count} compounds in XGBoost have MOA not equal to None")

    app.run()
