'use client'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useOSStore } from '@/store/os'
import Terminal from './Terminal'

interface WindowProps {
    id: string
    title: string
    app: string
    x: number
    y: number
    width: number
    height: number
    isMinimized: boolean
    zIndex: number
}

export default function Window({ id, title, app, x, y, width, height, isMinimized, zIndex }: WindowProps) {
    const { focusWindow, closeWindow, minimizeWindow, moveWindow, resizeWindow, focusedWindowId } = useOSStore()
    const isFocused = focusedWindowId === id
    const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
    const windowRef = useRef<HTMLDivElement>(null)

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation()
        focusWindow(id)
    }

    const handleDragStart = (e: React.MouseEvent) => {
        e.preventDefault()
        dragRef.current = { startX: e.clientX, startY: e.clientY, origX: x, origY: y }

        const onMove = (me: MouseEvent) => {
            if (!dragRef.current) return
            const dx = me.clientX - dragRef.current.startX
            const dy = me.clientY - dragRef.current.startY
            moveWindow(id, dragRef.current.origX + dx, dragRef.current.origY + dy)
        }
        const onUp = () => {
            dragRef.current = null
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
    }

    if (isMinimized) return null

    const appColors: Record<string, string> = {
        terminal: '#C9A84C',
        files: '#60A5FA',
        monitor: '#4ADE80',
        editor: '#A78BFA',
    }
    const dotColor = appColors[app] || '#888'

    return (
        <div
            ref={windowRef}
            onMouseDown={handleMouseDown}
            className="absolute rounded-2xl overflow-hidden flex flex-col select-none transition-shadow duration-200"
            style={{
                left: x, top: y, width, height, zIndex,
                background: 'linear-gradient(135deg, rgba(18,18,28,0.97), rgba(8,8,12,0.99))',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                border: isFocused
                    ? '1px solid rgba(201,168,76,0.5)'
                    : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isFocused
                    ? '0 0 0 1px rgba(201,168,76,0.2), 0 30px 60px rgba(0,0,0,0.9), 0 0 100px rgba(201,168,76,0.08)'
                    : '0 20px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
        >
            {/* Title bar */}
            <div
                className="flex items-center gap-3 px-4 py-2.5 cursor-move shrink-0"
                style={{
                    background: isFocused
                        ? 'linear-gradient(90deg, rgba(201,168,76,0.08), transparent)'
                        : 'rgba(255,255,255,0.02)',
                    borderBottom: `1px solid ${isFocused ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)'}`,
                }}
                onMouseDown={handleDragStart}
            >
                <div className="flex gap-1.5 items-center">
                    <button
                        onClick={(e) => { e.stopPropagation(); closeWindow(id) }}
                        className="w-3 h-3 rounded-full transition-all hover:scale-110"
                        style={{ background: '#FF5F57', boxShadow: '0 0 6px rgba(255,95,87,0.4)' }}
                    />
                    <button
                        onClick={(e) => { e.stopPropagation(); minimizeWindow(id) }}
                        className="w-3 h-3 rounded-full transition-all hover:scale-110"
                        style={{ background: '#FEBC2E', boxShadow: '0 0 6px rgba(254,188,46,0.4)' }}
                    />
                    <button
                        className="w-3 h-3 rounded-full transition-all hover:scale-110"
                        style={{ background: '#28C840', boxShadow: '0 0 6px rgba(40,200,64,0.4)' }}
                    />
                </div>
                <div className="flex-1 flex items-center justify-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
                    <span className="text-xs font-medium font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{title}</span>
                </div>
            </div>

            {/* App content */}
            <div className="flex-1 overflow-hidden" style={{ background: 'rgba(0,0,0,0.85)' }}>
                {app === 'terminal' && <Terminal />}
                {app === 'files' && (
                    <div className="p-4 text-kronos-dim font-mono text-sm">
                        File Manager coming soon...
                    </div>
                )}
                {app === 'monitor' && (
                    <div className="p-4 text-kronos-dim font-mono text-sm">
                        System Monitor coming soon...
                    </div>
                )}
            </div>
        </div>
    )
}