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
import MyListingsPage                    from "./pages/MyListingsPage";
import WishlistPage                      from "./pages/WishlistPage";
import CollegeVerificationPage           from "./pages/CollegeVerificationPage";
import MySalesPage                       from "./pages/MySalesPage";
import SavedItemsPage                    from "./pages/SavedItemsPage";
import MyCollegeListingsPage             from "./pages/MyCollegeListingsPage";
import AdminDashboardPage                from "./pages/AdminDashboardPage";
import VerificationRequestsPage          from "./pages/VerificationRequestsPage";
import UserManagementPage                from "./pages/UserManagementPage";
import AnalyticsReportsPage              from "./pages/AnalyticsReportsPage";
import NotificationsPage                 from "./pages/NotificationsPage";
import PurchaseRequestsPage              from "./pages/PurchaseRequestsPage";
import SettingsPage                      from "./pages/SettingsPage";
import PrivacyPolicyPage                 from "./pages/PrivacyPolicyPage";
import TermsPage                         from "./pages/TermsPage";
import ContactPage                       from "./pages/ContactPage";
import AuthModal                         from "./components/AuthModal";
import { trackPageView }                 from "./utils/analytics";
import { db }                            from "./firebase";
import { doc, getDoc }                   from "firebase/firestore";
import { ThemeProvider }                  from "./context/ThemeContext";
import "./styles/main.css";

// Pages that should NOT show Footer
const NO_FOOTER = ["chat"];
// Pages that fill full viewport height
const FULL_HEIGHT = ["chat"];

// Pages that require authentication
const PROTECTED_PAGES = ["post", "edit", "chat", "profile", "my-listings", "wishlist", "notifications", "purchase-requests", "admin", "settings", "college-verification", "my-sales", "saved-items", "my-college-listings", "admin-verifications", "admin-users", "admin-analytics"];

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <WishlistProvider>
            <NotificationsProvider>
              <Main />
            </NotificationsProvider>
          </WishlistProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
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
    if (path === "/post") return "post";
    if (path === "/chat") return "chat";
    if (path === "/profile") return "profile";
    if (path === "/my-listings") return "my-listings";
    if (path === "/wishlist") return "wishlist";
    if (path === "/college-verification") return "college-verification";
    if (path === "/my-sales") return "my-sales";
    if (path === "/saved-items") return "saved-items";
    if (path === "/my-college-listings") return "my-college-listings";
    if (path === "/notifications") return "notifications";
    if (path === "/admin") return "admin";
    if (path === "/admin/verifications") return "admin-verifications";
    if (path === "/admin/users") return "admin-users";
    if (path === "/admin/analytics") return "admin-analytics";
    if (path === "/settings") return "settings";
    if (path.startsWith("/listing/")) return "listing";
    return "home";
  };

  const [page, setPage] = useState(getInitialPage);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListing, setSelectedListing] = useState(null);
  const [chatWith, setChatWith] = useState(null);
  const [viewProfileUserId, setViewProfileUserId] = useState(null);

  // Auth Modal states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authRedirectPage, setAuthRedirectPage] = useState(null);
  const [authSuccessCallback, setAuthSuccessCallback] = useState(null);

  // Scroll to Top state
  const [showScrollTop, setShowScrollTop] = useState(false);

  const loadListingById = async (id) => {
    if (!id) return;
    try {
      const docRef = doc(db, "listings", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSelectedListing({ id: docSnap.id, ...docSnap.data() });
        setPage("listing");
      } else {
        navigateTo("home");
      }
    } catch (error) {
      console.error("Error fetching listing:", error);
      navigateTo("home");
    }
  };

  const navigateTo = (nextPage, extraData = null) => {
    if (nextPage === "listing" && extraData) {
      setSelectedListing(extraData);
    }
    setPage(nextPage);
    if (nextPage !== "profile") setViewProfileUserId(null);
    // Always scroll to top on page navigation
    window.scrollTo({ top: 0, behavior: "instant" });
    
    let path = "/";
    if (nextPage === "terms") path = "/terms-of-service";
    else if (nextPage === "privacy") path = "/privacy-policy";
    else if (nextPage === "home") path = "/";
    else if (nextPage === "post") path = "/post";
    else if (nextPage === "chat") path = "/chat";
    else if (nextPage === "profile") path = "/profile";
    else if (nextPage === "my-listings") path = "/my-listings";
    else if (nextPage === "wishlist") path = "/wishlist";
    else if (nextPage === "college-verification") path = "/college-verification";
    else if (nextPage === "my-sales") path = "/my-sales";
    else if (nextPage === "saved-items") path = "/saved-items";
    else if (nextPage === "my-college-listings") path = "/my-college-listings";
    else if (nextPage === "notifications") path = "/notifications";
    else if (nextPage === "admin") path = "/admin";
    else if (nextPage === "admin-verifications") path = "/admin/verifications";
    else if (nextPage === "admin-users") path = "/admin/users";
    else if (nextPage === "admin-analytics") path = "/admin/analytics";
    else if (nextPage === "settings") path = "/settings";
    else if (nextPage === "contact") path = "/contact";
    else if (nextPage === "auth") path = "/auth";
    else if (nextPage === "listing") {
      const listingObj = extraData || selectedListing;
      path = listingObj ? `/listing/${listingObj.id}` : "/listing";
    }
    
    if (window.location.pathname !== path) {
      window.history.pushState({ page: nextPage, listingId: extraData?.id || selectedListing?.id }, "", path);
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
      window.scrollTo({ top: 0, behavior: "instant" });
      
      if (path === "/terms-of-service" || path === "/terms") setPage("terms");
      else if (path === "/privacy-policy" || path === "/privacy") setPage("privacy");
      else if (path === "/contact") setPage("contact");
      else if (path === "/auth") setPage("auth");
      else if (path === "/post") setPage("post");
      else if (path === "/chat") setPage("chat");
      else if (path === "/profile") setPage("profile");
      else if (path === "/my-listings") setPage("my-listings");
      else if (path === "/wishlist") setPage("wishlist");
      else if (path === "/college-verification") setPage("college-verification");
      else if (path === "/my-sales") setPage("my-sales");
      else if (path === "/saved-items") setPage("saved-items");
      else if (path === "/my-college-listings") setPage("my-college-listings");
      else if (path === "/purchase-requests") setPage("purchase-requests");
      else if (path === "/admin") setPage("admin");
      else if (path === "/admin/verifications") setPage("admin-verifications");
      else if (path === "/admin/users") setPage("admin-users");
      else if (path === "/admin/analytics") setPage("admin-analytics");
      else if (path === "/settings") setPage("settings");
      else if (path.startsWith("/listing/")) {
        const id = path.split("/")[2];
        if (id) {
          loadListingById(id);
        } else {
          setPage("home");
        }
      }
      else if (event.state && event.state.page) {
        setPage(event.state.page);
      }
      else {
        setPage("home");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListing]);

  // Initial load check for listing path
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/listing/")) {
      const id = path.split("/")[2];
      if (id) {
        loadListingById(id);
      }
    }
    if (!window.history.state) {
      window.history.replaceState({ page: getInitialPage() }, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track scroll position to show/hide back-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Track page views in GA4 on every SPA navigation
  const PAGE_TITLES = {
    home:              "Home — Browse Listings",
    listing:           "Listing Detail",
    post:              "Post a Listing",
    edit:              "Edit Listing",
    chat:              "Messages",
    profile:           "My Profile",
    "my-listings":     "My Listings",
    wishlist:          "Wishlist",
    "college-verification": "College Verification",
    "my-sales":        "My Sales",
    "saved-items":     "Saved Items",
    "my-college-listings": "My College Listings",
    notifications:     "Notifications",
    admin:             "Admin Dashboard",
    "admin-verifications": "Verification Requests",
    "admin-users":       "User Management",
    "admin-analytics":   "Analytics & Reports",
    settings:          "Account Settings",
    privacy:           "Privacy Policy",
    terms:             "Terms of Service",
    contact:           "Contact Us",
    auth:              "Sign In / Sign Up",
  };

  useEffect(() => {
    trackPageView(page, PAGE_TITLES[page] || page);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {page === "listing" && (
          selectedListing && window.location.pathname.includes(selectedListing.id) ? (
            <ListingDetailPage
              listing={selectedListing} setPage={navigateTo}
              setSelectedListing={setSelectedListing} setChatWith={setChatWith}
              requireAuth={requireAuth}
              setViewProfileUserId={setViewProfileUserId}
            />
          ) : (
            <div className="container" style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "60vh" }}>
              <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }}></div>
              <div style={{ color: "var(--muted)", fontWeight: 600 }}>Loading listing details...</div>
            </div>
          )
        )}
        {page === "chat" && <ChatPage initialChatWith={chatWith} setPage={navigateTo} />}
        {page === "profile" && (
          <ProfilePage
            setPage={navigateTo} setSelectedListing={setSelectedListing}
            initialTab="active"
            viewUserId={viewProfileUserId}
            requireAuth={requireAuth}
          />
        )}
        {page === "my-listings" && <MyListingsPage setPage={navigateTo} />}
        {page === "wishlist" && <WishlistPage setPage={navigateTo} />}
        {page === "college-verification" && <CollegeVerificationPage setPage={navigateTo} />}
        {page === "my-sales" && <MySalesPage setPage={navigateTo} />}
        {page === "saved-items" && <SavedItemsPage setPage={navigateTo} />}
        {page === "my-college-listings" && <MyCollegeListingsPage setPage={navigateTo} />}
        {page === "notifications" && (
          <NotificationsPage setPage={navigateTo} setSelectedListing={setSelectedListing} />
        )}
        {page === "purchase-requests" && (
          <PurchaseRequestsPage setPage={navigateTo} setChatWith={setChatWith} />
        )}
        {page === "admin"   && <AdminDashboardPage />}
        {page === "admin-verifications" && <VerificationRequestsPage />}
        {page === "admin-users" && <UserManagementPage />}
        {page === "admin-analytics" && <AnalyticsReportsPage />}
        {page === "settings" && <SettingsPage setPage={navigateTo} />}
        {page === "privacy" && <PrivacyPolicyPage setPage={navigateTo} />}
        {page === "terms"   && <TermsPage setPage={navigateTo} />}
        {page === "contact" && <ContactPage setPage={navigateTo} />}
      </div>

       {showFooter && <Footer setPage={navigateTo} />}
      <CookieConsent />

      {showScrollTop && (
        <button
          className="scroll-top-btn"
          onClick={scrollToTop}
          aria-label="Scroll to top"
          type="button"
        >
          ▲ Back to Top
        </button>
      )}

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
