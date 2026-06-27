import React, { useState, useEffect, useCallback, memo } from "react";
import { optimizeCloudinaryUrl } from "../../utils/cloudinary";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const ImageGalleryModal = memo(({ images, initialIndex = 0, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handleNext = useCallback((e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback((e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const handleClose = useCallback((e) => {
    if (e) e.stopPropagation();
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
      if (e.key === "ArrowRight") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };

    document.addEventListener("keydown", handleKeyDown);
    // Prevent background scrolling while modal is open
    document.body.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [handleClose, handleNext, handlePrev]);

  if (!images || images.length === 0) return null;

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image gallery fullscreen"
    >
      <button 
        onClick={handleClose}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          background: "rgba(0,0,0,0.5)",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "44px",
          height: "44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 10,
        }}
        aria-label="Close fullscreen gallery"
      >
        <X size={24} />
      </button>

      {images.length > 1 && (
        <button
          onClick={handlePrev}
          style={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
          }}
          aria-label="Previous image"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      <img 
        src={optimizeCloudinaryUrl(images[currentIndex], "f_auto,q_auto,w_1200")} 
        alt={`Fullscreen view ${currentIndex + 1}`}
        style={{
          maxWidth: "90%",
          maxHeight: "90vh",
          objectFit: "contain",
          userSelect: "none"
        }}
        onClick={(e) => e.stopPropagation()}
        loading="lazy"
      />

      {images.length > 1 && (
        <button
          onClick={handleNext}
          style={{
            position: "absolute",
            right: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
          }}
          aria-label="Next image"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {images.length > 1 && (
        <div style={{
          position: "absolute",
          bottom: "20px",
          color: "white",
          background: "rgba(0,0,0,0.5)",
          padding: "4px 12px",
          borderRadius: "16px",
          fontSize: "14px",
          fontWeight: 600
        }}>
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
});

export default ImageGalleryModal;
