import { useState, useEffect } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { FileCode2, ExternalLink, X, Sparkles } from 'lucide-react'

export default function LiveCodingWidget() {
  const monaco = useMonaco()
  const [isVisible, setIsVisible] = useState(false)
  const [filename, setFilename] = useState('')
  const [filePath, setFilePath] = useState('')
  const [code, setCode] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('iris-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [{ token: 'comment', foreground: '10b981', fontStyle: 'italic' }],
        colors: { 'editor.background': '#00000000' }
      })
      monaco.editor.setTheme('iris-dark')
    }
  }, [monaco])

  useEffect(() => {
    if (!window.electron?.ipcRenderer) return

    const handleOpenWidget = (_event: any, data: { filename: string }) => {
      setFilename(data.filename)
      setCode('// Boss, connection established. Initializing IRIS Neural Forge...\n')
      setFilePath('')
      setIsGenerating(true)
      setIsVisible(true)
    }

    const handleCodeChunk = (_event: any, chunkText: string) => {
      setCode((prev) => prev + chunkText)
    }

    const handleComplete = (_event: any, data: { filePath: string }) => {
      setIsGenerating(false)
      if (data.filePath) setFilePath(data.filePath)
    }

    window.electron.ipcRenderer.on('open-coding-widget', handleOpenWidget)
    window.electron.ipcRenderer.on('live-code-chunk', handleCodeChunk)
    window.electron.ipcRenderer.on('coding-complete', handleComplete)

    return () => {
      window.electron.ipcRenderer.removeListener('open-coding-widget', handleOpenWidget)
      window.electron.ipcRenderer.removeListener('live-code-chunk', handleCodeChunk)
      window.electron.ipcRenderer.removeListener('coding-complete', handleComplete)
    }
  }, [])

  if (!isVisible) return null

  return (
    <div className="absolute inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm p-10">
      <div className="w-full max-w-4xl h-[70vh] flex flex-col bg-[#0a0a0a] border border-emerald-500/30 rounded-xl shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden">
        <div className="h-12 bg-black border-b border-white/5 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Sparkles
              className={`w-4 h-4 ${isGenerating ? 'text-emerald-400 animate-spin' : 'text-emerald-500'}`}
            />
            <FileCode2 className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-mono text-emerald-100">{filename || 'Building...'}</span>
          </div>

          <div className="flex items-center gap-3">
            {!isGenerating && filePath && (
              <button
                onClick={() => window.electron.ipcRenderer.invoke('open-in-vscode', filePath)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-xs font-mono text-emerald-300 transition cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" /> OPEN IN VS CODE
              </button>
            )}
            <button
              onClick={() => setIsVisible(false)}
              className="p-1 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 rounded transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative pt-4 bg-[#050505]">
          <Editor
            height="100%"
            language={
              filename.endsWith('.py')
                ? 'python'
                : filename.endsWith('.ts') || filename.endsWith('.tsx')
                  ? 'typescript'
                  : 'javascript'
            }
            theme="iris-dark"
            value={code}
            options={{
              readOnly: true,
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Fira Code', monospace",
              scrollBeyondLastLine: false,
              smoothScrolling: true
            }}
          />
        </div>
      </div>
    </div>
  )
}