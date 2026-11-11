import React, { useState, useMemo } from 'react';
import { TargetEngine, ENGINE_PROFILES } from '../types/engine';
import { Button } from '../components/ui/Button';
import { createZipArchive, ZipFileEntry } from '../core/stonecutter/zip';
import { WorkstationTutorialModal } from '../components/ui/WorkstationTutorialModal';
import { WORKSTATION_TUTORIALS } from '../core/tutorial/tutorialData';
import {
  DialogueGraph,
  DialogueNode,
  DialogueChoice,
  DEMO_DIALOGUES,
  SPEAKER_AVATARS,
  exportToGodotDialogueManager,
  exportToYarnSpinner,
  exportToInk,
  exportToJson,
  exportToGodotRunnerGDScript,
  exportToUnityRunnerCSharp
} from '../core/lexicon/dialogue';
import {
  MessageSquareQuote,
  Play,
  RotateCcw,
  Download,
  Copy,
  Plus,
  Trash2,
  Sparkles,
  GitBranch,
  User,
  Palette,
  FileCode,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  MessageCircle,
  HelpCircle
} from 'lucide-react';

interface LexiconPageProps {
  engine: TargetEngine;
  onToast: (msg: string) => void;
}

export const LexiconPage: React.FC<LexiconPageProps> = ({ engine, onToast }) => {
  // Current active dialogue graph
  const [currentPresetKey, setCurrentPresetKey] = useState<string>('quest_giver');
  const [graph, setGraph] = useState<DialogueGraph>(() => JSON.parse(JSON.stringify(DEMO_DIALOGUES.quest_giver)));
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node_start');

  // Live VN Simulator State
  const [simNodeId, setSimNodeId] = useState<string>('node_start');
  const [simHistory, setSimHistory] = useState<{ speaker: string; text: string; choiceMade?: string }[]>([]);
  const [codeTab, setCodeTab] = useState<'godot' | 'yarn' | 'ink' | 'json' | 'runner'>('godot');

  const selectedNode = graph.nodes[selectedNodeId] || Object.values(graph.nodes)[0];
  const simNode = graph.nodes[simNodeId];

  // First-visit tutorial state
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  React.useEffect(() => {
    try {
      const dismissed = localStorage.getItem('rgds_tutorial_lexicon_dismissed');
      if (!dismissed) {
        setIsTutorialOpen(true);
        setIsFirstVisit(true);
      }
    } catch {}
  }, []);

  const handleBlankWorkspace = () => {
    setGraph({
      id: 'blank_dialogue',
      title: 'Untitled Dialogue',
      description: 'Clean blank dialogue graph.',
      initialNodeId: 'node_start',
      nodes: {
        node_start: {
          id: 'node_start',
          title: 'Start Node',
          speaker: 'Narrator',
          avatar: '👤',
          color: '#8b5cf6',
          text: 'Type your dialogue line here...',
          choices: [],
          position: { x: 100, y: 100 }
        }
      }
    });
    setSelectedNodeId('node_start');
    setSimNodeId('node_start');
    setSimHistory([]);
    onToast('Dialogue graph reset to clean blank state.');
  };

  // Load a demo preset
  const handleSelectPreset = (key: string) => {
    setCurrentPresetKey(key);
    const demo = DEMO_DIALOGUES[key];
    if (demo) {
      const cloned: DialogueGraph = JSON.parse(JSON.stringify(demo));
      setGraph(cloned);
      setSelectedNodeId(cloned.initialNodeId);
      setSimNodeId(cloned.initialNodeId);
      setSimHistory([]);
      onToast(`Loaded preset: ${cloned.title}`);
    }
  };

  // Node editing handlers
  const handleUpdateNode = (updates: Partial<DialogueNode>) => {
    if (!selectedNode) return;
    setGraph(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [selectedNode.id]: {
          ...selectedNode,
          ...updates
        }
      }
    }));
  };

  // Add new node
  const handleAddNode = () => {
    const newId = `node_${Date.now().toString(36)}`;
    const newNode: DialogueNode = {
      id: newId,
      title: `New Dialogue Node`,
      speaker: selectedNode ? selectedNode.speaker : 'Narrator',
      avatar: selectedNode ? selectedNode.avatar : '👤',
      color: selectedNode ? selectedNode.color : '#8b5cf6',
      text: 'Write the character dialogue line here...',
      choices: [
        { id: `c_${Date.now()}`, text: 'Continue...', targetNodeId: null }
      ],
      position: { x: 100, y: 100 }
    };

    setGraph(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [newId]: newNode
      }
    }));
    setSelectedNodeId(newId);
    onToast(`Added node: ${newId}`);
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    if (Object.keys(graph.nodes).length <= 1) {
      onToast('Cannot delete the last node in the graph!');
      return;
    }

    const nextNodes = { ...graph.nodes };
    delete nextNodes[id];

    // Clean choices that target deleted node
    for (const key of Object.keys(nextNodes)) {
      nextNodes[key].choices = nextNodes[key].choices.map(c => 
        c.targetNodeId === id ? { ...c, targetNodeId: null } : c
      );
    }

    const remainingKeys = Object.keys(nextNodes);
    const nextInitial = graph.initialNodeId === id ? remainingKeys[0] : graph.initialNodeId;

    setGraph(prev => ({
      ...prev,
      initialNodeId: nextInitial,
      nodes: nextNodes
    }));

    setSelectedNodeId(remainingKeys[0]);
    if (simNodeId === id) {
      setSimNodeId(nextInitial);
      setSimHistory([]);
    }
    onToast(`Deleted node ${id}`);
  };

  // Choice handlers
  const handleAddChoice = () => {
    if (!selectedNode) return;
    const newChoice: DialogueChoice = {
      id: `c_${Date.now().toString(36)}`,
      text: 'New response choice',
      targetNodeId: null
    };
    handleUpdateNode({
      choices: [...selectedNode.choices, newChoice]
    });
  };

  const handleUpdateChoice = (choiceId: string, updates: Partial<DialogueChoice>) => {
    if (!selectedNode) return;
    handleUpdateNode({
      choices: selectedNode.choices.map(c => (c.id === choiceId ? { ...c, ...updates } : c))
    });
  };

  const handleDeleteChoice = (choiceId: string) => {
    if (!selectedNode) return;
    handleUpdateNode({
      choices: selectedNode.choices.filter(c => c.id !== choiceId)
    });
  };

  // Live Simulator choice pick
  const handleSimChoose = (choice: DialogueChoice) => {
    if (!simNode) return;

    setSimHistory(prev => [
      ...prev,
      {
        speaker: simNode.speaker,
        text: simNode.text,
        choiceMade: choice.text
      }
    ]);

    if (choice.targetNodeId && graph.nodes[choice.targetNodeId]) {
      setSimNodeId(choice.targetNodeId);
    } else {
      setSimNodeId(''); // Ended
    }
  };

  const handleRestartSim = () => {
    setSimNodeId(graph.initialNodeId);
    setSimHistory([]);
    onToast('Dialogue simulation restarted.');
  };

  // Generated code strings
  const codeGodot = useMemo(() => exportToGodotDialogueManager(graph), [graph]);
  const codeYarn = useMemo(() => exportToYarnSpinner(graph), [graph]);
  const codeInk = useMemo(() => exportToInk(graph), [graph]);
  const codeJson = useMemo(() => exportToJson(graph), [graph]);
  const codeRunner = useMemo(() => {
    return engine === 'unity' ? exportToUnityRunnerCSharp(graph) : exportToGodotRunnerGDScript(graph);
  }, [graph, engine]);

  const activeCodeContent = useMemo(() => {
    switch (codeTab) {
      case 'godot': return codeGodot;
      case 'yarn': return codeYarn;
      case 'ink': return codeInk;
      case 'json': return codeJson;
      case 'runner': return codeRunner;
      default: return codeGodot;
    }
  }, [codeTab, codeGodot, codeYarn, codeInk, codeJson, codeRunner]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeCodeContent);
      onToast(`Copied ${codeTab.toUpperCase()} code to clipboard!`);
    } catch {
      onToast('Failed to copy code.');
    }
  };

  // Export 1-Click Game Jam Bundle (.zip)
  const handleExportBundle = async () => {
    const slug = graph.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const files: ZipFileEntry[] = [
      { name: `${slug}.dialogue`, data: codeGodot },
      { name: `${slug}.yarn`, data: codeYarn },
      { name: `${slug}.ink`, data: codeInk },
      { name: `${slug}.json`, data: codeJson },
      {
        name: engine === 'unity' ? 'DialogueRunner.cs' : 'DialogueRunner.gd',
        data: codeRunner
      },
      {
        name: 'README_LEXICON.txt',
        data: `RISTEK Game Development Suite - Lexicon Dialogue Bundle
============================================================
Graph: ${graph.title}
Target Engine: ${ENGINE_PROFILES[engine].name}

Included Formats:
1. ${slug}.dialogue : Standard Godot 4 Dialogue Manager format (Nathan Hoad)
2. ${slug}.yarn     : Yarn Spinner format for Unity / Web
3. ${slug}.ink      : Inkle Ink scripting language
4. ${slug}.json     : Universal clean AST dialogue JSON
5. Controller       : Drop-in ${engine === 'unity' ? 'DialogueRunner.cs' : 'DialogueRunner.gd'}

Importing into Godot 4:
- Place ${slug}.dialogue into your project folder.
- If using Dialogue Manager addon, call: DialogueManager.show_example_dialogue_balloon(load("res://${slug}.dialogue"), "${graph.initialNodeId}")
- Or use the included DialogueRunner.gd with ${slug}.json.

Importing into Unity:
- Place ${slug}.yarn into your Assets folder with Yarn Spinner package installed.
- Or attach DialogueRunner.cs to a GameObject and pass ${slug}.json.
`
      }
    ];

    const zipBlob = await createZipArchive(files);
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}_dialogue_bundle.zip`;
    a.click();
    URL.revokeObjectURL(url);
    onToast(`Exported ${slug}_dialogue_bundle.zip!`);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#080a10]">
      {/* Top Action Bar */}
      <div className="h-14 border-b border-[#1b2234] bg-[#0c0f17] px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <MessageSquareQuote size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">Lexicon</h1>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-mono">
                Dialogue Studio
              </span>
            </div>
            <div className="text-[10px] text-slate-400">
              Branching Narrative Flow &bull; Godot Dialogue Manager &bull; Yarn &bull; Ink
            </div>
          </div>

          <div className="h-5 w-[1px] bg-[#1f273b] mx-2" />

          {/* Preset Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Preset:</span>
            <select
              value={currentPresetKey}
              onChange={e => handleSelectPreset(e.target.value)}
              className="bg-[#121724] border border-[#1f273d] text-xs text-violet-300 rounded px-2.5 py-1 outline-none font-semibold cursor-pointer"
            >
              <option value="quest_giver">🧙‍♂️ The Whispering Crypt (Quest Giver)</option>
              <option value="merchant">🤖 Neon Alley Fixer (Cyberpunk Haggler)</option>
              <option value="boss_intro">👑 The Obsidian Throne (Boss Confrontation)</option>
            </select>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RotateCcw size={12} />}
            onClick={handleBlankWorkspace}
            title="Reset dialogue graph to blank starting node"
          >
            Blank
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<HelpCircle size={12} className="text-violet-400" />}
            onClick={() => {
              setIsFirstVisit(false);
              setIsTutorialOpen(true);
            }}
            title="Open Lexicon Walkthrough"
          >
            Tutorial
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Copy size={13} />}
            onClick={handleCopyCode}
          >
            Copy {codeTab.toUpperCase()}
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Download size={13} />}
            onClick={handleExportBundle}
            className="!bg-violet-600 hover:!bg-violet-500 !border-violet-400/40 font-bold"
          >
            Export Dialogue Bundle (.zip)
          </Button>
        </div>
      </div>

      {/* Main Workspace Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Node Tree & Graph Navigation */}
        <div className="w-72 border-r border-[#1b2234] bg-[#090c13] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#1b2234] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch size={14} className="text-violet-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Dialogue Nodes ({Object.keys(graph.nodes).length})
              </span>
            </div>
            <button
              onClick={handleAddNode}
              className="px-2 py-1 rounded bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus size={12} />
              <span>Node</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {Object.values(graph.nodes).map(node => {
              const isSelected = selectedNode?.id === node.id;
              const isInitial = graph.initialNodeId === node.id;
              const isSimActive = simNodeId === node.id;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-violet-500/15 border-violet-500/60 shadow-sm'
                      : 'bg-[#0f1420] border-[#1b2336] hover:bg-[#141b2b] hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{node.avatar || '👤'}</span>
                      <span
                        className="font-bold text-[11px] px-1.5 py-0.2 rounded"
                        style={{ backgroundColor: `${node.color}25`, color: node.color }}
                      >
                        {node.speaker}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isInitial && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                          START
                        </span>
                      )}
                      {isSimActive && (
                        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" title="Active in Previewer" />
                      )}
                    </div>
                  </div>

                  <div className="font-semibold text-white truncate text-[11px] mb-0.5">
                    {node.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate leading-relaxed">
                    "{node.text}"
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{node.choices.length} {node.choices.length === 1 ? 'choice' : 'choices'}</span>
                    <span className="text-slate-400">#{node.id}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Initial Node Toggle */}
          {selectedNode && (
            <div className="p-3 border-t border-[#1b2234] bg-[#0c0f17]">
              <button
                onClick={() => {
                  setGraph(prev => ({ ...prev, initialNodeId: selectedNode.id }));
                  onToast(`Set start node to "${selectedNode.title}"`);
                }}
                disabled={graph.initialNodeId === selectedNode.id}
                className={`w-full py-1.5 rounded text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                  graph.initialNodeId === selectedNode.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                    : 'bg-[#151c2c] hover:bg-[#1a2338] text-slate-300 border border-[#232e47]'
                }`}
              >
                <Sparkles size={12} className={graph.initialNodeId === selectedNode.id ? 'text-emerald-400' : 'text-slate-400'} />
                <span>{graph.initialNodeId === selectedNode.id ? 'Starting Node' : 'Make Starting Node'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Center Column: Node Editor */}
        <div className="flex-1 flex flex-col overflow-y-auto border-r border-[#1b2234] bg-[#080a10] p-5 space-y-5">
          {selectedNode ? (
            <>
              {/* Node Header & Meta */}
              <div className="bg-[#0e121d] border border-[#1e263a] rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{selectedNode.avatar}</span>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Node Properties
                    </span>
                    <span className="text-[10px] font-mono bg-[#161d2d] px-2 py-0.5 rounded text-slate-400">
                      ID: {selectedNode.id}
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 size={12} />
                    <span>Delete Node</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                      Node Title (for designer reference)
                    </label>
                    <input
                      type="text"
                      value={selectedNode.title}
                      onChange={e => handleUpdateNode({ title: e.target.value })}
                      className="w-full bg-[#131826] border border-[#232c42] rounded-lg px-3 py-1.5 text-xs text-white focus:border-violet-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                      Speaker Name
                    </label>
                    <input
                      type="text"
                      value={selectedNode.speaker}
                      onChange={e => handleUpdateNode({ speaker: e.target.value })}
                      className="w-full bg-[#131826] border border-[#232c42] rounded-lg px-3 py-1.5 text-xs text-white focus:border-violet-500 outline-none font-bold"
                    />
                  </div>
                </div>

                {/* Avatar & Color Picker Palette */}
                <div className="pt-2 border-t border-[#171e2e]">
                  <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
                    Speaker Avatar &amp; Tag Accent
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {SPEAKER_AVATARS.map(item => (
                      <button
                        key={item.emoji}
                        onClick={() => handleUpdateNode({ avatar: item.emoji, color: item.defaultColor })}
                        className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 border transition-all ${
                          selectedNode.avatar === item.emoji
                            ? 'bg-violet-500/20 border-violet-400 text-white font-bold shadow'
                            : 'bg-[#121724] border-[#1d2538] text-slate-400 hover:text-white hover:bg-[#182032]'
                        }`}
                      >
                        <span>{item.emoji}</span>
                        <span className="text-[10px]">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dialogue Text Content */}
              <div className="bg-[#0e121d] border border-[#1e263a] rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageCircle size={14} className="text-violet-400" />
                    Dialogue Spoken Line
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {selectedNode.text.length} chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={selectedNode.text}
                  onChange={e => handleUpdateNode({ text: e.target.value })}
                  placeholder="Enter the line spoken by this character..."
                  className="w-full bg-[#131826] border border-[#232c42] rounded-lg p-3 text-xs text-white leading-relaxed focus:border-violet-500 outline-none resize-none font-sans"
                />
              </div>

              {/* Branching Choices / Responses */}
              <div className="bg-[#0e121d] border border-[#1e263a] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GitBranch size={14} className="text-violet-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Player Response Options ({selectedNode.choices.length})
                    </span>
                  </div>
                  <button
                    onClick={handleAddChoice}
                    className="px-2.5 py-1 rounded bg-violet-600/30 hover:bg-violet-600/50 border border-violet-500/40 text-violet-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus size={12} />
                    <span>Add Choice</span>
                  </button>
                </div>

                {selectedNode.choices.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#121624] border border-dashed border-[#20293d] text-center text-xs text-slate-400">
                    No choices defined. When this node completes, the dialogue will automatically end (<code className="text-violet-400">=&gt; END</code>).
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedNode.choices.map((choice, idx) => (
                      <div
                        key={choice.id}
                        className="p-3 rounded-lg bg-[#131724] border border-[#20283c] flex flex-col md:flex-row items-stretch md:items-center gap-3"
                      >
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="w-5 h-5 rounded-full bg-[#1b2336] flex items-center justify-center text-[10px] font-mono font-bold text-slate-300">
                            {idx + 1}
                          </span>
                        </div>

                        {/* Choice Text */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={choice.text}
                            onChange={e => handleUpdateChoice(choice.id, { text: e.target.value })}
                            placeholder="Player choice response text..."
                            className="w-full bg-[#0b0e16] border border-[#1d2538] rounded px-2.5 py-1 text-xs text-white focus:border-violet-500 outline-none"
                          />
                        </div>

                        {/* Target Node Dropdown */}
                        <div className="flex items-center gap-2 shrink-0">
                          <ArrowRight size={13} className="text-slate-400" />
                          <select
                            value={choice.targetNodeId || ''}
                            onChange={e => handleUpdateChoice(choice.id, { targetNodeId: e.target.value || null })}
                            className="bg-[#0b0e16] border border-[#1d2538] text-xs text-violet-300 rounded px-2.5 py-1 outline-none font-semibold cursor-pointer max-w-[180px] truncate"
                          >
                            <option value="">(End Conversation)</option>
                            {Object.values(graph.nodes).map(n => (
                              <option key={n.id} value={n.id}>
                                {n.avatar} {n.title}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => handleDeleteChoice(choice.id)}
                            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                            title="Delete choice"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
              Select or create a dialogue node to edit properties.
            </div>
          )}
        </div>

        {/* Right Column: Live In-Game VN Previewer & Exporter */}
        <div className="w-96 border-l border-[#1b2234] bg-[#090c13] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#1b2234] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play size={14} className="text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Live VN Dialogue Simulator
              </span>
            </div>
            <button
              onClick={handleRestartSim}
              className="px-2 py-0.5 rounded bg-[#161d2d] hover:bg-[#1d263b] text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition-colors border border-[#232e47]"
              title="Restart from beginning"
            >
              <RotateCcw size={11} />
              <span>Reset</span>
            </button>
          </div>

          {/* Interactive Dialogue Box Chamber */}
          <div className="p-4 flex-1 flex flex-col justify-between overflow-y-auto space-y-4">
            {simNode ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                {/* Dialogue History Breadcrumbs */}
                {simHistory.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Conversation Log:
                    </div>
                    {simHistory.map((item, idx) => (
                      <div key={idx} className="p-2 rounded bg-[#0e121d] border border-[#182030] text-[11px] space-y-1">
                        <span className="font-bold text-slate-300">{item.speaker}:</span>
                        <p className="text-slate-400 italic">"{item.text}"</p>
                        {item.choiceMade && (
                          <div className="text-violet-400 text-[10px] flex items-center gap-1 font-semibold">
                            <ArrowRight size={10} />
                            <span>Chose: {item.choiceMade}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* In-Game Visual Novel Style Dialogue Box */}
                <div className="relative rounded-2xl bg-gradient-to-b from-[#121725] to-[#0a0d16] border border-[#242f49] p-4 shadow-2xl space-y-3">
                  {/* Speaker Banner */}
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-xl shadow-md"
                      style={{ backgroundColor: `${simNode.color}25`, border: `1px solid ${simNode.color}50` }}
                    >
                      {simNode.avatar}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${simNode.color}30`, color: simNode.color }}
                        >
                          {simNode.speaker}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Spoken Text */}
                  <div className="text-xs text-slate-100 leading-relaxed font-medium min-h-[50px] bg-[#070910]/60 p-3 rounded-xl border border-white/5">
                    "{simNode.text}"
                  </div>

                  {/* Choice Buttons */}
                  <div className="space-y-1.5 pt-1">
                    {simNode.choices.map((choice, i) => (
                      <button
                        key={choice.id}
                        onClick={() => handleSimChoose(choice)}
                        className="w-full text-left p-2.5 rounded-lg bg-[#182033] hover:bg-violet-600/30 border border-[#26334f] hover:border-violet-500/50 text-xs text-slate-200 hover:text-white transition-all flex items-center justify-between group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded bg-[#202b44] flex items-center justify-center text-[10px] font-mono text-slate-400 group-hover:text-violet-300">
                            {i + 1}
                          </span>
                          <span>{choice.text}</span>
                        </span>
                        <ArrowRight size={12} className="text-slate-400 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Dialogue End State */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3 bg-[#0d111b] rounded-2xl border border-[#1e2638]">
                <div className="w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Dialogue Complete</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Reached conversation termination node (<code className="text-violet-400">=&gt; END</code>).
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<RotateCcw size={12} />}
                  onClick={handleRestartSim}
                >
                  Run Dialogue Again
                </Button>
              </div>
            )}

            {/* Bottom Engine Code Tabs */}
            <div className="pt-3 border-t border-[#1b2234] space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                <span>Export Format Preview:</span>
                <span className="text-[10px] text-violet-400 font-mono">
                  {codeTab.toUpperCase()}
                </span>
              </div>

              {/* Tab Selector Buttons */}
              <div className="grid grid-cols-5 gap-1 bg-[#101420] p-1 rounded-lg border border-[#1c2438]">
                <button
                  onClick={() => setCodeTab('godot')}
                  className={`py-1 rounded text-[10px] font-bold transition-colors ${
                    codeTab === 'godot' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  .dialogue
                </button>
                <button
                  onClick={() => setCodeTab('yarn')}
                  className={`py-1 rounded text-[10px] font-bold transition-colors ${
                    codeTab === 'yarn' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  .yarn
                </button>
                <button
                  onClick={() => setCodeTab('ink')}
                  className={`py-1 rounded text-[10px] font-bold transition-colors ${
                    codeTab === 'ink' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  .ink
                </button>
                <button
                  onClick={() => setCodeTab('json')}
                  className={`py-1 rounded text-[10px] font-bold transition-colors ${
                    codeTab === 'json' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  .json
                </button>
                <button
                  onClick={() => setCodeTab('runner')}
                  className={`py-1 rounded text-[10px] font-bold transition-colors ${
                    codeTab === 'runner' ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Runner
                </button>
              </div>

              {/* Code Snippet Box */}
              <div className="relative">
                <pre className="p-3 bg-[#07090e] border border-[#1b2234] rounded-lg text-[10px] font-mono text-slate-300 max-h-36 overflow-y-auto leading-relaxed select-all">
                  {activeCodeContent}
                </pre>
                <button
                  onClick={handleCopyCode}
                  className="absolute top-2 right-2 p-1 rounded bg-[#171e2e]/80 hover:bg-[#1f283d] text-slate-400 hover:text-white transition-colors"
                  title="Copy code"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Walkthrough Modal */}
      <WorkstationTutorialModal
        tutorial={WORKSTATION_TUTORIALS.lexicon}
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        isFirstVisitPrompt={isFirstVisit}
      />

    </div>
  );
};
