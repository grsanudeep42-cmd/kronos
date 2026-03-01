import { create } from 'zustand'

export type ProcessState = 'running' | 'sleeping' | 'stopped' | 'zombie'

export interface Process {
    pid: number
    name: string
    state: ProcessState
    priority: number
    memoryMB: number
    cpuPercent: number
    startTime: number
    parentPid: number | null
}

export interface Window {
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

export interface INode {
    id: string
    name: string
    type: 'file' | 'directory'
    permissions: string
    owner: string
    size: number
    createdAt: number
    modifiedAt: number
    accessedAt: number
    parentId: string | null
    content?: string
}

interface OSState {
    // System
    booted: boolean
    username: string
    hostname: string
    uptime: number

    // Windows
    windows: Window[]
    focusedWindowId: string | null
    nextZIndex: number

    // Processes
    processes: Process[]
    nextPid: number

    // VFS
    inodes: Record<string, INode>
    currentPath: string

    // Actions
    setBooted: (booted: boolean) => void
    openWindow: (app: string, title: string) => string
    closeWindow: (id: string) => void
    focusWindow: (id: string) => void
    minimizeWindow: (id: string) => void
    moveWindow: (id: string, x: number, y: number) => void
    resizeWindow: (id: string, width: number, height: number) => void
    spawnProcess: (name: string, priority?: number) => number
    killProcess: (pid: number) => void
    setCurrentPath: (path: string) => void
    getINode: (path: string) => INode | null
    createINode: (path: string, type: 'file' | 'directory', content?: string) => void
    deleteINode: (path: string) => void
    updateINodeContent: (path: string, content: string) => void
}

// Build initial VFS with root structure
const buildInitialVFS = (username: string): Record<string, INode> => {
    const now = Date.now()
    const base = (id: string, name: string, type: 'file' | 'directory', parentId: string | null, content?: string): INode => ({
        id, name, type,
        permissions: type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--',
        owner: username,
        size: content ? content.length : 0,
        createdAt: now, modifiedAt: now, accessedAt: now,
        parentId, content
    })

    return {
        '/': base('/', '/', 'directory', null),
        '/home': base('/home', 'home', 'directory', '/'),
        [`/home/${username}`]: base(`/home/${username}`, username, 'directory', '/home'),
        [`/home/${username}/desktop`]: base(`/home/${username}/desktop`, 'desktop', 'directory', `/home/${username}`),
        [`/home/${username}/projects`]: base(`/home/${username}/projects`, 'projects', 'directory', `/home/${username}`),
        [`/home/${username}/documents`]: base(`/home/${username}/documents`, 'documents', 'directory', `/home/${username}`),
        [`/home/${username}/readme.txt`]: base(`/home/${username}/readme.txt`, 'readme.txt', 'file', `/home/${username}`, `Welcome to KRONOS OS ⚡\n\nYou are logged in as ${username}.\nType 'help' to see available commands.\n\nBuilt with blood, sweat, and TypeScript.`),
        '/etc': base('/etc', 'etc', 'directory', '/'),
        '/etc/kronos.conf': base('/etc/kronos.conf', 'kronos.conf', 'file', '/etc', `# KRONOS OS Configuration\nversion=1.0.0\nkernel=web-worker-v1\nscheduler=round-robin\ntime_quantum=100ms`),
        '/tmp': base('/tmp', 'tmp', 'directory', '/'),
        '/bin': base('/bin', 'bin', 'directory', '/'),
    }
}

const pathToId = (path: string) => path

const getChildrenOf = (inodes: Record<string, INode>, parentId: string): INode[] =>
    Object.values(inodes).filter(n => n.parentId === parentId)

export const useOSStore = create<OSState>((set, get) => ({
    booted: false,
    username: 'anudeep',
    hostname: 'kronos',
    uptime: 0,
    windows: [],
    focusedWindowId: null,
    nextZIndex: 10,
    processes: [
        { pid: 0, name: 'kernel', state: 'running', priority: 0, memoryMB: 12, cpuPercent: 0.1, startTime: Date.now(), parentPid: null },
        { pid: 1, name: 'init', state: 'running', priority: 1, memoryMB: 4, cpuPercent: 0, startTime: Date.now(), parentPid: 0 },
        { pid: 2, name: 'titan-ai', state: 'sleeping', priority: 5, memoryMB: 48, cpuPercent: 0, startTime: Date.now(), parentPid: 1 },
    ],
    nextPid: 3,
    inodes: buildInitialVFS('anudeep'),
    currentPath: '/home/anudeep',

    setBooted: (booted) => set({ booted }),

    openWindow: (app, title) => {
        const id = `${app}-${Date.now()}`
        const { nextZIndex, windows } = get()
        const offset = windows.length * 25
        const w = app === 'terminal' ? 700 : 800
        const h = app === 'terminal' ? 460 : 500
        set(s => ({
            windows: [...s.windows, {
                id, title, app,
                x: Math.max(80, (window.innerWidth - w) / 2 + offset),
                y: Math.max(40, (window.innerHeight - h) / 2 + offset - 40),
                width: w, height: h,
                isMinimized: false,
                isMaximized: false,
                zIndex: nextZIndex
            }],
            focusedWindowId: id,
            nextZIndex: nextZIndex + 1
        }))
        return id
    },

    closeWindow: (id) => set(s => ({
        windows: s.windows.filter(w => w.id !== id),
        focusedWindowId: s.focusedWindowId === id ? null : s.focusedWindowId
    })),

    focusWindow: (id) => set(s => ({
        windows: s.windows.map(w => w.id === id ? { ...w, zIndex: s.nextZIndex } : w),
        focusedWindowId: id,
        nextZIndex: s.nextZIndex + 1
    })),

    minimizeWindow: (id) => set(s => ({
        windows: s.windows.map(w => w.id === id ? { ...w, isMinimized: !w.isMinimized } : w)
    })),

    moveWindow: (id, x, y) => set(s => ({
        windows: s.windows.map(w => w.id === id ? { ...w, x, y } : w)
    })),

    resizeWindow: (id, width, height) => set(s => ({
        windows: s.windows.map(w => w.id === id ? { ...w, width, height } : w)
    })),

    spawnProcess: (name, priority = 5) => {
        const { nextPid } = get()
        const proc: Process = {
            pid: nextPid, name, state: 'running',
            priority, memoryMB: Math.floor(Math.random() * 40) + 8,
            cpuPercent: Math.random() * 5,
            startTime: Date.now(), parentPid: 1
        }
        set(s => ({ processes: [...s.processes, proc], nextPid: s.nextPid + 1 }))
        return nextPid
    },

    killProcess: (pid) => set(s => ({
        processes: s.processes.filter(p => p.pid !== pid)
    })),

    setCurrentPath: (path) => set({ currentPath: path }),

    getINode: (path) => get().inodes[pathToId(path)] || null,

    createINode: (path, type, content) => {
        const name = path.split('/').pop() || ''
        const parentId = path.split('/').slice(0, -1).join('/') || '/'
        const now = Date.now()
        const node: INode = {
            id: path, name, type,
            permissions: type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--',
            owner: get().username,
            size: content ? content.length : 0,
            createdAt: now, modifiedAt: now, accessedAt: now,
            parentId, content
        }
        set(s => ({ inodes: { ...s.inodes, [path]: node } }))
    },

    deleteINode: (path) => set(s => {
        const next = { ...s.inodes }
        // delete node and all children
        Object.keys(next).forEach(k => {
            if (k === path || k.startsWith(path + '/')) delete next[k]
        })
        return { inodes: next }
    }),

    updateINodeContent: (path, content) => set(s => ({
        inodes: {
            ...s.inodes,
            [path]: { ...s.inodes[path], content, size: content.length, modifiedAt: Date.now() }
        }
    })),
}))

export { getChildrenOf, pathToId }