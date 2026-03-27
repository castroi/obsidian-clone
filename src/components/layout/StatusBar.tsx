'use client'
import styles from './StatusBar.module.css'

interface Props {
  wordCount?: number
  charCount?: number
  line?: number
  col?: number
  vaultName?: string
}

export function StatusBar({ wordCount = 0, charCount = 0, line = 1, col = 1, vaultName }: Props) {
  return (
    <div className={styles.statusBar}>
      <div className={styles.left}>
        {vaultName && <span className={styles.item}>{vaultName}</span>}
      </div>
      <div className={styles.right}>
        <span className={styles.item}>{wordCount} words</span>
        <span className={styles.item}>{charCount} characters</span>
        <span className={styles.item}>Ln {line}, Col {col}</span>
      </div>
    </div>
  )
}
