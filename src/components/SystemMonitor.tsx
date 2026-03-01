'use client'
import { useEffect, useRef, useState } from 'react'
import { useOSStore } from '@/store/os'

export default function SystemMonitor() {
    const { processes, inodes, spawnProcess, killProcess } = useOSStore()
    const [tick, setTick] = useState(0)
    const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(0))
    const [memHistory, setMemHistory] = useState<number[]>(Array(30).fill(0))
    const [activeTab, setActiveTab] = useState<'processes' | 'cpu' | 'memory' | 'filesystem'>('processes')

    // Live updates every second
    useEffect(() => {
        const interval = setInterval(() => {
            setTick(t => t + 1)
            const totalCpu = processes.reduce((a, p) => a + p.cpuPercent, 0)
            const totalMem = processes.reduce((a, p) => a + p.memoryMB, 0)
            setCpuHistory(h => [...h.slice(1), Math.min(totalCpu, 100)])
            setMemHistory(h => [...h.slice(1), totalMem])
        }, 1000)
        return () => clearInterval(interval)
    }, [processes])

    const totalMem = processes.reduce((a, p) => a + p.memoryMB, 0)
    const totalCpu = processes.reduce((a, p) => a + p.cpuPercent, 0)
    const fileCount = Object.keys(inodes).length

    const tabs = [
        { id: 'processes', label: 'Processes', icon: '⚡' },
        { id: 'cpu', label: 'CPU', icon: '📈' },
        { id: 'memory', label: 'Memory', icon: '🧠' },
        { id: 'filesystem', label: 'Filesystem', icon: '📁' },
    ] as const

    return (
        <div className="w-full h-full flex flex-col font-mono text-xs overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.9)', color: '#E2E2E2' }}>

            {/* Header stats bar */}
            <div className="flex gap-4 px-4 py-3 border-b shrink-0"
                style={{ borderColor: 'rgba(201,168,76,0.15)' }}>
                <StatPill label="CPU" value={`${totalCpu.toFixed(1)}%`} color="#C9A84C" percent={totalCpu} />
                <StatPill label="MEM" value={`${totalMem}MB`} color="#7B61FF" percent={(totalMem / 512) * 100} />
                <StatPill label="PROCS" value={String(processes.length)} color="#4ADE80" percent={(processes.length / 20) * 100} />
                <StatPill label="FILES" value={String(fileCount)} color="#60A5FA" percent={(fileCount / 50) * 100} />
            </div>

            {/* Tabs */}
            <div className="flex border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="px-4 py-2 text-xs transition-all"
                        style={{
                            color: activeTab === tab.id ? '#C9A84C' : '#666',
                            borderBottom: activeTab === tab.id ? '2px solid #C9A84C' : '2px solid transparent',
                            background: activeTab === tab.id ? 'rgba(201,168,76,0.05)' : 'transparent',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'processes' && (
                    <ProcessTable
                        processes={processes}
                        onKill={killProcess}
                        onSpawn={() => spawnProcess(`proc-${Date.now() % 1000}`, Math.floor(Math.random() * 10))}
                    />
                )}
                {activeTab === 'cpu' && <GraphPanel history={cpuHistory} label="CPU Usage %" color="#C9A84C" max={100} />}
                {activeTab === 'memory' && <GraphPanel history={memHistory} label="Memory Usage (MB)" color="#7B61FF" max={512} />}
                {activeTab === 'filesystem' && <FilesystemPanel inodes={inodes} />}
            </div>
        </div>
    )
}

function StatPill({ label, value, color, percent }: { label: string, value: string, color: string, percent: number }) {
    return (
        <div className="flex flex-col gap-1 min-w-[80px]">
            <div className="flex justify-between">
                <span style={{ color: '#666' }}>{label}</span>
                <span style={{ color }} className="font-bold">{value}</span>
            </div>
            <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(percent, 100)}%`, background: color }}
                />
            </div>
        </div>
    )
}

function ProcessTable({ processes, onKill, onSpawn }: {
    processes: any[], onKill: (pid: number) => void, onSpawn: () => void
}) {
    return (
        <div className="p-3">
            <div className="flex justify-between items-center mb-3">
                <span style={{ color: '#C9A84C' }}>● {processes.length} processes running</span>
                <button
                    onClick={onSpawn}
                    className="px-3 py-1 rounded text-xs transition-all hover:opacity-80"
                    style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ADE80' }}
                >
                    + Spawn Process
                </button>
            </div>

            {/* Table header */}
            <div className="grid gap-2 px-2 py-1 mb-1 text-xs"
                style={{ gridTemplateColumns: '40px 1fr 80px 50px 70px 70px 50px', color: '#666', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span>PID</span><span>NAME</span><span>STATE</span><span>PRI</span><span>MEM</span><span>CPU</span><span>KILL</span>
            </div>

            {processes.map(p => (
                <div
                    key={p.pid}
                    className="grid gap-2 px-2 py-1.5 rounded mb-0.5 transition-all hover:bg-white/5"
                    style={{ gridTemplateColumns: '40px 1fr 80px 50px 70px 70px 50px' }}
                >
                    <span style={{ color: '#C9A84C' }}>{p.pid}</span>
                    <span style={{ color: '#E2E2E2' }}>{p.name}</span>
                    <span style={{ color: stateColor(p.state) }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ background: stateColor(p.state) }} />
                        {p.state}
                    </span>
                    <span style={{ color: '#888' }}>{p.priority}</span>
                    <span style={{ color: '#7B61FF' }}>{p.memoryMB}MB</span>
                    <CpuBar value={p.cpuPercent} />
                    {p.pid > 2 ? (
                        <button
                            onClick={() => onKill(p.pid)}
                            className="text-red-400 hover:text-red-300 transition-colors text-left"
                        >
                            ✕
                        </button>
                    ) : <span style={{ color: '#333' }}>—</span>}
                </div>
            ))}
        </div>
    )
}

function CpuBar({ value }: { value: number }) {
    return (
        <div className="flex items-center gap-1">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                        width: `${Math.min(value * 10, 100)}%`,
                        background: value > 50 ? '#F87171' : value > 20 ? '#C9A84C' : '#4ADE80'
                    }}
                />
            </div>
            <span style={{ color: '#666', minWidth: 28 }}>{value.toFixed(1)}</span>
        </div>
    )
}

function GraphPanel({ history, label, color, max }: { history: number[], label: string, color: string, max: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const w = canvas.width
        const h = canvas.height
        ctx.clearRect(0, 0, w, h)

        // Grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.05)'
        ctx.lineWidth = 1
        for (let i = 0; i <= 4; i++) {
            const y = (h / 4) * i
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(w, y)
            ctx.stroke()
        }

        // Labels
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.font = '10px JetBrains Mono'
        ctx.fillText(`${max}`, 4, 12)
        ctx.fillText('0', 4, h - 4)

        // Fill
        ctx.beginPath()
        ctx.moveTo(0, h)
        history.forEach((val, i) => {
            const x = (i / (history.length - 1)) * w
            const y = h - (val / max) * h
            i === 0 ? ctx.lineTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.lineTo(w, h)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, 0, 0, h)
        grad.addColorStop(0, color + '44')
        grad.addColorStop(1, color + '08')
        ctx.fillStyle = grad
        ctx.fill()

        // Line
        ctx.beginPath()
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        history.forEach((val, i) => {
            const x = (i / (history.length - 1)) * w
            const y = h - (val / max) * h
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        })
        ctx.stroke()

        // Current value dot
        const lastX = w
        const lastY = h - (history[history.length - 1] / max) * h
        ctx.beginPath()
        ctx.arc(lastX - 2, lastY, 4, 0, Math.PI * 2)
        ctx.fillStyle = color
        ctx.fill()

    }, [history, color, max])

    const current = history[history.length - 1]

    return (
        <div className="p-4 flex flex-col gap-3 h-full">
            <div className="flex justify-between items-center">
                <span style={{ color: '#888' }}>{label}</span>
                <span style={{ color }} className="text-lg font-bold">
                    {current.toFixed(1)}{label.includes('%') ? '%' : 'MB'}
                </span>
            </div>
            <canvas
                ref={canvasRef}
                width={600}
                height={200}
                className="w-full rounded-lg"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            />
            <div className="flex justify-between text-xs" style={{ color: '#444' }}>
                <span>30s ago</span>
                <span>now</span>
            </div>
        </div>
    )
}

function FilesystemPanel({ inodes }: { inodes: Record<string, any> }) {
    const dirs = Object.values(inodes).filter(n => n.type === 'directory')
    const files = Object.values(inodes).filter(n => n.type === 'file')

    return (
        <div className="p-4">
            <div className="flex gap-4 mb-4">
                <div className="px-3 py-2 rounded" style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <span style={{ color: '#60A5FA' }}>📁 {dirs.length} directories</span>
                </div>
                <div className="px-3 py-2 rounded" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <span style={{ color: '#4ADE80' }}>📄 {files.length} files</span>
                </div>
            </div>

            <div className="space-y-0.5">
                {Object.values(inodes).map(node => (
                    <div key={node.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/5 transition-all">
                        <span>{node.type === 'directory' ? '📁' : '📄'}</span>
                        <span style={{ color: node.type === 'directory' ? '#60A5FA' : '#E2E2E2' }}
                            className="flex-1 truncate">{node.id}</span>
                        <span style={{ color: '#444' }}>{node.size}B</span>
                        <span style={{ color: '#333' }}>{node.permissions}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function stateColor(state: string) {
    switch (state) {
        case 'running': return '#4ADE80'
        case 'sleeping': return '#C9A84C'
        case 'stopped': return '#F87171'
        case 'zombie': return '#888'
        default: return '#666'
    }
}