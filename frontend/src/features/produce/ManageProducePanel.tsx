import { useState, useEffect, type FormEvent } from "react";
import { ApiRequestError } from "../../api/api";
import { getFruitTypes, createFruitType } from "../../api/farmApi";
import { type FruitType } from "../../types/farm";

function mapError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 409) return "A fruit type with that name already exists.";
    if (error.status === 400) return "Invalid details — check name and rate.";
    return error.message;
  }
  return "Unexpected error.";
}

export function ManageProducePanel() {
  const [fruitTypes, setFruitTypes] = useState<FruitType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({ name: "", amdPerKg: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadFruitTypes = () => {
    setIsLoading(true);
    getFruitTypes()
      .then(setFruitTypes)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let isCancelled = false;

    getFruitTypes()
      .then((types) => {
        if (!isCancelled) {
          setFruitTypes(types);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = form.name.trim();
    const amdPerKg = Math.round(Number(form.amdPerKg));

    if (!name) { setError("Name is required."); return; }
    if (!Number.isFinite(amdPerKg) || amdPerKg <= 0) { setError("Enter a valid rate greater than 0."); return; }

    setIsSubmitting(true);
    setError("");
    setSuccessMessage("");
    try {
      await createFruitType({ name, amdPerKg });
      setSuccessMessage(`"${name}" added at ֏${amdPerKg.toLocaleString()}/kg.`);
      setForm({ name: "", amdPerKg: "" });
      loadFruitTypes();
    } catch (err) {
      setError(mapError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel">
      <h2>Manage Produce</h2>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Fruit / Produce Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Blueberry"
            disabled={isSubmitting}
          />
        </label>

        <label className="field">
          <span>Rate (֏ per kg)</span>
          <input
            type="number"
            min="1"
            step="1"
            value={form.amdPerKg}
            onChange={(e) => setForm({ ...form, amdPerKg: e.target.value })}
            placeholder="e.g. 350"
            disabled={isSubmitting}
          />
        </label>

        <div className="button-row">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Produce Type"}
          </button>
        </div>
      </form>

      {error && (
        <div className="status status-error" style={{ marginTop: "1rem" }}>
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="status" style={{ marginTop: "1rem", background: "#f0faf3", border: "1px solid #9fcfae", color: "#1e5c33" }}>
          <p>{successMessage}</p>
        </div>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.75rem", color: "#424b5a", fontSize: "1rem" }}>
          Current Produce Types
        </h3>

        {isLoading ? (
          <p style={{ color: "#596477", fontSize: "0.9rem" }}>Loading...</p>
        ) : fruitTypes.length === 0 ? (
          <p style={{ color: "#596477", fontSize: "0.9rem" }}>No produce types yet — add one above.</p>
        ) : (
          <div className="result-stack">
            {fruitTypes.map((ft) => (
              <section className="result-card" key={ft.id}>
                <h3 style={{ marginBottom: "0.5rem" }}>{ft.name}</h3>
                <dl className="result-grid">
                  <dt>Rate</dt>
                  <dd>{ft.amdPerKg != null ? `֏${ft.amdPerKg.toLocaleString()}/kg` : "—"}</dd>
                </dl>
              </section>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
