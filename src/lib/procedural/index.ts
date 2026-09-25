import { PROCEDURAL_VENUES } from './venues';
import type { ProcVenueDef } from './types';

export * from './types';
export { PROCEDURAL_VENUES };

/** 向量建模物件的 model_path 前綴(與 '__box__' 等內建 primitive 同一套 `__` 命名慣例) */
export const PROC_PREFIX = '__proc__:';

export function isProceduralPath(modelPath: string | undefined | null): boolean {
    return !!modelPath && modelPath.startsWith(PROC_PREFIX);
}

export function procPath(id: string): string {
    return `${PROC_PREFIX}${id}`;
}

export function getProceduralVenue(modelPath: string): ProcVenueDef | undefined {
    if (!isProceduralPath(modelPath)) return undefined;
    const id = modelPath.slice(PROC_PREFIX.length);
    return PROCEDURAL_VENUES.find(v => v.id === id);
}
