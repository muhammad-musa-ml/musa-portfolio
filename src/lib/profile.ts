import raw from '../../content/profile.json'

export interface Education {
  institution: string
  degree: string
  field: string
  start: string
  end: string
  gpa?: string | null
  highlights?: string[]
}
export interface Experience {
  org: string
  role: string
  start: string
  end: string
  location?: string
  summary?: string
  bullets: string[]
  tags?: string[]
}
export interface Project {
  name: string
  description: string
  tech: string[]
  highlights?: string[]
  category?: string
  featured?: boolean
  link?: string | null
}
export interface Milestone {
  year: string | number
  title: string
  subtitle?: string
  description: string
  icon_hint?: string
}
export interface Certificate {
  id: string
  name: string
  issuer: string
  issued: string
  image: string
  pdf?: string
  url?: string
  sample?: boolean
  tags: string[]
  summary: string
}
export interface CertificateGroup {
  id: string
  title: string
  certs: Certificate[]
}
export interface Profile {
  name: string
  tagline: string
  role_line?: string
  location?: string
  email?: string
  linkedin?: string | null
  github?: string | null
  website?: string | null
  orcid?: string | null
  resume_pdf?: string | null
  availability?: string
  education: Education[]
  experience: Experience[]
  projects: Project[]
  skills: Record<string, string[]>
  research: { title: string; venue?: string; year?: string | number; description?: string }[]
  awards: string[]
  ai_for_humanity: { why?: string; themes: string[]; evidence: string[] }
  certificate_groups: CertificateGroup[]
  journey_milestones: Milestone[]
}

export const profile = raw as unknown as Profile

export const firstName = profile.name?.split(' ')[0] || 'Me'
