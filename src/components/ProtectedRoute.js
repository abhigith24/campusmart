import React from "react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requiredRoles }) {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: 60, textAlign: "center" }}>
        <p>Loading...</p>
      </div>
    );
  }

  // If there's no user profile (e.g. not logged in), let App.js handle the auth redirect
  if (!userProfile) {
    return null;
  }

  if (requiredRoles && !requiredRoles.includes(userProfile.role)) {
    return (
      <div className="container" style={{ paddingTop: 60, textAlign: "center", minHeight: "100vh" }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h2 style={{ marginTop: 16 }}>Access Denied</h2>
        <p style={{ color: "var(--muted)" }}>You don't have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
