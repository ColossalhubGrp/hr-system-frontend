"use client"

/**
 * Inside smart_hr_web, the workspace shell at
 * `app/(workspace)/layout.tsx` already supplies the sidebar, topbar, and
 * `px-6 pb-8 pt-4` content padding. The recruitment app's original
 * MainLayout duplicated all three (its own sidebar + `lg:ml-64 p-6`
 * offset), which is what produced the off-centre margins.
 *
 * The verbatim copies of recruitment pages still wrap themselves in
 * `<MainLayout>` because that's how the standalone app rendered them. We
 * keep the import contract identical but turn the wrapper into a pure
 * pass-through so layout responsibility stays with the workspace shell.
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
