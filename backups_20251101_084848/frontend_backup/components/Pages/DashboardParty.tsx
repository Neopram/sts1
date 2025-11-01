import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, Clock, Package } from 'lucide-react';
import { Card } from '../Common/Card';
import { Loading } from '../Common/Loading';
import { Alert } from '../Common/Alert';
import { Button } from '../Common/Button';
import ApiService from '../../api';

interface Transaction {
  id: string;
  title: string;
  location: string;
  status: string;
  documents_uploaded: number;
  awaiting_approval: number;
  sts_eta: string;
}

interface Submission {
  id: string;
  filename: string;
  room_title: string;
  status: string;
  uploaded_at: string;
}

interface SubmissionStats {
  submissions: Submission[];
  total_submitted: number;
  total_approved: number;
  success_rate: number;
}

export const DashboardParty: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [transRes, submissionsRes] = await Promise.all([
        ApiService.staticGet('/dashboard/party/my-transactions'),
        ApiService.staticGet('/dashboard/party/my-submissions'),
      ]);

      setTransactions(transRes.transactions || []);
      setSubmissions(submissionsRes);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error loading party dashboard');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loading message="Loading Your Dashboard..." />;
  }

  const needsUpload = transactions.reduce((sum, t) => sum + (t.awaiting_approval > 0 ? 1 : 0), 0);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" title="Error" message={error} />
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active Transactions</p>
              <p className="text-3xl font-bold text-blue-600">{transactions.length}</p>
            </div>
            <Package className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Documents Uploaded</p>
              <p className="text-3xl font-bold text-green-600">
                {submissions?.total_submitted || 0}
              </p>
            </div>
            <Upload className="w-12 h-12 text-green-600 opacity-20" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Success Rate</p>
              <p className="text-3xl font-bold text-blue-600">
                {submissions?.success_rate || 0}%
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Needs Attention</p>
              <p className="text-3xl font-bold text-orange-600">{needsUpload}</p>
            </div>
            <Clock className="w-12 h-12 text-orange-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Active Transactions */}
      <Card>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">📍 Your Active Transactions</h2>
          <p className="text-sm text-gray-600">Transactions you are participating in</p>
        </div>

        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No active transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((trans) => (
              <div key={trans.id} className="p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{trans.title}</h3>
                    <p className="text-sm text-gray-600">{trans.location}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    trans.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {trans.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Your Uploads</p>
                    <p className="text-lg font-bold text-blue-600">{trans.documents_uploaded}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Awaiting Approval</p>
                    <p className={`text-lg font-bold ${trans.awaiting_approval > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {trans.awaiting_approval}
                    </p>
                  </div>
                </div>
                {trans.awaiting_approval > 0 && (
                  <Button 
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => alert('View details for: ' + trans.title)}
                  >
                    📋 View Details
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Submissions */}
      {submissions && (
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">📤 Your Recent Submissions</h2>
            <p className="text-sm text-gray-600">Latest documents you've uploaded</p>
          </div>

          {!submissions.submissions || submissions.submissions.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No submissions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Document</th>
                    <th className="px-4 py-2 text-left">Transaction</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.submissions.slice(0, 5).map((sub) => (
                    <tr key={sub.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <span className="truncate max-w-xs" title={sub.filename}>
                          {sub.filename}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{sub.room_title}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          sub.status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : sub.status === 'under_review'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {new Date(sub.uploaded_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Quick Upload */}
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">📤 Quick Upload</h2>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 cursor-pointer">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Drag and drop documents here</p>
          <p className="text-xs text-gray-500 mt-1">or click to browse</p>
          <Button 
            variant="primary" 
            className="mt-4"
            onClick={() => alert('Upload dialog')}
          >
            Browse Files
          </Button>
        </div>
      </Card>

      {/* Help & Support */}
      <Card>
        <h2 className="text-lg font-bold text-gray-900 mb-4">❓ Help & Support</h2>
        <div className="space-y-2">
          <Button variant="secondary" className="w-full text-left">
            📚 FAQ for Sellers/Buyers
          </Button>
          <Button variant="secondary" className="w-full text-left">
            💬 Contact Support
          </Button>
          <Button variant="secondary" className="w-full text-left">
            📄 Document Templates
          </Button>
        </div>
      </Card>
    </div>
  );
};