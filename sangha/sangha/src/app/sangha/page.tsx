import Link from "next/link";

export default function SanghaHome() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Sangha Panel</h1>
      <div className="space-y-4">
        <Link href="/sangha/dashboard" className="block p-4 border rounded hover:bg-gray-100">Dashboard</Link>
        <Link href="/sangha/pending-users" className="block p-4 border rounded hover:bg-gray-100">Pending Applications</Link>
      </div>
    </div>
  );
}
