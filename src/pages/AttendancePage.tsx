// src/pages/AttendancePage.tsx - COMPLETE FILE (Replace your entire AttendancePage.tsx with this code)
import React, { useEffect, useState, useCallback, useRef } from 'react';
import axiosInstance from '../api/axiosConfig';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

interface User {
  userId: number;
  name: string;
  contactNumber: string;
}

interface AttendanceRecordDisplay {
  attendanceId: number;
  userId: number;
  userName: string;
  checkInTime: string;
}

interface AttendanceResponseDTO {
    attendanceId: number;
    userId: number;
    userName: string;
    checkInTime: string; // ISO String format from backend LocalDateTime
}

interface PaginatedResponse<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
        sort: { empty: boolean; sorted: boolean; unsorted: boolean; };
        offset: number;
        paged: boolean;
        unpaged: boolean;
    };
    last: boolean;
    totalPages: number;
    totalElements: number;
    first: boolean;
    size: number;
    number: number; // Current page number (0-indexed)
    sort: { empty: boolean; sorted: boolean; unsorted: boolean; };
    numberOfElements: number;
    empty: boolean;
}


const AttendancePage: React.FC = () => {
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [loadingCheckIn, setLoadingCheckIn] = useState<boolean>(false);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordDisplay[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map()); // Maps string userId to userName
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(0); // For Attendance Logs pagination
  const [recordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]); // To store users matching search
  const [selectedUser, setSelectedUser] = useState<User | null>(null); // The user chosen from suggestions
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);


  const fetchUsersMap = useCallback(async () => {
    try {
      const response = await axiosInstance.get<PaginatedResponse<User>>('/users', {
        params: {
          page: 0,
          size: 10000, // Large size to get all users for the map
        },
      });
      const map = new Map<string, string>();
      response.data.content.forEach(user => map.set(String(user.userId), user.name));
      setUsersMap(map);
      setErrorLogs(null); // Clear errors related to users map fetch
    } catch (err) {
      console.error("Failed to fetch users for map:", err);
      setErrorLogs("Failed to load user names for attendance records.");
    }
  }, []); // Empty dependency array, runs once on mount

  const fetchAttendanceLogs = useCallback(async () => {
    try {
      setLoadingLogs(true);
      const response = await axiosInstance.get<PaginatedResponse<AttendanceRecordDisplay>>('/attendance/all', {
        params: {
          page: currentPage,
          size: recordsPerPage,
        },
      });
      setAttendanceRecords(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      setErrorLogs(null); // Clear any previous errors
    } catch (err: any) {
      console.error('Failed to fetch attendance logs:', err);
      if (err.response) {
          setErrorLogs(`Failed to load attendance logs: ${err.response.status} - ${err.response.statusText}`);
      } else {
          setErrorLogs('Failed to load attendance logs. Network error or backend down.');
      }
    } finally {
      setLoadingLogs(false);
    }
  }, [currentPage, recordsPerPage]); // Dependencies for re-fetching on page/size change

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchUsersMap(); // Must await this to ensure map is ready
      await fetchAttendanceLogs(); // Then fetch logs, which rely on the map
    };
    loadInitialData();
  }, [fetchUsersMap, fetchAttendanceLogs]); // These are useCallback, so safe dependencies


  const debounce = (func: Function, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const handleSearch = useCallback(debounce(async (query: string) => {
    if (query.trim().length === 0) { // Allow empty query to clear results
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }
    setLoadingSearch(true);
    try {
      const response = await axiosInstance.get<User[]>(`/users/search`, {
        params: { query: query.trim() }, // Send trimmed query to backend
      });
      setSearchResults(response.data);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }, 300), []); // Debounce by 300ms

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedUser(null); // Clear selected user if typing again
    handleSearch(query); // Trigger debounced search
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    // Display includes contact number for clarity
    setSearchQuery(`${user.name} (ID: ${user.userId}, Contact: ${user.contactNumber || 'N/A'})`);
    setSearchResults([]); // Clear search results after selection
    if (searchInputRef.current) {
        searchInputRef.current.focus();
    }
    setCheckInError(null); // Clear any previous check-in errors
  };


  const handleCheckIn = async (memberId: number, memberName: string) => { // Now takes memberId and memberName (from selectedUser)
    setCheckInMessage(null);
    setCheckInError(null);
    setLoadingCheckIn(true);

    try {
      const response = await axiosInstance.post('/attendance/checkin', { userId: memberId.toString() });
      toast.success(`${memberName} has checked in..!!`);

      setSearchQuery(''); // Clear search input
      setSelectedUser(null); // Clear selected user
      setCurrentPage(0); // Go back to the first page of logs to see the new record
    } catch (err: any) {
      console.error('Check-in failed:', err);
      let errorMessage = 'Failed to check in. Please ensure User ID is valid.';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = `Check-in failed: ${err.response.data.message}`;
      } else if (err.response && err.response.status === 404) {
        errorMessage = "Check-in failed: User not found. Please verify the ID.";
      }
      toast.error(errorMessage);
    } finally {
      setLoadingCheckIn(false);
    }
  };

  const handleManualCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) { // If a user is explicitly selected from the dropdown
      handleCheckIn(selectedUser.userId, selectedUser.name);
    } else if (searchQuery.trim()) { // If text is typed but no selection was made, attempt to parse as ID
        try {
            const idAsNumber = parseInt(searchQuery.trim());
            if (!isNaN(idAsNumber) && idAsNumber > 0) { // Check if it's a valid positive number
                handleCheckIn(idAsNumber, `ID: ${idAsNumber}`); // Use ID as name for message
            } else {
                toast.error("Please select a member from the list or enter a valid numeric User ID.");
            }
        } catch (error) { // Catch any parsing errors (shouldn't happen with !isNaN check)
            toast.error("Please select a member from the list or enter a valid numeric User ID.");
        }
    } else { // If nothing is typed and no user is selected
        toast.error("Please select a member or enter a User ID to check in.");
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Attendance System</h1>

      {/* Manual Check-in Form */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8 relative">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Member Check-in Search</h2>
        <form onSubmit={handleManualCheckInSubmit} className="flex flex-col md:flex-row gap-4 items-end">
          {/* NEW: Input and search-related content are now in a flex-grow div */}
          <div className="flex-grow relative">
            <label htmlFor="memberSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Search by Name, User ID, or Contact Number:
            </label>
            <input
              ref={searchInputRef}
              type="text"
              id="memberSearch"
              value={selectedUser ? `${selectedUser.name} (ID: ${selectedUser.userId}, Contact: ${selectedUser.contactNumber || 'N/A'})` : searchQuery}
              onChange={handleSearchInputChange}
              placeholder="e.g., Revanth, 123456, 90593..."
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              autoComplete="off"
            />
            {/* Search Results Dropdown (positioned absolutely below input) */}
            {searchQuery.length > 0 && searchResults.length > 0 && !selectedUser && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto top-full left-0">
                {searchResults.map((user) => (
                  <li
                    key={user.userId}
                    onClick={() => handleSelectUser(user)}
                    className="p-2 cursor-pointer hover:bg-gray-200 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-semibold text-gray-800">{user.name}</span>
                    <span className="text-gray-500 text-sm ml-2"> (ID: {user.userId}, Contact: {user.contactNumber})</span>
                  </li>
                ))}
              </ul>
            )}
            {/* Search Messages (positioned absolutely below input/dropdown) */}
            {/* Ensure these are *outside* the normal flow to not push the button */}
            {searchQuery.length > 0 && searchResults.length === 0 && !loadingSearch && !selectedUser && (
              <p className="absolute text-gray-500 text-sm mt-1 top-full left-0 p-2 w-full">No members found for this search.</p>
            )}
            {loadingSearch && (
              <p className="absolute text-gray-500 text-sm mt-1 top-full left-0 p-2 w-full">Searching... (type more if results are slow)</p>
            )}
            {searchQuery.trim().length === 0 && !loadingSearch && !selectedUser && (
              <p className="absolute text-gray-500 text-sm mt-1 top-full left-0 p-2 w-full">Type at least 1 character to search.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loadingCheckIn || (!selectedUser && (searchQuery.trim().length === 0 || isNaN(parseInt(searchQuery.trim()))))}
            className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out h-10 flex-shrink-0"
          >
            {loadingCheckIn ? 'Checking In...' : 'Check In'}
          </button>
        </form>
        {checkInMessage && <p className="text-green-600 mt-2">{checkInMessage}</p>}
        {checkInError && <p className="text-red-600 mt-2">{checkInError}</p>}
      </div>

      {/* Attendance Logs Table (rest of the page remains the same) */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">Recent Attendance Logs</h2>
      {errorLogs && (
        <p className="text-red-600 text-center mb-4">{errorLogs}</p>
      )}

      {loadingLogs && attendanceRecords.length === 0 && totalElements === 0 ? (
        <p className="text-center text-gray-600">Loading attendance logs...</p>
      ) : (
        <div className="overflow-x-auto">
          {attendanceRecords.length === 0 && totalElements === 0 ? (
            <p className="text-center text-gray-500">No attendance records found.</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Record ID</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Member User ID</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Member Name</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Check-in Time</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.attendanceId} className="border-b hover:bg-gray-50"><td className="py-3 px-4 text-gray-700 text-sm">{record.attendanceId}</td><td className="py-3 px-4 text-gray-700 text-sm">{record.userId}</td><td className="py-3 px-4 text-gray-700">{record.userName || 'Unknown User'}</td><td className="py-3 px-4 text-gray-700">{format(new Date(record.checkInTime), 'yyyy-MM-dd HH:mm:ss')}</td></tr>
                ))}
              </tbody>
            </table>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 p-4 bg-gray-50 rounded-lg shadow-inner">
              <span className="text-gray-700 text-sm">Page {currentPage + 1} of {totalPages} ({totalElements} records total)</span>
              <div className="space-x-2">
                <button
                  onClick={() => setCurrentPage(0)}
                  disabled={currentPage === 0 || loadingLogs}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l-md disabled:opacity-50"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0 || loadingLogs}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1 || loadingLogs}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 disabled:opacity-50"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages - 1)}
                  disabled={currentPage === totalPages - 1 || loadingLogs}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r-md disabled:opacity-50"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendancePage;