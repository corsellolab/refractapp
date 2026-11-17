#!/usr/bin/env python3
"""Build endpoint_metadata.csv (name, target, MOA, ...) from every results/<ENDPOINT>/summary.json.

Names, targets, MOAs and drug classes for all endpoints already come from
visualizations/data/mixing_weights.csv. The extra fields here (indication, disease area,
clinical phase, response unit, source release) only exist inside each endpoint's summary.json.
Run this once where the full bundle lives (e.g. on Sherlock) to collect them into one small CSV.

Usage:
    python3 build_endpoint_metadata.py /path/to/data/results endpoint_metadata.csv

Standard library only, so it runs with any Python 3.
"""
import csv
import json
import os
import sys

FIELDS = [
    "endpoint",
    "variable_id",
    "variable_name",
    "modality",
    "gene_symbol",
    "target",
    "mechanism_of_action",
    "indication",
    "disease_area",
    "clinical_phase",
    "unit",
    "source_release",
]


def main(results_dir, out_path):
    names = sorted(os.listdir(results_dir))
    written = 0
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for i, endpoint in enumerate(names, 1):
            path = os.path.join(results_dir, endpoint, "summary.json")
            if not os.path.isfile(path):
                continue
            with open(path) as sf:
                response = json.load(sf).get("response", {})
            row = {"endpoint": endpoint}
            for field in FIELDS[1:]:
                value = response.get(field)
                row[field] = "" if value is None else value
            writer.writerow(row)
            written += 1
            if i % 1000 == 0:
                print(f"{i}/{len(names)} folders scanned", file=sys.stderr)
    print(f"Wrote {written} endpoints to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
