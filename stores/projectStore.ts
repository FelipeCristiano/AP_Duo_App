import { create } from 'zustand'
import {
  Project,
  getAllProjects,
  createProject,
  updateProject,
  deleteProject,
} from '@/services/db/projects'

interface ProjectStore {
  projects:      Project[]
  loading:       boolean
  fetchProjects: () => Promise<void>
  addProject:    (data: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<number>
  editProject:   (id: number, data: Partial<Project>) => Promise<void>
  removeProject: (id: number) => Promise<void>
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  loading:  false,

  fetchProjects: async () => {
    set({ loading: true })
    const projects = await getAllProjects()
    set({ projects, loading: false })
  },

  addProject: async (data) => {
    const id = await createProject(data)
    const projects = await getAllProjects()
    set({ projects })
    return id
  },

  editProject: async (id, data) => {
    await updateProject(id, data)
    const projects = await getAllProjects()
    set({ projects })
  },

  removeProject: async (id) => {
    await deleteProject(id)
    set(state => ({
      projects: state.projects.filter(p => p.id !== id)
    }))
  },
}))