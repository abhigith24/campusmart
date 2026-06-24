import React from "react";
import MateGeniFloatingAssistant from "./MateGeni/MateGeniFloatingAssistant";

export default function FloatingActionGroup({ showScrollTop, scrollToTop }) {
  return (
    <div className="floating-action-group">
      {showScrollTop && (
        <button
          className="scroll-top-circular-btn"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          title="Scroll back to top"
          type="button"
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            aria-hidden="true"
          >
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      )}
      <MateGeniFloatingAssistant />
    </div>
  );
}
