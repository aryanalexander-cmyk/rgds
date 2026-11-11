import React, { useState } from 'react';
import { TargetEngine } from './types/engine';
import { Header, ActiveToolView } from './components/layout/Header';
import { HubPage } from './pages/HubPage';
import { StonecutterPage } from './pages/StonecutterPage';
import { HathoriaPage } from './pages/HathoriaPage';
import { TinkerboxPage } from './pages/TinkerboxPage';
import { LoomPage } from './pages/LoomPage';
import { LetterpressPage } from './pages/LetterpressPage';
import { CruciblePage } from './pages/CruciblePage';
import { ResonatorPage } from './pages/ResonatorPage';
import { SparkboxPage } from './pages/SparkboxPage';
import { TapestryPage } from './pages/TapestryPage';
import { LexiconPage } from './pages/LexiconPage';
import { CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveToolView>('hub');
  const [engine, setEngine] = useState<TargetEngine>('godot');
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 3200);
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#080a0f] text-slate-100">
      {/* Global Suite Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        engine={engine}
        setEngine={setEngine}
        onToast={showToast}
      />

      {/* Active Workstation View */}
      {activeView === 'hub' && (
        <HubPage
          onOpenStonecutter={() => setActiveView('stonecutter')}
          onOpenHathoria={() => setActiveView('hathoria')}
          onOpenTinkerbox={() => setActiveView('tinkerbox')}
          onOpenLoom={() => setActiveView('loom')}
          onOpenLetterpress={() => setActiveView('letterpress')}
          onOpenCrucible={() => setActiveView('crucible')}
          onOpenResonator={() => setActiveView('resonator')}
          onOpenSparkbox={() => setActiveView('sparkbox')}
          onOpenTapestry={() => setActiveView('tapestry')}
          onOpenLexicon={() => setActiveView('lexicon')}
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'stonecutter' && (
        <StonecutterPage
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'hathoria' && (
        <HathoriaPage
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'tinkerbox' && (
        <TinkerboxPage
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'loom' && (
        <LoomPage
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'letterpress' && (
        <LetterpressPage
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'crucible' && (
        <CruciblePage
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'resonator' && (
        <ResonatorPage
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'sparkbox' && (
        <SparkboxPage
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'tapestry' && (
        <TapestryPage
          engine={engine}
          onToast={showToast}
        />
      )}

      {activeView === 'lexicon' && (
        <LexiconPage
          engine={engine}
          onToast={showToast}
        />
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-[#141824] border border-indigo-500/40 rounded-xl px-4 py-2.5 shadow-2xl text-xs font-medium text-white flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};

export default App;
