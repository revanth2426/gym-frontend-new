// src/pages/MembershipPlansPage.tsx - COMPLETE FILE
import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosConfig';
// format from date-fns is no longer directly used in this page after plan assignments removal

// Define interfaces for data (matches backend DTOs/Entities)
interface MembershipPlan {
  planId: number;
  planName: string;
  price: number;
  durationMonths: number;
  featuresList: string;
}

const MembershipPlansPage: React.FC = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State for Plan CRUD Form
  const [showPlanForm, setShowPlanForm] = useState<boolean>(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planFormData, setPlanFormData] = useState({
    planName: '',
    price: '',
    durationMonths: '',
    featuresList: '',
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<MembershipPlan[]>('/plans');
      setPlans(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch plans:', err);
      setError('Failed to load plans. Please ensure the backend is running and you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPlanFormData({ ...planFormData, [name]: value });
  };

  const handlePlanFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const planPayload = {
        ...planFormData,
        price: parseFloat(planFormData.price),
        durationMonths: parseInt(planFormData.durationMonths),
      };

      if (editingPlan) {
        await axiosInstance.put(`/plans/${editingPlan.planId}`, planPayload);
      } else {
        await axiosInstance.post('/plans', planPayload);
      }
      setShowPlanForm(false);
      setEditingPlan(null);
      setPlanFormData({ planName: '', price: '', durationMonths: '', featuresList: '' });
      fetchPlans(); // Refresh plans list
    } catch (err: any) {
      console.error('Failed to save plan:', err);
      setError('Failed to save plan. Please check your input.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPlanClick = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setPlanFormData({
      planName: plan.planName,
      price: plan.price.toString(),
      durationMonths: plan.durationMonths.toString(),
      featuresList: plan.featuresList,
    });
    setShowPlanForm(true);
  };

  const handleDeletePlanClick = async (planId: number) => {
    if (window.confirm('Are you sure you want to delete this plan?')) {
      try {
        setLoading(true);
        await axiosInstance.delete(`/plans/${planId}`);
        fetchPlans(); // Refresh plans list
      } catch (err: any) {
        console.error('Failed to delete plan:', err);
        setError('Failed to delete plan. Ensure no members are currently assigned to it.'); // More specific error
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Membership Plans Management</h1>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
        <button
          onClick={() => {
            setShowPlanForm(!showPlanForm);
            setEditingPlan(null);
            setPlanFormData({ planName: '', price: '', durationMonths: '', featuresList: '' });
          }}
          className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
        >
          {showPlanForm ? 'Hide Plan Form' : 'Add/Edit Plans'}
        </button>
      </div>

      {error && (
        <p className="text-red-600 text-center mb-4">{error}</p>
      )}

      {showPlanForm && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{editingPlan ? 'Edit Membership Plan' : 'Add New Membership Plan'}</h2>
          <form onSubmit={handlePlanFormSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="planName" className="block text-sm font-medium text-gray-700">Plan Name:<span className="text-red-500">*</span></label>
                <input type="text" id="planName" name="planName" value={planFormData.planName} onChange={handlePlanInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">Price:<span className="text-red-500">*</span></label>
                <input type="number" id="price" name="price" value={planFormData.price} onChange={handlePlanInputChange} required step="0.01"
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="durationMonths" className="block text-sm font-medium text-gray-700">Duration (Months):<span className="text-red-500">*</span></label>
                <input type="number" id="durationMonths" name="durationMonths" value={planFormData.durationMonths} onChange={handlePlanInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="featuresList" className="block text-sm font-medium text-gray-700">Features (comma-separated):</label>
                <textarea id="featuresList" name="featuresList" value={planFormData.featuresList} onChange={handlePlanInputChange}
                          rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="submit" disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                {loading ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Add Plan')}
              </button>
              {editingPlan && (
                <button type="button" onClick={() => { setEditingPlan(null); setShowPlanForm(false); setPlanFormData({planName: '', price: '', durationMonths: '', featuresList: ''}); }}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <h2 className="text-2xl font-semibold text-gray-800 mb-4 mt-8">All Membership Plans</h2>
      {loading && !plans.length ? (
        <p className="text-center text-gray-600">Loading plans...</p>
      ) : (
        <div className="overflow-x-auto">
          {plans.length === 0 ? (
            <p className="text-center text-gray-500">No membership plans found. Add one above!</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Plan ID</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Plan Name</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Price</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Duration (Months)</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Features</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.planId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 text-sm">{plan.planId}</td>
                    <td className="py-3 px-4 text-gray-700">{plan.planName}</td>
                    <td className="py-3 px-4 text-gray-700">₹{plan.price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-700">{plan.durationMonths}</td>
                    <td className="py-3 px-4 text-gray-700 text-sm">{plan.featuresList}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleEditPlanClick(plan)}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md mr-2">Edit</button>
                      <button onClick={() => handleDeletePlanClick(plan.planId)}
                              className="bg-red-500 hover:bg-red-600 text-white text-sm py-1 px-3 rounded-md">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default MembershipPlansPage;