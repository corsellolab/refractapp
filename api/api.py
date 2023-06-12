from flask import Flask, send_file
from glob import glob
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_PATH = "../data/xgboost"

@app.route("/compounds")
def get_compounds():
    paths = glob(f"{DATA_PATH}/*")


@app.route('/image')
def get_image():
    image_path = '/Users/nick/Desktop/refract_app/data/xgboost/3-MPPI/shap_summary_plot.png'
    return send_file(image_path, mimetype='image/png')

if __name__ == '__main__':
    app.run()
