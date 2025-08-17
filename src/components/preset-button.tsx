'use client';

interface FilterPreset {
  id: string;
  name: string;
  listId: string;
  createdAt: number;
}

interface PresetButtonProps {
  preset: FilterPreset;
  isSelected: boolean;
  onToggle: (preset: FilterPreset) => void;
  onDelete: (presetId: string) => void;
  className?: string;
}

export function PresetButton({ preset, isSelected, onToggle, onDelete, className = '' }: PresetButtonProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发toggle
    onDelete(preset.id);
  };

  return (
    <div 
      className={`relative group inline-block ${className}`}
      onMouseEnter={(e) => e.currentTarget.querySelector('.delete-btn')?.classList.remove('opacity-0')}
      onMouseLeave={(e) => e.currentTarget.querySelector('.delete-btn')?.classList.add('opacity-0')}
    >
      <button
        onClick={() => onToggle(preset)}
        className={`
          inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border transition-colors
          ${isSelected 
            ? 'bg-blue-100 text-blue-800 border-blue-300' 
            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          }
        `}
      >
        {preset.name}
        <span className="ml-1 text-xs opacity-60">({preset.listId.slice(-6)})</span>
      </button>
      
      {/* 删除按钮 */}
      <button
        onClick={handleDelete}
        className="delete-btn absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 transition-opacity"
        title="删除预制"
      >
        ×
      </button>
    </div>
  );
}