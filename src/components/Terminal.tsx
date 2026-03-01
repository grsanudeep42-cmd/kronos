'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useOSStore } from '@/store/os'
import { executeCommand } from '@/kernel/shell'

interface TerminalLine {
    id: number
    type: 'input' | 'output' | 'error' | 'system'
    content: string
    prompt?: string
}

const BOOT_LINES = [
    '[  0.000] KRONOS kernel initializing...',
    '[  0.042] Mounting virtual filesystem... OK',
    '[  0.089] Starting process scheduler... OK',
    '[  0.134] Loading IPC bus... OK',
    '[  0.178] Starting TITAN AI daemon... OK',
    '[  0.201] Loading user profile... OK',
    '[  0.234] Starting window manager... OK',
    '[  0.267] All systems nominal.',
    '[  0.289] Welcome to KRONOS OS ⚡',
]

export default function Terminal() {
    const { username, hostname, currentPath } = useOSStore()
    const [lines, setLines] = useState<TerminalLine[]>([])
    const [input, setInput] = useState('')
    const [history, setHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)
    const [booted, setBooted] = useState(false)
    const [lineId, setLineId] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const nextId = useCallback(() => {
        setLineId(p => p + 1)
        return lineId + 1
    }, [lineId])

    const addLine = useCallback((type: TerminalLine['type'], content: string, prompt?: string) => {
        setLines(prev => [...prev, { id: Date.now() + Math.random(), type, content, prompt }])
    }, [])

    // Boot sequence
    useEffect(() => {
        let i = 0
        const interval = setInterval(() => {
            if (i < BOOT_LINES.length) {
                addLine('system', BOOT_LINES[i])
                i++
            } else {
                clearInterval(interval)
                setTimeout(() => {
                    addLine('system', '')
                    addLine('system', '  ██╗  ██╗██████╗  ██████╗ ███╗   ██╗ ██████╗ ███████╗')
                    addLine('system', '  ██║ ██╔╝██╔══██╗██╔═══██╗████╗  ██║██╔═══██╗██╔════╝')
                    addLine('system', '  █████╔╝ ██████╔╝██║   ██║██╔██╗ ██║██║   ██║███████╗')
                    addLine('system', '  ██╔═██╗ ██╔══██╗██║   ██║██║╚██╗██║██║   ██║╚════██║')
                    addLine('system', '  ██║  ██╗██║  ██║╚██████╔╝██║ ╚████║╚██████╔╝███████║')
                    addLine('system', '  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝')
                    addLine('system', '')
                    addLine('system', '  Type "help" to see available commands. Type "kron --vibe" for the full experience.')
                    addLine('system', '')
                    setBooted(true)
                }, 200)
            }
        }, 80)
        return () => clearInterval(interval)
    }, [])

    // Auto scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [lines])

    // Focus input on click
    const handleContainerClick = () => inputRef.current?.focus()

    const getPrompt = () => {
        const shortPath = currentPath.replace(`/home/${username}`, '~')
        return `${username}@${hostname}:${shortPath} ⚡$`
    }

    const handleSubmit = useCallback(() => {
        if (!input.trim() && input !== '') {
            addLine('input', '', getPrompt())
            setInput('')
            return
        }

        const cmd = input.trim()
        addLine('input', cmd, getPrompt())

        if (cmd) {
            setHistory(prev => [cmd, ...prev.slice(0, 99)])
            setHistoryIndex(-1)

            const result = executeCommand(cmd)

            if (result.output === '__CLEAR__') {
                setLines([])
                setInput('')
                return
            }

            if (result.output === '__HISTORY__') {
                history.forEach((h, i) => addLine('output', `  ${i + 1}  ${h}`))
                setInput('')
                return
            }

            if (result.output) {
                result.output.split('\n').forEach(line => {
                    addLine(result.isError ? 'error' : 'output', line)
                })
            }
        }

        setInput('')
    }, [input, history, currentPath, username, hostname])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit()
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            const newIndex = Math.min(historyIndex + 1, history.length - 1)
            setHistoryIndex(newIndex)
            setInput(history[newIndex] || '')
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            const newIndex = Math.max(historyIndex - 1, -1)
            setHistoryIndex(newIndex)
            setInput(newIndex === -1 ? '' : history[newIndex] || '')
        } else if (e.key === 'Tab') {
            e.preventDefault()
            // Tab complete
            const store = useOSStore.getState()
            const parts = input.split(' ')
            const last = parts[parts.length - 1]
            if (last) {
                const children = Object.values(store.inodes)
                    .filter(n => n.parentId === store.currentPath && n.name.startsWith(last))
                if (children.length === 1) {
                    parts[parts.length - 1] = children[0].name
                    setInput(parts.join(' '))
                } else if (children.length > 1) {
                    addLine('output', children.map(c => c.name).join('  '))
                }
            }
        } else if (e.key === 'c' && e.ctrlKey) {
            addLine('input', input + '^C', getPrompt())
            setInput('')
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault()
            setLines([])
        }
    }

    const getLineColor = (type: TerminalLine['type']) => {
        switch (type) {
            case 'error': return 'text-red-400'
            case 'system': return 'text-kronos-gold'
            case 'input': return 'text-kronos-text'
            default: return 'text-kronos-green'
        }
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-black/90 font-mono text-sm flex flex-col overflow-hidden cursor-text"
            onClick={handleContainerClick}
        >
            {/* Terminal output */}
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
                {lines.map((line) => (
                    <div key={line.id} className={`flex gap-2 leading-5 whitespace-pre-wrap break-all ${getLineColor(line.type)}`}>
                        {line.prompt && (
                            <span className="text-kronos-purple shrink-0 font-bold">{line.prompt}</span>
                        )}
                        <span>{line.content}</span>
                    </div>
                ))}

                {/* Current input line */}
                {booted && (
                    <div className="flex gap-2 leading-5 items-center">
                        <span className="text-kronos-purple shrink-0 font-bold">{getPrompt()}</span>
                        <div className="relative flex-1">
                            <span className="text-kronos-text whitespace-pre">{input}</span>
                            <span className="animate-pulse text-kronos-gold">█</span>
                            <input
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="absolute inset-0 opacity-0 w-full cursor-text"
                                autoFocus
                                spellCheck={false}
                                autoComplete="off"
                            />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
        </div>
    )
}