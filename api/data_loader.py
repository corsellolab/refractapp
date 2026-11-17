"""Loads the data bundle and answers the dashboard's queries.

Run-level tables (visualizations/data/, panel/) cover all 9,729 endpoints and are always loaded.
Per-endpoint folders under results/ are optional: when an endpoint's folder is present we add
its plots, full metrics, top features and predictions.
"""
import json
import math
import os
import re

import pandas as pd

MODELS = [
    "lightgbm",
    "xgboost",
    "rf",
    "elasticnet",
    "rf_modality_ridge",
    "lgbm_modality_ridge",
    "xgb_modality_ridge",
]
DEFAULT_MODEL = "xgboost"

# Share of endpoints with best r >= this counts as "predictable" (method_description.md, section 10)
PREDICTABLE_R = 0.3

SCREEN_LABELS = {
    "Primary": "PRISM primary",
    "Secondary": "PRISM secondary",
    "Gene dependency": "Gene dependency",
}

FEATURE_MODALITY_LABELS = {
    "ge": "Expression",
    "cna": "Copy number",
    "crispr": "CRISPR",
    "prot": "Protein",
    "lin": "Lineage",
    "mutdam": "Damaging mutation",
    "muths": "Hotspot mutation",
    "fus": "Fusion",
    "gfeat": "Genomic feature",
}

# Additive components of the XGBoost + modality-ridge hybrid (mixing_weights.csv)
WEIGHT_COMPONENTS = [
    ("w_xgb", "XGBoost (tree)"),
    ("w_ridge_ge", "Ridge: expression"),
    ("w_ridge_cna", "Ridge: copy number"),
    ("w_ridge_crispr", "Ridge: CRISPR"),
    ("w_ridge_prot", "Ridge: protein"),
    ("w_ridge_lin", "Ridge: lineage"),
    ("w_ridge_mutdam", "Ridge: damaging mut."),
    ("w_ridge_muths", "Ridge: hotspot mut."),
    ("w_ridge_fus", "Ridge: fusion"),
    ("w_ridge_gfeat", "Ridge: genomic sig."),
]

FIGURES = [
    ("fig1_predictability_ecdf", "Predictability across endpoints",
     "Cumulative distribution of the best model's Pearson r for each screen."),
    ("fig2_model_performance_predictable", "Model performance on predictable endpoints",
     "Mean out-of-fold Pearson r (95% CI) per model, endpoints with best r ≥ 0.3."),
    ("fig3_best_model_share_predictable", "Which model wins",
     "How often each of the seven models is best, among predictable endpoints."),
    ("fig4_paired_model_comparisons", "Paired model comparisons",
     "Head-to-head differences in r between model pairs on the same endpoints."),
    ("fig5_hybrid_gain_by_predictability", "Hybrid gain by predictability",
     "Gain of the modality-ridge hybrids over their standalone models, binned by best r."),
    ("fig6_selection_size_by_predictability", "Selection size by predictability",
     "Number of selected features grows with how predictable the endpoint is."),
    ("fig7_selection_modality_composition", "What gets selected",
     "Share of selected features from each data type, sparse selection vs. RF top-K."),
    ("fig_xgbridge_vs_rf", "XGBoost hybrid vs. random forest",
     "Per-endpoint comparison of the XGBoost + modality-ridge hybrid against RF."),
    ("fig_weight_clusters", "Hybrid weight profiles",
     "Clusters of drugs by how the hybrid weights each data type."),
    ("fig_weight_table", "Hybrid weight summary",
     "Mean weight per hybrid component and how often each is zero or above 0.5."),
    ("vignette_mapk_hotspots", "Vignette: MAPK pathway hotspots",
     "MAPK-pathway drugs and the hotspot mutations selected for them."),
    ("vignette_psmg_kras", "Vignette: PSMG and KRAS",
     "Gene-dependency example linking PSMG genes and KRAS."),
]


def clean(value):
    """Make a value JSON-safe (NaN -> None, numpy scalars -> Python)."""
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean(v) for v in value]
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    return value


def _rows(df):
    return clean(df.to_dict(orient="records"))


def _text(value):
    if value is None or (isinstance(value, float) and math.isnan(value)) or value == "":
        return None
    return str(value)


def _round(value, digits=3):
    return None if value is None or (isinstance(value, float) and math.isnan(value)) else round(float(value), digits)


def _name_from_variable_id(variable_id):
    # "PRISM_PRIMARY::BRD:BRD-A000..." -> "BRD-A000...", "GENE_DEPENDENCY::KRAS" -> "KRAS"
    name = str(variable_id).split("::", 1)[-1]
    return name[4:] if name.startswith("BRD:") else name


def feature_gene(feature_id):
    prefix, _, rest = str(feature_id).partition("_")
    return rest if prefix in ("GE", "CNA", "CRISPR", "PROT", "MUTDAM", "MUTHS") else None


class DataStore:
    def __init__(self, bundle_path, results_path=None):
        self.bundle_path = os.path.abspath(bundle_path)
        self.results_path = os.path.abspath(results_path or os.path.join(bundle_path, "results"))
        self.viz_path = os.path.join(self.bundle_path, "visualizations")
        data_dir = os.path.join(self.viz_path, "data")

        perf = pd.read_csv(os.path.join(data_dir, "endpoint_performance.csv"))
        mixing = pd.read_csv(os.path.join(data_dir, "mixing_weights.csv"))
        panel = pd.read_csv(os.path.join(self.bundle_path, "panel", "response_panel.csv"))

        meta_cols = ["endpoint", "variable_name", "mechanism_of_action", "target", "drug_class"]
        self.index = (
            perf.merge(mixing[meta_cols], on="endpoint", how="left")
            .merge(
                panel[["output_directory", "variable_id"]].rename(columns={"output_directory": "endpoint"}),
                on="endpoint",
                how="left",
            )
            .set_index("endpoint", drop=False)
        )
        self.weights = mixing.set_index("endpoint")[[c for c, _ in WEIGHT_COMPONENTS]]

        selected = pd.read_parquet(os.path.join(self.bundle_path, "panel", "all_selected_features.parquet"))
        for col in ("feature_id", "modality", "feature_type", "endpoint"):
            selected[col] = selected[col].astype("category")
        self.selected = selected
        self.feature_catalog = (
            selected.groupby(["feature_id", "modality"], observed=True)
            .size()
            .rename("n_endpoints")
            .reset_index()
            .sort_values("n_endpoints", ascending=False)
        )
        self.feature_catalog["feature_lower"] = self.feature_catalog["feature_id"].str.lower()

        failed_path = os.path.join(self.bundle_path, "panel", "failed_endpoints.csv")
        self.failed = pd.read_csv(failed_path) if os.path.exists(failed_path) else pd.DataFrame()

        # Endpoints whose full results folder is available locally
        self.local = {
            name
            for name in (os.listdir(self.results_path) if os.path.isdir(self.results_path) else [])
            if os.path.isfile(os.path.join(self.results_path, name, "summary.json"))
        }
        self._summaries = {}
        self.endpoint_list = [self._list_row(row) for row in self.index.itertuples(index=False)]
        self.by_id = {r["id"]: r for r in self.endpoint_list}

    # ---------- endpoint list ----------

    def _list_row(self, row):
        pearson = {m: _round(getattr(row, f"r_{m}")) for m in MODELS}
        scored = {m: r for m, r in pearson.items() if r is not None}
        best_model = max(scored, key=scored.get) if scored else None
        local = self.summary(row.endpoint)
        response = local.get("response", {}) if local else {}
        name = _text(row.variable_name) or _text(response.get("variable_name")) or _name_from_variable_id(_text(row.variable_id) or row.endpoint)
        return {
            "id": row.endpoint,
            "Name": name,
            "Type": SCREEN_LABELS.get(row.screen, row.screen),
            "Class": _text(row.drug_class) if row.screen != "Gene dependency" else None,
            "Cell Lines": None if pd.isna(row.n_lines) else int(row.n_lines),
            "# Selected": None if pd.isna(row.n_selected) else int(row.n_selected),
            "Best R": _round(row.best_r),
            "Best Model": best_model,
            "Target": _text(row.target) or _text(response.get("target")),
            "MOA": _text(row.mechanism_of_action) or _text(response.get("mechanism_of_action")),
            "pearson": pearson,
            "has_results": row.endpoint in self.local,
        }

    def has(self, endpoint_id):
        return endpoint_id in self.index.index

    def summary(self, endpoint_id):
        if endpoint_id not in self.local:
            return None
        if endpoint_id not in self._summaries:
            with open(os.path.join(self.results_path, endpoint_id, "summary.json")) as f:
                self._summaries[endpoint_id] = json.load(f)
        return self._summaries[endpoint_id]

    def endpoint_dir(self, endpoint_id):
        return os.path.join(self.results_path, endpoint_id) if endpoint_id in self.local else None

    # ---------- endpoint detail ----------

    def detail(self, endpoint_id):
        row = self.index.loc[endpoint_id]
        list_row = self.by_id[endpoint_id]
        summary = self.summary(endpoint_id)
        response = summary.get("response", {}) if summary else {}

        info = {
            "Variable ID": _text(row.get("variable_id")),
            "Gene": _text(response.get("gene_symbol")),
            "Indication": _text(response.get("indication")),
            "Disease area": _text(response.get("disease_area")),
            "Clinical phase": _text(response.get("clinical_phase")),
            "Response unit": _text(response.get("unit")),
            "Source": _text(response.get("source_release")),
        }

        if summary:
            performance = [
                {k: v for k, v in p.items() if k not in ("tail_direction", "n_total")}
                for p in summary.get("predictive", {}).get("performance", [])
            ]
            tail_direction = next(
                (p.get("tail_direction") for p in summary.get("predictive", {}).get("performance", [])), None
            )
        else:
            performance = [
                {"model": m, "pearson_r": row.get(f"r_{m}"), "precision_at_10pct": row.get(f"tail_{m}")}
                for m in MODELS
            ]
            tail_direction = None

        weights = []
        if endpoint_id in self.weights.index:
            w = self.weights.loc[endpoint_id]
            weights = [{"component": label, "weight": w[col]} for col, label in WEIGHT_COMPONENTS]

        return clean({
            **list_row,
            "info": {k: v for k, v in info.items() if v},
            "performance": performance,
            "tail_direction": tail_direction,
            "weights": weights,
            "selected_features": self.selected_features(endpoint_id),
        })

    def selected_features(self, endpoint_id):
        rows = self.selected[self.selected["endpoint"] == endpoint_id].sort_values("sel_rank")
        out = rows[["sel_rank", "feature_id", "modality", "paired_exceedance_frequency", "mean_excess_importance", "rf_rank"]].copy()
        out["modality"] = out["modality"].astype(str).map(lambda m: FEATURE_MODALITY_LABELS.get(m, m))
        out["feature_id"] = out["feature_id"].astype(str)
        out["gene"] = out["feature_id"].map(feature_gene)
        return _rows(out)

    def top_features(self, endpoint_id, model, limit=50):
        path = os.path.join(self.results_path, endpoint_id, "predictive", "feature_importance.csv")
        if endpoint_id not in self.local or not os.path.exists(path):
            return None
        df = pd.read_csv(path, usecols=["model", "feature_id", "mean_abs_shap", "fold_fraction", "rank", "modality", "gene_symbol"])
        df = df[df["model"] == model].sort_values("rank").head(limit)
        df["modality"] = df["modality"].map(lambda m: FEATURE_MODALITY_LABELS.get(m, m))
        return _rows(df.drop(columns="model"))

    def predictions(self, endpoint_id, model):
        path = os.path.join(self.results_path, endpoint_id, "predictive", "predictions.csv")
        if endpoint_id not in self.local or not os.path.exists(path):
            return None
        df = pd.read_csv(path, usecols=["sample_id", "response", "fold", model])
        df = df.rename(columns={"response": "observed", model: "predicted"}).dropna(subset=["observed", "predicted"])
        return _rows(df)

    # ---------- feature lookup ----------

    def search_features(self, query, limit=25):
        q = query.strip().lower()
        if not q:
            return []
        cat = self.feature_catalog
        hits = cat[cat["feature_lower"].str.contains(re.escape(q), regex=True)]
        # Exact gene matches (e.g. "kras" -> MUTHS_KRAS, GE_KRAS, ...) first, then by popularity
        exact = hits["feature_lower"].str.split("_", n=1).str[-1] == q
        hits = pd.concat([hits[exact], hits[~exact]]).head(limit)
        return [
            {
                "feature_id": r.feature_id,
                "modality": FEATURE_MODALITY_LABELS.get(r.modality, r.modality),
                "n_endpoints": int(r.n_endpoints),
            }
            for r in hits.itertuples(index=False)
        ]

    def feature_endpoints(self, feature_id):
        rows = self.selected[self.selected["feature_id"] == feature_id]
        if rows.empty:
            return None
        out = []
        for r in rows.sort_values("paired_exceedance_frequency", ascending=False).itertuples(index=False):
            ep = self.by_id.get(r.endpoint, {})
            out.append({
                "id": r.endpoint,
                "Name": ep.get("Name", r.endpoint),
                "Type": ep.get("Type"),
                "Target": ep.get("Target"),
                "MOA": ep.get("MOA"),
                "Best R": ep.get("Best R"),
                "Selection rank": int(r.sel_rank),
                "Exceedance": _round(r.paired_exceedance_frequency, 2),
                "RF rank": None if pd.isna(r.rf_rank) else int(r.rf_rank),
                "has_results": ep.get("has_results", False),
            })
        modality = str(rows["modality"].iloc[0])
        return {
            "feature_id": feature_id,
            "modality": FEATURE_MODALITY_LABELS.get(modality, modality),
            "gene": feature_gene(feature_id),
            "endpoints": out,
        }

    # ---------- run overview ----------

    def overview(self):
        idx = self.index
        screens = []
        for screen in ["Gene dependency", "Primary", "Secondary"]:
            g = idx[idx["screen"] == screen]
            if g.empty:
                continue
            predictable = g[g["best_r"] >= PREDICTABLE_R]
            screens.append({
                "screen": SCREEN_LABELS[screen],
                "n_endpoints": len(g),
                "n_predictable": len(predictable),
                "share_predictable": len(predictable) / len(g),
                "median_best_r": g["best_r"].median(),
                "median_selected": g["n_selected"].median(),
            })
        figures = [
            {"name": name, "title": title, "caption": caption}
            for name, title, caption in FIGURES
            if os.path.exists(os.path.join(self.viz_path, f"{name}.png"))
        ]
        weight_table_path = os.path.join(self.viz_path, "data", "weight_table.csv")
        weight_table = _rows(pd.read_csv(weight_table_path)) if os.path.exists(weight_table_path) else []
        return clean({
            "n_endpoints": len(idx),
            "n_failed": len(self.failed),
            "n_local": len(self.local),
            "predictable_r": PREDICTABLE_R,
            "screens": screens,
            "figures": figures,
            "weight_table": weight_table,
        })

    def figure_path(self, name):
        if name not in {f for f, _, _ in FIGURES}:
            return None
        path = os.path.join(self.viz_path, f"{name}.png")
        return path if os.path.exists(path) else None

    # ---------- methods ----------

    def methods(self):
        def read(path):
            with open(path) as f:
                return f.read()

        method_path = os.path.join(self.bundle_path, "method_description.md")
        readme_path = os.path.join(self.bundle_path, "README.md")
        known_gaps = None
        if os.path.exists(readme_path):
            match = re.search(r"^## Known gaps.*?(?=^## |\Z)", read(readme_path), flags=re.S | re.M)
            known_gaps = match.group(0) if match else None
        failed = self.failed.drop(columns=[c for c in ("workdir",) if c in self.failed.columns])
        return clean({
            "method": read(method_path) if os.path.exists(method_path) else None,
            "known_gaps": known_gaps,
            "failed": _rows(failed),
        })
