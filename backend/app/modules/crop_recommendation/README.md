# Crop Recommendation AI Module

## Overview
Recommends optimal crop selection using a multi-feature **Decision Tree** classifier.

## Dataset Constraints
- **Supported Crops**: Exactly 22 crops (`rice`, `maize`, `chickpea`, `kidneybeans`, `pigeonpeas`, `mothbeans`, `mungbean`, `blackgram`, `lentil`, `pomegranate`, `banana`, `mango`, `grapes`, `watermelon`, `muskmelon`, `apple`, `orange`, `papaya`, `coconut`, `cotton`, `jute`, `coffee`).
- **Features**: N, P, K (soil nutrients), pH, ambient temperature, relative humidity, rainfall.

## Pipeline Integration Constraint
- Only **Rice** and **Maize** can transition directly into the Crop Yield Prediction pipeline.

## Separation of Concerns
- `inference.py`: Production-grade inference engine; does not train or modify weights.
- `training.py`: Supervised training routines and evaluation metrics (deferred until data verification).
