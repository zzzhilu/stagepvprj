
import { db } from './firebase';
import { collection, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import type { StageObject, CameraView, ContentTexture } from '@/store/useStore';

export interface ProjectState {
    name: string;
    stageObjects: StageObject[];
    views: CameraView[];
    contentTextures: ContentTexture[];
    activeViewId: string | null;
    activeContentId: string | null;
    cues?: any[]; // Store cues
    createdAt?: any;
    updatedAt?: any;
}

export interface ProjectSummary {
    id: string;
    name: string;
    createdAt: any;
    updatedAt: any;
}

export const ProjectService = {
    /**
     * Create a new project with a given name
     * @returns The ID of the created project
     */
    async createProject(name: string): Promise<string> {
        try {
            const projectsRef = collection(db, 'projects');
            const initialState: ProjectState = {
                name,
                stageObjects: [],
                views: [],
                contentTextures: [],
                activeViewId: null,
                activeContentId: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const docRef = await addDoc(projectsRef, initialState);
            return docRef.id;
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    },

    /**
     * Save the current project state to Firestore
     * @returns The ID of the created document
     */
    async saveProject(state: ProjectState): Promise<string> {
        try {
            const projectsRef = collection(db, 'projects');
            const docRef = await addDoc(projectsRef, {
                ...state,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            return docRef.id;
        } catch (error) {
            console.error('Error saving project:', error);
            throw error;
        }
    },

    /**
     * Update an existing project
     */
    async updateProject(id: string, state: Partial<ProjectState>): Promise<void> {
        try {
            const docRef = doc(db, 'projects', id);
            await updateDoc(docRef, {
                ...state,
                updatedAt: serverTimestamp(),
            });
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    },

    /**
     * Load a project state from Firestore by ID
     */
    async loadProject(id: string): Promise<ProjectState | null> {
        try {
            const docRef = doc(db, 'projects', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data() as ProjectState;
                return data;
            } else {
                console.warn('No such project document!');
                return null;
            }
        } catch (error) {
            console.error('Error loading project:', error);
            throw error;
        }
    },

    /**
     * List all projects (returns summary info only)
     */
    async listProjects(): Promise<ProjectSummary[]> {
        try {
            const projectsRef = collection(db, 'projects');
            const q = query(projectsRef, orderBy('createdAt', 'desc'));
            const querySnapshot = await getDocs(q);

            const projects: ProjectSummary[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                projects.push({
                    id: doc.id,
                    name: data.name || 'Unnamed Project',
                    createdAt: data.createdAt,
                    updatedAt: data.updatedAt,
                });
            });

            return projects;
        } catch (error) {
            console.error('Error listing projects:', error);
            throw error;
        }
    },

    /**
     * Delete a project by ID
     */
    async deleteProject(id: string): Promise<void> {
        try {
            const docRef = doc(db, 'projects', id);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }
};
