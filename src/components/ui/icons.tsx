'use client';

/**
 * 機關系統 SVG 圖標集。
 * 統一 stroke 線條風格(無填色、圓角端點),與介面既有 inline SVG 一致。
 * 尺寸由 className 控制(如 w-4 h-4)。
 */

interface IconProps {
    className?: string;
    strokeWidth?: number;
}

/** 機關:三軌滑桿(mixer fader)圖標 */
export function RigIcon({ className = 'w-4 h-4', strokeWidth = 1.8 }: IconProps) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M6 4v6m0 4v6M12 4v2m0 4v10M18 4v10m0 4v2M4 12h4M10 8h4M16 16h4" />
        </svg>
    );
}

/** Null 空物件:十字準星(軸心)圖標 */
export function NullIcon({ className = 'w-4 h-4', strokeWidth = 1.8 }: IconProps) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
            <circle cx="12" cy="12" r="3.5" />
            <path strokeLinecap="round" d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4" />
        </svg>
    );
}

/** 掛載:鏈結圖標 */
export function LinkIcon({ className = 'w-4 h-4', strokeWidth = 1.8 }: IconProps) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
    );
}

/** 旋轉機關:環形箭頭圖標 */
export function RotateIcon({ className = 'w-3.5 h-3.5', strokeWidth = 1.8 }: IconProps) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.5 3.5v3.8h-3.8" />
        </svg>
    );
}

/** 位移機關:上下箭頭圖標 */
export function TranslateIcon({ className = 'w-3.5 h-3.5', strokeWidth = 1.8 }: IconProps) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 3.5v17M12 3.5L8.5 7M12 3.5L15.5 7M12 20.5L8.5 17M12 20.5l3.5-3.5" />
        </svg>
    );
}

/** 場景選取:游標/指標圖標 */
export function PickIcon({ className = 'w-3.5 h-3.5', strokeWidth = 1.8 }: IconProps) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={strokeWidth}>
            <path strokeLinecap="round" strokeLinejoin="round"
                d="M5 4l7.5 16 2-6.5L21 11.5 5 4z" />
        </svg>
    );
}
