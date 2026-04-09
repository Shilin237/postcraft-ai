import * as XLSX from "xlsx";

export interface Topic {
  label: string;
  emoji: string;
  color: string;
}

export interface Subtopic {
  label: string;
  icon: string;
}

export interface TopicStore {
  topics: Topic[];
  subtopics: Record<string, Subtopic[]>;
}

const COLORS = [
  "#FF6B35","#6C63FF","#FFD93D","#00C9A7","#FF3366",
  "#F7931E","#4f8ef7","#34d399","#a78bfa","#fbbf24",
];

const DEFAULT_STORE: TopicStore = {
  topics: [
    { label: "Leadership",       emoji: "👑", color: "#FF6B35" },
    { label: "Career Growth",    emoji: "🚀", color: "#6C63FF" },
    { label: "Entrepreneurship", emoji: "💡", color: "#FFD93D" },
    { label: "Tech & AI",        emoji: "🤖", color: "#00C9A7" },
    { label: "Productivity",     emoji: "⚡", color: "#FF3366" },
    { label: "Personal Brand",   emoji: "✨", color: "#F7931E" },
    { label: "Work Culture",     emoji: "🏢", color: "#6C63FF" },
    { label: "Mindset",          emoji: "🧘", color: "#00C9A7" },
    { label: "Software Dev",     emoji: "💻", color: "#6C63FF" },
    { label: "Learning & AI",    emoji: "📚", color: "#00C9A7" },
    { label: "Finance",          emoji: "💰", color: "#34d399" },
  ],
  subtopics: {
    "Finance": [
      { label: "ACCA",                        icon: "📜" },
      { label: "ACCA Interview Questions",    icon: "🎤" },
      { label: "AI in Finance",               icon: "🤖" },
      { label: "CA Tips & Tricks",            icon: "💡" },
      { label: "Latest Finance News",         icon: "📰" },
      { label: "Finance Interview Questions", icon: "🎯" },
      { label: "Accounting Closing Entries",  icon: "📒" },
      { label: "Fed Decision",                icon: "🏦" },
      { label: "Financial Model Techniques",  icon: "📊" },
      { label: "Budgeting & Forecasting",     icon: "🗓️" },
      { label: "Cashflow Management",         icon: "💸" },
      { label: "Financial Planning & Analysis", icon: "📈" },
    ],
    "Software Dev": [
      { label: "Artificial Intelligence", icon: "🤖" },
      { label: "AI / ML",                 icon: "🧠" },
      { label: "Machine Learning",        icon: "📊" },
      { label: "Gen AI",                  icon: "✨" },
      { label: "AI Agents",               icon: "🦾" },
      { label: "C# Development",          icon: "⚡" },
      { label: "C# Interview Questions",  icon: "🎯" },
      { label: "C# Optimization Tips",    icon: "🚀" },
      { label: "Debugging Tips",          icon: "🐛" },
      { label: "Cloud Computing",         icon: "☁️" },
      { label: "Latest AI News",          icon: "🔥" },
      { label: "Tech Market News",        icon: "📰" },
    ],
    "Tech & AI": [
      { label: "AI Tools",       icon: "🛠️" },
      { label: "Automation",     icon: "⚙️" },
      { label: "Future of AI",   icon: "🔮" },
      { label: "AI Ethics",      icon: "⚖️" },
      { label: "LLMs",           icon: "💬" },
      { label: "AI in Business", icon: "💼" },
    ],
    "Learning & AI": [
      { label: "Learning AI",        icon: "📚" },
      { label: "Prompt Engineering", icon: "✍️" },
      { label: "AI for Beginners",   icon: "🌱" },
      { label: "Upskilling",         icon: "📈" },
      { label: "Online Courses",     icon: "🎓" },
    ],
    "Leadership": [
      { label: "Team Building",        icon: "👥" },
      { label: "Decision Making",      icon: "🎯" },
      { label: "Leading with Empathy", icon: "❤️" },
      { label: "Remote Leadership",    icon: "🌐" },
      { label: "Vision & Strategy",    icon: "🔭" },
    ],
    "Career Growth": [
      { label: "Job Search Tips",       icon: "🔍" },
      { label: "Interview Tips",        icon: "🎤" },
      { label: "Resume Tips",           icon: "📄" },
      { label: "Salary Negotiation",    icon: "💰" },
      { label: "Career Pivot",          icon: "🔄" },
      { label: "LinkedIn Profile Tips", icon: "💼" },
    ],
    "Entrepreneurship": [
      { label: "Startup Stories", icon: "🚀" },
      { label: "Fundraising",     icon: "💸" },
      { label: "Product Launch",  icon: "🎯" },
      { label: "Lessons Learned", icon: "💡" },
      { label: "Side Hustle",     icon: "⚡" },
      { label: "Bootstrapping",   icon: "🔧" },
    ],
    "Productivity": [
      { label: "Time Management",      icon: "⏰" },
      { label: "Deep Work",            icon: "🎯" },
      { label: "Morning Routine",      icon: "🌅" },
      { label: "AI Productivity Tools",icon: "🤖" },
      { label: "Work-Life Balance",    icon: "⚖️" },
    ],
    "Personal Brand": [
      { label: "Content Strategy",  icon: "✍️" },
      { label: "Thought Leadership", icon: "💡" },
      { label: "Building Audience",  icon: "👥" },
      { label: "LinkedIn Growth",    icon: "📈" },
      { label: "Niche Authority",    icon: "🏆" },
    ],
    "Work Culture": [
      { label: "Remote Work",           icon: "🏠" },
      { label: "Hybrid Work",           icon: "🏢" },
      { label: "Mental Health at Work", icon: "🧘" },
      { label: "Psychological Safety",  icon: "🛡️" },
      { label: "Team Dynamics",         icon: "🤝" },
    ],
    "Mindset": [
      { label: "Growth Mindset",    icon: "🌱" },
      { label: "Resilience",        icon: "💪" },
      { label: "Imposter Syndrome", icon: "🎭" },
      { label: "Overcoming Failure",icon: "🔄" },
      { label: "Self-Discipline",   icon: "🏋️" },
    ],
  },
};

const STORAGE_KEY = "pc_topic_store_v1";

export function loadStore(): TopicStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TopicStore;
  } catch { /* ignore */ }
  return JSON.parse(JSON.stringify(DEFAULT_STORE));
}

export function saveStore(store: TopicStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resetStore(): TopicStore {
  const fresh = JSON.parse(JSON.stringify(DEFAULT_STORE));
  saveStore(fresh);
  return fresh;
}

export function getNextColor(existing: Topic[]): string {
  const used = existing.map(t => t.color);
  return COLORS.find(c => !used.includes(c)) || COLORS[existing.length % COLORS.length];
}

// ── Excel export ──────────────────────────────────────────────────────────────
export function exportToExcel(store: TopicStore): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Topics
  const topicRows = [["Label", "Emoji", "Color"], ...store.topics.map(t => [t.label, t.emoji, t.color])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(topicRows), "Topics");

  // Sheet 2: Subtopics (one row per subtopic, with parent topic column)
  const subRows: string[][] = [["Topic", "Subtopic Label", "Icon"]];
  for (const [topic, subs] of Object.entries(store.subtopics)) {
    for (const s of subs) subRows.push([topic, s.label, s.icon]);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(subRows), "Subtopics");

  XLSX.writeFile(wb, "postcraft_topics.xlsx");
}

// ── Excel import ──────────────────────────────────────────────────────────────
export function importFromExcel(file: File): Promise<TopicStore> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: "array" });

        // Parse Topics sheet
        const topicSheet = wb.Sheets["Topics"];
        if (!topicSheet) throw new Error('Missing "Topics" sheet');
        const topicRows  = XLSX.utils.sheet_to_json<{ Label: string; Emoji: string; Color: string }>(topicSheet);
        const topics: Topic[] = topicRows.map(r => ({
          label: String(r.Label || "").trim(),
          emoji: String(r.Emoji || "📌").trim(),
          color: String(r.Color || "#6C63FF").trim(),
        })).filter(t => t.label);

        // Parse Subtopics sheet
        const subSheet = wb.Sheets["Subtopics"];
        if (!subSheet) throw new Error('Missing "Subtopics" sheet');
        const subRows  = XLSX.utils.sheet_to_json<{ Topic: string; "Subtopic Label": string; Icon: string }>(subSheet);
        const subtopics: Record<string, Subtopic[]> = {};
        for (const r of subRows) {
          const topic = String(r["Topic"] || "").trim();
          const label = String(r["Subtopic Label"] || "").trim();
          const icon  = String(r["Icon"] || "📌").trim();
          if (!topic || !label) continue;
          if (!subtopics[topic]) subtopics[topic] = [];
          subtopics[topic].push({ label, icon });
        }

        const store: TopicStore = { topics, subtopics };
        saveStore(store);
        resolve(store);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}
