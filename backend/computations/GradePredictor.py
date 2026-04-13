from __future__ import annotations

from pathlib import Path
from typing import Any

import numpy as np
from tensorflow.keras.layers import Dense  # type: ignore
from tensorflow.keras.models import load_model  # type: ignore


class GradePredictor:
	"""Predicts a student's expected grade from raw profile fields."""

	FEATURE_ORDER = [
		"age",
		"attendance_percentage",
		"sleep_hours",
		"exercise_frequency",
		"mental_health_rating",
		"study_hours_per_day",
		"gender_Female",
		"gender_Male",
		"gender_Other",
	]

	SCALER_MEAN = np.array([
		20.498,
		84.1317,
		6.4701,
		3.042,
		5.438,
		3.5501000000000005,
		0.481,
		0.477,
		0.042,
	], dtype=np.float32)

	SCALER_SCALE = np.array([
		2.306945166231742,
		9.394545497787533,
		1.225763431498917,
		2.0244100375171032,
		2.846077300425974,
		1.4681553017307127,
		0.49963886958482323,
		0.4994707198625361,
		0.20058913230780973,
	], dtype=np.float32)

	REQUIRED_FIELDS = {
		"age",
		"gender",
		"attendance_percentage",
		"sleep_hours",
		"exercise_frequency",
		"mental_health_rating",
		"study_hours_per_day",
	}

	def __init__(self, model_path: str | Path = "data/model.keras"):
		self.model_path = str(self._resolve_model_path(model_path))
		self.model = self._load_keras_model(self.model_path)

	def predict_grade(self, student_data: dict[str, Any]) -> float:
		"""Returns a single predicted grade as a float."""
		validated = self._validate_input(student_data)
		model_input = self._prepare_features(validated)
		prediction = self.model.predict(model_input, verbose=0)

		if isinstance(prediction, (list, tuple)):
			first = prediction[0]
			if isinstance(first, (list, tuple)):
				return float(first[0])
			return float(first)
		return float(prediction)

	def _validate_input(self, student_data: dict[str, Any]) -> dict[str, Any]:
		missing_fields = self.REQUIRED_FIELDS - student_data.keys()
		if missing_fields:
			missing_str = ", ".join(sorted(missing_fields))
			raise ValueError(f"Missing required fields: {missing_str}")

		validated = {
			"age": int(student_data["age"]),
			"gender": str(student_data["gender"]).strip().lower(),
			"attendance_percentage": float(student_data["attendance_percentage"]),
			"sleep_hours": float(student_data["sleep_hours"]),
			"exercise_frequency": int(student_data["exercise_frequency"]),
			"mental_health_rating": int(student_data["mental_health_rating"]),
			"study_hours_per_day": float(student_data["study_hours_per_day"]),
		}

		if not 0.0 <= validated["attendance_percentage"] <= 100.0:
			raise ValueError("attendance_percentage must be between 0 and 100")
		if validated["age"] <= 0:
			raise ValueError("age must be greater than 0")
		if validated["sleep_hours"] <= 0:
			raise ValueError("sleep_hours must be greater than 0")
		if validated["exercise_frequency"] < 0:
			raise ValueError("exercise_frequency must be >= 0")
		if not 1 <= validated["mental_health_rating"] <= 10:
			raise ValueError("mental_health_rating must be between 1 and 10")
		if validated["study_hours_per_day"] < 0:
			raise ValueError("study_hours_per_day must be >= 0")

		if validated["gender"] not in {"male", "female", "other"}:
			raise ValueError("gender must be one of: Male, Female, Other")

		return validated

	def _prepare_features(self, validated: dict[str, Any]):
		"""
		Builds a 3-hot gender encoded feature vector in training feature order,
		then applies standard scaling:
		x_scaled = (x - mean) / scale

		Input order:
		age, attendance_percentage, sleep_hours, exercise_frequency,
		mental_health_rating, study_hours_per_day,
		gender_Female, gender_Male, gender_Other
		"""
		input_width = self._infer_input_width()
		if input_width != 9:
			raise ValueError(
				"Unsupported model input shape. Expected 9 features for 3-hot gender encoding, "
				f"but got {input_width}."
			)

		gender = validated["gender"]
		female = 1.0 if gender == "female" else 0.0
		male = 1.0 if gender == "male" else 0.0
		other = 1.0 if gender == "other" else 0.0

		features = [
			float(validated["age"]),
			float(validated["attendance_percentage"]),
			float(validated["sleep_hours"]),
			float(validated["exercise_frequency"]),
			float(validated["mental_health_rating"]),
			float(validated["study_hours_per_day"]),
			female,
			male,
			other,
		]

		x = np.array(features, dtype=np.float32)
		x_scaled = (x - self.SCALER_MEAN) / self.SCALER_SCALE
		return np.array([x_scaled], dtype=np.float32)

	def _infer_input_width(self) -> int:
		input_shape = self.model.input_shape

		if isinstance(input_shape, list):
			# Single-input models may still expose a list shape.
			input_shape = input_shape[0]

		if not isinstance(input_shape, tuple) or len(input_shape) < 2 or input_shape[-1] is None:
			raise ValueError(
				f"Could not infer model input width from shape: {self.model.input_shape}"
			)

		return int(input_shape[-1])

	@staticmethod
	def _load_keras_model(model_path: str):
		original_dense_init = Dense.__init__

		def dense_init_compat(self, *args, **kwargs):
			kwargs.pop("quantization_config", None)
			return original_dense_init(self, *args, **kwargs)

		Dense.__init__ = dense_init_compat
		try:
			return load_model(
				model_path,
				compile=False,
				safe_mode=False,
			)
		except Exception as exc:
			raise RuntimeError(
				"Failed to load model at "
				f"{model_path}. This is likely a Keras version mismatch between training and inference. "
				f"Original error: {exc}"
			) from exc
		finally:
			Dense.__init__ = original_dense_init

	@staticmethod
	def _resolve_model_path(model_path: str | Path) -> Path:
		raw_path = Path(model_path)
		if raw_path.is_absolute():
			return raw_path

		# Resolve relative paths from backend/ so "data/model.keras" works consistently.
		backend_root = Path(__file__).resolve().parent.parent
		return backend_root / raw_path