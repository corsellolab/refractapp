from flask import Flask, send_file, jsonify
from glob import glob
import sys
import os
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_PATH = "../data/xgboost"
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
    
@app.route("/compounds")
def get_compounds():
    """Return a list of all compounds as a dict"""
    out = [compound.to_dict() for compound in COMPOUND_DICT.values()]
    return jsonify(out)

@app.route("/<compound>/network")
def get_network(compound):
    # return the pandas dataframe as html table
    return COMPOUND_DICT[compound].network.to_html()

@app.route("/<compound>/train_results")
def get_train_results(compound):
    # retunr the image using flask send_file
    return send_file(COMPOUND_DICT[compound].train_results, mimetype='image/png')

@app.route('/<compound>/shap')
def get_shap(compound):
    return send_file(COMPOUND_DICT[compound].shap_plot, mimetype='image/png')

if __name__ == '__main__':
    for dir in glob(f"{DATA_PATH}/*"):
        compound = Compound(dir)
        COMPOUND_DICT[compound.compound_name] = compound
    app.run()
