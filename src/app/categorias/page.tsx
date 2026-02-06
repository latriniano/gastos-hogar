'use client';

import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { LucideIcon, availableIcons } from '@/components/LucideIcon';
import { formatSplit } from '@/lib/utils';
import { Category } from '@/lib/types';

export default function CategoriasPage() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('package');
  const [splitPercentage, setSplitPercentage] = useState(50);

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setIcon(cat.icon);
    setSplitPercentage(cat.default_split_percentage);
  };

  const openCreate = () => {
    setShowCreate(true);
    setName('');
    setIcon('package');
    setSplitPercentage(50);
  };

  const closeModal = () => {
    setEditingId(null);
    setShowCreate(false);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (editingId) {
      await updateCategory(editingId, { name: name.trim(), icon, default_split_percentage: splitPercentage });
    } else {
      await createCategory({ name: name.trim(), icon, default_split_percentage: splitPercentage });
    }
    closeModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Eliminar esta categoria? Los gastos asociados no se eliminaran.')) {
      await deleteCategory(id);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Categorias</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse"><div className="h-12 bg-gray-100 rounded" /></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map(cat => (
            <Card key={cat.id} padding="sm" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <LucideIcon name={cat.icon} className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                <p className="text-xs text-gray-500">Split: {formatSplit(cat.default_split_percentage)}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)} className="text-red-500">Eliminar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Button onClick={openCreate} className="w-full">+ Agregar categoria</Button>

      <Modal isOpen={!!editingId || showCreate} onClose={closeModal} title={editingId ? 'Editar Categoria' : 'Nueva Categoria'}>
        <div className="space-y-4">
          <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la categoria" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icono</label>
            <div className="grid grid-cols-6 gap-2">
              {availableIcons.map(iconName => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={`p-2 rounded-lg border-2 transition-all ${icon === iconName ? 'border-indigo-500 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'}`}
                >
                  <LucideIcon name={iconName} className="w-5 h-5 mx-auto text-gray-600" />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Split por defecto: {formatSplit(splitPercentage)}</label>
            <input type="range" min="0" max="100" value={splitPercentage} onChange={(e) => setSplitPercentage(parseInt(e.target.value))} className="w-full accent-indigo-600" />
          </div>
          <Button onClick={handleSave} className="w-full">{editingId ? 'Guardar Cambios' : 'Crear Categoria'}</Button>
        </div>
      </Modal>
    </div>
  );
}
