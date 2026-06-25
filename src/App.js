import React, { useState, useEffect }    from "react";
import { AuthProvider, useAuth }         from "./context/AuthContext";
import { ToastProvider }                 from "./context/ToastContext";
import { WishlistProvider }              from "./context/WishlistContext";
import { NotificationsProvider }         from "./context/NotificationsContext";
import Navbar                            from "./components/Navbar";
import Footer                            from "./components/Footer";
import CookieConsent                     from "./components/CookieConsent";
import FloatingActionGroup               from "./components/FloatingActionGroup";
import HomePage                          from "./pages/HomePage";
import AuthModal                         from "./components/AuthModal";
import ProtectedRoute                  from "./components/ProtectedRoute";

const AuthPage = React.lazy(() => import("./pages/AuthPage"));
const PostListingPage = React.lazy(() => import("./pages/PostListingPage"));
const ListingDetailPage = React.lazy(() => import("./pages/ListingDetailPage"));
const ChatPage = React.lazy(() => import("./pages/ChatPage"));
const ProfilePage = React.lazy(() => import("./pages/ProfilePage"));
const MyListingsPage = React.lazy(() => import("./pages/MyListingsPage"));
const WishlistPage = React.lazy(() => import("./pages/WishlistPage"));
const CollegeVerificationPage = React.lazy(() => import("./pages/CollegeVerificationPage"));
const MySalesPage = React.lazy(() => import("./pages/MySalesPage"));
const SavedItemsPage = React.lazy(() => import("./pages/SavedItemsPage"));
const MyCollegeListingsPage = React.lazy(() => import("./pages/MyCollegeListingsPage"));
const AdminDashboardPage = React.lazy(() => import("./pages/AdminDashboardPage"));
const VerificationRequestsPage = React.lazy(() => import("./pages/VerificationRequestsPage"));
const UserManagementPage = React.lazy(() => import("./pages/UserManagementPage"));
const AnalyticsReportsPage = React.lazy(() => import("./pages/AnalyticsReportsPage"));
const SupportDashboardPage = React.lazy(() => import("./pages/SupportDashboardPage"));
const NotificationsPage = React.lazy(() => import("./pages/NotificationsPage"));
const PurchaseRequestsPage = React.lazy(() => import("./pages/PurchaseRequestsPage"));
const SettingsPage = React.lazy(() => import("./pages/SettingsPage"));
const PrivacyPolicyPage = React.lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage = React.lazy(() => import("./pages/TermsPage"));
const ContactPage = React.lazy(() => import("./pages/ContactPage"));
import { trackPageView }                 from "./utils/analytics";
import { db }                            from "./firebase";
import { doc, getDoc }                   from "firebase/firestore";
import { ThemeProvider }                  from "./context/ThemeContext";
import { parseListingIdFromPath, getListingUrl } from "./utils/urlHelper";
import { trackShareClick }               from "./utils/shareAnalytics";
import { getLandingPage }                from "./config/accessControl";
import "./styles/main.css";

// Pages that should NOT show Footer
const NO_FOOTER = ["chat"];
// Pages that fill full viewport height
const FULL_HEIGHT = ["chat"];

// Pages that require authentication
const PROTECTED_PAGES = ["post", "edit", "chat", "profile", "my-listings", "wishlist", "notifications", "purchase-requests", "admin", "settings", "college-verification", "my-sales", "saved-items", "my-college-listings", "admin-verifications", "admin-users", "admin-analytics", "support"];

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
  const { currentUser, userProfile, canAccessRoute } = useAuth();
  
  // Hash/path-based navigation helper
  const getInitialPage = () => {
    const path = window.location.pathname;
    if (path === "/terms-of-service" || path === "/terms") return "terms";
    if (path === "/privacy-policy" || path === "/privacy") return "privacy";
    if (path === "/contact") return "contact";
    if (path === "/report-bug") return "report-bug";
    if (path === "/feature-request") return "feature-request";
    if (path === "/faqs") return "faqs";
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
    if (path === "/support") return "support";
    if (path.startsWith("/settings")) return "settings";
    if (path.startsWith("/listing/") || path.startsWith("/item/") || path.startsWith("/i/")) return "listing";
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

  const loadListingById = async (id, pathname = window.location.pathname, search = window.location.search) => {
    if (!id) return;
    try {
      const docRef = doc(db, "listings", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const listingObj = { id: docSnap.id, ...docSnap.data() };
        setSelectedListing(listingObj);

        // Calculate and enforce canonical SEO URL slug structure
        const canonicalPath = getListingUrl(listingObj);
        if (pathname !== canonicalPath) {
          window.history.replaceState({ page: "listing", listingId: docSnap.id }, "", canonicalPath + search);
        }

        // Trigger shared link analytics click telemetry
        const params = new URLSearchParams(search);
        const ref = params.get("ref");
        const utmSource = params.get("utm_source");
        if (ref || utmSource || pathname.startsWith("/i/")) {
          const source = utmSource || (pathname.startsWith("/i/") ? "shortlink" : "generic");
          trackShareClick(docSnap.id, source, ref, currentUser?.uid);
        }

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
    else if (nextPage === "support") path = "/support";
    else if (nextPage === "settings") path = "/settings";
    else if (nextPage === "contact") path = "/contact";
    else if (nextPage === "report-bug") path = "/report-bug";
    else if (nextPage === "feature-request") path = "/feature-request";
    else if (nextPage === "faqs") path = "/faqs";
    else if (nextPage === "auth") path = "/auth";
    else if (nextPage === "listing") {
      const listingObj = extraData || selectedListing;
      path = listingObj ? getListingUrl(listingObj) : "/item";
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
      else if (path === "/report-bug") setPage("report-bug");
      else if (path === "/feature-request") setPage("feature-request");
      else if (path === "/faqs") setPage("faqs");
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
      else if (path === "/support") setPage("support");
      else if (path === "/settings") setPage("settings");
      else if (path.startsWith("/listing/") || path.startsWith("/item/") || path.startsWith("/i/")) {
        const parsedId = parseListingIdFromPath(path);
        if (parsedId) {
          loadListingById(parsedId, path, window.location.search);
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

  // Centralized Route Access Control
  useEffect(() => {
    if (userProfile && page) {
      if (!canAccessRoute(page)) {
        navigateTo(getLandingPage(userProfile.role));
      }
    }
  }, [userProfile, page]);

  // Initial load check for listing path
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/listing/") || path.startsWith("/item/") || path.startsWith("/i/")) {
      const parsedId = parseListingIdFromPath(path);
      if (parsedId) {
        loadListingById(parsedId, path, window.location.search);
      }
    }
    if (!window.history.state) {
      window.history.replaceState({ page: getInitialPage() }, "", window.location.pathname + window.location.search);
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
    support:           "Support Dashboard",
    settings:          "Account Settings",
    privacy:           "Privacy Policy",
    terms:             "Terms of Service",
    contact:           "Contact Us",
    "report-bug":      "Report a Bug",
    "feature-request": "Give Feedback",
    faqs:              "FAQs",
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
    const path = window.location.pathname;
    if (currentUser && (path === "/" || path === "/auth")) {
      if (page === "home" && window.history.state?.page === "home") return;
      navigateTo(getLandingPage(userProfile?.role));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userProfile]);

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (authRedirectPage) {
      navigateTo(authRedirectPage);
      setAuthRedirectPage(null);
    } else {
      navigateTo(getLandingPage(userProfile?.role));
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
        <React.Suspense fallback={
          <div className="container" style={{ padding: "80px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "60vh" }}>
            <div className="btn-spinner" style={{ width: "36px", height: "36px", border: "3px solid var(--bdr)", borderTopColor: "var(--p)" }}></div>
            <div style={{ color: "var(--muted)", fontWeight: 600 }}>Loading page...</div>
          </div>
        }>
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
          {page === "admin"   && <ProtectedRoute route="admin"><AdminDashboardPage setPage={navigateTo} /></ProtectedRoute>}
          {page === "admin-verifications" && <ProtectedRoute route="admin-verifications"><VerificationRequestsPage setPage={navigateTo} /></ProtectedRoute>}
          {page === "admin-users" && <ProtectedRoute route="admin-users"><UserManagementPage setPage={navigateTo} /></ProtectedRoute>}
          {page === "admin-analytics" && <ProtectedRoute route="admin-analytics"><AnalyticsReportsPage setPage={navigateTo} /></ProtectedRoute>}
          {page === "support" && <ProtectedRoute route="support"><SupportDashboardPage setPage={navigateTo} /></ProtectedRoute>}
          {page === "settings" && <SettingsPage setPage={navigateTo} />}
          {page === "privacy" && <PrivacyPolicyPage setPage={navigateTo} />}
          {page === "terms"   && <TermsPage setPage={navigateTo} />}
          {page === "contact" && <ContactPage setPage={navigateTo} mode="contact" />}
          {page === "report-bug" && <ContactPage setPage={navigateTo} mode="bug" />}
          {page === "feature-request" && <ContactPage setPage={navigateTo} mode="feature" />}
          {page === "faqs" && <ContactPage setPage={navigateTo} mode="faqs" />}
        </React.Suspense>
      </div>

       {showFooter && <Footer setPage={navigateTo} />}
      <CookieConsent />
      <FloatingActionGroup
        showScrollTop={showScrollTop}
        scrollToTop={scrollToTop}
      />

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
