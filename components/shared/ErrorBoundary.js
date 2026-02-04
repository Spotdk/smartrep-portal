'use client'

import { Component } from 'react'
import { Button } from '@/components/ui/button'
import { BRAND_BLUE } from '@/lib/constants'

/** Fang client-side fejl – portalen forsvinder ikke, brugeren forbliver logget ind */
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <p className="text-gray-600 text-center">Der opstod en uventet fejl. Din session er bevaret.</p>
          <Button onClick={() => this.setState({ hasError: false, error: null })} style={{ backgroundColor: BRAND_BLUE }}>
            Prøv igen
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>Genindlæs siden</Button>
        </div>
      )
    }
    return this.props.children
  }
}
