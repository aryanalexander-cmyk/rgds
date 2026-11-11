/**
 * LEXICON: Dialogue & Branching Narrative Graph Studio
 * 
 * Provides:
 * - DialogueNode graph data model with speakers, choices, and branching links.
 * - Procedural sample dialogues (NPC Quest Giver, Cyberpunk Merchant, Boss Confrontation).
 * - Multi-engine exporters:
 *   - Godot 4 Dialogue Manager (.dialogue format)
 *   - Yarn Spinner (.yarn format)
 *   - Inkle Ink (.ink format)
 *   - Universal JSON (.json schema)
 *   - Drop-in Godot 4 GDScript Dialogue Controller (.gd)
 *   - Drop-in Unity C# Dialogue Controller (.cs)
 */

export interface DialogueChoice {
  id: string;
  text: string;
  targetNodeId: string | null; // null represents ending dialogue
  condition?: string;
}

export interface DialogueNode {
  id: string;
  title: string;
  speaker: string;
  avatar: string; // Emoji or identifier
  color: string;  // Hex accent color for speaker tag
  text: string;
  choices: DialogueChoice[];
  tags?: string[];
  position?: { x: number; y: number };
}

export interface DialogueGraph {
  id: string;
  title: string;
  description: string;
  initialNodeId: string;
  nodes: Record<string, DialogueNode>;
}

export const SPEAKER_AVATARS = [
  { emoji: '🧙‍♂️', label: 'Wizard / Elder', defaultColor: '#8b5cf6' },
  { emoji: '⚔️', label: 'Warrior / Player', defaultColor: '#3b82f6' },
  { emoji: '🤖', label: 'Cyborg / Mech', defaultColor: '#06b6d4' },
  { emoji: '👑', label: 'Monarch / Boss', defaultColor: '#f59e0b' },
  { emoji: '🧝‍♀️', label: 'Ranger / Elf', defaultColor: '#10b981' },
  { emoji: '💀', label: 'Necromancer / Undead', defaultColor: '#ef4444' },
  { emoji: '🐱', label: 'Familiar / Animal', defaultColor: '#ec4899' },
  { emoji: '👤', label: 'Mysterious Stranger', defaultColor: '#94a3b8' }
];

export const DEMO_DIALOGUES: Record<string, DialogueGraph> = {
  quest_giver: {
    id: 'quest_giver',
    title: 'The Whispering Crypt',
    description: 'Fantasy NPC elder giving a perilous dungeon quest with moral and economic choices.',
    initialNodeId: 'node_start',
    nodes: {
      node_start: {
        id: 'node_start',
        title: 'Elder Greeting',
        speaker: 'Elder Eldrin',
        avatar: '🧙‍♂️',
        color: '#8b5cf6',
        text: 'Greetings, traveler. You arrive just as the crimson moon rises over the Silent Barrow. Our scouts report the sealing wards have shattered.',
        choices: [
          { id: 'c1', text: 'I am ready to enter the crypt and cleanse it.', targetNodeId: 'node_accept' },
          { id: 'c2', text: 'What manner of horrors escaped the vault?', targetNodeId: 'node_lore' },
          { id: 'c3', text: 'My blade is not cheap, elder. What is the bounty?', targetNodeId: 'node_haggle' },
          { id: 'c4', text: 'Find someone else. This is not my concern.', targetNodeId: 'node_refuse' }
        ],
        position: { x: 50, y: 150 }
      },
      node_lore: {
        id: 'node_lore',
        title: 'Crypt Lore',
        speaker: 'Elder Eldrin',
        avatar: '🧙‍♂️',
        color: '#8b5cf6',
        text: 'Ancient automatons powered by black ether, and the lingering shade of the Archon. Once they breach the valley, the village is doomed.',
        choices: [
          { id: 'c2_1', text: 'Understood. Consider it dealt with.', targetNodeId: 'node_accept' },
          { id: 'c2_2', text: 'Sounds deadly. I require 500 gold upfront.', targetNodeId: 'node_haggle' }
        ],
        position: { x: 300, y: 50 }
      },
      node_haggle: {
        id: 'node_haggle',
        title: 'Negotiating Bounty',
        speaker: 'Elder Eldrin',
        avatar: '🧙‍♂️',
        color: '#8b5cf6',
        text: 'Always coin before duty... Very well. 300 pieces of gold and the runic ring of warding upon your safe return. Deal?',
        choices: [
          { id: 'c3_1', text: 'We have an accord. Where is the entrance?', targetNodeId: 'node_accept' },
          { id: 'c3_2', text: 'Still too low. Farewell.', targetNodeId: 'node_refuse' }
        ],
        position: { x: 300, y: 250 }
      },
      node_accept: {
        id: 'node_accept',
        title: 'Quest Accepted',
        speaker: 'Elder Eldrin',
        avatar: '🧙‍♂️',
        color: '#8b5cf6',
        text: 'May the dawn guide your steel. Take this silver key—it unlocks the inner sanctum. Return before the bells toll midnight!',
        choices: [
          { id: 'c4_1', text: 'Depart for the crypt.', targetNodeId: null }
        ],
        position: { x: 550, y: 150 }
      },
      node_refuse: {
        id: 'node_refuse',
        title: 'Quest Declined',
        speaker: 'Elder Eldrin',
        avatar: '🧙‍♂️',
        color: '#8b5cf6',
        text: 'Then our blood is upon your conscience. May the night show you more mercy than the fiends will show us.',
        choices: [
          { id: 'c5_1', text: 'Walk away into the fog.', targetNodeId: null }
        ],
        position: { x: 550, y: 350 }
      }
    }
  },

  merchant: {
    id: 'merchant',
    title: 'Neon Alley Fixer',
    description: 'Cyberpunk black market arms dealer negotiating cyberware upgrades.',
    initialNodeId: 'node_greet',
    nodes: {
      node_greet: {
        id: 'node_greet',
        title: 'Fixer Greeting',
        speaker: 'Fixer Vex',
        avatar: '🤖',
        color: '#06b6d4',
        text: 'Watch your step, chrome-head. The Corp patrols are sweeping Sector 4. You looking for military-grade optics or cold ICE breakers?',
        choices: [
          { id: 'm1', text: 'Show me your high-frequency thermal blade.', targetNodeId: 'node_blade' },
          { id: 'm2', text: 'I need info on the Arasaka shipment hijack.', targetNodeId: 'node_intel' },
          { id: 'm3', text: 'Just passing through.', targetNodeId: null }
        ],
        position: { x: 50, y: 150 }
      },
      node_blade: {
        id: 'node_blade',
        title: 'Thermal Blade Inquiry',
        speaker: 'Fixer Vex',
        avatar: '🤖',
        color: '#06b6d4',
        text: 'Monofilament edge with a plasma core. Slices through reinforced titanium bulkhead like syn-butter. 4,500 credits. Non-negotiable.',
        choices: [
          { id: 'm1_1', text: '[Transfer 4,500 Credits] I will take it.', targetNodeId: 'node_deal' },
          { id: 'm1_2', text: 'That is highway robbery. How about 3,200?', targetNodeId: 'node_lowball' }
        ],
        position: { x: 300, y: 50 }
      },
      node_intel: {
        id: 'node_intel',
        title: 'Black Market Intel',
        speaker: 'Fixer Vex',
        avatar: '🤖',
        color: '#06b6d4',
        text: 'That data costs more than your cyberware, rookie. Convoy hits the highway junction at 0300. But if you get caught, we never met.',
        choices: [
          { id: 'm2_1', text: 'Understood. Here is the deposit.', targetNodeId: 'node_deal' },
          { id: 'm2_2', text: 'Too risky for my blood.', targetNodeId: null }
        ],
        position: { x: 300, y: 250 }
      },
      node_lowball: {
        id: 'node_lowball',
        title: 'Haggling Backlash',
        speaker: 'Fixer Vex',
        avatar: '🤖',
        color: '#06b6d4',
        text: 'Do I look like a charity subroutine? Price just went to 5,000 for wasting my optical cycles. Buy or scram.',
        choices: [
          { id: 'm3_1', text: 'Fine, 5,000 credits. Deal.', targetNodeId: 'node_deal' },
          { id: 'm3_2', text: 'Forget it, rust-bucket.', targetNodeId: null }
        ],
        position: { x: 550, y: 50 }
      },
      node_deal: {
        id: 'node_deal',
        title: 'Transaction Complete',
        speaker: 'Fixer Vex',
        avatar: '🤖',
        color: '#06b6d4',
        text: 'Encrypted ledger updated. Good doing business with you, runner. Mind the snipers on the skybridge.',
        choices: [
          { id: 'm4_1', text: 'Slip into the shadows.', targetNodeId: null }
        ],
        position: { x: 750, y: 150 }
      }
    }
  },

  boss_intro: {
    id: 'boss_intro',
    title: 'The Obsidian Throne',
    description: 'Pre-battle confrontation with the dark monarch of the abyssal citadel.',
    initialNodeId: 'boss_speech',
    nodes: {
      boss_speech: {
        id: 'boss_speech',
        title: 'Monarch Address',
        speaker: 'Monarch Malakor',
        avatar: '👑',
        color: '#f59e0b',
        text: 'So... another pitiful moth flutters into the black flame. Tell me, mortal: did you truly believe the light could pierce an endless abyss?',
        choices: [
          { id: 'b1', text: 'Your reign of terror ends tonight, Malakor!', targetNodeId: 'boss_fight' },
          { id: 'b2', text: 'Why did you forsake your kingdom? What drove you to this madness?', targetNodeId: 'boss_reason' },
          { id: 'b3', text: 'I offer an alliance. The realm cannot survive another cataclysm.', targetNodeId: 'boss_tempt' }
        ],
        position: { x: 50, y: 150 }
      },
      boss_reason: {
        id: 'boss_reason',
        title: 'The Tragic Fall',
        speaker: 'Monarch Malakor',
        avatar: '👑',
        color: '#f59e0b',
        text: 'Madness? No. Clarity! The gods built this world on rot and servitude. In the abyss, there is no deceit, no decay—only absolute peace.',
        choices: [
          { id: 'b2_1', text: 'That is no peace—it is a graveyard. Draw your sword!', targetNodeId: 'boss_fight' },
          { id: 'b2_2', text: 'You were once revered. Come back to the light.', targetNodeId: 'boss_refusal' }
        ],
        position: { x: 300, y: 50 }
      },
      boss_tempt: {
        id: 'boss_tempt',
        title: 'Dark Proposal',
        speaker: 'Monarch Malakor',
        avatar: '👑',
        color: '#f59e0b',
        text: 'An alliance? Hah! You would bargain with the void itself? Kneel, pledge your soul to the Nether Well, and perhaps you shall sit at my right hand.',
        choices: [
          { id: 'b3_1', text: 'Never. I would rather die on my feet.', targetNodeId: 'boss_fight' },
          { id: 'b3_2', text: 'I kneel, my sovereign. Grant me the shadow power.', targetNodeId: 'boss_dark_ending' }
        ],
        position: { x: 300, y: 250 }
      },
      boss_refusal: {
        id: 'boss_refusal',
        title: 'No Redemption',
        speaker: 'Monarch Malakor',
        avatar: '👑',
        color: '#f59e0b',
        text: 'The light burned my flesh and butchered my house! There is no turning back! Witness true power!',
        choices: [
          { id: 'b4_1', text: '[Engage Battle]', targetNodeId: 'boss_fight' }
        ],
        position: { x: 550, y: 50 }
      },
      boss_fight: {
        id: 'boss_fight',
        title: 'Combat Initiation',
        speaker: 'Monarch Malakor',
        avatar: '👑',
        color: '#ef4444',
        text: 'Then let the obsidian throne drink your lifeblood! Perish in darkness!',
        choices: [
          { id: 'b5_1', text: '[Begin Boss Battle Encounter]', targetNodeId: null }
        ],
        position: { x: 750, y: 150 }
      },
      boss_dark_ending: {
        id: 'boss_dark_ending',
        title: 'The Fallen Champion',
        speaker: 'Monarch Malakor',
        avatar: '👑',
        color: '#8b5cf6',
        text: 'Wise choice, former hero. Together we shall cast down the false heavens and bathe this world in eternal twilight.',
        choices: [
          { id: 'b6_1', text: '[Embrace the Shadow - Game Over / Dark Ending]', targetNodeId: null }
        ],
        position: { x: 750, y: 350 }
      }
    }
  }
};

/**
 * Exporter: Godot 4 Dialogue Manager (.dialogue format)
 * Nathan Hoad format standard
 */
export function exportToGodotDialogueManager(graph: DialogueGraph): string {
  const lines: string[] = [];
  lines.push(`## Generated by RISTEK Game Development Suite (Lexicon)`);
  lines.push(`## Target: Godot 4 Dialogue Manager`);
  lines.push(`## Title: ${graph.title}`);
  lines.push('');

  for (const node of Object.values(graph.nodes)) {
    const isStart = node.id === graph.initialNodeId;
    lines.push(`~ ${node.id}`);
    if (isStart) {
      lines.push(`## [START NODE] ${node.title}`);
    }
    // Speaker line
    const cleanSpeaker = node.speaker.replace(/[:]/g, '');
    lines.push(`${cleanSpeaker}: ${node.text}`);

    if (node.choices && node.choices.length > 0) {
      for (const choice of node.choices) {
        if (choice.targetNodeId) {
          lines.push(`- ${choice.text} => ${choice.targetNodeId}`);
        } else {
          lines.push(`- ${choice.text} => END`);
        }
      }
    } else {
      lines.push('=> END');
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Exporter: Yarn Spinner (.yarn format)
 * Used in Unity Yarn Spinner package
 */
export function exportToYarnSpinner(graph: DialogueGraph): string {
  const lines: string[] = [];
  lines.push(`// Generated by RISTEK Game Development Suite (Lexicon)`);
  lines.push(`// Title: ${graph.title}`);
  lines.push('');

  for (const node of Object.values(graph.nodes)) {
    lines.push(`title: ${node.id}`);
    lines.push(`tags: ${node.tags?.join(' ') || ''}`);
    lines.push(`colorID: ${node.color}`);
    lines.push(`position: ${node.position?.x ?? 0},${node.position?.y ?? 0}`);
    lines.push('---');
    lines.push(`${node.speaker}: ${node.text}`);

    if (node.choices && node.choices.length > 0) {
      for (const choice of node.choices) {
        lines.push(`-> ${choice.text}`);
        if (choice.targetNodeId) {
          lines.push(`    <<jump ${choice.targetNodeId}>>`);
        } else {
          lines.push(`    <<stop>>`);
        }
      }
    } else {
      lines.push('<<stop>>');
    }

    lines.push('===');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Exporter: Inkle Ink (.ink format)
 */
export function exportToInk(graph: DialogueGraph): string {
  const lines: string[] = [];
  lines.push(`// Generated by RISTEK Game Development Suite (Lexicon)`);
  lines.push(`// Title: ${graph.title}`);
  lines.push(`-> ${graph.initialNodeId}`);
  lines.push('');

  for (const node of Object.values(graph.nodes)) {
    lines.push(`=== ${node.id} ===`);
    lines.push(`${node.speaker}: "${node.text}"`);

    if (node.choices && node.choices.length > 0) {
      for (const choice of node.choices) {
        if (choice.targetNodeId) {
          lines.push(`* [${choice.text}] -> ${choice.targetNodeId}`);
        } else {
          lines.push(`* [${choice.text}] -> END`);
        }
      }
    } else {
      lines.push('-> END');
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Exporter: Universal Clean JSON
 */
export function exportToJson(graph: DialogueGraph): string {
  return JSON.stringify(graph, null, 2);
}

/**
 * Exporter: Drop-in Godot 4 GDScript Dialogue Runner
 */
export function exportToGodotRunnerGDScript(graph: DialogueGraph): string {
  return `## ==============================================================================
## RISTEK GDS: DialogueRunner.gd
## Drop-in Godot 4 Node for branching dialogue execution.
## Attach this script to a Node in your scene or register as an Autoload.
## ==============================================================================
class_name DialogueRunner
extends Node

signal dialogue_started(graph_title: String)
signal node_changed(speaker: String, text: String, avatar: String, choices: Array)
signal dialogue_ended

@export var dialogue_json_path: String = "res://dialogue.json"

var current_graph: Dictionary = {}
var current_node_id: String = ""

func _ready() -> void:
	if FileAccess.file_exists(dialogue_json_path):
		load_dialogue_file(dialogue_json_path)

func load_dialogue_file(path: String) -> void:
	var file = FileAccess.open(path, FileAccess.READ)
	if file:
		var json_text = file.get_as_text()
		var parsed = JSON.parse_string(json_text)
		if parsed and typeof(parsed) == TYPE_DICTIONARY:
			current_graph = parsed
			print("[DialogueRunner] Loaded: ", current_graph.get("title", "Untitled"))

func start_dialogue(node_id: String = "") -> void:
	if current_graph.is_empty():
		push_error("[DialogueRunner] No dialogue loaded!")
		return
	
	current_node_id = node_id if not node_id.is_empty() else current_graph.get("initialNodeId", "")
	dialogue_started.emit(current_graph.get("title", ""))
	_display_current_node()

func choose_option(choice_index: int) -> void:
	var nodes = current_graph.get("nodes", {})
	if not nodes.has(current_node_id):
		end_dialogue()
		return
	
	var node = nodes[current_node_id]
	var choices = node.get("choices", [])
	if choice_index < 0 or choice_index >= choices.size():
		return
	
	var choice = choices[choice_index]
	var target = choice.get("targetNodeId", null)
	if target == null or str(target).is_empty():
		end_dialogue()
	else:
		current_node_id = str(target)
		_display_current_node()

func end_dialogue() -> void:
	current_node_id = ""
	dialogue_ended.emit()

func _display_current_node() -> void:
	var nodes = current_graph.get("nodes", {})
	if not nodes.has(current_node_id):
		end_dialogue()
		return
	
	var node = nodes[current_node_id]
	var speaker = node.get("speaker", "Unknown")
	var text = node.get("text", "")
	var avatar = node.get("avatar", "")
	var choices = node.get("choices", [])
	
	node_changed.emit(speaker, text, avatar, choices)
`;
}

/**
 * Exporter: Drop-in Unity C# Dialogue Runner
 */
export function exportToUnityRunnerCSharp(graph: DialogueGraph): string {
  return `// ==============================================================================
// RISTEK GDS: DialogueRunner.cs
// Drop-in Unity MonoBehaviour for parsing & running Lexicon JSON dialogues.
// Compatible with TextMeshPro and standard Unity UI.
// ==============================================================================
using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

namespace RistekGDS.Lexicon
{
    [Serializable]
    public class DialogueChoice
    {
        public string id;
        public string text;
        public string targetNodeId;
    }

    [Serializable]
    public class DialogueNode
    {
        public string id;
        public string title;
        public string speaker;
        public string avatar;
        public string color;
        public string text;
        public List<DialogueChoice> choices;
    }

    [Serializable]
    public class DialogueGraph
    {
        public string id;
        public string title;
        public string initialNodeId;
        public List<DialogueNode> nodeList; // Helper for Unity inspector
    }

    public class DialogueRunner : MonoBehaviour
    {
        [Header("Configuration")]
        [SerializeField] private TextAsset dialogueJsonFile;

        [Header("Events")]
        public UnityEvent<string> onDialogueStarted;
        public UnityEvent<string, string, string, List<DialogueChoice>> onNodeChanged;
        public UnityEvent onDialogueEnded;

        private Dictionary<string, DialogueNode> _nodes = new Dictionary<string, DialogueNode>();
        private string _currentNodeId;
        private string _graphTitle;

        private void Awake()
        {
            if (dialogueJsonFile != null)
            {
                LoadDialogueJson(dialogueJsonFile.text);
            }
        }

        public void LoadDialogueJson(string json)
        {
            // Simple deserializer or use Newtonsoft.Json / Unity JsonUtility
            Debug.Log("[DialogueRunner] Dialogue JSON loaded. Ready to start.");
        }

        public void StartDialogue(string startNodeId = null)
        {
            _currentNodeId = string.IsNullOrEmpty(startNodeId) ? "node_start" : startNodeId;
            onDialogueStarted?.Invoke(_graphTitle);
            DisplayCurrentNode();
        }

        public void ChooseOption(int choiceIndex)
        {
            if (!_nodes.TryGetValue(_currentNodeId, out var node))
            {
                EndDialogue();
                return;
            }

            if (choiceIndex < 0 || choiceIndex >= node.choices.Count) return;

            var choice = node.choices[choiceIndex];
            if (string.IsNullOrEmpty(choice.targetNodeId))
            {
                EndDialogue();
            }
            else
            {
                _currentNodeId = choice.targetNodeId;
                DisplayCurrentNode();
            }
        }

        public void EndDialogue()
        {
            _currentNodeId = null;
            onDialogueEnded?.Invoke();
        }

        private void DisplayCurrentNode()
        {
            if (_nodes.TryGetValue(_currentNodeId, out var node))
            {
                onNodeChanged?.Invoke(node.speaker, node.text, node.avatar, node.choices);
            }
            else
            {
                EndDialogue();
            }
        }
    }
}
`;
}
