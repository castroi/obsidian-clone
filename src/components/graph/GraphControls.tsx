'use client'
import styles from './GraphControls.module.css'

interface Props {
  nodeSize: number
  linkDistance: number
  repelForce: number
  onNodeSize: (v: number) => void
  onLinkDistance: (v: number) => void
  onRepelForce: (v: number) => void
}

export function GraphControls({ nodeSize, linkDistance, repelForce, onNodeSize, onLinkDistance, onRepelForce }: Props) {
  return (
    <div className={styles.controls}>
      <div className={styles.control}>
        <label className={styles.label}>Node size</label>
        <input type="range" min={2} max={20} value={nodeSize}
          onChange={e => onNodeSize(Number(e.target.value))} className={styles.slider} />
      </div>
      <div className={styles.control}>
        <label className={styles.label}>Link distance</label>
        <input type="range" min={30} max={300} value={linkDistance}
          onChange={e => onLinkDistance(Number(e.target.value))} className={styles.slider} />
      </div>
      <div className={styles.control}>
        <label className={styles.label}>Repel force</label>
        <input type="range" min={-500} max={-10} value={repelForce}
          onChange={e => onRepelForce(Number(e.target.value))} className={styles.slider} />
      </div>
    </div>
  )
}
