import { useState, useEffect, type FormEvent } from "react";
import { ApiRequestError } from "../../api/api";
import { getFruitTypes, type CreateWeighInPayload } from "../../api/farmApi";
import { type FruitType, type WeighInSubmissionResult } from "../../types/farm";

type WeighProductFormProps = {
  onRecordWeighIn: (payload: CreateWeighInPayload) => Promise<WeighInSubmissionResult>;
};

function mapWeighInError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 404) return "Worker or fruit type not found.";
    if (error.status === 400) return "Invalid weight.";
    if (error.status === 500) return "Server error / no rate configured.";
    return error.message;
  }
  return "Unexpected error while saving weigh-in.";
}

export function WeighProductForm({ onRecordWeighIn }: WeighProductFormProps) {
  const [weighForm, setWeighForm] = useState({
    workerNumber: "",
    weightKg: "",
    fruitTypeId: "",
  });
  const [fruitTypes, setFruitTypes] = useState<FruitType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [weighErrors, setWeighErrors] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<WeighInSubmissionResult | null>(null);

  useEffect(() => {
    getFruitTypes()
      .then(setFruitTypes)
      .catch(() => {});
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const workerNumber = weighForm.workerNumber.trim();
    const parsedWeight = Number(weighForm.weightKg);
    const fruitTypeId = Number(weighForm.fruitTypeId);
    const errors: string[] = [];

    if (!workerNumber) errors.push("Worker number is required.");
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) errors.push("Invalid weight.");
    if (!fruitTypeId) errors.push("Please select a fruit type.");

    if (errors.length > 0) {
      setWeighErrors(errors);
      setLastResult(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onRecordWeighIn({ workerNumber, weightKg: parsedWeight, fruitTypeId });
      setLastResult(result);
      setWeighErrors([]);
    } catch (error) {
      setLastResult(null);
      setWeighErrors([mapWeighInError(error)]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearForm = () => {
    setWeighForm({ workerNumber: "", weightKg: "", fruitTypeId: "" });
    setWeighErrors([]);
    setLastResult(null);
  };

  const selectedFruitType = fruitTypes.find((ft) => ft.id === Number(weighForm.fruitTypeId));


  return (
    <section className="panel">
      <h2>Weigh Product Form</h2>
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Worker Number</span>
          <input
            type="text"
            value={weighForm.workerNumber}
            onChange={(e) => setWeighForm({ ...weighForm, workerNumber: e.target.value })}
            placeholder="e.g. 101"
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="field">
          <span>Weight (kg)</span>
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={weighForm.weightKg}
            onChange={(e) => setWeighForm({ ...weighForm, weightKg: e.target.value })}
            placeholder="e.g. 12.5"
            required
            disabled={isSubmitting}
          />
        </label>

        <label className="field" style={{ gridColumn: "1 / -1" }}>
          <span>Fruit Type</span>
          <select
            value={weighForm.fruitTypeId}
            onChange={(e) => setWeighForm({ ...weighForm, fruitTypeId: e.target.value })}
            required
            disabled={isSubmitting}
            style={{ color: weighForm.fruitTypeId === "" ? "#8a93a6" : "#283143" }}
          >
            <option value="" disabled>Select a fruit type…</option>
            {fruitTypes.map((ft) => (
              <option key={ft.id} value={ft.id}>
                {ft.name}
                {ft.amdPerKg != null
                  ? ` — ֏${ft.amdPerKg.toLocaleString()}/kg`
                  : ""}
              </option>
            ))}
          </select>
          {selectedFruitType?.amdPerKg != null && (
            <span style={{ fontSize: "0.85rem", color: "#9f52e2", marginTop: "0.25rem" }}>
              Rate: ֏{selectedFruitType.amdPerKg.toLocaleString()} per kg
            </span>
          )}
        </label>

        <div className="button-row">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearForm}
            disabled={isSubmitting}
          >
            Reset / Clear
          </button>
        </div>
      </form>

      {weighErrors.length > 0 && (
        <div className="status status-error">
          {weighErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      )}

      {lastResult && (
        <div className="result-stack">
          <section className="result-card">
            <h3>Weigh-In Result</h3>
            <dl className="result-grid">
              <dt>ID</dt>
              <dd>{lastResult.weighIn.id}</dd>
              <dt>Worker Number</dt>
              <dd>{lastResult.weighIn.workerNumber}</dd>
              <dt>Fruit Type</dt>
              <dd>{lastResult.weighIn.fruitType}</dd>
              <dt>Weight (kg)</dt>
              <dd>{lastResult.weighIn.weightKg}</dd>
              <dt>Earned</dt>
              <dd>֏{lastResult.weighIn.earnedCents.toLocaleString()}</dd>
              <dt>Recorded At</dt>
              <dd>{lastResult.weighIn.recordedAt}</dd>
            </dl>
          </section>

          <section className="result-card">
            <h3>Updated Summary</h3>
            <dl className="result-grid">
              <dt>Total Weight (kg)</dt>
              <dd>{(lastResult.workerSummary.totalWeightGrams / 1000).toFixed(3)}</dd>
              <dt>Total Earned</dt>
              <dd>֏{lastResult.workerSummary.totalEarnedCents.toLocaleString()}</dd>
              <dt>Total Paid</dt>
              <dd>֏{lastResult.workerSummary.totalPaidCents.toLocaleString()}</dd>
              <dt>Outstanding</dt>
              <dd>֏{lastResult.workerSummary.outstandingCents.toLocaleString()}</dd>
            </dl>
          </section>
        </div>
      )}
    </section>
  );
}
