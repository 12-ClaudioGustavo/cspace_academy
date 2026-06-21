'use client'

import React from 'react'

interface LogoProps {
  className?: string
  height?: string
  variant?: 'light' | 'dark' | 'auto'
}

export function Logo({
  className = '',
  height = 'h-7 sm:h-9 md:h-11', // default responsive heights
  variant = 'auto'
}: LogoProps) {
  return (
    <div className={`flex items-center select-none ${className}`}>
      {/* Light Theme / Auto: renders black/colored horizontal logo on light backgrounds */}
      {(variant === 'light' || variant === 'auto') && (
        <img
          src="/logos/C-Space_Academy_Logo_Horizontal_FundoClaro.png"
          className={`object-contain w-auto ${height} ${variant === 'auto' ? 'dark:hidden' : ''}`}
          alt="C-Space Academy"
        />
      )}

      {/* Dark Theme / Auto: renders white logo on dark backgrounds */}
      {(variant === 'dark' || variant === 'auto') && (
        <img
          src="/logos/C-Space_Academy_Logo_Horizontal.png"
          className={`object-contain w-auto ${height} ${variant === 'auto' ? 'hidden dark:block' : ''}`}
          alt="C-Space Academy"
        />
      )}
    </div>
  )
}
