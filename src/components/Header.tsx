export default function Header({ templateCount }: { templateCount: number }) {
  return (
    <header className="text-center space-y-4">
      <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent tracking-tighter">
        Den Magiske Ædelstens Smedje
      </h1>
      <p className="text-slate-400 max-w-md mx-auto text-lg">
        14 ædelstenstyper • <span>{templateCount}</span> former • Guldklumper •{' '}
        <span className="text-fuchsia-400">Magiske Egenskaber</span>
      </p>
    </header>
  )
}
