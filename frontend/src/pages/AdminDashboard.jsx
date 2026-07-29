import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { LogOut, ShieldAlert, Users, School, Settings, LayoutDashboard } from 'lucide-react';

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-indigo-900 text-white p-6 flex flex-col min-h-screen">
        <div className="flex items-center gap-3 mb-10 border-b border-indigo-700 pb-6">
          <ShieldAlert className="w-8 h-8 text-indigo-400" />
          <h2 className="text-xl font-bold tracking-wide">Admin Panel</h2>
        </div>
        
        <nav className="flex-1 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-indigo-800 rounded-lg text-white font-medium">
            <LayoutDashboard className="w-5 h-5" /> Overview
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-800 rounded-lg text-indigo-200 transition-colors">
            <Users className="w-5 h-5" /> Manage Users
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-800 rounded-lg text-indigo-200 transition-colors">
            <School className="w-5 h-5" /> Manage Classes
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-800 rounded-lg text-indigo-200 transition-colors">
            <Settings className="w-5 h-5" /> Platform Settings
          </a>
        </nav>
        
        <div className="pt-6 border-t border-indigo-700 mt-auto">
          <div className="mb-4 text-indigo-200 text-sm">
            Logged in as <br/><strong className="text-white">{user.username}</strong>
          </div>
          <Button onClick={handleLogout} className="!w-full !bg-red-500 hover:!bg-red-600 !shadow-none flex items-center justify-center">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto animate-fade-in">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome, {user.displayName}</h1>
          <p className="text-gray-600 mt-2">Here is what's happening at your school today.</p>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover-scale">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Students</p>
              <p className="text-2xl font-bold text-gray-800">1,248</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover-scale delay-100">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Teachers</p>
              <p className="text-2xl font-bold text-gray-800">84</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover-scale delay-200">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
              <School className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Classes</p>
              <p className="text-2xl font-bold text-gray-800">42</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover-scale delay-300">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Ongoing Exams</p>
              <p className="text-2xl font-bold text-gray-800">7</p>
            </div>
          </div>

        </div>

        {/* Recent Activity Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Audit Activity</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-50">
              <div>
                <p className="font-medium text-gray-800">New Registration</p>
                <p className="text-sm text-gray-500">A new student joined the platform.</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600">2 mins ago</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-50">
              <div>
                <p className="font-medium text-gray-800">Exam Published</p>
                <p className="text-sm text-gray-500">Grade 10 Mathematics Term 1 was published.</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600">1 hour ago</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <div>
                <p className="font-medium text-gray-800">System Backup</p>
                <p className="text-sm text-gray-500">Automated database backup completed successfully.</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600">4 hours ago</span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
