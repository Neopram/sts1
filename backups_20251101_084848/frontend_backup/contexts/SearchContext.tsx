import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface SearchResult {
  id: string;
  type: 'document' | 'room' | 'vessel' | 'activity' | 'message';
  title: string;
  description: string;
  url: string;
  relevance: number;
  metadata?: Record<string, any>;
}

interface SearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  performGlobalSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  hasActiveSearch: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

interface SearchProviderProps {
  children: ReactNode;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const hasActiveSearch = searchTerm.length > 0 && searchResults.length > 0;

  const performGlobalSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      // Simulate search delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));

      // Mock search results - in production this would call the backend
      const mockResults: SearchResult[] = [
        {
          id: 'doc-1',
          type: 'document',
          title: 'Safety Certificate',
          description: 'Safety certificate for STS Transfer - Fujairah',
          url: '/documents/safety-certificate',
          relevance: 0.95,
          metadata: { status: 'approved', expiresOn: '2025-12-31' }
        },
        {
          id: 'room-1',
          type: 'room',
          title: 'STS Transfer - Fujairah Anchorage',
          description: 'Ship-to-ship transfer operation in Fujairah',
          url: '/overview',
          relevance: 0.88,
          metadata: { location: 'Fujairah, UAE', status: 'active' }
        },
        {
          id: 'vessel-1',
          type: 'vessel',
          title: 'MV Ocean Star',
          description: 'Bulk carrier vessel participating in STS transfer',
          url: '/approval',
          relevance: 0.82,
          metadata: { type: 'Bulk Carrier', flag: 'Panama' }
        },
        {
          id: 'activity-1',
          type: 'activity',
          title: 'Document Upload: Insurance Certificate',
          description: 'Insurance certificate uploaded by Gibsons',
          url: '/activity',
          relevance: 0.78,
          metadata: { timestamp: '2025-01-15T10:30:00Z', user: 'Gibsons' }
        },
        {
          id: 'message-1',
          type: 'message',
          title: 'Document Review Required',
          description: 'Please review the safety certificate for approval',
          url: '/messages',
          relevance: 0.75,
          metadata: { sender: 'John Doe', timestamp: '2025-01-15T09:15:00Z' }
        }
      ];

      // Filter results based on query
      const filteredResults = mockResults.filter(result => 
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description.toLowerCase().includes(query.toLowerCase()) ||
        (result.metadata && Object.values(result.metadata).some(value => 
          String(value).toLowerCase().includes(query.toLowerCase())
        ))
      );

      // Sort by relevance
      const sortedResults = filteredResults.sort((a, b) => b.relevance - a.relevance);

      setSearchResults(sortedResults);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError('Error performing search. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(null);
  }, []);

  const value: SearchContextType = {
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    searchError,
    performGlobalSearch,
    clearSearch,
    hasActiveSearch
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};
