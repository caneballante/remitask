export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f7f6] px-6 py-8 text-[#17211d]">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <header className="border-b border-[#dfe7e3] pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0b6b5c]">
            RemiTask Web
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Migration workspace</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f6f68]">
            This is the hosted rebuild starting point. The local SQLite app remains
            the working version while we connect Neon, recreate the workflows, and
            migrate data deliberately.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["1", "Wire Neon", "Add DATABASE_URL, run the schema migration, and verify /api/health."],
            ["2", "Rebuild flows", "Bring over Dashboard, Meetings, Tasks, notes, and calendar import."],
            ["3", "Migrate data", "Import the current SQLite/JSON data once the web flows are stable."],
          ].map(([step, title, body]) => (
            <article key={step} className="rounded-lg border border-[#dfe7e3] bg-white p-5">
              <span className="text-xs font-bold text-[#0b6b5c]">Step {step}</span>
              <h2 className="mt-2 text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{body}</p>
            </article>
          ))}
        </div>

        <section className="rounded-lg border border-[#dfe7e3] bg-white p-5">
          <h2 className="text-lg font-semibold">Next check</h2>
          <p className="mt-2 text-sm leading-6 text-[#5f6f68]">
            After adding your Neon connection string to <code>web/.env.local</code>,
            run <code>npm run db:migrate</code> from the <code>web</code> folder,
            then open <code>/api/health</code>.
          </p>
        </section>
      </section>
    </main>
  );
}
