import React, { useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router-dom';

/**
 * RoomSelector Component
 * 
 * Allows users to:
 * 1. View their assigned STS operations/rooms
 * 2. Select an operation to work on
 * 3. See status indicators (Active, Scheduled, Completed)
 * 4. Create new operation (if permissions allow)
 */
export const RoomSelector: React.FC = () => {
  const { rooms, currentRoomId, setCurrentRoomId, hasPermission, loading } = useApp();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const currentRoom = rooms.find(r => r.id === currentRoomId);
  
  // Filter rooms based on search
  const filteredRooms = rooms.filter(room =>
    room.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.location.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleSelectRoom = (roomId: string) => {
    setCurrentRoomId(roomId);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  const handleCreateNew = () => {
    navigate('/create-operation');
    setIsOpen(false);
  };
  
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'scheduled':
        return 'Scheduled';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };
  
  if (loading && rooms.length === 0) {
    return (
      <div className="px-3 py-2 rounded-lg bg-gray-100">
        <div className="text-sm text-gray-600">Loading operations...</div>
      </div>
    );
  }
  
  if (rooms.length === 0) {
    return (
      <div className="px-3 py-2 rounded-lg bg-gray-100">
        <div className="text-sm text-gray-600">No operations yet</div>
      </div>
    );
  }
  
  return (
    <div className="relative min-w-max">
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-300 hover:bg-gray-50 transition whitespace-nowrap"
      >
        <div className="text-left text-sm">
          {currentRoom ? (
            <>
              <div className="font-semibold text-gray-900 truncate max-w-xs">
                {currentRoom.title}
              </div>
              <div className="text-xs text-gray-600 truncate max-w-xs">
                {currentRoom.location}
              </div>
            </>
          ) : (
            <div className="font-semibold text-gray-600">Select Operation</div>
          )}
        </div>
        <ChevronDown
          size={18}
          className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {/* Search Box */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search operations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Operations List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredRooms.length > 0 ? (
              filteredRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => handleSelectRoom(room.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition ${
                    currentRoomId === room.id ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        {room.title}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {room.location}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ETA: {new Date(room.sts_eta).toLocaleDateString()}
                      </div>
                    </div>
                    {room.status && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(room.status)}`}>
                        {getStatusLabel(room.status)}
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-600">
                No operations found
              </div>
            )}
          </div>

          {/* Create New Button */}
          {hasPermission('create_operation') && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={handleCreateNew}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
              >
                <Plus size={16} />
                New STS Operation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoomSelector;