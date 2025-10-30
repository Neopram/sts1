import React, { useState, useEffect } from 'react';
import { Settings, Plus, X, Save, RotateCcw, Eye, EyeOff, GripVertical } from 'lucide-react';
import { ApiService } from '../api';

interface Widget {
  id: string;
  name: string;
  type: 'chart' | 'table' | 'summary' | 'metric' | 'timeline' | 'map';
  size: 'small' | 'medium' | 'large' | 'full';
  position: number;
  enabled: boolean;
  refreshInterval?: number;
  dataSource?: string;
  customSettings?: Record<string, any>;
}

interface DashboardLayout {
  id: string;
  name: string;
  widgets: Widget[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DashboardCustomizationPage: React.FC = () => {
  const [layouts, setLayouts] = useState<DashboardLayout[]>([]);
  const [selectedLayout, setSelectedLayout] = useState<DashboardLayout | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [showNewLayout, setShowNewLayout] = useState(false);

  const availableWidgets = [
    { id: 'document-status', name: 'Document Status Overview', type: 'chart' as const },
    { id: 'vessel-timeline', name: 'Vessel Timeline', type: 'timeline' as const },
    { id: 'activity-feed', name: 'Recent Activities', type: 'table' as const },
    { id: 'approval-queue', name: 'Pending Approvals', type: 'table' as const },
    { id: 'compliance-score', name: 'Compliance Score', type: 'metric' as const },
    { id: 'regional-map', name: 'Regional Operations', type: 'map' as const },
    { id: 'expiring-docs', name: 'Expiring Documents', type: 'summary' as const },
    { id: 'team-performance', name: 'Team Performance', type: 'chart' as const },
    { id: 'sanctions-status', name: 'Sanctions Check Status', type: 'metric' as const },
  ];

  useEffect(() => {
    loadLayouts();
  }, []);

  useEffect(() => {
    if (selectedLayout) {
      setWidgets(selectedLayout.widgets);
    }
  }, [selectedLayout]);

  const loadLayouts = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getDashboardLayouts();
      setLayouts(data || []);
      if (data && data.length > 0) {
        setSelectedLayout(data[0]);
      }
    } catch (error) {
      console.error('Error loading layouts:', error);
      setMessage('Failed to load dashboard layouts');
    } finally {
      setLoading(false);
    }
  };

  const addWidget = (availableWidget: typeof availableWidgets[0]) => {
    const newWidget: Widget = {
      id: availableWidget.id + '_' + Date.now(),
      name: availableWidget.name,
      type: availableWidget.type,
      size: 'medium',
      position: widgets.length,
      enabled: true,
      refreshInterval: 300,
      dataSource: availableWidget.id
    };
    setWidgets([...widgets, newWidget]);
    setShowAddWidget(false);
    setMessage('Widget added successfully');
  };

  const removeWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    setMessage('Widget removed');
  };

  const updateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const toggleWidget = (id: string) => {
    updateWidget(id, { enabled: !widgets.find(w => w.id === id)?.enabled });
  };

  const moveWidget = (fromIndex: number, toIndex: number) => {
    const newWidgets = [...widgets];
    const [moved] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, moved);
    setWidgets(newWidgets.map((w, idx) => ({ ...w, position: idx })));
  };

  const saveLayout = async () => {
    try {
      setLoading(true);
      if (selectedLayout) {
        await ApiService.updateDashboardLayout(selectedLayout.id, {
          ...selectedLayout,
          widgets,
          updatedAt: new Date().toISOString()
        });
        setMessage('Layout saved successfully');
      }
    } catch (error) {
      console.error('Error saving layout:', error);
      setMessage('Failed to save layout');
    } finally {
      setLoading(false);
    }
  };

  const createNewLayout = async () => {
    if (!newLayoutName.trim()) {
      setMessage('Please enter a layout name');
      return;
    }
    try {
      setLoading(true);
      const newLayout: DashboardLayout = {
        id: 'layout_' + Date.now(),
        name: newLayoutName,
        widgets: [],
        isDefault: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await ApiService.createDashboardLayout(newLayout);
      setLayouts([...layouts, newLayout]);
      setSelectedLayout(newLayout);
      setNewLayoutName('');
      setShowNewLayout(false);
      setMessage('Layout created successfully');
    } catch (error) {
      console.error('Error creating layout:', error);
      setMessage('Failed to create layout');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefault = () => {
    setWidgets([]);
    setMessage('Layout reset to default');
  };

  const getSizeClasses = (size: string): string => {
    const sizeMap: Record<string, string> = {
      'small': 'col-span-1',
      'medium': 'col-span-2',
      'large': 'col-span-3',
      'full': 'col-span-4'
    };
    return sizeMap[size] || 'col-span-2';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard Customization</h1>
                <p className="text-slate-400 mt-1">Personalize your dashboard with custom widgets</p>
              </div>
            </div>
            <button
              onClick={saveLayout}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
          {message && (
            <div className="p-3 bg-green-900 text-green-200 rounded-lg">
              {message}
            </div>
          )}
        </div>

        <div className="grid grid-cols-4 gap-6">
          {/* Layout Selector */}
          <div className="col-span-1 space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Layouts</h3>
              
              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {layouts.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => setSelectedLayout(layout)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      selectedLayout?.id === layout.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <div className="font-medium truncate">{layout.name}</div>
                    <div className="text-xs opacity-75">{layout.widgets.length} widgets</div>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowNewLayout(true)}
                className="w-full px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center justify-center gap-2 mb-2"
              >
                <Plus className="w-4 h-4" />
                New Layout
              </button>

              {showNewLayout && (
                <div className="p-3 bg-slate-700 rounded-lg space-y-2">
                  <input
                    type="text"
                    placeholder="Layout name..."
                    value={newLayoutName}
                    onChange={(e) => setNewLayoutName(e.target.value)}
                    className="w-full px-2 py-1 bg-slate-600 text-white rounded border border-slate-500 text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createNewLayout}
                      disabled={loading}
                      className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setShowNewLayout(false)}
                      className="flex-1 px-2 py-1 bg-slate-600 text-white rounded text-sm hover:bg-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={resetToDefault}
              className="w-full px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 flex items-center justify-center gap-2 text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Default
            </button>
          </div>

          {/* Main Content */}
          <div className="col-span-3">
            {/* Add Widget Button */}
            <div className="mb-6">
              <button
                onClick={() => setShowAddWidget(!showAddWidget)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Widget
              </button>

              {showAddWidget && (
                <div className="mt-4 bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h4 className="text-white font-semibold mb-3">Available Widgets</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {availableWidgets.map((widget) => (
                      <button
                        key={widget.id}
                        onClick={() => addWidget(widget)}
                        className="text-left px-3 py-2 bg-slate-700 text-slate-300 rounded hover:bg-blue-600 hover:text-white transition text-sm"
                      >
                        {widget.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Widgets Grid */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Current Widgets</h3>
              
              {widgets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">No widgets added yet. Click "Add Widget" to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {widgets.map((widget, index) => (
                    <div
                      key={widget.id}
                      draggable
                      onDragStart={() => setDraggedWidget(widget.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggedWidget) {
                          const draggedIndex = widgets.findIndex(w => w.id === draggedWidget);
                          moveWidget(draggedIndex, index);
                          setDraggedWidget(null);
                        }
                      }}
                      className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                    >
                      <GripVertical className="w-4 h-4 text-slate-500 cursor-grab" />
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">{widget.name}</p>
                            <div className="flex gap-3 mt-1 text-xs text-slate-400">
                              <span>Type: {widget.type}</span>
                              <span>Size: {widget.size}</span>
                              {widget.refreshInterval && <span>Refresh: {widget.refreshInterval}s</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleWidget(widget.id)}
                              className={`p-1 rounded ${widget.enabled ? 'bg-green-600 text-white' : 'bg-slate-600 text-slate-400'}`}
                            >
                              {widget.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <select
                              value={widget.size}
                              onChange={(e) => updateWidget(widget.id, { size: e.target.value as Widget['size'] })}
                              className="px-2 py-1 bg-slate-600 text-white rounded text-sm border border-slate-500"
                            >
                              <option value="small">Small</option>
                              <option value="medium">Medium</option>
                              <option value="large">Large</option>
                              <option value="full">Full Width</option>
                            </select>
                            <button
                              onClick={() => removeWidget(widget.id)}
                              className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="mt-6 bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
              <div className="grid grid-cols-4 gap-4">
                {widgets
                  .filter(w => w.enabled)
                  .map((widget) => (
                    <div
                      key={widget.id}
                      className={`${getSizeClasses(widget.size)} bg-slate-700 rounded-lg p-4 min-h-40 flex items-center justify-center border border-slate-600`}
                    >
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">{widget.name}</p>
                        <p className="text-xs text-slate-500 mt-1">({widget.type})</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};