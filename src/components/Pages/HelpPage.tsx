import React, { useState } from 'react';
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  MessageCircle, 
  Phone, 
  Mail,
  FileText,
  Video,
  Download,
  ChevronDown,
  ChevronRight,
  Star,
  Clock,
  User,
  Settings,
  Shield,
  Database,
  Check,
  X
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import ApiService from '../../api';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: Date;
  readTime: number; // in minutes
}

const HelpPage: React.FC = () => {
  const { user } = useApp();
  
  const [activeTab, setActiveTab] = useState('faq');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
    priority: 'medium'
  });

  const tabs = [
    {
      id: 'faq',
      title: 'FAQ',
      icon: <HelpCircle className="w-4 h-4" />
    },
    {
      id: 'guides',
      title: 'User Guides',
      icon: <BookOpen className="w-4 h-4" />
    },
    {
      id: 'support',
      title: 'Support',
      icon: <MessageCircle className="w-4 h-4" />
    }
  ];

  // State for dynamic data
  const [faqData, setFaqData] = useState<FAQItem[]>([]);
  const [helpArticles, setHelpArticles] = useState<HelpArticle[]>([]);

  // Load FAQ data from API
  const loadFaqData = async () => {
    try {
      // Call the actual API endpoint
      const apiFaq = await ApiService.getFAQ();
      setFaqData(apiFaq);
    } catch (err) {
      console.error('Error loading FAQ data:', err);
      setFaqData([]);
    }
  };

  // Load help articles from API
  const loadHelpArticles = async () => {
    try {
      // Call the actual API endpoint
      const apiArticles = await ApiService.getHelpArticles();
      setHelpArticles(apiArticles);
    } catch (err) {
      console.error('Error loading help articles:', err);
      setHelpArticles([]);
    }
  };

  // Load data on component mount
  React.useEffect(() => {
    loadFaqData();
    loadHelpArticles();
  }, []);

  const categories = [
    { id: 'all', name: 'All Categories', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'documents', name: 'Documents', icon: <FileText className="w-4 h-4" /> },
    { id: 'approval', name: 'Approval', icon: <Check className="w-4 h-4" /> },
    { id: 'account', name: 'Account', icon: <User className="w-4 h-4" /> },
    { id: 'security', name: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'data', name: 'Data', icon: <Database className="w-4 h-4" /> },
    { id: 'preferences', name: 'Preferences', icon: <Settings className="w-4 h-4" /> },
    { id: 'reports', name: 'Reports', icon: <FileText className="w-4 h-4" /> }
  ];

  const filteredFAQ = faqData.filter(faq => {
    const matchesSearch = searchTerm === '' || 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Send the contact form to the backend
      await ApiService.submitContactForm(contactForm);
      
      setShowContactForm(false);
      setContactForm({
        name: user?.name || '',
        email: user?.email || '',
        subject: '',
        message: '',
        priority: 'medium'
      });
      
      // Show success notification
      window.dispatchEvent(new CustomEvent('app:notification', {
        detail: {
          type: 'success',
          message: 'Contact form submitted successfully'
        }
      }));
    } catch (err) {
      console.error('Error submitting contact form:', err);
    }
  };

  const renderFAQTab = () => (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search FAQ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* FAQ List */}
      <div className="bg-white rounded-xl shadow-card border border-secondary-200">
        {filteredFAQ.length === 0 ? (
          <div className="p-12 text-center">
            <HelpCircle className="w-12 h-12 text-secondary-400 mx-auto mb-6" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No FAQ items found</h3>
            <p className="text-secondary-500">
              Try adjusting your search terms or category filter.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-secondary-200">
            {filteredFAQ.map((faq) => (
              <div key={faq.id} className="p-6">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                  className="w-full text-left flex items-start justify-between hover:bg-secondary-50 transition-colors duration-200 rounded-xl p-2 -m-2"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-secondary-900 mb-2">
                      {faq.question}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        faq.category === 'documents' ? 'bg-blue-100 text-blue-800' :
                        faq.category === 'approval' ? 'bg-green-100 text-success-800' :
                        faq.category === 'security' ? 'bg-red-100 text-danger-800' :
                        'bg-secondary-100 text-secondary-800'
                      }`}>
                        {faq.category}
                      </span>
                      <div className="flex items-center space-x-1">
                        {faq.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex-shrink-0">
                    {expandedFAQ === faq.id ? (
                      <ChevronDown className="w-5 h-5 text-secondary-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-secondary-400" />
                    )}
                  </div>
                </button>
                
                {expandedFAQ === faq.id && (
                  <div className="mt-4 pl-4 border-l-2 border-blue-200">
                    <p className="text-secondary-700 leading-relaxed">
                      {faq.answer}
                    </p>
                    <div className="mt-4 flex items-center space-x-4">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Was this helpful?
                      </button>
                      <div className="flex items-center space-x-1">
                        <button className="p-1 text-secondary-400 hover:text-warning-500 transition-colors duration-200">
                          <Star className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-secondary-400 hover:text-warning-500 transition-colors duration-200">
                          <Star className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-secondary-400 hover:text-warning-500 transition-colors duration-200">
                          <Star className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-secondary-400 hover:text-warning-500 transition-colors duration-200">
                          <Star className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-secondary-400 hover:text-warning-500 transition-colors duration-200">
                          <Star className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderGuidesTab = () => (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <BookOpen className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">User Guides</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>Explore our comprehensive guides to get the most out of STS Clearance Hub.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {helpArticles.map((article) => (
          <div key={article.id} className="bg-white rounded-xl shadow-card border border-secondary-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-secondary-900 mb-2">
                  {article.title}
                </h3>
                <p className="text-secondary-600 text-sm mb-6">
                  {article.content}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-secondary-500">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {article.readTime} min read
                </span>
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  {article.category}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200">
                  Read Guide
                </button>
                <button className="p-1 text-secondary-400 hover:text-secondary-600 transition-colors duration-200">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {article.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
                <span className="text-xs text-secondary-400">
                  Updated {article.lastUpdated.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Tutorials */}
      <div className="card">
        <h3 className="text-lg font-medium text-secondary-900 mb-6">Video Tutorials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-secondary-100 rounded-xl p-6 text-center">
            <Video className="w-12 h-12 text-secondary-400 mx-auto mb-2" />
            <h4 className="font-medium text-secondary-900">Getting Started</h4>
            <p className="text-sm text-secondary-500">5 min video</p>
          </div>
          <div className="bg-secondary-100 rounded-xl p-6 text-center">
            <Video className="w-12 h-12 text-secondary-400 mx-auto mb-2" />
            <h4 className="font-medium text-secondary-900">Document Management</h4>
            <p className="text-sm text-secondary-500">8 min video</p>
          </div>
          <div className="bg-secondary-100 rounded-xl p-6 text-center">
            <Video className="w-12 h-12 text-secondary-400 mx-auto mb-2" />
            <h4 className="font-medium text-secondary-900">Advanced Features</h4>
            <p className="text-sm text-secondary-500">12 min video</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSupportTab = () => (
    <div className="space-y-8">
      <div className="bg-success-50 border border-success-200 rounded-xl p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <MessageCircle className="h-5 w-5 text-green-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-success-800">Need Help?</h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Our support team is here to help you with any questions or issues.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-card border border-secondary-200 p-6 text-center">
          <Mail className="w-12 h-12 text-blue-500 mx-auto mb-6" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">Email Support</h3>
          <p className="text-secondary-600 text-sm mb-6">
            Send us a detailed message and we'll respond within 24 hours.
          </p>
          <button
            onClick={() => setShowContactForm(true)}
            className="btn-primary"
          >
            Contact Support
          </button>
        </div>
        
        <div className="bg-white rounded-xl shadow-card border border-secondary-200 p-6 text-center">
          <Phone className="w-12 h-12 text-success-500 mx-auto mb-6" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">Phone Support</h3>
          <p className="text-secondary-600 text-sm mb-6">
            Call us for immediate assistance during business hours.
          </p>
          <div className="text-sm text-secondary-900 font-medium">
            +1 (555) 123-4567
          </div>
          <div className="text-xs text-secondary-500 mt-1">
            Mon-Fri 9AM-6PM EST
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-card border border-secondary-200 p-6 text-center">
          <MessageCircle className="w-12 h-12 text-purple-500 mx-auto mb-6" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">Live Chat</h3>
          <p className="text-secondary-600 text-sm mb-6">
            Chat with our support team in real-time for quick answers.
          </p>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors duration-200">
            Start Chat
          </button>
        </div>
      </div>

      {/* Contact Form Modal */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-secondary-900">
                  Contact Support
                </h3>
                <button
                  onClick={() => setShowContactForm(false)}
                  className="text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={contactForm.priority}
                    onChange={(e) => setContactForm({ ...contactForm, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-secondary-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your issue or question in detail..."
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowContactForm(false)}
                    className="px-4 py-2 border border-secondary-300 text-secondary-700 rounded-xl hover:bg-secondary-50 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'faq':
        return renderFAQTab();
      case 'guides':
        return renderGuidesTab();
      case 'support':
        return renderSupportTab();
      default:
        return renderFAQTab();
    }
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900">Help & Support</h1>
          <p className="mt-2 text-secondary-600">
            Find answers to common questions, learn how to use the system, and get support when you need it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'text-secondary-600 hover:bg-secondary-50 hover:text-secondary-900'
                  }`}
                >
                  <div className="flex items-center">
                    <span className="mr-3">{tab.icon}</span>
                    <div className="font-medium">{tab.title}</div>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
