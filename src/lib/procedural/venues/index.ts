import type { ProcVenueDef } from '../types';
import { TMC_VENUE } from './tmc';

/**
 * 向量建模場館清單。
 *
 * 新增場館:在本資料夾建立 `<id>.ts` 匯出 ProcVenueDef,再加進下方陣列。
 * ⚠️ id 一經發布不可改名 —— 專案以 model_path = `__proc__:<id>` 儲存,改名會讓舊專案找不到場館。
 */
export const PROCEDURAL_VENUES: ProcVenueDef[] = [TMC_VENUE];
