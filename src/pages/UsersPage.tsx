// src/pages/UsersPage.tsx - COMPLETE & FINAL VERSION for User Plan Management
import React, { useEffect, useState, useCallback } from 'react'; // Ensure useCallback is imported
import axiosInstance from '../api/axiosConfig';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

// UPDATED: User interface to match UserResponseDTO from backend
interface UserDisplay {
  userId: number;
  name: string;
  age: number;
  gender: string;
  contactNumber: string;
  membershipStatus: string;
  joiningDate: string;
  currentPlanName: string; // Still needed for consistency, though 'assignedPlans' is primary
  assignedPlans: PlanDetailsDisplay[]; // NEW: List of all assigned plans
}

interface MembershipPlan {
  planId: number;
  planName: string;
  price: number;
  durationMonths: number;
  featuresList: string;
}

// NEW INTERFACE: Matches PlanAssignmentDetailDTO from backend
interface PlanDetailsDisplay {
    assignmentId: number;
    planName: string;
    startDate: string;
    endDate: string;
    planId: number;
    isActive: boolean; // Indicates if this specific assignment is active
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
    number: number; // Current page number (0-indexed)
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
  const [loading, setLoading] = useState<boolean>(true); // Overall loading state for table
  const [error, setError] = useState<string | null>(null); // General error for page
  const [showForm, setShowForm] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserDisplay | null>(null);

  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true); // Loading state for plans dropdown
  const [planError, setPlanError] = useState<string | null>(null); // Error for plans dropdown

  // Pagination states
  const [currentPage, setCurrentPage] = useState(0);
  const [recordsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);


  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    contactNumber: '',
    membershipStatus: 'Inactive',
    joiningDate: format(new Date(), 'yyyy-MM-dd'),
    planId: '',
    userId: '',
  });

  // MODIFIED: fetchUsers wrapped in useCallback and called in its own useEffect
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<PaginatedResponse<UserDisplay>>('/users', {
        params: {
          page: currentPage,
          size: recordsPerPage,
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
  }, [currentPage, recordsPerPage]); // Dependencies for useCallback

  // NEW: Separate useEffect just for fetching users when currentPage/recordsPerPage changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Dependency is the useCallback-wrapped fetchUsers


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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous general errors
    setLoading(true); // Show loading feedback

    try {
      const userPayload: any = {
        ...formData,
        age: parseInt(formData.age),
        joiningDate: formData.joiningDate,
        membershipStatus: formData.membershipStatus,
      };

      if (formData.planId) {
        userPayload.planId = parseInt(formData.planId);
      } else {
        userPayload.planId = null;
      }

      if (editingUser) {
        userPayload.userId = editingUser.userId;
        const response = await axiosInstance.put<UserDisplay>(`/users/${editingUser.userId}`, userPayload);
        const updatedUser = response.data; // Get updated user data from API

        // OPTIMISTIC UPDATE FOR EDIT: Update the specific user in the current list immediately
        setUsers(prevUsers => prevUsers.map(u => u.userId === updatedUser.userId ? updatedUser : u));
        toast.success(`Member ${updatedUser.name} updated successfully!`);

      } else {
        // For new user, userId is null in formData, backend generates
        const response = await axiosInstance.post<UserDisplay>('/users', userPayload);
        const newUser = response.data; // Get new user data from API

        // For ADD, reset to first page, which triggers fetchUsers from useEffect
        setCurrentPage(0); // This ensures new item appears on first page
        // If on page 0 and list is already full, need to trigger fetch explicitly
        if (currentPage === 0 && users.length < recordsPerPage) {
            // If on first page and room for more, optimistically add
            setUsers(prevUsers => [newUser, ...prevUsers].slice(0, recordsPerPage));
            setTotalElements(prev => prev + 1); // Update total count
            setTotalPages(Math.ceil((totalElements + 1) / recordsPerPage)); // Recalculate total pages
        } else {
            // If not on page 0, or page 0 is full, just reset to page 0 to see it
            setCurrentPage(0); // This will trigger fetchUsers via useEffect
        }
        toast.success(`Member ${newUser.name} added successfully!`);
      }

      setShowForm(false); // Hide form
      setEditingUser(null); // Clear editing state
      setFormData({ // Reset form data
        name: '', age: '', gender: '', contactNumber: '', membershipStatus: 'Inactive', joiningDate: format(new Date(), 'yyyy-MM-dd'), planId: '', userId: ''
      });

    } /* ... */ finally {
      setLoading(false); // Always reset loading state
      fetchUsers(); // FINAL FALLBACK: Always trigger a fetch to ensure data consistency after any save attempt
    }
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
      // When editing, pre-select the current active plan if available, else empty
      planId: user.assignedPlans.find(p => p.isActive)?.planId?.toString() || '',
      userId: user.userId.toString(),
    });
    setShowForm(true);
  };

  const handleDeleteClick = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const originalUsers = users; // Save current state for rollback
      const originalTotalElements = totalElements;
      const originalTotalPages = totalPages;

      // OPTIMISTIC UPDATE FOR DELETE: Immediately remove from UI
      setUsers(prevUsers => prevUsers.filter(u => u.userId !== userId));
      setTotalElements(prev => prev - 1); // Decrement total count
      setTotalPages(Math.ceil((originalTotalElements - 1) / recordsPerPage)); // Recalculate total pages

      setLoading(true); // Show overall loading indicator

      try {
        await axiosInstance.delete(`/users/${userId}`);
        toast.success(`Member ${userId} deleted successfully!`);

        // After deletion, if current page became empty and it's not page 0, go to previous page
        if (users.length === 1 && currentPage > 0) { // If deleting last item on current page and not on page 0
            setCurrentPage(prev => prev - 1); // Go back a page
        } else {
            fetchUsers(); // Else, re-fetch current page to account for new pagination (e.g., item shifted up)
        }

      } catch (err: any) {
        console.error('Failed to delete user:', err);
        setError('Failed to delete user.');
        toast.error('Failed to delete member.');
        setUsers(originalUsers); // Rollback on error
        setTotalElements(originalTotalElements);
        setTotalPages(originalTotalPages);
      } finally {
        setLoading(false); // Hide loading indicator
      }
    }
  };

  // NEW: handleCheckInClick function
  const handleCheckInClick = async (userId: number, userName: string) => {
    try {
      const response = await axiosInstance.post('/attendance/checkin', { userId: userId.toString() });
      const checkedInUserName = response.data.userName;
      toast.success(`${checkedInUserName} has checked in..!!`);
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

  // NEW: handleDeletePlanAssignmentClick function (for the X button on plan pills)
  const handleDeletePlanAssignmentClick = async (userId: number, userName: string, assignmentId: number, planName: string) => {
    if (window.confirm(`Are you sure you want to delete the plan "${planName}" for ${userName}? This cannot be undone.`)) {
      // OPTIMISTIC UPDATE: Temporarily remove this specific assignment from the user's local plan list
      setUsers(prevUsers => prevUsers.map(user =>
        user.userId === userId
          ? { ...user, assignedPlans: user.assignedPlans.filter(pa => pa.assignmentId !== assignmentId) }
          : user
      ));
      setLoading(true); // Show overall loading indicator for the action

      try {
        // Call the new backend endpoint to delete the specific plan assignment
        // Example: DELETE /api/plan-assignments/{assignmentId}
        await axiosInstance.delete(`/plan-assignments/${assignmentId}`);
        toast.success(`Plan "${planName}" removed for ${userName}.`);
        // After successful deletion, re-fetch users to ensure data consistency and membership status recalculation
        fetchUsers();
      } catch (err: any) {
        console.error(`Failed to delete plan assignment ${assignmentId}:`, err);
        toast.error(`Failed to remove plan "${planName}" for ${userName}.`);
        // ROLLBACK OPTIMISTIC UPDATE if error
        fetchUsers(); // Re-fetch to revert UI to correct state from DB on error
      } finally {
        setLoading(false); // Hide loading indicator
      }
    }
  };


  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Members Management</h1>

      <button
        onClick={() => {
          setShowForm(!showForm);
          setEditingUser(null);
          setFormData({
            name: '', age: '', gender: '', contactNumber: '', membershipStatus: 'Inactive', joiningDate: format(new Date(), 'yyyy-MM-dd'), planId: '', userId: ''
          });
          setError(null);
        }}
        className="mb-6 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
      >
        {showForm ? 'Hide Form' : 'Add New Member'}
      </button>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{editingUser ? 'Edit Member (ID: ' + editingUser.userId + ')' : 'Add New Member'}</h2>
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
                <label htmlFor="planId" className="block text-sm font-medium text-gray-700">Assign Membership Plan:<span className="text-red-500">*</span></label>
                <select id="planId" name="planId" value={formData.planId} onChange={handleInputChange} required
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
                <button type="button" onClick={() => { setEditingUser(null); setShowForm(false); setFormData({name: '', age: '', gender: '', contactNumber: '', membershipStatus: 'Inactive', joiningDate: format(new Date(), 'yyyy-MM-dd'), planId: '', userId: ''}); setError(null); }}
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

      {/* NEW CONDITIONAL RENDERING: Only show table if showForm is false */}
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
                    <tr className="bg-gray-100">
                      <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">User ID</th>
                      <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Name</th>
                      <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Age</th>
                      <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Gender</th>
                      <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Contact</th>
                      <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Status</th>
                      <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Joining Date</th>
                      <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Member Plan(s)</th> {/* MODIFIED HEADER */}
                      <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.userId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700 text-sm">{user.userId}</td>
                        <td className="py-3 px-4 text-gray-700">{user.name}</td>
                        <td className="py-3 px-4 text-gray-700">{user.age}</td>
                        <td className="py-3 px-4 text-gray-700">{user.gender}</td>
                        <td className="py-3 px-4 text-gray-700">{user.contactNumber}</td>
                        <td className={`py-3 px-4 font-semibold ${user.membershipStatus === 'Active' ? 'text-green-600' : user.membershipStatus === 'Expired' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {user.membershipStatus}
                        </td>
                        <td className="py-3 px-4 text-gray-700">{user.joiningDate}</td>
                        {/* NEW/MODIFIED CELL: Display all plans as pills */}
                        <td className="py-3 px-4 text-gray-700">
                            {user.assignedPlans && user.assignedPlans.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                    {user.assignedPlans.map(plan => (
                                        <span key={plan.assignmentId}
                                              className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${plan.isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {plan.planName} ({format(new Date(plan.startDate), 'MMM yy')})
                                            <button
                                                onClick={() => handleDeletePlanAssignmentClick(user.userId, user.name, plan.assignmentId, plan.planName)}
                                                className="ml-1 -mr-0.5 h-3 w-3 inline-flex items-center justify-center rounded-full bg-transparent text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                                            >
                                                <span className="sr-only">Remove {plan.planName}</span>
                                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <span>N/A</span>
                            )}
                        </td>
                        <td className="py-3 px-4">
                          <button onClick={() => handleCheckInClick(user.userId, user.name)}
                                  className="bg-teal-500 hover:bg-teal-600 text-white text-sm py-1 px-3 rounded-md mr-2">Check In</button>
                          <button onClick={() => handleEditClick(user)}
                                  className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md mr-2">Edit</button>
                          <button onClick={() => handleDeleteClick(user.userId)}
                                  className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {/* NEW: Pagination Controls */}
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