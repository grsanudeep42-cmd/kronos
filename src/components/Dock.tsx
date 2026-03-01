'use client'
import { useState } from 'react'
import { useOSStore } from '@/store/os'

const DOCK_APPS = [
    { id: 'terminal', icon: '⚡', label: 'Terminal', color: '#C9A84C' },
    { id: 'files', icon: '📁', label: 'Files', color: '#60A5FA' },
    { id: 'monitor', icon: '📊', label: 'Monitor', color: '#4ADE80' },
    { id: 'editor', icon: '✏️', label: 'Editor', color: '#A78BFA' },
]

export default function Dock() {
    const { openWindow, windows } = useOSStore()
    const [hovered, setHovered] = useState<string | null>(null)

    const handleOpen = (app: typeof DOCK_APPS[0]) => {
        const labels: Record<string, string> = {
            terminal: 'KRONOS Terminal',
            files: 'File Manager',
            monitor: 'System Monitor',
            editor: 'Code Editor',
        }
        openWindow(app.id, labels[app.id] || app.label)
    }

    const isOpen = (appId: string) => windows.some(w => w.app === appId && !w.isMinimized)

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <div
                className="glass flex items-end gap-2 px-4 py-3 rounded-2xl"
                style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.15)' }}
            >
                {DOCK_APPS.map(app => {
                    const scale = hovered === app.id ? 1.4 : 1
                    return (
                        <div key={app.id} className="flex flex-col items-center gap-1 relative">
                            {/* Tooltip */}
                            {hovered === app.id && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap border border-white/10">
                                    {app.label}
                                </div>
                            )}

                            {/* Icon */}
                            <button
                                onClick={() => handleOpen(app)}
                                onMouseEnter={() => setHovered(app.id)}
                                onMouseLeave={() => setHovered(null)}
                                className="flex items-center justify-center rounded-xl text-2xl transition-all duration-150 cursor-pointer"
                                style={{
                                    width: 48, height: 48,
                                    transform: `scale(${scale}) translateY(${hovered === app.id ? -6 : 0}px)`,
                                    background: `linear-gradient(135deg, ${app.color}22, ${app.color}11)`,
                                    border: `1px solid ${app.color}44`,
                                    boxShadow: hovered === app.id ? `0 0 20px ${app.color}44` : 'none',
                                }}
                            >
                                {app.icon}
                            </button>

                            {/* Open indicator dot */}
                            {isOpen(app.id) && (
                                <div className="w-1 h-1 rounded-full" style={{ background: app.color }} />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}