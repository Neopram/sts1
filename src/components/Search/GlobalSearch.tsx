import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, FileText, Ship, Activity, MessageSquare, MapPin, Clock, User, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSearch } from '../../contexts/SearchContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const GlobalSearch: React.FC = () => {
  const {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    searchError,
    performGlobalSearch,
    clearSearch
  } = useSearch();
  const { t } = useLanguage();

  const navigate = useNavigate();
  const [showResults, setShowResults] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recent searches and suggestions
  const recentSearches = ['Safety Certificate', 'MV Ocean Star', 'Fujairah', 'Insurance'];
  const searchSuggestions = ['Documents', 'Vessels', 'Activities', 'Messages', 'Approvals'];

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (query.trim()) {
            performGlobalSearch(query);
            setShowResults(true);
          } else {
            setShowResults(false);
          }
        }, 300);
      };
    })(),
    [performGlobalSearch]
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
    
    if (value.trim()) {
      setShowSuggestions(false);
    } else {
      setShowSuggestions(true);
    }
  };

  // Handle search input focus
  const handleSearchFocus = () => {
    if (!searchTerm.trim()) {
      setShowSuggestions(true);
    }
    setShowResults(true);
  };

  // Handle search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      performGlobalSearch(searchTerm);
      setShowResults(true);
    }
  };

  // Handle result selection
  const handleResultClick = (result: any) => {
    navigate(result.url);
    clearSearch();
    setShowResults(false);
  };

  // Handle clear search
  const handleClearSearch = () => {
    clearSearch();
    setShowResults(false);
    inputRef.current?.focus();
  };

  // Close search on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowResults(false);
      }
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'room':
        return <MapPin className="w-4 h-4 text-success-500" />;
      case 'vessel':
        return <Ship className="w-4 h-4 text-purple-500" />;
      case 'activity':
        return <Activity className="w-4 h-4 text-orange-500" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4 text-secondary-500" />;
    }
  };

  // Get status icon and color
  const getStatusInfo = (metadata: any) => {
    if (metadata?.status === 'approved') {
      return { icon: <CheckCircle className="w-3 h-3 text-success-500" />, color: 'text-success-600' };
    }
    if (metadata?.status === 'pending') {
      return { icon: <Clock className="w-3 h-3 text-warning-500" />, color: 'text-warning-600' };
    }
    if (metadata?.status === 'rejected') {
      return { icon: <AlertTriangle className="w-3 h-3 text-danger-500" />, color: 'text-danger-600' };
    }
    return null;
  };

  return (
    <div ref={searchRef} className="relative">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
                 <input
           ref={inputRef}
           type="text"
           placeholder={t('search.placeholder')}
           value={searchTerm}
           onChange={handleSearchChange}
           onFocus={handleSearchFocus}
           className="w-64 pl-10 pr-10 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
         />
        
        {/* Clear button */}
        {searchTerm && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Keyboard shortcut hint */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-secondary-400 hidden lg:block">
          ⌘K
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-secondary-200 max-h-96 overflow-y-auto z-50">
          {/* Search Header */}
          <div className="px-4 py-3 border-b border-secondary-200">
                         <div className="flex items-center justify-between">
               <h3 className="text-sm font-medium text-secondary-900">{t('search.results')}</h3>
               {isSearching && (
                 <div className="flex items-center space-x-2">
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                   <span className="text-xs text-secondary-500">{t('search.searching')}</span>
                 </div>
               )}
             </div>
          </div>

          {/* Error Display */}
          {searchError && (
            <div className="px-4 py-3 border-b border-secondary-200">
              <div className="flex items-center space-x-2 text-danger-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm">{searchError}</span>
              </div>
            </div>
          )}

          {/* Results List */}
          {searchResults.length > 0 ? (
            <div className="py-2">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full text-left px-4 py-3 hover:bg-secondary-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getResultIcon(result.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-secondary-900 truncate">
                          {result.title}
                        </h4>
                        <span className="text-xs text-secondary-500 capitalize">
                          {result.type}
                        </span>
                        {getStatusInfo(result.metadata) && (
                          <div className="flex items-center space-x-1">
                            {getStatusInfo(result.metadata)?.icon}
                            <span className={`text-xs ${getStatusInfo(result.metadata)?.color}`}>
                              {result.metadata?.status}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <p className="text-sm text-secondary-600 mb-2 line-clamp-2">
                        {result.description}
                      </p>
                      
                      {/* Metadata */}
                      <div className="flex items-center space-x-4 text-xs text-secondary-500">
                        {result.metadata?.user && (
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{result.metadata.user}</span>
                          </div>
                        )}
                        {result.metadata?.timestamp && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(result.metadata.timestamp).toLocaleDateString()}</span>
                          </div>
                        )}
                        {result.metadata?.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{result.metadata.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-shrink-0">
                      <span className="text-xs text-secondary-400">
                        {Math.round(result.relevance * 100)}%
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
                     ) : searchTerm && !isSearching ? (
             <div className="px-4 py-8 text-center">
               <Search className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
               <p className="text-sm text-secondary-500">{t('search.noResults')}</p>
               <p className="text-xs text-secondary-400 mt-1">{t('search.tryDifferent')}</p>
             </div>
          ) : showSuggestions && !searchTerm ? (
            <div className="py-2">
                             {/* Recent Searches */}
               <div className="px-4 py-2">
                 <h4 className="text-xs font-medium text-secondary-500 uppercase tracking-wide mb-2">{t('search.recentSearches')}</h4>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchTerm(search);
                        performGlobalSearch(search);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-50 rounded-md transition-colors duration-200 flex items-center space-x-2"
                    >
                      <Clock className="w-3 h-3 text-secondary-400" />
                      <span>{search}</span>
                    </button>
                  ))}
                </div>
              </div>

                             {/* Search Suggestions */}
               <div className="px-4 py-2 border-t border-gray-100">
                 <h4 className="text-xs font-medium text-secondary-500 uppercase tracking-wide mb-2">{t('search.quickSearch')}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchTerm(suggestion);
                        performGlobalSearch(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-50 rounded-md transition-colors duration-200 text-left border border-secondary-200 hover:border-secondary-300"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

                     {/* Search Footer */}
           {searchResults.length > 0 && (
             <div className="px-4 py-3 border-t border-secondary-200 bg-secondary-50 rounded-b-lg">
               <div className="flex items-center justify-between text-xs text-secondary-500">
                 <span>{searchResults.length} {t('search.resultsFound')}</span>
                 <span>{t('search.pressEnter')}</span>
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
