'use client'
import { useState } from 'react'
import { useOSStore, INode } from '@/store/os'
import { getChildrenOf } from '@/store/os'

export default function FileManager() {
    const { inodes, currentPath, setCurrentPath, createINode, deleteINode } = useOSStore()
    const [browsePath, setBrowsePath] = useState('/home/anudeep')
    const [selected, setSelected] = useState<string | null>(null)
    const [renaming, setRenaming] = useState<string | null>(null)
    const [newName, setNewName] = useState('')
    const [creating, setCreating] = useState<'file' | 'folder' | null>(null)
    const [createName, setCreateName] = useState('')
    const [preview, setPreview] = useState<INode | null>(null)

    const children = getChildrenOf(inodes, browsePath)
    const dirs = children.filter(n => n.type === 'directory').sort((a, b) => a.name.localeCompare(b.name))
    const files = children.filter(n => n.type === 'file').sort((a, b) => a.name.localeCompare(b.name))
    const allItems = [...dirs, ...files]

    const pathParts = browsePath.split('/').filter(Boolean)

    const navigate = (path: string) => {
        setBrowsePath(path)
        setSelected(null)
        setPreview(null)
    }

    const navigateUp = () => {
        const parts = browsePath.split('/').filter(Boolean)
        if (parts.length === 0) return
        parts.pop()
        navigate('/' + parts.join('/') || '/')
    }

    const handleClick = (node: INode) => {
        setSelected(node.id)
        if (node.type === 'file') setPreview(node)
        else setPreview(null)
    }

    const handleDoubleClick = (node: INode) => {
        if (node.type === 'directory') navigate(node.id)
    }

    const handleDelete = () => {
        if (!selected) return
        deleteINode(selected)
        setSelected(null)
        setPreview(null)
    }

    const handleCreate = () => {
        if (!createName.trim()) return
        const path = `${browsePath}/${createName.trim()}`
        const nodeType = creating === 'folder' ? 'directory' : 'file'
        createINode(path, nodeType, creating === 'file' ? '' : undefined)
        setCreating(null)
        setCreateName('')
    }

    const getFileIcon = (node: INode) => {
        if (node.type === 'directory') return '📁'
        const ext = node.name.split('.').pop()?.toLowerCase()
        switch (ext) {
            case 'ts': case 'tsx': return '💙'
            case 'js': case 'jsx': return '💛'
            case 'md': return '📝'
            case 'txt': return '📄'
            case 'json': return '🔧'
            case 'css': return '🎨'
            case 'html': return '🌐'
            case 'sh': case 'krn': return '⚡'
            default: return '📄'
        }
    }

    return (
        <div className="w-full h-full flex flex-col font-mono text-xs"
            style={{ background: 'rgba(0,0,0,0.9)', color: '#E2E2E2' }}>

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                <button onClick={navigateUp}
                    className="px-2 py-1 rounded text-xs hover:bg-white/10 transition-all"
                    style={{ color: '#C9A84C' }}>← Up</button>

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 flex-1 overflow-hidden">
                    <span style={{ color: '#444' }}>/</span>
                    {pathParts.map((part, i) => {
                        const path = '/' + pathParts.slice(0, i + 1).join('/')
                        return (
                            <span key={path} className="flex items-center gap-1">
                                <button onClick={() => navigate(path)}
                                    className="hover:text-kronos-gold transition-colors"
                                    style={{ color: i === pathParts.length - 1 ? '#C9A84C' : '#888' }}>
                                    {part}
                                </button>
                                {i < pathParts.length - 1 && <span style={{ color: '#333' }}>/</span>}
                            </span>
                        )
                    })}
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setCreating('folder'); setCreateName('') }}
                        className="px-2 py-1 rounded text-xs transition-all hover:opacity-80"
                        style={{ background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.2)', color: '#60A5FA' }}>
                        + Folder
                    </button>
                    <button onClick={() => { setCreating('file'); setCreateName('') }}
                        className="px-2 py-1 rounded text-xs transition-all hover:opacity-80"
                        style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ADE80' }}>
                        + File
                    </button>
                    {selected && (
                        <button onClick={handleDelete}
                            className="px-2 py-1 rounded text-xs transition-all hover:opacity-80"
                            style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.2)', color: '#F87171' }}>
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Create input */}
            {creating && (
                <div className="flex items-center gap-2 px-3 py-2 shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(201,168,76,0.05)' }}>
                    <span style={{ color: '#C9A84C' }}>New {creating}:</span>
                    <input
                        autoFocus
                        value={createName}
                        onChange={e => setCreateName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(null) }}
                        className="flex-1 bg-transparent outline-none border-b px-1"
                        style={{ borderColor: '#C9A84C', color: '#E2E2E2' }}
                        placeholder={`${creating} name...`}
                    />
                    <button onClick={handleCreate} style={{ color: '#4ADE80' }}>✓</button>
                    <button onClick={() => setCreating(null)} style={{ color: '#F87171' }}>✕</button>
                </div>
            )}

            {/* Main content */}
            <div className="flex flex-1 overflow-hidden">
                {/* File grid */}
                <div className="flex-1 overflow-auto p-3">
                    {allItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2"
                            style={{ color: '#333' }}>
                            <span className="text-4xl">📂</span>
                            <span>Empty directory</span>
                        </div>
                    ) : (
                        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                            {allItems.map(node => (
                                <div
                                    key={node.id}
                                    onClick={() => handleClick(node)}
                                    onDoubleClick={() => handleDoubleClick(node)}
                                    className="flex flex-col items-center gap-1 p-2 rounded-lg cursor-pointer transition-all"
                                    style={{
                                        background: selected === node.id ? 'rgba(201,168,76,0.15)' : 'transparent',
                                        border: selected === node.id ? '1px solid rgba(201,168,76,0.3)' : '1px solid transparent',
                                    }}
                                >
                                    <span className="text-2xl">{getFileIcon(node)}</span>
                                    <span className="text-center break-all leading-tight"
                                        style={{ color: node.type === 'directory' ? '#60A5FA' : '#E2E2E2', fontSize: 10 }}>
                                        {node.name}
                                    </span>
                                    {node.type === 'file' && (
                                        <span style={{ color: '#444', fontSize: 9 }}>{node.size}B</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Preview panel */}
                {preview && (
                    <div className="w-48 shrink-0 overflow-auto p-3 flex flex-col gap-2"
                        style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                        <div className="text-center text-2xl">{getFileIcon(preview)}</div>
                        <div style={{ color: '#C9A84C' }} className="text-center font-bold break-all">{preview.name}</div>
                        <div style={{ color: '#444' }}>Size: {preview.size}B</div>
                        <div style={{ color: '#444' }}>Modified: {new Date(preview.modifiedAt).toLocaleDateString()}</div>
                        <div style={{ color: '#444' }}>Perms: {preview.permissions}</div>
                        {preview.content && (
                            <div className="mt-2">
                                <div style={{ color: '#666', marginBottom: 4 }}>Contents:</div>
                                <div className="p-2 rounded text-xs break-all"
                                    style={{ background: 'rgba(0,0,0,0.4)', color: '#4ADE80', maxHeight: 120, overflow: 'auto' }}>
                                    {preview.content}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="px-3 py-1.5 shrink-0 flex justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#444' }}>
                <span>{allItems.length} items ({dirs.length} folders, {files.length} files)</span>
                {selected && <span style={{ color: '#C9A84C' }}>{selected.split('/').pop()} selected</span>}
            </div>
        </div>
    )
}