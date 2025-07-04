
"use client"

import * as React from "react"
import { useLanguage } from "@/hooks/use-language"
import { Button } from "@/components/ui/button"

export function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage()

  return (
    <Button variant="ghost" size="sm" onClick={toggleLanguage}>
      {language === 'en' ? 'ES' : 'EN'}
      <span className="sr-only">Toggle language</span>
    </Button>
  )
}
