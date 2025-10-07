import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: 'getting-started' | 'documents' | 'vessels' | 'activities' | 'troubleshooting' | 'faq';
  tags: string[];
  lastUpdated: Date;
  priority: 'low' | 'medium' | 'high';
  relatedArticles?: string[];
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  userEmail: string;
  attachments?: string[];
}

interface HelpContextType {
  helpArticles: HelpArticle[];
  faqs: FAQ[];
  supportTickets: SupportTicket[];
  searchHelp: (query: string) => HelpArticle[];
  getArticlesByCategory: (category: string) => HelpArticle[];
  getRelatedArticles: (articleId: string) => HelpArticle[];
  createSupportTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  updateTicketStatus: (ticketId: string, status: SupportTicket['status']) => void;
  markFAQHelpful: (faqId: string, helpful: boolean) => void;
  getPopularArticles: () => HelpArticle[];
  getRecentArticles: () => HelpArticle[];
}

const HelpContext = createContext<HelpContextType | undefined>(undefined);

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (context === undefined) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};

interface HelpProviderProps {
  children: ReactNode;
}

export const HelpProvider: React.FC<HelpProviderProps> = ({ children }) => {
  const [helpArticles, setHelpArticles] = useState<HelpArticle[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);

  // Initialize help articles
  useEffect(() => {
    const articles: HelpArticle[] = [
      {
        id: 'getting-started-1',
        title: 'Welcome to STS Clearance Hub',
        content: `Welcome to the STS Clearance Hub! This comprehensive platform helps you manage Ship-to-Ship (STS) transfer operations efficiently and safely.

## Key Features:
- **Document Management**: Upload, review, and approve essential documents
- **Vessel Registration**: Register and manage participating vessels
- **Activity Tracking**: Monitor all operations in real-time
- **Compliance**: Ensure regulatory compliance throughout the process

## Getting Started:
1. Complete your profile setup
2. Register your vessels
3. Upload required documents
4. Start your first STS operation

For detailed guidance, explore our documentation or contact support.`,
        category: 'getting-started',
        tags: ['welcome', 'introduction', 'setup'],
        lastUpdated: new Date('2025-01-15'),
        priority: 'high',
        relatedArticles: ['getting-started-2', 'getting-started-3']
      },
      {
        id: 'documents-1',
        title: 'Required Documents for STS Operations',
        content: `To ensure safe and compliant STS operations, the following documents are required:

## Mandatory Documents:
- **Safety Management Certificate (SMC)**
- **International Safety Management (ISM) Certificate**
- **Certificate of Financial Responsibility**
- **Vessel Insurance Certificate**
- **Crew Certificates and Licenses**

## Document Requirements:
- All documents must be current and valid
- PDF format preferred
- Maximum file size: 10MB per document
- Documents must be in English or have English translations

## Upload Process:
1. Navigate to Documents section
2. Select document type
3. Upload file
4. Add metadata and descriptions
5. Submit for review

Contact support if you encounter any issues during document upload.`,
        category: 'documents',
        tags: ['documents', 'requirements', 'upload', 'compliance'],
        lastUpdated: new Date('2025-01-14'),
        priority: 'high',
        relatedArticles: ['documents-2', 'documents-3']
      },
      {
        id: 'vessels-1',
        title: 'Vessel Registration Process',
        content: `Registering vessels in the STS Clearance Hub is straightforward and essential for operations.

## Registration Steps:
1. **Basic Information**: Enter vessel name, IMO number, and flag
2. **Specifications**: Add vessel type, dimensions, and capacity
3. **Certificates**: Upload relevant certificates and documentation
4. **Review**: Submit for administrative review
5. **Approval**: Receive confirmation and vessel ID

## Required Vessel Information:
- Vessel name and IMO number
- Flag state and port of registry
- Vessel type and dimensions
- Maximum cargo capacity
- Safety equipment details

## Important Notes:
- IMO numbers must be unique and valid
- All information must be accurate and current
- Vessels cannot participate in STS operations until approved

For assistance with vessel registration, contact our support team.`,
        category: 'vessels',
        tags: ['vessels', 'registration', 'IMO', 'certificates'],
        lastUpdated: new Date('2025-01-13'),
        priority: 'medium',
        relatedArticles: ['vessels-2', 'vessels-3']
      },
      {
        id: 'activities-1',
        title: 'Monitoring STS Operations',
        content: `Real-time monitoring of STS operations is crucial for safety and compliance.

## Activity Dashboard Features:
- **Live Updates**: Real-time status of all operations
- **Timeline View**: Chronological view of activities
- **Status Tracking**: Monitor document approvals and vessel movements
- **Alert System**: Receive notifications for important events

## Key Monitoring Points:
1. **Pre-Operation**: Document verification and vessel positioning
2. **During Operation**: Real-time monitoring and safety checks
3. **Post-Operation**: Completion reports and documentation

## Safety Features:
- Automatic alerts for safety violations
- Real-time weather and sea condition updates
- Emergency contact information display
- Incident reporting tools

Stay informed and maintain operational safety with our comprehensive monitoring tools.`,
        category: 'activities',
        tags: ['activities', 'monitoring', 'safety', 'real-time'],
        lastUpdated: new Date('2025-01-12'),
        priority: 'medium',
        relatedArticles: ['activities-2', 'activities-3']
      },
      {
        id: 'troubleshooting-1',
        title: 'Common Issues and Solutions',
        content: `Encountering issues? Here are solutions to common problems:

## Document Upload Issues:
**Problem**: File upload fails
**Solution**: Check file size (max 10MB), ensure PDF format, verify internet connection

**Problem**: Document not appearing
**Solution**: Refresh page, check upload confirmation, contact support if issue persists

## Login Problems:
**Problem**: Cannot access account
**Solution**: Verify credentials, check account status, use password reset if needed

**Problem**: Session timeout
**Solution**: Re-login, ensure browser cookies are enabled

## System Performance:
**Problem**: Slow loading times
**Solution**: Check internet connection, clear browser cache, try different browser

**Problem**: Features not working
**Solution**: Update browser, disable browser extensions, contact support

For issues not covered here, create a support ticket or contact our team directly.`,
        category: 'troubleshooting',
        tags: ['troubleshooting', 'issues', 'solutions', 'support'],
        lastUpdated: new Date('2025-01-11'),
        priority: 'medium',
        relatedArticles: ['troubleshooting-2', 'troubleshooting-3']
      }
    ];

    setHelpArticles(articles);
  }, []);

  // Initialize FAQs
  useEffect(() => {
    const faqData: FAQ[] = [
      {
        id: 'faq-1',
        question: 'What is STS Clearance Hub?',
        answer: 'STS Clearance Hub is a comprehensive platform for managing Ship-to-Ship transfer operations, ensuring safety, compliance, and efficiency in maritime operations.',
        category: 'general',
        helpful: 45,
        notHelpful: 2
      },
      {
        id: 'faq-2',
        question: 'How do I upload documents?',
        answer: 'Navigate to the Documents section, select the document type, choose your file (PDF preferred, max 10MB), add metadata, and submit for review.',
        category: 'documents',
        helpful: 38,
        notHelpful: 1
      },
      {
        id: 'faq-3',
        question: 'What documents are required?',
        answer: 'Required documents include Safety Management Certificate, ISM Certificate, Insurance Certificate, and crew licenses. All must be current and valid.',
        category: 'documents',
        helpful: 42,
        notHelpful: 3
      },
      {
        id: 'faq-4',
        question: 'How long does vessel approval take?',
        answer: 'Vessel approval typically takes 24-48 hours during business days. Complex cases may require additional time for review.',
        category: 'vessels',
        helpful: 35,
        notHelpful: 2
      },
      {
        id: 'faq-5',
        question: 'Can I edit submitted information?',
        answer: 'Yes, you can edit most information before final approval. Once approved, changes require administrative review.',
        category: 'general',
        helpful: 28,
        notHelpful: 1
      }
    ];

    setFaqs(faqData);
  }, []);

  // Search help articles
  const searchHelp = useCallback((query: string): HelpArticle[] => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase();
    return helpArticles.filter(article => 
      article.title.toLowerCase().includes(searchTerm) ||
      article.content.toLowerCase().includes(searchTerm) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }, [helpArticles]);

  // Get articles by category
  const getArticlesByCategory = useCallback((category: string): HelpArticle[] => {
    return helpArticles.filter(article => article.category === category);
  }, [helpArticles]);

  // Get related articles
  const getRelatedArticles = useCallback((articleId: string): HelpArticle[] => {
    const article = helpArticles.find(a => a.id === articleId);
    if (!article?.relatedArticles) return [];
    
    return helpArticles.filter(a => article.relatedArticles!.includes(a.id));
  }, [helpArticles]);

  // Create support ticket
  const createSupportTicket = useCallback((ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    const newTicket: SupportTicket = {
      ...ticket,
      id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setSupportTickets(prev => [newTicket, ...prev]);
    
    // Dispatch event for notifications
    window.dispatchEvent(new CustomEvent('support:ticket-created', { detail: newTicket }));
  }, []);

  // Update ticket status
  const updateTicketStatus = useCallback((ticketId: string, status: SupportTicket['status']) => {
    setSupportTickets(prev => 
      prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, status, updatedAt: new Date() }
          : ticket
      )
    );
  }, []);

  // Mark FAQ helpful
  const markFAQHelpful = useCallback((faqId: string, helpful: boolean) => {
    setFaqs(prev => 
      prev.map(faq => 
        faq.id === faqId 
          ? { 
              ...faq, 
              helpful: helpful ? faq.helpful + 1 : faq.helpful,
              notHelpful: helpful ? faq.notHelpful : faq.notHelpful + 1
            }
          : faq
      )
    );
  }, []);

  // Get popular articles
  const getPopularArticles = useCallback((): HelpArticle[] => {
    return [...helpArticles]
      .sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
      })
      .slice(0, 5);
  }, [helpArticles]);

  // Get recent articles
  const getRecentArticles = useCallback((): HelpArticle[] => {
    return [...helpArticles]
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 5);
  }, [helpArticles]);

  const value: HelpContextType = {
    helpArticles,
    faqs,
    supportTickets,
    searchHelp,
    getArticlesByCategory,
    getRelatedArticles,
    createSupportTicket,
    updateTicketStatus,
    markFAQHelpful,
    getPopularArticles,
    getRecentArticles
  };

  return (
    <HelpContext.Provider value={value}>
      {children}
    </HelpContext.Provider>
  );
};
