import React, { useState } from "react";
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
import "./styles/main.css";

// Pages that should NOT show Footer
const NO_FOOTER = ["chat"];
// Pages that fill full viewport height
const FULL_HEIGHT = ["chat"];

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
  const [page,            setPage]            = useState("home");
  const [searchQuery,     setSearchQuery]     = useState("");
  const [selectedListing, setSelectedListing] = useState(null);
  const [chatWith,        setChatWith]        = useState(null);

  if (!currentUser) return <AuthPage />;

  const isFullHeight = FULL_HEIGHT.includes(page);
  const showFooter   = !NO_FOOTER.includes(page);

  return (
    <div className="app-layout">
      <Navbar
        page={page} setPage={setPage}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
      />

      <div className={`main-content ${isFullHeight ? "no-pad" : ""}`}>
        {page === "home" && (
          <HomePage setPage={setPage} setSelectedListing={setSelectedListing} searchQuery={searchQuery} />
        )}
        {page === "post" && <PostListingPage setPage={setPage} />}
        {page === "edit" && selectedListing && (
          <PostListingPage setPage={setPage} editListing={selectedListing} />
        )}
        {page === "listing" && selectedListing && (
          <ListingDetailPage
            listing={selectedListing} setPage={setPage}
            setSelectedListing={setSelectedListing} setChatWith={setChatWith}
          />
        )}
        {page === "chat" && <ChatPage initialChatWith={chatWith} setPage={setPage} />}
        {(page === "profile" || page === "my-listings" || page === "wishlist") && (
          <ProfilePage
            setPage={setPage} setSelectedListing={setSelectedListing}
            initialTab={page === "wishlist" ? "wishlist" : page === "my-listings" ? "active" : "active"}
          />
        )}
        {page === "notifications" && (
          <NotificationsPage setPage={setPage} setSelectedListing={setSelectedListing} />
        )}
        {page === "purchase-requests" && (
          <PurchaseRequestsPage setPage={setPage} setChatWith={setChatWith} />
        )}
        {page === "admin"   && <AdminPage />}
        {page === "privacy" && <PrivacyPolicyPage setPage={setPage} />}
        {page === "terms"   && <TermsPage setPage={setPage} />}
        {page === "contact" && <ContactPage setPage={setPage} />}
      </div>

      {showFooter && <Footer setPage={setPage} />}
      <CookieConsent />
    </div>
  );
}

export default App;
