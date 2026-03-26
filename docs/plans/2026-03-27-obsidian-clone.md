# Obsidian Clone — PWA Web App

> A pixel-perfect Obsidian clone that runs as a PWA on PC and iOS, deployed to Vercel.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, `output: 'export'` for static) |
| Editor | CodeMirror 6 + `@codemirror/lang-markdown` + custom extensions |
| Graph | D3.js force-directed layout |
| Icons | Lucide React |
| Styling | CSS Modules + CSS custom properties (Obsidian design tokens) |
| Storage (PC) | File System Access API (`showDirectoryPicker`) |
| Storage (iOS) | OPFS (Origin Private File System) via `navigator.storage.getDirectory()` |
| State | Zustand |
| PWA | next-pwa (service worker, manifest, offline) |
| Deploy | Vercel (static hosting) |

## Architecture

```
src/
├── app/
│   ├── layout.tsx              # Root layout, theme provider, PWA meta
│   ├── page.tsx                # Main app shell (client component)
│   └── manifest.json           # PWA manifest
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx        # Top-level grid: ribbon + sidebars + editor
│   │   ├── Ribbon.tsx          # Left 44px icon bar
│   │   ├── TitleBar.tsx        # Top bar (frameless style)
│   │   ├── TabBar.tsx          # Tab strip with close/new buttons
│   │   ├── StatusBar.tsx       # Bottom bar: word count, cursor pos
│   │   └── ResizablePanel.tsx  # Reusable resizable sidebar wrapper
│   ├── sidebar/
│   │   ├── LeftSidebar.tsx     # Container for left panels
│   │   ├── RightSidebar.tsx    # Container for right panels
│   │   ├── FileExplorer.tsx    # Tree view of vault
│   │   ├── SearchPanel.tsx     # Full-text search UI
│   │   ├── TagsPanel.tsx       # Hierarchical tag tree
│   │   ├── BookmarksPanel.tsx  # Pinned items
│   │   ├── OutlinePanel.tsx    # Headings outline for current note
│   │   ├── BacklinksPanel.tsx  # Incoming links panel
│   │   └── PropertiesPanel.tsx # YAML frontmatter editor
│   ├── editor/
│   │   ├── MarkdownEditor.tsx  # CodeMirror 6 wrapper
│   │   ├── LivePreview.tsx     # Live preview mode (CM6 decorations)
│   │   ├── ReadingView.tsx     # Rendered HTML reading mode
│   │   ├── EditorToolbar.tsx   # Format bar (bold, italic, etc.)
│   │   └── extensions/
│   │       ├── wikilinks.ts    # [[wikilink]] syntax + autocomplete
│   │       ├── tags.ts         # #tag highlighting
│   │       ├── callouts.ts     # > [!NOTE] callout rendering
│   │       ├── embeds.ts       # ![[embed]] rendering
│   │       ├── frontmatter.ts  # YAML frontmatter handling
│   │       ├── highlights.ts   # ==highlight== support
│   │       ├── tasks.ts        # - [ ] / - [x] checkboxes
│   │       └── tables.ts       # Table formatting
│   ├── graph/
│   │   ├── GraphView.tsx       # D3 force-directed graph
│   │   ├── GraphControls.tsx   # Sliders: force, size, distance
│   │   └── GraphNode.tsx       # Node rendering with colors
│   ├── modals/
│   │   ├── CommandPalette.tsx  # Ctrl+P fuzzy command search
│   │   ├── QuickSwitcher.tsx   # Ctrl+O file switcher
│   │   ├── SettingsModal.tsx   # Two-column settings UI
│   │   └── ConfirmDialog.tsx   # Delete/action confirmations
│   └── ui/
│       ├── ContextMenu.tsx     # Right-click menus
│       ├── Tooltip.tsx         # Hover tooltips
│       ├── Toast.tsx           # Bottom-right notifications
│       └── Toggle.tsx          # Switch component
├── stores/
│   ├── vault.ts               # Vault state: files, folders, active file
│   ├── editor.ts              # Editor state: mode, tabs, split panes
│   ├── ui.ts                  # UI state: sidebars, theme, modals
│   └── search.ts              # Search state: query, results
├── lib/
│   ├── fs/
│   │   ├── fileSystem.ts      # Abstract FS interface
│   │   ├── nativeFS.ts        # File System Access API (PC/Chrome)
│   │   ├── opfs.ts            # OPFS implementation (iOS/fallback)
│   │   └── persist.ts         # IndexedDB handle persistence
│   ├── markdown/
│   │   ├── parser.ts          # Markdown → AST (remark/unified)
│   │   ├── renderer.ts        # AST → HTML for reading mode
│   │   ├── wikilinks.ts       # Parse/resolve [[links]]
│   │   ├── frontmatter.ts     # YAML frontmatter parse/serialize
│   │   └── search.ts          # Full-text search indexing
│   ├── graph/
│   │   └── buildGraph.ts      # Build node/edge data from vault links
│   └── utils/
│       ├── fuzzyMatch.ts      # Fuzzy search for command palette
│       ├── debounce.ts        # Debounce utility
│       └── platform.ts        # Detect iOS/desktop/PWA
├── styles/
│   ├── globals.css            # CSS custom properties (Obsidian tokens)
│   ├── theme-dark.css         # Dark theme values
│   ├── theme-light.css        # Light theme values
│   ├── editor.css             # CodeMirror overrides
│   ├── callouts.css           # Callout type colors
│   └── mobile.css             # Mobile/iOS responsive overrides
└── public/
    ├── icons/                 # PWA icons (192, 512)
    ├── sw.js                  # Service worker
    └── manifest.json          # PWA manifest
```

---

## Implementation Plan

### Phase 1: Foundation (Tasks 1-5)

These tasks establish the project scaffolding, design tokens, layout shell, and file system abstraction — everything needed before any feature work.

---

#### Task 1: Project Setup & Configuration

**Description:** Initialize Next.js 14 project with static export, PWA support, and all dependencies.

**Files to create:**
- `package.json`
- `next.config.js`
- `tsconfig.json`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `public/manifest.json`

**Steps:**
1. Run `npx create-next-app@14 obsidian-clone --typescript --app --src-dir --no-tailwind --no-eslint` inside `~/obsidian-clone`
2. Configure `next.config.js` with `output: 'export'`, `images: { unoptimized: true }`
3. Install dependencies:
   ```
   npm install zustand lucide-react
   npm install codemirror @codemirror/lang-markdown @codemirror/language-data @codemirror/view @codemirror/state @codemirror/commands @codemirror/search @codemirror/autocomplete @codemirror/lint
   npm install d3 @types/d3
   npm install remark remark-parse remark-html remark-gfm remark-frontmatter unified
   npm install gray-matter
   npm install idb
   npm install -D @types/node @types/react @types/react-dom
   ```
4. Create PWA manifest at `public/manifest.json` with app name "Obsidian Clone", theme color `#1e1e1e`, display `standalone`
5. Create basic `layout.tsx` with viewport meta, theme-color meta, manifest link
6. Create `page.tsx` as `'use client'` that renders placeholder "Loading vault..."

**Verification:**
- `npm run build` succeeds with static export
- `npx serve out` serves the app at localhost

**Dependencies:** None

---

#### Task 2: Design Tokens & Theme System

**Description:** Implement the complete Obsidian CSS variable system with dark (default) and light themes.

**Files to create:**
- `src/styles/globals.css`
- `src/styles/theme-dark.css`
- `src/styles/theme-light.css`

**Steps:**
1. Create `globals.css` with all CSS custom properties from the Obsidian reference:
   - Font stacks (`--font-interface`, `--font-text`, `--font-monospace`)
   - Font sizes (`--font-smallest` through `--font-ui-large`)
   - Spacing scale (4px grid: `--size-4-1` through `--size-4-6`)
   - Border radius (`--radius-s/m/l/xl`)
   - Shadows (`--shadow-s`, `--shadow-l`)
   - Editor tokens (`--file-margins`, `--file-line-width`, `--editor-font-size`)
   - Component tokens (checkbox, scrollbar, blockquote, table, callout)
2. Create `theme-dark.css` with dark color values:
   - `--background-primary: #1e1e1e`, `--background-secondary: #161616`
   - `--text-normal: #dcddde`, `--text-muted: #999`, `--text-faint: #666`
   - `--text-accent: #7c3aed`, `--interactive-accent: #7c3aed`
   - All hover/active/border modifier colors
3. Create `theme-light.css` with light color values
4. Apply theme via `data-theme="dark"` attribute on `<html>`, toggled by class
5. Import globals in `layout.tsx`
6. Add base reset styles: box-sizing, margin/padding reset, smooth scrolling

**Verification:**
- Inspect page in devtools, verify all CSS variables are defined
- Toggle `data-theme` between `dark` and `light`, colors change correctly

**Dependencies:** Task 1

---

#### Task 3: Application Layout Shell

**Description:** Build the complete Obsidian layout grid: Ribbon, left sidebar, tab bar, editor area, right sidebar, status bar.

**Files to create:**
- `src/components/layout/AppShell.tsx`
- `src/components/layout/AppShell.module.css`
- `src/components/layout/Ribbon.tsx`
- `src/components/layout/Ribbon.module.css`
- `src/components/layout/TabBar.tsx`
- `src/components/layout/TabBar.module.css`
- `src/components/layout/StatusBar.tsx`
- `src/components/layout/StatusBar.module.css`
- `src/components/layout/ResizablePanel.tsx`
- `src/components/layout/ResizablePanel.module.css`
- `src/components/sidebar/LeftSidebar.tsx`
- `src/components/sidebar/RightSidebar.tsx`
- `src/stores/ui.ts`

**Steps:**
1. Create `AppShell` with CSS Grid layout:
   ```
   grid-template-columns: 44px [left-sidebar] auto [editor] 1fr [right-sidebar] auto;
   grid-template-rows: 40px 1fr 24px;
   ```
2. Create `Ribbon` component: 44px wide, vertical icon buttons (Lucide icons), settings gear at bottom. Icons: file-plus, search, bookmark, workflow (graph). Hover states per spec.
3. Create `ResizablePanel`: draggable divider (4px, 8px on hover), min-width 100px, default 280px. Use mouse/touch events for resize. Store width in Zustand.
4. Create `LeftSidebar` inside ResizablePanel: tab headers (File Explorer, Search, Bookmarks, Tags), content area. Collapsible.
5. Create `RightSidebar` inside ResizablePanel: tab headers (Backlinks, Outline, Properties), content area. Collapsible.
6. Create `TabBar`: 40px height, tab items with close button (visible on hover/active), new tab `+` button. Active tab styling per spec.
7. Create `StatusBar`: 24px height, right-aligned items (word count, character count, cursor position). 12px font.
8. Create `ui` Zustand store: `leftSidebarOpen`, `rightSidebarOpen`, `leftSidebarWidth`, `rightSidebarWidth`, `activeLeftPanel`, `activeRightPanel`, `theme`.
9. Wire AppShell to render all components in correct grid positions.
10. Update `page.tsx` to render `<AppShell />`.

**Verification:**
- App renders with correct layout matching Obsidian screenshots
- Sidebars resize via drag
- Sidebars collapse/expand via ribbon buttons
- Tab bar shows placeholder tabs

**Dependencies:** Task 2

---

#### Task 4: File System Abstraction Layer

**Description:** Build the unified file system interface supporting File System Access API (PC) and OPFS (iOS PWA).

**Files to create:**
- `src/lib/fs/fileSystem.ts`
- `src/lib/fs/nativeFS.ts`
- `src/lib/fs/opfs.ts`
- `src/lib/fs/persist.ts`
- `src/lib/utils/platform.ts`
- `src/stores/vault.ts`

**Steps:**
1. Define `FileSystem` interface in `fileSystem.ts`:
   ```typescript
   interface VaultFile {
     path: string;
     name: string;
     content: string;
     lastModified: number;
   }
   interface VaultFolder {
     path: string;
     name: string;
     children: (VaultFile | VaultFolder)[];
   }
   interface FileSystemAdapter {
     openVault(): Promise<VaultFolder>;
     readFile(path: string): Promise<string>;
     writeFile(path: string, content: string): Promise<void>;
     deleteFile(path: string): Promise<void>;
     createFile(path: string, content?: string): Promise<void>;
     createFolder(path: string): Promise<void>;
     deleteFolder(path: string): Promise<void>;
     renameFile(oldPath: string, newPath: string): Promise<void>;
     listFiles(path?: string): Promise<(VaultFile | VaultFolder)[]>;
     watchForChanges?(callback: (event: FileChangeEvent) => void): void;
   }
   ```
2. Implement `NativeFileSystem` in `nativeFS.ts`:
   - `openVault()`: calls `showDirectoryPicker()`, recursively reads directory tree
   - `readFile()`: navigates handle path, gets file, returns text
   - `writeFile()`: gets file handle with `{ create: true }`, writes via writable stream
   - `deleteFile()`: parent handle `.removeEntry(name)`
   - `createFolder()`: `getDirectoryHandle(name, { create: true })`
   - `renameFile()`: read old → write new → delete old (no native rename)
   - Store root `FileSystemDirectoryHandle` for reuse
3. Implement `OPFSFileSystem` in `opfs.ts`:
   - Same interface but uses `navigator.storage.getDirectory()`
   - All operations via OPFS handles
   - Add import/export methods to sync with user downloads
4. Implement `persist.ts`:
   - Use `idb` library to store directory handles in IndexedDB
   - `persistHandle(handle)`: store for session restore
   - `getPersistedHandle()`: retrieve and `requestPermission({ mode: 'readwrite' })`
5. Create `platform.ts`:
   - `isIOS()`: detect iOS via user agent
   - `isPWA()`: detect standalone display mode
   - `supportsNativeFS()`: check `window.showDirectoryPicker` existence
   - `getFileSystem()`: return NativeFS or OPFS based on platform
6. Create `vault` Zustand store:
   - `files: VaultFile[]`, `folders: VaultFolder[]`, `tree: VaultFolder`
   - `activeFile: string | null`, `openFiles: string[]` (tabs)
   - `openVault()`, `closeVault()`, `selectFile(path)`, `saveFile(path, content)`
   - `createNote(folder, name)`, `deleteNote(path)`, `renameNote(old, new)`

**Verification:**
- On Chrome desktop: clicking "Open Vault" triggers directory picker, reads file tree
- File tree structure matches actual folder on disk
- Can read and write `.md` files
- Handle persists across page reloads (re-requests permission)

**Dependencies:** Task 1

---

#### Task 5: File Explorer Component

**Description:** Build the file explorer tree view in the left sidebar, connected to the vault store.

**Files to create:**
- `src/components/sidebar/FileExplorer.tsx`
- `src/components/sidebar/FileExplorer.module.css`
- `src/components/sidebar/FileTreeItem.tsx`
- `src/components/ui/ContextMenu.tsx`
- `src/components/ui/ContextMenu.module.css`

**Steps:**
1. Create `FileTreeItem` component:
   - Folder: chevron toggle (rotate 90deg when open), folder icon (Lucide `folder`/`folder-open`), name. Click to expand/collapse.
   - File: document icon (Lucide `file-text`), name without `.md` extension. Click to open in editor.
   - Active file: `--background-modifier-active-hover` bg, `--text-accent` color.
   - Indent nested items with 16px per level.
   - Hover: `--background-modifier-hover` background.
2. Create `FileExplorer`:
   - Header: "Files" title + action icons (new note `file-plus`, new folder `folder-plus`, collapse all `chevrons-down-up`)
   - Recursive tree rendering from vault store's `tree`
   - Sort: folders first, then files, alphabetical within each
3. Create `ContextMenu` (reusable):
   - Position at mouse click coordinates
   - Items: New Note, New Folder, Rename, Delete, Copy Path
   - Style per spec: 160px min-width, `--radius-m`, shadow
   - Close on click outside or Escape
4. Wire context menu actions to vault store methods
5. Implement drag-and-drop file reordering (basic: move file to folder)
6. Connect to left sidebar, show when "Files" tab is active

**Verification:**
- File tree renders matching vault folder structure
- Click file opens it (shows path in tab bar for now)
- Right-click shows context menu with working New Note, New Folder, Rename, Delete
- Folders expand/collapse with chevron animation
- Active file is highlighted with accent color

**Dependencies:** Tasks 3, 4

---

### Phase 2: Editor Core (Tasks 6-9)

The markdown editor is the heart of the app. These tasks build the three editor modes and essential editing features.

---

#### Task 6: CodeMirror 6 Markdown Editor — Source Mode

**Description:** Set up CodeMirror 6 with full markdown syntax highlighting as the base editor.

**Files to create:**
- `src/components/editor/MarkdownEditor.tsx`
- `src/components/editor/MarkdownEditor.module.css`
- `src/stores/editor.ts`

**Steps:**
1. Create `editor` Zustand store:
   - `mode: 'source' | 'preview' | 'reading'`
   - `activeTab: string | null`
   - `openTabs: { path: string, dirty: boolean }[]`
   - `cursorPosition: { line: number, col: number }`
   - `wordCount: number`, `charCount: number`
   - Actions: `openTab`, `closeTab`, `setActiveTab`, `setMode`, `updateCursor`
2. Create `MarkdownEditor` component:
   - Initialize CodeMirror 6 `EditorView` in a `useEffect`
   - Extensions: `basicSetup`, `markdown({ codeLanguages: languages })`, `keymap`, custom theme
   - Custom CodeMirror theme matching Obsidian:
     - Background: `--background-primary`
     - Text: `--text-normal`, font: `--font-text`, size: `--editor-font-size`
     - Selection: `--text-highlight-bg`
     - Cursor: `--caret-color`
     - Line height: `1.8888`
     - Gutters hidden (Obsidian default)
   - Max content width: `700px` centered with `--file-margins` padding
   - On doc change: update vault store (debounced auto-save, 1s), update word/char count
   - On cursor move: update status bar position
3. Connect to vault store: when `activeFile` changes, load content into editor
4. Connect to tab bar: opening file creates tab, switching tabs switches editor content
5. Wire status bar to display word count, char count, cursor line:col from editor store

**Verification:**
- Open a `.md` file, content appears in editor with syntax highlighting
- Markdown syntax (headings, bold, italic, code, links) is highlighted
- Typing updates the file (auto-save after 1s debounce)
- Status bar shows accurate word count and cursor position
- Multiple tabs work: switch between open files

**Dependencies:** Tasks 3, 4, 5

---

#### Task 7: Live Preview Mode (CodeMirror Decorations)

**Description:** Implement Obsidian's signature Live Preview mode — renders markdown inline while keeping the active line editable.

**Files to create:**
- `src/components/editor/LivePreview.tsx`
- `src/components/editor/extensions/wikilinks.ts`
- `src/components/editor/extensions/highlights.ts`
- `src/components/editor/extensions/tasks.ts`
- `src/components/editor/extensions/callouts.ts`
- `src/components/editor/extensions/embeds.ts`

**Steps:**
1. Create CodeMirror `ViewPlugin` for Live Preview that:
   - Scans document for markdown syntax on non-active lines
   - Uses `Decoration.replace` to hide syntax characters (`**`, `_`, `#`, etc.) on unfocused lines
   - Uses `Decoration.widget` to render inline widgets (checkboxes, images, callout blocks)
   - Active line (cursor line) shows raw markdown source
   - When cursor moves away, line re-renders as preview
2. Implement `wikilinks.ts` extension:
   - Regex match `\[\[([^\]|]+)(\|([^\]]+))?\]\]`
   - On non-active lines: replace with styled link text (display text or note name)
   - Link color: `--text-accent`
   - Click handler: navigate to linked note (or create if doesn't exist)
3. Implement `highlights.ts`:
   - Match `==text==` → render with yellow highlight background
4. Implement `tasks.ts`:
   - Match `- [ ]`, `- [x]`, `- [/]`, `- [-]`
   - Render as interactive checkboxes (click to toggle)
   - Checked: strikethrough text, muted color
5. Implement `callouts.ts`:
   - Match `> [!TYPE]` blocks
   - Render with colored left border, icon, styled title
   - All 13 callout types with correct colors per spec
6. Implement `embeds.ts`:
   - Match `![[filename]]` and `![[image.ext]]`
   - For images: render inline `<img>` widget
   - For notes: render embedded note content in a card
7. Render headings at full size on unfocused lines (H1=2em, H2=1.6em, etc.)
8. Add mode toggle in tab bar or toolbar: Source | Live Preview | Reading

**Verification:**
- In Live Preview mode, headings render large, bold renders without `**`
- Active line shows raw markdown
- `[[links]]` render as clickable purple links
- Checkboxes are interactive
- `==highlights==` show yellow background
- Callouts render with correct colors and icons
- Images render inline

**Dependencies:** Task 6

---

#### Task 8: Reading Mode

**Description:** Implement fully rendered read-only view using remark/unified markdown pipeline.

**Files to create:**
- `src/components/editor/ReadingView.tsx`
- `src/components/editor/ReadingView.module.css`
- `src/lib/markdown/parser.ts`
- `src/lib/markdown/renderer.ts`
- `src/styles/editor.css`

**Steps:**
1. Create markdown pipeline in `parser.ts`:
   - Use `unified` + `remark-parse` + `remark-gfm` + `remark-frontmatter`
   - Custom remark plugins for: `[[wikilinks]]`, `==highlights==`, `> [!callout]`, `![[embeds]]`
2. Create `renderer.ts`:
   - Convert remark AST to HTML string
   - Wikilinks → `<a class="internal-link" data-href="NoteName">`
   - Callouts → `<div class="callout" data-callout="type">`
   - Highlights → `<mark>`
   - Task lists → `<input type="checkbox">`
3. Create `ReadingView` component:
   - Renders HTML from renderer into a scrollable container
   - Max width `700px` centered, padding `40px`
   - Styled via `editor.css` matching Obsidian's reading mode typography
   - Click handlers on internal links to navigate
   - No editing cursor
4. Style `editor.css`:
   - Heading sizes matching spec (H1=2em/700, H2=1.6em/600, etc.)
   - Code blocks with `--code-background`, `--code-color`
   - Blockquotes with left border `--interactive-accent`
   - Tables with header background, borders
   - Horizontal rules
   - Lists with proper indentation

**Verification:**
- Toggle to Reading mode shows fully rendered markdown
- All markdown elements render correctly: headings, bold, italic, code, lists, tables, blockquotes, HR
- Wikilinks are clickable and navigate to the linked note
- Callouts render with correct styling
- Content is centered at 700px max width

**Dependencies:** Tasks 6, 7

---

#### Task 9: Editor Toolbar & Keyboard Shortcuts

**Description:** Add formatting toolbar and comprehensive keyboard shortcuts.

**Files to create:**
- `src/components/editor/EditorToolbar.tsx`
- `src/components/editor/EditorToolbar.module.css`

**Steps:**
1. Create `EditorToolbar`:
   - Icons (Lucide): Bold, Italic, Strikethrough, Code, Link, Heading, Bullet List, Numbered List, Checklist, Quote, Horizontal Rule
   - Each button wraps selected text with appropriate markdown syntax
   - Floating above editor or fixed below tab bar (configurable)
   - On mobile: always visible above keyboard
2. Implement keyboard shortcuts via CodeMirror keymap:
   - `Ctrl/Cmd+B` → bold
   - `Ctrl/Cmd+I` → italic
   - `Ctrl/Cmd+K` → insert link
   - `Ctrl/Cmd+E` → toggle reading/edit mode
   - `Ctrl/Cmd+]` → indent
   - `Ctrl/Cmd+[` → outdent
   - `Ctrl/Cmd+D` → delete line
   - `Ctrl/Cmd+S` → save (persist to disk)
   - `Ctrl/Cmd+P` → command palette (handled by modal)
   - `Ctrl/Cmd+O` → quick switcher
   - `Ctrl/Cmd+N` → new note
   - `Ctrl/Cmd+Shift+F` → search in vault
   - `Tab` → indent list / tab in code block
   - `Enter` in list → continue list
3. Auto-close brackets: `(`, `[`, `{`, `` ` ``, `"`, `*`, `_`, `=`

**Verification:**
- Toolbar buttons apply formatting to selected text
- All keyboard shortcuts work correctly
- List continuation works on Enter
- Auto-close brackets work

**Dependencies:** Task 6

---

### Phase 3: Knowledge Graph Features (Tasks 10-13)

These tasks build the interconnected knowledge features that make Obsidian powerful: links, backlinks, search, and graph view.

---

#### Task 10: Wikilink Resolution & Backlinks Index

**Description:** Build the link resolution engine and backlinks index that powers navigation, backlinks panel, and graph view.

**Files to create:**
- `src/lib/markdown/wikilinks.ts`
- `src/lib/markdown/search.ts`

**Steps:**
1. Create wikilink parser in `wikilinks.ts`:
   - Extract all `[[links]]` from a file's content using regex
   - Parse `[[Note Name]]`, `[[Note Name|Display Text]]`, `[[Note#Heading]]`, `[[Note^block-id]]`
   - Resolve link to file path: match by filename (case-insensitive, `.md` optional)
   - Handle aliases from frontmatter
2. Build vault-wide link index:
   - On vault open: scan all `.md` files, extract links from each
   - Store as `Map<string, Set<string>>` — forward links (file → linked files)
   - Build reverse index: `Map<string, Set<string>>` — backlinks (file → files linking to it)
   - Update incrementally on file save
3. Create search index in `search.ts`:
   - Index all file contents for full-text search
   - Support match highlighting (return line number + surrounding context)
   - Index tags: extract `#tag` and `#nested/tag` patterns
   - Index frontmatter fields
4. Add to vault store:
   - `forwardLinks: Map<string, string[]>`
   - `backlinks: Map<string, string[]>`
   - `tags: Map<string, string[]>` (tag → files)
   - `refreshIndex()` method

**Verification:**
- After opening vault, link index is populated
- `getBacklinks("SomeNote")` returns correct list of files linking to it
- `getForwardLinks("SomeNote")` returns correct outgoing links
- Full-text search returns matching files with context snippets
- Tag index is accurate

**Dependencies:** Task 4

---

#### Task 11: Backlinks & Outline Panels

**Description:** Build the right sidebar panels for backlinks and document outline.

**Files to create:**
- `src/components/sidebar/BacklinksPanel.tsx`
- `src/components/sidebar/BacklinksPanel.module.css`
- `src/components/sidebar/OutlinePanel.tsx`
- `src/components/sidebar/OutlinePanel.module.css`

**Steps:**
1. Create `BacklinksPanel`:
   - Header: "Backlinks" + count badge
   - List each linking file with:
     - File name (clickable to navigate)
     - Context snippet showing the line containing the link, with link text highlighted
   - "Linked mentions" section (explicit links) and "Unlinked mentions" section (text matches)
   - Empty state: "No backlinks found"
2. Create `OutlinePanel`:
   - Parse current note's headings (H1-H6)
   - Display as indented tree (each heading level indented 16px)
   - Click heading to scroll editor to that position
   - Highlight currently visible heading
   - Update on document change
3. Connect both panels to right sidebar tab system
4. Update panels when active file changes

**Verification:**
- Backlinks panel shows correct incoming links with context
- Clicking a backlink navigates to that file
- Outline panel shows all headings with correct hierarchy
- Clicking outline heading scrolls to it in editor

**Dependencies:** Tasks 3, 6, 10

---

#### Task 12: Search Panel

**Description:** Build the full-text search panel in the left sidebar.

**Files to create:**
- `src/components/sidebar/SearchPanel.tsx`
- `src/components/sidebar/SearchPanel.module.css`
- `src/stores/search.ts`

**Steps:**
1. Create `search` Zustand store:
   - `query: string`, `results: SearchResult[]`, `isSearching: boolean`
   - `matchCase: boolean`, `wholeWord: boolean`, `useRegex: boolean`
   - `search(query)`, `clearSearch()`
2. Create `SearchPanel`:
   - Search input at top, full width, with `--radius-m` border
   - Filter toggle buttons below input: Match Case (Aa), Whole Word (ab), Regex (.*)
   - Results grouped by file:
     - File name header (clickable)
     - Under each file: snippet lines with match text highlighted in `--text-highlight-bg`
   - Result count in header
   - Click result → open file and scroll to match
3. Debounce search input (300ms)
4. Use search index from Task 10 for fast results

**Verification:**
- Typing in search box shows results across all vault files
- Match highlighting works correctly
- Filter toggles (case, whole word, regex) modify results
- Clicking a result opens the file at the matched location

**Dependencies:** Tasks 3, 10

---

#### Task 13: Graph View

**Description:** Build the interactive force-directed graph view showing note connections.

**Files to create:**
- `src/components/graph/GraphView.tsx`
- `src/components/graph/GraphView.module.css`
- `src/components/graph/GraphControls.tsx`
- `src/lib/graph/buildGraph.ts`

**Steps:**
1. Create `buildGraph.ts`:
   - Input: vault files + forward links index
   - Output: `{ nodes: GraphNode[], links: GraphLink[] }`
   - Node types: note (accent color), attachment (muted), unresolved (faint)
   - Filter options: orphans, attachments, specific tags
2. Create `GraphView` component:
   - D3 force simulation: `forceLink`, `forceManyBody` (repel), `forceCenter`, `forceCollide`
   - Canvas or SVG rendering (Canvas for performance with large vaults)
   - Nodes as circles with labels
   - Links as lines with `rgba(255,255,255,0.2)` color
   - Pan (drag background) + zoom (scroll wheel)
   - Click node → open that note
   - Hover node → highlight connected nodes and links
   - Current note highlighted (white/larger)
3. Create `GraphControls`:
   - Sliders: Node size, Link thickness, Repel force, Center force, Link distance
   - Toggles: Show orphans, Show attachments, Show arrows
   - Search filter input
   - Group by tag (color nodes by tag)
4. Support two modes:
   - **Global Graph**: all vault notes (opens as full tab)
   - **Local Graph**: current note + N-hop neighbors (sidebar or popover, depth slider 1-5)
5. Node colors per spec:
   - Default: `#7c3aed`, Attachment: `#666`, Tag: `#00b0ff`, Unresolved: `#444`, Active: white

**Verification:**
- Graph renders all vault notes as connected nodes
- Force simulation produces reasonable layout
- Pan and zoom work smoothly
- Clicking a node opens the note
- Hover highlights connections
- Controls adjust simulation parameters in real-time
- Local graph shows correct neighbors at selected depth

**Dependencies:** Task 10

---

### Phase 4: UI Polish & Modals (Tasks 14-17)

Modals, settings, and UI refinements to match Obsidian's polish.

---

#### Task 14: Command Palette

**Description:** Build the Ctrl+P command palette with fuzzy search.

**Files to create:**
- `src/components/modals/CommandPalette.tsx`
- `src/components/modals/CommandPalette.module.css`
- `src/lib/utils/fuzzyMatch.ts`

**Steps:**
1. Create `fuzzyMatch.ts`:
   - Fuzzy string matching algorithm (subsequence match with scoring)
   - Return match score + highlight ranges for rendering
2. Create command registry:
   - Central list of all commands: `{ id, name, shortcut?, callback }`
   - Register editor commands, navigation commands, UI toggle commands
   - Commands: Toggle left/right sidebar, Toggle dark/light theme, Open graph, New note, Delete note, Toggle reading/edit mode, Open settings, etc.
3. Create `CommandPalette` component:
   - Centered at top (`top: 15vh`), width `600px`
   - Input: full width, 48px height, 16px font, autofocus
   - Results list: filtered and sorted by fuzzy match score
   - Each item: 36px height, command name + keyboard shortcut (right-aligned, muted)
   - Selected item highlighted with `--background-modifier-hover`
   - Keyboard: `↑↓` navigate, `Enter` execute, `Esc` close
   - Backdrop overlay (semi-transparent)
4. Open on `Ctrl/Cmd+P`

**Verification:**
- Ctrl+P opens palette centered at top
- Typing filters commands with fuzzy matching
- Arrow keys navigate, Enter executes selected command
- Esc closes palette
- Commands execute correctly (e.g., toggle sidebar, switch theme)

**Dependencies:** Task 3

---

#### Task 15: Quick Switcher

**Description:** Build the Ctrl+O quick file switcher.

**Files to create:**
- `src/components/modals/QuickSwitcher.tsx`
- `src/components/modals/QuickSwitcher.module.css`

**Steps:**
1. Create `QuickSwitcher`:
   - Same visual style as Command Palette (600px, centered top)
   - Input searches vault file names with fuzzy matching
   - Results show file path (folder in muted text) + file name
   - Recently opened files appear first when query is empty
   - `Enter` opens file, `Ctrl+Enter` opens in new pane
   - Alias support: search also matches frontmatter aliases
2. Open on `Ctrl/Cmd+O`

**Verification:**
- Ctrl+O opens switcher
- Typing filters vault files by name
- Selecting a result opens the file in the editor
- Recent files shown by default

**Dependencies:** Tasks 4, 14

---

#### Task 16: Settings Modal

**Description:** Build the two-column settings modal matching Obsidian's layout.

**Files to create:**
- `src/components/modals/SettingsModal.tsx`
- `src/components/modals/SettingsModal.module.css`
- `src/components/ui/Toggle.tsx`

**Steps:**
1. Create `Toggle` component: 34x18px switch per spec
2. Create `SettingsModal`:
   - Max width 860px, max height 80vh, centered
   - Left column: category navigation (Appearance, Editor, Files & Links, Hotkeys)
   - Right column: settings content for selected category
   - Setting row: label + description (left), control (right)
   - Close button top-right
3. Settings categories:
   - **Appearance**: Theme toggle (dark/light), Accent color picker, Font sizes, Interface font, Editor font
   - **Editor**: Default mode (Source/Live Preview/Reading), Show line numbers, Auto-save interval, Spellcheck toggle, Readable line length toggle
   - **Files & Links**: Default new note location, Auto-update links on rename, Detect all file extensions
   - **Hotkeys**: List all commands with current shortcuts, click to rebind
4. Persist settings to localStorage
5. Open from Ribbon settings icon or Command Palette

**Verification:**
- Settings modal renders with two-column layout
- Theme toggle switches between dark/light
- Font size changes apply to editor
- Settings persist across page reloads

**Dependencies:** Tasks 3, 14

---

#### Task 17: Tags & Properties Panels

**Description:** Build the tags panel (left sidebar) and properties panel (right sidebar).

**Files to create:**
- `src/components/sidebar/TagsPanel.tsx`
- `src/components/sidebar/TagsPanel.module.css`
- `src/components/sidebar/PropertiesPanel.tsx`
- `src/components/sidebar/PropertiesPanel.module.css`
- `src/lib/markdown/frontmatter.ts`

**Steps:**
1. Create `frontmatter.ts`:
   - Use `gray-matter` to parse/serialize YAML frontmatter
   - Extract typed fields: text, list, number, date, checkbox, tags, aliases
2. Create `TagsPanel`:
   - Hierarchical tree of all tags in vault (e.g., `#topic/subtopic` nests)
   - Each tag shows count badge
   - Click tag → filter/search notes with that tag
   - Expand/collapse nested tags
3. Create `PropertiesPanel`:
   - Show active note's frontmatter as editable fields
   - Field types: text input, list (multi-value), date picker, checkbox, link
   - Edit a field → update frontmatter in file
   - Collapsible panel
   - "Add property" button
4. Connect to respective sidebar tabs

**Verification:**
- Tags panel shows all vault tags in tree with counts
- Clicking a tag filters to matching notes
- Properties panel shows frontmatter for current note
- Editing properties updates the file's YAML

**Dependencies:** Tasks 3, 10

---

### Phase 5: Bookmarks & Polish (Task 18)

---

#### Task 18: Bookmarks Panel

**Description:** Build the bookmarks panel for pinning notes, headings, and searches.

**Files to create:**
- `src/components/sidebar/BookmarksPanel.tsx`
- `src/components/sidebar/BookmarksPanel.module.css`

**Steps:**
1. Create bookmarks store (extend `ui.ts`):
   - `bookmarks: { type: 'file' | 'heading' | 'search', path: string, label: string }[]`
   - `addBookmark()`, `removeBookmark()`, `reorderBookmarks()`
   - Persist to localStorage
2. Create `BookmarksPanel`:
   - List of bookmarked items with appropriate icon (file, heading, search)
   - Click to navigate
   - Right-click to remove
   - Drag-to-reorder
3. Add "Bookmark this note" to context menu and command palette

**Verification:**
- Can bookmark a note from context menu
- Bookmarks appear in panel
- Click bookmark navigates to the note
- Can remove and reorder bookmarks
- Bookmarks persist across sessions

**Dependencies:** Tasks 3, 5

---

### Phase 6: Mobile & PWA (Tasks 19-20)

---

#### Task 19: Mobile Responsive Layout

**Description:** Adapt the layout for iOS PWA with slide-over sidebars, bottom nav, and touch-friendly targets.

**Files to create:**
- `src/styles/mobile.css`
- `src/components/layout/MobileNav.tsx`
- `src/components/layout/MobileNav.module.css`

**Steps:**
1. Create `mobile.css` with breakpoint `@media (max-width: 768px)`:
   - Sidebars become slide-over drawers (overlay, full height, width 85vw max 320px)
   - Slide in from left/right with transform animation
   - Backdrop overlay when open (click to close)
   - Ribbon hidden
   - Tab bar: horizontal swipeable
   - Editor: full width, padding 16px
   - Font size default 18px
   - All tap targets minimum 44px
2. Create `MobileNav` (bottom navigation bar):
   - Height: 56px, fixed bottom
   - Icons: Files, Search, Edit, Graph, Settings
   - Active item with accent color
   - Replaces Ribbon on mobile
3. Toolbar behavior on mobile:
   - Format toolbar always visible above the keyboard when editing
   - Compact icon row
4. Touch gestures:
   - Swipe right from left edge → open left sidebar
   - Swipe left from right edge → open right sidebar
   - Pull to refresh (triggers vault re-sync)
5. iOS PWA specific:
   - `apple-mobile-web-app-capable: yes`
   - `apple-mobile-web-app-status-bar-style: black-translucent`
   - Safe area insets for notch devices
   - Viewport: `viewport-fit=cover`

**Verification:**
- On mobile viewport: sidebars are drawers, bottom nav appears
- Swipe gestures work for sidebar toggle
- All tap targets are 44px+
- Format toolbar appears above keyboard
- Safe area insets respected on iOS

**Dependencies:** Tasks 3, 6

---

#### Task 20: PWA Service Worker & Offline Support

**Description:** Configure service worker for full offline capability and "Add to Home Screen" experience.

**Files to create:**
- `public/sw.js`
- `src/lib/utils/serviceWorker.ts`
- Update `public/manifest.json`

**Steps:**
1. Update `manifest.json`:
   ```json
   {
     "name": "Obsidian Clone",
     "short_name": "Notes",
     "start_url": "/",
     "display": "standalone",
     "background_color": "#1e1e1e",
     "theme_color": "#1e1e1e",
     "icons": [
       { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
       { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
       { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
     ]
   }
   ```
2. Create `sw.js` service worker:
   - Cache-first strategy for app shell (HTML, CSS, JS, icons)
   - Precache all static assets on install
   - Serve from cache when offline
   - Update cache in background on new version
3. Create `serviceWorker.ts`:
   - Register SW on app load
   - Handle update notifications (toast: "New version available, click to refresh")
   - Request persistent storage on iOS: `navigator.storage.persist()`
4. Generate PWA icons (192x192, 512x512, maskable) — simple purple icon with "O" letter
5. Add iOS-specific meta tags in `layout.tsx`:
   - Apple touch icon, splash screens, status bar style
6. Handle OPFS vault on iOS PWA:
   - On first launch: show "Create Vault" or "Import Files" option
   - Import: file picker to upload `.md` files into OPFS
   - Export: download vault as zip

**Verification:**
- `npm run build` produces valid static export
- Service worker registers and caches assets
- App works fully offline after first load
- "Add to Home Screen" works on iOS Safari
- App opens standalone (no browser chrome) on iOS
- Vault data persists across PWA sessions

**Dependencies:** Tasks 1, 4

---

## Task Dependency Graph

```
Task 1 (Project Setup)
├── Task 2 (Design Tokens)
│   └── Task 3 (Layout Shell)
│       ├── Task 5 (File Explorer) ← also needs Task 4
│       │   └── Task 18 (Bookmarks)
│       ├── Task 6 (Source Editor) ← also needs Task 4, 5
│       │   ├── Task 7 (Live Preview)
│       │   │   └── Task 8 (Reading Mode)
│       │   └── Task 9 (Toolbar & Shortcuts)
│       ├── Task 11 (Backlinks & Outline) ← also needs Task 6, 10
│       ├── Task 12 (Search) ← also needs Task 10
│       ├── Task 14 (Command Palette)
│       │   ├── Task 15 (Quick Switcher) ← also needs Task 4
│       │   └── Task 16 (Settings)
│       ├── Task 17 (Tags & Properties) ← also needs Task 10
│       └── Task 19 (Mobile Layout) ← also needs Task 6
├── Task 4 (File System)
│   └── Task 10 (Link Index)
│       └── Task 13 (Graph View)
└── Task 20 (PWA/Offline) ← also needs Task 4
```

## Execution Order (Parallel Opportunities)

| Batch | Tasks | Parallel? |
|-------|-------|-----------|
| 1 | Task 1 | Sequential |
| 2 | Task 2, Task 4 | Parallel (independent) |
| 3 | Task 3, Task 10 | Parallel (3 depends on 2, 10 depends on 4) |
| 4 | Task 5, Task 14, Task 20 | Parallel (all depend on 3 or 4) |
| 5 | Task 6, Task 12, Task 13, Task 17, Task 18 | Parallel |
| 6 | Task 7, Task 9, Task 11, Task 15, Task 16 | Parallel |
| 7 | Task 8, Task 19 | Parallel |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| iOS Safari drops PWA data after 7 days inactivity | Data loss | Request persistent storage, show "export vault" reminder, warn users |
| File System Access API not available on Firefox/Safari | Can't open local folders | OPFS fallback with import/export workflow |
| CodeMirror Live Preview complexity | Slow rendering, bugs | Start with basic decorations, iterate. Use `codemirror-live-markdown` as starting point |
| Large vault performance (1000+ notes) | Slow graph, slow search | Use Web Workers for indexing, Canvas for graph, virtual scrolling for file tree |
| OPFS storage limits on iOS (~60MB) | Can't store large vaults | Monitor quota, warn at 80%, compress assets |
