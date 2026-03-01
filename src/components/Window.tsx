'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useOSStore } from '@/store/os'
import Terminal from './Terminal'
import SystemMonitor from './SystemMonitor'
import FileManager from './FileManager'
import CodeEditor from './CodeEditor'


interface WindowProps {
    id: string
    title: string
    app: string
    x: number
    y: number
    width: number
    height: number
    isMinimized: boolean
    isMaximized: boolean
    zIndex: number
}

const APP_COLORS: Record<string, string> = {
    terminal: '#C9A84C',
    files: '#60A5FA',
    monitor: '#4ADE80',
    editor: '#A78BFA',
}

export default function Window({ id, title, app, x, y, width, height, isMinimized, isMaximized, zIndex }: WindowProps) {
    const { focusWindow, closeWindow, minimizeWindow, moveWindow, resizeWindow, focusedWindowId } = useOSStore()
    const isFocused = focusedWindowId === id
    const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
    const [isClosing, setIsClosing] = useState(false)
    const [isAnimatingIn, setIsAnimatingIn] = useState(true)
    const dotColor = APP_COLORS[app] || '#888'

    useEffect(() => {
        const t = setTimeout(() => setIsAnimatingIn(false), 20)
        return () => clearTimeout(t)
    }, [])

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
        focusWindow(id)
    }

    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault()
        focusWindow(id)
        dragRef.current = { startX: e.clientX, startY: e.clientY, origX: x, origY: y }
        const onMove = (me: MouseEvent) => {
            if (!dragRef.current) return
            moveWindow(id,
                Math.max(0, dragRef.current.origX + me.clientX - dragRef.current.startX),
                Math.max(32, dragRef.current.origY + me.clientY - dragRef.current.startY)
            )
        }
        const onUp = () => {
            dragRef.current = null
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsClosing(true)
        setTimeout(() => closeWindow(id), 200)
    }

    if (isMinimized) return (
        <div
            className="absolute rounded-xl"
            style={{
                left: x, top: y, width, height, zIndex,
                opacity: 0,
                transform: 'scale(0.1) translateY(100vh)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: 'none'
            }}
        />
    )

    return (
        <div
            onMouseDown={handleMouseDown}
            className="absolute flex flex-col rounded-2xl overflow-hidden select-none"
            style={{
                left: isMaximized ? 0 : x,
                top: isMaximized ? 32 : y,
                width: isMaximized ? '100vw' : width,
                height: isMaximized ? 'calc(100vh - 32px)' : height,
                zIndex,
                opacity: isClosing ? 0 : isAnimatingIn ? 0 : 1,
                transform: isClosing ? 'scale(0.95) translateY(10px)' :
                    isAnimatingIn ? 'scale(0.95) translateY(10px)' :
                        'scale(1) translateY(0)',
                transition: 'opacity 0.2s ease, transform 0.2s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                background: 'linear-gradient(145deg, rgba(16,16,28,0.97) 0%, rgba(8,8,14,0.99) 100%)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: isFocused
                    ? `1px solid rgba(${hexToRgb(dotColor)}, 0.4)`
                    : '1px solid rgba(255,255,255,0.06)',
                boxShadow: isFocused
                    ? `0 0 0 1px rgba(${hexToRgb(dotColor)}, 0.1), 0 32px 64px rgba(0,0,0,0.95), 0 0 120px rgba(${hexToRgb(dotColor)}, 0.06)`
                    : '0 20px 40px rgba(0,0,0,0.8)',
            }}
        >
            {/* Title bar */}
            <div
                className="flex items-center gap-3 px-4 py-3 cursor-move shrink-0 relative"
                style={{
                    background: isFocused
                        ? `linear-gradient(90deg, rgba(${hexToRgb(dotColor)}, 0.06) 0%, transparent 60%)`
                        : 'rgba(255,255,255,0.02)',
                    borderBottom: `1px solid ${isFocused ? `rgba(${hexToRgb(dotColor)}, 0.12)` : 'rgba(255,255,255,0.04)'}`,
                }}
                onMouseDown={handleDragStart}
            >
                {/* Traffic lights */}
                <div className="flex gap-2 items-center shrink-0">
                    <TrafficLight color="#FF5F57" hoverColor="#FF3B30" onClick={handleClose} title="Close" />
                    <TrafficLight color="#FEBC2E" hoverColor="#FF9500" onClick={(e) => { e.stopPropagation(); minimizeWindow(id) }} title="Minimize" />
                    <TrafficLight color="#28C840" hoverColor="#34C759" onClick={(e) => { e.stopPropagation() }} title="Maximize" />
                </div>

                {/* Title */}
                <div className="flex-1 flex items-center justify-center gap-2 pointer-events-none">
                    <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                            background: dotColor,
                            boxShadow: isFocused ? `0 0 8px ${dotColor}` : 'none'
                        }}
                    />
                    <span
                        className="text-xs font-mono font-medium tracking-wide"
                        style={{ color: isFocused ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}
                    >
                        {title}
                    </span>
                </div>

                {/* Right side — window controls */}
                <div className="shrink-0 w-16" />
            </div>

            {/* App content */}
            <div className="flex-1 overflow-hidden">
                {app === 'terminal' && <TabbedTerminal />}
                {app === 'monitor' && <SystemMonitor />}
                {app === 'files' && <FileManager />}
                {app === 'editor' && <CodeEditor />}
            </div>

            {/* Resize handle */}
            <ResizeHandle id={id} onResize={resizeWindow} currentWidth={width} currentHeight={height} />
        </div>
    )
}

function TrafficLight({ color, hoverColor, onClick, title }: {
    color: string, hoverColor: string, onClick: (e: React.MouseEvent) => void, title: string
}) {
    const [hovered, setHovered] = useState(false)
    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={title}
            className="w-3 h-3 rounded-full transition-all duration-150 flex items-center justify-center"
            style={{
                background: hovered ? hoverColor : color,
                boxShadow: hovered ? `0 0 8px ${hoverColor}` : `0 0 4px ${color}66`,
                transform: hovered ? 'scale(1.1)' : 'scale(1)',
            }}
        />
    )
}

function ResizeHandle({ id, onResize, currentWidth, currentHeight }: {
    id: string, onResize: (id: string, w: number, h: number) => void,
    currentWidth: number, currentHeight: number
}) {
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const startX = e.clientX
        const startY = e.clientY
        const startW = currentWidth
        const startH = currentHeight
        const onMove = (me: MouseEvent) => {
            onResize(id,
                Math.max(400, startW + me.clientX - startX),
                Math.max(300, startH + me.clientY - startY)
            )
        }
        const onUp = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    return (
        <div
            onMouseDown={handleMouseDown}
            className="absolute cursor-se-resize z-50"
            style={{ bottom: 0, right: 0, width: 20, height: 20 }}
        >
            <svg width="12" height="12" viewBox="0 0 12 12"
                style={{ position: 'absolute', bottom: 4, right: 4, opacity: 0.25 }}>
                <circle cx="10" cy="10" r="1.5" fill="white" />
                <circle cx="6" cy="10" r="1.5" fill="white" />
                <circle cx="10" cy="6" r="1.5" fill="white" />
                <circle cx="2" cy="10" r="1.5" fill="white" />
                <circle cx="6" cy="6" r="1.5" fill="white" />
                <circle cx="10" cy="2" r="1.5" fill="white" />
            </svg>
        </div>
    )
}

function PlaceholderApp({ label, icon, color }: { label: string, icon: string, color: string }) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}>
            <div className="text-5xl">{icon}</div>
            <div className="font-mono text-sm" style={{ color: color }}>{label}</div>
            <div className="font-mono text-xs" style={{ color: '#444' }}>Coming soon...</div>
        </div>
    )
}

function TabbedTerminal() {
    const [tabs, setTabs] = useState([{ id: 1, title: 'ksh — 1' }])
    const [activeTab, setActiveTab] = useState(1)

    const addTab = () => {
        const id = Date.now()
        setTabs(t => [...t, { id, title: `ksh — ${t.length + 1}` }])
        setActiveTab(id)
    }

    const closeTab = (id: number, e: React.MouseEvent) => {
        e.stopPropagation()
        if (tabs.length === 1) return
        const next = tabs.filter(t => t.id !== id)
        setTabs(next)
        if (activeTab === id) setActiveTab(next[next.length - 1].id)
    }

    return (
        <div className="w-full h-full flex flex-col">
            {/* Tab bar */}
            <div className="flex items-center shrink-0 overflow-x-auto"
                style={{ background: 'rgba(0,0,0,0.6)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {tabs.map(tab => (
                    <div
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="flex items-center gap-2 px-3 py-1.5 cursor-pointer shrink-0 transition-all font-mono text-xs"
                        style={{
                            background: activeTab === tab.id ? 'rgba(201,168,76,0.1)' : 'transparent',
                            borderBottom: activeTab === tab.id ? '2px solid #C9A84C' : '2px solid transparent',
                            color: activeTab === tab.id ? '#C9A84C' : '#555',
                        }}
                    >
                        <span>⚡</span>
                        <span>{tab.title}</span>
                        {tabs.length > 1 && (
                            <button
                                onClick={e => closeTab(tab.id, e)}
                                className="hover:text-white transition-colors"
                                style={{ color: '#444', fontSize: 10, marginLeft: 2 }}
                            >✕</button>
                        )}
                    </div>
                ))}
                <button
                    onClick={addTab}
                    className="px-3 py-1.5 font-mono text-xs transition-all hover:text-white shrink-0"
                    style={{ color: '#444' }}
                >+</button>
            </div>

            {/* Terminal instances */}
            <div className="flex-1 overflow-hidden">
                {tabs.map(tab => (
                    <div key={tab.id} className="w-full h-full"
                        style={{ display: activeTab === tab.id ? 'block' : 'none' }}>
                        <Terminal />
                    </div>
                ))}
            </div>
        </div>
    )
}

function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `${r}, ${g}, ${b}`
}