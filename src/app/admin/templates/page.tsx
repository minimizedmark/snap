'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, ToggleLeft, ToggleRight, Eye, X } from 'lucide-react';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'quote_request', label: 'Quote Request' },
  { value: 'general_inquiry', label: 'General Inquiry' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'after_hours', label: 'After Hours' },
];

const AVAILABLE_VARIABLES = ['businessName', 'callerName', 'businessHours', 'responseTime', 'serviceName'];

interface Template {
  id: string;
  name: string;
  category: string;
  messageText: string;
  variables: string[];
  version: number;
  isActive: boolean;
}

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('general_inquiry');
  const [formMessage, setFormMessage] = useState('');
  const [formVariables, setFormVariables] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.set('category', filterCategory);
      const res = await fetch(`/api/admin/templates?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setTemplates(data.templates);
    } catch {
      console.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [filterCategory]);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormName('');
    setFormCategory('general_inquiry');
    setFormMessage('');
    setFormVariables([]);
    setShowModal(true);
  };

  const openEditModal = (template: Template) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormCategory(template.category);
    setFormMessage(template.messageText);
    setFormVariables(template.variables);
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = editingTemplate ? 'PUT' : 'POST';
      const body = editingTemplate
        ? { id: editingTemplate.id, name: formName, category: formCategory, messageText: formMessage, variables: formVariables }
        : { name: formName, category: formCategory, messageText: formMessage, variables: formVariables };

      const res = await fetch('/api/admin/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to save');
      setShowModal(false);
      fetchTemplates();
    } catch {
      console.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (template: Template) => {
    try {
      const res = await fetch('/api/admin/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: template.id, isActive: !template.isActive }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      fetchTemplates();
    } catch {
      console.error('Failed to toggle template');
    }
  };

  const insertVariable = (varName: string) => {
    setFormMessage((prev) => prev + `{${varName}}`);
    if (!formVariables.includes(varName)) {
      setFormVariables((prev) => [...prev, varName]);
    }
  };

  const openPreview = (template: Template) => {
    setPreviewTemplate(template);
    const vars: Record<string, string> = {};
    template.variables.forEach((v) => { vars[v] = ''; });
    setPreviewVars(vars);
    setShowPreview(true);
  };

  const renderPreview = () => {
    if (!previewTemplate) return '';
    let text = previewTemplate.messageText;
    Object.entries(previewVars).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), value || `{${key}}`);
    });
    return text;
  };

  const categoryBadgeColor = (cat: string) => {
    const colors: Record<string, string> = {
      emergency: 'bg-red-100 text-red-800',
      quote_request: 'bg-blue-100 text-blue-800',
      general_inquiry: 'bg-green-100 text-green-800',
      appointment: 'bg-purple-100 text-purple-800',
      complaint: 'bg-yellow-100 text-yellow-800',
      after_hours: 'bg-gray-100 text-gray-800',
    };
    return colors[cat] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/admin')} className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold">Message Templates</h1>
                <p className="text-gray-400 text-sm mt-1">Manage AI response templates</p>
              </div>
            </div>
            <button onClick={openCreateModal} className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-medium transition-colors flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>New Template</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => { setFilterCategory(cat.value); setLoading(true); }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                filterCategory === cat.value ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="text-gray-400 text-center py-12">No templates found. Create one to get started.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className={`bg-gray-800 rounded-lg p-6 border ${template.isActive ? 'border-gray-700' : 'border-gray-700 opacity-60'}`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-lg">{template.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${categoryBadgeColor(template.category)}`}>
                    {template.category.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">{template.messageText}</p>
                {template.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.variables.map((v) => (
                      <span key={v} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-cyan-400">{`{${v}}`}</span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>v{template.version}</span>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => openPreview(template)} className="text-gray-400 hover:text-white transition-colors" title="Preview">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEditModal(template)} className="text-gray-400 hover:text-white transition-colors" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleActive(template)} className="text-gray-400 hover:text-white transition-colors" title={template.isActive ? 'Deactivate' : 'Activate'}>
                      {template.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editingTemplate ? 'Edit Template' : 'New Template'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" placeholder="Template name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                <textarea value={formMessage} onChange={(e) => setFormMessage(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white" rows={4} placeholder="Template message text..." />
                <div className="flex flex-wrap gap-1 mt-2">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button key={v} onClick={() => insertVariable(v)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-cyan-400 transition-colors">
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex space-x-3 pt-2">
                <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={!formName || !formMessage || saving} className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg disabled:opacity-50 transition-colors">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Preview: {previewTemplate.name}</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              {previewTemplate.variables.map((v) => (
                <div key={v}>
                  <label className="block text-sm font-medium text-gray-300 mb-1">{v}</label>
                  <input
                    type="text"
                    value={previewVars[v] || ''}
                    onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder={`Enter ${v}...`}
                  />
                </div>
              ))}
              <div className="bg-gray-700 rounded-lg p-4 mt-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">Rendered Message</label>
                <p className="text-white">{renderPreview()}</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="w-full px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
