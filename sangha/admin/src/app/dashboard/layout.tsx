import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import Footer from '@/components/Footer';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </div>
    </div>
  );
}
