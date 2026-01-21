import { MaterialId, getMaterialOptions } from '@/lib/materials';

interface MaterialSelectorProps {
    currentMaterial: MaterialId;
    onChange: (materialId: MaterialId) => void;
}

export function MaterialSelector({ currentMaterial, onChange }: MaterialSelectorProps) {
    const materialOptions = getMaterialOptions();

    return (
        <div className="flex items-center gap-2 mt-1">
            <label className="text-xs text-gray-500">材質:</label>
            <select
                value={currentMaterial}
                onChange={(e) => onChange(e.target.value as MaterialId)}
                className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:border-violet-500 focus:outline-none hover:border-gray-600 transition-colors"
            >
                {materialOptions.map(mat => (
                    <option key={mat.id} value={mat.id}>
                        {mat.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
