import { Outlet } from 'react-router-dom'
import SidebarNav from './SidebarNav.jsx'
import TopHeader from './TopHeader.jsx'
import ProjectHeader from '../domain/ProjectHeader.jsx'

export default function AppShell() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <SidebarNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopHeader />
        <ProjectHeader />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
