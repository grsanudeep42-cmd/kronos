'use client'
import { useEffect, useRef } from 'react'
import { useOSStore } from '@/store/os'

interface MenuItem {
    label: string
    icon: string
    action: () => void
    divider?: boolean
    color?: string
}

interface ContextMenuProps {
    x: number
    y: number
    onClose: () => void
}

export default function ContextMenu({ x, y, onClose }: ContextMenuProps) {
    const { openWindow, inodes, createINode, currentPath } = useOSStore()
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        setTimeout(() => window.addEventListener('mousedown', handler), 0)
        window.addEventListener('keydown', keyHandler)
        return () => {
            window.removeEventListener('mousedown', handler)
            window.removeEventListener('keydown', keyHandler)
        }
    }, [])

    // Adjust position so menu doesn't go off screen
    const menuW = 200
    const menuH = 320
    const adjX = x + menuW > window.innerWidth ? x - menuW : x
    const adjY = y + menuH > window.innerHeight ? y - menuH : y

    const items: MenuItem[] = [
        {
            label: 'New Terminal',
            icon: '⚡',
            action: () => { openWindow('terminal', 'KRONOS Terminal'); onClose() }
        },
        {
            label: 'New File Manager',
            icon: '📁',
            action: () => { openWindow('files', 'File Manager'); onClose() }
        },
        {
            label: 'System Monitor',
            icon: '📊',
            action: () => { openWindow('monitor', 'System Monitor'); onClose() }
        },
        {
            label: 'Code Editor',
            icon: '✏️',
            action: () => { openWindow('editor', 'Code Editor'); onClose() },
            divider: true
        },
        {
            label: 'New Folder',
            icon: '📂',
            action: () => {
                const name = prompt('Folder name:')
                if (name) {
                    createINode(`/home/anudeep/desktop/${name}`, 'directory')
                    openWindow('files', 'File Manager')
                }
                onClose()
            }
        },
        {
            label: 'New Text File',
            icon: '📄',
            action: () => {
                const name = prompt('File name:') || 'untitled.txt'
                createINode(`/home/anudeep/desktop/${name}`, 'file', '')
                onClose()
            },
            divider: true
        },
        {
            label: 'kron --vibe',
            icon: '🌌',
            action: () => {
                openWindow('terminal', 'KRONOS Terminal')
                onClose()
            }
        },
        {
            label: 'About KRONOS',
            icon: '👑',
            color: '#C9A84C',
            action: () => {
                alert('⚡ KRONOS OS v1.0.0\nGod of Time. Master of the Web.\nBuilt by anudeep')
                onClose()
            }
        },
    ]

    return (
        <div
            ref={ref}
            className="fixed z-[999] rounded-xl overflow-hidden"
            style={{
                left: adjX,
                top: adjY,
                width: menuW,
                background: 'rgba(12,12,20,0.97)',
                backdropFilter: 'blur(40px)',
                border: '1px solid rgba(201,168,76,0.2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(201,168,76,0.1)',
            }}
        >
            {/* Header */}
            <div className="px-3 py-2 font-mono text-xs font-bold tracking-widest"
                style={{ color: '#C9A84C', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(201,168,76,0.05)' }}>
                ⚡ KRONOS OS
            </div>

            {/* Items */}
            <div className="py-1">
                {items.map((item, i) => (
                    <div key={i}>
                        {item.divider && i > 0 && (
                            <div className="mx-3 my-1" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        )}
                        <button
                            onClick={item.action}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left transition-all hover:bg-white/5 font-mono text-xs"
                            style={{ color: item.color || '#ccc' }}
                        >
                            <span className="text-base w-5 text-center">{item.icon}</span>
                            <span>{item.label}</span>
                        </button>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 font-mono"
                style={{ borderTop: '1px solid rgba(255,255,255,0.04)', color: '#333', fontSize: 9 }}>
                Right-click anywhere to open
            </div>
        </div>
    )
}