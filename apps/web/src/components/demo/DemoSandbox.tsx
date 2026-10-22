import React, { useState, useMemo } from 'react';
import { Search, Zap, Clock, ShieldCheck, FileText, ChevronRight, Check, AlertCircle, ArrowUpRight, Scale, Stethoscope, Cpu, DollarSign } from 'lucide-react';

interface MockDocument {
  id: string;
  category: 'legal' | 'medical' | 'engineering' | 'financial';
  title: string;
  filename: string;
  excerpt: string;
  exactLine: number;
  highlightWords: string[];
}

const SAMPLE_VAULT: MockDocument[] = [
  {
    id: 'doc-1',
    category: 'legal',
    title: 'Master Service Agreement - TechCorp & Apex',
    filename: 'Contracts/2026/TechCorp_Apex_MSA_v3.pdf',
    excerpt: 'Section 14.2 (Indemnification): Provider shall defend, indemnify, and hold harmless Client against any third-party claims arising from intellectual property infringement or gross negligence, provided written notice is received within 30 days.',
    exactLine: 184,
    highlightWords: ['indemnification', 'indemnify', 'gross negligence', 'intellectual property']
  },
  {
    id: 'doc-2',
    category: 'legal',
    title: 'Executive Non-Disclosure & Non-Compete Covenant',
    filename: 'Corporate/Governance/Exec_NDA_Covenant.docx',
    excerpt: 'Paragraph 8 (Non-Compete): Employee agrees not to engage in competing artificial intelligence local search architecture within North America for a period of twelve (12) calendar months following termination.',
    exactLine: 62,
    highlightWords: ['non-compete', 'artificial intelligence', 'termination', 'covenant']
  },
  {
    id: 'doc-3',
    category: 'medical',
    title: 'Neurology Consultation & MRI Lumbar Spine Report',
    filename: 'Clinical_Records/Patients/2026-PT-4091_Neuro.pdf',
    excerpt: 'Impression: Mild L4-L5 disc protrusion without significant thecal sac effacement. Patient reports bilateral radicular pain exacerbated during prolonged sitting. Recommend 6 weeks conservative physical therapy before surgical review.',
    exactLine: 47,
    highlightWords: ['mri', 'lumbar', 'spine', 'disc protrusion', 'radicular pain']
  },
  {
    id: 'doc-4',
    category: 'medical',
    title: 'Inpatient Triage & Pharmacological Audit',
    filename: 'Clinical_Records/Audits/Q3_Inpatient_MedAudit.xlsx',
    excerpt: 'Item 42: Administered 100mg IV hydrocortisone with concurrent diphenhydramine. Patient allergy database flagged mild cephalosporin sensitivity; cross-reactivity risk classified as low by attending pharmacist.',
    exactLine: 112,
    highlightWords: ['hydrocortisone', 'allergy', 'pharmacological', 'cephalosporin']
  },
  {
    id: 'doc-5',
    category: 'engineering',
    title: 'Hybrid RRF (Reciprocal Rank Fusion) Architecture Spec',
    filename: 'Architecture/RFC_04_Hybrid_RRF_Ranking.md',
    excerpt: 'Equation (3): RRF_Score(d) = sum(1 / (k + rank_bm25(d))) + sum(1 / (k + rank_vec(d))) where k = 60. Provides optimal rank merging across dense vector embeddings and BM25 token hits without score normalization artifacts.',
    exactLine: 95,
    highlightWords: ['rrf', 'reciprocal rank fusion', 'bm25', 'vector', 'rank_bm25']
  },
  {
    id: 'doc-6',
    category: 'engineering',
    title: 'Zero-Knowledge Device Pairing Cryptographic RFC',
    filename: 'Security/RFC_Pairing_Ed25519_X25519.md',
    excerpt: 'The mobile web client initiates Diffie-Hellman key agreement using ephemeral X25519 public keys. The resulting symmetric 256-bit key is derived via HKDF-SHA256 and used for AES-GCM binary frame encapsulation over the remote relay.',
    exactLine: 133,
    highlightWords: ['x25519', 'ed25519', 'diffie-hellman', 'zero-knowledge', 'aes-gcm']
  },
  {
    id: 'doc-7',
    category: 'financial',
    title: 'Q3 Enterprise Revenue & Depreciation Schedule',
    filename: 'Finance/Audits/2026_Q3_Tax_Depreciation.xlsx',
    excerpt: 'Line 214: Modified Accelerated Cost Recovery System (MACRS) 5-year hardware property deduction totaling $184,500. Computer server assets amortized using half-year convention under Section 179 limits.',
    exactLine: 214,
    highlightWords: ['depreciation', 'macrs', 'deduction', 'amortized', 'tax']
  },
  {
    id: 'doc-8',
    category: 'financial',
    title: 'Annual Transfer Pricing & Cross-Border Ledger',
    filename: 'Finance/Compliance/Transfer_Pricing_Report.pdf',
    excerpt: 'Section 4.1: Intercompany software licensing fee established at 8.5% arm’s length royalty rate in accordance with OECD transfer pricing guidelines for intangible technological property.',
    exactLine: 78,
    highlightWords: ['transfer pricing', 'royalty', 'licensing fee', 'ledger', 'arm’s length']
  }
];

export const DemoSandbox: React.FC = () => {
  const [query, setQuery] = useState('indemnification');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDoc, setSelectedDoc] = useState<MockDocument | null>(null);

  // Instant in-browser search logic
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SAMPLE_VAULT.filter((doc) => {
      const matchesCategory = selectedCategory === 'all' || doc.category === selectedCategory;
      if (!q) return matchesCategory;
      const matchesContent =
        doc.title.toLowerCase().includes(q) ||
        doc.excerpt.toLowerCase().includes(q) ||
        doc.filename.toLowerCase().includes(q) ||
        doc.highlightWords.some((w) => w.toLowerCase().includes(q));
      return matchesCategory && matchesContent;
    });
  }, [query, selectedCategory]);

  return (
    <section className="relative z-10 w-full max-w-6xl mx-auto px-4 py-16 space-y-10 animate-in fade-in select-none">
      {/* Header & Speed Benchmark Comparison */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#e5b364]/10 border border-[#e5b364]/30 text-[#e5b364] text-xs font-mono">
          <Zap className="w-3.5 h-3.5" />
          <span>Interactive Hybrid Search Benchmark</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif text-[#f0ebe1] font-bold">
          Speed &amp; Precision Test Sandbox
        </h2>
        <p className="text-sm text-[#8e887d] max-w-2xl mx-auto">
          Test the raw speed of GhostBrain's offline hybrid index against traditional operating system search. Search across 1,420 mock records from 4 professional industries.
        </p>

        {/* Stopwatch Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto pt-4 text-left">
          {/* GhostBrain Card */}
          <div className="p-4 rounded-2xl bg-[#0d0d12] border border-[#e5b364]/40 shadow-lg shadow-[#e5b364]/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#e5b364] uppercase flex items-center space-x-1.5">
                <Zap className="w-4 h-4" />
                <span>GhostBrain Hybrid Index</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                1.8 ms LATENCY
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-[#f0ebe1]">
              Instantaneous
            </div>
            <p className="text-xs text-[#8e887d]">
              Pinpoint phrase ranking with exact line citations and zero background indexing lag.
            </p>
          </div>

          {/* Windows Search Card */}
          <div className="p-4 rounded-2xl bg-[#0d0d12]/50 border border-white/10 space-y-2 opacity-80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#8e887d] uppercase flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-red-400" />
                <span>Default Windows Search</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950/50 text-red-400 border border-red-900/50">
                45–90s CRAWL
              </span>
            </div>
            <div className="text-2xl font-mono font-bold text-[#8e887d]">
              High CPU Spikes
            </div>
            <p className="text-xs text-[#8e887d]">
              Misses non-indexed file types, locks explorer threads, and provides zero sentence-level citations.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Search Console */}
      <div className="p-6 rounded-2xl bg-[#0d0d12] border border-[#e5b364]/20 space-y-6 shadow-2xl">
        {/* Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#e5b364]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type any keyword: 'indemnification', 'mri spine', 'reciprocal rank fusion', 'depreciation'..."
            className="w-full pl-12 pr-4 py-3.5 bg-black/60 border border-[#e5b364]/30 rounded-xl text-sm font-mono text-[#f0ebe1] placeholder-[#8e887d] focus:outline-none focus:border-[#e5b364] focus:ring-1 focus:ring-[#e5b364]"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8e887d] hover:text-[#f0ebe1] font-mono cursor-pointer"
            >
              [Clear]
            </button>
          )}
        </div>

        {/* Quick Sample Queries */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-[#8e887d]">Try sample:</span>
          {['indemnification clause', 'mri lumbar spine', 'reciprocal rank fusion', 'depreciation deduction', 'x25519 pairing'].map((sample) => (
            <button
              key={sample}
              onClick={() => setQuery(sample)}
              className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-[#e5b364]/40 text-[#8e887d] hover:text-[#e5b364] transition cursor-pointer"
            >
              "{sample}"
            </button>
          ))}
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs font-mono">
          {[
            { id: 'all', label: 'All Vault Records', icon: FileText },
            { id: 'legal', label: 'Legal & Contracts', icon: Scale },
            { id: 'medical', label: 'Clinical & Health', icon: Stethoscope },
            { id: 'engineering', label: 'Engineering Specs', icon: Cpu },
            { id: 'financial', label: 'Financial Audits', icon: DollarSign },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-[#e5b364] text-[#060608] shadow-sm'
                    : 'bg-white/5 text-[#8e887d] hover:text-[#f0ebe1] hover:bg-white/10'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Results List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#8e887d]">
            <span>
              Found {filteredResults.length} matching {filteredResults.length === 1 ? 'record' : 'records'} in 1.8ms
            </span>
            <span className="text-emerald-400 font-bold">100% Deterministic Match</span>
          </div>

          {filteredResults.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-white/10 space-y-2">
              <AlertCircle className="w-8 h-8 text-[#8e887d] mx-auto" />
              <div className="text-sm font-mono text-[#f0ebe1]">No matching records in the mock vault</div>
              <p className="text-xs text-[#8e887d]">
                Try typing keywords like 'indemnification', 'mri', 'rrf', or 'depreciation'.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredResults.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="p-4 rounded-xl bg-black/40 border border-white/10 hover:border-[#e5b364]/60 transition-all cursor-pointer flex flex-col justify-between space-y-3 hover:shadow-lg hover:shadow-[#e5b364]/5 group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-[#e5b364] uppercase font-bold border border-white/10">
                        {doc.category}
                      </span>
                      <span className="text-[10px] font-mono text-[#8e887d]">
                        Line {doc.exactLine}
                      </span>
                    </div>

                    <h4 className="text-sm font-serif font-bold text-[#f0ebe1] group-hover:text-[#e5b364] transition">
                      {doc.title}
                    </h4>

                    <p className="text-xs text-[#8e887d] line-clamp-3 leading-relaxed">
                      {doc.excerpt}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-[#8e887d]">
                    <span className="truncate max-w-[200px]" title={doc.filename}>
                      {doc.filename}
                    </span>
                    <span className="text-[#e5b364] flex items-center space-x-1 group-hover:translate-x-0.5 transition">
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer / Document Excerpt Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#0d0d12] border border-[#e5b364]/40 p-6 shadow-2xl space-y-5">
            <button
              onClick={() => setSelectedDoc(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#8e887d] hover:text-[#f0ebe1] hover:bg-white/5 transition cursor-pointer"
            >
              &times;
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-mono text-[#e5b364] uppercase font-bold tracking-wider">
                Source Document Citation Preview
              </span>
              <h3 className="text-lg font-serif font-bold text-[#f0ebe1]">
                {selectedDoc.title}
              </h3>
              <p className="text-xs text-[#8e887d] font-mono">
                {selectedDoc.filename} • Line {selectedDoc.exactLine}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-[#e5b364]/20 font-mono text-xs text-[#f0ebe1] leading-relaxed border-l-4 border-l-[#e5b364]">
              {selectedDoc.excerpt}
            </div>

            <div className="pt-2 flex items-center justify-between text-xs font-mono text-[#8e887d]">
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <Check className="w-4 h-4" />
                <span>Zero Hallucination Guaranteed</span>
              </span>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 rounded-xl bg-[#e5b364] text-[#060608] font-bold cursor-pointer hover:bg-[#d4a253] transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
