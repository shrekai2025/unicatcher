'use client';

import { useState } from 'react';

interface FilterPreset {
  id: string;
  name: string;
  listId: string;
  createdAt: number;
}

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preset: Omit<FilterPreset, 'id' | 'createdAt'>) => void;
}

export function PresetModal({ isOpen, onClose, onSave }: PresetModalProps) {
  const [name, setName] = useState('');
  const [listId, setListId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !listId.trim()) {
      alert('请填写完整信息');
      return;
    }

    onSave({
      name: name.trim(),
      listId: listId.trim(),
    });

    // 清空表单
    setName('');
    setListId('');
    onClose();
  };

  const handleClose = () => {
    setName('');
    setListId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">添加筛选预制</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="preset-name" className="block text-sm font-medium text-gray-700 mb-1">
              预制名称
            </label>
            <input
              id="preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：AI相关"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="preset-listid" className="block text-sm font-medium text-gray-700 mb-1">
              List ID
            </label>
            <input
              id="preset-listid"
              type="text"
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              placeholder="例如：1952162308337324098"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}