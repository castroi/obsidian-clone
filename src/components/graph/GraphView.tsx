'use client'
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { buildGraph, type GraphNode, type GraphLink } from '@/lib/graph/buildGraph'
import { useIndexStore } from '@/stores/index'
import { useVaultStore } from '@/stores/vault'
import { GraphControls } from './GraphControls'
import styles from './GraphView.module.css'

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}

interface Props {
  mode?: 'global' | 'local'
  localDepth?: number
}

export function GraphView({ mode = 'global', localDepth = 1 }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<SimNode, GraphLink> | null>(null)
  const { allFiles, activeFilePath, selectFile } = useVaultStore()
  const { forwardLinks, indexed } = useIndexStore()

  const [nodeSize, setNodeSize] = useState(5)
  const [linkDistance, setLinkDistance] = useState(80)
  const [repelForce, setRepelForce] = useState(-120)

  useEffect(() => {
    if (!svgRef.current || !indexed) return
    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth || 800
    const height = svgRef.current.clientHeight || 600

    svg.selectAll('*').remove()

    // Build graph data
    const filePaths = allFiles.map(f => f.path)
    let { nodes, links } = buildGraph(filePaths, forwardLinks)

    // For local mode, filter to N-hop neighbors
    if (mode === 'local' && activeFilePath) {
      const reachable = new Set<string>([activeFilePath])
      let frontier = new Set<string>([activeFilePath])
      for (let depth = 0; depth < localDepth; depth++) {
        const next = new Set<string>()
        for (const path of Array.from(frontier)) {
          const fwd = forwardLinks.get(path) ?? []
          for (const t of fwd) { if (!reachable.has(t)) { reachable.add(t); next.add(t) } }
          // Also add backlinks
          for (const [src, targets] of Array.from(forwardLinks)) {
            if (targets.includes(path) && !reachable.has(src)) { reachable.add(src); next.add(src) }
          }
        }
        frontier = next
      }
      nodes = nodes.filter(n => reachable.has(n.id))
      links = links.filter(l => reachable.has(l.source as string) && reachable.has(l.target as string))
    }

    if (nodes.length === 0) {
      svg.append('text')
        .attr('x', width / 2).attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--text-faint)')
        .attr('font-size', '14px')
        .text('No notes to display')
      return
    }

    // Node color by type
    const nodeColor = (n: SimNode) => {
      if (n.id === activeFilePath) return '#ffffff'
      if (n.type === 'note') return '#7c3aed'
      if (n.type === 'attachment') return '#666'
      return '#444'
    }

    // Zoom/pan container
    const container = svg.append('g')
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => container.attr('transform', event.transform))
    )

    // Links
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(255,255,255,0.15)')
      .attr('stroke-width', 1)

    // Node groups
    const nodeGroup = container.append('g')
      .selectAll<SVGGElement, SimNode>('g')
      .data(nodes as SimNode[])
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_, d) => {
        if (d.type !== 'unresolved') selectFile(d.id)
      })

    // Node circles
    nodeGroup.append('circle')
      .attr('r', (d) => d.id === activeFilePath ? nodeSize * 1.6 : nodeSize)
      .attr('fill', nodeColor)
      .attr('stroke', (d) => d.id === activeFilePath ? '#fff' : 'rgba(255,255,255,0.1)')
      .attr('stroke-width', (d) => d.id === activeFilePath ? 2 : 1)

    // Labels (only show for nodes with enough connections or when few nodes)
    const showLabel = nodes.length < 50
    if (showLabel) {
      nodeGroup.append('text')
        .text(d => d.label)
        .attr('x', nodeSize + 4)
        .attr('y', 4)
        .attr('fill', 'var(--text-muted)')
        .attr('font-size', '11px')
        .attr('pointer-events', 'none')
    }

    // Hover effects
    nodeGroup
      .on('mouseover', function(_, d) {
        d3.select(this).select('circle')
          .attr('fill', d.id === activeFilePath ? '#fff' : '#9f5fff')
          .attr('r', (d.id === activeFilePath ? nodeSize * 1.6 : nodeSize) + 2)
        // Highlight connected links
        link.attr('stroke', l =>
          (l.source as unknown as SimNode).id === d.id || (l.target as unknown as SimNode).id === d.id
            ? 'var(--interactive-accent)'
            : 'rgba(255,255,255,0.08)'
        ).attr('stroke-width', l =>
          (l.source as unknown as SimNode).id === d.id || (l.target as unknown as SimNode).id === d.id ? 2 : 1
        )
      })
      .on('mouseout', function(_, d) {
        d3.select(this).select('circle')
          .attr('fill', nodeColor(d))
          .attr('r', d.id === activeFilePath ? nodeSize * 1.6 : nodeSize)
        link.attr('stroke', 'rgba(255,255,255,0.15)').attr('stroke-width', 1)
      })

    // Drag
    nodeGroup.call(
      d3.drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) simulationRef.current?.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
        .on('end', (event, d) => {
          if (!event.active) simulationRef.current?.alphaTarget(0)
          d.fx = null; d.fy = null
        })
    )

    // Force simulation
    const simulation = d3.forceSimulation(nodes as SimNode[])
      .force('link', d3.forceLink<SimNode, GraphLink>(links)
        .id(d => d.id)
        .distance(linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(repelForce))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(nodeSize + 2))
      .on('tick', () => {
        link
          .attr('x1', d => (d.source as unknown as SimNode).x ?? 0)
          .attr('y1', d => (d.source as unknown as SimNode).y ?? 0)
          .attr('x2', d => (d.target as unknown as SimNode).x ?? 0)
          .attr('y2', d => (d.target as unknown as SimNode).y ?? 0)
        nodeGroup.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
      })

    simulationRef.current = simulation

    return () => { simulation.stop() }
  }, [allFiles, forwardLinks, indexed, activeFilePath, selectFile, nodeSize, linkDistance, repelForce, mode, localDepth])

  return (
    <div className={styles.container}>
      <svg ref={svgRef} className={styles.svg} />
      <GraphControls
        nodeSize={nodeSize}
        linkDistance={linkDistance}
        repelForce={repelForce}
        onNodeSize={setNodeSize}
        onLinkDistance={setLinkDistance}
        onRepelForce={setRepelForce}
      />
    </div>
  )
}
