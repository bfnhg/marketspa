# Ripple And Resonance

au lieu d animation de fleure  je veux du l eau
je veux exactement comme ce site https://unseen.co
avec un sound

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d101d0d4-408b-4001-ac75-9ebcff4c682f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Lancer avec Docker

Depuis le dossier du projet, avec Docker et Docker Compose installés :

```sh
docker compose up --build -d
```

Le site sera disponible sur [http://localhost:3000](http://localhost:3000). Pour l'arrêter :

```sh
docker compose down
```

L'image est construite en deux étapes : Bun installe les dépendances et compile le site, puis
seul le serveur de production Nitro est copié dans une image Node plus légère. Le preset
`node-server` permet au rendu côté serveur de fonctionner dans Docker sans l'environnement
Cloudflare Workers. Les builds exécutés dans Lovable gardent leur preset de déploiement.
