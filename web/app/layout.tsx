import type {Metadata, Viewport} from 'next'
import {Geist, Geist_Mono} from 'next/font/google'
import Link from 'next/link'
import {StampIcon} from '@/components/icons'
import './globals.css'

const geistSans = Geist({variable: '--font-geist-sans', subsets: ['latin']})
const geistMono = Geist_Mono({variable: '--font-geist-mono', subsets: ['latin']})

export const metadata: Metadata = {
  title: 'Clearance Desk',
  description:
    "Check your UTME subjects, UTME score and O'level results against the published 2026/2027 admission requirements of UNILAG, UI, OAU, UNN and LASU, before you apply.",
}

export const viewport: Viewport = {themeColor: '#f6f5f1'}

export default function RootLayout({children}: LayoutProps<'/'>) {
  return (
    <html lang="en-NG" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <header className="border-b border-stone-200 bg-white">
          <nav aria-label="Main" className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-stone-950">
              <StampIcon className="size-6 text-emerald-800" />
              Clearance Desk
            </Link>
            <div className="flex items-center gap-1 text-sm font-medium">
              <Link href="/" className="rounded-lg px-3 py-2 text-stone-700 hover:bg-stone-100 hover:text-stone-950">
                Check
              </Link>
              <Link href="/about" className="rounded-lg px-3 py-2 text-stone-700 hover:bg-stone-100 hover:text-stone-950">
                About
              </Link>
            </div>
          </nav>
        </header>
        <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-600">
          <p className="mx-auto max-w-3xl px-4">
            Built with Sanity Context and Claude for the DEV × Sanity Challenge.{' '}
            <a className="underline underline-offset-2 hover:text-stone-900" href="https://github.com/big14way/clearancedesk">
              Source on GitHub
            </a>
          </p>
        </footer>
      </body>
    </html>
  )
}
