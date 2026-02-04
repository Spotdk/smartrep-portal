import './globals.css'

export const metadata = {
  title: 'SMARTREP Portal',
  description: 'Customer portal and order management for SMARTREP',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}