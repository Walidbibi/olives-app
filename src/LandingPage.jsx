function LandingPage({ onLogin, onSignup }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* ── HERO ── */}
      <header className="bg-gradient-to-br from-olive-700 to-olive-500 text-white text-center px-6 py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle,_white_1px,_transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative max-w-2xl mx-auto">
          <p className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3">
            🫒 Olive<span className="text-olive-200">App</span>
          </p>
          <p className="text-lg sm:text-xl font-normal opacity-90 mb-8 leading-relaxed">
            Gérez votre oliveraie depuis votre téléphone.<br className="hidden sm:block" />
            Récolte, ventes, charges — tout en un seul endroit.
          </p>
          <span className="inline-block bg-white/20 border border-white/40 rounded-full px-5 py-1.5 text-sm font-semibold tracking-wide">
            100 % adapté aux agriculteurs tunisiens
          </span>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onSignup}
              className="w-full sm:w-auto bg-white text-olive-700 font-bold text-base px-8 py-3.5 rounded-full shadow-lg hover:bg-olive-50 transition-colors"
            >
              Essayer gratuitement
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="w-full sm:w-auto bg-transparent border-2 border-white text-white font-semibold text-base px-8 py-3.5 rounded-full hover:bg-white/10 transition-colors"
            >
              Se connecter
            </button>
          </div>
          <p className="mt-4 text-xs opacity-60">Aucune carte bancaire requise · Vos données restent privées</p>
        </div>
      </header>

      {/* ── PROBLÈME ── */}
      <section className="bg-orange-50 border-l-4 border-orange-400 px-6 py-16">
        <div className="max-w-2xl mx-auto">
          <p className="text-xl font-bold text-orange-700 mb-5">
            Vous gérez votre oliveraie à la mémoire ou sur des cahiers ?
          </p>
          <ul className="space-y-4">
            {[
              "Impossible de savoir combien vous avez récolté par parcelle chaque année",
              "Vous ne savez plus à qui vous avez vendu, à quel prix, ni combien il vous reste",
              "Les charges (main d'œuvre, essence, équipements) s'accumulent sans vue d'ensemble",
              "En fin de campagne, vous ne savez pas si vous avez été rentable",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-gray-600">
                <span className="text-red-500 font-bold text-lg mt-0.5 shrink-0">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section className="bg-olive-50 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-olive-700 mb-3">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Conçu pour une exploitation oléicole, pas pour une multinationale.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: "🌿", title: "Suivi des campagnes", desc: "Créez une campagne par saison. Retrouvez l'historique de toutes vos années en un clic." },
              { icon: "⚖️", title: "Récolte par parcelle", desc: "Enregistrez les kg récoltés, les journées travaillées et le rendement parcelle par parcelle." },
              { icon: "💰", title: "Ventes d'olives", desc: "Notez chaque vente avec le prix au kilo. Suivez vos revenus en temps réel." },
              { icon: "📋", title: "Charges de l'exploitation", desc: "Main d'œuvre, repas, essence, équipements — tout est catégorisé et totalisé automatiquement." },
              { icon: "📊", title: "Bilan de campagne", desc: "Recettes moins charges : votre résultat net s'affiche directement. Pas de calcul manuel." },
              { icon: "🗺️", title: "Carte de l'exploitation", desc: "Visualisez vos parcelles sur une carte. Voyez les données de récolte au survol." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm text-center hover:-translate-y-1 transition-transform">
                <div className="text-4xl mb-3">{f.icon}</div>
                <p className="font-bold text-olive-700 mb-2">{f.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHIFFRES ── */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-olive-700 mb-3">
            Fait pour votre quotidien
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Pas de formation requise. Vous utilisez votre téléphone, l'app fait le reste.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { num: "3 min", label: "pour enregistrer une journée de récolte" },
              { num: "☁️", label: "données sauvegardées et accessibles depuis n'importe quel appareil" },
              { num: "0 DT", label: "pour démarrer — offre gratuite disponible" },
              { num: "∞", label: "campagnes, parcelles et ventes enregistrées" },
            ].map((b) => (
              <div key={b.label}>
                <p className="text-4xl font-extrabold text-olive-600 leading-none mb-2">{b.num}</p>
                <p className="text-sm text-gray-500">{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ── */}
      <section className="bg-olive-50 px-6 py-16">
        <div className="max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-olive-700 mb-3">
            Comment ça marche ?
          </h2>
          <p className="text-center text-gray-500 mb-10">
            En moins de 10 minutes, votre exploitation est configurée.
          </p>
          <div className="flex flex-col divide-y divide-olive-100">
            {[
              { n: "1", title: "Créez votre exploitation", desc: "Nom, surface totale, région. Vos parcelles avec leurs noms." },
              { n: "2", title: "Ouvrez une campagne", desc: "Chaque saison de récolte correspond à une campagne. Créez-en une en 30 secondes." },
              { n: "3", title: "Saisissez au fur et à mesure", desc: "Chaque jour de récolte, chaque vente, chaque charge — directement depuis le champ." },
              { n: "4", title: "Consultez votre bilan", desc: "Le résumé de campagne se met à jour automatiquement. Rentabilité en un regard." },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-5 py-5">
                <div className="w-10 h-10 rounded-full bg-olive-600 text-white font-bold text-base flex items-center justify-center shrink-0">
                  {s.n}
                </div>
                <div>
                  <p className="font-bold text-gray-900 mb-1">{s.title}</p>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGE ── */}
      <section className="bg-gradient-to-br from-olive-700 to-olive-500 text-white text-center px-6 py-16">
        <blockquote className="max-w-xl mx-auto">
          <p className="text-lg sm:text-xl italic opacity-90 leading-relaxed mb-5">
            "Avant j'écrivais tout dans un cahier et je perdais tout à la fin de la saison.
            Maintenant je sais exactement combien j'ai récolté sur chaque parcelle depuis 3 ans."
          </p>
          <footer className="text-sm font-semibold opacity-70">— Agriculteur oléicole, Sfax</footer>
        </blockquote>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="px-6 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-extrabold text-olive-700 mb-3">
            Prêt à mieux gérer votre oliveraie ?
          </h2>
          <p className="text-gray-500 mb-8">
            Rejoignez les premiers agriculteurs qui ont repris le contrôle de leur exploitation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onSignup}
              className="w-full sm:w-auto bg-olive-600 hover:bg-olive-500 text-white font-bold text-base px-8 py-3.5 rounded-full shadow-lg transition-colors"
            >
              Essayer gratuitement
            </button>
            <button
              type="button"
              onClick={onLogin}
              className="w-full sm:w-auto border-2 border-olive-600 text-olive-700 font-semibold text-base px-8 py-3.5 rounded-full hover:bg-olive-50 transition-colors"
            >
              Se connecter
            </button>
          </div>
          <p className="mt-5 text-xs text-gray-400">Aucune carte bancaire requise · Vos données restent privées</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white/50 text-center px-6 py-6 text-sm">
        <span className="text-white/80 font-semibold">🫒 OliveApp</span>
        {" "}· Conçu pour les agriculteurs oléicoles tunisiens · 2026
      </footer>

    </div>
  )
}

export default LandingPage
