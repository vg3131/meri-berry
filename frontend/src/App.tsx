import { useState } from "react";
import "./App.css";
import { createWeighIn, getWorkerSummary } from "./api/farmApi";
import { type CreateWeighInPayload } from "./api/farmApi";
import { TopNav } from "./components/layout/TopNav";
import { HomePanel } from "./features/home/HomePanel";
import { ManageProducePanel } from "./features/produce/ManageProducePanel";
import { PayWorkerPanel } from "./features/pay/PayWorkerPanel";
import { WorkerSummaryForm } from "./features/summary/WorkerSummaryForm";
import { WeighProductForm } from "./features/weigh/WeighProductForm";
import { WorkerLedgerPanel } from "./features/ledger/WorkerLedgerPanel";
import { OutstandingPanel } from "./features/outstanding/OutstandingPanel";
import { type TabKey } from "./types/farm";

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("home");

  const handleRecordWeighIn = (payload: CreateWeighInPayload) =>
    createWeighIn(payload);

  const handleSearchWorkerSummary = (workerNumber: string) =>
    getWorkerSummary(workerNumber);

  return (
    <div className="app-shell">
      <TopNav activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="content">
        <header className="branding">
          <h1>Meri-Berry</h1>
          <p>Fruit Picking Analytics Dashboard</p>
        </header>

        {activeTab === "home" && <HomePanel />}
        {activeTab === "weigh" && (
          <WeighProductForm onRecordWeighIn={handleRecordWeighIn} />
        )}
        {activeTab === "pay" && <PayWorkerPanel />}
        {activeTab === "summary" && (
          <WorkerSummaryForm onSearchWorkerSummary={handleSearchWorkerSummary} />
        )}
        {activeTab === "ledger" && <WorkerLedgerPanel />}
        {activeTab === "outstanding" && <OutstandingPanel />}
        {activeTab === "produce" && <ManageProducePanel />}
      </main>
    </div>
  );
}

export default App;
