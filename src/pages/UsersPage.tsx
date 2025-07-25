// src/pages/UsersPage.tsx - COMPLETE & FINAL VERSION for Members Management
import React, { useEffect, useState, useCallback } from 'react';
import axiosInstance from '../api/axiosConfig';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

// UPDATED: User interface to match new UserResponseDTO from backend
interface UserDisplay {
  userId: number;
  name: string;
  age: number;
  gender: string;
  contactNumber: string;
  membershipStatus: string; // This will now be derived on the backend
  joiningDate: string;
  // New fields for the single current plan
  currentPlanId: number | null;
  currentPlanName: string | null;
  currentPlanStartDate: string | null;
  currentPlanEndDate: string | null; // This is the expiry date
  currentPlanIsActive: boolean; // This determines the status color of the pill
}

interface MembershipPlan {
  planId: number;
  planName: string;
  price: number;
  durationMonths: number;
  featuresList: string;
}

interface PaginatedResponse<T> {
    content: T[];
    pageable: {
        pageNumber: number;
        pageSize: number;
        sort: {
            empty: boolean;
            sorted: boolean;
            unsorted: boolean;
        };
        offset: number;
        paged: boolean;
        unpaged: boolean;
    };
    last: boolean;
    totalPages: number;
    totalElements: number;
    first: boolean;
    size: number;
    number: number;
    sort: {
        empty: boolean;
        sorted: boolean;
        unsorted: boolean;
    };
    numberOfElements: number;
    empty: boolean;
}


const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserDisplay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserDisplay | null>(null);

  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);
  const [planError, setPlanError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Sorting state - Default to 'joiningDate' ascending
  const [sortField, setSortField] = useState<string>('joiningDate');
  const [sortDirection, setSortDirection] = useState<string>('asc');

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    contactNumber: '',
    membershipStatus: 'Inactive', // Default for new users without a plan, backend will derive
    joiningDate: format(new Date(), 'yyyy-MM-dd'),
    selectedPlanId: '',
    userId: '',
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<PaginatedResponse<UserDisplay>>('/users', {
        params: {
          page: currentPage,
          size: recordsPerPage,
          sort: `${sortField},${sortDirection}`, // Pass sort parameters
        },
      });
      setUsers(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please ensure the backend is running and you are logged in.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, recordsPerPage, sortField, sortDirection]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const response = await axiosInstance.get<MembershipPlan[]>('/plans');
        setMembershipPlans(response.data);
        setPlanError(null);
      } catch (err: any) {
        console.error('Failed to fetch membership plans:', err);
        setPlanError('Failed to load membership plans for selection.');
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const submitUserData = async (payload: any, userId?: number) => {
    try {
      if (userId) {
        await axiosInstance.put<UserDisplay>(`/users/${userId}`, payload);
        toast.success(`Member ${payload.name || userId} updated successfully!`);
      } else {
        await axiosInstance.post<UserDisplay>('/users', payload);
        toast.success(`Member ${payload.name || payload.userId} added successfully!`);
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({
        name: '', age: '', gender: '', contactNumber: '', membershipStatus: 'Inactive', joiningDate: format(new Date(), 'yyyy-MM-dd'), selectedPlanId: '', userId: ''
      });
      fetchUsers();
    } catch (err: any) {
      console.error('Failed to save user:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
        toast.error(err.response.data.message);
      } else {
        setError('Failed to save member. Please check your input or try again.');
        toast.error('Failed to save member. Please check your input or try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const userPayload: any = {
      ...formData,
      age: parseInt(formData.age),
      joiningDate: formData.joiningDate,
      selectedPlanId: formData.selectedPlanId ? parseInt(formData.selectedPlanId) : null,
    };

    await submitUserData(userPayload, editingUser?.userId);
  };

  const handleEditClick = (user: UserDisplay) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      age: user.age.toString(),
      gender: user.gender,
      contactNumber: user.contactNumber,
      membershipStatus: user.membershipStatus,
      joiningDate: user.joiningDate,
      selectedPlanId: user.currentPlanId ? user.currentPlanId.toString() : '',
      userId: user.userId.toString(),
    });
    setShowForm(true);
  };

  const handleDeleteClick = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setLoading(true);
      try {
        setUsers(prevUsers => prevUsers.filter(u => u.userId !== userId));
        setTotalElements(prev => prev - 1);
        setTotalPages(Math.ceil((totalElements - 1) / recordsPerPage));

        await axiosInstance.delete(`/users/${userId}`);
        toast.success(`Member ${userId} deleted successfully!`);
        if (users.length === 1 && currentPage > 0) {
            setCurrentPage(prev => prev - 1);
        } else {
            fetchUsers();
        }
      } catch (err: any) {
        console.error('Failed to delete user:', err);
        setError('Failed to delete user.');
        toast.error('Failed to delete member.');
        fetchUsers();
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCheckInClick = async (userId: number, userName: string) => {
    try {
      const response = await axiosInstance.post('/attendance/checkin', { userId: userId.toString() });
      toast.success(`${response.data.userName} has checked in..!!`);
    } catch (err: any) {
      console.error('Check-in failed:', err);
      let errorMessage = 'Failed to check in. Please ensure User ID is valid.';
      if (err.response && err.response.data && err.response.data.message) {
        errorMessage = `Check-in failed: ${err.response.data.message}`;
      } else if (err.response && err.response.status === 404) {
        errorMessage = "Check-in failed: User not found. Please verify the ID.";
      }
      toast.error(errorMessage);
    }
  };

  const handleRemoveCurrentPlanClick = async (user: UserDisplay) => {
    if (window.confirm(`Are you sure you want to remove the current plan for ${user.name}? This will make the member inactive.`)) {
      setLoading(true);
      const payload: any = {
        name: user.name, age: user.age, gender: user.gender, contactNumber: user.contactNumber,
        joiningDate: user.joiningDate, membershipStatus: 'Inactive', selectedPlanId: null, userId: user.userId
      };
      await submitUserData(payload, user.userId);
    }
  };

  const handleNotifyClick = (userId: number, userName: string) => {
    toast.info(`Notification sent to ${userName} (ID: ${userId}) about expired membership.`);
  };

  // handleSort function (remains the same)
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc'); // Default to ascending when changing sort field
    }
    setCurrentPage(0);
  };

  // Helper to render sort arrow (remains the same)
  const renderSortArrow = (field: string) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? ' ↑' : ' ↓';
    }
    return null;
  };

  // Definitive list of headers with sortability and width
  const headers = [
    { label: 'User ID', field: 'userId', sortable: true, width: 'w-[80px]' },
    { label: 'Name', field: 'name', sortable: true, width: 'w-[120px]' },
    { label: 'Age', field: 'age', sortable: true, width: 'w-[60px]' },
    { label: 'Gender', field: 'gender', sortable: true, width: 'w-[80px]' },
    { label: 'Contact', field: 'contactNumber', sortable: true, width: 'w-[120px]' },
    { label: 'Joining Date', field: 'joiningDate', sortable: true, width: 'w-[120px]' },
    { label: 'Expiry Date', field: 'currentPlanEndDate', sortable: true, width: 'w-[120px]' },
    { label: 'Status', field: 'membershipStatus', sortable: false, width: 'w-[80px]' }, // Status is NOT sortable
    { label: 'Current Plan', field: 'currentPlanName', sortable: false, width: 'w-[120px]' }, // Current Plan is NOT sortable, adjusted width
    { label: 'Actions', field: '', sortable: false, width: 'w-[180px]' }, // Actions column header, adjusted width further
  ];


  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Members Management</h1>

      <button
        onClick={() => {
          setShowForm(!showForm);
          setEditingUser(null);
          setFormData({
            name: '', age: '', gender: '', contactNumber: '', membershipStatus: 'Inactive', joiningDate: format(new Date(), 'yyyy-MM-dd'), selectedPlanId: '', userId: ''
          });
          setError(null);
        }}
        className="mb-6 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
      >
        {showForm ? 'Hide Form' : 'Add New Member'}
      </button>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{editingUser ? `Edit Member (ID: ${editingUser.userId})` : 'Add New Member'}</h2>
          <form onSubmit={handleFormSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name:<span className="text-red-500">*</span></label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age:<span className="text-red-500">*</span></label>
                <input type="number" id="age" name="age" value={formData.age} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender:<span className="text-red-500">*</span></label>
                <select id="gender" name="gender" value={formData.gender} onChange={handleInputChange} required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number:<span className="text-red-500">*</span></label>
                <input type="text" id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="selectedPlanId" className="block text-sm font-medium text-gray-700">Assign Membership Plan:<span className="text-red-500">*</span></label>
                <select id="selectedPlanId" name="selectedPlanId" value={formData.selectedPlanId} onChange={handleInputChange} required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                  <option value="">-- Select a Plan --</option>
                  {loadingPlans ? (
                    <option value="" disabled>Loading plans...</option>
                  ) : planError ? (
                    <option value="" disabled>Error loading plans</option>
                  ) : (
                    membershipPlans.map(plan => (
                      <option key={plan.planId} value={plan.planId}>{plan.planName} (₹{plan.price} / {plan.durationMonths}mo)</option>
                    ))
                  )}
                </select>
                {planError && <p className="text-red-500 text-xs mt-1">{planError}</p>}
              </div>
              <div>
                <label htmlFor="joiningDate" className="block text-sm font-medium text-gray-700">Joining Date:<span className="text-red-500">*</span></label>
                <input type="date" id="joiningDate" name="joiningDate" value={formData.joiningDate} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              {/* Membership Status dropdown might be redundant if backend handles it based on plan existence. Keep if manual override is needed. */}
              <div>
                <label htmlFor="membershipStatus" className="block text-sm font-medium text-gray-700">Membership Status (Optional):</label>
                <select id="membershipStatus" name="membershipStatus" value={formData.membershipStatus} onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="submit" disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                {loading ? 'Saving...' : (editingUser ? 'Update Member' : 'Add Member')}
              </button>
              {editingUser && (
                <button type="button" onClick={() => { setEditingUser(null); setShowForm(false); setFormData({name: '', age: '', gender: '', contactNumber: '', membershipStatus: 'Inactive', joiningDate: format(new Date(), 'yyyy-MM-dd'), selectedPlanId: '', userId: ''}); setError(null); }}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {error && (
        <p className="text-red-600 bg-red-100 p-3 rounded-md text-center font-medium mb-4 border border-red-300">
          {error}
        </p>
      )}

      {!showForm && (
        <>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">All Members</h2>
          {loading && users.length === 0 && totalElements === 0 ? (
            <p className="text-center text-gray-600">Loading members...</p>
          ) : (
            <div className="overflow-x-auto">
              {users.length === 0 && totalElements === 0 ? (
                <p className="text-center text-gray-500">No members found. Add one above!</p>
              ) : (
                <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
                  <thead>
                    <tr className="bg-gray-100">{/* Fixed: Removed internal whitespace */}
                      {headers.map((header) => ( // Use 'headers' array directly
                        <th
                          key={header.field || header.label} // Use label if field is empty (for Actions)
                          className={`py-3 px-4 border-b text-left text-gray-600 font-semibold ${header.width} ${header.sortable ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                          onClick={() => header.sortable && handleSort(header.field)} // Only call handleSort if sortable
                        >
                          {header.label} {header.sortable && renderSortArrow(header.field)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.userId} className="border-b hover:bg-gray-50">{/* Fixed: Removed internal whitespace */}
                        <td className="py-3 px-4 text-gray-700 text-sm w-[80px]">{user.userId}</td>
                        <td className="py-3 px-4 text-gray-700 w-[120px]">{user.name}</td>
                        <td className="py-3 px-4 text-gray-700 w-[60px]">{user.age}</td>
                        <td className="py-3 px-4 text-gray-700 w-[80px]">{user.gender}</td>
                        <td className="py-3 px-4 text-gray-700 w-[120px]">{user.contactNumber}</td>
                        <td className="py-3 px-4 text-gray-700 w-[120px]">
                            {user.joiningDate ? format(new Date(user.joiningDate), 'MMM dd, yyyy') : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-gray-700 w-[120px]">
                            {user.currentPlanEndDate ? format(new Date(user.currentPlanEndDate), 'MMM dd, yyyy') : 'N/A'}
                        </td>
                        <td className={`py-3 px-4 font-semibold w-[80px] ${user.membershipStatus === 'Active' ? 'text-green-600' : user.membershipStatus === 'Expired' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {user.membershipStatus}
                        </td>
                        <td className="py-3 px-4 text-gray-700 w-[120px]"> {/* Adjusted width for Current Plan data cell */}
                            {user.currentPlanId && user.currentPlanName ? (
                                <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${user.currentPlanIsActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {user.currentPlanName}
                                    {user.currentPlanIsActive && (
                                        <button
                                            onClick={() => handleRemoveCurrentPlanClick(user)}
                                            className="ml-1 -mr-0.5 h-3 w-3 inline-flex items-center justify-center rounded-full bg-transparent text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                        >
                                            <span className="sr-only">Remove Plan</span>
                                            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                    )}
                                </span>
                            ) : (
                                <span>N/A</span>
                            )}
                        </td>
                        <td className="py-3 px-4 flex items-center justify-center space-x-1 w-[180px]"> {/* Adjusted width for Actions, and added justify-center for alignment */}
                          {user.membershipStatus === 'Expired' && (
                            <button
                              onClick={() => handleNotifyClick(user.userId, user.name)}
                              className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-3 rounded-md flex-shrink-0 whitespace-nowrap" /* Adjusted padding for better fit */
                            >
                              Notify
                            </button>
                          )}
                          <button onClick={() => handleCheckInClick(user.userId, user.name)}
                                  className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-3 rounded-md flex-shrink-0 whitespace-nowrap">Check In</button>
                          <button onClick={() => handleEditClick(user)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-md flex-shrink-0">Edit</button>
                          <button onClick={() => handleDeleteClick(user.userId)}
                                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-md flex-shrink-0">Delete</button> {/* Consistent style */}
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
                      disabled={currentPage === 0 || loading}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l-md disabled:opacity-50"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0 || loading}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage === totalPages - 1 || loading}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(totalPages - 1)}
                      disabled={currentPage === totalPages - 1 || loading}
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-r-md disabled:opacity-50"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UsersPage;