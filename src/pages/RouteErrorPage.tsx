import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { Leaf } from 'lucide-react'
import { Button } from '../components/ui/button'

import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function RouteErrorPage() {
  useDocumentTitle('Something went wrong')
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong while opening this page.'

  return (
    <main
      className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground"
      id="main">
      <Leaf size={30} />
      <div className="max-w-lg space-y-3">
        <h1 className="font-heading text-4xl">This page hit a snag.</h1>
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
      <Button render={<Link to="/" />}>Back to Food Wiki</Button>
    </main>
  )
}
