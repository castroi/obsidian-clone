export interface GraphNode {
  id: string      // file path
  label: string   // file name without .md
  type: 'note' | 'attachment' | 'unresolved'
  tags: string[]
}

export interface GraphLink {
  source: string  // file path
  target: string  // file path (or unresolved target name)
}

export interface VaultGraph {
  nodes: GraphNode[]
  links: GraphLink[]
}

export function buildGraph(
  filePaths: string[],
  forwardLinks: Map<string, string[]>,
): VaultGraph {
  const nodes: GraphNode[] = []
  const links: GraphLink[] = []
  const nodeIds = new Set<string>()

  // Add all real files as nodes
  for (const path of filePaths) {
    const name = path.split('/').pop()!.replace(/\.md$/, '')
    const type = path.endsWith('.md') ? 'note' : 'attachment'
    nodes.push({ id: path, label: name, type, tags: [] })
    nodeIds.add(path)
  }

  // Add links; create unresolved nodes for missing targets
  for (const [source, targets] of Array.from(forwardLinks)) {
    for (const target of targets) {
      if (!nodeIds.has(target)) {
        // Unresolved link
        nodes.push({ id: target, label: target.split('/').pop()!.replace(/\.md$/, ''), type: 'unresolved', tags: [] })
        nodeIds.add(target)
      }
      links.push({ source, target })
    }
  }

  return { nodes, links }
}
