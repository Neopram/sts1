import React, { useState, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  MessageCircle, 
  FileText, 
  Ship, 
  Activity, 
  Wrench, 
  Star,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Tag,
  Send,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { useHelp } from '../contexts/HelpContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationContext';

const HelpPage: React.FC = () => {
  const { 
    helpArticles, 
    faqs, 
    supportTickets, 
    searchHelp, 
    getArticlesByCategory, 
    getPopularArticles, 
    getRecentArticles,
    createSupportTicket,
    markFAQHelpful
  } = useHelp();
  const { t } = useLanguage();
  const { addNotification } = useNotifications();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'help' | 'faq' | 'support'>('help');

  // Support ticket form state
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    userEmail: ''
  });

  // Search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return searchHelp(searchTerm);
  }, [searchTerm, searchHelp]);

  // Get articles by selected category
  const categoryArticles = useMemo(() => {
    if (selectedCategory === 'all') return helpArticles;
    return getArticlesByCategory(selectedCategory);
  }, [selectedCategory, helpArticles, getArticlesByCategory]);

  // Categories for navigation
  const categories = [
    { id: 'all', name: t('help.categories.all') || 'All Categories', icon: BookOpen },
    { id: 'getting-started', name: t('help.categories.gettingStarted') || 'Getting Started', icon: BookOpen },
    { id: 'documents', name: t('help.categories.documents') || 'Documents', icon: FileText },
    { id: 'vessels', name: t('help.categories.vessels') || 'Vessels', icon: Ship },
    { id: 'activities', name: t('help.categories.activities') || 'Activities', icon: Activity },
    { id: 'troubleshooting', name: t('help.categories.troubleshooting') || 'Troubleshooting', icon: Wrench }
  ];

  // Handle support ticket submission
  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketForm.title || !ticketForm.description || !ticketForm.userEmail) {
      addNotification({
        type: 'error',
        title: t('help.support.formError') || 'Form Error',
        message: t('help.support.fillAllFields') || 'Please fill in all required fields',
        priority: 'high',
        category: 'system'
      });
      return;
    }

    createSupportTicket({
      title: ticketForm.title,
      description: ticketForm.description,
      category: ticketForm.category,
      priority: ticketForm.priority,
      userEmail: ticketForm.userEmail
    });

    // Show success notification
    addNotification({
      type: 'success',
      title: t('help.support.ticketCreated') || 'Support Ticket Created',
      message: t('help.support.ticketCreatedMessage') || 'Your support ticket has been created successfully',
      priority: 'medium',
      category: 'system'
    });

    // Reset form
    setTicketForm({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      userEmail: ''
    });

    setShowSupportForm(false);
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t('help.pageTitle') || 'Help & Support'}
            </h1>
            <p className="mt-2 text-gray-600">
              {t('help.pageDescription') || 'Find answers, get help, and contact support'}
            </p>
          </div>
          
          <button
            onClick={() => setShowSupportForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            {t('help.contactSupport') || 'Contact Support'}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-6 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('help.searchPlaceholder') || 'Search help articles, FAQs, and more...'}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('help')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'help'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('help.tabs.help') || 'Help Articles'}
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'faq'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('help.tabs.faq') || 'FAQ'}
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'support'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('help.tabs.support') || 'Support'}
            </button>
          </nav>
        </div>
      </div>

      {/* Help Articles Tab */}
      {activeTab === 'help' && (
        <div>
          {/* Category Navigation */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                      selectedCategory === category.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Results */}
          {searchTerm && searchResults.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('help.searchResults') || 'Search Results'} ({searchResults.length})
              </h3>
              <div className="space-y-4">
                {searchResults.map((article) => (
                  <div key={article.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-medium text-gray-900 mb-2">{article.title}</h4>
                        <p className="text-gray-600 mb-3 line-clamp-3">{article.content}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDate(article.lastUpdated)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Tag className="w-4 h-4" />
                            <span>{article.category}</span>
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(article.priority)}`}>
                            {article.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Articles */}
          {!searchTerm && (
            <div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {categoryArticles.map((article) => (
                  <div key={article.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <h4 className="text-lg font-medium text-gray-900">{article.title}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(article.priority)}`}>
                        {article.priority}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4 line-clamp-3">{article.content}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(article.lastUpdated)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Tag className="w-4 h-4" />
                          <span>{article.category}</span>
                        </span>
                      </div>
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        {t('help.readMore') || 'Read More'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular and Recent Articles */}
          {!searchTerm && selectedCategory === 'all' && (
            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Popular Articles */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 mr-2" />
                  {t('help.popularArticles') || 'Popular Articles'}
                </h3>
                <div className="space-y-3">
                  {getPopularArticles().map((article) => (
                    <div key={article.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(article.lastUpdated)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Articles */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 text-blue-500 mr-2" />
                  {t('help.recentArticles') || 'Recent Articles'}
                </h3>
                <div className="space-y-3">
                  {getRecentArticles().map((article) => (
                    <div key={article.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                        <p className="text-xs text-gray-500">{formatDate(article.lastUpdated)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAQ Tab */}
      {activeTab === 'faq' && (
        <div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <h4 className="text-lg font-medium text-gray-900">{faq.question}</h4>
                  <span className="text-sm text-gray-500 capitalize">{faq.category}</span>
                </div>
                <p className="text-gray-600 mb-4">{faq.answer}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => markFAQHelpful(faq.id, true)}
                      className="flex items-center space-x-2 text-sm text-gray-500 hover:text-green-600"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{faq.helpful}</span>
                    </button>
                    <button
                      onClick={() => markFAQHelpful(faq.id, false)}
                      className="flex items-center space-x-2 text-sm text-gray-500 hover:text-red-600"
                    >
                      <ThumbsDown className="w-4 h-4" />
                      <span>{faq.notHelpful}</span>
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">
                    {t('help.faq.helpful') || 'Was this helpful?'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Support Tab */}
      {activeTab === 'support' && (
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('help.support.contactInfo') || 'Contact Information'}
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">+1 (555) 123-4567</p>
                    <p className="text-xs text-gray-500">{t('help.support.phoneHours') || '24/7 Support'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">support@stsclearance.com</p>
                    <p className="text-xs text-gray-500">{t('help.support.emailResponse') || 'Response within 2 hours'}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Maritime Support Center</p>
                    <p className="text-xs text-gray-500">Dubai, UAE</p>
                  </div>
                </div>
              </div>

              {/* Support Tickets */}
              <div className="mt-8">
                <h4 className="text-md font-medium text-gray-900 mb-3">
                  {t('help.support.yourTickets') || 'Your Support Tickets'}
                </h4>
                <div className="space-y-2">
                  {supportTickets.slice(0, 5).map((ticket) => (
                    <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{ticket.title}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="capitalize">{ticket.status}</span>
                        <span>{formatDate(ticket.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Support Form */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {t('help.support.createTicket') || 'Create Support Ticket'}
                </h3>
                <form onSubmit={handleTicketSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('help.support.title') || 'Title'} *
                    </label>
                    <input
                      type="text"
                      value={ticketForm.title}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('help.support.titlePlaceholder') || 'Brief description of your issue'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('help.support.description') || 'Description'} *
                    </label>
                    <textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={t('help.support.descriptionPlaceholder') || 'Detailed description of your issue or question'}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('help.support.category') || 'Category'}
                      </label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="general">{t('help.support.categories.general') || 'General'}</option>
                        <option value="technical">{t('help.support.categories.technical') || 'Technical'}</option>
                        <option value="billing">{t('help.support.categories.billing') || 'Billing'}</option>
                        <option value="feature">{t('help.support.categories.feature') || 'Feature Request'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('help.support.priority') || 'Priority'}
                      </label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, priority: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">{t('help.support.priorities.low') || 'Low'}</option>
                        <option value="medium">{t('help.support.priorities.medium') || 'Medium'}</option>
                        <option value="high">{t('help.support.priorities.high') || 'High'}</option>
                        <option value="urgent">{t('help.support.priorities.urgent') || 'Urgent'}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('help.support.email') || 'Email'} *
                    </label>
                    <input
                      type="email"
                      value={ticketForm.userEmail}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, userEmail: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {t('help.support.submit') || 'Submit Ticket'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Support Form Modal */}
      {showSupportForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {t('help.support.quickContact') || 'Quick Contact'}
              </h3>
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('help.support.title') || 'Title'} *
                  </label>
                  <input
                    type="text"
                    value={ticketForm.title}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('help.support.description') || 'Description'} *
                  </label>
                  <textarea
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('help.support.email') || 'Email'} *
                  </label>
                  <input
                    type="email"
                    value={ticketForm.userEmail}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, userEmail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowSupportForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  >
                    {t('help.support.cancel') || 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                  >
                    {t('help.support.submit') || 'Submit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HelpPage;
