import matter from 'gray-matter'

export interface FrontmatterData {
  [key: string]: unknown
}

export function parseFrontmatter(content: string): { data: FrontmatterData; body: string } {
  try {
    const { data, content: body } = matter(content)
    return { data: data as FrontmatterData, body }
  } catch {
    return { data: {}, body: content }
  }
}

export function serializeFrontmatter(data: FrontmatterData, body: string): string {
  if (Object.keys(data).length === 0) return body
  try {
    return matter.stringify(body, data)
  } catch {
    return body
  }
}

export function updateFrontmatterField(content: string, key: string, value: unknown): string {
  const { data, body } = parseFrontmatter(content)
  if (value === null || value === undefined || value === '') {
    delete data[key]
  } else {
    data[key] = value
  }
  return serializeFrontmatter(data, body)
}
