import { isProceduralPath } from '@/lib/procedural';
import { BoxPrimitiveRenderer } from './BoxPrimitiveRenderer';
import { ProjectionScreenRenderer } from './ProjectionScreenRenderer';
import { ProceduralVenueRenderer } from './ProceduralVenueRenderer';
import { StageObjectRenderer } from './StageObjectRenderer';

/** 依 model_path 選擇渲染器:內建 primitive(`__box__` 等)、向量建模(`__proc__:`)或 GLB */
export function pickRenderer(modelPath: string) {
    if (modelPath === '__box__') return BoxPrimitiveRenderer;
    if (modelPath === '__projection_screen__') return ProjectionScreenRenderer;
    if (isProceduralPath(modelPath)) return ProceduralVenueRenderer;
    return StageObjectRenderer;
}
