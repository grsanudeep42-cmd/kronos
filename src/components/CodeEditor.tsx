'use client'
import { useState, useEffect } from 'react'
import { useOSStore } from '@/store/os'
import { getChildrenOf } from '@/store/os'
import dynamic from 'next/dynamic'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'ts': case 'tsx': return 'typescript'
        case 'js': case 'jsx': return 'javascript'
        case 'css': return 'css'
        case 'html': return 'html'
        case 'json': return 'json'
        case 'md': return 'markdown'
        case 'sh': case 'krn': return 'shell'
        case 'py': return 'python'
        default: return 'plaintext'
    }
}

export default function CodeEditor() {
    const { inodes, updateINodeContent, currentPath } = useOSStore()
    const [openFiles, setOpenFiles] = useState<string[]>([])
    const [activeFile, setActiveFile] = useState<string | null>(null)
    const [unsaved, setUnsaved] = useState<Set<string>>(new Set())
    const [browsePath, setBrowsePath] = useState('/home/anudeep')

    const files = Object.values(inodes).filter(n => n.type === 'file')
    const activeNode = activeFile ? inodes[activeFile] : null

    const openFile = (path: string) => {
        if (!openFiles.includes(path)) setOpenFiles(p => [...p, path])
        setActiveFile(path)
    }

    const closeFile = (path: string) => {
        const next = openFiles.filter(f => f !== path)
        setOpenFiles(next)
        setActiveFile(next[next.length - 1] || null)
        setUnsaved(s => { const n = new Set(s); n.delete(path); return n })
    }

    const handleChange = (value: string | undefined) => {
        if (!activeFile || value === undefined) return
        setUnsaved(s => new Set(s).add(activeFile))
        updateINodeContent(activeFile, value)
    }

    const handleSave = () => {
        if (!activeFile) return
        setUnsaved(s => { const n = new Set(s); n.delete(activeFile); return n })
    }

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [activeFile])

    const sidebarFiles = Object.values(inodes)
        .filter(n => n.type === 'file')
        .sort((a, b) => a.id.localeCompare(b.id))

    return (
        <div className="w-full h-full flex font-mono text-xs"
            style={{ background: '#0d0d0d' }}>

            {/* Sidebar */}
            <div className="w-44 shrink-0 flex flex-col overflow-hidden"
                style={{ borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.6)' }}>
                <div className="px-3 py-2 text-xs font-bold tracking-widest"
                    style={{ color: '#C9A84C', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    EXPLORER
                </div>
                <div className="flex-1 overflow-auto py-1">
                    {sidebarFiles.map(node => (
                        <div
                            key={node.id}
                            onClick={() => openFile(node.id)}
                            className="flex items-center gap-2 px-3 py-1 cursor-pointer transition-all hover:bg-white/5"
                            style={{
                                background: activeFile === node.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                                borderLeft: activeFile === node.id ? '2px solid #C9A84C' : '2px solid transparent',
                                color: activeFile === node.id ? '#E2E2E2' : '#666',
                            }}
                        >
                            <span>{getFileEmoji(node.name)}</span>
                            <span className="truncate" style={{ fontSize: 10 }}>{node.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Editor area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                {openFiles.length > 0 && (
                    <div className="flex overflow-x-auto shrink-0"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.4)' }}>
                        {openFiles.map(path => {
                            const name = path.split('/').pop() || path
                            const isActive = path === activeFile
                            const isDirty = unsaved.has(path)
                            return (
                                <div
                                    key={path}
                                    onClick={() => setActiveFile(path)}
                                    className="flex items-center gap-2 px-3 py-2 cursor-pointer shrink-0 transition-all"
                                    style={{
                                        background: isActive ? 'rgba(201,168,76,0.08)' : 'transparent',
                                        borderBottom: isActive ? '2px solid #C9A84C' : '2px solid transparent',
                                        color: isActive ? '#E2E2E2' : '#555',
                                    }}
                                >
                                    <span style={{ fontSize: 10 }}>{getFileEmoji(name)}</span>
                                    <span style={{ fontSize: 11 }}>{name}</span>
                                    {isDirty && <span style={{ color: '#C9A84C', fontSize: 8 }}>●</span>}
                                    <button
                                        onClick={e => { e.stopPropagation(); closeFile(path) }}
                                        className="hover:text-white transition-colors ml-1"
                                        style={{ color: '#444', fontSize: 10 }}
                                    >✕</button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Monaco */}
                {activeNode ? (
                    <div className="flex-1 overflow-hidden">
                        <MonacoEditor
                            height="100%"
                            language={getLanguage(activeNode.name)}
                            value={activeNode.content || ''}
                            onChange={handleChange}
                            theme="vs-dark"
                            options={{
                                fontSize: 13,
                                fontFamily: 'JetBrains Mono, monospace',
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                lineNumbers: 'on',
                                roundedSelection: true,
                                automaticLayout: true,
                                tabSize: 2,
                                wordWrap: 'on',
                                padding: { top: 12 },
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3"
                        style={{ color: '#333' }}>
                        <span className="text-5xl">✏️</span>
                        <span style={{ color: '#444' }}>Select a file to edit</span>
                        <span style={{ color: '#333', fontSize: 10 }}>Ctrl+S to save</span>
                    </div>
                )}

                {/* Status bar */}
                {activeNode && (
                    <div className="px-3 py-1 flex justify-between shrink-0"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(201,168,76,0.05)', color: '#666' }}>
                        <span style={{ color: '#C9A84C' }}>{getLanguage(activeNode.name)}</span>
                        <span>{activeNode.name} — {activeNode.size}B</span>
                        <span>{unsaved.has(activeFile!) ? '● unsaved' : '✓ saved'}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

function getFileEmoji(name: string) {
    const ext = name.split('.').pop()?.toLowerCase()
    switch (ext) {
        case 'ts': case 'tsx': return '💙'
        case 'js': case 'jsx': return '💛'
        case 'css': return '🎨'
        case 'html': return '🌐'
        case 'json': return '🔧'
        case 'md': return '📝'
        case 'sh': case 'krn': return '⚡'
        case 'py': return '🐍'
        default: return '📄'
    }
}