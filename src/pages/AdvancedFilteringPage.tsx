import React, { useState, useEffect } from 'react';
import { Filter, X, Plus, Save, RotateCcw, Download } from 'lucide-react';
import { ApiService } from '../api';

interface FilterField {
  id: string;
  name: string;
  type: 'text' | 'select' | 'date' | 'daterange' | 'number' | 'multiselect';
  operator?: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'between';
  value?: string | string[] | number | { from: number; to: number };
  options?: string[];
}

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  fields: FilterField[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  appliedCount: number;
}

export const AdvancedFilteringPage: React.FC = () => {
  const [filters, setFilters] = useState<SavedFilter[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterField[]>([]);
  const [selectedSavedFilter, setSelectedSavedFilter] = useState<SavedFilter | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterDescription, setFilterDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  const availableFields = [
    { id: 'status', name: 'Status', type: 'select' as const, options: ['Missing', 'Under Review', 'Approved', 'Expired'] },
    { id: 'vessel_name', name: 'Vessel Name', type: 'text' as const },
    { id: 'document_type', name: 'Document Type', type: 'multiselect' as const, options: ['CIQ', 'Class', 'Insurance', 'Certification'] },
    { id: 'date_uploaded', name: 'Date Uploaded', type: 'daterange' as const },
    { id: 'priority', name: 'Priority', type: 'select' as const, options: ['High', 'Medium', 'Low'] },
    { id: 'assigned_to', name: 'Assigned To', type: 'select' as const, options: ['User 1', 'User 2', 'User 3'] },
    { id: 'expiry_date', name: 'Expiry Date', type: 'daterange' as const },
    { id: 'criticality_score', name: 'Criticality Score', type: 'number' as const },
    { id: 'reviewer_name', name: 'Reviewer Name', type: 'text' as const },
    { id: 'location', name: 'Location', type: 'select' as const, options: ['Port A', 'Port B', 'Port C'] },
  ];

  useEffect(() => {
    loadSavedFilters();
  }, []);

  const loadSavedFilters = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getSavedFilters();
      setFilters(data || []);
    } catch (error) {
      console.error('Error loading filters:', error);
      setMessage('Failed to load saved filters');
    } finally {
      setLoading(false);
    }
  };

  const addFilterField = (fieldId: string) => {
    const field = availableFields.find(f => f.id === fieldId);
    if (field) {
      const newFilter: FilterField = {
        id: fieldId + '_' + Date.now(),
        name: field.name,
        type: field.type,
        options: field.options,
        operator: 'equals'
      };
      setCurrentFilter([...currentFilter, newFilter]);
    }
  };

  const updateFilterField = (id: string, updates: Partial<FilterField>) => {
    setCurrentFilter(currentFilter.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilterField = (id: string) => {
    setCurrentFilter(currentFilter.filter(f => f.id !== id));
  };

  const applyFilter = async () => {
    try {
      setLoading(true);
      const results = await ApiService.applyAdvancedFilter(currentFilter);
      setResultCount(results?.count || 0);
      setMessage(`Filter applied - ${results?.count || 0} results found`);
    } catch (error) {
      console.error('Error applying filter:', error);
      setMessage('Failed to apply filter');
    } finally {
      setLoading(false);
    }
  };

  const saveFilter = async () => {
    if (!filterName.trim()) {
      setMessage('Please enter a filter name');
      return;
    }

    try {
      setLoading(true);
      const newFilter: SavedFilter = {
        id: 'filter_' + Date.now(),
        name: filterName,
        description: filterDescription,
        fields: currentFilter,
        isPublic,
        createdBy: 'current_user',
        createdAt: new Date().toISOString(),
        appliedCount: 0
      };
      await ApiService.saveAdvancedFilter(newFilter);
      setFilters([...filters, newFilter]);
      setFilterName('');
      setFilterDescription('');
      setMessage('Filter saved successfully');
    } catch (error) {
      console.error('Error saving filter:', error);
      setMessage('Failed to save filter');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedFilter = (filter: SavedFilter) => {
    setCurrentFilter(filter.fields);
    setSelectedSavedFilter(filter);
    setMessage(`Loaded filter: ${filter.name}`);
  };

  const deleteFilter = async (id: string) => {
    try {
      setLoading(true);
      await ApiService.deleteAdvancedFilter(id);
      setFilters(filters.filter(f => f.id !== id));
      setMessage('Filter deleted');
    } catch (error) {
      console.error('Error deleting filter:', error);
      setMessage('Failed to delete filter');
    } finally {
      setLoading(false);
    }
  };

  const exportResults = async () => {
    try {
      setLoading(true);
      const data = await ApiService.exportFilteredResults(currentFilter);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filter-results-${Date.now()}.json`;
      a.click();
      setMessage('Results exported successfully');
    } catch (error) {
      console.error('Error exporting results:', error);
      setMessage('Failed to export results');
    } finally {
      setLoading(false);
    }
  };

  const resetFilter = () => {
    setCurrentFilter([]);
    setFilterName('');
    setFilterDescription('');
    setSelectedSavedFilter(null);
    setResultCount(0);
    setMessage('Filter reset');
  };

  const getOperatorOptions = (fieldType: string): string[] => {
    const operators: Record<string, string[]> = {
      'text': ['equals', 'contains', 'startsWith', 'endsWith'],
      'select': ['equals'],
      'date': ['equals', 'gt', 'lt', 'between'],
      'daterange': ['between'],
      'number': ['equals', 'gt', 'lt', 'between'],
      'multiselect': ['equals']
    };
    return operators[fieldType] || ['equals'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Advanced Filtering</h1>
              <p className="text-slate-400 mt-1">Create and save complex filter combinations</p>
            </div>
          </div>
          {message && (
            <div className="p-3 bg-green-900 text-green-200 rounded-lg">
              {message}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Saved Filters Panel */}
          <div className="col-span-1 space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Saved Filters</h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filters.length === 0 ? (
                  <p className="text-slate-400 text-sm">No saved filters yet</p>
                ) : (
                  filters.map((filter) => (
                    <div
                      key={filter.id}
                      className={`p-3 rounded-lg cursor-pointer transition ${
                        selectedSavedFilter?.id === filter.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <button
                        onClick={() => loadSavedFilter(filter)}
                        className="w-full text-left"
                      >
                        <p className="font-medium">{filter.name}</p>
                        <p className="text-xs opacity-75">
                          {filter.fields.length} conditions • Used {filter.appliedCount} times
                        </p>
                        {filter.description && (
                          <p className="text-xs mt-1 opacity-75">{filter.description}</p>
                        )}
                      </button>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => loadSavedFilter(filter)}
                          className="flex-1 px-2 py-1 bg-slate-600 text-xs rounded hover:bg-slate-500"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteFilter(filter.id)}
                          className="flex-1 px-2 py-1 bg-red-600 text-xs rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Filter Builder */}
          <div className="col-span-2 space-y-6">
            {/* Save Filter Section */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Save Current Filter</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 text-sm"
                />
                <textarea
                  placeholder="Description (optional)..."
                  value={filterDescription}
                  onChange={(e) => setFilterDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 text-sm h-20"
                />
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <span className="text-sm">Make this filter public</span>
                </label>
                <button
                  onClick={saveFilter}
                  disabled={loading || !filterName.trim()}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Filter
                </button>
              </div>
            </div>

            {/* Filter Conditions */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filter Conditions</h3>
                <div className="flex gap-2">
                  <button
                    onClick={applyFilter}
                    disabled={loading || currentFilter.length === 0}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    Apply
                  </button>
                  <button
                    onClick={exportResults}
                    disabled={loading || resultCount === 0}
                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
                  >
                    <Download className="w-3 h-3" />
                    Export
                  </button>
                  <button
                    onClick={resetFilter}
                    className="px-3 py-1 bg-slate-700 text-white text-sm rounded hover:bg-slate-600 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>

              {currentFilter.length === 0 ? (
                <p className="text-slate-400 text-sm mb-4">No filters added yet</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {currentFilter.map((filter) => (
                    <div key={filter.id} className="bg-slate-700 p-3 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-white">{filter.name}</p>
                        <button
                          onClick={() => removeFilterField(filter.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={filter.operator || 'equals'}
                          onChange={(e) => updateFilterField(filter.id, { operator: e.target.value as FilterField['operator'] })}
                          className="px-2 py-1 bg-slate-600 text-white rounded text-sm border border-slate-500"
                        >
                          {getOperatorOptions(filter.type).map(op => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                        
                        {filter.type === 'select' && (
                          <select
                            value={String(filter.value || '')}
                            onChange={(e) => updateFilterField(filter.id, { value: e.target.value })}
                            className="px-2 py-1 bg-slate-600 text-white rounded text-sm border border-slate-500 col-span-2"
                          >
                            <option value="">Select value...</option>
                            {filter.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        )}
                        {filter.type === 'text' && (
                          <input
                            type="text"
                            placeholder="Enter value..."
                            value={String(filter.value || '')}
                            onChange={(e) => updateFilterField(filter.id, { value: e.target.value })}
                            className="px-2 py-1 bg-slate-600 text-white rounded text-sm border border-slate-500 col-span-2"
                          />
                        )}
                        {filter.type === 'number' && (
                          <input
                            type="number"
                            placeholder="Enter value..."
                            value={String(filter.value || '')}
                            onChange={(e) => updateFilterField(filter.id, { value: parseInt(e.target.value) })}
                            className="px-2 py-1 bg-slate-600 text-white rounded text-sm border border-slate-500 col-span-2"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-slate-400">Add condition:</p>
                <div className="grid grid-cols-3 gap-2">
                  {availableFields.map(field => (
                    <button
                      key={field.id}
                      onClick={() => addFilterField(field.id)}
                      className="px-3 py-2 bg-slate-700 text-slate-300 rounded text-sm hover:bg-blue-600 hover:text-white transition flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      {field.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results */}
            {resultCount > 0 && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-300">
                  <span className="font-semibold text-green-400">{resultCount}</span> results found
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};