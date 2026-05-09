import { ICON_NAMES, COLOR_PRESETS, resolveIcon } from '@/lib/category-icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface IconPickerProps {
  selectedIcon: string;
  selectedColor: string;
  onIconChange: (icon: string) => void;
  onColorChange: (color: string) => void;
}

export function IconPicker({ selectedIcon, selectedColor, onIconChange, onColorChange }: IconPickerProps) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium mb-2">Color</p>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className={cn(
                'w-8 h-8 rounded-full transition-all',
                selectedColor === c ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110' : ''
              )}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Icon</p>
        <ScrollArea className="h-48 rounded-md border border-border p-2">
          <div className="grid grid-cols-7 gap-1.5">
            {ICON_NAMES.map(name => {
              const Icon = resolveIcon(name);
              const isSel = selectedIcon === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => onIconChange(name)}
                  className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
                    isSel ? 'ring-2 ring-foreground' : 'bg-muted hover:bg-muted/70'
                  )}
                  style={isSel ? { backgroundColor: selectedColor } : undefined}
                  aria-label={name}
                >
                  <Icon className="w-4 h-4" style={{ color: isSel ? '#fff' : undefined }} />
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
      <div className="flex items-center gap-3 p-3 rounded-md bg-muted/40">
        <span className="text-sm text-muted-foreground">Preview:</span>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: selectedColor }}>
          {(() => { const I = resolveIcon(selectedIcon); return <I className="w-5 h-5" style={{ color: '#fff' }} />; })()}
        </div>
      </div>
    </div>
  );
}
