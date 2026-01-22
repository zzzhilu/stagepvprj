
import { db } from './firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import type { StageObject, CameraView, ContentTexture } from '@/store/useStore';

export interface ProjectState {
    name: string;
    stageObjects: StageObject[];
    views: CameraView[];
    contentTextures: ContentTexture[];
    activeViewId: string | null;
    activeContentId: string | null;
    createdAt?: any;
}

export const ProjectService = {
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
            });
            return docRef.id;
        } catch (error) {
            console.error('Error saving project:', error);
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
                // Convert timestamps if necessary, but for our state pure JSON is fine
                return data;
            } else {
                console.warn('No such project document!');
                return null;
            }
        } catch (error) {
            console.error('Error loading project:', error);
            throw error;
        }
    }
};
