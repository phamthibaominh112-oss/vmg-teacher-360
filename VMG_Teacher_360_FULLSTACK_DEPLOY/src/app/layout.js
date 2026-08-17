import './globals.css'

export const metadata = {
  title: 'VMG Teacher 360',
  description: 'Teacher Excellence, Development & Governance Hub'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
