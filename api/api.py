from flask import Flask, send_file, jsonify, request
from glob import glob
import sys
import os
import pandas as pd
from flask_bcrypt import Bcrypt

app = Flask(__name__)
bcrypt = Bcrypt(app)

users = {
    "nick": bcrypt.generate_password_hash('testpwd').decode('utf-8'),
    "steven": bcrypt.generate_password_hash("security_best_practics").decode("utf-8")
}

DATA_PATH = "../../data/xgboost_all_features"
COMPOUND_DICT = {}

class Compound:
    def __init__(self, dir):
        self.compound_name = os.path.basename(dir)
        self.network = pd.read_csv(f"{dir}/network_interactions.csv")
        self.shap_plot = os.path.abspath(f"{dir}/shap_summary_plot.png")
        self.train_results = os.path.abspath(f"{dir}/train_results.png")
        with open(f"{dir}/train_corr.txt", "r") as f:
            self.train_corr = f.read()
        self.num_edges = len(self.network)

    def to_dict(self):
        return {
            "Drug Name": self.compound_name,
            "Pearson R": self.train_corr,
            "Connectivity": self.num_edges / 2,
        }
    
@app.route("/api/compounds")
def get_compounds():
    """Return a list of all compounds as a dict"""
    out = [compound.to_dict() for compound in COMPOUND_DICT.values()]
    return jsonify(out)

@app.route("/api/<compound>/network")
def get_network(compound):
    # return the pandas dataframe as html table
    return COMPOUND_DICT[compound].network.to_json(orient="records")

@app.route("/api/<compound>/train_results")
def get_train_results(compound):
    # retunr the image using flask send_file
    return send_file(COMPOUND_DICT[compound].train_results, mimetype='image/png')

@app.route('/api/<compound>/shap')
def get_shap(compound):
    return send_file(COMPOUND_DICT[compound].shap_plot, mimetype='image/png')

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    print(data)

    username = data.get('username')
    password = data.get('password')

    # Verify the user exists and the password is correct
    if username in users and bcrypt.check_password_hash(users[username], password):
        return jsonify(success=True), 200

    return jsonify(success=False), 401

if __name__ == '__main__':
    for dir in glob(f"{DATA_PATH}/*/*"):
        if os.path.exists(f"{dir}/network_interactions.csv"):
            compound = Compound(dir)
            COMPOUND_DICT[compound.compound_name] = compound
    app.run()
