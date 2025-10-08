import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import './styles/button-alignment.css'
import { router } from './router'
import { AppProvider } from './contexts/AppContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { HelpProvider } from './contexts/HelpContext'
import { ProfileProvider } from './contexts/ProfileContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { SearchProvider } from './contexts/SearchContext'
import ErrorBoundary from './components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppProvider>
        <LanguageProvider>
          <NotificationProvider>
            <HelpProvider>
              <ProfileProvider>
                <SettingsProvider>
                  <SearchProvider>
                    <RouterProvider router={router} />
                  </SearchProvider>
                </SettingsProvider>
              </ProfileProvider>
            </HelpProvider>
          </NotificationProvider>
        </LanguageProvider>
      </AppProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
