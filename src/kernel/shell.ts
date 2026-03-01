import { useOSStore, getChildrenOf, INode } from '@/store/os'

export interface CommandResult {
    output: string
    isError: boolean
}

const resolvePath = (currentPath: string, inputPath: string): string => {
    if (!inputPath || inputPath === '~') return `/home/${useOSStore.getState().username}`
    if (inputPath.startsWith('/')) return inputPath.replace(/\/+$/, '') || '/'
    if (inputPath === '..') {
        const parts = currentPath.split('/').filter(Boolean)
        parts.pop()
        return '/' + parts.join('/') || '/'
    }
    if (inputPath === '.') return currentPath
    // handle relative with ..
    const parts = currentPath.split('/').filter(Boolean)
    inputPath.split('/').forEach(seg => {
        if (seg === '..') parts.pop()
        else if (seg !== '.') parts.push(seg)
    })
    return '/' + parts.join('/')
}

export const executeCommand = (rawInput: string): CommandResult => {
    const store = useOSStore.getState()
    const input = rawInput.trim()
    if (!input) return { output: '', isError: false }

    // Handle pipes
    if (input.includes('|')) {
        const parts = input.split('|').map(p => p.trim())
        let result = ''
        for (const part of parts) {
            const res = executeSingle(part, result)
            if (res.isError) return res
            result = res.output
        }
        return { output: result, isError: false }
    }

    return executeSingle(input, '')
}

const executeSingle = (input: string, pipeInput: string): CommandResult => {
    const store = useOSStore.getState()
    const tokens = tokenize(input)
    if (!tokens.length) return { output: '', isError: false }

    // Handle output redirection
    let redirectFile: string | null = null
    let appendMode = false
    const gtgtIdx = tokens.indexOf('>>')
    const gtIdx = tokens.indexOf('>')
    if (gtgtIdx !== -1) {
        redirectFile = tokens[gtgtIdx + 1]
        appendMode = true
        tokens.splice(gtgtIdx, 2)
    } else if (gtIdx !== -1) {
        redirectFile = tokens[gtIdx + 1]
        tokens.splice(gtIdx, 2)
    }

    const [cmd, ...args] = tokens
    let result: CommandResult

    switch (cmd.toLowerCase()) {
        case 'ls': result = cmdLs(args, pipeInput); break
        case 'cd': result = cmdCd(args); break
        case 'pwd': result = { output: store.currentPath, isError: false }; break
        case 'cat': result = cmdCat(args, pipeInput); break
        case 'echo': result = { output: args.join(' ').replace(/^["']|["']$/g, ''), isError: false }; break
        case 'mkdir': result = cmdMkdir(args); break
        case 'touch': result = cmdTouch(args); break
        case 'rm': result = cmdRm(args); break
        case 'mv': result = cmdMv(args); break
        case 'cp': result = cmdCp(args); break
        case 'clear': result = { output: '__CLEAR__', isError: false }; break
        case 'ps': result = cmdPs(); break
        case 'kill': result = cmdKill(args); break
        case 'whoami': result = { output: store.username, isError: false }; break
        case 'hostname': result = { output: store.hostname, isError: false }; break
        case 'date': result = { output: new Date().toString(), isError: false }; break
        case 'uname': result = { output: 'KRONOS 1.0.0 web-kernel TypeScript', isError: false }; break
        case 'uptime': result = { output: `up ${Math.floor((Date.now() - (store as any).bootTime || 0) / 60000)} minutes`, isError: false }; break
        case 'history': result = { output: '__HISTORY__', isError: false }; break
        case 'grep': result = cmdGrep(args, pipeInput); break
        case 'wc': result = cmdWc(args, pipeInput); break
        case 'head': result = cmdHead(args, pipeInput); break
        case 'tail': result = cmdTail(args, pipeInput); break
        case 'stat': result = cmdStat(args); break
        case 'chmod': result = cmdChmod(args); break
        case 'find': result = cmdFind(args); break
        case 'kron': result = cmdKron(args); break
        case 'help': result = cmdHelp(); break
        case 'exit': result = { output: '__EXIT__', isError: false }; break
        default: result = { output: `ksh: command not found: ${cmd}`, isError: true }
    }

    // Handle redirection
    if (redirectFile && !result.isError && result.output !== '__CLEAR__') {
        const path = resolvePath(store.currentPath, redirectFile)
        const existing = store.getINode(path)
        const content = appendMode && existing?.content
            ? existing.content + '\n' + result.output
            : result.output
        if (existing) store.updateINodeContent(path, content)
        else store.createINode(path, 'file', content)
        return { output: '', isError: false }
    }

    return result
}

const tokenize = (input: string): string[] => {
    const tokens: string[] = []
    let current = ''
    let inQuote: '"' | "'" | null = null
    for (const ch of input) {
        if (inQuote) {
            if (ch === inQuote) inQuote = null
            else current += ch
        } else if (ch === '"' || ch === "'") {
            inQuote = ch
        } else if (ch === ' ') {
            if (current) { tokens.push(current); current = '' }
        } else {
            current += ch
        }
    }
    if (current) tokens.push(current)
    return tokens
}

// ── Commands ──────────────────────────────────────────────

const cmdLs = (args: string[], pipeInput: string): CommandResult => {
    const store = useOSStore.getState()
    const showAll = args.includes('-a') || args.includes('-la') || args.includes('-al')
    const longFormat = args.includes('-l') || args.includes('-la') || args.includes('-al')
    const pathArg = args.find(a => !a.startsWith('-'))
    const targetPath = pathArg ? resolvePath(store.currentPath, pathArg) : store.currentPath
    const node = store.getINode(targetPath)
    if (!node) return { output: `ls: cannot access '${targetPath}': No such file or directory`, isError: true }
    if (node.type === 'file') return { output: node.name, isError: false }

    const children = getChildrenOf(store.inodes, targetPath)
    const visible = showAll ? children : children.filter(c => !c.name.startsWith('.'))
    if (!visible.length) return { output: '', isError: false }

    if (longFormat) {
        const lines = visible.map(c => {
            const date = new Date(c.modifiedAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
            const size = String(c.size).padStart(6)
            return `${c.permissions} 1 ${c.owner} ${c.owner} ${size} ${date} ${c.name}`
        })
        return { output: lines.join('\n'), isError: false }
    }

    return { output: visible.map(c => c.name).join('  '), isError: false }
}

const cmdCd = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    const target = args[0] || '~'
    const path = resolvePath(store.currentPath, target)
    const node = store.getINode(path)
    if (!node) return { output: `cd: ${args[0]}: No such file or directory`, isError: true }
    if (node.type !== 'directory') return { output: `cd: ${args[0]}: Not a directory`, isError: true }
    store.setCurrentPath(path)
    return { output: '', isError: false }
}

const cmdCat = (args: string[], pipeInput: string): CommandResult => {
    if (pipeInput && !args.length) return { output: pipeInput, isError: false }
    const store = useOSStore.getState()
    const outputs: string[] = []
    for (const arg of args.filter(a => !a.startsWith('-'))) {
        const path = resolvePath(store.currentPath, arg)
        const node = store.getINode(path)
        if (!node) return { output: `cat: ${arg}: No such file or directory`, isError: true }
        if (node.type === 'directory') return { output: `cat: ${arg}: Is a directory`, isError: true }
        outputs.push(node.content || '')
    }
    return { output: outputs.join('\n'), isError: false }
}

const cmdMkdir = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    for (const arg of args.filter(a => !a.startsWith('-'))) {
        const path = resolvePath(store.currentPath, arg)
        if (store.getINode(path)) return { output: `mkdir: cannot create directory '${arg}': File exists`, isError: true }
        store.createINode(path, 'directory')
    }
    return { output: '', isError: false }
}

const cmdTouch = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    for (const arg of args) {
        const path = resolvePath(store.currentPath, arg)
        if (!store.getINode(path)) store.createINode(path, 'file', '')
    }
    return { output: '', isError: false }
}

const cmdRm = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    const recursive = args.includes('-r') || args.includes('-rf') || args.includes('-f')
    for (const arg of args.filter(a => !a.startsWith('-'))) {
        const path = resolvePath(store.currentPath, arg)
        const node = store.getINode(path)
        if (!node) return { output: `rm: cannot remove '${arg}': No such file or directory`, isError: true }
        if (node.type === 'directory' && !recursive)
            return { output: `rm: cannot remove '${arg}': Is a directory. Use -r`, isError: true }
        store.deleteINode(path)
    }
    return { output: '', isError: false }
}

const cmdMv = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    if (args.length < 2) return { output: 'mv: missing destination', isError: true }
    const src = resolvePath(store.currentPath, args[0])
    const dest = resolvePath(store.currentPath, args[1])
    const node = store.getINode(src)
    if (!node) return { output: `mv: '${args[0]}': No such file or directory`, isError: true }
    store.createINode(dest, node.type, node.content)
    store.deleteINode(src)
    return { output: '', isError: false }
}

const cmdCp = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    if (args.length < 2) return { output: 'cp: missing destination', isError: true }
    const src = resolvePath(store.currentPath, args[0])
    const node = store.getINode(src)
    if (!node) return { output: `cp: '${args[0]}': No such file or directory`, isError: true }
    const dest = resolvePath(store.currentPath, args[1])
    store.createINode(dest, node.type, node.content)
    return { output: '', isError: false }
}

const cmdPs = (): CommandResult => {
    const store = useOSStore.getState()
    const header = 'PID   NAME             STATE      PRI  MEM(MB)  CPU%'
    const rows = store.processes.map(p =>
        `${String(p.pid).padEnd(6)}${p.name.padEnd(17)}${p.state.padEnd(11)}${String(p.priority).padEnd(5)}${String(p.memoryMB).padEnd(9)}${p.cpuPercent.toFixed(1)}`
    )
    return { output: [header, ...rows].join('\n'), isError: false }
}

const cmdKill = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    const pid = parseInt(args[args.length - 1])
    if (isNaN(pid)) return { output: 'kill: invalid PID', isError: true }
    if (pid <= 2) return { output: `kill: (${pid}): Operation not permitted`, isError: true }
    const proc = store.processes.find(p => p.pid === pid)
    if (!proc) return { output: `kill: (${pid}): No such process`, isError: true }
    store.killProcess(pid)
    return { output: '', isError: false }
}

const cmdGrep = (args: string[], pipeInput: string): CommandResult => {
    const store = useOSStore.getState()
    const pattern = args[0]
    if (!pattern) return { output: 'grep: missing pattern', isError: true }
    const text = pipeInput || (args[1] ? store.getINode(resolvePath(store.currentPath, args[1]))?.content || '' : '')
    const regex = new RegExp(pattern, 'gi')
    const lines = text.split('\n').filter(l => regex.test(l))
    return { output: lines.join('\n'), isError: lines.length === 0 }
}

const cmdWc = (args: string[], pipeInput: string): CommandResult => {
    const store = useOSStore.getState()
    const text = pipeInput || (args[0] ? store.getINode(resolvePath(store.currentPath, args[0]))?.content || '' : '')
    const lines = text.split('\n').length
    const words = text.split(/\s+/).filter(Boolean).length
    const chars = text.length
    return { output: `${lines}\t${words}\t${chars}`, isError: false }
}

const cmdHead = (args: string[], pipeInput: string): CommandResult => {
    const store = useOSStore.getState()
    const nIdx = args.indexOf('-n')
    const n = nIdx !== -1 ? parseInt(args[nIdx + 1]) || 10 : 10
    const text = pipeInput || (args.find(a => !a.startsWith('-')) ?
        store.getINode(resolvePath(store.currentPath, args.find(a => !a.startsWith('-'))!))?.content || '' : '')
    return { output: text.split('\n').slice(0, n).join('\n'), isError: false }
}

const cmdTail = (args: string[], pipeInput: string): CommandResult => {
    const store = useOSStore.getState()
    const nIdx = args.indexOf('-n')
    const n = nIdx !== -1 ? parseInt(args[nIdx + 1]) || 10 : 10
    const text = pipeInput || (args.find(a => !a.startsWith('-')) ?
        store.getINode(resolvePath(store.currentPath, args.find(a => !a.startsWith('-'))!))?.content || '' : '')
    return { output: text.split('\n').slice(-n).join('\n'), isError: false }
}

const cmdStat = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    if (!args[0]) return { output: 'stat: missing operand', isError: true }
    const path = resolvePath(store.currentPath, args[0])
    const node = store.getINode(path)
    if (!node) return { output: `stat: cannot stat '${args[0]}': No such file or directory`, isError: true }
    return {
        output: `  File: ${node.name}\n  Type: ${node.type}\n  Size: ${node.size}\nAccess: ${node.permissions}\nOwner: ${node.owner}\nModify: ${new Date(node.modifiedAt).toLocaleString()}\nAccess: ${new Date(node.accessedAt).toLocaleString()}\nCreate: ${new Date(node.createdAt).toLocaleString()}`,
        isError: false
    }
}

const cmdChmod = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    if (args.length < 2) return { output: 'chmod: missing operand', isError: true }
    const path = resolvePath(store.currentPath, args[1])
    const node = store.getINode(path)
    if (!node) return { output: `chmod: cannot access '${args[1]}': No such file or directory`, isError: true }
    return { output: '', isError: false }
}

const cmdFind = (args: string[]): CommandResult => {
    const store = useOSStore.getState()
    const pattern = args.find(a => !a.startsWith('/') && !a.startsWith('-')) || ''
    const results = Object.values(store.inodes)
        .filter(n => n.name.includes(pattern))
        .map(n => n.id)
    return { output: results.join('\n'), isError: false }
}

const cmdKron = (args: string[]): CommandResult => {
    const flag = args[0]
    switch (flag) {
        case '--help': return { output: `KRONOS exclusive commands:\n  kron --help      Show this help\n  kron --about     About KRONOS OS\n  kron --vibe      ⚡ Experience KRONOS\n  kron --stats     Your system stats\n  kron --ai        Ask TITAN AI`, isError: false }
        case '--about': return { output: `\n  ⚡ KRONOS OS v1.0.0\n  Kernel: web-worker-v1\n  Shell: ksh 1.0\n  Scheduler: Round Robin\n  Built by: anudeep\n  "You don't use the web. You rule it."\n`, isError: false }
        case '--vibe': return { output: `\n  ██╗  ██╗██████╗  ██████╗ ███╗   ██╗ ██████╗ ███████╗\n  ██║ ██╔╝██╔══██╗██╔═══██╗████╗  ██║██╔═══██╗██╔════╝\n  █████╔╝ ██████╔╝██║   ██║██╔██╗ ██║██║   ██║███████╗\n  ██╔═██╗ ██╔══██╗██║   ██║██║╚██╗██║██║   ██║╚════██║\n  ██║  ██╗██║  ██║╚██████╔╝██║ ╚████║╚██████╔╝███████║\n  ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚══════╝\n  God of Time. Master of the Web. ⚡\n`, isError: false }
        case '--stats': return { output: `System Stats:\n  Processes: ${useOSStore.getState().processes.length}\n  Files: ${Object.keys(useOSStore.getState().inodes).length}\n  Memory: ${useOSStore.getState().processes.reduce((a, p) => a + p.memoryMB, 0)}MB used`, isError: false }
        default: return { output: `kron: unknown flag '${flag}'. Try kron --help`, isError: true }
    }
}

const cmdHelp = (): CommandResult => ({
    output: `KRONOS Shell (ksh) — Available Commands\n\nFile System:\n  ls, cd, pwd, cat, echo, mkdir, touch, rm, mv, cp, stat, chmod, find\n\nProcesses:\n  ps, kill, top\n\nText Processing:\n  grep, wc, head, tail\n\nSystem:\n  whoami, hostname, date, uname, uptime, history, clear\n\nKRONOS Exclusive:\n  kron --help, kron --about, kron --vibe, kron --stats, kron --ai\n\nShell Features:\n  Pipes: cmd1 | cmd2\n  Redirect: cmd > file, cmd >> file\n  Background: cmd &`,
    isError: false
})