// src/pages/TrainersPage.tsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosConfig'; // Your configured Axios instance

// Define Trainer interface (matches backend Trainer entity structure)
interface Trainer {
  trainerId: number; // Auto-generated in backend
  name: string;
  experience: number;
  specialization: string;
  availability: string;
}

const TrainersPage: React.FC = () => {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState<boolean>(false); // To toggle add/edit form
  const [editingTrainer, setEditingTrainer] = useState<Trainer | null>(null); // Trainer currently being edited

  // Form state for new/editing trainer
  const [formData, setFormData] = useState({
    name: '',
    experience: '', // Keep as string for input field
    specialization: '',
    availability: '',
  });

  // Fetch trainers on component mount and when dependencies change
  useEffect(() => {
    fetchTrainers();
  }, []);

  const fetchTrainers = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<Trainer[]>('/trainers');
      setTrainers(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch trainers:', err);
      setError('Failed to load trainers. Please ensure the backend is running and you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trainerPayload = {
        ...formData,
        experience: parseInt(formData.experience), // Convert experience to number
      };

      if (editingTrainer) {
        // Update existing trainer
        await axiosInstance.put(`/trainers/${editingTrainer.trainerId}`, trainerPayload);
      } else {
        // Add new trainer
        await axiosInstance.post('/trainers', trainerPayload);
      }
      setShowForm(false);
      setEditingTrainer(null);
      setFormData({ name: '', experience: '', specialization: '', availability: '' }); // Reset form
      fetchTrainers(); // Refresh list
    } catch (err: any) {
      console.error('Failed to save trainer:', err);
      setError('Failed to save trainer. Please check your input.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (trainer: Trainer) => {
    setEditingTrainer(trainer);
    setFormData({
      name: trainer.name,
      experience: trainer.experience.toString(), // Convert number to string for input
      specialization: trainer.specialization,
      availability: trainer.availability,
    });
    setShowForm(true);
  };

  const handleDeleteClick = async (trainerId: number) => {
    if (window.confirm('Are you sure you want to delete this trainer?')) {
      try {
        setLoading(true);
        await axiosInstance.delete(`/trainers/${trainerId}`);
        fetchTrainers();
      } catch (err: any) {
        console.error('Failed to delete trainer:', err);
        setError('Failed to delete trainer.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Trainers Management</h1>

      <button
        onClick={() => {
          setShowForm(!showForm);
          setEditingTrainer(null);
          setFormData({ name: '', experience: '', specialization: '', availability: '' });
        }}
        className="mb-6 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out"
      >
        {showForm ? 'Hide Form' : 'Add New Trainer'}
      </button>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{editingTrainer ? 'Edit Trainer' : 'Add New Trainer'}</h2>
          <form onSubmit={handleFormSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name:</label>
                <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700">Experience (Years):</label>
                <input type="number" id="experience" name="experience" value={formData.experience} onChange={handleInputChange} required
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="specialization" className="block text-sm font-medium text-gray-700">Specialization:</label>
                <input type="text" id="specialization" name="specialization" value={formData.specialization} onChange={handleInputChange}
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
              <div>
                <label htmlFor="availability" className="block text-sm font-medium text-gray-700">Availability:</label>
                <input type="text" id="availability" name="availability" value={formData.availability} onChange={handleInputChange}
                       className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button type="submit" disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                {loading ? 'Saving...' : (editingTrainer ? 'Update Trainer' : 'Add Trainer')}
              </button>
              {editingTrainer && (
                <button type="button" onClick={() => { setEditingTrainer(null); setShowForm(false); setFormData({name: '', experience: '', specialization: '', availability: ''}); }}
                        className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200 ease-in-out">
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {error && (
        <p className="text-red-600 text-center mb-4">{error}</p>
      )}

      {loading && !trainers.length ? (
        <p className="text-center text-gray-600">Loading trainers...</p>
      ) : (
        <div className="overflow-x-auto">
          {trainers.length === 0 ? (
            <p className="text-center text-gray-500">No trainers found. Add one above!</p>
          ) : (
            <table className="min-w-full bg-white border border-gray-200 shadow-sm rounded-lg">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">ID</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Name</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Experience</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Specialization</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Availability</th>
                  <th className="py-3 px-4 border-b text-left text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trainers.map((trainer) => (
                  <tr key={trainer.trainerId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-700 text-sm">{trainer.trainerId}</td>
                    <td className="py-3 px-4 text-gray-700">{trainer.name}</td>
                    <td className="py-3 px-4 text-gray-700">{trainer.experience}</td>
                    <td className="py-3 px-4 text-gray-700">{trainer.specialization}</td>
                    <td className="py-3 px-4 text-gray-700">{trainer.availability}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => handleEditClick(trainer)}
                              className="bg-blue-500 hover:bg-blue-600 text-white text-sm py-1 px-3 rounded-md mr-2">Edit</button>
                      <button onClick={() => handleDeleteClick(trainer.trainerId)}
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

export default TrainersPage;