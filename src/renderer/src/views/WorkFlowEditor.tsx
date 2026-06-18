import React, { useState, useCallback } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider
} from 'reactflow'
import { Tooltip } from 'react-tooltip'
import { motion } from 'framer-motion'
import 'reactflow/dist/style.css'
import 'react-tooltip/dist/react-tooltip.css'

import ToolNode, { getIcon } from '../components/ToolNode'
import ParameterEditorDrawer from '../components/ParameterEditorDrawer'
import MacroManagementMenu from '../components/MacroManagementMenu'

import {
  RiSave3Line,
  RiLayoutColumnLine,
  RiAddLine,
  RiPlayFill,
  RiTerminalBoxLine,
  RiSettings4Line
} from 'react-icons/ri'

import { getMacroSequence } from '@renderer/code/macro-executor'
import {
  clickOnCoordinate,
  scrollScreen,
  setVolume,
  takeScreenshot
} from '@renderer/functions/keybaord-manager'
import { closeApp, openApp, performWebSearch } from '@renderer/functions/apps-manager-api'
import {
  scheduleWhatsAppMessage,
  sendWhatsAppMessage
} from '@renderer/functions/whatsapp-manager-api'
import { runTerminal } from '@renderer/functions/coding-manager-api'
import { draftEmail, readEmails, sendEmail } from '@renderer/functions/gmail-manager-api'

// --- CONSTANTS ---
const CATEGORIZED_TOOLS = {
  TRIGGERS: [
    { name: 'TRIGGER', description: 'Starts the workflow.', parameters: {} },
    {
      name: 'WAIT',
      description: 'Pauses execution.',
      parameters: {
        properties: { milliseconds: { type: 'NUMBER', description: 'Delay in ms (e.g. 2000)' } }
      }
    }
  ],
  SYSTEM: [
    {
      name: 'open_app',
      description: 'Launch desktop app.',
      parameters: { properties: { app_name: { type: 'STRING' } } }
    },
    {
      name: 'close_app',
      description: 'Force close an app.',
      parameters: { properties: { app_name: { type: 'STRING' } } }
    },
    {
      name: 'set_volume',
      description: 'Change system volume (0-100).',
      parameters: { properties: { level: { type: 'NUMBER' } } }
    }
  ],
  AUTOMATION: [
    {
      name: 'ghost_type',
      description: 'Type text via keyboard.',
      parameters: { properties: { text: { type: 'STRING' } } }
    },
    {
      name: 'press_shortcut',
      description: 'e.g. key: "c", modifiers: ["control"].',
      parameters: {
        properties: {
          key: { type: 'STRING' },
          modifiers: { type: 'ARRAY', items: { type: 'STRING' } }
        }
      }
    },
    {
      name: 'click_on_screen',
      description: 'Click on specific X, Y coordinates.',
      parameters: {
        properties: {
          x: { type: 'NUMBER', description: 'X Coordinate (e.g. 960)' },
          y: { type: 'NUMBER', description: 'Y Coordinate (e.g. 540)' }
        }
      }
    },
    {
      name: 'run_terminal',
      description: 'Execute CLI command.',
      parameters: { properties: { command: { type: 'STRING' }, path: { type: 'STRING' } } }
    }
  ],
  WEB_INTELLIGENCE: [
    {
      name: 'google_search',
      description: 'Open a URL or search.',
      parameters: { properties: { query: { type: 'STRING' } } }
    },
    {
      name: 'deep_research',
      description: 'AI Web scrape & Notion report.',
      parameters: { properties: { query: { type: 'STRING' } } }
    },
    {
      name: 'deploy_wormhole',
      description: 'Exposes local server port to the internet.',
      parameters: { properties: { port: { type: 'NUMBER', description: 'e.g. 3000' } } }
    },
    { name: 'close_wormhole', description: 'Closes the public wormhole.', parameters: {} }
  ],
  COMMUNICATION: [
    {
      name: 'send_email',
      description: 'Send an email instantly.',
      parameters: {
        properties: {
          to: { type: 'STRING' },
          subject: { type: 'STRING' },
          body: { type: 'STRING' }
        }
      }
    },
    {
      name: 'read_emails',
      description: 'Read latest unread emails.',
      parameters: { properties: { max_results: { type: 'NUMBER', description: 'Default is 5' } } }
    },
    {
      name: 'draft_email',
      description: 'Create an email draft.',
      parameters: {
        properties: {
          to: { type: 'STRING' },
          subject: { type: 'STRING' },
          body: { type: 'STRING' }
        }
      }
    }
  ],
  MOBILE_LINK: [
    {
      name: 'open_mobile_app',
      description: 'Requires Android package name.',
      parameters: { properties: { package_name: { type: 'STRING' } } }
    },
    {
      name: 'toggle_mobile_hardware',
      description: 'Toggle Wifi/Bluetooth.',
      parameters: { properties: { setting: { type: 'STRING' }, state: { type: 'BOOLEAN' } } }
    },
    {
      name: 'send_whatsapp',
      description: 'Send instant message.',
      parameters: {
        properties: {
          name: { type: 'STRING' },
          message: { type: 'STRING' },
          file_path: { type: 'STRING', description: 'Optional' }
        }
      }
    },
    {
      name: 'schedule_whatsapp',
      description: 'Schedule a WhatsApp message.',
      parameters: {
        properties: {
          name: { type: 'STRING' },
          message: { type: 'STRING' },
          delay_minutes: { type: 'NUMBER' },
          file_path: { type: 'STRING', description: 'Optional' }
        }
      }
    }
  ]
}

const ALL_TOOLS = Object.values(CATEGORIZED_TOOLS).flat()
const nodeTypes = { customTool: ToolNode }

function Editor() {
  const [nodes, setNodes] = useState<any[]>([])
  const [edges, setEdges] = useState<any[]>([])
  const [workflowName, setWorkflowName] = useState('New IRIS Macro')
  const [description, setDescription] = useState('Custom Macro')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const openParameterEditor = useCallback((nodeId: string) => setSelectedNodeId(nodeId), [])

  const loadMacroToCanvas = (macro: any) => {
    setWorkflowName(macro.name)
    setDescription(macro.description)
    const rehydratedNodes = (macro.nodes || []).map((node: any) => ({
      ...node,
      data: { ...node.data, openParameterEditor }
    }))
    setNodes(rehydratedNodes)
    setEdges(macro.edges || [])
    setIsSaved(true)
  }

  const resetCanvas = () => {
    setWorkflowName('New IRIS Macro')
    setDescription('Custom Macro')
    setNodes([])
    setEdges([])
    setIsSaved(false)
  }

  const updateNodeInputs = useCallback(
    (nodeId: string, updatedInputs: any, updatedComment: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: { ...node.data, inputs: updatedInputs, comment: updatedComment }
            }
          }
          return node
        })
      )
    },
    []
  )

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  )
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  )

  const onConnect = useCallback(
    (params: any) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'default',
            animated: true,
            style: {
              stroke: '#10b981',
              strokeWidth: 2,
              filter: 'drop-shadow(0 0 4px rgba(16,185,129,0.5))'
            }
          },
          eds
        )
      ),
    []
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const toolName = event.dataTransfer.getData('application/reactflow')
      if (!toolName) return

      const toolSchema = ALL_TOOLS.find((t) => t.name === toolName)
      const position = { x: event.clientX - (isSidebarOpen ? 320 : 50), y: event.clientY - 100 }

      const newNode = {
        id: `${toolName}_${Date.now()}`,
        type: 'customTool',
        position,
        data: { tool: toolSchema, inputs: {}, comment: '', openParameterEditor }
      }
      setNodes((nds) => nds.concat(newNode))
    },
    [openParameterEditor, isSidebarOpen]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const saveWorkflow = async () => {
    const sanitizedNodes = nodes.map((node) => {
      const cleanData = { ...node.data }
      delete cleanData.openParameterEditor
      return { ...node, data: cleanData }
    })

    try {
      const res = await (window as any).electron.ipcRenderer.invoke('save-workflow', {
        name: workflowName,
        description,
        nodes: sanitizedNodes,
        edges
      })
      if (res.success) setIsSaved(true)
    } catch (err) {
      console.error(err)
    }
  }

  const runMacroManually = async () => {
    await saveWorkflow()
    const macroRes = await getMacroSequence(workflowName)
    if (!macroRes.success) {
      alert(`❌ Execution Failed: ${macroRes.error}`)
      return
    }

    for (const step of macroRes.steps) {
      try {
        if (step.tool === 'TRIGGER' || step.tool === 'TRIGGER_VOICE') {
          continue
        } else if (step.tool === 'WAIT') {
          await new Promise((r) => setTimeout(r, Number(step.args.milliseconds) || 1000))
        } else if (step.tool === 'set_volume') {
          await setVolume(Number(step.args.level))
        } else if (step.tool === 'open_app') {
          await openApp(step.args.app_name)
        } else if (step.tool === 'close_app') {
          await closeApp(step.args.app_name)
        } else if (step.tool === 'send_whatsapp') {
          await sendWhatsAppMessage(step.args.name, step.args.message, step.args.file_path)
        } else if (step.tool === 'schedule_whatsapp') {
          await scheduleWhatsAppMessage(
            step.args.name,
            step.args.message,
            Number(step.args.delay_minutes),
            step.args.file_path
          )
        } else if (step.tool === 'google_search') {
          await performWebSearch(step.args.query)
        } else if (step.tool === 'run_terminal') {
          await runTerminal(step.args.command, step.args.path)
        } else if (step.tool === 'send_email') {
          await sendEmail(step.args.to, step.args.subject, step.args.body)
        } else if (step.tool === 'draft_email') {
          await draftEmail(step.args.to, step.args.subject, step.args.body)
        } else if (step.tool === 'read_emails') {
          await readEmails(Number(step.args.max_results) || 5)
        } else if (step.tool === 'deploy_wormhole') {
          await (window as any).electron.ipcRenderer.invoke(
            'deploy-wormhole',
            Number(step.args.port)
          )
        } else if (step.tool === 'close_wormhole') {
          await (window as any).electron.ipcRenderer.invoke('close-wormhole')
        } else if (step.tool === 'click_on_screen') {
          await clickOnCoordinate(Number(step.args.x), Number(step.args.y))
        } else if (step.tool === 'scroll_screen') {
          await scrollScreen(step.args.direction, Number(step.args.amount))
        } else if (step.tool === 'ghost_type') {
          await (window as any).electron.ipcRenderer.invoke('ghost-sequence', [
            { type: 'type', text: step.args.text }
          ])
        } else if (step.tool === 'press_shortcut') {
          let safeModifiers: string[] = []
          if (step.args.modifiers) {
            if (Array.isArray(step.args.modifiers)) safeModifiers = step.args.modifiers
            else if (typeof step.args.modifiers === 'string') {
              safeModifiers = step.args.modifiers
                .split(',')
                .map((m: string) => m.trim())
                .filter(Boolean)
            }
          }
          await (window as any).electron.ipcRenderer.invoke('ghost-sequence', [
            { type: 'press', key: step.args.key, modifiers: safeModifiers }
          ])
        } else if (step.tool === 'take_screenshot') {
          await takeScreenshot()
        }
      } catch (stepError) {
        alert(`🔴 Macro Execution Halted! Failed at node: ${step.tool}`)
        break
      }
    }
  }

  return (
    <div className="flex h-full w-full bg-[#050505] relative overflow-hidden font-sans">
      <div
        className={`h-full bg-zinc-950/80 backdrop-blur-2xl border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out z-40 shrink-0 ${
          isSidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-none'
        }`}
      >
        <div className="p-6 h-full flex flex-col overflow-y-auto scrollbar-none w-72">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <RiTerminalBoxLine className="text-emerald-400" size={16} />
            </div>
            <h2 className="text-xs font-bold font-mono tracking-widest text-zinc-200 uppercase">
              Module Library
            </h2>
          </div>

          <div className="flex flex-col gap-8 pb-10">
            {Object.entries(CATEGORIZED_TOOLS).map(([category, tools]) => (
              <div key={category} className="flex flex-col gap-3">
                <h3 className="text-[9px] font-bold font-mono tracking-[0.2em] text-zinc-500 uppercase border-b border-white/5 pb-2">
                  {category.replace(/_/g, ' ')}
                </h3>
                <div className="flex flex-col gap-2">
                  {tools.map((tool: any) => (
                    <div
                      key={tool.name}
                      className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-xl cursor-grab hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group shadow-sm"
                      draggable
                      onDragStart={(e) =>
                        e.dataTransfer.setData('application/reactflow', tool.name)
                      }
                    >
                      <div className="p-1.5 bg-zinc-900 rounded-lg shadow-inner border border-white/5 text-zinc-400 group-hover:text-emerald-400 transition-colors">
                        {getIcon(tool.name, 14)}
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[11px] font-semibold tracking-wide text-zinc-300 group-hover:text-white transition-colors truncate">
                          {tool.name.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[9px] text-zinc-600 truncate mt-0.5">
                          {tool.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative" onDrop={onDrop} onDragOver={onDragOver}>
        <div className="absolute top-6 left-6 z-50 flex items-center gap-2 bg-zinc-950/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl">
          <Tooltip
            id="global-tooltip"
            place="bottom"
            style={{
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              zIndex: 100,
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            data-tooltip-id="global-tooltip"
            data-tooltip-content="Toggle Library"
          >
            <RiLayoutColumnLine size={18} />
          </motion.button>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={resetCanvas}
            className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            data-tooltip-id="global-tooltip"
            data-tooltip-content="New Macro"
          >
            <RiAddLine size={18} />
          </motion.button>

          <div className="px-1">
            <MacroManagementMenu loadMacroToCanvas={loadMacroToCanvas} />
          </div>

          <div className="w-px h-6 bg-white/10 mx-1" />

          <div className="flex items-center bg-black/50 border border-white/5 rounded-xl px-3 py-1.5 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all w-64">
            <RiSettings4Line size={14} className="text-zinc-500 mr-2 shrink-0" />
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-semibold text-white w-full placeholder:text-zinc-600"
              placeholder="Macro Name..."
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={runMacroManually}
            className="ml-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-5 py-2 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all border border-emerald-500/30 flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          >
            <RiPlayFill size={16} /> Run
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={saveWorkflow}
            className="bg-white hover:bg-zinc-200 text-black px-5 py-2 rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center gap-2 cursor-pointer"
          >
            <RiSave3Line size={16} /> Save
          </motion.button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          className="bg-[#050505]"
          fitView
        >
          <Background color="#ffffff" gap={24} size={1} style={{ opacity: 0.03 }} />
          <Controls className="react-flow__controls bg-zinc-900 border-white/10 fill-zinc-400" />
        </ReactFlow>

        {selectedNodeId && (
          <ParameterEditorDrawer
            nodeData={nodes.find((n) => n.id === selectedNodeId)}
            updateNodeInputs={updateNodeInputs}
            closeEditor={() => setSelectedNodeId(null)}
          />
        )}
      </div>
    </div>
  )
}

export default function WorkFlowEditorView() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  )
}
