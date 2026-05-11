import { useState } from 'react';
import { useBudget, CURRENCIES, CustomCategoryRecord } from '@/lib/budget-context';
import { DEFAULT_INCOMING_CATEGORIES, DEFAULT_OUTGOING_CATEGORIES } from '@/lib/types';
import { getCategoryIcon, COLOR_PRESETS } from '@/lib/category-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, Lock } from 'lucide-react';
import { IconPicker } from '@/components/IconPicker';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { profile, settings, updateSettings, customCategoryRecords, addCategory, editCategory, deleteCategory, isDark, toggleDark, theme, setTheme } = useBudget();
  const isPro = profile.tier === 'pro';
  const { toast } = useToast();

  const [tab, setTab] = useState<'incoming' | 'outgoing'>('outgoing');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomCategoryRecord | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('MoreHorizontal');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setIcon('MoreHorizontal');
    setColor(COLOR_PRESETS[0]);
    setDialogOpen(true);
  };

  const openEdit = (rec: CustomCategoryRecord) => {
    setEditing(rec);
    setName(rec.name);
    setIcon(rec.icon);
    setColor(rec.color);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    if (editing) {
      await editCategory(editing.id, { name: trimmed, icon, color });
      toast({ title: 'Category updated' });
    } else {
      await addCategory(tab, trimmed, icon, color);
      toast({ title: 'Category added' });
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteCategory(deleteId);
    setDeleteId(null);
    toast({ title: 'Category deleted' });
  };

  const predefined = tab === 'incoming' ? DEFAULT_INCOMING_CATEGORIES : DEFAULT_OUTGOING_CATEGORIES;
  const customs = customCategoryRecords[tab];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Preferences, features, and category management</p>
      </div>

      {/* Preferences */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select value={settings.default_currency} onValueChange={async (v) => { await updateSettings({ default_currency: v }); toast({ title: `Currency set to ${v}` }); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.keys(CURRENCIES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground mt-0.5">Toggle the app's color theme</p>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleDark} />
          </div>
        </CardContent>
      </Card>

      {/* Appearance / Themes */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            Color Themes
            {!isPro && <Lock className="w-4 h-4 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isPro && <p className="text-sm text-muted-foreground">Upgrade to Pro to unlock superhero color themes.</p>}
          {isDark && <p className="text-sm text-muted-foreground">Themes apply in light mode only. Turn off Dark Mode to preview.</p>}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {THEMES.map(t => {
              const active = theme === t.id;
              const disabled = !isPro;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => { setTheme(t.id); toast({ title: `Theme: ${t.name}` }); }}
                  className={`relative rounded-xl border-2 p-3 text-left transition-all ${active ? 'border-primary shadow-card' : 'border-border hover:border-muted-foreground/40'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex gap-1.5 mb-2">
                    <span className="w-6 h-6 rounded-full border border-border/50" style={{ background: t.swatch[0] }} />
                    <span className="w-6 h-6 rounded-full border border-border/50" style={{ background: t.swatch[1] }} />
                  </div>
                  <div className="text-sm font-medium text-foreground">{t.name}</div>
                  {active && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pro Features */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            Pro Features
            {!isPro && <Lock className="w-4 h-4 text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {!isPro && <p className="text-sm text-muted-foreground">Upgrade to Pro to unlock these features.</p>}
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Enable Expense Tracking</Label>
              <p className="text-sm text-muted-foreground mt-0.5">Record actual spending and compare with allocations</p>
            </div>
            <Switch
              disabled={!isPro}
              checked={settings.expense_tracking_enabled}
              onCheckedChange={async (checked) => { await updateSettings({ expense_tracking_enabled: checked }); toast({ title: checked ? 'Expense tracking enabled' : 'Expense tracking disabled' }); }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Cross-budget Transfers</Label>
              <p className="text-sm text-muted-foreground mt-0.5">Move funds between Other Budgets and your monthly budget</p>
            </div>
            <Switch
              disabled={!isPro}
              checked={settings.cross_budget_transfers_enabled}
              onCheckedChange={async (checked) => { await updateSettings({ cross_budget_transfers_enabled: checked }); toast({ title: checked ? 'Cross-budget transfers enabled' : 'Cross-budget transfers disabled' }); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category Management */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="font-display">Categories</CardTitle>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add</Button>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'incoming' | 'outgoing')}>
            <TabsList className="bg-muted">
              <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
              <TabsTrigger value="incoming">Incoming</TabsTrigger>
            </TabsList>
            {(['outgoing', 'incoming'] as const).map(t => (
              <TabsContent key={t} value={t} className="space-y-4 mt-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Predefined</p>
                  <div className="space-y-1">
                    {predefined.map(name => {
                      const cfg = getCategoryIcon(name);
                      const Icon = cfg.icon;
                      return (
                        <div key={name} className="flex items-center gap-3 p-2 rounded-lg">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                            <Icon className="w-4 h-4" style={{ color: cfg.fg }} />
                          </div>
                          <span className="flex-1 text-sm">{name}</span>
                          <span className="text-xs text-muted-foreground">Built-in</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Custom</p>
                  {customs.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-3">No custom categories yet. Click "Add" above.</p>
                  ) : (
                    <div className="space-y-1">
                      {customs.map(rec => {
                        const cfg = getCategoryIcon(rec.name);
                        const Icon = cfg.icon;
                        return (
                          <div key={rec.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                              <Icon className="w-4 h-4" style={{ color: cfg.fg }} />
                            </div>
                            <span className="flex-1 text-sm">{rec.name}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rec)}><Edit2 className="w-4 h-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(rec.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Edit Category' : `Add ${tab === 'incoming' ? 'Incoming' : 'Outgoing'} Category`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Side Hustle" />
            </div>
            <IconPicker selectedIcon={icon} selectedColor={color} onIconChange={setIcon} onColorChange={setColor} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              Existing transactions keep the category name but will display the default icon. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
