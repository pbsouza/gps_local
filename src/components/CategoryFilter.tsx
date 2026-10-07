import { CategoryInfo } from '../types/kml';
import { Search, Filter, CheckSquare, Square, X } from 'lucide-react';

interface CategoryFilterProps {
  categories: CategoryInfo[];
  selectedCategories: Set<string>;
  searchQuery: string;
  totalPlacemarks: number;
  filteredCount: number;
  onToggleCategory: (categoryName: string) => void;
  onSelectAllCategories: () => void;
  onDeselectAllCategories: () => void;
  onSearchChange: (query: string) => void;
}

export function CategoryFilter({
  categories,
  selectedCategories,
  searchQuery,
  totalPlacemarks,
  filteredCount,
  onToggleCategory,
  onSelectAllCategories,
  onDeselectAllCategories,
  onSearchChange,
}: CategoryFilterProps) {
  const allSelected = categories.length > 0 && selectedCategories.size === categories.length;

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200/80 p-3 sm:p-4 space-y-3">
      {/* Header & Placemark count */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
          <Filter className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Filtro por Categorias</span>
        </div>
        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
          {filteredCount} de {totalPlacemarks} no mapa
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar localidade ou descrição..."
          className="w-full pl-8 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1.5 rounded-full"
            title="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bulk actions */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
        <span>{categories.length} categoria(s)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={allSelected ? onDeselectAllCategories : onSelectAllCategories}
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors py-1 px-1 rounded active:bg-blue-50"
          >
            {allSelected ? (
              <>
                <Square className="w-3.5 h-3.5" />
                <span>Desmarcar todas</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Marcar todas</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Category Pills / List */}
      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
        {categories.map((cat) => {
          const isSelected = selectedCategories.has(cat.name);
          return (
            <button
              key={cat.name}
              onClick={() => onToggleCategory(cat.name)}
              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all border text-left cursor-pointer active:scale-[0.99] min-h-[38px] ${
                isSelected
                  ? 'bg-slate-50/90 hover:bg-slate-100 border-slate-200/90 text-slate-900 font-medium shadow-2xs'
                  : 'bg-white hover:bg-slate-50 border-transparent text-slate-400 line-through decoration-slate-400/50'
              }`}
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span
                  className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs transition-transform"
                  style={{
                    backgroundColor: cat.color,
                    opacity: isSelected ? 1 : 0.4,
                    transform: isSelected ? 'scale(1)' : 'scale(0.85)',
                  }}
                />
                <span className="truncate">{cat.name}</span>
              </div>

              <span
                className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 font-semibold ${
                  isSelected
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
