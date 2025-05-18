export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
	return (
		<div>
			<h1 className="text-2xl font-bold mb-6">Deadlines</h1>
			<main>{children}</main>
		</div>
	)
}
