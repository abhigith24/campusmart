import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider }         from "./context/ToastContext";
import { WishlistProvider }      from "./context/WishlistContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import Navbar                    from "./components/Navbar";
import AuthPage                  from "./pages/AuthPage";
import HomePage                  from "./pages/HomePage";
import PostListingPage            from "./pages/PostListingPage";
import ListingDetailPage          from "./pages/ListingDetailPage";
import ChatPage                  from "./pages/ChatPage";
import ProfilePage                from "./pages/ProfilePage";
import AdminPage                 from "./pages/AdminPage";
import NotificationsPage         from "./pages/NotificationsPage";
import PurchaseRequestsPage      from "./pages/PurchaseRequestsPage";
import "./styles/main.css";

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

  const noNavPages = ["chat"];   // chat uses full viewport height

  return (
    <div className="app-layout">
      <Navbar page={page} setPage={setPage} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className={`main-content ${noNavPages.includes(page) ? "no-pad" : ""}`}>

        {page === "home" && (
          <HomePage setPage={setPage} setSelectedListing={setSelectedListing} searchQuery={searchQuery} />
        )}
        {page === "post" && (
          <PostListingPage setPage={setPage} />
        )}
        {page === "edit" && selectedListing && (
          <PostListingPage setPage={setPage} editListing={selectedListing} />
        )}
        {page === "listing" && selectedListing && (
          <ListingDetailPage
            listing={selectedListing}
            setPage={setPage}
            setSelectedListing={setSelectedListing}
            setChatWith={setChatWith}
          />
        )}
        {page === "chat" && (
          <ChatPage initialChatWith={chatWith} setPage={setPage} />
        )}
        {(page === "profile" || page === "my-listings" || page === "wishlist") && (
          <ProfilePage
            setPage={setPage}
            setSelectedListing={setSelectedListing}
            initialTab={page === "wishlist" ? "wishlist" : page === "my-listings" ? "active" : "active"}
          />
        )}
        {page === "notifications" && (
          <NotificationsPage setPage={setPage} setSelectedListing={setSelectedListing} />
        )}
        {page === "purchase-requests" && (
          <PurchaseRequestsPage setPage={setPage} setChatWith={setChatWith} />
        )}
        {page === "admin" && <AdminPage />}
      </div>
    </div>
  );
}

export default App;
