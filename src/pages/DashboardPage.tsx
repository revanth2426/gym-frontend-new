// src/pages/DashboardPage.tsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosConfig';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns'; // Make sure date-fns is imported

// Define interfaces for data structures (matches backend DTOs/Entities)
interface DashboardSummary {
  totalActiveMembers: number;
  totalTrainers: number;
}

interface PlanDistribution {
  [planName: string]: number; // e.g., { "Monthly Basic": 10, "Annual Premium": 5 }
}

// For daily attendance data, mapping date string to count
interface DailyAttendance {
  [date: string]: number; // e.g., { "2025-07-20": 5, "2025-07-21": 8 }
}

// UPDATED: Interface for ExpiringMembership from Backend (ExpiringMembershipDTO)
interface ExpiringMembershipDisplay { // Renamed from ExpiringMembership to avoid confusion
  assignmentId: number;
  userName: string; // Now a direct string from DTO
  planName: string; // Now a direct string from DTO
  endDate: string; // Will be a string in ISO format (YYYY-MM-DD)
  userId?: string; // Optional
  planId?: number;  // Optional
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF0054']; // For pie chart colors

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [planDistributionData, setPlanDistributionData] = useState<any[]>([]); // Formatted for Recharts PieChart
  const [attendanceChartData, setAttendanceChartData] = useState<any[]>([]); // Formatted for Recharts LineChart
  // UPDATED: Use the new interface for expiringMemberships state
  const [expiringMemberships, setExpiringMemberships] = useState<ExpiringMembershipDisplay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch Summary Data
        const summaryRes = await axiosInstance.get<DashboardSummary>('/dashboard/summary');
        setSummary(summaryRes.data);

        // Fetch Plan Distribution
        const planDistRes = await axiosInstance.get<PlanDistribution>('/dashboard/plan-distribution');
        // Transform object to array of { name: 'Plan Name', value: count } for PieChart
        const formattedPlanData = Object.entries(planDistRes.data).map(([name, value]) => ({ name, value }));
        setPlanDistributionData(formattedPlanData);

        // Fetch Daily Attendance for last 7 days (adjust range as needed)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 6); // Last 7 days including today

        const formatDateForApi = (date: Date) => format(date, 'yyyy-MM-dd'); // Use date-fns for consistency
        const attendanceRes = await axiosInstance.get<DailyAttendance>(`/dashboard/daily-attendance-chart`, {
          params: {
            startDate: formatDateForApi(startDate),
            endDate: formatDateForApi(endDate),
          },
        });

        // Transform attendance data for LineChart
        // Ensure all dates in range are present, even with 0 attendance
        const dailyDataMap: { [key: string]: number } = {};
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          dailyDataMap[formatDateForApi(d)] = 0; // Initialize with 0
        }
        Object.entries(attendanceRes.data).forEach(([date, count]) => {
          dailyDataMap[date] = count;
        });
        const formattedAttendanceData = Object.entries(dailyDataMap)
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB)) // Sort by date
          .map(([date, count]) => ({ date, count }));
        setAttendanceChartData(formattedAttendanceData);


        // Fetch Expiring Memberships (next 7 days) - now expects ExpiringMembershipDisplay
        const expiringRes = await axiosInstance.get<ExpiringMembershipDisplay[]>('/dashboard/expiring-memberships', {
          params: { days: 7 },
        });
        setExpiringMemberships(expiringRes.data);

      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []); // Empty dependency array means this runs once on mount

  if (loading) {
    return <div className="p-6 text-center text-gray-600">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Error: {error}</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-100 p-6 rounded-lg shadow flex flex-col items-center justify-center">
          <h3 className="text-xl font-semibold text-blue-800">Total Active Members</h3>
          <p className="text-5xl font-extrabold text-blue-900 mt-2">{summary?.totalActiveMembers ?? 0}</p>
        </div>
        <div className="bg-green-100 p-6 rounded-lg shadow flex flex-col items-center justify-center">
          <h3 className="text-xl font-semibold text-green-800">Total Trainers</h3>
          <p className="text-5xl font-extrabold text-green-900 mt-2">{summary?.totalTrainers ?? 0}</p>
        </div>
        <div className="bg-yellow-100 p-6 rounded-lg shadow flex flex-col items-center justify-center">
          <h3 className="text-xl font-semibold text-yellow-800">Memberships Expiring (7 Days)</h3>
          <p className="text-5xl font-extrabold text-yellow-900 mt-2">{expiringMemberships.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Daily Attendance Last 7 Days</h3>
          {attendanceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={attendanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8 }} name="Check-ins" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center">No attendance data for the last 7 days.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Membership Plan Distribution</h3>
          {planDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={planDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                >
                  {planDistributionData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center">No plan distribution data available.</p>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Memberships Expiring Soon</h3>
        {expiringMemberships.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b text-left text-gray-600 font-semibold">Member Name</th>
                  <th className="py-2 px-4 border-b text-left text-gray-600 font-semibold">Plan Name</th>
                  <th className="py-2 px-4 border-b text-left text-gray-600 font-semibold">End Date</th>
                </tr>
              </thead>
              <tbody>
                {expiringMemberships.map((membership) => (
                  <tr key={membership.assignmentId} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b text-gray-700">{membership.userName}</td> {/* UPDATED */}
                    <td className="py-2 px-4 border-b text-gray-700">{membership.planName}</td> {/* UPDATED */}
                    <td className="py-2 px-4 border-b text-gray-700">{membership.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center">No memberships expiring in the next 7 days.</p>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;