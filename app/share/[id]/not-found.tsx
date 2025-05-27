import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Conversation Not Found</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>This shared conversation could not be found.</p>
            <p>Possible reasons:</p>
            <ul className="text-left list-disc list-inside space-y-1 bg-muted/50 p-3 rounded">
              <li>The conversation has expired (links expire after 30 days)</li>
              <li>The conversation was never shared</li>
              <li>The link is invalid or corrupted</li>
            </ul>
          </div>
          
          <Link href="/">
            <Button className="w-full">
              <Home className="w-4 h-4 mr-2" />
              Return to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}