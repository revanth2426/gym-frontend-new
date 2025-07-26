// src/pages/AttendancePage.tsx - COMPLETE FILE
import React, { useEffect, useState, useCallback, useRef } from 'react';
import axiosInstance from '../api/axiosConfig';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import QrCodeScanner from '../components/QrCodeScanner';

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
  checkOutTime?: string;
  timeSpentMinutes?: number;
}

interface AttendanceResponseDTO {
    attendanceId: number;
    userId: number;
    userName: string;
    checkInTime: string;
    checkOutTime?: string;
    timeSpentMinutes?: number;
}

interface ErrorResponseDTO { // NEW INTERFACE for consistent backend errors
  message: string;
  status: number;
  timestamp: number;
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
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map());
  const [loadingLogs, setLoadingLogs] = useState<boolean>(true);
  const [errorLogs, setErrorLogs] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [todayAttendanceStatus, setTodayAttendanceStatus] = useState<AttendanceResponseDTO | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(false);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  const [loadingCheckoutAll, setLoadingCheckoutAll] = useState<boolean>(false);

  // States for QR Scanner integration
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [qrScanError, setQrScanError] = useState<string | null>(null);


  const fetchUsersMap = useCallback(async () => {
    try {
      const response = await axiosInstance.get<PaginatedResponse<User>>('/users', {
        params: {
          page: 0,
          size: 10000,
        },
      });
      const map = new Map<string, string>();
      response.data.content.forEach(user => map.set(String(user.userId), user.name));
      setUsersMap(map);
      setErrorLogs(null);
    } catch (err) {
      console.error("Failed to fetch users for map:", err);
      setErrorLogs("Failed to load user names for attendance records.");
    }
  }, []);

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
      setErrorLogs(null);
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
  }, [currentPage, recordsPerPage]);

  useEffect(() => {
    const fetchStatus = async () => {
      if (selectedUser) {
        setLoadingStatus(true);
        try {
          const response = await axiosInstance.get<AttendanceResponseDTO>(`/attendance/status/user/${selectedUser.userId}`);
          setTodayAttendanceStatus(response.data);
        } catch (err: any) {
          if (err.response && err.response.status === 404) {
            setTodayAttendanceStatus(null);
          } else {
            console.error("Failed to fetch today's attendance status:", err);
            toast.error("Failed to fetch attendance status for selected user.");
            setTodayAttendanceStatus(null);
          }
        } finally {
          setLoadingStatus(false);
        }
      } else {
        setTodayAttendanceStatus(null);
      }
    };
    fetchStatus();
  }, [selectedUser]);

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchUsersMap();
      await fetchAttendanceLogs();
    };
    loadInitialData();
  }, [fetchUsersMap, fetchAttendanceLogs]);

  const debounce = (func: Function, delay: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const handleSearch = useCallback(debounce(async (query: string) => {
    if (query.trim().length === 0) {
      setSearchResults([]);
      setLoadingSearch(false);
      return;
    }
    setLoadingSearch(true);
    try {
      const response = await axiosInstance.get<User[]>(`/dashboard/users/search`, {
        params: { query: query.trim() },
      });
      setSearchResults(response.data);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }, 300), []);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setSelectedUser(null);
    handleSearch(query);
  };

  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setSearchQuery(`${user.name} (ID: ${user.userId}, Contact: ${user.contactNumber || 'N/A'})`);
    setSearchResults([]);
    if (searchInputRef.current) {
        searchInputRef.current.focus();
    }
    setCheckInError(null);
  };

  const handleCheckInOrOut = useCallback(async (targetUserId: number, targetUserName?: string) => {
    setCheckInMessage(null);
    setCheckInError(null);
    setLoadingCheckIn(true);

    let userNameForToast = targetUserName;

    try {
      if (!userNameForToast) {
        const userDetailsResponse = await axiosInstance.get<User[]>(`/dashboard/users/search`, { params: { query: targetUserId.toString() } });
        if (userDetailsResponse.data.length > 0) {
          userNameForToast = userDetailsResponse.data[0].name;
        } else {
          userNameForToast = `User ID: ${targetUserId}`;
        }
      }

      const response = await axiosInstance.post<AttendanceResponseDTO>('/attendance/record', { userId: targetUserId });

      if (selectedUser && selectedUser.userId === targetUserId) {
        setTodayAttendanceStatus(response.data);
      }
      
      if (response.data.checkOutTime) {
        toast.success(`${userNameForToast || 'Unknown User'} has checked out!`);
      } else {
        toast.success(`${userNameForToast || 'Unknown User'} has checked in!`);
      }

      if (selectedUser && selectedUser.userId === targetUserId) {
        setSearchQuery('');
        setSelectedUser(null);
      }
      setCurrentPage(0);
      fetchAttendanceLogs();
      setQrScanError(null); // Clear any scanner-related errors on successful operation
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    catch (err: any) {
      console.error('Check-in/out failed:', err);
      let errorMessage = `Failed to process attendance for ${userNameForToast || `ID: ${targetUserId}`}.`;
      
      // MODIFIED: Extract specific message from backend's ErrorResponseDTO if available
      // This will now correctly display messages like "User has already checked in and checked out today at {time}."
      if (err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data) {
        errorMessage = (err.response.data as ErrorResponseDTO).message; // Directly use the message from the DTO
      } else if (err.response && err.response.data && typeof err.response.data === 'string') {
          // Fallback if backend sends plain string error (less ideal but possible)
          errorMessage = err.response.data;
      } else if (err.response && err.response.status === 404) {
          errorMessage = "Attendance failed: User not found. Please verify the ID.";
      }
      toast.error(errorMessage);
      setQrScanError(errorMessage); // Pass error to scanner component to display
    } finally {
      setLoadingCheckIn(false);
    }
  }, [selectedUser, fetchAttendanceLogs]);

  const handleManualCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
        handleCheckInOrOut(selectedUser.userId, selectedUser.name);
    } else {
        toast.error("Please select a member via search or scan a QR code.");
    }
  };

  const formatTimeSpent = (minutes?: number) => {
    if (minutes === undefined || minutes === null) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hr ${remainingMinutes} min`;
  };

  const handleDeleteClick = async (attendanceId: number) => {
    if (window.confirm(`Are you sure you want to delete attendance record ID: ${attendanceId}?`)) {
      setLoadingLogs(true);
      try {
        await axiosInstance.delete(`/attendance/${attendanceId}`);
        toast.success(`Attendance record ${attendanceId} deleted successfully!`);

        setAttendanceRecords(prevRecords => prevRecords.filter(record => record.attendanceId !== attendanceId));
        setTotalElements(prev => prev - 1);
        setTotalPages(Math.ceil((totalElements - 1) / recordsPerPage));

        if (attendanceRecords.length === 1 && currentPage > 0) {
          setCurrentPage(prev => prev - 1);
        } else {
          fetchAttendanceLogs();
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catch (err: any) {
        console.error('Failed to delete attendance record:', err);
        toast.error('Failed to delete attendance record.');
        fetchAttendanceLogs();
      } finally {
        setLoadingLogs(false);
      }
    }
  };

  const handleGenerateSummaries = async () => {
    if (window.confirm("This will generate/update monthly and yearly attendance summaries. Continue?")) {
      setLoadingSummary(true);
      try {
        const response = await axiosInstance.post('/attendance/generate-summaries');
        toast.success(response.data || "Summaries generated successfully!");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catch (err: any) {
        console.error("Failed to generate summaries:", err);
        toast.error(err.response?.data || "Failed to generate summaries.");
      } finally {
        setLoadingSummary(false);
      }
    }
  };

  const handleCheckoutAll = async () => {
    if (window.confirm("Are you sure you want to check out ALL currently checked-in users for today?")) {
      setLoadingCheckoutAll(true);
      try {
        const response = await axiosInstance.post('/attendance/checkout-all');
        toast.success(response.data || "All active users checked out!");
        fetchAttendanceLogs();
        if (selectedUser) {
            // Re-fetch status for the selected user if they were affected
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      catch (err: any) {
        console.error("Failed to check out all users:", err);
        toast.error(err.response?.data || "Failed to check out all users.");
      } finally {
        setLoadingCheckoutAll(false);
      }
    }
  };

  // NEW: Handlers for QrCodeScanner integration
  const handleQrScanSuccess = useCallback(async (decodedText: string) => {
    // This function receives the scanned user ID (e.g., "311893")
    const userIdNum = parseInt(decodedText);
    if (isNaN(userIdNum)) {
      toast.error(`Invalid QR Code: Scanned value '${decodedText}' is not a valid User ID.`); // More specific error
      setQrScanError('Invalid QR Code: Non-numeric ID.');
      return;
    }

    // Try to get user details to display name in toast, then call check-in/out
    try {
      const response = await axiosInstance.get<User[]>(`/dashboard/users/search`, { params: { query: decodedText } });
      if (response.data.length > 0) {
        const user = response.data[0];
        // Trigger check-in/out for the scanned user
        await handleCheckInOrOut(user.userId, user.name);
        setQrScanError(null); // Clear any previous scanner errors on successful operation
      } else {
        toast.error(`Invalid QR Code: User ID '${decodedText}' not found in system.`); // More specific error
        setQrScanError('Invalid QR Code: User not found.');
      }
    } catch (error) {
      console.error("Error processing scanned user:", error);
      toast.error("An error occurred while processing the scanned QR Code. Please try again.");
      setQrScanError('Processing error.');
    }
  }, [handleCheckInOrOut]); // Dependency on handleCheckInOrOut

  const handleQrScanError = useCallback((errorMessage: string) => {
    // This function receives errors that QrCodeScanner component filtered as critical
    setQrScanError(errorMessage);
  }, []);

  // Headers configuration for Attendance Logs table
  const headers = [
    { label: 'Record ID', width: 'w-[90px]' },
    { label: 'Member User ID', width: 'w-[120px]' },
    { label: 'Member Name', width: 'w-[140px]' },
    { label: 'Check-in Time', width: 'w-[180px]' },
    { label: 'Check-out Time', width: 'w-[180px]' },
    { label: 'Time Spent', width: 'w-[120px]' },
    { label: 'Actions', width: 'w-[180px]' }, // Sufficient width for two small buttons with spacing
  ];


  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Attendance System</h1>

      {/* Manual Check-in/Check-out Form */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8 relative">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Member Check-in / Check-out</h2>
        <form onSubmit={handleManualCheckInSubmit} className="flex flex-col md:flex-row gap-4 items-end">
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
              onFocus={() => {
                if (selectedUser) {
                    setSelectedUser(null);
                    setSearchQuery('');
                }
                setSearchResults([]);
              }}
              onBlur={() => setTimeout(() => setSearchResults([]), 100)}
              placeholder="e.g., Revanth, 123456, 90593..."
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              autoComplete="off"
            />
            {/* Search Results Dropdown */}
            {searchQuery.length > 0 && searchResults.length > 0 && !loadingSearch && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto top-full left-0">
                {searchResults.map((user) => (
                  <li
                    key={user.userId}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectUser(user)}
                    className="p-2 cursor-pointer hover:bg-gray-200 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-semibold text-gray-800">{user.name}</span>
                    <span className="text-gray-500 text-sm ml-2"> (ID: {user.userId}, Contact: ${user.contactNumber})</span>
                  </li>
                ))}
              </ul>
            )}
            {/* Search Messages */}
            {searchQuery.trim().length > 0 && !loadingSearch && searchResults.length === 0 && !selectedUser && (
              <p className="absolute text-gray-500 text-sm mt-1 top-full left-0 p-2 w-full">No members found for "{searchQuery}".</p>
            )}
            {loadingSearch && (
              <p className="absolute text-gray-500 text-sm mt-1 top-full left-0 p-2 w-full">Searching for "{searchQuery}"...</p>
            )}
            {searchQuery.trim().length === 0 && !loadingSearch && !selectedUser && (
              <p className="absolute text-gray-500 text-sm mt-1 top-full left-0 p-2 w-full">Type a name, User ID, or Contact Number to search.</p>
            )}
          </div>

          {/* Conditional Check-in/Check-out button */}
          <button
            type="submit"
            disabled={!selectedUser || loadingCheckIn || loadingStatus}
            className={`w-full md:w-auto font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out h-10 flex-shrink-0
              ${!selectedUser ? 'bg-gray-400 cursor-not-allowed' :
                 loadingCheckIn || loadingStatus ? 'bg-blue-300' :
                 (todayAttendanceStatus && todayAttendanceStatus.checkOutTime === null ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600')
               } text-white`}
          >
            {loadingCheckIn || loadingStatus ? 'Loading...' : (
              !selectedUser ? 'Select Member' :
              (todayAttendanceStatus && todayAttendanceStatus.checkOutTime === null ? 'Check Out' : 'Check In')
            )}
          </button>
        </form>
        {checkInMessage && <p className="text-green-600 mt-2">{checkInMessage}</p>}
        {checkInError && <p className="text-red-600 mt-2">{checkInError}</p>}

        {/* Display current day's status */}
        {selectedUser && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md text-blue-800 text-sm flex items-center gap-4">
            {loadingStatus ? (
              <span>Loading daily status...</span>
            ) : todayAttendanceStatus ? (
              <>
                <span className="font-semibold">Today's Status:</span>
                <span>
                  Check-in: {format(new Date(todayAttendanceStatus.checkInTime), 'p')}
                  {todayAttendanceStatus.checkOutTime && ` | Check-out: ${format(new Date(todayAttendanceStatus.checkOutTime), 'p')}`}
                  {todayAttendanceStatus.timeSpentMinutes !== null && todayAttendanceStatus.timeSpentMinutes !== undefined &&
                    ` | Time Spent: ${formatTimeSpent(todayAttendanceStatus.timeSpentMinutes)}`
                  }
                </span>
                {todayAttendanceStatus.checkOutTime ? (
                  <span className="ml-auto text-green-600 font-semibold">Completed</span>
                ) : (
                  <span className="ml-auto text-red-600 font-semibold">Active Check-in</span>
                )}
              </>
            ) : (
              <span className="font-semibold">No attendance recorded today.</span>
            )}
          </div>
        )}
      </div>

      {/* NEW: QR Scanner Toggle Switch */}
      <div className="mb-6 mt-6 flex justify-center items-center gap-4">
        <label htmlFor="qr-scanner-toggle" className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              id="qr-scanner-toggle"
              className="sr-only"
              checked={showQrScanner}
              onChange={() => setShowQrScanner(!showQrScanner)}
            />
            <div className={`block w-14 h-8 rounded-full transition-colors duration-200 ${showQrScanner ? 'bg-indigo-600' : 'bg-gray-400'}`}></div>
            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-200 ${showQrScanner ? 'translate-x-full' : 'translate-x-0'}`}></div>
          </div>
          <div className="ml-3 text-gray-700 font-medium">
            {showQrScanner ? 'QR Scanner ON' : 'QR Scanner OFF'}
          </div>
        </label>
      </div>

      {/* NEW: QR Scanner Component (conditionally rendered) */}
      {showQrScanner && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8 mt-4">
          <QrCodeScanner
            onScanSuccess={handleQrScanSuccess}
            onScanError={handleQrScanError}
            qrCodeError={qrScanError} // Pass specific QR scan error to scanner component
            showScanner={showQrScanner} // Pass current visibility state to scanner
          />
        </div>
      )}


      {/* Action Buttons: Generate Summaries and Checkout All */}
      <div className="flex flex-col md:flex-row justify-center gap-4 mb-6 mt-6">
        <button
          onClick={handleGenerateSummaries}
          disabled={loadingSummary}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
        >
          {loadingSummary ? 'Generating Summaries...' : 'Generate Monthly/Yearly Summaries'}
        </button>

        {/* Checkout All Button */}
        <button
          onClick={handleCheckoutAll}
          disabled={loadingCheckoutAll}
          className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
        >
          {loadingCheckoutAll ? 'Checking Out All...' : 'Check Out All Active Users'}
        </button>
      </div>

      {/* Attendance Logs Table */}
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
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg table-fixed">
              <thead className="w-full">
                <tr className="bg-gray-100">
                  {headers.map((header) => (
                    <th key={header.label} className={`py-3 px-4 border-b text-left text-gray-600 font-semibold ${header.width}`}>
                      {header.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record) => (
                  <tr key={record.attendanceId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 text-sm w-[90px]">{record.attendanceId}</td>
                    <td className="py-3 px-4 text-gray-700 text-sm w-[120px]">{record.userId}</td>
                    <td className="py-3 px-4 text-gray-700 w-[140px]">{record.userName || 'Unknown User'}</td>
                    <td className="py-3 px-4 text-gray-700 w-[180px]">{format(new Date(record.checkInTime), 'yyyy-MM-dd HH:mm:ss')}</td>
                    <td className="py-3 px-4 text-gray-700 w-[180px]">
                      {record.checkOutTime ? format(new Date(record.checkOutTime), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-gray-700 w-[120px]">
                      {formatTimeSpent(record.timeSpentMinutes)}
                    </td>
                    <td className="py-3 px-4 w-[180px]">
                      <div className="flex items-center space-x-2 justify-start">
                        {record.checkInTime && !record.checkOutTime ? (
                          <button
                            onClick={() => handleCheckInOrOut(record.userId, record.userName)}
                            className="bg-orange-500 hover:bg-orange-600 text-white text-sm py-1 px-2 rounded-md whitespace-nowrap min-w-[70px] flex-shrink-0"
                          >
                            Check Out
                          </button>
                        ) : null
                        }
                        <button
                          onClick={() => handleDeleteClick(record.attendanceId)}
                          className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-2 rounded-md whitespace-nowrap min-w-[70px] flex-shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
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