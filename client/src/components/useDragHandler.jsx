import { useState, useEffect } from 'react';

export const useDragHandlers = (onRatingChange, onRatingHover) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'circular' or 'horizontal'
  const [hoveredRating, setHoveredRating] = useState(0);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      if (!isDragging) return;

      if (dragType === 'circular') {
        const svg = document.querySelector('svg');
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        let normalizedAngle = (angle + Math.PI / 2) / (2 * Math.PI);
        if (normalizedAngle < 0) normalizedAngle += 1;
        const value = Math.max(0.5, Math.min(10, normalizedAngle * 10));
        const roundedValue = Math.round(value * 2) / 2;
        setHoveredRating(roundedValue);
        onRatingHover(roundedValue);
      } else if (dragType === 'horizontal') {
        const trackbar = document.querySelector('[data-trackbar]');
        if (!trackbar) return;
        const rect = trackbar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const value = Math.max(0.5, percentage * 10);
        const roundedValue = Math.round(value * 2) / 2;
        setHoveredRating(roundedValue);
        onRatingHover(roundedValue);
      }
    };

    const handleGlobalMouseUp = () => {
      if (isDragging && hoveredRating > 0) {
        onRatingChange(hoveredRating);
      }
      setIsDragging(false);
      setDragType(null);
      setHoveredRating(0);
      onRatingHover(0);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragType, hoveredRating, onRatingChange, onRatingHover]);

  const startCircularDrag = (e) => {
    setIsDragging(true);
    setDragType('circular');
    // Calculate initial value
    const svg = e.currentTarget.closest('svg');
    const rect = svg.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let normalizedAngle = (angle + Math.PI / 2) / (2 * Math.PI);
    if (normalizedAngle < 0) normalizedAngle += 1;
    const value = Math.max(0.5, Math.min(10, normalizedAngle * 10));
    const roundedValue = Math.round(value * 2) / 2;
    setHoveredRating(roundedValue);
    onRatingHover(roundedValue);
  };

  const startHorizontalDrag = (e) => {
    setIsDragging(true);
    setDragType('horizontal');
    // Calculate initial value
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const value = Math.max(0.5, percentage * 10);
    const roundedValue = Math.round(value * 2) / 2;
    setHoveredRating(roundedValue);
    onRatingHover(roundedValue);
  };

  const handleCircularHover = (e) => {
    if (isDragging) return; // Don't interfere with dragging
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let normalizedAngle = (angle + Math.PI / 2) / (2 * Math.PI);
    if (normalizedAngle < 0) normalizedAngle += 1;
    const value = Math.max(0.5, Math.min(10, normalizedAngle * 10));
    const roundedValue = Math.round(value * 2) / 2;
    onRatingHover(roundedValue);
  };

  const handleCircularClick = (e) => {
    if (isDragging) return; // Handled by mouseup
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let normalizedAngle = (angle + Math.PI / 2) / (2 * Math.PI);
    if (normalizedAngle < 0) normalizedAngle += 1;
    const value = Math.max(0.5, Math.min(10, normalizedAngle * 10));
    const roundedValue = Math.round(value * 2) / 2;
    onRatingChange(roundedValue);
  };

  const handleHorizontalHover = (e) => {
    if (isDragging) return; // Don't interfere with dragging
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const value = Math.max(0.5, percentage * 10);
    const roundedValue = Math.round(value * 2) / 2;
    onRatingHover(roundedValue);
  };

  const handleHorizontalClick = (e) => {
    if (isDragging) return; // Handled by mouseup
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const value = Math.max(0.5, percentage * 10);
    const roundedValue = Math.round(value * 2) / 2;
    onRatingChange(roundedValue);
  };

  const handleRatingLeave = () => {
    if (!isDragging) {
      onRatingHover(0);
    }
  };

  return {
    isDragging,
    startCircularDrag,
    startHorizontalDrag,
    handleCircularHover,
    handleCircularClick,
    handleHorizontalHover,
    handleHorizontalClick,
    handleRatingLeave
  };
};