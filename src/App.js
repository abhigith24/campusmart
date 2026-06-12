import React, { useState, useEffect }    from "react";
import { AuthProvider, useAuth }         from "./context/AuthContext";
import { ToastProvider }                 from "./context/ToastContext";
import { WishlistProvider }              from "./context/WishlistContext";
import { NotificationsProvider }         from "./context/NotificationsContext";
import Navbar                            from "./components/Navbar";
import Footer                            from "./components/Footer";
import CookieConsent                     from "./components/CookieConsent";
import AuthPage                          from "./pages/AuthPage";
import HomePage                          from "./pages/HomePage";
import PostListingPage                   from "./pages/PostListingPage";
import ListingDetailPage                 from "./pages/ListingDetailPage";
import ChatPage                          from "./pages/ChatPage";
import ProfilePage                       from "./pages/ProfilePage";
import AdminPage                         from "./pages/AdminPage";
import NotificationsPage                 from "./pages/NotificationsPage";
import PurchaseRequestsPage              from "./pages/PurchaseRequestsPage";
import PrivacyPolicyPage                 from "./pages/PrivacyPolicyPage";
import TermsPage                         from "./pages/TermsPage";
import ContactPage                       from "./pages/ContactPage";
import AuthModal                         from "./components/AuthModal";
import "./styles/main.css";
import "./styles/modern.css";

// Pages that should NOT show Footer
const NO_FOOTER = ["chat"];
// Pages that fill full viewport height
const FULL_HEIGHT = ["chat"];

// Pages that require authentication
const PROTECTED_PAGES = ["post", "edit", "chat", "profile", "my-listings", "wishlist", "notifications", "purchase-requests", "admin"];

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <WishlistProvider>
          <NotificationsProvider>
            <Main />
          </NotificationsProvider>
        </WishlistProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

function Main() {
  const { currentUser } = useAuth();
  
  // Hash/path-based navigation helper
  const getInitialPage = () => {
    const path = window.location.pathname;
    if (path === "/terms-of-service" || path === "/terms") return "terms";
    if (path === "/privacy-policy" || path === "/privacy") return "privacy";
    if (path === "/contact") return "contact";
    if (path === "/auth") return "auth";
    return "home";
  };

  const [page, setPage] = useState(getInitialPage);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState(null);
  const [chatWith, setChatWith] = useState(null);

  // Auth Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRedirectPage, setAuthRedirectPage] = useState(null);
  const [authSuccessCallback, setAuthSuccessCallback] = useState(null);

  const navigateTo = (nextPage) => {
    setPage(nextPage);
    let path = "/";
    if (nextPage === "terms") path = "/terms-of-service";
    else if (nextPage === "privacy") path = "/privacy-policy";
    else if (nextPage === "home") path = "/";
    else if (nextPage === "post") path = "/post";
    else if (nextPage === "chat") path = "/chat";
    else if (nextPage === "profile") path = "/profile";
    else if (nextPage === "my-listings") path = "/my-listings";
    else if (nextPage === "wishlist") path = "/wishlist";
    else if (nextPage === "notifications") path = "/notifications";
    else if (nextPage === "purchase-requests") path = "/purchase-requests";
    else if (nextPage === "admin") path = "/admin";
    else if (nextPage === "contact") path = "/contact";
    else if (nextPage === "auth") path = "/auth";
    else if (nextPage === "listing") path = "/listing";
    
    if (window.location.pathname !== path) {
      window.history.pushState({ page: nextPage }, "", path);
    }
  };

  const requireAuth = (targetPage, callback = null) => {
    if (currentUser) {
      if (callback) callback();
      if (targetPage) navigateTo(targetPage);
    } else {
      setAuthRedirectPage(targetPage);
      setAuthSuccessCallback(() => callback);
      setShowAuthModal(true);
    }
  };

  // Sync state with browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      const path = window.location.pathname;
      if (path === "/terms-of-service" || path === "/terms") setPage("terms");
      else if (path === "/privacy-policy" || path === "/privacy") setPage("privacy");
      else if (path === "/contact") setPage("contact");
      else if (path === "/auth") setPage("auth");
      else if (event.state && event.state.page) setPage(event.state.page);
      else setPage("home");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Sync protected pages access
  useEffect(() => {
    if (!currentUser && PROTECTED_PAGES.includes(page)) {
      setPage("home");
      setAuthRedirectPage(page);
      setShowAuthModal(true);
    }
  }, [page, currentUser]);

  useEffect(() => {
    if (currentUser && page === "auth") {
      navigateTo("home");
    }
  }, [currentUser, page]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (authRedirectPage) {
      navigateTo(authRedirectPage);
      setAuthRedirectPage(null);
    }
    if (authSuccessCallback) {
      authSuccessCallback();
      setAuthSuccessCallback(null);
    }
  };

  const isFullHeight = FULL_HEIGHT.includes(page);
  const showFooter   = !NO_FOOTER.includes(page);

  return (
    <div className="app-layout">
      <Navbar
        page={page} setPage={navigateTo}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        requireAuth={requireAuth}
      />

      <div className={`main-content ${isFullHeight ? "no-pad" : ""}`}>
        {page === "auth" && <AuthPage setPage={navigateTo} />}
        {page === "home" && (
          <HomePage setPage={navigateTo} setSelectedListing={setSelectedListing} searchQuery={searchQuery} requireAuth={requireAuth} />
        )}
        {page === "post" && <PostListingPage setPage={navigateTo} />}
        {page === "edit" && selectedListing && (
          <PostListingPage setPage={navigateTo} editListing={selectedListing} />
        )}
        {page === "listing" && selectedListing && (
          <ListingDetailPage
            listing={selectedListing} setPage={navigateTo}
            setSelectedListing={setSelectedListing} setChatWith={setChatWith}
            requireAuth={requireAuth}
          />
        )}
        {page === "chat" && <ChatPage initialChatWith={chatWith} setPage={navigateTo} />}
        {(page === "profile" || page === "my-listings" || page === "wishlist") && (
          <ProfilePage
            setPage={navigateTo} setSelectedListing={setSelectedListing}
            initialTab={page === "wishlist" ? "wishlist" : page === "my-listings" ? "active" : "active"}
          />
        )}
        {page === "notifications" && (
          <NotificationsPage setPage={navigateTo} setSelectedListing={setSelectedListing} />
        )}
        {page === "purchase-requests" && (
          <PurchaseRequestsPage setPage={navigateTo} setChatWith={setChatWith} />
        )}
        {page === "admin"   && <AdminPage />}
        {page === "privacy" && <PrivacyPolicyPage setPage={navigateTo} />}
        {page === "terms"   && <TermsPage setPage={navigateTo} />}
        {page === "contact" && <ContactPage setPage={navigateTo} />}
      </div>

      {showFooter && <Footer setPage={navigateTo} />}
      <CookieConsent />

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
          setPage={navigateTo}
        />
      )}
    </div>
  );
}

export default App;
