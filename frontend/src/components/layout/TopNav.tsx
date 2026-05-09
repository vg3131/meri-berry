import { type TabKey } from "../../types/farm";

type TopNavProps = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

const navItems: Array<{ key: TabKey; label: string }> = [
  { key: "home", label: "Home" },
  { key: "weigh", label: "Weigh Product" },
  { key: "pay", label: "Pay Worker" },
  { key: "summary", label: "Worker Summary" },
  { key: "produce", label: "Manage Produce" },
];

export function TopNav({ activeTab, onTabChange }: TopNavProps) {
  return (
    <nav className="top-nav" aria-label="Dashboard tabs">
      {navItems.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`nav-item ${activeTab === item.key ? "active" : ""}`}
          onClick={() => onTabChange(item.key)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
